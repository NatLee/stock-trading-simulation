// Trading-related type definitions

export interface CandleData {
    open: number;
    close: number;
    high: number;
    low: number;
    volume: number;
    timestamp: number;
}

// Legacy Position type (kept for compatibility)
export interface Position {
    id: string;
    type: 'long' | 'short';
    entryPrice: number;
    leverage: number;
    size: number;
    openTime: number;
}

// NEW: Holding - represents current stock ownership
export interface Holding {
    symbol: string;
    quantity: number;        // 持有股數 (正=多頭, 負=空頭)
    averageCost: number;     // 平均成本價
    marketValue: number;     // 當前市值
    unrealizedPnl: number;   // 未實現盈虧
    unrealizedPnlPercent: number;
}

// NEW: Order Record - tracks each transaction with sequential ID
export interface OrderRecord {
    orderId: string;         // 流水單號 (ORD-YYYYMMDD-XXXX)
    tradeId?: string;        // 撮合編號 (防止 key 重複)
    timestamp: number;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    total: number;           // quantity × price
    commission: number;
    status: 'filled' | 'cancelled' | 'pending';
    pnl?: number;            // Realized P&L for this trade
}

export type MarketRegime = 'BULL' | 'BEAR' | 'CHOP';

export interface SignalMarker {
    candleIndex: number;
    price: number;
    type: 'LONG' | 'SHORT' | 'ALERT';
    label: string;
}

export interface MarketStats {
    high: number;
    low: number;
    vol: string;
    sentiment: number;
    regime: MarketRegime;
}

// Legacy TradeRecord (deprecated, use OrderRecord instead)
export interface TradeRecord {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    entryPrice: number;
    exitPrice?: number;
    entryTime: number;
    exitTime?: number;
    pnl?: number;
    pnlPercent?: number;
    status: 'open' | 'closed';
    leverage: number;
    commission: number;
}

// Trading account state
export interface TradingAccount {
    balance: number;
    equity: number;
    unrealizedPnl: number;
    holdings: Holding[];
    orderHistory: OrderRecord[];
}
