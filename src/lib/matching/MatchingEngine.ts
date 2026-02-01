import { OrderBook } from './OrderBook';
import {
    OrderEntry,
    OrderSide,
    MatchingOrderType,
    OrderSource,
    OrderCondition,
    Trade,
    MatchResult,
    MatchingOrderStatus,
    generateOrderId,
    generateTradeId,
    calculateTradeCommission,
    COMMISSION_RATE,
} from './types';
import { PriceStep } from './PriceStep';

/**
 * Matching Engine - implements price-time priority order matching
 * 
 * Algorithm:
 * 1. Market orders: Match against best available prices until filled
 * 2. Limit orders: Match against opposing orders if price crosses, else add to book
 * 3. Price-Time Priority: Orders at same price are matched in FIFO order
 */
export class MatchingEngine {
    private orderBook: OrderBook;
    private trades: Trade[] = [];
    private tradeSequence: number = 0;

    private maxTradesHistory: number = 1000;
    private commissionRate: number = COMMISSION_RATE;

    constructor(initialPrice: number = 150) {
        this.orderBook = new OrderBook(initialPrice);
    }

    /**
     * Set commission rate
     */
    setCommissionRate(rate: number) {
        this.commissionRate = rate;
    }

    /**
     * Get the order book
     */
    getOrderBook(): OrderBook {
        return this.orderBook;
    }

    /**
     * Get recent trades
     */
    getRecentTrades(limit: number = 50): Trade[] {
        return this.trades.slice(-limit);
    }

    /**
     * Get last traded price
     */
    getLastPrice(): number {
        return this.orderBook.lastPrice;
    }

    /**
     * Submit an order to the matching engine
     */
    submitOrder(
        side: OrderSide,
        type: MatchingOrderType,
        quantity: number,
        price: number | null,
        source: OrderSource = 'user',
        condition: OrderCondition = 'GTC'
    ): MatchResult {
        const orderId = generateOrderId(source === 'user' ? 'USR' : 'BOT');

        // Normalize price to prevent Order Book fragmentation due to floating point issues
        let finalPrice = price;
        if (finalPrice !== null) {
            // Snap to nearest valid tick to match bot orders and avoid floating point splits
            // e.g. 150.0000001 -> 150.0
            finalPrice = PriceStep.roundToTick(finalPrice);
        }

        // Create order entry
        const order: OrderEntry = {
            orderId,
            timestamp: Date.now(),
            side,
            price: finalPrice ?? this.getEstimatedMarketPrice(side),
            quantity,
            remainingQuantity: quantity,
            type,
            source,
            condition,
        };

        if (type === 'market') {
            return this.executeMarketOrder(order);
        } else {
            return this.executeLimitOrder(order);
        }
    }

    /**
     * Estimate market price for market orders
     */
    private getEstimatedMarketPrice(side: OrderSide): number {
        if (side === 'buy') {
            const bestAsk = this.orderBook.getBestAsk();
            return bestAsk?.price ?? this.orderBook.lastPrice;
        } else {
            const bestBid = this.orderBook.getBestBid();
            return bestBid?.price ?? this.orderBook.lastPrice;
        }
    }

