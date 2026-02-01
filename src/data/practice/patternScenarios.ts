// Pattern scenarios for practice mode

import { PatternInfo, PatternScenario, PatternType, RecognitionQuestion } from './types';

// Pattern information catalog
export const PATTERN_INFO: Record<PatternType, PatternInfo> = {
    'head-and-shoulders-top': {
        id: 'head-and-shoulders-top',
        name: '頭肩頂',
        nameEn: 'Head and Shoulders Top',
        description: '典型的反轉型態，出現在上升趨勢末端，預示價格可能反轉向下',
        category: 'reversal',
        signal: 'bearish',
    },
    'head-and-shoulders-bottom': {
        id: 'head-and-shoulders-bottom',
        name: '頭肩底',
        nameEn: 'Head and Shoulders Bottom',
        description: '底部反轉型態，出現在下跌趨勢末端，預示價格可能反轉向上',
        category: 'reversal',
        signal: 'bullish',
    },
    'double-bottom': {
        id: 'double-bottom',
        name: 'W底（雙重底）',
        nameEn: 'Double Bottom',
        description: '兩個相近的低點，中間有反彈高點，預示趨勢反轉向上',
        category: 'reversal',
        signal: 'bullish',
    },
    'double-top': {
        id: 'double-top',
        name: 'M頭（雙重頂）',
        nameEn: 'Double Top',
        description: '兩個相近的高點，中間有回檔低點，預示趨勢反轉向下',
        category: 'reversal',
        signal: 'bearish',
    },
    'ascending-triangle': {
        id: 'ascending-triangle',
        name: '上升三角形',
        nameEn: 'Ascending Triangle',
        description: '高點持平、低點上移，通常為看漲持續型態',
        category: 'continuation',
        signal: 'bullish',
    },
    'descending-triangle': {
        id: 'descending-triangle',
        name: '下降三角形',
        nameEn: 'Descending Triangle',
        description: '低點持平、高點下移，通常為看跌持續型態',
        category: 'continuation',
        signal: 'bearish',
    },
    'symmetric-triangle': {
        id: 'symmetric-triangle',
        name: '對稱三角形',
        nameEn: 'Symmetric Triangle',
        description: '高點下移、低點上移，方向需等待突破確認',
        category: 'consolidation',
        signal: 'neutral',
    },
    'bull-flag': {
        id: 'bull-flag',
        name: '上升旗形',
        nameEn: 'Bull Flag',
        description: '急漲後向下傾斜整理，突破後繼續上漲',
        category: 'continuation',
        signal: 'bullish',
    },
    'bear-flag': {
        id: 'bear-flag',
        name: '下降旗形',
        nameEn: 'Bear Flag',
        description: '急跌後向上傾斜整理，跌破後繼續下跌',
        category: 'continuation',
        signal: 'bearish',
    },
    'cup-and-handle': {
        id: 'cup-and-handle',
        name: '杯柄型態',
        nameEn: 'Cup and Handle',
        description: '圓弧底加上杯柄整理，突破後預示大幅上漲',
        category: 'continuation',
        signal: 'bullish',
    },
    'rounding-bottom': {
        id: 'rounding-bottom',
        name: '圓弧底',
        nameEn: 'Rounding Bottom',
        description: '長期底部反轉型態，價格走勢呈現圓弧形',
        category: 'reversal',
        signal: 'bullish',
    },
    'island-reversal': {
        id: 'island-reversal',
        name: '島狀反轉',
        nameEn: 'Island Reversal',
        description: '高可靠度的反轉訊號，由兩個方向相反的缺口組成',
        category: 'reversal',
        signal: 'neutral',
    },
    'rectangle': {
        id: 'rectangle',
        name: '矩形整理',
        nameEn: 'Rectangle',
        description: '價格在水平區間內來回震盪，等待方向突破',
        category: 'consolidation',
        signal: 'neutral',
    },
    'wedge': {
        id: 'wedge',
        name: '楔形',
        nameEn: 'Wedge',
        description: '收斂型態，通常預示反轉',
        category: 'reversal',
        signal: 'neutral',
    },
};

// Generate timestamp for candles
const generateTimestamp = (baseTime: number, index: number, intervalMs: number = 60000) => {
    return baseTime + index * intervalMs;
};

const baseTime = Date.now() - 3600000 * 24; // 24 hours ago

