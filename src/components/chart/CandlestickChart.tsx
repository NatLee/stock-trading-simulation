'use client';

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { CandleData } from '@/types';
import { ChartConfig, CrosshairData, TooltipData } from './types';
import { DEFAULT_CONFIG, calculateScale, calculateMA } from './utils';
import { drawCandles, drawVolume, drawMA } from './drawers';
import { drawGrid, drawPriceLine, drawCrosshair } from './overlays';

interface CandlestickChartProps {
    candles: CandleData[];
    currentPrice: number;
    width?: number;
    height?: number;
    showMA?: boolean;
    showVolume?: boolean;
    showGrid?: boolean;
    className?: string;
    isAsianTheme?: boolean;
}

export function CandlestickChart({
    candles: allCandles,
    currentPrice,
    width = 800,
    height = 400,
    showMA = true,
    showVolume = true,
    showGrid = true,
    className = '',
    isAsianTheme = true,
}: CandlestickChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [crosshair, setCrosshair] = useState<CrosshairData>({
        x: 0,
        y: 0,
        visible: false,
        candleIndex: null,
    });
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);

    // Calculate max visible candles based on width
    const maxVisibleCandles = useMemo(() => {
        const candleWidth = 8;
        const candleGap = 2;
        const availableWidth = width - DEFAULT_CONFIG.dimensions.padding.left - DEFAULT_CONFIG.dimensions.padding.right;
        return Math.floor(availableWidth / (candleWidth + candleGap));
    }, [width]);

    // Calculate offset for right alignment
    // If we have fewer candles than visible slots, we offset them to the right
    const offsetIndex = useMemo(() => {
        if (allCandles.length < maxVisibleCandles) {
            return maxVisibleCandles - allCandles.length;
        }
        return 0;
    }, [allCandles.length, maxVisibleCandles]);

    // Only show last N candles that fit in the canvas
    const candles = useMemo(() => {
        if (allCandles.length <= maxVisibleCandles) return allCandles;
        return allCandles.slice(-maxVisibleCandles);
    }, [allCandles, maxVisibleCandles]);

    // Theme-based colors
    const themedColors = useMemo(() => {
        if (isAsianTheme) {
            return {
                ...DEFAULT_CONFIG.colors,
                bullish: '#ef4444',     // Red for up in Asian theme
                bearish: '#10b981',     // Green for down in Asian theme
                volumeBullish: 'rgba(239, 68, 68, 0.3)',
                volumeBearish: 'rgba(16, 185, 129, 0.3)',
            };
        }
        return DEFAULT_CONFIG.colors;
    }, [isAsianTheme]);

    const config: ChartConfig = {
        ...DEFAULT_CONFIG,
        dimensions: {
            ...DEFAULT_CONFIG.dimensions,
            width,
            height,
        },
        colors: themedColors,
        showMA,
        showVolume,
        showGrid,
    };

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { dimensions, colors, volumeHeight } = config;
        const dpr = window.devicePixelRatio || 1;

        // Set canvas size with DPR
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
        canvas.style.width = `${dimensions.width}px`;
        canvas.style.height = `${dimensions.height}px`;
        ctx.scale(dpr, dpr);

        // Clear
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        if (candles.length === 0) {
            ctx.fillStyle = colors.text;
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('等待數據...', dimensions.width / 2, dimensions.height / 2);
            return;
        }

        // Calculate scale
        const scale = calculateScale(candles, dimensions, currentPrice);

        // Draw grid
        if (config.showGrid) {
            drawGrid({
                ctx,
                dimensions,
                scale: {
                    priceMin: scale.priceMin,
                    priceMax: scale.priceMax,
                    priceRange: scale.priceRange,
                    chartHeight: scale.chartHeight,
                    chartWidth: scale.chartWidth,
                    candleWidth: scale.candleWidth,
                    candleGap: scale.candleGap,
                },
                colors,
                volumeHeight,
                candles,
                offsetIndex,
            });
        }

        // Draw volume
        if (config.showVolume) {
            drawVolume({
                ctx,
                candles,
                scale,
                padding: dimensions.padding,
                dimensions,
                colors,
                volumeHeight,
                offsetIndex,
            });
        }

        // Draw candles
        drawCandles({
            ctx,
            candles,
            scale: {
                priceMin: scale.priceMin,
                priceRange: scale.priceRange,
                candleWidth: scale.candleWidth,
                candleGap: scale.candleGap,
                chartHeight: scale.chartHeight,
            },
            padding: dimensions.padding,
            colors,
            volumeHeight,
            offsetIndex,
        });

        // Draw MA lines
        if (config.showMA && candles.length > 7) {
            const closes = candles.map(c => c.close);

            const ma7 = calculateMA(closes, 7);
            drawMA({
                ctx,
                maValues: ma7,
                scale: {
                    priceMin: scale.priceMin,
                    priceRange: scale.priceRange,
                    candleWidth: scale.candleWidth,
                    candleGap: scale.candleGap,
                    chartHeight: scale.chartHeight,
                },
                padding: dimensions.padding,
                color: colors.ma7,
                volumeHeight,
                offsetIndex,
            });

            if (candles.length > 25) {
                const ma25 = calculateMA(closes, 25);
                drawMA({
                    ctx,
                    maValues: ma25,
                    scale: {
                        priceMin: scale.priceMin,
                        priceRange: scale.priceRange,
                        candleWidth: scale.candleWidth,
                        candleGap: scale.candleGap,
                        chartHeight: scale.chartHeight,
                    },
                    padding: dimensions.padding,
                    color: colors.ma25,
                    volumeHeight,
                    offsetIndex,
                });
            }
        }

        // Draw current price line
        if (currentPrice > 0) {
            drawPriceLine({
                ctx,
                currentPrice,
                scale: {
                    priceMin: scale.priceMin,
                    priceRange: scale.priceRange,
                    chartWidth: scale.chartWidth,
                    chartHeight: scale.chartHeight,
                },
                padding: dimensions.padding,
                dimensions,
                colors,
                volumeHeight,
            });
        }

        // Draw crosshair
        if (crosshair.visible) {
            drawCrosshair({
                ctx,
                x: crosshair.x,
                y: crosshair.y,
                dimensions,
                colors,
            });
        }
    }, [candles, currentPrice, config, crosshair]);

    // Redraw on changes
    useEffect(() => {
        draw();
    }, [draw]);

    // Mouse move handler
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setCrosshair({
            x,
            y,
            visible: true,
            candleIndex: null,
        });

        // Calculate which candle we're hovering
        if (candles.length > 0) {
            const scale = calculateScale(candles, config.dimensions, currentPrice);
            const visualIndex = Math.floor((x - config.dimensions.padding.left) / (scale.candleWidth + scale.candleGap));
            const index = visualIndex - offsetIndex;

            if (index >= 0 && index < candles.length) {
                const candle = candles[index];
                const change = candle.close - candle.open;
                const changePercent = (change / candle.open) * 100;

                setTooltip({
                    visible: true,
                    x,
                    y,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                    volume: candle.volume,
                    timestamp: candle.timestamp,
                    change,
                    changePercent,
                });
            }
        }
    }, [candles, config.dimensions]);

    const handleMouseLeave = useCallback(() => {
        setCrosshair(prev => ({ ...prev, visible: false }));
        setTooltip(null);
    }, []);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="cursor-crosshair"
            />

            {/* Tooltip - Full Chinese labels with edge detection */}
            {tooltip && tooltip.visible && (
                <div
                    className="absolute pointer-events-none bg-zinc-900/95 border border-zinc-700 rounded px-3 py-2 text-xs font-mono z-10"
                    style={{
                        left: tooltip.x > width - 180 ? tooltip.x - 170 : tooltip.x + 15,
                        top: tooltip.y > height - 180 ? tooltip.y - 170 : tooltip.y + 15,
                    }}
                >
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span className="text-zinc-500">開盤</span>
                        <span className="text-white">${tooltip.open.toFixed(2)}</span>
                        <span className="text-zinc-500">最高</span>
                        <span className="text-white">${tooltip.high.toFixed(2)}</span>
                        <span className="text-zinc-500">最低</span>
                        <span className="text-white">${tooltip.low.toFixed(2)}</span>
                        <span className="text-zinc-500">收盤</span>
                        <span className="text-white">${tooltip.close.toFixed(2)}</span>
                        <span className="text-zinc-500">成交量</span>
                        <span className="text-yellow-500">{(tooltip.volume / 1000).toFixed(1)}K</span>
                    </div>
                    <div className={`mt-2 pt-2 border-t border-zinc-700 text-center ${isAsianTheme
                        ? (tooltip.change >= 0 ? 'text-rose-500' : 'text-emerald-500')
                        : (tooltip.change >= 0 ? 'text-emerald-500' : 'text-rose-500')
                        }`}>
                        漲跌: {tooltip.change >= 0 ? '+' : ''}{tooltip.change.toFixed(2)} ({tooltip.changePercent >= 0 ? '+' : ''}{tooltip.changePercent.toFixed(2)}%)
                    </div>
                </div>
            )}

            {/* MA Legend */}
            {showMA && candles.length > 7 && (
                <div className="absolute top-10 left-2 flex gap-3 text-[10px] font-mono pointer-events-none">
                    <span className="text-indigo-400">MA7</span>
                    {candles.length > 25 && <span className="text-amber-400">MA25</span>}
                </div>
            )}
        </div>
    );
}
