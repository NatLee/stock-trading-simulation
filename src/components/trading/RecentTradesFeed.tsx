'use client';

import { Trade } from '@/lib/matching';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface RecentTradesFeedProps {
    trades: Trade[];
    isAsianTheme?: boolean;
    maxItems?: number;
}

/**
 * Real-time trade feed showing recent market trades
 */
export function RecentTradesFeed({
    trades,
    isAsianTheme = true,
    maxItems = 10
}: RecentTradesFeedProps) {
    const recentTrades = trades.slice(-maxItems).reverse();

    // Get color based on trade direction (taker side)
    const getTradeColor = (takerSide: 'buy' | 'sell') => {
        if (isAsianTheme) {
            return takerSide === 'buy' ? 'text-rose-400' : 'text-emerald-400';
        }
        return takerSide === 'buy' ? 'text-emerald-400' : 'text-rose-400';
    };

    const getBgColor = (takerSide: 'buy' | 'sell') => {
        if (isAsianTheme) {
            return takerSide === 'buy' ? 'bg-rose-500/5' : 'bg-emerald-500/5';
        }
        return takerSide === 'buy' ? 'bg-emerald-500/5' : 'bg-rose-500/5';
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    if (recentTrades.length === 0) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-3">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                    <span className="text-xs font-bold text-zinc-400">即時成交</span>
                </div>
                <div className="text-center text-zinc-600 text-xs py-4">
                    等待成交...
                </div>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-3">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-zinc-400">即時成交</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">
                    {trades.length} 筆
                </span>
            </div>

            {/* Header */}
            <div className="grid grid-cols-4 gap-1 text-[10px] text-zinc-500 border-b border-zinc-800 pb-1 mb-1">
                <span>時間</span>
                <span className="text-right">價格</span>
                <span className="text-right">數量</span>
                <span className="text-right">方向</span>
            </div>

            {/* Trade list */}
            <div className="space-y-0.5 max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                {recentTrades.map((trade, index) => (
                    <div
                        key={trade.tradeId}
                        className={`grid grid-cols-4 gap-1 text-[10px] font-mono py-0.5 rounded transition-all ${getBgColor(trade.takerSide)} ${index === 0 ? 'animate-flash' : ''}`}
                    >
                        <span className="text-zinc-500">
                            {formatTime(trade.timestamp)}
                        </span>
                        <span className={`text-right font-medium ${getTradeColor(trade.takerSide)}`}>
                            {trade.price.toFixed(2)}
                        </span>
                        <span className="text-right text-zinc-300">
                            {trade.quantity}
                        </span>
                        <span className={`text-right flex items-center justify-end gap-0.5 ${getTradeColor(trade.takerSide)}`}>
                            {trade.takerSide === 'buy' ? (
                                <>
                                    <ArrowUpRight size={10} />
                                    <span>買</span>
                                </>
                            ) : (
                                <>
                                    <ArrowDownRight size={10} />
                                    <span>賣</span>
                                </>
                            )}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
