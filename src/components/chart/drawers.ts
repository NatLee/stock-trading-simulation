'use client';

import { CandleData } from '@/types';
import { ChartColors } from './types';
import { priceToY, indexToX } from './utils';

interface DrawCandlesProps {
    ctx: CanvasRenderingContext2D;
    candles: CandleData[];
    scale: {
        priceMin: number;
        priceRange: number;
        candleWidth: number;
        candleGap: number;
        chartHeight: number;
    };
    padding: { top: number; left: number };
    colors: ChartColors;
    volumeHeight: number;
    offsetIndex?: number;
}

export function drawCandles({
    ctx,
    candles,
    scale,
    padding,
    colors,
    volumeHeight,
    offsetIndex = 0,
}: DrawCandlesProps): void {
    candles.forEach((candle, i) => {
        const x = indexToX(i, scale.candleWidth, scale.candleGap, padding.left, offsetIndex);
        const isBullish = candle.close >= candle.open;
        const color = isBullish ? colors.bullish : colors.bearish;

        const openY = priceToY(candle.open, scale.priceMin, scale.priceRange, scale.chartHeight, padding.top, volumeHeight);
        const closeY = priceToY(candle.close, scale.priceMin, scale.priceRange, scale.chartHeight, padding.top, volumeHeight);
        const highY = priceToY(candle.high, scale.priceMin, scale.priceRange, scale.chartHeight, padding.top, volumeHeight);
        const lowY = priceToY(candle.low, scale.priceMin, scale.priceRange, scale.chartHeight, padding.top, volumeHeight);

        // Draw wick (shadow)
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Draw body
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.abs(closeY - openY) || 1;

        ctx.fillStyle = color;
        ctx.fillRect(
            x - scale.candleWidth / 2,
            bodyTop,
            scale.candleWidth,
            bodyHeight
        );

        // Draw body outline for hollow candles (optional)
        if (isBullish) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.strokeRect(
                x - scale.candleWidth / 2,
                bodyTop,
                scale.candleWidth,
                bodyHeight
            );
        }
    });
}

interface DrawVolumeProps {
    ctx: CanvasRenderingContext2D;
    candles: CandleData[];
    scale: {
        volumeMax: number;
        candleWidth: number;
        candleGap: number;
        chartHeight: number;
    };
    padding: { top: number; left: number };
    dimensions: { height: number };
    colors: ChartColors;
    volumeHeight: number;
    offsetIndex?: number;
}

export function drawVolume({
    ctx,
    candles,
    scale,
    padding,
    dimensions,
    colors,
    volumeHeight,
    offsetIndex = 0,
}: DrawVolumeProps): void {
    const volumeAreaHeight = scale.chartHeight * volumeHeight;
    const volumeAreaTop = dimensions.height - padding.top - volumeAreaHeight;

    candles.forEach((candle, i) => {
        const x = indexToX(i, scale.candleWidth, scale.candleGap, padding.left, offsetIndex);
        const isBullish = candle.close >= candle.open;
        const barHeight = (candle.volume / scale.volumeMax) * volumeAreaHeight;

        ctx.fillStyle = isBullish ? colors.volumeBullish : colors.volumeBearish;
        ctx.fillRect(
            x - scale.candleWidth / 2,
            volumeAreaTop + volumeAreaHeight - barHeight,
            scale.candleWidth,
            barHeight
        );
    });
}

interface DrawMAProps {
    ctx: CanvasRenderingContext2D;
    maValues: (number | null)[];
    scale: {
        priceMin: number;
        priceRange: number;
        candleWidth: number;
        candleGap: number;
        chartHeight: number;
    };
    padding: { top: number; left: number };
    color: string;
    volumeHeight: number;
    offsetIndex?: number;
}

export function drawMA({
    ctx,
    maValues,
    scale,
    padding,
    color,
    volumeHeight,
    offsetIndex = 0,
}: DrawMAProps): void {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    let started = false;
    maValues.forEach((value, i) => {
        if (value === null) return;

        const x = indexToX(i, scale.candleWidth, scale.candleGap, padding.left, offsetIndex);
        const y = priceToY(value, scale.priceMin, scale.priceRange, scale.chartHeight, padding.top, volumeHeight);

        if (!started) {
            ctx.moveTo(x, y);
            started = true;
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();
}
