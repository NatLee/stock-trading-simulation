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
 * Calculate order commission
 */
export const calculateCommission = (total: number, rate = 0.001425): number => {
    return Math.round(total * rate);
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
