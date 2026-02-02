'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { CandlestickChart } from '@/components/chart';
import { PlaybackControls } from './PlaybackControls';
import { SimpleTradingPanel } from './SimpleTradingPanel';
import { PatternScenario, PlaybackState, PracticePosition, PracticeTrade, ScenarioCandle } from '@/data/practice/types';

interface ReplayModeProps {
    scenario: PatternScenario | null;
    visibleCandles: ScenarioCandle[];
    playback: PlaybackState;
    position: PracticePosition | null;
    trades: PracticeTrade[];
    balance: number;
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

export function ReplayMode({
    scenario,
    visibleCandles,
    playback,
    position,
    trades,
    balance,
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
}: ReplayModeProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = useState(600);
    const [chartHeight, setChartHeight] = useState(350);
    const [showCandleInfo, setShowCandleInfo] = useState(true);
    
    // Dynamically calculate chart size based on container and screen
    useEffect(() => {
        const updateSize = () => {
            if (chartContainerRef.current) {
                const containerWidth = chartContainerRef.current.clientWidth;
                const isMobile = window.innerWidth < 768;
                const padding = isMobile ? 24 : 32;
                setChartWidth(Math.max(containerWidth - padding, 280));
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
                    <div className="text-4xl mb-4">⏱️</div>
                    <div className="text-lg mb-2">請選擇一個型態開始回放</div>
                    <div className="text-sm">從左側面板選擇想要回放的K線型態</div>
                </div>
            </div>
        );
    }
    
    const currentPrice = getCurrentPrice();
    const isComplete = playback.currentIndex >= playback.totalCandles - 1;
    
    // Current candle info
    const currentCandle = visibleCandles[visibleCandles.length - 1];
    const prevCandle = visibleCandles.length > 1 ? visibleCandles[visibleCandles.length - 2] : null;
    
    const priceChange = prevCandle ? currentCandle.close - prevCandle.close : 0;
    const priceChangePercent = prevCandle ? (priceChange / prevCandle.close) * 100 : 0;
    
    return (
        <div className="space-y-3 md:space-y-4">
            {/* Top: Current Candle Info - Collapsible on mobile */}
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden">
                {/* Mobile Header */}
                <button
                    onClick={() => setShowCandleInfo(!showCandleInfo)}
                    className="w-full p-3 md:hidden flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-zinc-400">收盤</span>
                        <span className="text-lg font-bold text-white font-mono">
                            ${currentCandle?.close.toFixed(2) || '-'}
                        </span>
                        <span className={`text-sm font-mono ${priceChange >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
                        </span>
                    </div>
                    <ChevronDown 
                        size={18} 
                        className={`text-zinc-500 transition-transform ${showCandleInfo ? 'rotate-180' : ''}`} 
                    />
                </button>
                {/* Full Info Grid */}
                <div className={`p-3 md:p-4 ${showCandleInfo ? 'block' : 'hidden'} md:block`}>
                    <div className="grid grid-cols-4 md:grid-cols-5 gap-2 md:gap-4 text-center">
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">開盤</div>
                            <div className="text-sm md:text-base text-white font-mono">${currentCandle?.open.toFixed(2) || '-'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">最高</div>
                            <div className="text-sm md:text-base text-rose-400 font-mono">${currentCandle?.high.toFixed(2) || '-'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">最低</div>
                            <div className="text-sm md:text-base text-emerald-400 font-mono">${currentCandle?.low.toFixed(2) || '-'}</div>
                        </div>
                        <div className="hidden md:block">
                            <div className="text-xs text-zinc-500 mb-1">收盤</div>
                            <div className="text-white font-mono">${currentCandle?.close.toFixed(2) || '-'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">漲跌</div>
                            <div className={`text-sm md:text-base font-mono ${priceChange >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}
                                <span className="text-xs ml-1 hidden md:inline">
                                    ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                                </span>
                            </div>
                        </div>
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
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 md:p-4"
                    >
                        {/* 固定高度的標籤區域，避免佈局偏移 */}
                        <div className="h-6 md:h-8 flex items-center justify-center mb-2">
                            {currentCandle?.label ? (
                                <span className="text-xs md:text-sm px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-amber-600/20 text-amber-400 animate-in fade-in duration-200">
                                    {currentCandle.label}
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
                    
                    {/* Instructions - Hidden on mobile */}
                    <div className="hidden md:block bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-4 text-sm text-zinc-400">
                        <div className="flex items-start gap-2">
                            <span className="text-indigo-400">💡</span>
                            <div>
                                <p>歷史回放模式讓你可以逐根K線觀察價格走勢。</p>
                                <p className="mt-1">使用播放控制按鈕來控制回放速度，或手動點擊「下一根」逐步前進。</p>
                                <p className="mt-1">你可以在任何時候進行買賣操作，練習你的交易判斷。</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Complete Button - Desktop */}
                    {isComplete && (
                        <button
                            onClick={onComplete}
                            className="hidden md:block w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all"
                        >
                            完成回放並查看結果
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
                    
                    {/* Complete Button - Mobile */}
                    {isComplete && (
                        <button
                            onClick={onComplete}
                            className="md:hidden w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all"
                        >
                            完成回放並查看結果
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
