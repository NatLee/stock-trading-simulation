import { CONFIG } from '@/constants';

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
