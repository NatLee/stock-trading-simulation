'use client';

import { PracticeResult, ScoreBreakdown, PracticeMode } from '@/data/practice/types';
import { PATTERN_INFO } from '@/data/practice/patternScenarios';

interface PracticeResultsProps {
    result: PracticeResult;
    scoreBreakdown: ScoreBreakdown | null;
    onRestart: () => void;
    onChangePattern: () => void;
}

export function PracticeResults({
    result,
    scoreBreakdown,
    onRestart,
    onChangePattern,
}: PracticeResultsProps) {
    const duration = Math.floor((result.endTime - result.startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    const patternName = result.patternType ? PATTERN_INFO[result.patternType]?.name : null;
    
    const isProfit = result.totalPnL >= 0;
    
    return (
        <div className="bg-zinc-800/50 rounded-lg p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="text-3xl md:text-4xl mb-2">
                    {result.mode === 'recognition'
                        ? (result.correctIdentifications! >= 3 ? '🎉' : '📚')
                        : (isProfit ? '🎉' : '💪')
                    }
                </div>
                <h2 className="text-lg md:text-xl font-bold text-white">
                    {result.mode === 'recognition'
                        ? '辨識挑戰完成！'
                        : '練習完成！'
                    }
                </h2>
                {patternName && (
                    <p className="text-sm md:text-base text-zinc-400 mt-1">型態: {patternName}</p>
                )}
            </div>
            
            {/* Score */}
            <div className="text-center py-3 md:py-4 border-y border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">總分</div>
                <div className="text-4xl md:text-5xl font-bold text-indigo-400">
                    {result.score}
                </div>
            </div>
            
            {/* Score Breakdown */}
            {scoreBreakdown && (
                <div className="space-y-1.5 md:space-y-2">
                    <div className="text-xs md:text-sm text-zinc-400 mb-2">分數明細</div>
                    {result.mode !== 'recognition' && (
                        <>
                            <ScoreItem
                                label="交易損益"
                                value={scoreBreakdown.tradingPnL}
                                color={scoreBreakdown.tradingPnL >= 0 ? 'emerald' : 'rose'}
                            />
                            <ScoreItem
                                label="進場準確度"
                                value={scoreBreakdown.entryAccuracy}
                                color="indigo"
                            />
                            <ScoreItem
                                label="出場準確度"
                                value={scoreBreakdown.exitAccuracy}
                                color="indigo"
                            />
                        </>
                    )}
                    <ScoreItem
                        label="時間獎勵"
                        value={scoreBreakdown.timeBonus}
                        color="amber"
                    />
                </div>
            )}
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 md:gap-4">
                {result.mode === 'recognition' ? (
                    <>
                        <StatBox
                            label="正確答案"
                            value={`${result.correctIdentifications}/${result.totalQuestions}`}
                            subtext={`正確率 ${Math.round((result.correctIdentifications! / result.totalQuestions!) * 100)}%`}
                        />
                        <StatBox
                            label="完成時間"
                            value={`${minutes}:${seconds.toString().padStart(2, '0')}`}
                            subtext="分鐘"
                        />
                    </>
                ) : (
                    <>
                        <StatBox
                            label="總損益"
                            value={`${isProfit ? '+' : ''}$${result.totalPnL.toLocaleString()}`}
                            subtext={`${result.totalPnLPercent >= 0 ? '+' : ''}${result.totalPnLPercent.toFixed(2)}%`}
                            highlight={isProfit ? 'emerald' : 'rose'}
                        />
                        <StatBox
                            label="交易次數"
                            value={result.trades.length.toString()}
                            subtext={`買${result.trades.filter(t => t.action === 'buy').length}/賣${result.trades.filter(t => t.action === 'sell').length}`}
                        />
                    </>
                )}
            </div>
            
            {/* Trade Summary */}
            {result.mode !== 'recognition' && result.trades.length > 0 && (
                <div className="bg-zinc-900/50 rounded-lg p-2.5 md:p-3">
                    <div className="text-xs text-zinc-500 mb-2">交易紀錄</div>
                    <div className="max-h-24 md:max-h-32 overflow-y-auto space-y-1">
                        {result.trades.map((trade) => (
                            <div
                                key={trade.id}
                                className="flex justify-between text-xs gap-1"
                            >
                                <span className={trade.action === 'buy' ? 'text-rose-400' : 'text-emerald-400'}>
                                    {trade.action === 'buy' ? '買' : '賣'}
                                </span>
                                <span className="text-zinc-400">{trade.quantity}張</span>
                                <span className="text-white font-mono">${trade.price.toFixed(2)}</span>
                                <span className="text-zinc-500 hidden md:inline">第{trade.candleIndex + 1}根</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 md:gap-3 pt-2 md:pt-4">
                <button
                    onClick={onRestart}
                    className="py-2.5 md:py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm md:text-base font-medium transition-all"
                >
                    再練一次
                </button>
                <button
                    onClick={onChangePattern}
                    className="py-2.5 md:py-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm md:text-base font-medium transition-all"
                >
                    換個型態
                </button>
            </div>
        </div>
    );
}

function ScoreItem({ label, value, color }: { label: string; value: number; color: string }) {
    const colorClasses = {
        emerald: 'text-emerald-400',
        rose: 'text-rose-400',
        indigo: 'text-indigo-400',
        amber: 'text-amber-400',
    };
    
    return (
        <div className="flex justify-between items-center text-xs md:text-sm">
            <span className="text-zinc-400">{label}</span>
            <span className={`font-mono ${colorClasses[color as keyof typeof colorClasses]}`}>
                {value >= 0 ? '+' : ''}{value}
            </span>
        </div>
    );
}

function StatBox({
    label,
    value,
    subtext,
    highlight,
}: {
    label: string;
    value: string;
    subtext: string;
    highlight?: 'emerald' | 'rose';
}) {
    const highlightClasses = {
        emerald: 'text-emerald-400',
        rose: 'text-rose-400',
    };
    
    return (
        <div className="bg-zinc-900/50 rounded-lg p-2.5 md:p-3 text-center">
            <div className="text-xs text-zinc-500 mb-0.5 md:mb-1">{label}</div>
            <div className={`text-lg md:text-xl font-bold ${highlight ? highlightClasses[highlight] : 'text-white'}`}>
                {value}
            </div>
            <div className="text-xs text-zinc-500 truncate">{subtext}</div>
        </div>
    );
}
