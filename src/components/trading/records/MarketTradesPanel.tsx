'use client';

import { useState } from 'react';
import { Trade } from '@/lib/matching';
import { CandleData } from '@/types';
import { Layers, Activity } from 'lucide-react';

interface MarketTradesPanelProps {
    trades: Trade[];
    candles: CandleData[];
    isAsianTheme?: boolean;
}

export function MarketTradesPanel({ trades, candles, isAsianTheme = true }: MarketTradesPanelProps) {
    const [mode, setMode] = useState<'trades' | 'candles'>('trades');

    // Helper for time format with year
    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden flex flex-col h-[300px]">
            {/* Header Tabs */}
            <div className="flex border-b border-zinc-800">
                <button
                    onClick={() => setMode('trades')}
                    className={`px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors ${mode === 'trades' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                >
                    <Activity size={14} />
                    即時成交
                </button>
                <button
                    onClick={() => setMode('candles')}
                    className={`px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors ${mode === 'candles' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                >
                    <Layers size={14} />
                    K線數據
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {mode === 'trades' ? (
                    <table className="w-full text-[10px] sm:text-xs">
                        <thead className="bg-zinc-950/50 sticky top-0 backdrop-blur-sm z-10">
                            <tr>
                                <th className="px-2 py-1.5 text-left text-zinc-500 font-mono">時間</th>
                                <th className="px-2 py-1.5 text-right text-zinc-500 font-mono">價格</th>
                                <th className="px-2 py-1.5 text-right text-zinc-500 font-mono">數量</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...trades].reverse().map((trade) => (
                                <tr key={trade.tradeId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                    <td className="px-2 py-1 text-zinc-400 font-mono whitespace-nowrap">
                                        {formatTime(trade.timestamp)}
                                    </td>
                                    <td className={`px-2 py-1 text-right font-mono font-bold ${trade.takerSide === 'buy'
                                        ? isAsianTheme ? 'text-rose-500' : 'text-emerald-500'
                                        : isAsianTheme ? 'text-emerald-500' : 'text-rose-500'
                                        }`}>
                                        {trade.price.toFixed(2)}
                                    </td>
                                    <td className="px-2 py-1 text-right text-zinc-300 font-mono">
                                        {trade.quantity}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-[10px] sm:text-xs">
                        <thead className="bg-zinc-950/50 sticky top-0 backdrop-blur-sm z-10">
                            <tr>
                                <th className="px-2 py-1.5 text-left text-zinc-500 font-mono">時間</th>
                                <th className="px-2 py-1.5 text-right text-zinc-500 font-mono">開盤</th>
                                <th className="px-2 py-1 text-right text-zinc-500 font-mono">最高</th>
                                <th className="px-2 py-1 text-right text-zinc-500 font-mono">最低</th>
                                <th className="px-2 py-1.5 text-right text-zinc-500 font-mono">收盤</th>
                                <th className="px-2 py-1 text-right text-zinc-500 font-mono">成交量</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...candles].reverse().map((candle) => {
                                const isUp = candle.close >= candle.open;
                                const colorClass = isUp
                                    ? isAsianTheme ? 'text-rose-500' : 'text-emerald-500'
                                    : isAsianTheme ? 'text-emerald-500' : 'text-rose-500';

                                return (
                                    <tr key={candle.timestamp} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                        <td className="px-2 py-1 text-zinc-400 font-mono whitespace-nowrap">
                                            {formatTime(candle.timestamp)}
                                        </td>
                                        <td className="px-2 py-1 text-right text-zinc-300 font-mono">{candle.open.toFixed(2)}</td>
                                        <td className="px-2 py-1 text-right text-zinc-300 font-mono">{candle.high.toFixed(2)}</td>
                                        <td className="px-2 py-1 text-right text-zinc-300 font-mono">{candle.low.toFixed(2)}</td>
                                        <td className={`px-2 py-1 text-right font-mono font-bold ${colorClass}`}>
                                            {candle.close.toFixed(2)}
                                        </td>
                                        <td className="px-2 py-1 text-right text-zinc-300 font-mono">{candle.volume}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
