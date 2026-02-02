'use client';

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import {
    ChartColors,
    ChartScale,
    CrosshairData,
    TooltipData,
    ChartConfig,
    CandleDataExtended,
    DataPoint,
    ChartMarker,
    ChartLine,
    ChartZone,
    CandleAnnotation,
    DEFAULT_COLORS,
    DEFAULT_CONFIG,
    MARKER_STYLES,
    ColorTheme,
    getThemeColors,
} from './types';

// 固定 K 棒寬度 - 更寬的 K 棒讓標籤更清晰
const CANDLE_WIDTH = 14;
const CANDLE_GAP = 20;
// 每根 K 棒的最小空間（包含標籤）- 增加間距讓圖表更寬
const MIN_CANDLE_SPACE = 75;

// ===== K線圖元件 =====
interface TVCandlestickChartProps {
    candles: CandleDataExtended[];
    annotations?: CandleAnnotation[];
    title?: string;
    description?: string;
    config?: Partial<ChartConfig>;
    height?: number;
    showOHLCCards?: boolean; // 是否顯示 OHLC 數據卡片（用於組合圖時隱藏避免重複）
    showOHLCInfo?: boolean; // 是否顯示即時 OHLC 資訊面板（用於組合圖時隱藏避免重複）
    showWrapper?: boolean; // 是否顯示外框（用於嵌入其他元件時）
    syncHoverIndex?: number | null; // 同步 hover 索引（用於組合圖同步）
    onHoverIndexChange?: (index: number | null) => void; // hover 索引變化回調
    fixedWidth?: number; // 固定寬度（用於組合圖對齊）
    colorTheme?: ColorTheme; // 顏色主題（台股/美股）
    onColorThemeChange?: (theme: ColorTheme) => void; // 顏色主題變化回調
    showColorToggle?: boolean; // 是否顯示顏色切換按鈕
}

