'use client';

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
    if (!scenario) {
        return (
            <div className="flex items-center justify-center h-full">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-w-0">
            {/* Left: Chart and Controls */}
            <div className="lg:col-span-2 space-y-4 min-w-0">
                {/* Current Candle Info */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="grid grid-cols-5 gap-4 text-center">
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">開盤</div>
                            <div className="text-white font-mono">${currentCandle?.open.toFixed(2) || '-'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">最高</div>
                            <div className="text-rose-400 font-mono">${currentCandle?.high.toFixed(2) || '-'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">最低</div>
                            <div className="text-emerald-400 font-mono">${currentCandle?.low.toFixed(2) || '-'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">收盤</div>
                            <div className="text-white font-mono">${currentCandle?.close.toFixed(2) || '-'}</div>
                        </div>
                        <div>
                            <div className="text-xs text-zinc-500 mb-1">漲跌</div>
                            <div className={`font-mono ${priceChange >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}
                                <span className="text-xs ml-1">
                                    ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Chart */}
                <div className="bg-zinc-900 rounded-lg p-4 overflow-hidden">
                    {currentCandle?.label && (
                        <div className="text-center mb-2">
                            <span className="text-sm px-3 py-1 rounded-full bg-amber-600/20 text-amber-400">
                                {currentCandle.label}
                            </span>
                        </div>
                    )}
                    <div className="w-full overflow-x-auto">
                        <CandlestickChart
                            candles={visibleCandles}
                            currentPrice={currentPrice}
                            width={600}
                            height={350}
                            showMA={true}
                            showVolume={true}
                            isAsianTheme={true}
                        />
                    </div>
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
                
                {/* Instructions */}
                <div className="bg-zinc-800/30 rounded-lg p-4 text-sm text-zinc-400">
                    <div className="flex items-start gap-2">
                        <span className="text-indigo-400">💡</span>
                        <div>
                            <p>歷史回放模式讓你可以逐根K線觀察價格走勢。</p>
                            <p className="mt-1">使用播放控制按鈕來控制回放速度，或手動點擊「下一根」逐步前進。</p>
                            <p className="mt-1">你可以在任何時候進行買賣操作，練習你的交易判斷。</p>
                        </div>
                    </div>
                </div>
                
                {/* Complete Button */}
                {isComplete && (
                    <button
                        onClick={onComplete}
                        className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all"
                    >
                        完成回放並查看結果
                    </button>
                )}
            </div>
            
            {/* Right: Trading Panel */}
            <div className="lg:col-span-1">
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
            </div>
        </div>
    );
}
