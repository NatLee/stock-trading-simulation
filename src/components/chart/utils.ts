import { ChartColors, ChartConfig, ChartDimensions } from './types';

export const DEFAULT_COLORS: ChartColors = {
    background: '#09090b',
    grid: '#27272a',
    text: '#71717a',
    bullish: '#10b981',
    bearish: '#ef4444',
    volume: '#27272a',
    volumeBullish: 'rgba(16, 185, 129, 0.3)',
    volumeBearish: 'rgba(239, 68, 68, 0.3)',
    ma7: '#6366f1',
    ma25: '#f59e0b',
    priceLine: '#3b82f6',
    crosshair: '#52525b',
};

export const DEFAULT_DIMENSIONS: ChartDimensions = {
    width: 800,
    height: 400,
    padding: {
        top: 20,
        right: 56,
        bottom: 30,
        left: 10,
    },
};

export const DEFAULT_CONFIG: ChartConfig = {
    dimensions: DEFAULT_DIMENSIONS,
    colors: DEFAULT_COLORS,
    showVolume: true,
    showMA: true,
    showGrid: true,
    showCrosshair: true,
    volumeHeight: 0.2,
    maPeriods: [7, 25],
};

// Fixed candle dimensions
const CANDLE_WIDTH = 8;
const CANDLE_GAP = 2;

// Calculate chart scale from candle data
export function calculateScale(
    candles: { high: number; low: number; volume: number }[],
    dimensions: ChartDimensions,
    includePrice?: number
): {
    priceMin: number;
    priceMax: number;
    priceRange: number;
    volumeMax: number;
    candleWidth: number;
    candleGap: number;
    chartWidth: number;
    chartHeight: number;
} {
    const chartWidth = dimensions.width - dimensions.padding.left - dimensions.padding.right;
    const chartHeight = dimensions.height - dimensions.padding.top - dimensions.padding.bottom;

    if (candles.length === 0) {
        return {
            priceMin: 0,
            priceMax: 100,
            priceRange: 100,
            volumeMax: 1000,
            candleWidth: CANDLE_WIDTH,
            candleGap: CANDLE_GAP,
            chartWidth,
            chartHeight,
        };
    }

    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    if (includePrice !== undefined) {
        highs.push(includePrice);
        lows.push(includePrice);
    }

    const priceMin = Math.min(...lows) * 0.999; // Tighter buffer (0.1%) to show small movements better? User said "can't see subtle changes"
    const priceMax = Math.max(...highs) * 1.001; // Tighter buffer
    const priceRange = priceMax - priceMin;
    const volumeMax = Math.max(...volumes) * 1.1;

    return {
        priceMin,
        priceMax,
        priceRange,
        volumeMax,
        candleWidth: CANDLE_WIDTH,
        candleGap: CANDLE_GAP,
        chartWidth,
        chartHeight,
    };
}

// Price to Y coordinate
export function priceToY(
    price: number,
    priceMin: number,
    priceRange: number,
    chartHeight: number,
    paddingTop: number,
    volumeHeight: number = 0
): number {
    const priceAreaHeight = chartHeight * (1 - volumeHeight);
    return paddingTop + priceAreaHeight - ((price - priceMin) / priceRange) * priceAreaHeight;
}

// Index to X coordinate
export function indexToX(
    index: number,
    candleWidth: number,
    candleGap: number,
    paddingLeft: number,
    offsetIndex: number = 0
): number {
    return paddingLeft + (index + offsetIndex) * (candleWidth + candleGap) + candleWidth / 2;
}

// Calculate Simple Moving Average
export function calculateMA(closes: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];

    for (let i = 0; i < closes.length; i++) {
        if (i < period - 1) {
            result.push(null);
        } else {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += closes[i - j];
            }
            result.push(sum / period);
        }
    }

    return result;
}