export function TVCandlestickChart({
    candles,
    annotations = [],
    title,
    description,
    config: userConfig,
    height = 240,
    showOHLCCards = true,
    showOHLCInfo = true,
    showWrapper = true,
    syncHoverIndex,
    onHoverIndexChange,
    fixedWidth,
    colorTheme: externalColorTheme,
    onColorThemeChange,
    showColorToggle = true,
}: TVCandlestickChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [crosshair, setCrosshair] = useState<CrosshairData>({
        x: 0,
        y: 0,
        visible: false,
        dataIndex: null,
        price: null,
    });
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    
    // 顏色主題狀態（內部或外部控制）
    const [internalColorTheme, setInternalColorTheme] = useState<ColorTheme>('taiwan');
    const colorTheme = externalColorTheme ?? internalColorTheme;
    
    const handleColorThemeChange = useCallback((theme: ColorTheme) => {
        if (onColorThemeChange) {
            onColorThemeChange(theme);
        } else {
            setInternalColorTheme(theme);
        }
    }, [onColorThemeChange]);

    const config = { ...DEFAULT_CONFIG, ...userConfig };
    
    // 根據主題獲取配色
    const colors = useMemo(() => getThemeColors(colorTheme), [colorTheme]);

    // 根據 K 棒數量和標籤需求動態計算寬度
    // 確保每根 K 棒有足夠空間顯示標籤
    const hasAnnotations = annotations.length > 0;
    const padding = { 
        top: hasAnnotations ? 40 : 30,  // 上方留更多空間給標註
        right: 60, 
        bottom: 40,  // 下方留空間給 X 軸標籤
        left: 20 
    };
    
    // 計算需要的寬度：每根 K 棒佔用固定空間，確保標籤不會重疊
    const candleSpacing = Math.max(CANDLE_WIDTH + CANDLE_GAP, MIN_CANDLE_SPACE);
    const calculatedWidth = candles.length * candleSpacing + padding.left + padding.right;
    const width = fixedWidth || Math.max(450, calculatedWidth);
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // 計算縮放比例
    const scale = useMemo<ChartScale>(() => {
        if (candles.length === 0) {
            return { minX: 0, maxX: 1, minY: 0, maxY: 100, xRange: 1, yRange: 100 };
        }
        const allPrices = candles.flatMap(c => [c.high, c.low]);
        const minY = Math.min(...allPrices) * 0.99;
        const maxY = Math.max(...allPrices) * 1.01;
        return {
            minX: 0,
            maxX: candles.length - 1,
            minY,
            maxY,
            xRange: candles.length - 1 || 1,
            yRange: maxY - minY || 1,
        };
    }, [candles]);

    const getX = useCallback((index: number) => {
        // 使用動態間距，確保標籤有足夠空間，並置中
        const effectiveSpacing = Math.max(CANDLE_WIDTH + CANDLE_GAP, MIN_CANDLE_SPACE);
        const totalCandlesWidth = candles.length * effectiveSpacing;
        const startX = padding.left + (chartWidth - totalCandlesWidth) / 2 + effectiveSpacing / 2;
        return startX + index * effectiveSpacing;
    }, [chartWidth, candles.length, padding.left]);

    const getY = useCallback((price: number) => {
        return padding.top + chartHeight - ((price - scale.minY) / scale.yRange) * chartHeight;
    }, [chartHeight, scale.minY, scale.yRange, padding.top]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        // 清除背景
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, width, height);

        if (candles.length === 0) {
            ctx.fillStyle = colors.text;
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('無數據', width / 2, height / 2);
            return;
        }

        // 繪製網格
        if (config.showGrid) {
            drawGrid(ctx, colors, padding, chartWidth, chartHeight, scale, width);
        }

        // 繪製 K 線
        drawCandles(ctx, candles, colors, padding, chartWidth, chartHeight, scale);

        // 繪製標註
        drawAnnotations(ctx, candles, annotations, colors, getX, getY);

        // 繪製十字準星
        if (config.showCrosshair && crosshair.visible) {
            drawCrosshair(ctx, crosshair, colors, padding, width, height, scale);
        }
    }, [candles, annotations, colors, config, crosshair, width, height, scale, getX, getY, chartWidth, chartHeight]);

    useEffect(() => {
        draw();
    }, [draw]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || candles.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 計算懸停的 K 線索引
        const candleWidth = chartWidth / candles.length;
        const index = Math.floor((x - padding.left) / candleWidth);
        const clampedIndex = Math.max(0, Math.min(candles.length - 1, index));
        
        // 計算價格
        const price = scale.maxY - ((y - padding.top) / chartHeight) * scale.yRange;

        setCrosshair({
            x,
            y,
            visible: true,
            dataIndex: clampedIndex,
            price,
        });

        // 通知父組件 hover 索引變化
        onHoverIndexChange?.(clampedIndex);

        if (clampedIndex >= 0 && clampedIndex < candles.length) {
            const candle = candles[clampedIndex];
            const change = candle.close - candle.open;
            const changePercent = (change / candle.open) * 100;

            setTooltip({
                visible: true,
                x,
                y,
                content: {
                    label: candle.label || '',
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                    change,
                    changePercent,
                },
            });
        }
    }, [candles, chartWidth, chartHeight, scale, padding, onHoverIndexChange]);

    const handleMouseLeave = useCallback(() => {
        setCrosshair(prev => ({ ...prev, visible: false }));
        setTooltip(null);
        onHoverIndexChange?.(null);
    }, [onHoverIndexChange]);

    // 觸控事件處理（手機版）
    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || candles.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        // 計算觸控的 K 線索引
        const candleWidthCalc = chartWidth / candles.length;
        const index = Math.floor((x - padding.left) / candleWidthCalc);
        const clampedIndex = Math.max(0, Math.min(candles.length - 1, index));
        
        // 計算價格
        const price = scale.maxY - ((y - padding.top) / chartHeight) * scale.yRange;

        setCrosshair({
            x,
            y,
            visible: true,
            dataIndex: clampedIndex,
            price,
        });

        // 通知父組件 hover 索引變化
        onHoverIndexChange?.(clampedIndex);

        if (clampedIndex >= 0 && clampedIndex < candles.length) {
            const candle = candles[clampedIndex];
            const change = candle.close - candle.open;
            const changePercent = (change / candle.open) * 100;

            setTooltip({
                visible: true,
                x,
                y,
                content: {
                    label: candle.label || '',
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                    change,
                    changePercent,
                },
            });
        }
    }, [candles, chartWidth, chartHeight, scale, padding, onHoverIndexChange]);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
        handleTouchStart(e);
    }, [handleTouchStart]);

    const handleTouchEnd = useCallback(() => {
        // 保持最後選中的狀態，不清除（方便手機用戶查看）
    }, []);

    // 當 syncHoverIndex 變化時，更新 crosshair（用於同步顯示）
    useEffect(() => {
        if (syncHoverIndex !== undefined && syncHoverIndex !== null && syncHoverIndex >= 0 && syncHoverIndex < candles.length) {
            const x = getX(syncHoverIndex);
            const candle = candles[syncHoverIndex];
            const y = getY((candle.high + candle.low) / 2);
            setCrosshair({
                x,
                y,
                visible: true,
                dataIndex: syncHoverIndex,
                price: candle.close,
            });
        } else if (syncHoverIndex === null) {
            setCrosshair(prev => ({ ...prev, visible: false }));
        }
    }, [syncHoverIndex, candles, getX, getY]);

    // 計算當前選中的 K 棒資訊（用於固定資訊面板）
    const selectedCandle = crosshair.dataIndex !== null && crosshair.dataIndex >= 0 && crosshair.dataIndex < candles.length 
        ? candles[crosshair.dataIndex] 
        : null;

    // 根據主題獲取漲跌顏色 class
    const getBullishColorClass = () => colorTheme === 'taiwan' ? 'text-rose-500' : 'text-emerald-400';
    const getBearishColorClass = () => colorTheme === 'taiwan' ? 'text-emerald-400' : 'text-rose-500';

    // 圖表內容（不含外框）
    const chartContent = (
        <>
            {/* 標題、顏色切換與即時資訊面板 */}
            {(title || showColorToggle || (showOHLCInfo && selectedCandle)) && (
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                        {title && (
                            <h4 className="text-white font-bold flex items-center gap-2">
                                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs sm:text-sm flex-shrink-0">📊</span>
                                <span className="text-xs sm:text-sm line-clamp-2">{title}</span>
                            </h4>
                        )}
                        
                        {/* 顏色主題切換按鈕 */}
                        {showColorToggle && (
                            <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-700/50 flex-shrink-0">
                                <button
                                    onClick={() => handleColorThemeChange('taiwan')}
                                    className={`px-2 sm:px-2.5 py-1 sm:py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
                                        colorTheme === 'taiwan' 
                                            ? 'bg-rose-500/20 text-rose-400' 
                                            : 'text-zinc-500 hover:text-zinc-300 active:text-zinc-200'
                                    }`}
                                    title="台股配色（紅漲綠跌）"
                                >
                                    台股
                                </button>
                                <button
                                    onClick={() => handleColorThemeChange('us')}
                                    className={`px-2 sm:px-2.5 py-1 sm:py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
                                        colorTheme === 'us' 
                                            ? 'bg-emerald-500/20 text-emerald-400' 
                                            : 'text-zinc-500 hover:text-zinc-300 active:text-zinc-200'
                                    }`}
                                    title="美股配色（綠漲紅跌）"
                                >
                                    美股
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {/* 固定位置的 OHLC 即時資訊（可選擇隱藏） */}
                    {showOHLCInfo && selectedCandle && (
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-mono bg-zinc-900/60 px-2 sm:px-3 py-1.5 rounded-lg border border-zinc-700/30">
                            {selectedCandle.label && (
                                <span className="text-zinc-400 font-semibold">{selectedCandle.label}</span>
                            )}
                            <span className="text-zinc-500">開<span className="text-zinc-300 ml-0.5 sm:ml-1">{selectedCandle.open}</span></span>
                            <span className="text-zinc-500">高<span className={`ml-0.5 sm:ml-1 ${getBullishColorClass()}`}>{selectedCandle.high}</span></span>
                            <span className="text-zinc-500">低<span className={`ml-0.5 sm:ml-1 ${getBearishColorClass()}`}>{selectedCandle.low}</span></span>
                            <span className="text-zinc-500">收<span className={`ml-0.5 sm:ml-1 font-semibold ${selectedCandle.close >= selectedCandle.open ? getBullishColorClass() : getBearishColorClass()}`}>{selectedCandle.close}</span></span>
                            <span className={`font-semibold ${selectedCandle.close >= selectedCandle.open ? getBullishColorClass() : getBearishColorClass()}`}>
                                {selectedCandle.close >= selectedCandle.open ? '▲' : '▼'}
                                {Math.abs(((selectedCandle.close - selectedCandle.open) / selectedCandle.open) * 100).toFixed(1)}%
                            </span>
                        </div>
                    )}
                </div>
            )}
            
            {/* 圖表容器 - 可橫向滾動，確保內容完整顯示 */}
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                <div className="flex justify-center min-w-fit">
                    <div ref={containerRef} className="relative bg-zinc-900/80 rounded-lg overflow-hidden border border-zinc-800">
                        <canvas
                            ref={canvasRef}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            className="cursor-crosshair touch-none"
                        />
                    </div>
                </div>
            </div>

            {/* OHLC 數據卡片 - 緊湊的橫向布局（可選擇隱藏） */}
            {showOHLCCards && (
                <div className="mt-3">
                    <div className="text-[10px] text-zinc-600 mb-1.5 flex items-center justify-between sm:hidden">
                        <span>OHLC 數據</span>
                        <span>← 左右滑動 →</span>
                    </div>
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent pb-1">
                        <div className="flex gap-1.5 sm:gap-2 min-w-fit sm:justify-center">
                            {candles.map((candle, i) => {
                                const isUp = candle.close >= candle.open;
                                const isSelected = crosshair.dataIndex === i;
                                return (
                                    <div 
                                        key={i} 
                                        className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-center min-w-[60px] sm:min-w-[70px] flex-shrink-0 transition-all cursor-pointer ${
                                            isSelected 
                                                ? 'bg-zinc-700/80 border border-zinc-500' 
                                                : 'bg-zinc-900/60 border border-zinc-800/50'
                                        }`}
                                        onClick={() => {
                                            setCrosshair(prev => ({
                                                ...prev,
                                                visible: true,
                                                dataIndex: i,
                                            }));
                                            onHoverIndexChange?.(i);
                                        }}
                                    >
                                        <div className={`text-[9px] sm:text-[10px] font-medium mb-1 sm:mb-1.5 pb-1 border-b ${isSelected ? 'text-white border-zinc-600' : 'text-zinc-400 border-zinc-700/30'}`}>
                                            {candle.label || `#${i + 1}`}
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-1 sm:gap-x-1.5 gap-y-0.5 text-[9px] sm:text-[10px]">
                                            <span className="text-zinc-500 text-right">O</span>
                                            <span className="text-zinc-300 font-mono text-left">{candle.open}</span>
                                            <span className="text-zinc-500 text-right">H</span>
                                            <span className={`${getBullishColorClass()} font-mono text-left`}>{candle.high}</span>
                                            <span className="text-zinc-500 text-right">L</span>
                                            <span className={`${getBearishColorClass()} font-mono text-left`}>{candle.low}</span>
                                            <span className="text-zinc-500 text-right">C</span>
                                            <span className={`font-mono font-semibold text-left ${isUp ? getBullishColorClass() : getBearishColorClass()}`}>{candle.close}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {description && (
                <p className="text-xs sm:text-sm text-zinc-400 border-t border-zinc-700/50 pt-3 mt-3 leading-relaxed">{description}</p>
            )}
        </>
    );

    // 根據 showWrapper 決定是否顯示外框
    if (!showWrapper) {
        return <div>{chartContent}</div>;
    }

    return (
        <div className="p-3 sm:p-4 bg-gradient-to-b from-zinc-800/60 to-zinc-900/60 border border-zinc-700/50 rounded-xl shadow-lg">
            {chartContent}
        </div>
    );
}

// 線圖數據點間距 - 增加間距讓圖表更寬
const POINT_GAP = 55;

// ===== 線圖元件 =====
interface TVLineChartProps {
    points: DataPoint[];
    markers?: ChartMarker[];
    lines?: ChartLine[];
    zones?: ChartZone[];
    title?: string;
    description?: string;
    config?: Partial<ChartConfig>;
    height?: number;
    showWrapper?: boolean; // 是否顯示外框（用於嵌入其他元件時）
    syncHoverIndex?: number | null; // 同步 hover 索引（用於組合圖同步）
    onHoverIndexChange?: (index: number | null) => void; // hover 索引變化回調
    fixedWidth?: number; // 固定寬度（用於組合圖對齊）
}

export function TVLineChart({
    points,
    markers = [],
    lines = [],
    zones = [],
    title,
    description,
    config: userConfig,
    height = 240,
    showWrapper = true,
    syncHoverIndex,
    onHoverIndexChange,
    fixedWidth,
}: TVLineChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [crosshair, setCrosshair] = useState<CrosshairData>({
        x: 0,
        y: 0,
        visible: false,
        dataIndex: null,
        price: null,
    });
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [hoveredMarker, setHoveredMarker] = useState<ChartMarker | null>(null);

    const config = { ...DEFAULT_CONFIG, ...userConfig };
    const colors = DEFAULT_COLORS;

    // 根據數據點數量計算寬度
    const padding = { top: 35, right: 60, bottom: 35, left: 15 };
    const calculatedWidth = Math.max(points.length - 1, 1) * POINT_GAP + padding.left + padding.right + 60;
    const width = fixedWidth || Math.max(500, calculatedWidth);
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // 計算縮放比例
    const scale = useMemo<ChartScale>(() => {
        const allYValues = [
            ...points.map(p => p.y),
            ...markers.map(m => m.y),
            ...(lines.filter(l => l.y !== undefined).map(l => l.y as number)),
            ...zones.flatMap(z => [z.yStart, z.yEnd]),
        ];
        const minY = Math.min(...allYValues) * 0.97;
        const maxY = Math.max(...allYValues) * 1.03;
        return {
            minX: 0,
            maxX: points.length - 1,
            minY,
            maxY,
            xRange: points.length - 1 || 1,
            yRange: maxY - minY || 1,
        };
    }, [points, markers, lines, zones]);

    const getX = useCallback((index: number) => {
        return padding.left + (index / scale.xRange) * chartWidth;
    }, [chartWidth, scale.xRange, padding.left]);

    const getY = useCallback((price: number) => {
        return padding.top + chartHeight - ((price - scale.minY) / scale.yRange) * chartHeight;
    }, [chartHeight, scale.minY, scale.yRange, padding.top]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        // 清除背景
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, width, height);

        if (points.length === 0) {
            ctx.fillStyle = colors.text;
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('無數據', width / 2, height / 2);
            return;
        }

        // 繪製區域填充
        drawZones(ctx, zones, colors, padding, chartWidth, chartHeight, scale, getY);

        // 繪製網格
        if (config.showGrid) {
            drawLineChartGrid(ctx, colors, padding, chartWidth, chartHeight, scale, width);
        }

        // 繪製水平參考線
        drawReferenceLines(ctx, lines, colors, padding, chartWidth, getX, getY);

        // 繪製主線條
        drawMainLine(ctx, points, colors, getX, getY);

        // 繪製數據點
        drawDataPoints(ctx, points, colors, getX, getY);

        // 繪製標記
        drawMarkers(ctx, markers, getX, getY, hoveredMarker);

        // 繪製十字準星
        if (config.showCrosshair && crosshair.visible) {
            drawLineCrosshair(ctx, crosshair, colors, padding, width, height, scale);
        }
    }, [points, markers, lines, zones, colors, config, crosshair, hoveredMarker, width, height, scale, getX, getY, chartWidth, chartHeight]);

    useEffect(() => {
        draw();
    }, [draw]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || points.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 計算最近的數據點
        const dataIndex = Math.round(((x - padding.left) / chartWidth) * scale.xRange);
        const clampedIndex = Math.max(0, Math.min(points.length - 1, dataIndex));
        
        // 計算價格
        const price = scale.maxY - ((y - padding.top) / chartHeight) * scale.yRange;

        setCrosshair({
            x,
            y,
            visible: true,
            dataIndex: clampedIndex,
            price,
        });

        // 通知父組件 hover 索引變化
        onHoverIndexChange?.(clampedIndex);

        // 檢查是否懸停在標記上
        let foundMarker: ChartMarker | null = null;
        for (const marker of markers) {
            const mx = getX(marker.x);
            const my = getY(marker.y);
            const distance = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
            if (distance < 15) {
                foundMarker = marker;
                break;
            }
        }
        setHoveredMarker(foundMarker);

        if (foundMarker) {
            setTooltip({
                visible: true,
                x,
                y,
                content: {
                    marker: foundMarker,
                    price: foundMarker.y,
                },
            });
        } else if (clampedIndex >= 0 && clampedIndex < points.length) {
            const point = points[clampedIndex];
            setTooltip({
                visible: true,
                x,
                y,
                content: {
                    label: point.label || '',
                    price: point.y,
                },
            });
        }
    }, [points, markers, chartWidth, chartHeight, scale, padding, getX, getY, onHoverIndexChange]);

    const handleMouseLeave = useCallback(() => {
        setCrosshair(prev => ({ ...prev, visible: false }));
        setTooltip(null);
        setHoveredMarker(null);
        onHoverIndexChange?.(null);
    }, [onHoverIndexChange]);

    // 觸控事件處理（手機版）
    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || points.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        // 計算最近的數據點
        const dataIndex = Math.round(((x - padding.left) / chartWidth) * scale.xRange);
        const clampedIndex = Math.max(0, Math.min(points.length - 1, dataIndex));
        
        // 計算價格
        const price = scale.maxY - ((y - padding.top) / chartHeight) * scale.yRange;

        setCrosshair({
            x,
            y,
            visible: true,
            dataIndex: clampedIndex,
            price,
        });

        // 通知父組件 hover 索引變化
        onHoverIndexChange?.(clampedIndex);

        if (clampedIndex >= 0 && clampedIndex < points.length) {
            const point = points[clampedIndex];
            setTooltip({
                visible: true,
                x,
                y,
                content: {
                    label: point.label || '',
                    price: point.y,
                },
            });
        }
    }, [points, chartWidth, chartHeight, scale, padding, onHoverIndexChange]);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
        handleTouchStart(e);
    }, [handleTouchStart]);

    const handleTouchEnd = useCallback(() => {
        // 保持最後選中的狀態，不清除（方便手機用戶查看）
    }, []);

    // 當 syncHoverIndex 變化時，更新 crosshair（用於同步顯示）
    useEffect(() => {
        if (syncHoverIndex !== undefined && syncHoverIndex !== null && syncHoverIndex >= 0 && syncHoverIndex < points.length) {
            const x = getX(syncHoverIndex);
            const point = points[syncHoverIndex];
            const y = getY(point.y);
            setCrosshair({
                x,
                y,
                visible: true,
                dataIndex: syncHoverIndex,
                price: point.y,
            });
        } else if (syncHoverIndex === null) {
            setCrosshair(prev => ({ ...prev, visible: false }));
        }
    }, [syncHoverIndex, points, getX, getY]);

    // 生成圖例
    const uniqueMarkerTypes = Array.from(new Set(markers.map(m => m.type)));
    const hasSupport = lines.some(l => l.type === 'support');
    const hasResistance = lines.some(l => l.type === 'resistance');

    // 圖表內容（不含外框）
    const chartContent = (
        <>
            {title && (
                <h4 className="text-white font-bold mb-3 sm:mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs sm:text-base flex-shrink-0">📈</span>
                    <span className="text-xs sm:text-base line-clamp-2">{title}</span>
                </h4>
            )}
            
            {/* 圖表容器 - 可橫向滾動 */}
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                <div className="flex justify-center min-w-fit">
                    <div className="relative bg-zinc-900/80 rounded-lg overflow-hidden border border-zinc-800">
                        <canvas
                            ref={canvasRef}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            className="cursor-crosshair touch-none"
                        />

                        {/* 工具提示 */}
                        {config.showTooltip && tooltip && tooltip.visible && (
                            <div
                                className="absolute pointer-events-none bg-zinc-900/98 border border-zinc-600 rounded-lg px-3 py-2 text-xs font-mono z-10 shadow-xl backdrop-blur-sm"
                                style={{
                                    left: tooltip.x > width - 140 ? tooltip.x - 130 : tooltip.x + 15,
                                    top: tooltip.y > height - 80 ? tooltip.y - 70 : tooltip.y + 15,
                                }}
                            >
                                {tooltip.content.marker ? (
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 pb-1 border-b border-zinc-700">
                                            <span 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: MARKER_STYLES[tooltip.content.marker.type].color }}
                                            />
                                            <span className="font-bold" style={{ color: MARKER_STYLES[tooltip.content.marker.type].color }}>
                                                {MARKER_STYLES[tooltip.content.marker.type].label}
                                            </span>
                                        </div>
                                        <div className="text-zinc-300 my-1">{tooltip.content.marker.label}</div>
                                        <div className="text-zinc-400">價格: <span className="text-white">${tooltip.content.price?.toFixed(2)}</span></div>
                                    </div>
                                ) : (
                                    <div>
                                        {tooltip.content.label && (
                                            <div className="text-zinc-400 mb-1">{tooltip.content.label}</div>
                                        )}
                                        <div className="text-white font-bold">價格: ${tooltip.content.price?.toFixed(2)}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 圖例 */}
            {(uniqueMarkerTypes.length > 0 || hasSupport || hasResistance) && (
                <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-[10px] sm:text-xs">
                    {uniqueMarkerTypes.map(type => (
                        <div key={type} className="flex items-center gap-1 sm:gap-1.5 bg-zinc-900/50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">
                            <span 
                                className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full" 
                                style={{ backgroundColor: MARKER_STYLES[type].color }}
                            />
                            <span className="text-zinc-400">{MARKER_STYLES[type].label}</span>
                        </div>
                    ))}
                    {hasSupport && (
                        <div className="flex items-center gap-1 sm:gap-1.5 bg-zinc-900/50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">
                            <span className="w-3 sm:w-4 h-0.5 bg-emerald-500 rounded" />
                            <span className="text-zinc-400">支撐線</span>
                        </div>
                    )}
                    {hasResistance && (
                        <div className="flex items-center gap-1 sm:gap-1.5 bg-zinc-900/50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">
                            <span className="w-3 sm:w-4 h-0.5 bg-rose-500 rounded" />
                            <span className="text-zinc-400">壓力線</span>
                        </div>
                    )}
                </div>
            )}

            {description && (
                <p className="text-xs sm:text-sm text-zinc-400 border-t border-zinc-700/50 pt-3 mt-3 sm:mt-4 leading-relaxed">{description}</p>
            )}
        </>
    );

    // 根據 showWrapper 決定是否顯示外框
    if (!showWrapper) {
        return <div>{chartContent}</div>;
    }

    return (
        <div className="p-3 sm:p-4 bg-gradient-to-b from-zinc-800/60 to-zinc-900/60 border border-zinc-700/50 rounded-xl shadow-lg">
            {chartContent}
        </div>
    );
}

// ===== 繪製函數 =====

function drawGrid(
    ctx: CanvasRenderingContext2D,
    colors: ChartColors,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    scale: ChartScale,
    totalWidth: number
) {
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // 水平網格線 (5條)
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
        const y = padding.top + (i / ySteps) * chartHeight;
        const price = scale.maxY - (i / ySteps) * scale.yRange;

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        // 價格標籤
        ctx.setLineDash([]);
        ctx.fillStyle = colors.text;
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`$${price.toFixed(1)}`, padding.left + chartWidth + 5, y + 3);
        ctx.setLineDash([4, 4]);
    }

    // 垂直網格線 (6條)
    const xSteps = 6;
    for (let i = 0; i <= xSteps; i++) {
        const x = padding.left + (i / xSteps) * chartWidth;

        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
    }

    ctx.setLineDash([]);
}

