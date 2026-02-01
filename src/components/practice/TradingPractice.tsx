'use client';

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
    if (!scenario) {
        return (
            <div className="flex items-center justify-center h-full">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-w-0">
            {/* Left: Chart Area */}
            <div className="lg:col-span-2 space-y-4 min-w-0">
                {/* Scenario Info */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-lg font-medium text-white">{scenario.name}</h2>
                            <p className="text-sm text-zinc-400 mt-1">{scenario.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`text-xs px-2 py-1 rounded ${
                                    patternInfo.signal === 'bullish'
                                        ? 'bg-emerald-600/20 text-emerald-400'
                                        : patternInfo.signal === 'bearish'
                                            ? 'bg-rose-600/20 text-rose-400'
                                            : 'bg-zinc-600/20 text-zinc-400'
                                }`}>
                                    {patternInfo.signal === 'bullish' ? '看漲' : patternInfo.signal === 'bearish' ? '看跌' : '中性'}
                                </span>
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
                        <div className="text-right">
                            <div className="text-xs text-zinc-500">分數</div>
                            <div className="text-2xl font-bold text-indigo-400">{score}</div>
                        </div>
                    </div>
                </div>
                
                {/* Chart */}
                <div className="bg-zinc-900 rounded-lg p-4 overflow-hidden">
                    {candleLabel && (
                        <div className="text-center mb-2">
                            <span className="text-sm px-3 py-1 rounded-full bg-indigo-600/20 text-indigo-400">
                                {candleLabel}
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
                
                {/* Complete Button */}
                {isComplete && (
                    <button
                        onClick={onComplete}
                        className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all"
                    >
                        完成練習並查看結果
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
                
                {/* Hints */}
                {scenario.optimalEntry && !isComplete && (
                    <div className="mt-4 bg-zinc-800/30 rounded-lg p-3">
                        <div className="text-xs text-zinc-500 mb-2">提示</div>
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
            </div>
        </div>
    );
}
