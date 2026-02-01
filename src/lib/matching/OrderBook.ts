import {
    OrderEntry,
    OrderSide,
    PriceLevel,
    OrderBookSnapshot,
    OrderBookLevel,
    OrderSource,
} from './types';

/**
 * Order Book - manages buy and sell orders with price-time priority
 * 
 * Data Structure:
 * - Uses Map<number, PriceLevel> for O(1) price level lookup
 * - Each PriceLevel contains FIFO queue of orders
 * - Maintains sorted arrays for efficient best price access
 */
export class OrderBook {
    private asks: Map<number, PriceLevel> = new Map(); // sell orders (ascending by price)
    private bids: Map<number, PriceLevel> = new Map(); // buy orders (descending by price)
    private orderIndex: Map<string, OrderEntry> = new Map(); // orderId -> order
    private _lastPrice: number;
    private _lastTradeTime: number = Date.now();

    constructor(initialPrice: number = 150) {
        this._lastPrice = initialPrice;
    }

    /**
     * Get the last traded price
     */
    get lastPrice(): number {
        return this._lastPrice;
    }

    /**
     * Set the last traded price (called after a trade)
     */
    set lastPrice(price: number) {
        this._lastPrice = price;
        this._lastTradeTime = Date.now();
    }

    /**
     * Add an order to the order book
     * Returns the order entry that was added (may be partially filled)
     */
    addOrder(order: OrderEntry): OrderEntry {
        const side = order.side;
        const book = side === 'sell' ? this.asks : this.bids;

        // Get or create price level
        let level = book.get(order.price);
        if (!level) {
            level = {
                price: order.price,
                orders: [],
                totalQuantity: 0,
            };
            book.set(order.price, level);
        }

        // Add order to the end of the queue (FIFO)
        level.orders.push(order);
        level.totalQuantity += order.remainingQuantity;

        // Index the order for quick lookup
        this.orderIndex.set(order.orderId, order);

        return order;
    }

    /**
     * Remove an order from the order book
     * Returns true if order was found and removed
     */
    cancelOrder(orderId: string): boolean {
        const order = this.orderIndex.get(orderId);
        if (!order || order.remainingQuantity <= 0) {
            return false;
        }

        const book = order.side === 'sell' ? this.asks : this.bids;
        const level = book.get(order.price);

        if (!level) return false;

        const orderIndex = level.orders.findIndex(o => o.orderId === orderId);
        if (orderIndex === -1) return false;

        // Remove from level
        level.totalQuantity -= order.remainingQuantity;
        level.orders.splice(orderIndex, 1);

        // Remove empty level
        if (level.orders.length === 0) {
            book.delete(order.price);
        }

        // Remove from index
        this.orderIndex.delete(orderId);

        return true;
    }

    /**
     * Get the best (lowest) ask price level
     */
    getBestAsk(): PriceLevel | null {
        if (this.asks.size === 0) return null;

        let bestPrice = Infinity;
        let bestLevel: PriceLevel | null = null;

        for (const [price, level] of this.asks) {
            if (price < bestPrice && level.totalQuantity > 0) {
                bestPrice = price;
                bestLevel = level;
            }
        }

        return bestLevel;
    }

    /**
     * Get the best (highest) bid price level
     */
    getBestBid(): PriceLevel | null {
        if (this.bids.size === 0) return null;

        let bestPrice = -Infinity;
        let bestLevel: PriceLevel | null = null;

        for (const [price, level] of this.bids) {
            if (price > bestPrice && level.totalQuantity > 0) {
                bestPrice = price;
                bestLevel = level;
            }
        }

        return bestLevel;
    }

    /**
     * Get current spread
     */
    getSpread(): number {
        const bestAsk = this.getBestAsk();
        const bestBid = this.getBestBid();

        if (!bestAsk || !bestBid) return 0;
        return bestAsk.price - bestBid.price;
    }

    /**
     * Get all asks sorted by price (ascending)
     */
    getSortedAsks(): PriceLevel[] {
        return Array.from(this.asks.values())
            .filter(level => level.totalQuantity > 0)
            .sort((a, b) => a.price - b.price);
    }

    /**
     * Get all bids sorted by price (descending)
     */
    getSortedBids(): PriceLevel[] {
        return Array.from(this.bids.values())
            .filter(level => level.totalQuantity > 0)
            .sort((a, b) => b.price - a.price);
    }