function drawCandles(
    ctx: CanvasRenderingContext2D,
    candles: CandleDataExtended[],
    colors: ChartColors,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    scale: ChartScale
) {
    // 使用動態間距，確保標籤有足夠空間
    const effectiveSpacing = Math.max(CANDLE_WIDTH + CANDLE_GAP, MIN_CANDLE_SPACE);
    const totalCandlesWidth = candles.length * effectiveSpacing;
    const startX = padding.left + (chartWidth - totalCandlesWidth) / 2 + effectiveSpacing / 2;

    candles.forEach((candle, i) => {
        const x = startX + i * effectiveSpacing;
        const isUp = candle.close >= candle.open;
        const color = isUp ? colors.bullish : colors.bearish;

        const getY = (price: number) => 
            padding.top + chartHeight - ((price - scale.minY) / scale.yRange) * chartHeight;

        const bodyTop = getY(Math.max(candle.open, candle.close));
        const bodyBottom = getY(Math.min(candle.open, candle.close));
        const bodyHeight = Math.max(bodyBottom - bodyTop, 2);

        // 上影線
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, getY(candle.high));
        ctx.lineTo(x, bodyTop);
        ctx.stroke();

        // 下影線
        ctx.beginPath();
        ctx.moveTo(x, bodyTop + bodyHeight);
        ctx.lineTo(x, getY(candle.low));
        ctx.stroke();

        // K線實體 - 使用固定寬度
        ctx.fillStyle = color;
        ctx.fillRect(x - CANDLE_WIDTH / 2, bodyTop, CANDLE_WIDTH, bodyHeight);

        // K線邊框
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - CANDLE_WIDTH / 2, bodyTop, CANDLE_WIDTH, bodyHeight);

        // X軸標籤 - 在 K 棒下方顯示
        if (candle.label) {
            ctx.fillStyle = colors.text;
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(candle.label, x, padding.top + chartHeight + 20);
        }
    });
}

