// Order-related type definitions

export type OrderType = 'market' | 'limit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'filled' | 'partial' | 'cancelled';
export type OrderCondition = 'GTC' | 'IOC' | 'FOK';

// Input for creating a new order
export interface OrderInput {
    side: OrderSide;
    type: OrderType;
    quantity: number;       // 股數
    price?: number;         // 限價 (限價單時必填)
    leverage: number;       // 槓桿倍數
}

// Complete order object
export interface Order extends OrderInput {
    id: string;
    timestamp: number;
    status: OrderStatus;
    filledQuantity: number;
    filledPrice: number;
    totalCost: number;      // quantity × price
    commission: number;     // 手續費
}

// Pending order (limit order waiting to be filled)
export interface PendingOrder {
    orderId: string;
    timestamp: number;
    side: OrderSide;
    quantity: number;
    remainingQuantity: number;
    limitPrice: number;
    leverage: number;
    status: 'pending' | 'partial';
}

// Filled order result from matching
export interface FilledOrder {
    orderId: string;
    tradeId?: string;
    timestamp: number;
    side: OrderSide;
    quantity: number;
    price: number;
    total: number;
    commission: number;
    pnl?: number;
}

// Order form state
export interface OrderFormState {
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price: number;
    leverage: number;
    isValid: boolean;
    errorMessage?: string;
}

// Order preview calculation
export interface OrderPreviewData {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price: number;
    subtotal: number;       // quantity × price
    commission: number;     // 手續費
    total: number;          // subtotal + commission
    availableBalance: number;
    isAffordable: boolean;
}

