// Bot System Type Definitions

import { OrderSide, MarketScenario } from '../matching/types';

/**
 * Bot types
 */
export type BotType = 'marketMaker' | 'trend' | 'noise';

/**
 * Market maker bot configuration
 */
export interface MarketMakerBotConfig {
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
    /** Activity intensity (default 1.0) */
    intensity?: number;
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
    /** Activity intensity (default 1.0) */
    intensity?: number;
    /** Buy trend strength (0-1, overrides aggressiveness for buys) */
    buyStrength?: number;
    /** Sell trend strength (0-1, overrides aggressiveness for sells) */
    sellStrength?: number;
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
    /** Activity intensity (default 1.0) */
    intensity?: number;
}

/**
 * Combined bot configuration
 */
export interface BotManagerConfig {
    marketMaker: MarketMakerBotConfig;
    trend: TrendBotConfig;
    noise: NoiseBotConfig;
    /** Market scenario affects bot behavior */
    scenario: MarketScenario;
    /** Volatility multiplier (1.0 = normal) */
    volatility: number;
    /** Liquidity multiplier (1.0 = normal) */
    liquidity: number;
    /** Trading unit size (default 1000) */
    unitSize: number;
    /** Whether in Odd Lot mode */
    isOddLot: boolean;
    /** Market intensity (activity level) scalar (0.1 to 5.0) */
    intensity: number;
    /** Target price for institutional manipulation (optional) */
    targetPrice?: number;
    /** Delay in ms before bots match user orders (optional, default 1000) */
    reactionDelay?: number;
}

/**
 * Order to be submitted by a bot
 */
export interface BotOrder {
    side: OrderSide;
    type: 'market' | 'limit';
    price: number | null;
    quantity: number;
    botType: BotType;
}

/**
 * Default configurations
 */
export const DEFAULT_MARKET_MAKER_CONFIG: MarketMakerBotConfig = {
    spreadPercent: 0.002,
    depth: 10,
    sizeRange: [2, 10], // Increased to ensure multi-lot orders
    refreshInterval: 500,
    inventoryLimit: 1000,
    enabled: true,
};

export const DEFAULT_TREND_BOT_CONFIG: TrendBotConfig = {
    aggressiveness: 0.3,
    sizeRange: [2, 5], // Increased to ensure multi-lot orders
    tradeInterval: 3000,
    enabled: true,
};

export const DEFAULT_NOISE_BOT_CONFIG: NoiseBotConfig = {
    tradeInterval: 2000,
    sizeRange: [1, 3], // Increased slightly
    marketOrderProbability: 0.3,
    enabled: true,
};

export const DEFAULT_BOT_MANAGER_CONFIG: BotManagerConfig = {
    marketMaker: DEFAULT_MARKET_MAKER_CONFIG,
    trend: DEFAULT_TREND_BOT_CONFIG,
    noise: DEFAULT_NOISE_BOT_CONFIG,
    scenario: 'sideways',
    volatility: 1.0,
    liquidity: 1.0,
    unitSize: 1000,
    isOddLot: false,
    intensity: 1.0,
    reactionDelay: 1000, // Delay in ms before bots match user orders
};

/**
 * Scenario modifiers
 */
