// Matching Engine Type Definitions

import { SimEnv, realEnv } from '../sim/env';

/**
 * Order side - buy or sell
 */
export type OrderSide = 'buy' | 'sell';

/**
 * Order type - market or limit
 */
export type MatchingOrderType = 'market' | 'limit';

/**
 * Order source - user placed or bot generated
 */
export type OrderSource = 'user' | 'bot';

/**
 * Order condition - execution strategy
 */
export type OrderCondition = 'GTC' | 'IOC' | 'FOK';

/**
 * Order status in the matching system
 */
export type MatchingOrderStatus = 'pending' | 'partial' | 'filled' | 'cancelled';

/**
 * An order entry in the order book
 */
export interface OrderEntry {
    orderId: string;
    timestamp: number;
    side: OrderSide;
    price: number;
    quantity: number;
    remainingQuantity: number;
    type: MatchingOrderType;
    source: OrderSource;
    condition?: OrderCondition;
}

/**
 * A specific lot of shares held
 */
export interface HoldingLot {
    id: string;
    tradeId: string;
    timestamp: number;
    side: 'buy' | 'sell'; // buy = long, sell = short
    price: number;
    quantity: number;
    originalQuantity: number;
    commission: number; // Commission paid for the original quantity
}

/**
 * A price level in the order book containing multiple orders (FIFO queue)
 */
export interface PriceLevel {
    price: number;
    orders: OrderEntry[];
    totalQuantity: number;
}

/**
 * Order book snapshot for UI display
 */
export interface OrderBookSnapshot {
    asks: OrderBookLevel[];  // Sorted: lowest price first
    bids: OrderBookLevel[];  // Sorted: highest price first
    spread: number;
    bestAsk: number | null;
    bestBid: number | null;
    lastPrice: number;
    timestamp: number;
}

/**
 * Simplified price level for display
 */
export interface OrderBookLevel {
    price: number;
    quantity: number;
    orderCount: number;
    hasUserOrder: boolean;
    hasBotOrder: boolean;
}

/**
 * A completed trade between two orders
 */
export interface Trade {
    tradeId: string;
    timestamp: number;
    price: number;
    quantity: number;
    buyOrderId: string;
    sellOrderId: string;
    takerSide: OrderSide;
    makerSource: OrderSource;
    takerSource: OrderSource;
}

/**
 * Result of submitting an order to the matching engine
 */
export interface MatchResult {
    orderId: string;
    status: MatchingOrderStatus;
    filledQuantity: number;
    remainingQuantity: number;
    averagePrice: number;
    totalCost: number;
    commission: number;
    trades: Trade[];
}

/**
 * Market scenario preset
 */
export type MarketScenario =
    | 'bull'          // 強勢多頭
    | 'bear'          // 弱勢空頭
    | 'sideways'      // 盤整
    | 'volatile'      // 劇烈震盪
    | 'calm'          // 冷清
    | 'breakout'      // 盤整突破
    | 'crash'         // 恐慌崩盤
    | 'accumulation'  // 主力吸籌
    | 'distribution'  // 主力出貨
    | 'pump_dump'     // 拉高出貨
    | 'dead_cat'      // 死貓反彈
    | 'squeeze';      // 盤整待變


/**
 * Commission rate (0.1%)
 */
export const COMMISSION_RATE = 0.001;

/**
 * Calculate commission for a trade (rounded to an integer, like TWD)
 */
export function calculateTradeCommission(total: number, rate: number = COMMISSION_RATE): number {
    // TWD usually has minimum 20, but for sim just round to integer
    return Math.round(total * rate);
}

/**
 * Generate unique order ID
 */
export function generateOrderId(prefix: string = 'ORD', env: SimEnv = realEnv): string {
    const timestamp = env.now().toString(36);
    const random = env.random().toString(36).substring(2, 6);
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

/**
 * Generate unique trade ID
 */
export function generateTradeId(suffix?: string | number, env: SimEnv = realEnv): string {
    const id = generateOrderId('TRD', env);
    return suffix !== undefined ? `${id}-${suffix}` : id;
}
