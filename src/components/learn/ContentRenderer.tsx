'use client';

import { useState, useCallback } from 'react';
import { ContentBlock, CandleData, CandleAnnotation, TradeScenario, IndicatorValue, QuizOption, CalculationStep, LineChartData, LineChartPoint, LineChartMarker, LineChartLine, LineChartZone } from '@/data/learn/types';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, XCircle, CircleDot, Target, ShieldAlert, Info } from 'lucide-react';
import { TVCandlestickChart, TVLineChart, CandleDataExtended, DataPoint, ChartMarker, ChartLine, ChartZone, ColorTheme } from './charts';

interface ContentRendererProps {
    content: ContentBlock[];
}

// 解析文本中的 **粗體** 標記
function parseText(text: string, highlights?: { text: string; color: string }[]): React.ReactNode {
    const result: React.ReactNode = text;
    
    // 處理 **粗體** 標記
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = boldRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        const boldText = match[1];
        const highlight = highlights?.find(h => h.text === boldText);
        const colorClass = highlight ? getTextColorClass(highlight.color) : 'text-white';
        parts.push(
            <strong key={match.index} className={colorClass}>
                {boldText}
            </strong>
        );
        lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : result;
}

function getTextColorClass(color: string): string {
    const colorMap: Record<string, string> = {
        white: 'text-white',
        indigo: 'text-indigo-400',
        emerald: 'text-emerald-400',
        amber: 'text-amber-400',
        rose: 'text-rose-400',
        cyan: 'text-cyan-400',
        purple: 'text-purple-400',
        zinc: 'text-zinc-400',
    };
    return colorMap[color] || 'text-white';
}

function getBgColorClass(color: string): string {
    const colorMap: Record<string, string> = {
        indigo: 'bg-indigo-500/10 border-indigo-500/30',
        emerald: 'bg-emerald-500/10 border-emerald-500/30',
        amber: 'bg-amber-500/10 border-amber-500/30',
        rose: 'bg-rose-500/10 border-rose-500/30',
        cyan: 'bg-cyan-500/10 border-cyan-500/30',
        purple: 'bg-purple-500/10 border-purple-500/30',
        zinc: 'bg-zinc-800 border-zinc-700',
    };
    return colorMap[color] || 'bg-zinc-800 border-zinc-700';
}

function getTitleColorClass(color: string): string {
    const colorMap: Record<string, string> = {
        indigo: 'text-indigo-400',
        emerald: 'text-emerald-400',
        amber: 'text-amber-400',
        rose: 'text-rose-400',
        cyan: 'text-cyan-400',
        purple: 'text-purple-400',
        zinc: 'text-white',
        white: 'text-white',
    };
    return colorMap[color] || 'text-white';
}

