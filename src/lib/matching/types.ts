// Matching Engine Type Definitions

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
 * Market maker bot configuration
 */
export interface MarketMakerConfig {
    /** Base spread percentage (0.001 = 0.1%) */
    spreadPercent: number;
    /** Number of price levels on each side */
    depth: number;
    /** Order size range [min, max] */
    sizeRange: [number, number];
    /** How often to refresh quotes (ms) */
    refreshInterval: number;
    /** Max inventory before skewing quotes */
    inventoryLimit: number;
    /** Enable/disable the bot */
    enabled: boolean;
}

/**
 * Trend following bot configuration
 */
export interface TrendBotConfig {
    /** Aggressiveness (0-1) */
    aggressiveness: number;
    /** Order size range */
    sizeRange: [number, number];
    /** Trade frequency (ms) */
    tradeInterval: number;
    /** Enable/disable */
    enabled: boolean;
}

/**
 * Noise trader bot configuration
 */
export interface NoiseBotConfig {
    /** Trade frequency (ms) */
    tradeInterval: number;
    /** Order size range */
    sizeRange: [number, number];
    /** Probability of market vs limit order */
    marketOrderProbability: number;
    /** Enable/disable */
    enabled: boolean;
}

/**
 * Combined bot configuration with market conditions
 */
export interface MarketConfig {
    /** Initial price */
    initialPrice: number;
    /** Market scenario */
    scenario: MarketScenario;
    /** Volatility multiplier (1.0 = normal) */
    volatility: number;
    /** Liquidity multiplier (1.0 = normal) */
    liquidity: number;
    /** Market maker settings */
    marketMaker: MarketMakerConfig;
    /** Trend bot settings */
    trendBot: TrendBotConfig;
    /** Noise bot settings */
    noiseBot: NoiseBotConfig;
    /** Tick interval for market simulation (ms) */
    tickInterval: number;
}

/**
 * Preset market configurations
 */
export const MARKET_PRESETS: Record<MarketScenario, Partial<MarketConfig>> = {
    bull: {
        scenario: 'bull',
        volatility: 1.2,
        liquidity: 1.5,
        trendBot: {
            aggressiveness: 0.7,
            sizeRange: [10, 50],
            tradeInterval: 2000,
            enabled: true,
        },
    },
    bear: {
        scenario: 'bear',
        volatility: 1.3,
        liquidity: 1.2,
        trendBot: {
            aggressiveness: 0.7,
            sizeRange: [10, 50],
            tradeInterval: 2000,
            enabled: true,
        },
    },
    sideways: {
        scenario: 'sideways',
        volatility: 0.5,
        liquidity: 2.0,
        trendBot: {
            aggressiveness: 0.2,
            sizeRange: [5, 20],
            tradeInterval: 5000,
            enabled: true,
        },
    },
    volatile: {
        scenario: 'volatile',
        volatility: 2.5,
        liquidity: 0.8,
        trendBot: {
            aggressiveness: 0.5,
            sizeRange: [20, 100],
            tradeInterval: 1000,
            enabled: true,
        },
    },
    calm: {
        scenario: 'calm',
        volatility: 0.3,
        liquidity: 3.0,
        trendBot: {
            aggressiveness: 0.1,
            sizeRange: [5, 15],
            tradeInterval: 10000,
            enabled: false,
        },
    },
    breakout: {
        scenario: 'breakout',
        volatility: 1.8,
        liquidity: 1.3,
        trendBot: {
            aggressiveness: 0.8,
            sizeRange: [15, 60],
            tradeInterval: 1500,
            enabled: true,
        },
    },
    crash: {
        scenario: 'crash',
        volatility: 3.0,
        liquidity: 0.5,
        trendBot: {
            aggressiveness: 0.9,
            sizeRange: [20, 80],
            tradeInterval: 800,
            enabled: true,
        },
    },
    accumulation: {
        scenario: 'accumulation',
        volatility: 0.6,
        liquidity: 1.8,
        trendBot: {
            aggressiveness: 0.6,
            sizeRange: [10, 40],
            tradeInterval: 2000,
            enabled: true,
        },
    },
    distribution: {
        scenario: 'distribution',
        volatility: 0.8,
        liquidity: 1.5,
        trendBot: {
            aggressiveness: 0.6,
            sizeRange: [10, 40],
            tradeInterval: 2000,
            enabled: true,
        },
    },
    pump_dump: {
        scenario: 'pump_dump',
        volatility: 2.5,
        liquidity: 1.2,
        trendBot: {
            aggressiveness: 0.9, // Aggressive
            sizeRange: [50, 200], // Large orders
            tradeInterval: 500, // Very fast
            enabled: true,
        }
    },
    dead_cat: {
        scenario: 'dead_cat',
        volatility: 2.0,
        liquidity: 0.8,
        trendBot: {
            aggressiveness: 0.5, // Moderate bias, but will use negative bias in logic
            sizeRange: [10, 50],
            tradeInterval: 1500,
            enabled: true,
        }
    },
    squeeze: {
        scenario: 'squeeze',
        volatility: 0.2, // Extremely low
        liquidity: 0.5, // Drying up
        trendBot: {
            aggressiveness: 0.1,
            sizeRange: [1, 5],
            tradeInterval: 5000,
            enabled: true,
        }
    }
};

/**
 * Default market configuration
 */
export const DEFAULT_MARKET_CONFIG: MarketConfig = {
    initialPrice: 150,
    scenario: 'sideways',
    volatility: 1.0,
    liquidity: 1.0,
    marketMaker: {
        spreadPercent: 0.002,
        depth: 20, // Increased to ensure at least 5 levels visible always
        sizeRange: [100, 800],
        refreshInterval: 100, // Faster refresh (same as tick) to replenish liquidity
        inventoryLimit: 5000,
        enabled: true,
    },
    trendBot: {
        aggressiveness: 0.3,
        sizeRange: [20, 100], // Increased slightly
        tradeInterval: 3000,
        enabled: true,
    },
    noiseBot: {
        tradeInterval: 2000,
        sizeRange: [5, 50], // Increased slightly
        marketOrderProbability: 0.3,
        enabled: true,
    },
    tickInterval: 100,
};

/**
 * Commission rate (0.1%)
 */
export const COMMISSION_RATE = 0.001;

/**
 * Calculate commission for a trade
 */
/**
 * Calculate commission for a trade (Rounded to Integer for TWD)
 */
export function calculateTradeCommission(total: number, rate: number = COMMISSION_RATE): number {
    // TWD usually has minimum 20, but for sim just round to integer
    return Math.round(total * rate);
}

/**
 * Generate unique order ID
 */
export function generateOrderId(prefix: string = 'ORD'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

/**
 * Generate unique trade ID
 */
export function generateTradeId(suffix?: string | number): string {
    const id = generateOrderId('TRD');
    return suffix !== undefined ? `${id}-${suffix}` : id;
}
