// Practice module type definitions

import { CandleData } from '@/types';

// Practice modes
export type PracticeMode = 'recognition' | 'trading' | 'replay';

// Pattern types for recognition and trading
export type PatternType = 
    // 反轉型態 - Reversal Patterns
    | 'head-and-shoulders-top'
    | 'head-and-shoulders-bottom'
    | 'double-bottom'
    | 'double-top'
    | 'triple-top'
    | 'triple-bottom'
    | 'rounding-bottom'
    | 'rounding-top'
    | 'island-reversal-top'
    | 'island-reversal-bottom'
    | 'rising-wedge'
    | 'falling-wedge'
    | 'v-bottom'
    | 'v-top'
    // K線型態 - Candlestick Patterns
    | 'morning-star'
    | 'evening-star'
    | 'bullish-engulfing'
    | 'bearish-engulfing'
    | 'hammer'
    | 'shooting-star'
    // 持續型態 - Continuation Patterns
    | 'ascending-triangle'
    | 'descending-triangle'
    | 'symmetric-triangle'
    | 'bull-flag'
    | 'bear-flag'
    | 'bull-pennant'
    | 'bear-pennant'
    | 'cup-and-handle'
    // 整理型態 - Consolidation Patterns
    | 'rectangle';

// Pattern information for UI display
export interface PatternInfo {
    id: PatternType;
    name: string;
    nameEn: string;
    description: string;
    category: 'reversal' | 'continuation' | 'consolidation';
    signal: 'bullish' | 'bearish' | 'neutral';
}

// A single candle in a scenario (extended with optional label)
export interface ScenarioCandle extends CandleData {
    label?: string;
}

// Optimal trading points in a scenario
export interface OptimalPoint {
    candleIndex: number;
    action: 'buy' | 'sell' | 'stop-loss' | 'take-profit';
    price: number;
    description: string;
}

// A complete pattern scenario for practice
export interface PatternScenario {
    id: string;
    patternType: PatternType;
    name: string;
    description: string;
    candles: ScenarioCandle[];
    optimalEntry?: OptimalPoint;
    optimalExit?: OptimalPoint;
    stopLoss?: number;
    takeProfit?: number;
    expectedDirection: 'up' | 'down';
    difficulty: 'easy' | 'medium' | 'hard';
}

// Recognition question for quiz mode
export interface RecognitionQuestion {
    id: string;
    scenarioId: string;
    correctAnswer: PatternType;
    options: PatternType[];
    timeLimit: number; // seconds
}

// User's trade in practice mode
export interface PracticeTrade {
    id: string;
    timestamp: number;
    action: 'buy' | 'sell';
    price: number;
    quantity: number;
    candleIndex: number;
}

// Trading position
export interface PracticePosition {
    quantity: number;        // 持有數量（張）
    averageCost: number;     // 平均成本
    unrealizedPnL: number;   // 未實現損益
    unrealizedPnLPercent: number;  // 未實現損益百分比
    isShort: boolean;        // 是否為空頭部位
}

// Session result
export interface PracticeResult {
    mode: PracticeMode;
    patternType?: PatternType;
    startTime: number;
    endTime: number;
    score: number;
    trades: PracticeTrade[];
    totalPnL: number;
    totalPnLPercent: number;
    correctIdentifications?: number;
    totalQuestions?: number;
}

// Playback state
export interface PlaybackState {
    isPlaying: boolean;
    speed: number; // 0.5, 1, 2
    currentIndex: number;
    totalCandles: number;
}

// Practice engine state
export interface PracticeState {
    mode: PracticeMode;
    currentScenario: PatternScenario | null;
    playback: PlaybackState;
    position: PracticePosition | null;
    trades: PracticeTrade[];
    balance: number;
    score: number;
    isComplete: boolean;
    result: PracticeResult | null;
}

// Score breakdown
export interface ScoreBreakdown {
    tradingPnL: number;
    entryAccuracy: number;
    exitAccuracy: number;
    timeBonus: number;
    total: number;
}
