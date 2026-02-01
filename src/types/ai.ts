// AI-related type definitions

export type AIState = 'idle' | 'scanning' | 'analyzed';
export type AIRecommendation = 'LONG' | 'SHORT' | null;
export type LogType = 'info' | 'success' | 'warning' | 'error' | 'alert' | 'subtle';

export interface LogEntry {
    id: string;
    text: string;
    type: LogType;
    time: string;
    timestamp: number;
}

export interface AIAnalysisResult {
    recommendation: AIRecommendation;
    confidence: number;
    pattern: string;
    explanation: string;
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
