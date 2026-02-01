// AI Market Analysis Library
// Provides real-time market analysis functions for trend, order book, momentum, and candlestick patterns

import { CandleData } from '@/types/trading';
import { OrderBookSnapshot } from './matching/types';

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number; // 0-100
    description: string;
    higherHighs: boolean;
    higherLows: boolean;
    lowerHighs: boolean;
    lowerLows: boolean;
}

/**
 * Order book analysis result
 */
export interface OrderBookAnalysis {
    buyPressure: number; // 0-100 percentage
    sellPressure: number; // 0-100 percentage
    imbalance: 'buy_heavy' | 'sell_heavy' | 'balanced';
    spreadPercent: number;
    description: string;
}

/**
 * Momentum analysis result
 */
export interface MomentumAnalysis {
    velocity: number; // Price change rate
    acceleration: number; // Change in velocity
    volumeTrend: 'increasing' | 'decreasing' | 'stable';
    rsi: number; // Simplified RSI approximation
    description: string;
}

/**
 * Candlestick pattern detection result
 */
export interface PatternAnalysis {
    detected: string | null;
    signal: 'bullish' | 'bearish' | 'neutral';
    confidence: number; // 0-100
    description: string;
}

/**
 * Overall AI analysis result
 */
export interface AIAnalysisResult {
    trend: TrendAnalysis;
    orderBook: OrderBookAnalysis;
    momentum: MomentumAnalysis;
    pattern: PatternAnalysis;
    overall: {
        recommendation: 'LONG' | 'SHORT' | 'HOLD';
        confidence: number; // 0-100
        reasons: string[];
    };
    timestamp: number;
}

/**
 * Analyze trend direction from candlestick data
 * Uses higher highs/lows and lower highs/lows to determine trend
 */
export function analyzeTrend(candles: CandleData[], lookback: number = 10): TrendAnalysis {
    if (candles.length < lookback) {
        return {
            direction: 'neutral',
            strength: 50,
            description: '數據不足，無法判斷趨勢',
            higherHighs: false,
            higherLows: false,
            lowerHighs: false,
            lowerLows: false,
        };
    }

    const recentCandles = candles.slice(-lookback);
    
    // Find swing highs and lows
    const highs = recentCandles.map(c => c.high);
    const lows = recentCandles.map(c => c.low);
    
    // Check for higher highs and higher lows (bullish)
    let higherHighsCount = 0;
    let higherLowsCount = 0;
    let lowerHighsCount = 0;
    let lowerLowsCount = 0;
    
    for (let i = 1; i < highs.length; i++) {
        if (highs[i] > highs[i - 1]) higherHighsCount++;
        else if (highs[i] < highs[i - 1]) lowerHighsCount++;
        
        if (lows[i] > lows[i - 1]) higherLowsCount++;
        else if (lows[i] < lows[i - 1]) lowerLowsCount++;
    }
    
    const totalComparisons = highs.length - 1;
    const higherHighs = higherHighsCount > totalComparisons * 0.5;
    const higherLows = higherLowsCount > totalComparisons * 0.5;
    const lowerHighs = lowerHighsCount > totalComparisons * 0.5;
    const lowerLows = lowerLowsCount > totalComparisons * 0.5;
    
    // Calculate overall price change
    const firstClose = recentCandles[0].close;
    const lastClose = recentCandles[recentCandles.length - 1].close;
    const priceChange = ((lastClose - firstClose) / firstClose) * 100;
    
    // Determine trend direction and strength
    let direction: 'bullish' | 'bearish' | 'neutral';
    let strength: number;
    let description: string;
    
    if (higherHighs && higherLows) {
        direction = 'bullish';
        strength = Math.min(90, 60 + Math.abs(priceChange) * 5);
        description = '上升趨勢明確：頭頭高、底底高';
    } else if (lowerHighs && lowerLows) {
        direction = 'bearish';
        strength = Math.min(90, 60 + Math.abs(priceChange) * 5);
        description = '下降趨勢明確：頭頭低、底底低';
    } else if (priceChange > 1.5) {
        direction = 'bullish';
        strength = Math.min(70, 50 + priceChange * 3);
        description = '短期偏多，但趨勢尚未確立';
    } else if (priceChange < -1.5) {
        direction = 'bearish';
        strength = Math.min(70, 50 + Math.abs(priceChange) * 3);
        description = '短期偏空，但趨勢尚未確立';
    } else {
        direction = 'neutral';
        strength = 50;
        description = '盤整格局，方向不明';
    }
    
    return {
        direction,
        strength: Math.round(strength),
        description,
        higherHighs,
        higherLows,
        lowerHighs,
        lowerLows,
    };
}

