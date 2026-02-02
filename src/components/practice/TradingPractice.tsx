'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CandlestickChart } from '@/components/chart';
import { PlaybackControls } from './PlaybackControls';
import { SimpleTradingPanel } from './SimpleTradingPanel';
import { PatternScenario, PlaybackState, PracticePosition, PracticeTrade, ScenarioCandle } from '@/data/practice/types';
import { PATTERN_INFO } from '@/data/practice/patternScenarios';

interface TradingPracticeProps {
    scenario: PatternScenario | null;
    visibleCandles: ScenarioCandle[];
    playback: PlaybackState;
    position: PracticePosition | null;
    trades: PracticeTrade[];
    balance: number;
    score: number;
    getCurrentPrice: () => number;
    
    // Playback controls
    onPlay: () => void;
    onPause: () => void;
    onStepForward: () => void;
    onStepBackward: () => void;
    onSpeedChange: (speed: number) => void;
    onReset: () => void;
    
    // Trading actions
    onBuy: (quantity: number) => void;
    onSell: (quantity: number) => void;
    onClosePosition: () => void;
    onComplete: () => void;
}

export function TradingPractice({
    scenario,
    visibleCandles,
    playback,
    position,
    trades,
    balance,
    score,
    getCurrentPrice,
    onPlay,
    onPause,
    onStepForward,
    onStepBackward,
    onSpeedChange,
    onReset,
    onBuy,
    onSell,
    onClosePosition,
    onComplete,
}: TradingPracticeProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = useState(600);
    const [chartHeight, setChartHeight] = useState(350);
    const [showScenarioInfo, setShowScenarioInfo] = useState(true);
    
    // Dynamically calculate chart size based on container and screen
    useEffect(() => {
        const updateSize = () => {
            if (chartContainerRef.current) {
                const containerWidth = chartContainerRef.current.clientWidth;
                // Account for padding (p-3 on mobile, p-4 on desktop)
                const isMobile = window.innerWidth < 768;
                const padding = isMobile ? 24 : 32;
                // Use container width - lower minimum to prevent overflow
                const calculatedWidth = containerWidth - padding;
                setChartWidth(Math.max(calculatedWidth, 200));
                // Smaller height on mobile
                setChartHeight(isMobile ? 260 : 350);
            }
        };
        
        updateSize();
        
        const resizeObserver = new ResizeObserver(updateSize);
        if (chartContainerRef.current) {
            resizeObserver.observe(chartContainerRef.current);
        }
        
        window.addEventListener('resize', updateSize);
        
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateSize);
        };
    }, []);
    
    if (!scenario) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center text-zinc-400">
                    <div className="text-4xl mb-4">📈</div>
                    <div className="text-lg mb-2">請選擇一個型態開始練習</div>
                    <div className="text-sm">從左側面板選擇想要練習的K線型態</div>
                </div>
            </div>
        );
    }
    
    const patternInfo = PATTERN_INFO[scenario.patternType];
    const currentPrice = getCurrentPrice();
    const isComplete = playback.currentIndex >= playback.totalCandles - 1;
    
    // Find candle labels to show
    const currentCandle = visibleCandles[visibleCandles.length - 1];
    const candleLabel = currentCandle?.label;
    
    return (
        <div className="space-y-3 md:space-y-4">
            {/* Top: Scenario Info - Collapsible on mobile */}
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden">
                {/* Header - Always visible */}
                <button
                    onClick={() => setShowScenarioInfo(!showScenarioInfo)}
                    className="w-full p-3 md:p-4 flex items-center justify-between md:cursor-default"
                >
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                        <h2 className="text-base md:text-lg font-medium text-white truncate">{scenario.name}</h2>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                                patternInfo.signal === 'bullish'
                                    ? 'bg-emerald-600/20 text-emerald-400'
                                    : patternInfo.signal === 'bearish'
                                        ? 'bg-rose-600/20 text-rose-400'
                                        : 'bg-zinc-600/20 text-zinc-400'
                            }`}>
                                {patternInfo.signal === 'bullish' ? '漲' : patternInfo.signal === 'bearish' ? '跌' : '中'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                            <div className="text-xs text-zinc-500 hidden md:block">分數</div>
                            <div className="text-lg md:text-2xl font-bold text-indigo-400">{score}</div>
                        </div>
                        <ChevronDown 
                            size={18} 
                            className={`text-zinc-500 md:hidden transition-transform ${showScenarioInfo ? 'rotate-180' : ''}`} 
                        />
                    </div>
                </button>
                {/* Expandable details */}
                <div className={`px-3 md:px-4 pb-3 md:pb-4 space-y-2 ${showScenarioInfo ? 'block' : 'hidden md:block'}`}>
                    <p className="text-sm text-zinc-400">{scenario.description}</p>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                            scenario.difficulty === 'easy'
                                ? 'bg-emerald-600/20 text-emerald-400'
                                : scenario.difficulty === 'medium'
                                    ? 'bg-amber-600/20 text-amber-400'
                                    : 'bg-rose-600/20 text-rose-400'
                        }`}>
                            {scenario.difficulty === 'easy' ? '簡單' : scenario.difficulty === 'medium' ? '中等' : '困難'}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Main: Chart + Trading Panel */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 md:gap-4">
                {/* Chart Area */}
                <div className="xl:col-span-3 space-y-3 md:space-y-4">
                    {/* Chart */}
                    <div 
                        ref={chartContainerRef}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 md:p-4 overflow-hidden min-w-0"
                    >
                        {/* 固定高度的標籤區域，避免佈局偏移 */}
                        <div className="h-6 md:h-8 flex items-center justify-center mb-2">
                            {candleLabel ? (
                                <span className="text-xs md:text-sm px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-indigo-600/20 text-indigo-400 animate-in fade-in duration-200">
                                    {candleLabel}
                                </span>
                            ) : (
                                <span className="text-xs md:text-sm text-zinc-600">—</span>
                            )}
                        </div>
                        <CandlestickChart
                            candles={visibleCandles}
                            currentPrice={currentPrice}
                            width={chartWidth}
                            height={chartHeight}
                            showMA={true}
                            showVolume={true}
                            isAsianTheme={true}
                        />
                    </div>
                    
                    {/* Playback Controls */}
                    <PlaybackControls
                        playback={playback}
                        onPlay={onPlay}
                        onPause={onPause}
                        onStepForward={onStepForward}
                        onStepBackward={onStepBackward}
                        onSpeedChange={onSpeedChange}
                        onReset={onReset}
                    />
                    
                    {/* Complete Button - Desktop only here */}
                    {isComplete && (
                        <button
                            onClick={onComplete}
                            className="hidden md:block w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all"
                        >
                            完成練習並查看結果
                        </button>
                    )}
                </div>
                
                {/* Trading Panel */}
                <div className="xl:col-span-1 space-y-3 md:space-y-4">
                    <SimpleTradingPanel
                        currentPrice={currentPrice}
                        balance={balance}
                        position={position}
                        trades={trades}
                        onBuy={onBuy}
                        onSell={onSell}
                        onClosePosition={onClosePosition}
                        isAsianTheme={true}
                    />
                    
                    {/* Hints - Hidden on mobile when position exists */}
                    {scenario.optimalEntry && !isComplete && (
                        <div className={`bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-3 md:p-4 ${position ? 'hidden md:block' : ''}`}>
                            <div className="text-xs text-zinc-500 mb-2">💡 提示</div>
                            <div className="text-sm text-zinc-400">
                                觀察型態特徵，在適當時機進行
                                {scenario.expectedDirection === 'up' ? '買入' : '賣出'}操作。
                                {scenario.stopLoss && (
                                    <span className="block mt-1 text-rose-400">
                                        建議停損: ${scenario.stopLoss}
                                    </span>
                                )}
                                {scenario.takeProfit && (
                                    <span className="block text-emerald-400">
                                        建議停利: ${scenario.takeProfit}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Complete Button - Mobile only here */}
                    {isComplete && (
                        <button
                            onClick={onComplete}
                            className="md:hidden w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all"
                        >
                            完成練習並查看結果
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
