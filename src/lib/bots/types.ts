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
    sizeRange: [1, 5], // Reduced from [10, 100] to [1, 5] lots
    refreshInterval: 500,
    inventoryLimit: 1000,
    enabled: true,
};

export const DEFAULT_TREND_BOT_CONFIG: TrendBotConfig = {
    aggressiveness: 0.3,
    sizeRange: [1, 3], // Reduced from [5, 30] to [1, 3] lots
    tradeInterval: 3000,
    enabled: true,
};

export const DEFAULT_NOISE_BOT_CONFIG: NoiseBotConfig = {
    tradeInterval: 2000,
    sizeRange: [1, 2], // Reduced from [1, 20] to [1, 2] lots
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
};

/**
 * Scenario presets - adjust bot behavior based on market conditions
 */
export const SCENARIO_MODIFIERS: Record<MarketScenario, Partial<BotManagerConfig>> = {
    bull: {
        volatility: 1.2,
        liquidity: 1.5,
        intensity: 1.5,
        trend: { ...DEFAULT_TREND_BOT_CONFIG, aggressiveness: 0.7 },
    },
    bear: {
        volatility: 1.3,
        liquidity: 1.2,
        intensity: 1.5,
        trend: { ...DEFAULT_TREND_BOT_CONFIG, aggressiveness: 0.7 },
    },
    sideways: {
        volatility: 0.5,
        liquidity: 2.0,
        intensity: 0.8,
        trend: { ...DEFAULT_TREND_BOT_CONFIG, aggressiveness: 0.2 },
    },
    volatile: {
        volatility: 2.5,
        liquidity: 0.8,
        intensity: 2.5,
        marketMaker: { ...DEFAULT_MARKET_MAKER_CONFIG, spreadPercent: 0.005 },
        trend: { ...DEFAULT_TREND_BOT_CONFIG, aggressiveness: 0.5, tradeInterval: 1000 },
    },
    calm: {
        volatility: 0.3,
        liquidity: 3.0,
        intensity: 0.3,
        trend: { ...DEFAULT_TREND_BOT_CONFIG, enabled: false },
        noise: { ...DEFAULT_NOISE_BOT_CONFIG, tradeInterval: 5000 },
    },
};
