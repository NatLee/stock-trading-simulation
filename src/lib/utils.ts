import { CandleData } from '@/types';

/**
 * Calculate Simple Moving Average
 */
export const calculateSMA = (data: CandleData[], period: number, index: number): number | null => {
    if (index < period - 1) return null;
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[index - i].close;
    }
    return sum / period;
};

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Format number with commas
 */
export const formatNumber = (num: number, decimals = 2): string => {
    return num.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
};

/**
 * Format currency
 */
export const formatCurrency = (num: number, decimals = 2): string => {
    return `$${formatNumber(num, decimals)}`;
};

/**
 * Format percentage
 */
export const formatPercent = (num: number, decimals = 2): string => {
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(decimals)}%`;
};

/**
 * Clamp a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};

/**
 * Get current time string
 */
export const getTimeString = (): string => {
    return new Date().toLocaleTimeString().split(' ')[0];
};

/**
 * Calculate order commission (Handling Fee)
 * Rule: 0.1425%, Minimum 20 TWD (default), integer rounding
 */
export const calculateCommission = (total: number, rate = 0.001425, minFee = 20): number => {
    // 1 TWD min for small odd lots logic could go here if needed, but standard is 20
    // User requested: "Minimum 20 TWD rules"
    const fee = Math.floor(total * rate); // Typically floor or round? Tw stocks usually floor then take max
    // Use standard rounding for sim simplicity or follow Math.floor logic often used
    const rawFee = Math.floor(total * rate);
    return Math.max(rawFee, minFee);
};

/**
 * Calculate Transaction Tax (Sell Only)
 * Rule: 0.3% (Normal) or 0.15% (Day Trade)
 */
export const calculateTransactionTax = (total: number, isDayTrade = false): number => {
    const rate = isDayTrade ? 0.0015 : 0.003;
    return Math.floor(total * rate);
};

/**
 * Calculate PnL
 */
export const calculatePnL = (
    entryPrice: number,
    currentPrice: number,
    quantity: number,
    leverage: number,
    type: 'long' | 'short'
): number => {
    const diff = currentPrice - entryPrice;
    const raw = type === 'long' ? diff : -diff;
    return (raw / entryPrice) * quantity * entryPrice * leverage;
};

/**
 * Calculate PnL percentage
 */
export const calculatePnLPercent = (
    entryPrice: number,
    currentPrice: number,
    type: 'long' | 'short'
): number => {
    const diff = currentPrice - entryPrice;
    const raw = type === 'long' ? diff : -diff;
    return (raw / entryPrice) * 100;
};