    /**
     * Execute a market order - match against available liquidity
     */
    private executeMarketOrder(order: OrderEntry): MatchResult {
        const trades: Trade[] = [];
        let totalFilled = 0;
        let totalCost = 0;

        const matchingLevels = order.side === 'buy'
            ? this.orderBook.getSortedAsks()  // Buy: match against asks (lowest first)
            : this.orderBook.getSortedBids(); // Sell: match against bids (highest first)

        // FOK: Check if we can fill the ENTIRE quantity immediately
        if (order.condition === 'FOK') {
            let available = 0;
            for (const level of matchingLevels) {
                available += level.totalQuantity;
                if (available >= order.quantity) break;
            }
            if (available < order.quantity) {
                return {
                    orderId: order.orderId,
                    status: 'cancelled',
                    filledQuantity: 0,
                    remainingQuantity: 0,
                    averagePrice: 0,
                    totalCost: 0,
                    commission: 0,
                    trades: [],
                };
            }
        }

        for (const level of matchingLevels) {
            if (order.remainingQuantity <= 0) break;

            // Match against each order in the level (FIFO)
            for (const makerOrder of [...level.orders]) {
                if (order.remainingQuantity <= 0) break;
                if (makerOrder.remainingQuantity <= 0) continue;

                const fillQuantity = Math.min(order.remainingQuantity, makerOrder.remainingQuantity);
                const fillPrice = makerOrder.price; // Trade at maker's price
                const fillTotal = fillQuantity * fillPrice;

                // Create trade record with sequence suffix for uniqueness
                const trade: Trade = {
                    tradeId: generateTradeId(this.tradeSequence++),
                    timestamp: Date.now(),
                    price: fillPrice,
                    quantity: fillQuantity,
                    buyOrderId: order.side === 'buy' ? order.orderId : makerOrder.orderId,
                    sellOrderId: order.side === 'sell' ? order.orderId : makerOrder.orderId,
                    takerSide: order.side,
                    makerSource: makerOrder.source,
                    takerSource: order.source,
                };

                trades.push(trade);
                this.addTrade(trade);

                // Update quantities
                order.remainingQuantity -= fillQuantity;
                this.orderBook.updateOrderQuantity(makerOrder.orderId, fillQuantity);

                totalFilled += fillQuantity;
                totalCost += fillTotal;

                // Update last price
                this.orderBook.lastPrice = fillPrice;
            }
        }

        // Determine status
        let status: MatchingOrderStatus;
        if (order.remainingQuantity <= 0) {
            status = 'filled';
        } else if (totalFilled > 0) {
            status = 'partial';
            // For GTC, add remaining to order book. For IOC/FOK, do not.
            if (order.remainingQuantity > 0 && order.condition === 'GTC' && this.orderBook.lastPrice > 0) {
                order.price = this.orderBook.lastPrice;
                order.type = 'limit';
                this.orderBook.addOrder(order);
            } else if (order.remainingQuantity > 0) {
                // IOC/FOK remnant is cancelled
                status = 'cancelled';
            }
        } else {
            status = order.condition === 'GTC' ? 'pending' : 'cancelled';
        }

        // Round total cost to integer
        totalCost = Math.round(totalCost);
        const averagePrice = totalFilled > 0 ? totalCost / totalFilled : 0;
        const commission = calculateTradeCommission(totalCost, this.commissionRate);

        return {
            orderId: order.orderId,
            status,
            filledQuantity: totalFilled,
            remainingQuantity: order.remainingQuantity,
            averagePrice,
            totalCost,
            commission,
            trades,
        };
    }