    /**
     * Get order book snapshot for UI display
     */
    getSnapshot(depth: number = 15, excludeSource?: OrderSource): OrderBookSnapshot {
        // Filter levels before sorting/slicing is less efficient but correct for "snapshot of valid orders"
        // But cleaner to get sorted levels then filter orders? 
        // If we filter orders, a level might become empty.

        // Strategy: Get sorted levels, iterate and filter orders, recalculate quantity.
        // If quantity becomes 0, skip level.
        // We need 'depth' valid levels. So we might need to iterate more than 'depth' raw levels.

        const processLevels = (levels: PriceLevel[]): OrderBookLevel[] => {
            const result: OrderBookLevel[] = [];
            for (const level of levels) {
                if (result.length >= depth) break;

                const validOrders = excludeSource
                    ? level.orders.filter(o => o.source !== excludeSource)
                    : level.orders;

                if (validOrders.length === 0) continue;

                const quantity = validOrders.reduce((sum, o) => sum + o.remainingQuantity, 0);

                result.push({
                    price: level.price,
                    quantity: quantity,
                    orderCount: validOrders.length,
                    hasUserOrder: validOrders.some(o => o.source === 'user'),
                    hasBotOrder: validOrders.some(o => o.source === 'bot'),
                });
            }
            return result;
        };

        const asks = processLevels(this.getSortedAsks());
        const bids = processLevels(this.getSortedBids());

        // Recalculate best/spread based on filtered result
        const bestAsk = asks[0]?.price ?? null;
        const bestBid = bids[0]?.price ?? null;
        const spread = bestAsk && bestBid ? bestAsk - bestBid : 0;

        return {
            asks, // Changed: Low -> High for side-by-side view (Top is Best Ask)
            bids, // Bids are High -> Low (Best Bid at top)
            spread,
            bestAsk,
            bestBid,
            lastPrice: this._lastPrice,
            timestamp: Date.now(),
        };
    }

    /**
     * Get an order by ID
     */
    getOrder(orderId: string): OrderEntry | undefined {
        return this.orderIndex.get(orderId);
    }

    /**
     * Get all orders from a specific source
     */
    getOrdersBySource(source: OrderSource): OrderEntry[] {
        return Array.from(this.orderIndex.values())
            .filter(order => order.source === source && order.remainingQuantity > 0);
    }

    /**
     * Cancel all orders from a specific source
     */
    cancelOrdersBySource(source: OrderSource): number {
        const orders = this.getOrdersBySource(source);
        let cancelled = 0;

        for (const order of orders) {
            if (this.cancelOrder(order.orderId)) {
                cancelled++;
            }
        }

        return cancelled;
    }

    /**
     * Cancel orders from a specific source that are too far from reference price
     */
    pruneDistantOrders(referencePrice: number, thresholdPercent: number, source: OrderSource): number {
        const lowerBound = referencePrice * (1 - thresholdPercent);
        const upperBound = referencePrice * (1 + thresholdPercent);
        let cancelled = 0;
        const ordersToCancel: string[] = [];

        // Scan Asks (> upperBound)
        for (const [price, level] of this.asks) {
            if (price > upperBound) {
                for (const order of level.orders) {
                    if (order.source === source) ordersToCancel.push(order.orderId);
                }
            }
        }

        // Scan Bids (< lowerBound)
        for (const [price, level] of this.bids) {
            if (price < lowerBound) {
                for (const order of level.orders) {
                    if (order.source === source) ordersToCancel.push(order.orderId);
                }
            }
        }

        // Execute cancellations
        ordersToCancel.forEach(id => {
            if (this.cancelOrder(id)) cancelled++;
        });

        return cancelled;
    }

    /**
     * Get total volume on each side
     */
    getTotalVolume(): { askVolume: number; bidVolume: number } {
        let askVolume = 0;
        let bidVolume = 0;

        for (const level of this.asks.values()) {
            askVolume += level.totalQuantity;
        }

        for (const level of this.bids.values()) {
            bidVolume += level.totalQuantity;
        }

        return { askVolume, bidVolume };
    }

    /**
     * Update order after partial fill (internal use)
     */
    updateOrderQuantity(orderId: string, filledQuantity: number): void {
        const order = this.orderIndex.get(orderId);
        if (!order) return;

        order.remainingQuantity -= filledQuantity;

        const book = order.side === 'sell' ? this.asks : this.bids;
        const level = book.get(order.price);

        if (level) {
            level.totalQuantity -= filledQuantity;

            // Remove fully filled order from level
            if (order.remainingQuantity <= 0) {
                const idx = level.orders.findIndex(o => o.orderId === orderId);
                if (idx !== -1) {
                    level.orders.splice(idx, 1);
                }
                this.orderIndex.delete(orderId);

                // Remove empty level
                if (level.orders.length === 0) {
                    book.delete(order.price);
                }
            }
        }
    }

    /**
     * Clear all orders (reset)
     */
    clear(): void {
        this.asks.clear();
        this.bids.clear();
        this.orderIndex.clear();
    }

    /**
     * Get statistics
     */
    getStats(): {
        askLevels: number;
        bidLevels: number;
        totalOrders: number;
        askVolume: number;
        bidVolume: number;
    } {
        const { askVolume, bidVolume } = this.getTotalVolume();
        return {
            askLevels: this.asks.size,
            bidLevels: this.bids.size,
            totalOrders: this.orderIndex.size,
            askVolume,
            bidVolume,
        };
    }
}
