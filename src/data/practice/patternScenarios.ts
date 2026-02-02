// Pattern scenarios for practice mode - Now loaded from JSON files

import { PatternInfo, PatternScenario, PatternType, RecognitionQuestion } from './types';

// Import pattern info from JSON
import patternsData from './patterns.json';

// Import scenario JSON files - Reversal patterns
import headAndShouldersScenarios from './scenarios/reversal/head-and-shoulders.json';
import doublePatternScenarios from './scenarios/reversal/double-patterns.json';
import triplePatternScenarios from './scenarios/reversal/triple-patterns.json';
import vPatternScenarios from './scenarios/reversal/v-patterns.json';
import wedgePatternScenarios from './scenarios/reversal/wedge-patterns.json';
import roundingPatternScenarios from './scenarios/reversal/rounding-patterns.json';
import islandReversalScenarios from './scenarios/reversal/island-reversal.json';
import singleCandleReversalScenarios from './scenarios/reversal/single-candle-reversal.json';

// Import scenario JSON files - Candlestick patterns
import starPatternScenarios from './scenarios/candlestick/star-patterns.json';
import engulfingPatternScenarios from './scenarios/candlestick/engulfing-patterns.json';
import singleCandleScenarios from './scenarios/candlestick/single-candle.json';
import dojiPatternScenarios from './scenarios/candlestick/doji-patterns.json';
import haramiPatternScenarios from './scenarios/candlestick/harami-patterns.json';
import piercingCloudScenarios from './scenarios/candlestick/piercing-cloud.json';
import threeSoldiersCrowsScenarios from './scenarios/candlestick/three-soldiers-crows.json';
import tweezerPatternScenarios from './scenarios/candlestick/tweezer-patterns.json';

// Import scenario JSON files - Continuation patterns
import trianglePatternScenarios from './scenarios/continuation/triangle-patterns.json';
import flagPatternScenarios from './scenarios/continuation/flag-patterns.json';
import cupHandleScenarios from './scenarios/continuation/cup-handle.json';
import threeMethodsScenarios from './scenarios/continuation/three-methods.json';

// Import scenario JSON files - Consolidation patterns
import rectanglePatternScenarios from './scenarios/consolidation/rectangle-patterns.json';

// Pattern information catalog - Type assertion from JSON
export const PATTERN_INFO = patternsData as Record<PatternType, PatternInfo>;

// Helper function to add timestamps to candles
const addTimestamps = (scenarios: PatternScenario[]): PatternScenario[] => {
    const baseTime = Date.now() - 3600000 * 24; // 24 hours ago
    const intervalMs = 60000; // 1 minute

    return scenarios.map(scenario => ({
        ...scenario,
        candles: scenario.candles.map((candle, index) => ({
            ...candle,
            timestamp: candle.timestamp || baseTime + index * intervalMs,
        })),
    }));
};

// Combine all scenarios from JSON files
export const PATTERN_SCENARIOS: PatternScenario[] = addTimestamps([
    // Reversal patterns
    ...headAndShouldersScenarios,
    ...doublePatternScenarios,
    ...triplePatternScenarios,
    ...vPatternScenarios,
    ...wedgePatternScenarios,
    ...roundingPatternScenarios,
    ...islandReversalScenarios,
    ...singleCandleReversalScenarios,
    // Candlestick patterns
    ...starPatternScenarios,
    ...engulfingPatternScenarios,
    ...singleCandleScenarios,
    ...dojiPatternScenarios,
    ...haramiPatternScenarios,
    ...piercingCloudScenarios,
    ...threeSoldiersCrowsScenarios,
    ...tweezerPatternScenarios,
    // Continuation patterns
    ...trianglePatternScenarios,
    ...flagPatternScenarios,
    ...cupHandleScenarios,
    ...threeMethodsScenarios,
    // Consolidation patterns
    ...rectanglePatternScenarios,
] as PatternScenario[]);

// Get scenarios by pattern type
export function getScenariosByPattern(patternType: PatternType): PatternScenario[] {
    return PATTERN_SCENARIOS.filter(s => s.patternType === patternType);
}

// Get a random scenario
export function getRandomScenario(): PatternScenario {
    const index = Math.floor(Math.random() * PATTERN_SCENARIOS.length);
    return PATTERN_SCENARIOS[index];
}

// Get scenarios by difficulty
export function getScenariosByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): PatternScenario[] {
    return PATTERN_SCENARIOS.filter(s => s.difficulty === difficulty);
}

// Generate recognition questions
export function generateRecognitionQuestions(count: number = 5): RecognitionQuestion[] {
    const shuffled = [...PATTERN_SCENARIOS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    
    const allPatternTypes = Object.keys(PATTERN_INFO) as PatternType[];
    
    return selected.map((scenario, index) => {
        // Generate 4 options including the correct answer
        const otherPatterns = allPatternTypes.filter(p => p !== scenario.patternType);
        const shuffledOthers = otherPatterns.sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [scenario.patternType, ...shuffledOthers].sort(() => Math.random() - 0.5);
        
        return {
            id: `q-${index}-${Date.now()}`,
            scenarioId: scenario.id,
            correctAnswer: scenario.patternType,
            options,
            timeLimit: 30,
        };
    });
}

// Get all available patterns for selection
export function getAvailablePatterns(): PatternInfo[] {
    const availableTypes = new Set(PATTERN_SCENARIOS.map(s => s.patternType));
    return Object.values(PATTERN_INFO).filter(p => availableTypes.has(p.id as PatternType));
}
