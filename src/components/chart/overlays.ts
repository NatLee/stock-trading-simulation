'use client';


import { ChartColors, ChartDimensions } from './types';
import { CandleData } from '@/types';
import { indexToX } from './utils';

interface DrawGridProps {
    ctx: CanvasRenderingContext2D;
    dimensions: ChartDimensions;
    scale: {
        priceMin: number;
        priceMax: number;
        priceRange: number;
        chartHeight: number;
        chartWidth: number;
        candleWidth: number;
        candleGap: number;
    };
    colors: ChartColors;
    volumeHeight: number;
    candles: CandleData[];
    offsetIndex?: number;
}

export function drawGrid({
    ctx,
    dimensions,
    scale,
    colors,
    volumeHeight,
    candles,
    offsetIndex = 0,
}: DrawGridProps): void {
    const { padding, width, height } = dimensions;
    const priceAreaHeight = scale.chartHeight * (1 - volumeHeight);

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);

    // Horizontal grid lines (price levels)
    const priceSteps = 5;
    const priceStep = (scale.priceMax - scale.priceMin) / priceSteps;

    for (let i = 0; i <= priceSteps; i++) {
        const price = scale.priceMin + i * priceStep;
        const y = padding.top + priceAreaHeight - (i / priceSteps) * priceAreaHeight;

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        // Price labels
        ctx.fillStyle = colors.text;
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(price.toFixed(2), width - padding.right + 5, y + 3);
    }

    // Vertical grid lines (time)
    const timeSteps = 5;
    const period = candles.length > 1 ? candles[1].timestamp - candles[0].timestamp : 15000;

    // Calculate max visible candles to determine step size in indices
    const maxVisible = Math.floor(scale.chartWidth / (scale.candleWidth + scale.candleGap));
    const stepSize = Math.max(1, Math.floor(maxVisible / timeSteps));

    // We iterate by index steps to align with candles
    for (let i = 0; i <= timeSteps; i++) {
        // Calculate logical index relative to the start of visible area
        const virtualIndex = Math.floor(i * (maxVisible / timeSteps));
        const x = indexToX(virtualIndex, scale.candleWidth, scale.candleGap, padding.left, 0); // 0 because virtualIndex is already relative to left

        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();

        // Time Labels
        // Determine timestamp:
        // realIndex = virtualIndex - offsetIndex
        // If realIndex is valid in candles, use it.
        // Else extrapolate.
        const realIndex = virtualIndex - offsetIndex;
        let timestamp = 0;

        if (realIndex >= 0 && realIndex < candles.length) {
            timestamp = candles[realIndex].timestamp;
        } else if (candles.length > 0) {
            // Extrapolate
            if (realIndex < 0) {
                timestamp = candles[0].timestamp + realIndex * period;
            } else {
                timestamp = candles[candles.length - 1].timestamp + (realIndex - (candles.length - 1)) * period;
            }
        }

        if (timestamp > 0) {
            const date = new Date(timestamp);
            const timeStr = date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

            ctx.fillStyle = colors.text;
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(timeStr, x, height - padding.bottom + 12);
        }
    }

    ctx.setLineDash([]);
}

interface DrawPriceLineProps {
    ctx: CanvasRenderingContext2D;
    currentPrice: number;
    scale: {
        priceMin: number;
        priceRange: number;
        chartWidth: number;
        chartHeight: number;
    };
    padding: { top: number; left: number; right: number };
    dimensions: { width: number };
    colors: ChartColors;
    volumeHeight: number;
}

export function drawPriceLine({
    ctx,
    currentPrice,
    scale,
    padding,
    dimensions,
    colors,
    volumeHeight,
}: DrawPriceLineProps): void {
    const priceAreaHeight = scale.chartHeight * (1 - volumeHeight);
    const y = padding.top + priceAreaHeight - ((currentPrice - scale.priceMin) / scale.priceRange) * priceAreaHeight;

    // Dashed line
    ctx.beginPath();
    ctx.strokeStyle = colors.priceLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 2]);
    ctx.moveTo(padding.left, y);
    ctx.lineTo(dimensions.width - padding.right, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price label box
    const labelWidth = 55;
    const labelHeight = 16;
    ctx.fillStyle = colors.priceLine;
    ctx.fillRect(dimensions.width - padding.right, y - labelHeight / 2, labelWidth, labelHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`$${currentPrice.toFixed(2)}`, dimensions.width - padding.right + 3, y + 4);

    // Pulsing dot
    ctx.beginPath();
    ctx.fillStyle = colors.priceLine;
    ctx.arc(padding.left + 5, y, 4, 0, Math.PI * 2);
    ctx.fill();
}

interface DrawCrosshairProps {
    ctx: CanvasRenderingContext2D;
    x: number;
    y: number;
    dimensions: ChartDimensions;
    colors: ChartColors;
}

export function drawCrosshair({
    ctx,
    x,
    y,
    dimensions,
    colors,
}: DrawCrosshairProps): void {
    const { padding, width, height } = dimensions;

    ctx.strokeStyle = colors.crosshair;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.setLineDash([]);
}