/**
 * Analyze order book for buy/sell pressure imbalance
 */
export function analyzeOrderBook(orderBook: OrderBookSnapshot): OrderBookAnalysis {
    const totalBidVolume = orderBook.bids.reduce((sum, level) => sum + level.quantity, 0);
    const totalAskVolume = orderBook.asks.reduce((sum, level) => sum + level.quantity, 0);
    const totalVolume = totalBidVolume + totalAskVolume;
    
    if (totalVolume === 0) {
        return {
            buyPressure: 50,
            sellPressure: 50,
            imbalance: 'balanced',
            spreadPercent: 0,
            description: '委託簿無資料',
        };
    }
    
    const buyPressure = (totalBidVolume / totalVolume) * 100;
    const sellPressure = (totalAskVolume / totalVolume) * 100;
    
    // Calculate spread percentage
    const spreadPercent = orderBook.bestAsk && orderBook.bestBid
        ? ((orderBook.bestAsk - orderBook.bestBid) / orderBook.bestBid) * 100
        : 0;
    
    let imbalance: 'buy_heavy' | 'sell_heavy' | 'balanced';
    let description: string;
    
    const imbalanceRatio = buyPressure / sellPressure;
    
    if (imbalanceRatio > 1.5) {
        imbalance = 'buy_heavy';
        description = `買盤強勁 (${buyPressure.toFixed(0)}% vs ${sellPressure.toFixed(0)}%)，買壓大於賣壓`;
    } else if (imbalanceRatio < 0.67) {
        imbalance = 'sell_heavy';
        description = `賣壓沉重 (${sellPressure.toFixed(0)}% vs ${buyPressure.toFixed(0)}%)，賣壓大於買壓`;
    } else {
        imbalance = 'balanced';
        description = '買賣雙方勢均力敵，委託簿平衡';
    }
    
    return {
        buyPressure: Math.round(buyPressure),
        sellPressure: Math.round(sellPressure),
        imbalance,
        spreadPercent: Math.round(spreadPercent * 100) / 100,
        description,
    };
}

/**
 * Analyze price momentum from candlestick data
 */
export function analyzeMomentum(candles: CandleData[], lookback: number = 10): MomentumAnalysis {
    if (candles.length < lookback + 1) {
        return {
            velocity: 0,
            acceleration: 0,
            volumeTrend: 'stable',
            rsi: 50,
            description: '數據不足，無法計算動能',
        };
    }
    
    const recentCandles = candles.slice(-lookback);
    const previousCandles = candles.slice(-(lookback * 2), -lookback);
    
    // Calculate velocity (rate of price change)
    const firstPrice = recentCandles[0].close;
    const lastPrice = recentCandles[recentCandles.length - 1].close;
    const velocity = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    // Calculate acceleration (change in velocity)
    let previousVelocity = 0;
    if (previousCandles.length > 0) {
        const prevFirst = previousCandles[0].close;
        const prevLast = previousCandles[previousCandles.length - 1].close;
        previousVelocity = ((prevLast - prevFirst) / prevFirst) * 100;
    }
    const acceleration = velocity - previousVelocity;
    
    // Calculate volume trend
    const recentVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
    const previousVolume = previousCandles.length > 0
        ? previousCandles.reduce((sum, c) => sum + c.volume, 0) / previousCandles.length
        : recentVolume;
    
    let volumeTrend: 'increasing' | 'decreasing' | 'stable';
    if (recentVolume > previousVolume * 1.2) {
        volumeTrend = 'increasing';
    } else if (recentVolume < previousVolume * 0.8) {
        volumeTrend = 'decreasing';
    } else {
        volumeTrend = 'stable';
    }
    
    // Simplified RSI calculation (relative strength approximation)
    let gains = 0;
    let losses = 0;
    for (let i = 1; i < recentCandles.length; i++) {
        const change = recentCandles[i].close - recentCandles[i - 1].close;
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }
    
    const avgGain = gains / (recentCandles.length - 1);
    const avgLoss = losses / (recentCandles.length - 1);
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    // Generate description
    let description: string;
    if (rsi > 70) {
        description = `超買區 (RSI: ${rsi.toFixed(0)})，動能強勁但注意回調風險`;
    } else if (rsi < 30) {
        description = `超賣區 (RSI: ${rsi.toFixed(0)})，可能出現反彈`;
    } else if (velocity > 2 && acceleration > 0) {
        description = '動能加速上升，多頭氣勢強勁';
    } else if (velocity < -2 && acceleration < 0) {
        description = '動能加速下跌，空頭主導';
    } else if (Math.abs(velocity) < 0.5) {
        description = '動能平緩，價格橫盤整理';
    } else {
        description = `動能${velocity > 0 ? '正向' : '負向'}，${volumeTrend === 'increasing' ? '量能放大' : volumeTrend === 'decreasing' ? '量能萎縮' : '量能持平'}`;
    }
    
    return {
        velocity: Math.round(velocity * 100) / 100,
        acceleration: Math.round(acceleration * 100) / 100,
        volumeTrend,
        rsi: Math.round(rsi),
        description,
    };
}