function drawAnnotations(
    ctx: CanvasRenderingContext2D,
    candles: CandleDataExtended[],
    annotations: CandleAnnotation[],
    colors: ChartColors,
    getX: (index: number) => number,
    getY: (price: number) => number
) {
    ctx.font = 'bold 11px sans-serif';
    
    annotations.forEach(ann => {
        if (ann.index >= 0 && ann.index < candles.length) {
            const candle = candles[ann.index];
            const x = getX(ann.index);
            const isTop = ann.position === 'top';
            
            // 防禦性處理：確保文字不為 undefined
            const displayText = ann.text || '';
            if (!displayText) return; // 如果沒有文字則跳過此標註
            
            // 計算文字寬度以繪製背景
            const textMetrics = ctx.measureText(displayText);
            const textWidth = textMetrics.width;
            const paddingX = 6;
            const paddingY = 3;
            const boxWidth = textWidth + paddingX * 2;
            const boxHeight = 16;
            
            // 計算 Y 位置，確保有足夠空間
            const baseY = isTop 
                ? getY(candle.high) - 20 
                : getY(candle.low) + 25;
            
            // 繪製標註背景框
            const boxX = x - boxWidth / 2;
            const boxY = baseY - boxHeight / 2 - 2;
            
            // 背景框
            ctx.fillStyle = 'rgba(251, 191, 36, 0.15)';
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
            ctx.fill();
            
            // 邊框
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
            ctx.stroke();
            
            // 連接線（從標註框到 K 線）
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            if (isTop) {
                ctx.moveTo(x, boxY + boxHeight);
                ctx.lineTo(x, getY(candle.high) - 3);
            } else {
                ctx.moveTo(x, boxY);
                ctx.lineTo(x, getY(candle.low) + 3);
            }
            ctx.stroke();
            ctx.setLineDash([]);
            
            // 標註文字
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(displayText, x, baseY - 2);
            ctx.textBaseline = 'alphabetic';
        }
    });
}

