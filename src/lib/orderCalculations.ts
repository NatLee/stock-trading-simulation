import { CONFIG } from '@/constants';

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
 * Generate simulated order book based on current price
 * Prices are tightly distributed around the current price
 * Sizes are randomly generated within configured range
 */
export const generateOrderBook = (currentPrice: number, volatility: number): OrderBook => {
    const spreadPercent = CONFIG.SPREAD_PERCENT;
    const depth = CONFIG.ORDER_BOOK_DEPTH;
    const sizeMin = CONFIG.ORDER_SIZE_MIN;
    const sizeMax = CONFIG.ORDER_SIZE_MAX;
    const volatilityMultiplier = volatility > 5 ? 2 : 1;

    // Generate asks (sell orders) - prices above current
    const asks = Array.from({ length: depth }).map((_, i) => {
        const priceOffset = spreadPercent + i * 0.0005 + Math.random() * 0.0003;
        const price = currentPrice * (1 + priceOffset);
        const size = Math.floor(sizeMin + Math.random() * (sizeMax - sizeMin) * volatilityMultiplier);
        return {
            price: price.toFixed(2),
            size: size.toString(),
            bg: `rgba(244, 63, 94, ${0.1 + (depth - i) * 0.02})`
        };
    }).reverse(); // Lowest ask first (closest to current price)

    // Generate bids (buy orders) - prices below current
    const bids = Array.from({ length: depth }).map((_, i) => {
        const priceOffset = spreadPercent + i * 0.0005 + Math.random() * 0.0003;
        const price = currentPrice * (1 - priceOffset);
        const size = Math.floor(sizeMin + Math.random() * (sizeMax - sizeMin) * volatilityMultiplier);
        return {
            price: price.toFixed(2),
            size: size.toString(),
            bg: `rgba(16, 185, 129, ${0.1 + (depth - i) * 0.02})`
        };
    }); // Highest bid first (closest to current price)

    return { asks, bids };
};


/**
 * Calculate maximum quantity based on available balance and price
 */
export const calculateMaxQuantity = (
    balance: number,
    price: number,
    leverage: number,
    commissionRate = CONFIG.COMMISSION_RATE
): number => {
    const effectiveBalance = balance * leverage;
    const priceWithCommission = price * (1 + commissionRate);
    return Math.floor(effectiveBalance / priceWithCommission);
};

/**
 * Calculate quantity from percentage of balance
 */
export const calculateQuantityFromPercent = (
    balance: number,
    percent: number,
    price: number,
    leverage: number,
    commissionRate = CONFIG.COMMISSION_RATE
): number => {
    const effectiveBalance = (balance * percent / 100) * leverage;
    const priceWithCommission = price * (1 + commissionRate);
    return Math.floor(effectiveBalance / priceWithCommission);
};

/**
 * Validate order input
 */
export const validateOrderInput = (
    quantity: number,
    price: number,
    balance: number,
    leverage: number
): { isValid: boolean; errorMessage?: string } => {
    if (quantity <= 0) {
        return { isValid: false, errorMessage: 'Quantity must be greater than 0' };
    }

    if (price <= 0) {
        return { isValid: false, errorMessage: 'Price must be greater than 0' };
    }

    const totalCost = quantity * price * (1 + CONFIG.COMMISSION_RATE);
    const maxAffordable = balance * leverage;

    if (totalCost > maxAffordable) {
        return { isValid: false, errorMessage: 'Insufficient balance' };
    }

    return { isValid: true };
};
