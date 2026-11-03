// Bot System Type Definitions
//
// Every number that shapes how the bots behave lives in these tables (the
// DEFAULT_*_CONFIG objects and the scenario presets below), not in the bot code.

import { OrderSide, MarketScenario } from '../matching/types';

/**
 * Bot types
 */
export type BotType = 'marketMaker' | 'trend' | 'noise';

/** Settings every bot has: on/off and how busy it is */
interface BotCommonConfig {
    /** Enable/disable the bot */
    enabled: boolean;
    /** Activity intensity (default 1.0): intervals are divided by it */
    intensity?: number;
}

/**
 * Market maker bot configuration
 */
export interface MarketMakerBotConfig extends BotCommonConfig {
    /** Base spread percentage (0.001 = 0.1%), multiplied by the scenario's volatility */
    spreadPercent: number;
    /** Extra distance of each further level from the price (0.0005 = 0.05%) */
    levelStepPercent: number;
    /** Number of price levels on each side at intensity 0 */
    depth: number;
    /** Extra levels per 1.0 of intensity (floored) */
    depthPerIntensity: number;
    /** Order size range [min, max] in lots, before liquidity and depth scaling */
    sizeRange: [number, number];
    /** How much bigger the deepest level is than the first (2 = up to 3×) */
    depthSizeGrowth: number;
    /** How often to refresh quotes (ms) */
    refreshInterval: number;
    /** Max inventory before skewing quotes */
    inventoryLimit: number;
    /** How far a full inventory shifts the quotes, in spreads */
    inventorySkew: number;
}

/**
 * Trend following bot configuration
 */
export interface TrendBotConfig extends BotCommonConfig {
    /** Aggressiveness (0-1) */
    aggressiveness: number;
    /** Order size range in lots */
    sizeRange: [number, number];
    /** Trade frequency (ms) */
    tradeInterval: number;
    /** Buy trend strength (0-1, overrides aggressiveness for buys) */
    buyStrength?: number;
    /** Sell trend strength (0-1, overrides aggressiveness for sells) */
    sellStrength?: number;
    /** The scenario's lean, added to the momentum signal (+ buys, − sells) */
    bias: number;
    /** Random extra lean each turn, uniform in ±biasJitter */
    biasJitter: number;
    /** Ticks in each of the two averages the momentum compares */
    momentumWindow: number;
    /** Momentum = clamp(relative change × momentumScale, −1, 1) */
    momentumScale: number;
    /** Trade only when |signal| ≥ entryThreshold × (1 − strength) */
    entryThreshold: number;
    /** Above this |signal| the order crosses the spread */
    aggressiveAbove: number;
    /** How far past the price a spread-crossing order is priced (0.005 = 0.5%) */
    crossPercent: number;
    /** Passive orders sit this far from the price, picked at random in [min, max] */
    passiveOffset: [number, number];
    /** Chance that a spread-crossing order is actually sent */
    aggressiveSendProbability: number;
    /** Chance that a passive order is actually sent */
    passiveSendProbability: number;
}

/**
 * Noise trader bot configuration
 */
export interface NoiseBotConfig extends BotCommonConfig {
    /** Trade frequency (ms) */
    tradeInterval: number;
    /** Order size range in lots */
    sizeRange: [number, number];
    /** Probability of market vs limit order */
    marketOrderProbability: number;
    /** Limit prices are picked within ± this fraction of the price (0.005 = ±0.5%) */
    limitBand: number;
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
    /** Delay in ms before bots match user orders */
    reactionDelay: number;
    /** How often (ms) bot orders far from the price are cleared */
    pruneInterval: number;
    /** Bot orders further than this fraction from the price are cleared (0.1 = 10%) */
    pruneDistance: number;
}

/** Board lot: shares per lot on the Taiwan Stock Exchange */
export const SHARES_PER_LOT = 1000;

/**
 * Odd-lot mode: a bot "lot" becomes this many shares, plus a random
 * 0 … ODD_LOT_JITTER − 1 shares so the sizes do not all look alike.
 */
export const ODD_LOT_SHARES = 100;
export const ODD_LOT_JITTER = 99;

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
    levelStepPercent: 0.0005,
    depth: 10,
    depthPerIntensity: 2,
    sizeRange: [2, 10],
    depthSizeGrowth: 2,
    refreshInterval: 500,
    inventoryLimit: 1000,
    inventorySkew: 0.5,
    enabled: true,
};

export const DEFAULT_TREND_BOT_CONFIG: TrendBotConfig = {
    aggressiveness: 0.3,
    sizeRange: [2, 5],
    tradeInterval: 3000,
    momentumWindow: 5,
    momentumScale: 100,
    entryThreshold: 0.3,
    aggressiveAbove: 0.6,
    crossPercent: 0.005,
    passiveOffset: [0.001, 0.003],
    aggressiveSendProbability: 0.9,
    passiveSendProbability: 0.7,
    bias: 0,
    biasJitter: 0,
    enabled: true,
};