export const SCENARIO_MODIFIERS: Record<MarketScenario, Partial<BotManagerConfig>> = {
    // 強勢多頭 (Strong Bull) - 頭頭高、底底高
    bull: {
        volatility: 1.2,
        liquidity: 1.5,
        intensity: 1.5,
        trend: {
            ...DEFAULT_TREND_BOT_CONFIG,
            aggressiveness: 0.7,
            buyStrength: 0.8,  // Strong buying pressure
            sellStrength: 0.2, // Weak selling
        },
    },
    // 弱勢空頭 (Weak Bear) - 頭頭低、底底低
    bear: {
        volatility: 1.3,
        liquidity: 1.2,
        intensity: 1.5,
        trend: {
            ...DEFAULT_TREND_BOT_CONFIG,
            aggressiveness: 0.7,
            buyStrength: 0.2,  // Weak buying
            sellStrength: 0.8, // Strong selling pressure
        },
    },
    // 盤整 (Consolidation) - 橫向整理
    sideways: {
        volatility: 0.6, // Slight increase to allow spread crossing
        liquidity: 2.0,
        intensity: 0.8,
        trend: {
            ...DEFAULT_TREND_BOT_CONFIG,
            aggressiveness: 0.2, // Keep trend low
            buyStrength: 0.5,
            sellStrength: 0.5,
        },
        noise: {
            ...DEFAULT_NOISE_BOT_CONFIG,
            tradeInterval: 1000, // Faster trades to create volume
            marketOrderProbability: 0.5, // Verify price matches more often
        },
    },
    // 劇烈震盪 (Volatile) - 上沖下洗
    volatile: {
        volatility: 2.5,
        liquidity: 0.8,
        intensity: 2.5,
        marketMaker: { ...DEFAULT_MARKET_MAKER_CONFIG, spreadPercent: 0.005 },
        trend: {
            ...DEFAULT_TREND_BOT_CONFIG,
            aggressiveness: 0.5,
            tradeInterval: 1000,
            buyStrength: 0.6,
            sellStrength: 0.6,
        },
    },
    // 冷清 (Calm) - 低量盤整
    calm: {
        volatility: 0.3,
        liquidity: 3.0,
        intensity: 0.3,
        trend: { ...DEFAULT_TREND_BOT_CONFIG, enabled: false },
        noise: { ...DEFAULT_NOISE_BOT_CONFIG, tradeInterval: 5000 },
    },
    // 盤整突破 (Breakout) - 突破壓力位
    breakout: {
        volatility: 1.8,
        liquidity: 1.3,
        intensity: 2.0,
        trend: {
            ...DEFAULT_TREND_BOT_CONFIG,
            aggressiveness: 0.8,
            buyStrength: 0.9,  // Very strong buying on breakout
            sellStrength: 0.1,
            tradeInterval: 1500,
        },
        noise: { ...DEFAULT_NOISE_BOT_CONFIG, marketOrderProbability: 0.5 },
    },
    // 恐慌崩盤 (Crash) - 急速下跌
    crash: {
        volatility: 3.0,
        liquidity: 0.5,
        intensity: 3.0,
        marketMaker: { ...DEFAULT_MARKET_MAKER_CONFIG, spreadPercent: 0.01, depth: 5 },
        trend: {
            ...DEFAULT_TREND_BOT_CONFIG,
            aggressiveness: 0.9,
            buyStrength: 0.05, // Almost no buying
            sellStrength: 0.95, // Panic selling
            tradeInterval: 800,
        },
        noise: { ...DEFAULT_NOISE_BOT_CONFIG, marketOrderProbability: 0.7, tradeInterval: 1000 },
    },
    // 主力吸籌 (Accumulation) - 低檔吸貨
    accumulation: {
        volatility: 0.6,
        liquidity: 1.8,
        intensity: 1.2,
        trend: {
            ...DEFAULT_TREND_BOT_CONFIG,
            aggressiveness: 0.6,
            buyStrength: 0.75, // Steady accumulation
            sellStrength: 0.25,
            tradeInterval: 2000,
        },
        marketMaker: { ...DEFAULT_MARKET_MAKER_CONFIG, depth: 15 }, // Deep order book
    },
    // 主力出貨 (Distribution) - 高檔出貨
    distribution: {
        volatility: 0.8,
        liquidity: 1.5,
        intensity: 1.3,
        trend: {
            ...DEFAULT_TREND_BOT_CONFIG,
            aggressiveness: 0.6,
            buyStrength: 0.3,
            sellStrength: 0.7, // Steady distribution
            tradeInterval: 2000,
        },
        marketMaker: { ...DEFAULT_MARKET_MAKER_CONFIG, depth: 12 },
    },
    // 拉高出貨 (Pump & Dump) - 極速拉升
    pump_dump: {
        volatility: 2.5,
        liquidity: 1.2,
        intensity: 4.0, // Very high intensity
        trend: {
            ...DEFAULT_TREND_BOT_CONFIG,
            aggressiveness: 0.95,
            buyStrength: 0.9,  // Hard pump
            sellStrength: 0.1,
            tradeInterval: 500, // Very fast
        },
        marketMaker: { ...DEFAULT_MARKET_MAKER_CONFIG, spreadPercent: 0.01 }, // Wider spread during pump
    },
    // 死貓反彈 (Dead Cat Bounce) - 崩盤後小幅反彈
    dead_cat: {
        volatility: 2.0,
        liquidity: 0.8,
        intensity: 2.0,
        trend: {
            ...DEFAULT_TREND_BOT_CONFIG,
            aggressiveness: 0.6,
            buyStrength: 0.6,  // Moderate buy
            sellStrength: 0.4,
            tradeInterval: 1500,
        },
    },
    // 盤整待變 (Squeeze) - 窒息量
    squeeze: {
        volatility: 0.1, // Very low volatility
        liquidity: 0.5,  // Low liquidity
        intensity: 0.5,  // Low activity
        trend: {
            ...DEFAULT_TREND_BOT_CONFIG,
            aggressiveness: 0.1,
            tradeInterval: 5000,
            enabled: true,
        },
        noise: { ...DEFAULT_NOISE_BOT_CONFIG, tradeInterval: 8000 },
    },
};