/**
 * Detect common candlestick patterns
 */
export function detectCandlePattern(candles: CandleData[]): PatternAnalysis {
    if (candles.length < 3) {
        return {
            detected: null,
            signal: 'neutral',
            confidence: 0,
            description: '數據不足，無法識別型態',
        };
    }
    
    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    const prevPrevCandle = candles.length > 2 ? candles[candles.length - 3] : null;
    
    const bodySize = Math.abs(lastCandle.close - lastCandle.open);
    const totalRange = lastCandle.high - lastCandle.low;
    const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
    const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
    
    const isBullish = lastCandle.close > lastCandle.open;
    const isBearish = lastCandle.close < lastCandle.open;
    const prevIsBullish = prevCandle.close > prevCandle.open;
    const prevIsBearish = prevCandle.close < prevCandle.open;
    
    // Doji detection (small body with wicks)
    if (totalRange > 0 && bodySize / totalRange < 0.1) {
        return {
            detected: '十字星 (Doji)',
            signal: 'neutral',
            confidence: 75,
            description: '市場猶豫不決，可能出現反轉',
        };
    }
    
    // Hammer detection (long lower wick, small body at top)
    if (totalRange > 0 && lowerWick > bodySize * 2 && upperWick < bodySize * 0.5) {
        return {
            detected: '錘子線 (Hammer)',
            signal: 'bullish',
            confidence: 70,
            description: '底部反轉信號，多頭可能進場',
        };
    }
    
    // Shooting Star detection (long upper wick, small body at bottom)
    if (totalRange > 0 && upperWick > bodySize * 2 && lowerWick < bodySize * 0.5) {
        return {
            detected: '射擊之星 (Shooting Star)',
            signal: 'bearish',
            confidence: 70,
            description: '頂部反轉信號，空頭可能進場',
        };
    }
    
    // Bullish Engulfing
    if (isBullish && prevIsBearish) {
        const prevBodySize = Math.abs(prevCandle.close - prevCandle.open);
        if (lastCandle.open <= prevCandle.close && lastCandle.close >= prevCandle.open && bodySize > prevBodySize) {
            return {
                detected: '多頭吞噬 (Bullish Engulfing)',
                signal: 'bullish',
                confidence: 80,
                description: '強力多頭信號，價格可能反轉向上',
            };
        }
    }
    
    // Bearish Engulfing
    if (isBearish && prevIsBullish) {
        const prevBodySize = Math.abs(prevCandle.close - prevCandle.open);
        if (lastCandle.open >= prevCandle.close && lastCandle.close <= prevCandle.open && bodySize > prevBodySize) {
            return {
                detected: '空頭吞噬 (Bearish Engulfing)',
                signal: 'bearish',
                confidence: 80,
                description: '強力空頭信號，價格可能反轉向下',
            };
        }
    }
    
    // Morning Star (3-candle pattern)
    if (prevPrevCandle) {
        const ppIsBearish = prevPrevCandle.close < prevPrevCandle.open;
        const ppBodySize = Math.abs(prevPrevCandle.close - prevPrevCandle.open);
        const prevBodySizeSmall = Math.abs(prevCandle.close - prevCandle.open) < ppBodySize * 0.3;
        
        if (ppIsBearish && prevBodySizeSmall && isBullish && lastCandle.close > prevPrevCandle.open) {
            return {
                detected: '晨星 (Morning Star)',
                signal: 'bullish',
                confidence: 85,
                description: '三根K線底部反轉型態，強力買進信號',
            };
        }
        
        // Evening Star (3-candle pattern)
        const ppIsBullishES = prevPrevCandle.close > prevPrevCandle.open;
        if (ppIsBullishES && prevBodySizeSmall && isBearish && lastCandle.close < prevPrevCandle.open) {
            return {
                detected: '暮星 (Evening Star)',
                signal: 'bearish',
                confidence: 85,
                description: '三根K線頂部反轉型態，強力賣出信號',
            };
        }
    }
    
    // Strong bullish candle (large green body)
    if (isBullish && bodySize > totalRange * 0.7 && totalRange > 0) {
        return {
            detected: '大陽線 (Strong Bullish)',
            signal: 'bullish',
            confidence: 65,
            description: '多頭力道強勁，可能續漲',
        };
    }
    
    // Strong bearish candle (large red body)
    if (isBearish && bodySize > totalRange * 0.7 && totalRange > 0) {
        return {
            detected: '大陰線 (Strong Bearish)',
            signal: 'bearish',
            confidence: 65,
            description: '空頭力道強勁，可能續跌',
        };
    }
    
    return {
        detected: null,
        signal: 'neutral',
        confidence: 0,
        description: '無明顯型態',
    };
}