export const DEFAULT_NOISE_BOT_CONFIG: NoiseBotConfig = {
    tradeInterval: 2000,
    sizeRange: [1, 3],
    marketOrderProbability: 0.3,
    limitBand: 0.005,
    enabled: true,
};

export const DEFAULT_BOT_MANAGER_CONFIG: BotManagerConfig = {
    marketMaker: DEFAULT_MARKET_MAKER_CONFIG,
    trend: DEFAULT_TREND_BOT_CONFIG,
    noise: DEFAULT_NOISE_BOT_CONFIG,
    scenario: 'sideways',
    volatility: 1.0,
    liquidity: 1.0,
    unitSize: SHARES_PER_LOT,
    isOddLot: false,
    intensity: 1.0,
    reactionDelay: 1000,
    pruneInterval: 5000,
    pruneDistance: 0.1,
};

/** Intensity as a number, with the documented default of 1.0 */
export function intensityOf(config: { intensity?: number }): number {
    return config.intensity || 1.0;
}

/** How long a bot waits between turns at its current intensity */
export function effectiveInterval(interval: number, config: { intensity?: number }): number {
    return interval / intensityOf(config);
}

/**
 * What a scenario may change. Anything it leaves out stays at the defaults
 * above: every scenario starts from the same base, whichever came before.
 */
export interface ScenarioPreset {
    volatility?: number;
    liquidity?: number;
    /** The scenario's own pace; picking the scenario moves the intensity slider here */
    intensity?: number;
    marketMaker?: Partial<MarketMakerBotConfig>;
    trend?: Partial<TrendBotConfig>;
    noise?: Partial<NoiseBotConfig>;
}

/**
 * What the trading page controls; everything else comes from the scenario.
 */
export interface BotSettings {
    /** Shares per bot lot in whole-lot mode */
    unitSize: number;
    isOddLot: boolean;
    /** The intensity slider; when unset, the scenario's own intensity */
    intensity?: number;
}

/**
 * Scenario presets: only what differs from the defaults.
 */
export const SCENARIO_MODIFIERS: Record<MarketScenario, ScenarioPreset> = {
    // 強勢多頭 (Strong Bull) - 頭頭高、底底高
    bull: {
        volatility: 1.2,
        liquidity: 1.5,
        intensity: 1.5,
        trend: { aggressiveness: 0.7, buyStrength: 0.8, sellStrength: 0.2, bias: 0.3 },
    },
    // 弱勢空頭 (Weak Bear) - 頭頭低、底底低
    bear: {
        volatility: 1.3,
        liquidity: 1.2,
        intensity: 1.5,
        trend: { aggressiveness: 0.7, buyStrength: 0.2, sellStrength: 0.8, bias: -0.3 },
    },
    // 盤整 (Consolidation) - 橫向整理
    sideways: {
        volatility: 0.6,
        liquidity: 2.0,
        intensity: 0.8,
        trend: { aggressiveness: 0.2, buyStrength: 0.5, sellStrength: 0.5 },
        noise: { tradeInterval: 1000, marketOrderProbability: 0.5 },
    },
    // 劇烈震盪 (Volatile) - 上沖下洗
    volatile: {
        volatility: 2.5,
        liquidity: 0.8,
        intensity: 2.5,
        marketMaker: { spreadPercent: 0.005 },
        trend: { aggressiveness: 0.5, tradeInterval: 1000, buyStrength: 0.6, sellStrength: 0.6, biasJitter: 0.2 },
    },
    // 冷清 (Calm) - 低量盤整
    calm: {
        volatility: 0.3,
        liquidity: 3.0,
        intensity: 0.3,
        trend: { enabled: false },
        noise: { tradeInterval: 5000 },
    },
    // 盤整突破 (Breakout) - 突破壓力位
    breakout: {
        volatility: 1.8,
        liquidity: 1.3,
        intensity: 2.0,
        trend: { aggressiveness: 0.8, buyStrength: 0.9, sellStrength: 0.1, tradeInterval: 1500 },
        noise: { marketOrderProbability: 0.5 },
    },
    // 恐慌崩盤 (Crash) - 急速下跌
    crash: {
        volatility: 3.0,
        liquidity: 0.5,
        intensity: 3.0,
        marketMaker: { spreadPercent: 0.01, depth: 5 },
        trend: { aggressiveness: 0.9, buyStrength: 0.05, sellStrength: 0.95, tradeInterval: 800 },
        noise: { marketOrderProbability: 0.7, tradeInterval: 1000 },
    },
    // 主力吸籌 (Accumulation) - 低檔吸貨
    accumulation: {
        volatility: 0.6,
        liquidity: 1.8,
        intensity: 1.2,
        marketMaker: { depth: 15 },
        trend: { aggressiveness: 0.6, buyStrength: 0.75, sellStrength: 0.25, tradeInterval: 2000 },
    },
    // 主力出貨 (Distribution) - 高檔出貨
    distribution: {
        volatility: 0.8,
        liquidity: 1.5,
        intensity: 1.3,
        marketMaker: { depth: 12 },
        trend: { aggressiveness: 0.6, buyStrength: 0.3, sellStrength: 0.7, tradeInterval: 2000 },
    },
    // 拉高出貨 (Pump & Dump) - 極速拉升
    pump_dump: {
        volatility: 2.5,
        liquidity: 1.2,
        intensity: 4.0,
        marketMaker: { spreadPercent: 0.01 },
        trend: { aggressiveness: 0.95, buyStrength: 0.9, sellStrength: 0.1, tradeInterval: 500 },
    },
    // 死貓反彈 (Dead Cat Bounce) - 崩盤後小幅反彈
    dead_cat: {
        volatility: 2.0,
        liquidity: 0.8,
        intensity: 2.0,
        trend: { aggressiveness: 0.6, buyStrength: 0.6, sellStrength: 0.4, tradeInterval: 1500 },
    },
    // 盤整待變 (Squeeze) - 窒息量
    squeeze: {
        volatility: 0.1,
        liquidity: 0.5,
        intensity: 0.5,
        trend: { aggressiveness: 0.1, tradeInterval: 5000 },
        noise: { tradeInterval: 8000 },
    },
};