function drawCrosshair(
    ctx: CanvasRenderingContext2D,
    crosshair: CrosshairData,
    colors: ChartColors,
    padding: { top: number; right: number; bottom: number; left: number },
    width: number,
    height: number,
    scale: ChartScale
) {
    ctx.strokeStyle = colors.crosshair;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // 垂直線
    ctx.beginPath();
    ctx.moveTo(crosshair.x, padding.top);
    ctx.lineTo(crosshair.x, height - padding.bottom);
    ctx.stroke();

    // 水平線
    ctx.beginPath();
    ctx.moveTo(padding.left, crosshair.y);
    ctx.lineTo(width - padding.right, crosshair.y);
    ctx.stroke();

    ctx.setLineDash([]);

    // 價格標籤背景
    if (crosshair.price !== null) {
        const labelWidth = 55;
        const labelHeight = 16;
        ctx.fillStyle = colors.crosshair;
        ctx.fillRect(width - padding.right, crosshair.y - labelHeight / 2, labelWidth, labelHeight);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`$${crosshair.price.toFixed(1)}`, width - padding.right + 4, crosshair.y + 4);
    }
}

function drawLineChartGrid(
    ctx: CanvasRenderingContext2D,
    colors: ChartColors,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    scale: ChartScale,
    totalWidth: number
) {
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // 水平網格線 (5條)
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
        const y = padding.top + (i / ySteps) * chartHeight;
        const price = scale.maxY - (i / ySteps) * scale.yRange;

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        // 價格標籤
        ctx.setLineDash([]);
        ctx.fillStyle = colors.text;
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`$${price.toFixed(0)}`, padding.left + chartWidth + 5, y + 3);
        ctx.setLineDash([4, 4]);
    }

    ctx.setLineDash([]);
}