    /**
     * Execute a limit order - match if price crosses, else add to book
     */
    private executeLimitOrder(order: OrderEntry): MatchResult {
        const trades: Trade[] = [];
        let totalFilled = 0;
        let totalCost = 0;

        // FOK: Check if we can fill the ENTIRE quantity immediately within price limit
        if (order.condition === 'FOK') {
            let available = 0;
            const matchingLevels = order.side === 'buy'
                ? this.orderBook.getSortedAsks()
                : this.orderBook.getSortedBids();

            for (const level of matchingLevels) {
                if (order.side === 'buy' && level.price > order.price) break;
                if (order.side === 'sell' && level.price < order.price) break;
                available += level.totalQuantity;
                if (available >= order.quantity) break;
            }

            if (available < order.quantity) {
                return {
                    orderId: order.orderId,
                    status: 'cancelled',
                    filledQuantity: 0,
                    remainingQuantity: 0,
                    averagePrice: 0,
                    totalCost: 0,
                    commission: 0,
                    trades: [],
                };
            }
        }

        // Check for matching orders
        if (order.side === 'buy') {
            // Buy limit: match against asks at or below limit price
            const asks = this.orderBook.getSortedAsks();

            for (const level of asks) {
                if (order.remainingQuantity <= 0) break;
                if (level.price > order.price) break; // No more matches possible

                for (const makerOrder of [...level.orders]) {
                    if (order.remainingQuantity <= 0) break;
                    if (makerOrder.remainingQuantity <= 0) continue;

                    const fillQuantity = Math.min(order.remainingQuantity, makerOrder.remainingQuantity);
                    const fillPrice = makerOrder.price; // Trade at maker's price
                    const fillTotal = fillQuantity * fillPrice;

                    const trade: Trade = {
                        tradeId: generateTradeId(this.tradeSequence++),
                        timestamp: Date.now(),
                        price: fillPrice,
                        quantity: fillQuantity,
                        buyOrderId: order.orderId,
                        sellOrderId: makerOrder.orderId,
                        takerSide: 'buy',
                        makerSource: makerOrder.source,
                        takerSource: order.source,
                    };

                    trades.push(trade);
                    this.addTrade(trade);

                    order.remainingQuantity -= fillQuantity;
                    this.orderBook.updateOrderQuantity(makerOrder.orderId, fillQuantity);

                    totalFilled += fillQuantity;
                    totalCost += fillTotal;
                    this.orderBook.lastPrice = fillPrice;
                }
            }
        } else {
            // Sell limit: match against bids at or above limit price
            const bids = this.orderBook.getSortedBids();

            for (const level of bids) {
                if (order.remainingQuantity <= 0) break;
                if (level.price < order.price) break; // No more matches possible

                for (const makerOrder of [...level.orders]) {
                    if (order.remainingQuantity <= 0) break;
                    if (makerOrder.remainingQuantity <= 0) continue;

                    const fillQuantity = Math.min(order.remainingQuantity, makerOrder.remainingQuantity);
                    const fillPrice = makerOrder.price;
                    const fillTotal = fillQuantity * fillPrice;

                    const trade: Trade = {
                        tradeId: generateTradeId(this.tradeSequence++),
                        timestamp: Date.now(),
                        price: fillPrice,
                        quantity: fillQuantity,
                        buyOrderId: makerOrder.orderId,
                        sellOrderId: order.orderId,
                        takerSide: 'sell',
                        makerSource: makerOrder.source,
                        takerSource: order.source,
                    };

                    trades.push(trade);
                    this.addTrade(trade);

                    order.remainingQuantity -= fillQuantity;
                    this.orderBook.updateOrderQuantity(makerOrder.orderId, fillQuantity);

                    totalFilled += fillQuantity;
                    totalCost += fillTotal;
                    this.orderBook.lastPrice = fillPrice;
                }
            }
        }

        // Determine status and handle remaining quantity
        let status: MatchingOrderStatus;
        if (order.remainingQuantity <= 0) {
            status = 'filled';
        } else if (totalFilled > 0) {
            status = 'partial';
            if (order.condition === 'GTC') {
                this.orderBook.addOrder(order);
            } else {
                status = 'cancelled'; // IOC remnant cancelled
            }
        } else {
            status = order.condition === 'GTC' ? 'pending' : 'cancelled';
            if (order.condition === 'GTC') {
                this.orderBook.addOrder(order);
            }
        }

        const averagePrice = totalFilled > 0 ? totalCost / totalFilled : 0;
        const commission = calculateTradeCommission(totalCost, this.commissionRate);

        return {
            orderId: order.orderId,
            status,
            filledQuantity: totalFilled,
            remainingQuantity: order.remainingQuantity,
            averagePrice,
            totalCost,
            commission,
            trades,
        };
    }

    /**
     * Add a trade to history
     */
    private addTrade(trade: Trade): void {
        this.trades.push(trade);

        // Trim history if needed
        if (this.trades.length > this.maxTradesHistory) {
            this.trades = this.trades.slice(-this.maxTradesHistory);
        }
    }

    /**
     * Cancel an order
     */
    cancelOrder(orderId: string): boolean {
        return this.orderBook.cancelOrder(orderId);
    }

    /**
     * Cancel all orders from a source
     */
    cancelOrdersBySource(source: OrderSource): number {
        return this.orderBook.cancelOrdersBySource(source);
    }

    /**
     * Get order book snapshot for display
     */
    getOrderBookSnapshot(depth: number = 15, excludeSource?: OrderSource) {
        return this.orderBook.getSnapshot(depth, excludeSource);
    }

    /**
     * Reset the engine
     */
    reset(initialPrice: number = 150): void {
        this.orderBook.clear();
        this.trades = [];
        this.orderBook.lastPrice = initialPrice;
    }

    /**
     * Get volume statistics
     */
    getVolumeStats(): {
        volume24h: number;
        tradeCount24h: number;
        averageTradeSize: number;
    } {
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;

        const recentTrades = this.trades.filter(t => t.timestamp >= dayAgo);
        const volume24h = recentTrades.reduce((sum, t) => sum + t.price * t.quantity, 0);
        const tradeCount24h = recentTrades.length;
        const averageTradeSize = tradeCount24h > 0
            ? recentTrades.reduce((sum, t) => sum + t.quantity, 0) / tradeCount24h
            : 0;

        return { volume24h, tradeCount24h, averageTradeSize };
    }
}