export function ContentRenderer({ content }: ContentRendererProps) {
    return (
        <div className="space-y-4">
            {content.map((block, index) => (
                <ContentBlockRenderer key={index} block={block} />
            ))}
        </div>
    );
}

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
    switch (block.type) {
        case 'paragraph':
            return (
                <p>
                    {parseText(block.text, block.highlights)}
                </p>
            );

        case 'heading':
            const HeadingTag = block.level === 3 ? 'h3' : 'h4';
            return (
                <HeadingTag className="text-white font-bold">
                    {block.text}
                </HeadingTag>
            );

        case 'list':
            const ListTag = block.ordered ? 'ol' : 'ul';
            return (
                <ListTag className={`${block.ordered ? 'list-decimal' : 'list-disc'} list-inside space-y-1 text-sm`}>
                    {block.items.map((item, i) => (
                        <li key={i} className={block.color ? getTextColorClass(block.color) : ''}>
                            {item}
                        </li>
                    ))}
                </ListTag>
            );

        case 'highlight-box':
            return (
                <div className={`p-4 border rounded-lg ${getBgColorClass(block.color)}`}>
                    <h4 className={`font-bold mb-2 ${getTitleColorClass(block.color)}`}>
                        {block.title}
                    </h4>
                    {block.text && <p className="text-sm">{block.text}</p>}
                    {block.items && (
                        <ul className={`${block.text ? 'mt-2 ' : ''}list-disc list-inside space-y-1 text-sm text-zinc-400`}>
                            {block.items.map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    )}
                </div>
            );

        case 'comparison-grid':
            return (
                <div className="grid grid-cols-2 gap-4">
                    {block.items.map((item, i) => (
                        <div 
                            key={i} 
                            className={`p-4 border rounded-lg ${getBgColorClass(item.color)} ${item.icon ? 'text-center' : ''}`}
                        >
                            {item.icon && <div className="text-4xl mb-2">{item.icon}</div>}
                            <h4 className={`font-bold ${item.icon ? '' : 'mb-2'} ${getTitleColorClass(item.color)}`}>
                                {item.title}
                            </h4>
                            <p className={`text-${item.icon ? 'xs' : 'sm'} text-zinc-400`}>{item.description}</p>
                            {item.subtext && (
                                <p className="text-xs text-zinc-500 mt-2">{item.subtext}</p>
                            )}
                        </div>
                    ))}
                </div>
            );

        case 'info-card':
            return (
                <div className="p-3 bg-zinc-800 rounded-lg flex items-center gap-4">
                    {block.icon && <div className="text-3xl">{block.icon}</div>}
                    <div>
                        <h4 className="text-white font-bold">{block.title}</h4>
                        <p className="text-xs text-zinc-400">{block.description}</p>
                        {block.subtext && (
                            <p className="text-xs text-zinc-500 mt-1">{block.subtext}</p>
                        )}
                    </div>
                </div>
            );

        case 'table':
            return (
                <div className="p-4 bg-zinc-800 rounded-lg">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-700">
                                {block.headers.map((header, i) => (
                                    <th 
                                        key={i} 
                                        className={`py-2 text-zinc-400 ${i === 0 ? 'text-left' : 'text-right'}`}
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {block.rows.map((row, i) => (
                                <tr key={i} className={i < block.rows.length - 1 ? 'border-b border-zinc-700/50' : ''}>
                                    {row.map((cell, j) => (
                                        <td 
                                            key={j} 
                                            className={`py-2 ${j === 0 ? '' : 'text-right text-amber-400'}`}
                                        >
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );

        case 'code-block':
            return (
                <div className="p-4 bg-zinc-800 rounded-lg font-mono text-sm">
                    {block.title && (
                        <div className="text-zinc-400 mb-2">{block.title}</div>
                    )}
                    <div className="text-white space-y-1">
                        {block.lines.map((line, i) => (
                            <div key={i} className={line.color ? getTextColorClass(line.color) : ''}>
                                {line.label && (
                                    <span className={getTextColorClass(line.color || 'white')}>
                                        {line.label}
                                    </span>
                                )}
                                {line.value}
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'key-value-list':
            return (
                <div className="p-4 bg-zinc-800 rounded-lg">
                    {block.title && (
                        <div className="text-zinc-400 mb-2">{block.title}</div>
                    )}
                    <div className="space-y-1 text-sm">
                        {block.items.map((item, i) => (
                            <div key={i}>
                                <span className={item.keyColor ? getTextColorClass(item.keyColor) : 'text-zinc-400'}>
                                    {item.key}
                                </span>
                                ：{item.value}
                            </div>
                        ))}
                    </div>
                </div>
            );

        case 'gradient-bar':
            return (
                <div className="p-4 bg-zinc-800 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-emerald-400">{block.leftLabel}</span>
                        {block.middleLabel && <span className="text-zinc-500">{block.middleLabel}</span>}
                        <span className="text-rose-400">{block.rightLabel}</span>
                    </div>
                    <div className="h-4 bg-gradient-to-r from-emerald-500 via-zinc-500 to-rose-500 rounded-full" />
                    {block.markers && (
                        <div className="flex justify-between text-xs text-zinc-500 mt-1">
                            {block.markers.map((marker, i) => (
                                <span key={i}>{marker}</span>
                            ))}
                        </div>
                    )}
                </div>
            );

        case 'grid':
            return (
                <div className={`grid grid-cols-${block.columns} gap-4`}>
                    {block.items.map((item, i) => (
                        <div 
                            key={i}
                            className={`p-4 border rounded-lg ${getBgColorClass(item.color)} ${item.icon ? 'text-center' : ''}`}
                        >
                            {item.icon && <div className="text-4xl mb-2">{item.icon}</div>}
                            <h4 className={`font-bold ${getTitleColorClass(item.color)}`}>
                                {item.title}
                            </h4>
                            {item.description && (
                                <p className="text-xs text-zinc-400">{item.description}</p>
                            )}
                            {item.subtext && (
                                <p className="text-xs text-zinc-500 mt-2">{item.subtext}</p>
                            )}
                        </div>
                    ))}
                </div>
            );

        // ===== 範例區塊 =====
        case 'candlestick-example':
            // 轉換為 TradingView 風格圖表
            const tvCandles: CandleDataExtended[] = block.candles.map(c => ({
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                label: c.label || '',
            }));
            // 轉換標註格式（處理 label vs text 和 position 值的差異）
            const tvAnnotations = (block.annotations || []).map((a: { index: number; text?: string; label?: string; position: string }) => ({
                index: a.index,
                text: a.text || a.label || '',
                position: (a.position === 'below' ? 'bottom' : a.position === 'above' ? 'top' : a.position) as 'top' | 'bottom',
            }));
            return (
                <div>
                    {/* 手機版提示 */}
                    <div className="text-[10px] text-zinc-600 mb-2 sm:hidden text-center">
                        ← 左右滑動查看完整圖表 →
                    </div>
                    <TVCandlestickChart 
                        candles={tvCandles} 
                        annotations={tvAnnotations} 
                        title={block.title} 
                        description={block.description}
                        height={220}
                    />
                </div>
            );

        case 'trade-example':
            return <TradeExample title={block.title} scenario={block.scenario} explanation={block.explanation} />;

        case 'indicator-example':
            return <IndicatorExample title={block.title} indicator={block.indicator} values={block.values} interpretation={block.interpretation} />;

        case 'quiz-example':
            return <QuizExample question={block.question} options={block.options} explanation={block.explanation} />;

        case 'calculation-example':
            return <CalculationExample title={block.title} steps={block.steps} result={block.result} />;

        case 'line-chart-example':
            // 轉換為 TradingView 風格線圖
            const tvPoints: DataPoint[] = block.data.points.map(p => ({
                x: p.x,
                y: p.y,
                label: p.label || '',
            }));
            const tvMarkers: ChartMarker[] = (block.data.markers || []).map(m => ({
                x: m.x,
                y: m.y,
                type: m.type,
                label: m.label || '',
            }));
            const tvLines: ChartLine[] = (block.data.lines || []).map(l => ({
                type: l.type,
                y: l.y,
                points: l.points,
                label: l.label || '',
                color: l.color,
            }));
            const tvZones: ChartZone[] = (block.data.zones || []).map(z => ({
                type: z.type,
                yStart: z.yStart,
                yEnd: z.yEnd,
                label: z.label || '',
            }));
            return (
                <div>
                    {/* 手機版提示 */}
                    <div className="text-[10px] text-zinc-600 mb-2 sm:hidden text-center">
                        ← 左右滑動查看完整圖表 →
                    </div>
                    <TVLineChart 
                        points={tvPoints}
                        markers={tvMarkers}
                        lines={tvLines}
                        zones={tvZones}
                        title={block.title} 
                        description={block.description}
                    />
                </div>
            );

        case 'combo-chart-example':
            // 組合圖：同時顯示 K 線圖和線圖
            const comboCandles: CandleDataExtended[] = block.candles.map(c => ({
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                label: c.label || '',
            }));
            // 轉換標註格式（處理 label vs text 和 position 值的差異）
            const comboAnnotations = (block.annotations || []).map((a: { index: number; text?: string; label?: string; position: string }) => ({
                index: a.index,
                text: a.text || a.label || '',
                position: (a.position === 'below' ? 'bottom' : a.position === 'above' ? 'top' : a.position) as 'top' | 'bottom',
            }));
            
            // 如果有線圖數據，同時顯示
            const comboLinePoints: DataPoint[] | undefined = block.lineData?.points.map(p => ({
                x: p.x,
                y: p.y,
                label: p.label || '',
            }));
            const comboLineMarkers: ChartMarker[] = (block.lineData?.markers || []).map(m => ({
                x: m.x,
                y: m.y,
                type: m.type,
                label: m.label || '',
            }));
            const comboLineLines: ChartLine[] = (block.lineData?.lines || []).map(l => ({
                type: l.type,
                y: l.y,
                points: l.points,
                label: l.label || '',
                color: l.color,
            }));
            const comboLineZones: ChartZone[] = (block.lineData?.zones || []).map(z => ({
                type: z.type,
                yStart: z.yStart,
                yEnd: z.yEnd,
                label: z.label || '',
            }));
            
            return (
                <ComboChartExample
                    title={block.title}
                    candles={comboCandles}
                    annotations={comboAnnotations}
                    lineData={block.lineData ? {
                        points: comboLinePoints!,
                        markers: comboLineMarkers,
                        lines: comboLineLines,
                        zones: comboLineZones,
                    } : undefined}
                    description={block.description}
                />
            );

        default:
            return null;
    }
}

// ===== K線範例組件 =====
function CandlestickExample({ 
    title, 
    candles, 
    description, 
    annotations 
}: { 
    title: string; 
    candles: CandleData[]; 
    description?: string;
    annotations?: { index: number; text: string; position: 'top' | 'bottom' }[];
}) {
    const maxPrice = Math.max(...candles.flatMap(c => [c.high]));
    const minPrice = Math.min(...candles.flatMap(c => [c.low]));
    const priceRange = maxPrice - minPrice;
    const chartHeight = 120;

    const getY = (price: number) => {
        return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    };

    return (
        <div className="p-3 sm:p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-sm sm:text-base">
                <span className="text-amber-400">📊</span> {title}
            </h4>
            
            {/* K線圖 - 手機版可橫向滾動 */}
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                <div className="relative bg-zinc-900 rounded-lg p-3 sm:p-4 mb-3 min-w-fit">
                    <svg width={candles.length * 60 + 20} height={chartHeight + 40} viewBox={`0 0 ${candles.length * 60 + 20} ${chartHeight + 40}`}>
                    {candles.map((candle, i) => {
                        const x = i * 60 + 30;
                        const isUp = candle.close >= candle.open;
                        const color = isUp ? '#10b981' : '#f43f5e';
                        const bodyTop = getY(Math.max(candle.open, candle.close));
                        const bodyBottom = getY(Math.min(candle.open, candle.close));
                        const bodyHeight = Math.max(bodyBottom - bodyTop, 2);

                        return (
                            <g key={i}>
                                {/* 上影線 */}
                                <line
                                    x1={x}
                                    y1={getY(candle.high)}
                                    x2={x}
                                    y2={bodyTop}
                                    stroke={color}
                                    strokeWidth="2"
                                />
                                {/* 下影線 */}
                                <line
                                    x1={x}
                                    y1={bodyTop + bodyHeight}
                                    x2={x}
                                    y2={getY(candle.low)}
                                    stroke={color}
                                    strokeWidth="2"
                                />
                                {/* 實體 */}
                                <rect
                                    x={x - 12}
                                    y={bodyTop}
                                    width="24"
                                    height={bodyHeight}
                                    fill={isUp ? color : color}
                                    stroke={color}
                                    strokeWidth="1"
                                />
                                {/* 標籤 */}
                                {candle.label && (
                                    <text
                                        x={x}
                                        y={chartHeight + 20}
                                        textAnchor="middle"
                                        fill="#71717a"
                                        fontSize="11"
                                    >
                                        {candle.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                    {/* 標註 */}
                    {annotations?.map((ann, i) => {
                        const x = ann.index * 60 + 30;
                        const candle = candles[ann.index];
                        const y = ann.position === 'top' ? getY(candle.high) - 15 : getY(candle.low) + 25;
                        return (
                            <text
                                key={i}
                                x={x}
                                y={y}
                                textAnchor="middle"
                                fill="#fbbf24"
                                fontSize="10"
                                fontWeight="bold"
                            >
                                {ann.text}
                            </text>
                        );
                    })}
                    </svg>
                </div>
            </div>

            {/* OHLC 數據 - 手機版可橫向滾動 */}
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent mb-3">
                <div className="flex sm:grid sm:grid-cols-4 gap-2 text-[10px] sm:text-xs min-w-fit">
                    {candles.map((candle, i) => (
                        <div key={i} className="bg-zinc-900 p-2 rounded text-center min-w-[70px] flex-shrink-0">
                            <div className="text-zinc-500 mb-1">{candle.label || `#${i + 1}`}</div>
                            <div className="space-y-0.5">
                                <div>開: <span className="text-zinc-300">{candle.open}</span></div>
                                <div>高: <span className="text-emerald-400">{candle.high}</span></div>
                                <div>低: <span className="text-rose-400">{candle.low}</span></div>
                                <div>收: <span className={candle.close >= candle.open ? 'text-emerald-400' : 'text-rose-400'}>{candle.close}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {description && (
                <p className="text-xs sm:text-sm text-zinc-400 border-t border-zinc-700 pt-3">{description}</p>
            )}
        </div>
    );
}

// ===== 交易範例組件 =====
function TradeExample({ 
    title, 
    scenario, 
    explanation 
}: { 
    title: string; 
    scenario: TradeScenario; 
    explanation?: string;
}) {
    const isProfit = scenario.result ? scenario.result.profit > 0 : false;
    const totalCost = scenario.entryPrice * scenario.quantity;
    const totalSale = scenario.exitPrice ? scenario.exitPrice * scenario.quantity : 0;
    const fees = scenario.fees || 0;

    return (
        <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                <span className={scenario.action === 'buy' ? 'text-emerald-400' : 'text-rose-400'}>
                    {scenario.action === 'buy' ? '📈' : '📉'}
                </span>
                {title}
            </h4>

            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* 進場資訊 */}
                <div className="bg-zinc-900 p-3 rounded-lg">
                    <div className="text-xs text-zinc-500 mb-2">進場</div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-zinc-400">動作</span>
                            <span className={scenario.action === 'buy' ? 'text-emerald-400' : 'text-rose-400'}>
                                {scenario.action === 'buy' ? '買入' : '賣出'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-400">價格</span>
                            <span className="text-white">${scenario.entryPrice}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-400">數量</span>
                            <span className="text-white">{scenario.quantity} 股</span>
                        </div>
                        <div className="flex justify-between border-t border-zinc-700 pt-1 mt-1">
                            <span className="text-zinc-400">成本</span>
                            <span className="text-amber-400">${totalCost.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* 出場資訊 */}
                {scenario.exitPrice && (
                    <div className="bg-zinc-900 p-3 rounded-lg">
                        <div className="text-xs text-zinc-500 mb-2">出場</div>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-zinc-400">價格</span>
                                <span className="text-white">${scenario.exitPrice}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-400">金額</span>
                                <span className="text-white">${totalSale.toLocaleString()}</span>
                            </div>
                            {fees > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">手續費</span>
                                    <span className="text-zinc-500">-${fees}</span>
                                </div>
                            )}
                            {scenario.result && (
                                <div className="flex justify-between border-t border-zinc-700 pt-1 mt-1">
                                    <span className="text-zinc-400">損益</span>
                                    <span className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                                        {isProfit ? '+' : ''}{scenario.result.profit.toLocaleString()} ({scenario.result.percentage > 0 ? '+' : ''}{scenario.result.percentage}%)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 止損止盈 */}
            {(scenario.stopLoss || scenario.takeProfit) && (
                <div className="flex gap-2 mb-4">
                    {scenario.stopLoss && (
                        <div className="flex-1 bg-rose-500/10 border border-rose-500/30 p-2 rounded text-center">
                            <div className="text-xs text-rose-400">止損價</div>
                            <div className="text-white font-mono">${scenario.stopLoss}</div>
                        </div>
                    )}
                    {scenario.takeProfit && (
                        <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 p-2 rounded text-center">
                            <div className="text-xs text-emerald-400">止盈價</div>
                            <div className="text-white font-mono">${scenario.takeProfit}</div>
                        </div>
                    )}
                </div>
            )}

            {explanation && (
                <p className="text-sm text-zinc-400 border-t border-zinc-700 pt-3">{explanation}</p>
            )}
        </div>
    );
}

// ===== 指標範例組件 =====
function IndicatorExample({ 
    title, 
    indicator, 
    values, 
    interpretation 
}: { 
    title: string; 
    indicator: string; 
    values: IndicatorValue[]; 
    interpretation: string;
}) {
    return (
        <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                <span className="text-indigo-400">📐</span> {title}
            </h4>

            <div className="bg-zinc-900 p-3 rounded-lg mb-3">
                <div className="text-xs text-zinc-500 mb-2">{indicator} 指標數值</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {values.map((item, i) => (
                        <div 
                            key={i} 
                            className={`p-2 rounded text-center ${
                                item.signal === 'bullish' ? 'bg-emerald-500/10 border border-emerald-500/30' :
                                item.signal === 'bearish' ? 'bg-rose-500/10 border border-rose-500/30' :
                                'bg-zinc-800'
                            }`}
                        >
                            <div className="text-xs text-zinc-500">{item.label}</div>
                            <div className={`font-mono font-bold ${
                                item.signal === 'bullish' ? 'text-emerald-400' :
                                item.signal === 'bearish' ? 'text-rose-400' :
                                'text-white'
                            }`}>
                                {item.value}
                            </div>
                            {item.signal && (
                                <div className="flex justify-center mt-1">
                                    {item.signal === 'bullish' && <TrendingUp size={14} className="text-emerald-400" />}
                                    {item.signal === 'bearish' && <TrendingDown size={14} className="text-rose-400" />}
                                    {item.signal === 'neutral' && <AlertCircle size={14} className="text-zinc-400" />}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/30 p-3 rounded-lg">
                <div className="text-xs text-indigo-400 mb-1">📝 解讀</div>
                <p className="text-sm text-zinc-300">{interpretation}</p>
            </div>
        </div>
    );
}

// ===== 測驗範例組件 =====
function QuizExample({ 
    question, 
    options, 
    explanation 
}: { 
    question: string; 
    options: QuizOption[]; 
    explanation: string;
}) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showAnswer, setShowAnswer] = useState(false);

    const handleSelect = (id: string) => {
        if (!showAnswer) {
            setSelectedId(id);
        }
    };

    const handleCheck = () => {
        if (selectedId) {
            setShowAnswer(true);
        }
    };

    const selectedOption = options.find(o => o.id === selectedId);
    const isCorrect = selectedOption?.isCorrect;

    return (
        <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                <span className="text-purple-400">❓</span> 小測驗
            </h4>

            <p className="text-zinc-300 mb-4">{question}</p>

            <div className="space-y-2 mb-4">
                {options.map((option) => {
                    const isSelected = selectedId === option.id;
                    const showCorrect = showAnswer && option.isCorrect;
                    const showWrong = showAnswer && isSelected && !option.isCorrect;

                    return (
                        <button
                            key={option.id}
                            onClick={() => handleSelect(option.id)}
                            disabled={showAnswer}
                            className={`w-full p-3 rounded-lg text-left text-sm transition-all flex items-center gap-2 ${
                                showCorrect ? 'bg-emerald-500/20 border border-emerald-500/50' :
                                showWrong ? 'bg-rose-500/20 border border-rose-500/50' :
                                isSelected ? 'bg-indigo-500/20 border border-indigo-500/50' :
                                'bg-zinc-900 border border-zinc-700 hover:border-zinc-500'
                            }`}
                        >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                showCorrect ? 'bg-emerald-500 text-white' :
                                showWrong ? 'bg-rose-500 text-white' :
                                isSelected ? 'bg-indigo-500 text-white' :
                                'bg-zinc-700 text-zinc-400'
                            }`}>
                                {showCorrect ? <CheckCircle size={14} /> :
                                 showWrong ? <XCircle size={14} /> :
                                 option.id.toUpperCase()}
                            </div>
                            <span className={showCorrect ? 'text-emerald-400' : showWrong ? 'text-rose-400' : 'text-zinc-300'}>
                                {option.text}
                            </span>
                        </button>
                    );
                })}
            </div>

            {!showAnswer ? (
                <button
                    onClick={handleCheck}
                    disabled={!selectedId}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    確認答案
                </button>
            ) : (
                <div className={`p-3 rounded-lg ${isCorrect ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
                    <div className={`text-sm font-bold mb-1 ${isCorrect ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isCorrect ? '✓ 正確！' : '✗ 再想想'}
                    </div>
                    <p className="text-sm text-zinc-400">{explanation}</p>
                </div>
            )}
        </div>
    );
}

// ===== 計算範例組件 =====
function CalculationExample({ 
    title, 
    steps, 
    result 
}: { 
    title: string; 
    steps: CalculationStep[]; 
    result: { label: string; value: string; color?: string };
}) {
    return (
        <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                <span className="text-cyan-400">🧮</span> {title}
            </h4>

            <div className="bg-zinc-900 p-4 rounded-lg font-mono text-sm space-y-2">
                {steps.map((step, i) => (
                    <div 
                        key={i} 
                        className={`flex justify-between items-center ${step.highlight ? 'bg-zinc-800 -mx-2 px-2 py-1 rounded' : ''}`}
                    >
                        <div>
                            <span className="text-zinc-500">{step.label}</span>
                            {step.formula && (
                                <span className="text-zinc-600 ml-2">({step.formula})</span>
                            )}
                        </div>
                        <span className={step.highlight ? 'text-amber-400' : 'text-zinc-300'}>{step.value}</span>
                    </div>
                ))}
                
                <div className="border-t border-zinc-700 pt-2 mt-2 flex justify-between items-center">
                    <span className="text-white font-bold">{result.label}</span>
                    <span className={`font-bold ${result.color ? getTextColorClass(result.color) : 'text-emerald-400'}`}>
                        {result.value}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ===== 線圖範例組件 =====
function LineChartExample({ 
    title, 
    data,
    description 
}: { 
    title: string; 
    data: LineChartData;
    description?: string;
}) {
    const { points, markers = [], lines = [], zones = [] } = data;
    
    const chartWidth = 400;
    const chartHeight = 180;
    const padding = { top: 30, right: 60, bottom: 40, left: 50 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    // 計算數據範圍
    const allYValues = [
        ...points.map(p => p.y),
        ...markers.map(m => m.y),
        ...(lines.filter(l => l.y !== undefined).map(l => l.y as number)),
        ...zones.flatMap(z => [z.yStart, z.yEnd])
    ];
    const minY = Math.min(...allYValues) * 0.98;
    const maxY = Math.max(...allYValues) * 1.02;
    const yRange = maxY - minY;

    const getX = (index: number) => padding.left + (index / (points.length - 1)) * innerWidth;
    const getY = (price: number) => padding.top + innerHeight - ((price - minY) / yRange) * innerHeight;

    // 生成線條路徑
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.y)}`).join(' ');

    // 標記顏色和圖標
    const getMarkerStyle = (type: string) => {
        switch (type) {
            case 'buy': return { color: '#10b981', bgColor: 'bg-emerald-500', icon: '▲', label: '買進' };
            case 'sell': return { color: '#f43f5e', bgColor: 'bg-rose-500', icon: '▼', label: '賣出' };
            case 'stopLoss': return { color: '#f97316', bgColor: 'bg-orange-500', icon: '✕', label: '停損' };
            case 'takeProfit': return { color: '#06b6d4', bgColor: 'bg-cyan-500', icon: '◎', label: '停利' };
            case 'info': return { color: '#a855f7', bgColor: 'bg-purple-500', icon: '●', label: '資訊' };
            default: return { color: '#71717a', bgColor: 'bg-zinc-500', icon: '●', label: '' };
        }
    };

    // 生成 Y 軸刻度
    const yTicks = Array.from({ length: 5 }, (_, i) => minY + (yRange * i) / 4);

    return (
        <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                <span className="text-indigo-400">📈</span> {title}
            </h4>
            
            {/* 線圖 */}
            <div className="relative bg-zinc-900 rounded-lg p-2 mb-3 overflow-x-auto">
                <svg width={chartWidth} height={chartHeight} className="min-w-full">
                    {/* 區域填充 */}
                    {zones.map((zone, i) => (
                        <rect
                            key={`zone-${i}`}
                            x={padding.left}
                            y={getY(Math.max(zone.yStart, zone.yEnd))}
                            width={innerWidth}
                            height={Math.abs(getY(zone.yStart) - getY(zone.yEnd))}
                            fill={zone.type === 'profit' ? '#10b98120' : zone.type === 'loss' ? '#f43f5e20' : '#71717a20'}
                        />
                    ))}

                    {/* Y軸網格線 */}
                    {yTicks.map((tick, i) => (
                        <g key={`ytick-${i}`}>
                            <line
                                x1={padding.left}
                                y1={getY(tick)}
                                x2={padding.left + innerWidth}
                                y2={getY(tick)}
                                stroke="#3f3f46"
                                strokeDasharray="4,4"
                            />
                            <text
                                x={padding.left - 8}
                                y={getY(tick) + 4}
                                textAnchor="end"
                                fill="#71717a"
                                fontSize="10"
                            >
                                ${tick.toFixed(0)}
                            </text>
                        </g>
                    ))}

                    {/* 水平參考線（支撐/壓力） */}
                    {lines.filter(l => l.y !== undefined).map((line, i) => (
                        <g key={`hline-${i}`}>
                            <line
                                x1={padding.left}
                                y1={getY(line.y!)}
                                x2={padding.left + innerWidth}
                                y2={getY(line.y!)}
                                stroke={line.type === 'support' ? '#10b981' : line.type === 'resistance' ? '#f43f5e' : '#fbbf24'}
                                strokeWidth="1.5"
                                strokeDasharray={line.type === 'ma' ? '0' : '6,3'}
                            />
                            {line.label && (
                                <text
                                    x={padding.left + innerWidth + 5}
                                    y={getY(line.y!) + 4}
                                    fill={line.type === 'support' ? '#10b981' : line.type === 'resistance' ? '#f43f5e' : '#fbbf24'}
                                    fontSize="10"
                                >
                                    {line.label}
                                </text>
                            )}
                        </g>
                    ))}

                    {/* 趨勢線 */}
                    {lines.filter(l => l.points && l.points.length >= 2).map((line, i) => (
                        <line
                            key={`tline-${i}`}
                            x1={getX(line.points![0].x)}
                            y1={getY(line.points![0].y)}
                            x2={getX(line.points![1].x)}
                            y2={getY(line.points![1].y)}
                            stroke={line.color || '#fbbf24'}
                            strokeWidth="1.5"
                            strokeDasharray="6,3"
                        />
                    ))}

                    {/* 主線條 */}
                    <path
                        d={linePath}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* 數據點 */}
                    {points.map((point, i) => (
                        <circle
                            key={`point-${i}`}
                            cx={getX(i)}
                            cy={getY(point.y)}
                            r="3"
                            fill="#6366f1"
                        />
                    ))}

                    {/* 標記（買入/賣出/停損/停利） */}
                    {markers.map((marker, i) => {
                        const style = getMarkerStyle(marker.type);
                        const x = getX(marker.x);
                        const y = getY(marker.y);
                        const isAbove = marker.type === 'sell' || marker.type === 'takeProfit';
                        
                        return (
                            <g key={`marker-${i}`}>
                                {/* 連接線 */}
                                <line
                                    x1={x}
                                    y1={y}
                                    x2={x}
                                    y2={isAbove ? y - 25 : y + 25}
                                    stroke={style.color}
                                    strokeWidth="1"
                                    strokeDasharray="2,2"
                                />
                                {/* 標記圓點 */}
                                <circle
                                    cx={x}
                                    cy={y}
                                    r="6"
                                    fill={style.color}
                                    stroke="#18181b"
                                    strokeWidth="2"
                                />
                                {/* 標記文字 */}
                                <text
                                    x={x}
                                    y={isAbove ? y - 30 : y + 35}
                                    textAnchor="middle"
                                    fill={style.color}
                                    fontSize="10"
                                    fontWeight="bold"
                                >
                                    {marker.label}
                                </text>
                            </g>
                        );
                    })}

                    {/* X軸標籤 */}
                    {points.map((point, i) => (
                        point.label && (i % Math.ceil(points.length / 6) === 0 || i === points.length - 1) && (
                            <text
                                key={`xlabel-${i}`}
                                x={getX(i)}
                                y={chartHeight - 10}
                                textAnchor="middle"
                                fill="#71717a"
                                fontSize="10"
                            >
                                {point.label}
                            </text>
                        )
                    ))}
                </svg>
            </div>

            {/* 圖例 */}
            {markers.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-3 text-xs">
                    {Array.from(new Set(markers.map(m => m.type))).map(type => {
                        const style = getMarkerStyle(type);
                        return (
                            <div key={type} className="flex items-center gap-1">
                                <span className={`w-3 h-3 rounded-full ${style.bgColor}`}></span>
                                <span className="text-zinc-400">{style.label}</span>
                            </div>
                        );
                    })}
                    {lines.some(l => l.type === 'support') && (
                        <div className="flex items-center gap-1">
                            <span className="w-4 h-0.5 bg-emerald-500"></span>
                            <span className="text-zinc-400">支撐</span>
                        </div>
                    )}
                    {lines.some(l => l.type === 'resistance') && (
                        <div className="flex items-center gap-1">
                            <span className="w-4 h-0.5 bg-rose-500"></span>
                            <span className="text-zinc-400">壓力</span>
                        </div>
                    )}
                </div>
            )}

            {description && (
                <p className="text-sm text-zinc-400 border-t border-zinc-700 pt-3">{description}</p>
            )}
        </div>
    );
}

// ===== 組合圖範例組件（K線 + 線圖雙視角）=====
// K 棒和線圖的寬度計算常數（與 TradingViewChart.tsx 保持一致）
const COMBO_CANDLE_WIDTH = 14;
const COMBO_CANDLE_GAP = 20;  // 與 TradingViewChart.tsx 一致
const COMBO_MIN_CANDLE_SPACE = 75;  // 與 TradingViewChart.tsx 一致
const COMBO_POINT_GAP = 55;  // 與 TradingViewChart.tsx 一致

function ComboChartExample({ 
    title, 
    candles,
    annotations,
    lineData,
    description 
}: { 
    title: string; 
    candles: CandleDataExtended[];
    annotations?: CandleAnnotation[];
    lineData?: {
        points: DataPoint[];
        markers?: ChartMarker[];
        lines?: ChartLine[];
        zones?: ChartZone[];
    };
    description?: string;
}) {
    const [viewMode, setViewMode] = useState<'candle' | 'line' | 'both'>('both');
    const [syncHoverIndex, setSyncHoverIndex] = useState<number | null>(null);
    const [colorTheme, setColorTheme] = useState<ColorTheme>('taiwan');
    
    // 根據主題獲取漲跌顏色 class
    const getBullishColorClass = () => colorTheme === 'taiwan' ? 'text-rose-500' : 'text-emerald-400';
    const getBearishColorClass = () => colorTheme === 'taiwan' ? 'text-emerald-400' : 'text-rose-500';
    
    // 計算統一的圖表寬度（與 TradingViewChart.tsx 保持一致的計算方式）
    const candlePadding = { left: 20, right: 60 };
    const linePadding = { left: 15, right: 60 };
    
    // 使用與 TradingViewChart.tsx 相同的間距計算
    const candleSpacing = Math.max(COMBO_CANDLE_WIDTH + COMBO_CANDLE_GAP, COMBO_MIN_CANDLE_SPACE);
    const candleWidth = candles.length * candleSpacing + candlePadding.left + candlePadding.right;
    
    // 線圖寬度計算（與 TradingViewChart.tsx 一致）
    const lineWidth = lineData 
        ? Math.max(lineData.points.length - 1, 1) * COMBO_POINT_GAP + linePadding.left + linePadding.right + 60
        : 0;
    
    // 使用較大的寬度，確保兩個圖表對齊
    const sharedWidth = Math.max(450, candleWidth, lineWidth);
    
    // 統一的 hover 索引處理（K線與線圖數量已一致）
    const handleHoverIndexChange = useCallback((index: number | null) => {
        setSyncHoverIndex(index);
    }, []);
    
    return (
        <div className="p-3 sm:p-4 bg-gradient-to-b from-zinc-800/60 to-zinc-900/60 border border-zinc-700/50 rounded-xl shadow-lg">
            {/* 標題與切換按鈕 - 手機版堆疊，桌面版並排 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h4 className="text-white font-bold flex items-center gap-2 text-sm sm:text-base">
                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-400 text-sm sm:text-base">📊</span>
                    </span>
                    <span className="line-clamp-2">{title}</span>
                </h4>
                
                {/* 控制按鈕組 */}
                <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                    {/* 顏色主題切換按鈕 */}
                    <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-700/50">
                        <button
                            onClick={() => setColorTheme('taiwan')}
                            className={`px-2 sm:px-2.5 py-1.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
                                colorTheme === 'taiwan' 
                                    ? 'bg-rose-500/20 text-rose-400' 
                                    : 'text-zinc-500 hover:text-zinc-300 active:text-zinc-200'
                            }`}
                            title="台股配色（紅漲綠跌）"
                        >
                            台股
                        </button>
                        <button
                            onClick={() => setColorTheme('us')}
                            className={`px-2 sm:px-2.5 py-1.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
                                colorTheme === 'us' 
                                    ? 'bg-emerald-500/20 text-emerald-400' 
                                    : 'text-zinc-500 hover:text-zinc-300 active:text-zinc-200'
                            }`}
                            title="美股配色（綠漲紅跌）"
                        >
                            美股
                        </button>
                    </div>
                    
                    {/* 視圖切換按鈕 */}
                    <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-700/50">
                        <button
                            onClick={() => setViewMode('candle')}
                            className={`px-2.5 sm:px-3 py-1.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
                                viewMode === 'candle' 
                                    ? 'bg-amber-500/20 text-amber-400' 
                                    : 'text-zinc-500 hover:text-zinc-300 active:text-zinc-200'
                            }`}
                        >
                            K線
                        </button>
                        {lineData && (
                            <>
                                <button
                                    onClick={() => setViewMode('line')}
                                    className={`px-2.5 sm:px-3 py-1.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
                                        viewMode === 'line' 
                                            ? 'bg-indigo-500/20 text-indigo-400' 
                                            : 'text-zinc-500 hover:text-zinc-300 active:text-zinc-200'
                                    }`}
                                >
                                    線圖
                                </button>
                                <button
                                    onClick={() => setViewMode('both')}
                                    className={`px-2.5 sm:px-3 py-1.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all ${
                                        viewMode === 'both' 
                                            ? 'bg-purple-500/20 text-purple-400' 
                                            : 'text-zinc-500 hover:text-zinc-300 active:text-zinc-200'
                                    }`}
                                >
                                    雙視圖
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            {/* 同步 hover 資訊面板 - 手機版可換行，桌面版單行 */}
            {viewMode === 'both' && (
                <div className="mb-3 px-2 sm:px-3 py-2 bg-zinc-900/80 rounded-lg border border-zinc-700/50 min-h-[34px] flex items-center">
                    {syncHoverIndex !== null && syncHoverIndex >= 0 && syncHoverIndex < candles.length ? (
                        <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-1 text-[10px] sm:text-xs font-mono">
                            {/* K 線數據 */}
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                {candles[syncHoverIndex].label || `#${syncHoverIndex + 1}`}
                            </span>
                            <span className="text-zinc-500">開<span className="text-zinc-300 ml-0.5 sm:ml-1">{candles[syncHoverIndex].open}</span></span>
                            <span className="text-zinc-500">高<span className={`ml-0.5 sm:ml-1 ${getBullishColorClass()}`}>{candles[syncHoverIndex].high}</span></span>
                            <span className="text-zinc-500">低<span className={`ml-0.5 sm:ml-1 ${getBearishColorClass()}`}>{candles[syncHoverIndex].low}</span></span>
                            <span className="text-zinc-500">收<span className={`ml-0.5 sm:ml-1 font-semibold ${candles[syncHoverIndex].close >= candles[syncHoverIndex].open ? getBullishColorClass() : getBearishColorClass()}`}>{candles[syncHoverIndex].close}</span></span>
                            {/* 線圖數據 */}
                            {lineData && lineData.points[syncHoverIndex] && (
                                <span className="text-indigo-400 flex items-center gap-1 border-l border-zinc-700 pl-2 sm:pl-4">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    趨勢 ${lineData.points[syncHoverIndex].y}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-[10px] sm:text-xs text-zinc-600">👆 點擊或滑動圖表查看詳細資訊</span>
                    )}
                </div>
            )}
            
            {/* 圖表顯示區 - 雙視圖改為上下堆疊 */}
            <div className={`${viewMode === 'both' ? 'space-y-4' : ''}`}>
                {/* K線圖 */}
                {(viewMode === 'candle' || viewMode === 'both') && (
                    <div>
                        {viewMode === 'both' && (
                            <div className="text-xs font-medium text-amber-400 mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    K線視角
                                </span>
                                <span className="text-[10px] text-zinc-600 sm:hidden">← 左右滑動 →</span>
                            </div>
                        )}
                        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                            <TVCandlestickChart 
                                candles={candles} 
                                annotations={annotations}
                                height={viewMode === 'both' ? 200 : 240}
                                showOHLCCards={viewMode !== 'both'}
                                showOHLCInfo={viewMode !== 'both'}
                                showWrapper={false}
                                fixedWidth={viewMode === 'both' ? sharedWidth : undefined}
                                syncHoverIndex={viewMode === 'both' ? syncHoverIndex : undefined}
                                onHoverIndexChange={viewMode === 'both' ? handleHoverIndexChange : undefined}
                                colorTheme={colorTheme}
                                showColorToggle={false}
                            />
                        </div>
                    </div>
                )}
                
                {/* 線圖 */}
                {lineData && (viewMode === 'line' || viewMode === 'both') && (
                    <div>
                        {viewMode === 'both' && (
                            <div className="text-xs font-medium text-indigo-400 mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    趨勢視角
                                </span>
                                <span className="text-[10px] text-zinc-600 sm:hidden">← 左右滑動 →</span>
                            </div>
                        )}
                        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                            <TVLineChart 
                                points={lineData.points}
                                markers={lineData.markers}
                                lines={lineData.lines}
                                zones={lineData.zones}
                                height={viewMode === 'both' ? 200 : 240}
                                showWrapper={false}
                                fixedWidth={viewMode === 'both' ? sharedWidth : undefined}
                                syncHoverIndex={viewMode === 'both' ? syncHoverIndex : undefined}
                                onHoverIndexChange={viewMode === 'both' ? handleHoverIndexChange : undefined}
                            />
                        </div>
                    </div>
                )}
            </div>
            
            {/* OHLC 數據卡片 - 單一視圖時由 K 線圖內部顯示，雙視圖時在這裡統一顯示 */}
            {viewMode === 'both' && (
                <div className="mt-4 pt-3 border-t border-zinc-700/30">
                    <div className="text-xs font-medium text-zinc-500 mb-2 flex items-center justify-between">
                        <span>OHLC 數據</span>
                        <span className="text-[10px] text-zinc-600 sm:hidden">← 左右滑動 →</span>
                    </div>
                    <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                        <div className="flex gap-1.5 sm:gap-2 min-w-fit sm:justify-center">
                            {candles.map((candle, i) => {
                                const isUp = candle.close >= candle.open;
                                const isHovered = syncHoverIndex === i;
                                return (
                                    <div 
                                        key={i} 
                                        className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-center min-w-[60px] sm:min-w-[70px] flex-shrink-0 transition-all ${
                                            isHovered 
                                                ? 'bg-zinc-700/80 border border-amber-500/50 ring-1 ring-amber-500/30' 
                                                : 'bg-zinc-900/60 border border-zinc-800/50'
                                        }`}
                                        onClick={() => setSyncHoverIndex(i)}
                                    >
                                        <div className={`text-[9px] sm:text-[10px] font-medium mb-1 sm:mb-1.5 pb-1 border-b ${isHovered ? 'text-white border-zinc-600' : 'text-zinc-400 border-zinc-700/30'}`}>
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
        </div>
    );
}