function drawZones(
    ctx: CanvasRenderingContext2D,
    zones: ChartZone[],
    colors: ChartColors,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    chartHeight: number,
    scale: ChartScale,
    getY: (price: number) => number
) {
    zones.forEach(zone => {
        const y1 = getY(Math.max(zone.yStart, zone.yEnd));
        const y2 = getY(Math.min(zone.yStart, zone.yEnd));
        const height = y2 - y1;

        ctx.fillStyle = zone.type === 'profit' ? colors.profitZone
            : zone.type === 'loss' ? colors.lossZone
            : colors.neutralZone;
        
        ctx.fillRect(padding.left, y1, chartWidth, height);
    });
}

function drawReferenceLines(
    ctx: CanvasRenderingContext2D,
    lines: ChartLine[],
    colors: ChartColors,
    padding: { top: number; right: number; bottom: number; left: number },
    chartWidth: number,
    getX: (index: number) => number,
    getY: (price: number) => number
) {
    lines.forEach(line => {
        if (line.y !== undefined) {
            // 水平線
            const y = getY(line.y);
            const color = line.type === 'support' ? colors.support
                : line.type === 'resistance' ? colors.resistance
                : line.color || '#fbbf24';

            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash(line.type === 'ma' ? [] : [6, 4]);

            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();

            // 標籤
            if (line.label) {
                ctx.setLineDash([]);
                ctx.fillStyle = color;
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(line.label, padding.left + chartWidth + 5, y + 4);
            }

            ctx.setLineDash([]);
        } else if (line.points && line.points.length >= 2) {
            // 趨勢線
            const color = line.color || '#fbbf24';
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 4]);

            ctx.beginPath();
            ctx.moveTo(getX(line.points[0].x), getY(line.points[0].y));
            for (let i = 1; i < line.points.length; i++) {
                ctx.lineTo(getX(line.points[i].x), getY(line.points[i].y));
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
    });
}

