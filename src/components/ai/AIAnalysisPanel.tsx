'use client';

import { useState } from 'react';
import {
    Activity, TrendingUp, TrendingDown, Minus, Zap, BookOpen,
    BarChart3, LineChart, CandlestickChart as CandlestickIcon, Target, AlertCircle
} from 'lucide-react';
import { AIState, AIDetailedAnalysis } from '@/types';

interface AIAnalysisPanelProps {
    state: AIState;
    analysis: AIDetailedAnalysis | null;
    onStartScan: () => void;
    disabled?: boolean;
    isAsianTheme?: boolean;
}

export function AIAnalysisPanel({
    state,
    analysis,
    onStartScan,
    disabled = false,
    isAsianTheme = true,
}: AIAnalysisPanelProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const isScanning = state === 'scanning';
    const hasAnalysis = analysis !== null;

    // Color helpers based on theme
    const getBullishColor = () => isAsianTheme ? 'text-rose-500' : 'text-emerald-500';
    const getBearishColor = () => isAsianTheme ? 'text-emerald-500' : 'text-rose-500';
    const getBullishBg = () => isAsianTheme ? 'bg-rose-500/20 border-rose-500/50' : 'bg-emerald-500/20 border-emerald-500/50';
    const getBearishBg = () => isAsianTheme ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-rose-500/20 border-rose-500/50';

    const getDirectionIcon = (direction: 'bullish' | 'bearish' | 'neutral') => {
        switch (direction) {
            case 'bullish':
                return <TrendingUp size={16} className={getBullishColor()} />;
            case 'bearish':
                return <TrendingDown size={16} className={getBearishColor()} />;
            default:
                return <Minus size={16} className="text-zinc-400" />;
        }
    };

    const getRecommendationStyle = (rec: 'LONG' | 'SHORT' | 'HOLD') => {
        switch (rec) {
            case 'LONG':
                return {
                    bg: getBullishBg(),
                    text: getBullishColor(),
                    label: '買進 (LONG)',
                };
            case 'SHORT':
                return {
                    bg: getBearishBg(),
                    text: getBearishColor(),
                    label: '賣出 (SHORT)',
                };
            default:
                return {
                    bg: 'bg-zinc-700/50 border-zinc-600',
                    text: 'text-zinc-300',
                    label: '觀望 (HOLD)',
                };
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-zinc-800 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className={`w-2.5 h-2.5 rounded-full ${isScanning ? 'bg-amber-400 animate-ping' : hasAnalysis ? 'bg-emerald-400' : 'bg-zinc-500'
                            }`} />
                        <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${isScanning ? 'bg-amber-400' : hasAnalysis ? 'bg-emerald-400' : 'bg-zinc-500'
                            } opacity-50`} />
                    </div>
                    <span className="text-sm font-bold text-indigo-300 tracking-wider">AI 市場分析</span>
                    <span className="text-[10px] font-mono text-indigo-500/60 px-2 py-0.5 rounded bg-indigo-500/10">
                        NEURAL-NET V2
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {hasAnalysis && (
                        <span className="text-[10px] text-zinc-500">
                            {new Date(analysis.timestamp).toLocaleTimeString()}
                        </span>
                    )}
                    <svg
                        className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="p-4 space-y-4">
                    {/* Scan Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onStartScan();
                        }}
                        disabled={isScanning || disabled}
                        className={`w-full py-3 rounded-lg relative overflow-hidden group
                            flex items-center justify-center gap-2 
                            transition-all duration-300
                            border
                            ${isScanning
                                ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500/50 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]'
                            }
                            disabled:opacity-50`}
                    >
                        {/* Scan line animation */}
                        {!isScanning && !disabled && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]" />
                        )}

                        {isScanning ? (
                            <>
                                <Activity size={18} className="animate-spin text-amber-400" />
                                <span className="text-sm font-bold tracking-widest animate-pulse">分析中...</span>
                            </>
                        ) : (
                            <>
                                <Zap size={18} className={disabled ? '' : 'text-yellow-300 group-hover:scale-110 transition-transform'} />
                                <span className="text-sm font-bold tracking-widest">啟動 AI 診斷</span>
                            </>
                        )}
                    </button>

                    {/* Analysis Results */}
                    {hasAnalysis && (
                        <div className="space-y-4">
                            {/* Overall Recommendation */}
                            <div className={`p-4 rounded-lg border ${getRecommendationStyle(analysis.overall.recommendation).bg}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Target size={18} className={getRecommendationStyle(analysis.overall.recommendation).text} />
                                        <span className={`text-lg font-bold ${getRecommendationStyle(analysis.overall.recommendation).text}`}>
                                            {getRecommendationStyle(analysis.overall.recommendation).label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-400">信心度</span>
                                        <span className={`text-lg font-bold font-mono ${getRecommendationStyle(analysis.overall.recommendation).text}`}>
                                            {analysis.overall.confidence}%
                                        </span>
                                    </div>
                                </div>

                                {/* Reasons */}
                                <div className="space-y-1">
                                    {analysis.overall.reasons.map((reason, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                                            <span className="text-indigo-400">•</span>
                                            <span>{reason}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Analysis Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Trend Analysis */}
                                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <LineChart size={14} className="text-indigo-400" />
                                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">趨勢分析</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        {getDirectionIcon(analysis.trend.direction)}
                                        <span className={`text-sm font-bold ${analysis.trend.direction === 'bullish' ? getBullishColor() :
                                                analysis.trend.direction === 'bearish' ? getBearishColor() : 'text-zinc-400'
                                            }`}>
                                            {analysis.trend.direction === 'bullish' ? '多頭' :
                                                analysis.trend.direction === 'bearish' ? '空頭' : '中性'}
                                        </span>
                                        <span className="text-xs text-zinc-500 ml-auto">
                                            強度 {analysis.trend.strength}%
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                                        {analysis.trend.description}
                                    </p>
                                </div>

                                {/* Order Book Analysis */}
                                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BookOpen size={14} className="text-indigo-400" />
                                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">委託簿</span>
                                    </div>
                                    <div className="flex items-center gap-1 mb-2">
                                        <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden flex">
                                            <div
                                                className={`h-full ${isAsianTheme ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${analysis.orderBook.buyPressure}%` }}
                                            />
                                            <div
                                                className={`h-full ${isAsianTheme ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                style={{ width: `${analysis.orderBook.sellPressure}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-[10px] mb-2">
                                        <span className={getBullishColor()}>買 {analysis.orderBook.buyPressure}%</span>
                                        <span className={getBearishColor()}>賣 {analysis.orderBook.sellPressure}%</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                                        {analysis.orderBook.description}
                                    </p>
                                </div>

                                {/* Momentum Analysis */}
                                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BarChart3 size={14} className="text-indigo-400" />
                                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">動能指標</span>
                                    </div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="text-center">
                                            <div className={`text-sm font-bold font-mono ${analysis.momentum.rsi > 70 ? getBearishColor() :
                                                    analysis.momentum.rsi < 30 ? getBullishColor() : 'text-zinc-300'
                                                }`}>
                                                {analysis.momentum.rsi}
                                            </div>
                                            <div className="text-[9px] text-zinc-500">RSI</div>
                                        </div>
                                        <div className="text-center">
                                            <div className={`text-sm font-bold font-mono ${analysis.momentum.velocity > 0 ? getBullishColor() :
                                                    analysis.momentum.velocity < 0 ? getBearishColor() : 'text-zinc-300'
                                                }`}>
                                                {analysis.momentum.velocity > 0 ? '+' : ''}{analysis.momentum.velocity}%
                                            </div>
                                            <div className="text-[9px] text-zinc-500">動能</div>
                                        </div>
                                        <div className="text-center">
                                            <div className={`text-[10px] px-1.5 py-0.5 rounded ${analysis.momentum.volumeTrend === 'increasing' ? 'bg-indigo-500/20 text-indigo-400' :
                                                    analysis.momentum.volumeTrend === 'decreasing' ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-zinc-700 text-zinc-400'
                                                }`}>
                                                {analysis.momentum.volumeTrend === 'increasing' ? '量增' :
                                                    analysis.momentum.volumeTrend === 'decreasing' ? '量縮' : '持平'}
                                            </div>
                                            <div className="text-[9px] text-zinc-500 mt-0.5">量能</div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                                        {analysis.momentum.description}
                                    </p>
                                </div>

                                {/* Pattern Analysis */}
                                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CandlestickIcon size={14} className="text-indigo-400" />
                                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">K線型態</span>
                                    </div>
                                    {analysis.pattern.detected ? (
                                        <>
                                            <div className="flex items-center gap-2 mb-2">
                                                {getDirectionIcon(analysis.pattern.signal)}
                                                <span className={`text-sm font-bold ${analysis.pattern.signal === 'bullish' ? getBullishColor() :
                                                        analysis.pattern.signal === 'bearish' ? getBearishColor() : 'text-zinc-400'
                                                    }`}>
                                                    {analysis.pattern.detected}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 mb-1">
                                                <span>可信度: {analysis.pattern.confidence}%</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertCircle size={14} className="text-zinc-500" />
                                            <span className="text-sm text-zinc-500">無明顯型態</span>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                                        {analysis.pattern.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* No Analysis State */}
                    {!hasAnalysis && !isScanning && (
                        <div className="text-center py-6 text-zinc-500">
                            <Activity size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">點擊上方按鈕開始 AI 分析</p>
                            <p className="text-xs mt-1">分析趨勢、委託簿、動能與 K 線型態</p>
                        </div>
                    )}

                    {/* Decorative Grid */}
                    <div className="grid grid-cols-8 gap-1 opacity-20">
                        {[...Array(8)].map((_, i) => (
                            <div
                                key={i}
                                className={`h-0.5 rounded-full ${isScanning ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500'}`}
                                style={{ animationDelay: `${i * 100}ms` }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
