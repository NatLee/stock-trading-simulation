// AI-related type definitions

export type AIState = 'idle' | 'scanning' | 'analyzed';
export type AIRecommendation = 'LONG' | 'SHORT' | 'HOLD' | null;
export type LogType = 'info' | 'success' | 'warning' | 'error' | 'alert' | 'subtle';

export interface LogEntry {
    id: string;
    text: string;
    type: LogType;
    time: string;
    timestamp: number;
}

// Legacy simple result (kept for backward compatibility)
export interface AISimpleResult {
    recommendation: AIRecommendation;
    confidence: number;
    pattern: string;
    explanation: string;
    timestamp: number;
}

// New detailed analysis types
export interface AITrendAnalysis {
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number; // 0-100
    description: string;
    higherHighs: boolean;
    higherLows: boolean;
    lowerHighs: boolean;
    lowerLows: boolean;
}

export interface AIOrderBookAnalysis {
    buyPressure: number; // 0-100 percentage
    sellPressure: number; // 0-100 percentage
    imbalance: 'buy_heavy' | 'sell_heavy' | 'balanced';
    spreadPercent: number;
    description: string;
}

export interface AIMomentumAnalysis {
    velocity: number;
    acceleration: number;
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
    rsi: number;
    description: string;
}

export interface AIPatternAnalysis {
    detected: string | null;
    signal: 'bullish' | 'bearish' | 'neutral';
    confidence: number; // 0-100
    description: string;
}

export interface AIOverallAnalysis {
    recommendation: 'LONG' | 'SHORT' | 'HOLD';
    confidence: number; // 0-100
    reasons: string[];
}

export interface AIDetailedAnalysis {
    trend: AITrendAnalysis;
    orderBook: AIOrderBookAnalysis;
    momentum: AIMomentumAnalysis;
    pattern: AIPatternAnalysis;
    overall: AIOverallAnalysis;
    timestamp: number;
}

// Scenario type definitions
export type ScenarioType =
    | 'breakout' | 'double_bottom' | 'cup_handle' | 'savior_bounce'
    | 'double_top' | 'head_shoulders' | 'slow_bleed'
    | 'bart_simpson' | 'pump_dump'
    | 'chop' | 'flash_crash' | 'news_spike'
    | 'god_candle' | 'short_squeeze' | 'dead_cat' | 'staircase_up' | 'staircase_down';

export interface Scenario {
    type: ScenarioType;
    remaining: number;
    totalDuration: number;
}

export interface ScenarioDefinition {
    type: ScenarioType;
    descKey: string;
    tagKey: string;
    explKey: string;
    isBullish: boolean;
    isBearish: boolean;
    duration: number;
}