// Pattern scenarios for practice
export const PATTERN_SCENARIOS: PatternScenario[] = [
    // Head and Shoulders Top
    {
        id: 'hst-001',
        patternType: 'head-and-shoulders-top',
        name: '頭肩頂型態練習 1',
        description: '典型的頭肩頂型態，觀察頸線跌破後的賣出時機',
        candles: [
            { open: 100, high: 105, low: 98, close: 104, volume: 50000, timestamp: generateTimestamp(baseTime, 0) },
            { open: 104, high: 112, low: 103, close: 110, volume: 65000, timestamp: generateTimestamp(baseTime, 1), label: '左肩形成' },
            { open: 110, high: 111, low: 102, close: 104, volume: 55000, timestamp: generateTimestamp(baseTime, 2) },
            { open: 104, high: 120, low: 103, close: 118, volume: 80000, timestamp: generateTimestamp(baseTime, 3), label: '頭部創高' },
            { open: 118, high: 119, low: 100, close: 102, volume: 70000, timestamp: generateTimestamp(baseTime, 4), label: '回落' },
            { open: 102, high: 112, low: 101, close: 109, volume: 60000, timestamp: generateTimestamp(baseTime, 5), label: '右肩形成' },
            { open: 109, high: 110, low: 95, close: 96, volume: 90000, timestamp: generateTimestamp(baseTime, 6), label: '跌破頸線' },
            { open: 96, high: 98, low: 88, close: 90, volume: 85000, timestamp: generateTimestamp(baseTime, 7) },
            { open: 90, high: 92, low: 82, close: 85, volume: 75000, timestamp: generateTimestamp(baseTime, 8), label: '續跌' },
        ],
        optimalEntry: { candleIndex: 6, action: 'sell', price: 96, description: '跌破頸線時賣出' },
        optimalExit: { candleIndex: 8, action: 'buy', price: 85, description: '目標價附近回補' },
        stopLoss: 105,
        takeProfit: 80,
        expectedDirection: 'down',
        difficulty: 'medium',
    },
    // Double Bottom (W底)
    {
        id: 'db-001',
        patternType: 'double-bottom',
        name: 'W底型態練習 1',
        description: '經典的W底型態，觀察突破頸線後的買入時機',
        candles: [
            { open: 80, high: 82, low: 68, close: 70, volume: 60000, timestamp: generateTimestamp(baseTime, 0), label: '下跌' },
            { open: 70, high: 72, low: 58, close: 60, volume: 75000, timestamp: generateTimestamp(baseTime, 1), label: '第一底' },
            { open: 60, high: 75, low: 59, close: 73, volume: 55000, timestamp: generateTimestamp(baseTime, 2), label: '反彈' },
            { open: 73, high: 74, low: 57, close: 59, volume: 70000, timestamp: generateTimestamp(baseTime, 3), label: '第二底' },
            { open: 59, high: 68, low: 58, close: 66, volume: 50000, timestamp: generateTimestamp(baseTime, 4), label: '起漲' },
            { open: 66, high: 80, low: 65, close: 78, volume: 85000, timestamp: generateTimestamp(baseTime, 5), label: '突破頸線' },
            { open: 78, high: 79, low: 72, close: 74, volume: 45000, timestamp: generateTimestamp(baseTime, 6), label: '回測' },
            { open: 74, high: 92, low: 73, close: 90, volume: 90000, timestamp: generateTimestamp(baseTime, 7), label: '上漲' },
            { open: 90, high: 98, low: 88, close: 96, volume: 80000, timestamp: generateTimestamp(baseTime, 8), label: '目標達' },
        ],
        optimalEntry: { candleIndex: 5, action: 'buy', price: 78, description: '突破頸線時買入' },
        optimalExit: { candleIndex: 8, action: 'sell', price: 96, description: '達到目標價賣出' },
        stopLoss: 55,
        takeProfit: 95,
        expectedDirection: 'up',
        difficulty: 'easy',
    },
    // Ascending Triangle
    {
        id: 'at-001',
        patternType: 'ascending-triangle',
        name: '上升三角形練習 1',
        description: '上升三角形整理後突破，觀察買入時機',
        candles: [
            { open: 88, high: 97, low: 85, close: 95, volume: 50000, timestamp: generateTimestamp(baseTime, 0) },
            { open: 95, high: 100, low: 90, close: 92, volume: 55000, timestamp: generateTimestamp(baseTime, 1), label: '壓力線' },
            { open: 92, high: 100, low: 91, close: 98, volume: 48000, timestamp: generateTimestamp(baseTime, 2) },
            { open: 98, high: 101, low: 93, close: 94, volume: 52000, timestamp: generateTimestamp(baseTime, 3), label: '測壓力' },
            { open: 94, high: 100, low: 93, close: 99, volume: 50000, timestamp: generateTimestamp(baseTime, 4) },
            { open: 99, high: 100, low: 95, close: 96, volume: 45000, timestamp: generateTimestamp(baseTime, 5), label: '蓄勢' },
            { open: 96, high: 110, low: 95, close: 108, volume: 95000, timestamp: generateTimestamp(baseTime, 6), label: '突破!' },
            { open: 108, high: 118, low: 106, close: 115, volume: 85000, timestamp: generateTimestamp(baseTime, 7), label: '續漲' },
        ],
        optimalEntry: { candleIndex: 6, action: 'buy', price: 102, description: '突破壓力線時買入' },
        optimalExit: { candleIndex: 7, action: 'sell', price: 115, description: '達到目標價賣出' },
        stopLoss: 92,
        takeProfit: 115,
        expectedDirection: 'up',
        difficulty: 'easy',
    },
    // Bull Flag
    {
        id: 'bf-001',
        patternType: 'bull-flag',
        name: '上升旗形練習 1',
        description: '急漲後整理形成旗形，觀察突破買入時機',
        candles: [
            { open: 50, high: 68, low: 49, close: 67, volume: 90000, timestamp: generateTimestamp(baseTime, 0), label: '旗竿' },
            { open: 67, high: 69, low: 62, close: 64, volume: 45000, timestamp: generateTimestamp(baseTime, 1), label: '整理1' },
            { open: 64, high: 66, low: 60, close: 62, volume: 40000, timestamp: generateTimestamp(baseTime, 2), label: '整理2' },
            { open: 62, high: 64, low: 58, close: 60, volume: 38000, timestamp: generateTimestamp(baseTime, 3), label: '整理3' },
            { open: 60, high: 78, low: 59, close: 76, volume: 100000, timestamp: generateTimestamp(baseTime, 4), label: '突破!' },
            { open: 76, high: 88, low: 75, close: 85, volume: 85000, timestamp: generateTimestamp(baseTime, 5), label: '大漲' },
        ],
        optimalEntry: { candleIndex: 4, action: 'buy', price: 65, description: '突破旗身上緣時買入' },
        optimalExit: { candleIndex: 5, action: 'sell', price: 85, description: '達到目標價賣出' },
        stopLoss: 56,
        takeProfit: 85,
        expectedDirection: 'up',
        difficulty: 'medium',
    },
    // Head and Shoulders Bottom
    {
        id: 'hsb-001',
        patternType: 'head-and-shoulders-bottom',
        name: '頭肩底型態練習 1',
        description: '底部反轉型態，觀察突破頸線後的買入時機',
        candles: [
            { open: 100, high: 102, low: 88, close: 90, volume: 55000, timestamp: generateTimestamp(baseTime, 0), label: '下跌' },
            { open: 90, high: 92, low: 80, close: 82, volume: 60000, timestamp: generateTimestamp(baseTime, 1), label: '左肩' },
            { open: 82, high: 90, low: 81, close: 88, volume: 50000, timestamp: generateTimestamp(baseTime, 2) },
            { open: 88, high: 89, low: 70, close: 72, volume: 80000, timestamp: generateTimestamp(baseTime, 3), label: '頭部' },
            { open: 72, high: 90, low: 71, close: 88, volume: 65000, timestamp: generateTimestamp(baseTime, 4) },
            { open: 88, high: 89, low: 78, close: 80, volume: 55000, timestamp: generateTimestamp(baseTime, 5), label: '右肩' },
            { open: 80, high: 95, low: 79, close: 93, volume: 90000, timestamp: generateTimestamp(baseTime, 6), label: '突破頸線' },
            { open: 93, high: 105, low: 92, close: 103, volume: 85000, timestamp: generateTimestamp(baseTime, 7), label: '上漲' },
            { open: 103, high: 115, low: 102, close: 112, volume: 80000, timestamp: generateTimestamp(baseTime, 8), label: '目標達' },
        ],
        optimalEntry: { candleIndex: 6, action: 'buy', price: 93, description: '突破頸線時買入' },
        optimalExit: { candleIndex: 8, action: 'sell', price: 112, description: '達到目標價賣出' },
        stopLoss: 75,
        takeProfit: 110,
        expectedDirection: 'up',
        difficulty: 'medium',
    },
    // Double Top (M頭)
    {
        id: 'dt-001',
        patternType: 'double-top',
        name: 'M頭型態練習 1',
        description: '經典的M頭型態，觀察跌破頸線後的賣出時機',
        candles: [
            { open: 80, high: 95, low: 78, close: 93, volume: 60000, timestamp: generateTimestamp(baseTime, 0), label: '上漲' },
            { open: 93, high: 102, low: 92, close: 100, volume: 75000, timestamp: generateTimestamp(baseTime, 1), label: '第一頂' },
            { open: 100, high: 101, low: 85, close: 87, volume: 55000, timestamp: generateTimestamp(baseTime, 2), label: '回檔' },
            { open: 87, high: 103, low: 86, close: 101, volume: 70000, timestamp: generateTimestamp(baseTime, 3), label: '第二頂' },
            { open: 101, high: 102, low: 90, close: 92, volume: 50000, timestamp: generateTimestamp(baseTime, 4), label: '回落' },
            { open: 92, high: 93, low: 80, close: 82, volume: 85000, timestamp: generateTimestamp(baseTime, 5), label: '跌破頸線' },
            { open: 82, high: 88, low: 80, close: 86, volume: 45000, timestamp: generateTimestamp(baseTime, 6), label: '反彈' },
            { open: 86, high: 87, low: 70, close: 72, volume: 90000, timestamp: generateTimestamp(baseTime, 7), label: '續跌' },
        ],
        optimalEntry: { candleIndex: 5, action: 'sell', price: 82, description: '跌破頸線時賣出' },
        optimalExit: { candleIndex: 7, action: 'buy', price: 72, description: '達到目標價回補' },
        stopLoss: 95,
        takeProfit: 70,
        expectedDirection: 'down',
        difficulty: 'easy',
    },
    // Rectangle
    {
        id: 'rect-001',
        patternType: 'rectangle',
        name: '矩形整理練習 1',
        description: '箱型整理後向上突破',
        candles: [
            { open: 55, high: 60, low: 51, close: 52, volume: 50000, timestamp: generateTimestamp(baseTime, 0), label: '測底' },
            { open: 52, high: 59, low: 51, close: 58, volume: 48000, timestamp: generateTimestamp(baseTime, 1), label: '反彈' },
            { open: 58, high: 60, low: 53, close: 54, volume: 45000, timestamp: generateTimestamp(baseTime, 2), label: '回落' },
            { open: 54, high: 60, low: 53, close: 59, volume: 52000, timestamp: generateTimestamp(baseTime, 3), label: '測頂' },
            { open: 59, high: 60, low: 52, close: 53, volume: 46000, timestamp: generateTimestamp(baseTime, 4), label: '回落' },
            { open: 53, high: 58, low: 52, close: 57, volume: 50000, timestamp: generateTimestamp(baseTime, 5), label: '蓄勢' },
            { open: 57, high: 70, low: 56, close: 68, volume: 95000, timestamp: generateTimestamp(baseTime, 6), label: '突破!' },
            { open: 68, high: 78, low: 66, close: 75, volume: 85000, timestamp: generateTimestamp(baseTime, 7), label: '目標達' },
        ],
        optimalEntry: { candleIndex: 6, action: 'buy', price: 62, description: '突破箱頂時買入' },
        optimalExit: { candleIndex: 7, action: 'sell', price: 75, description: '達到目標價賣出' },
        stopLoss: 50,
        takeProfit: 70,
        expectedDirection: 'up',
        difficulty: 'easy',
    },
    // Symmetric Triangle
    {
        id: 'st-001',
        patternType: 'symmetric-triangle',
        name: '對稱三角形練習 1',
        description: '收斂整理後向上突破',
        candles: [
            { open: 100, high: 115, low: 90, close: 108, volume: 60000, timestamp: generateTimestamp(baseTime, 0), label: 'W1' },
            { open: 108, high: 112, low: 92, close: 95, volume: 55000, timestamp: generateTimestamp(baseTime, 1), label: 'W2' },
            { open: 95, high: 108, low: 94, close: 105, volume: 50000, timestamp: generateTimestamp(baseTime, 2), label: 'W3' },
            { open: 105, high: 108, low: 96, close: 98, volume: 48000, timestamp: generateTimestamp(baseTime, 3), label: 'W4' },
            { open: 98, high: 105, low: 97, close: 103, volume: 45000, timestamp: generateTimestamp(baseTime, 4), label: 'W5' },
            { open: 103, high: 120, low: 102, close: 118, volume: 100000, timestamp: generateTimestamp(baseTime, 5), label: '突破!' },
            { open: 118, high: 130, low: 116, close: 128, volume: 90000, timestamp: generateTimestamp(baseTime, 6), label: '上漲' },
        ],
        optimalEntry: { candleIndex: 5, action: 'buy', price: 108, description: '突破上緣時買入' },
        optimalExit: { candleIndex: 6, action: 'sell', price: 128, description: '達到目標價賣出' },
        stopLoss: 95,
        takeProfit: 130,
        expectedDirection: 'up',
        difficulty: 'medium',
    },
    // Cup and Handle
    {
        id: 'ch-001',
        patternType: 'cup-and-handle',
        name: '杯柄型態練習 1',
        description: '杯柄型態突破，預示大幅上漲',
        candles: [
            { open: 100, high: 102, low: 90, close: 92, volume: 55000, timestamp: generateTimestamp(baseTime, 0), label: '下跌' },
            { open: 92, high: 93, low: 80, close: 82, volume: 60000, timestamp: generateTimestamp(baseTime, 1), label: '續跌' },
            { open: 82, high: 83, low: 70, close: 72, volume: 65000, timestamp: generateTimestamp(baseTime, 2), label: '杯底' },
            { open: 72, high: 85, low: 71, close: 83, volume: 55000, timestamp: generateTimestamp(baseTime, 3), label: '反彈' },
            { open: 83, high: 100, low: 82, close: 98, volume: 70000, timestamp: generateTimestamp(baseTime, 4), label: '回升' },
            { open: 98, high: 100, low: 90, close: 92, volume: 40000, timestamp: generateTimestamp(baseTime, 5), label: '杯柄' },
            { open: 92, high: 95, low: 88, close: 94, volume: 45000, timestamp: generateTimestamp(baseTime, 6), label: '整理' },
            { open: 94, high: 115, low: 93, close: 112, volume: 110000, timestamp: generateTimestamp(baseTime, 7), label: '突破!' },
            { open: 112, high: 130, low: 110, close: 128, volume: 100000, timestamp: generateTimestamp(baseTime, 8), label: '大漲' },
        ],
        optimalEntry: { candleIndex: 7, action: 'buy', price: 102, description: '突破杯柄時買入' },
        optimalExit: { candleIndex: 8, action: 'sell', price: 128, description: '達到目標價賣出' },
        stopLoss: 85,
        takeProfit: 130,
        expectedDirection: 'up',
        difficulty: 'hard',
    },
    // Descending Triangle
    {
        id: 'dct-001',
        patternType: 'descending-triangle',
        name: '下降三角形練習 1',
        description: '下降三角形跌破，觀察賣出時機',
        candles: [
            { open: 100, high: 105, low: 85, close: 88, volume: 60000, timestamp: generateTimestamp(baseTime, 0) },
            { open: 88, high: 95, low: 80, close: 82, volume: 55000, timestamp: generateTimestamp(baseTime, 1), label: '支撐線' },
            { open: 82, high: 92, low: 80, close: 90, volume: 50000, timestamp: generateTimestamp(baseTime, 2) },
            { open: 90, high: 91, low: 80, close: 82, volume: 48000, timestamp: generateTimestamp(baseTime, 3), label: '測支撐' },
            { open: 82, high: 88, low: 80, close: 85, volume: 45000, timestamp: generateTimestamp(baseTime, 4) },
            { open: 85, high: 86, low: 70, close: 72, volume: 90000, timestamp: generateTimestamp(baseTime, 5), label: '跌破!' },
            { open: 72, high: 75, low: 60, close: 62, volume: 85000, timestamp: generateTimestamp(baseTime, 6), label: '續跌' },
        ],
        optimalEntry: { candleIndex: 5, action: 'sell', price: 78, description: '跌破支撐線時賣出' },
        optimalExit: { candleIndex: 6, action: 'buy', price: 62, description: '達到目標價回補' },
        stopLoss: 92,
        takeProfit: 60,
        expectedDirection: 'down',
        difficulty: 'medium',
    },
];

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
    return Object.values(PATTERN_INFO).filter(p => availableTypes.has(p.id));
}