/**
 * Generate overall recommendation based on all analyses
 */
export function generateRecommendation(
    trend: TrendAnalysis,
    orderBook: OrderBookAnalysis,
    momentum: MomentumAnalysis,
    pattern: PatternAnalysis
): { recommendation: 'LONG' | 'SHORT' | 'HOLD'; confidence: number; reasons: string[] } {
    const reasons: string[] = [];
    let bullishScore = 0;
    let bearishScore = 0;
    
    // Trend contribution (weight: 30%)
    if (trend.direction === 'bullish') {
        bullishScore += trend.strength * 0.3;
        reasons.push(`趨勢偏多 (強度: ${trend.strength}%)`);
    } else if (trend.direction === 'bearish') {
        bearishScore += trend.strength * 0.3;
        reasons.push(`趨勢偏空 (強度: ${trend.strength}%)`);
    }
    
    // Order book contribution (weight: 25%)
    if (orderBook.imbalance === 'buy_heavy') {
        bullishScore += 25;
        reasons.push('委託簿買盤強勢');
    } else if (orderBook.imbalance === 'sell_heavy') {
        bearishScore += 25;
        reasons.push('委託簿賣壓沉重');
    }
    
    // Momentum contribution (weight: 25%)
    if (momentum.rsi > 70) {
        bearishScore += 15; // Overbought, potential reversal
        reasons.push(`RSI 超買 (${momentum.rsi})`);
    } else if (momentum.rsi < 30) {
        bullishScore += 15; // Oversold, potential bounce
        reasons.push(`RSI 超賣 (${momentum.rsi})`);
    } else if (momentum.velocity > 1) {
        bullishScore += 15;
        reasons.push('價格動能正向');
    } else if (momentum.velocity < -1) {
        bearishScore += 15;
        reasons.push('價格動能負向');
    }
    
    if (momentum.volumeTrend === 'increasing') {
        // Amplify the current direction
        if (bullishScore > bearishScore) bullishScore += 10;
        else if (bearishScore > bullishScore) bearishScore += 10;
        reasons.push('量能放大確認');
    }
    
    // Pattern contribution (weight: 20%)
    if (pattern.detected && pattern.confidence > 50) {
        if (pattern.signal === 'bullish') {
            bullishScore += pattern.confidence * 0.2;
            reasons.push(`${pattern.detected} (多頭信號)`);
        } else if (pattern.signal === 'bearish') {
            bearishScore += pattern.confidence * 0.2;
            reasons.push(`${pattern.detected} (空頭信號)`);
        }
    }
    
    // Calculate final recommendation
    const totalScore = bullishScore + bearishScore;
    const netScore = bullishScore - bearishScore;
    
    let recommendation: 'LONG' | 'SHORT' | 'HOLD';
    let confidence: number;
    
    if (netScore > 20) {
        recommendation = 'LONG';
        confidence = Math.min(90, 50 + netScore);
    } else if (netScore < -20) {
        recommendation = 'SHORT';
        confidence = Math.min(90, 50 + Math.abs(netScore));
    } else {
        recommendation = 'HOLD';
        confidence = 50 + (20 - Math.abs(netScore)); // Higher confidence when clearly neutral
    }
    
    if (reasons.length === 0) {
        reasons.push('無明確信號，建議觀望');
    }
    
    return {
        recommendation,
        confidence: Math.round(confidence),
        reasons,
    };
}

/**
 * Perform full AI market analysis
 */
export function performAIAnalysis(
    candles: CandleData[],
    orderBook: OrderBookSnapshot,
    lookback: number = 10
): AIAnalysisResult {
    const trend = analyzeTrend(candles, lookback);
    const orderBookAnalysis = analyzeOrderBook(orderBook);
    const momentum = analyzeMomentum(candles, lookback);
    const pattern = detectCandlePattern(candles);
    const overall = generateRecommendation(trend, orderBookAnalysis, momentum, pattern);
    
    return {
        trend,
        orderBook: orderBookAnalysis,
        momentum,
        pattern,
        overall,
        timestamp: Date.now(),
    };
}
