import { OrderSide, FilledOrder } from '@/types';
import { CONFIG } from '@/constants';
import { calculateCommission } from './utils';

interface OrderBookEntry {
    price: string;
    size: string;
    bg: string;
}

interface OrderBook {
    asks: OrderBookEntry[];
    bids: OrderBookEntry[];
}

/**
 * Execute a market order by consuming order book entries sequentially
 * Returns array of filled orders (one per price level consumed)
 */
export function executeMarketOrder(
    side: OrderSide,
    quantity: number,
    orderBook: OrderBook,
    orderId: string
): { filledOrders: FilledOrder[], remainingQuantity: number, totalCost: number } {
    const filledOrders: FilledOrder[] = [];
    let remainingQuantity = quantity;
    let totalCost = 0;

    // For buy: consume asks (lowest first, so reverse order since asks are sorted high-to-low)
    // For sell: consume bids (highest first, already sorted high-to-low)
    const entries = side === 'buy'
        ? [...orderBook.asks].reverse()  // Buy: start from lowest ask
        : [...orderBook.bids];            // Sell: start from highest bid

    for (const entry of entries) {
        if (remainingQuantity <= 0) break;

        const entryPrice = parseFloat(entry.price);
        const entrySize = parseInt(entry.size);

        if (entrySize <= 0) continue;

        // How many shares can we fill at this price level?
        const fillQuantity = Math.min(remainingQuantity, entrySize);
        const fillTotal = fillQuantity * entryPrice;
        const commission = calculateCommission(fillTotal);

        const filledOrder: FilledOrder = {
            orderId: `${orderId}-${filledOrders.length + 1}`,
            timestamp: Date.now(),
            side,
            quantity: fillQuantity,
            price: entryPrice,
            total: fillTotal,
            commission,
        };

        filledOrders.push(filledOrder);
        remainingQuantity -= fillQuantity;
        totalCost += fillTotal + commission;
    }

    return { filledOrders, remainingQuantity, totalCost };
}

/**
 * Check if a pending (limit) order can be filled against current order book
 * Returns filled order if matched, null otherwise
 */
export function checkLimitOrderMatch(
    pendingOrder: {
        orderId: string;
        side: OrderSide;
        remainingQuantity: number;
        limitPrice: number;
    },
    orderBook: OrderBook
): FilledOrder | null {
    const { side, remainingQuantity, limitPrice, orderId } = pendingOrder;

    if (side === 'buy') {
        // Buy limit order: fill if there's an ask at or below limit price
        const matchingAsks = orderBook.asks
            .map(a => ({ price: parseFloat(a.price), size: parseInt(a.size) }))
            .filter(a => a.price <= limitPrice && a.size > 0)
            .sort((a, b) => a.price - b.price); // Lowest first

        if (matchingAsks.length === 0) return null;

        const bestMatch = matchingAsks[0];
        const fillQuantity = Math.min(remainingQuantity, bestMatch.size);
        const fillTotal = fillQuantity * bestMatch.price;
        const commission = calculateCommission(fillTotal);

        return {
            orderId,
            timestamp: Date.now(),
            side,
            quantity: fillQuantity,
            price: bestMatch.price,
            total: fillTotal,
            commission,
        };
    } else {
        // Sell limit order: fill if there's a bid at or above limit price
        const matchingBids = orderBook.bids
            .map(b => ({ price: parseFloat(b.price), size: parseInt(b.size) }))
            .filter(b => b.price >= limitPrice && b.size > 0)
            .sort((a, b) => b.price - a.price); // Highest first

        if (matchingBids.length === 0) return null;

        const bestMatch = matchingBids[0];
        const fillQuantity = Math.min(remainingQuantity, bestMatch.size);
        const fillTotal = fillQuantity * bestMatch.price;
        const commission = calculateCommission(fillTotal);

        return {
            orderId,
            timestamp: Date.now(),
            side,
            quantity: fillQuantity,
            price: bestMatch.price,
            total: fillTotal,
            commission,
        };
    }
}

/**
 * Get best available price from order book
 */
export function getBestPrice(side: OrderSide, orderBook: OrderBook): number | null {
    if (side === 'buy') {
        // Best ask (lowest)
        const asks = orderBook.asks.map(a => parseFloat(a.price)).filter(p => !isNaN(p));
        return asks.length > 0 ? Math.min(...asks) : null;
    } else {
        // Best bid (highest)
        const bids = orderBook.bids.map(b => parseFloat(b.price)).filter(p => !isNaN(p));
        return bids.length > 0 ? Math.max(...bids) : null;
    }
}