/**
 * The full bot configuration for a scenario: defaults, then the scenario's
 * preset, then the page's own settings. Nothing carries over from the
 * scenario that was active before.
 */
export function resolveBotConfig(scenario: MarketScenario, settings: Partial<BotSettings> = {}): BotManagerConfig {
    const base = DEFAULT_BOT_MANAGER_CONFIG;
    const preset = SCENARIO_MODIFIERS[scenario];
    const intensity = settings.intensity ?? preset.intensity ?? base.intensity;
    return {
        ...base,
        volatility: preset.volatility ?? base.volatility,
        liquidity: preset.liquidity ?? base.liquidity,
        unitSize: settings.unitSize ?? base.unitSize,
        isOddLot: settings.isOddLot ?? base.isOddLot,
        scenario,
        intensity,
        marketMaker: { ...base.marketMaker, ...preset.marketMaker, intensity },
        trend: { ...base.trend, ...preset.trend, intensity },
        noise: { ...base.noise, ...preset.noise, intensity },
    };
}

/**
 * Short-lived scenarios: after `duration` ms the trading page switches to `next` by itself
 * (pump & dump -> crash -> dead cat bounce, squeeze -> breakout -> bull).
 */
export const SCENARIO_LIFECYCLE: Partial<Record<MarketScenario, { duration: number; next: MarketScenario; label: string }>> = {
    pump_dump: { duration: 15000, next: 'crash', label: '拉高結束 -> 殺盤開始' },
    crash: { duration: 20000, next: 'dead_cat', label: '恐慌結束 -> 死貓反彈' },
    breakout: { duration: 25000, next: 'bull', label: '突破確立 -> 轉為多頭' },
    squeeze: { duration: 30000, next: 'breakout', label: '盤整結束 -> 向上突破' },
};

/** Display names, shared by the trading page and the docs figures */
export const SCENARIO_LABELS: Record<MarketScenario, { zh: string; en: string }> = {
    bull: { zh: '強勢多頭', en: 'Bull' },
    bear: { zh: '弱勢空頭', en: 'Bear' },
    sideways: { zh: '盤整', en: 'Sideways' },
    volatile: { zh: '劇烈震盪', en: 'Volatile' },
    calm: { zh: '冷清', en: 'Calm' },
    breakout: { zh: '盤整突破', en: 'Breakout' },
    crash: { zh: '恐慌崩盤', en: 'Crash' },
    accumulation: { zh: '主力吸籌', en: 'Accumulation' },
    distribution: { zh: '主力出貨', en: 'Distribution' },
    pump_dump: { zh: '拉高出貨', en: 'Pump & dump' },
    dead_cat: { zh: '死貓反彈', en: 'Dead cat bounce' },
    squeeze: { zh: '盤整待變', en: 'Squeeze' },
};

/** Steps of the volatility / liquidity bars on the scenario card */
export const SCENARIO_LEVELS = 5;

/**
 * Where a scenario's preset volatility or liquidity sits among all presets,
 * as 1 … SCENARIO_LEVELS (lowest preset = 1, highest = SCENARIO_LEVELS).
 */
export function scenarioLevel(scenario: MarketScenario, key: 'volatility' | 'liquidity'): number {
    const valueOf = (s: MarketScenario) => SCENARIO_MODIFIERS[s][key] ?? DEFAULT_BOT_MANAGER_CONFIG[key];
    const values = (Object.keys(SCENARIO_MODIFIERS) as MarketScenario[]).map(valueOf);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === min) return 1;
    return 1 + Math.round(((valueOf(scenario) - min) / (max - min)) * (SCENARIO_LEVELS - 1));
}
