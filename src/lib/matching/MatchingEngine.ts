import { OrderBook } from './OrderBook';
import {
    OrderEntry,
    OrderSide,
    PriceLevel,
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
import { SimEnv, realEnv } from '../sim/env';

/** Would an order on `side` with this limit accept `price`? */
function withinLimit(side: OrderSide, price: number, limit: number): boolean {
    return side === 'buy' ? price <= limit : price >= limit;
}

/** What an FOK order that cannot be filled completely returns */
function cancelledResult(orderId: string): MatchResult {
    return {
        orderId,
        status: 'cancelled',
        filledQuantity: 0,
        remainingQuantity: 0,
        averagePrice: 0,
        totalCost: 0,
        commission: 0,
        trades: [],
    };
}

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
    private env: SimEnv;

    constructor(initialPrice: number = 150, env: SimEnv = realEnv) {
        this.env = env;
        this.orderBook = new OrderBook(initialPrice, env);
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
     * Total number of trades since the engine was created.
     * Counts trades that already fell out of the kept history too, so it works
     * as a cursor: remember it, and later ask for everything after it.
     */
    getTradeCount(): number {
        return this.tradeSequence;
    }

    /**
     * Trades made after the engine had `count` trades, oldest first.
     * If more trades happened than the kept history holds, you get what is kept.
     */
    getTradesSince(count: number): Trade[] {
        const missing = Math.min(this.tradeSequence - count, this.trades.length);
        if (missing <= 0) return [];
        return this.trades.slice(this.trades.length - missing);
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
        const orderId = generateOrderId(source === 'user' ? 'USR' : 'BOT', this.env);

        // Normalize price to prevent Order Book fragmentation due to floating point issues
        let finalPrice = price;
        if (finalPrice !== null) {
            // Snap to nearest valid tick to match bot orders and avoid floating point splits
            // e.g. 150.0000001 -> 150.0
            finalPrice = PriceStep.roundToTick(finalPrice);

            // Price floor protection - prevent negative prices (Taiwan stock market rule)
            // Minimum price is 0.01 (smallest tick size)
            if (finalPrice < 0.01) {
                finalPrice = 0.01;
            }
        }

        // Create order entry
        const order: OrderEntry = {
            orderId,
            timestamp: this.env.now(),
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

    /** Price levels on the other side of the book, best price first */
    private opposingLevels(side: OrderSide): PriceLevel[] {
        return side === 'buy'
            ? this.orderBook.getSortedAsks()  // Buy: match against asks (lowest first)
            : this.orderBook.getSortedBids(); // Sell: match against bids (highest first)
    }

    /** FOK check: is there enough on the other side, within `limit` (null = any price)? */
    private canFillCompletely(order: OrderEntry, limit: number | null): boolean {
        let available = 0;
        for (const level of this.opposingLevels(order.side)) {
            if (limit !== null && !withinLimit(order.side, level.price, limit)) break;
            available += level.totalQuantity;
            if (available >= order.quantity) return true;
        }
        return false;
    }

    /**
     * Fill `order` against the other side of the book: best price first, and
     * oldest order first within a price (price-time priority). Every fill trades
     * at the resting (maker) order's price and becomes the new last price.
     * `limit` stops at prices the order would not accept (null = market order).
     */
    private fillAgainstBook(order: OrderEntry, limit: number | null): { trades: Trade[]; filled: number; cost: number } {
        const trades: Trade[] = [];
        let filled = 0;
        let cost = 0;

        for (const level of this.opposingLevels(order.side)) {
            if (order.remainingQuantity <= 0) break;
            if (limit !== null && !withinLimit(order.side, level.price, limit)) break; // No more matches possible

            // Match against each order in the level (FIFO)
            for (const makerOrder of [...level.orders]) {
                if (order.remainingQuantity <= 0) break;
                if (makerOrder.remainingQuantity <= 0) continue;

                const fillQuantity = Math.min(order.remainingQuantity, makerOrder.remainingQuantity);
                const fillPrice = makerOrder.price; // Trade at maker's price

                const trade: Trade = {
                    tradeId: generateTradeId(this.tradeSequence++, this.env),
                    timestamp: this.env.now(),
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

                order.remainingQuantity -= fillQuantity;
                this.orderBook.updateOrderQuantity(makerOrder.orderId, fillQuantity);

                filled += fillQuantity;
                cost += fillQuantity * fillPrice;
                this.orderBook.lastPrice = fillPrice;
            }
        }

        return { trades, filled, cost };
    }

    /**
     * Execute a market order - match against available liquidity
     */
    private executeMarketOrder(order: OrderEntry): MatchResult {
        // FOK: Check if we can fill the ENTIRE quantity immediately
        if (order.condition === 'FOK' && !this.canFillCompletely(order, null)) {
            return cancelledResult(order.orderId);
        }

        const { trades, filled: totalFilled, cost } = this.fillAgainstBook(order, null);

        // Determine status
        let status: MatchingOrderStatus;
        if (order.remainingQuantity <= 0) {
            status = 'filled';
        } else if (totalFilled > 0) {
            status = 'partial';
            // For GTC, add remaining to order book. For IOC/FOK, do not.
            if (order.condition === 'GTC' && this.orderBook.lastPrice > 0) {
                order.price = this.orderBook.lastPrice;
                order.type = 'limit';
                this.orderBook.addOrder(order);
            } else {
                // IOC/FOK remnant is cancelled
                status = 'cancelled';
            }
        } else {
            status = order.condition === 'GTC' ? 'pending' : 'cancelled';
        }

        // Round total cost to integer
        const totalCost = Math.round(cost);
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
        // FOK: Check if we can fill the ENTIRE quantity immediately within price limit
        if (order.condition === 'FOK' && !this.canFillCompletely(order, order.price)) {
            return cancelledResult(order.orderId);
        }

        // Buy limit: match asks at or below the limit; sell limit: bids at or above it
        const { trades, filled: totalFilled, cost: totalCost } = this.fillAgainstBook(order, order.price);

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

        // Trim history once it is twice the limit (not on every trade:
        // that copied 1000 trades for each new one)
        if (this.trades.length > this.maxTradesHistory * 2) {
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
        const now = this.env.now();
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