function drawMainLine(
    ctx: CanvasRenderingContext2D,
    points: DataPoint[],
    colors: ChartColors,
    getX: (index: number) => number,
    getY: (price: number) => number
) {
    if (points.length < 2) return;

    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(points[0].y));
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(getX(i), getY(points[i].y));
    }
    ctx.stroke();
}

function drawDataPoints(
    ctx: CanvasRenderingContext2D,
    points: DataPoint[],
    colors: ChartColors,
    getX: (index: number) => number,
    getY: (price: number) => number
) {
    points.forEach((point, i) => {
        const x = getX(i);
        const y = getY(point.y);

        // 數據點
        ctx.fillStyle = colors.line;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawMarkers(
    ctx: CanvasRenderingContext2D,
    markers: ChartMarker[],
    getX: (index: number) => number,
    getY: (price: number) => number,
    hoveredMarker: ChartMarker | null
) {
    markers.forEach(marker => {
        const x = getX(marker.x);
        const y = getY(marker.y);
        const style = MARKER_STYLES[marker.type];
        const isHovered = hoveredMarker === marker;
        const isAbove = marker.type === 'sell' || marker.type === 'takeProfit';

        // 連接線
        ctx.strokeStyle = style.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, isAbove ? y - 30 : y + 30);
        ctx.stroke();
        ctx.setLineDash([]);

        // 標記圓點
        ctx.fillStyle = style.color;
        ctx.beginPath();
        ctx.arc(x, y, isHovered ? 8 : 6, 0, Math.PI * 2);
        ctx.fill();

        // 白色內圈
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(x, y, isHovered ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();

        // 標記文字
        if (marker.label) {
            ctx.fillStyle = style.color;
            ctx.font = `${isHovered ? 'bold ' : ''}10px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(marker.label, x, isAbove ? y - 35 : y + 42);
        }
    });
}

function drawLineCrosshair(
    ctx: CanvasRenderingContext2D,
    crosshair: CrosshairData,
    colors: ChartColors,
    padding: { top: number; right: number; bottom: number; left: number },
    width: number,
    height: number,
    scale: ChartScale
) {
    ctx.strokeStyle = colors.crosshair;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // 垂直線
    ctx.beginPath();
    ctx.moveTo(crosshair.x, padding.top);
    ctx.lineTo(crosshair.x, height - padding.bottom);
    ctx.stroke();

    // 水平線
    ctx.beginPath();
    ctx.moveTo(padding.left, crosshair.y);
    ctx.lineTo(width - padding.right, crosshair.y);
    ctx.stroke();

    ctx.setLineDash([]);

    // 價格標籤背景
    if (crosshair.price !== null) {
        const labelWidth = 50;
        const labelHeight = 16;
        ctx.fillStyle = colors.crosshair;
        ctx.fillRect(width - padding.right + 2, crosshair.y - labelHeight / 2, labelWidth, labelHeight);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`$${crosshair.price.toFixed(0)}`, width - padding.right + 6, crosshair.y + 4);
    }
}
