'use client';

import { Wallet, TrendingUp, TrendingDown, Clock, XCircle } from 'lucide-react';
import { Holding } from '@/types';
import { HoldingLot } from '@/lib/matching';
import { Card } from '@/components/ui';

interface HoldingsPanelProps {
    holding: Holding | null;
    lots?: HoldingLot[]; // Optional for backward compatibility if needed, but we should pass it
    currentPrice: number;
    isAsianTheme?: boolean;
    onSellLot?: (lotId: string) => void;
}

export function HoldingsPanel({ holding, lots = [], currentPrice, isAsianTheme = true, onSellLot }: HoldingsPanelProps) {
    if (!holding || holding.quantity === 0) {
        return (
            <Card title="持倉庫存">
                <div className="py-8 text-center text-zinc-600 text-sm italic">
                    目前無證券持倉
                </div>
            </Card>
        );
    }

    const isLong = holding.quantity > 0;
    const absQuantity = Math.abs(holding.quantity);

    // Recalculate unrealized P&L with current price
    const marketValue = absQuantity * currentPrice;
    const costBasis = absQuantity * holding.averageCost;
    const unrealizedPnl = isLong
        ? absQuantity * (currentPrice - holding.averageCost)
        : absQuantity * (holding.averageCost - currentPrice);
    const unrealizedPnlPercent = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

    const isProfit = unrealizedPnl >= 0;

    // Color based on theme
    const profitColor = isAsianTheme
        ? (isProfit ? 'text-rose-500' : 'text-emerald-500')
        : (isProfit ? 'text-emerald-500' : 'text-rose-500');

    const profitBg = isAsianTheme
        ? (isProfit ? 'bg-rose-500/10' : 'bg-emerald-500/10')
        : (isProfit ? 'bg-emerald-500/10' : 'bg-rose-500/10');

    return (
        <Card
            title="持倉庫存"
            headerRight={
                <div className="flex flex-col items-end leading-tight">
                    <div className={`text-sm font-black font-mono ${profitColor}`}>
                        {isProfit ? '+' : ''}{unrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-[10px] font-bold ${profitColor}`}>
                        {isProfit ? '+' : ''}{unrealizedPnlPercent.toFixed(2)}%
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Position Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-6 rounded-full ${isLong
                            ? (isAsianTheme ? 'bg-rose-500' : 'bg-emerald-500')
                            : (isAsianTheme ? 'bg-emerald-500' : 'bg-rose-500')
                            }`} />
                        <div>
                            <div className="text-xs font-black text-white">NATLEE (7777)</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-tighter">
                                {isLong ? 'Long Position' : 'Short Position'}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-mono text-white font-bold">{absQuantity.toLocaleString()} <span className="text-[10px] text-zinc-500">股</span></div>
                        <div className="text-[10px] text-zinc-500">市值 ${marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                </div>

                {/* Simplified Stats Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-zinc-900/50 border border-white/5 p-2 rounded">
                        <div className="text-zinc-500 mb-0.5">平均成本</div>
                        <div className="text-zinc-200 font-mono font-bold">${holding.averageCost.toFixed(2)}</div>
                    </div>
                    <div className="bg-zinc-900/50 border border-white/5 p-2 rounded">
                        <div className="text-zinc-500 mb-0.5">當前價格</div>
                        <div className="text-amber-400 font-mono font-bold">${currentPrice.toFixed(2)}</div>
                    </div>
                </div>

                {/* Lots List */}
                {lots.length > 0 && (
                    <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Transaction Lots</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded-full font-mono">{lots.length}</span>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {lots.map(lot => {
                                const lotPnl = isLong
                                    ? (currentPrice - lot.price) * lot.quantity
                                    : (lot.price - currentPrice) * lot.quantity;
                                const lotPnlPercent = isLong
                                    ? ((currentPrice - lot.price) / lot.price) * 100
                                    : ((lot.price - currentPrice) / lot.price) * 100;

                                const isLotProfit = lotPnl >= 0;
                                const lotColor = isAsianTheme
                                    ? (isLotProfit ? 'text-rose-400' : 'text-emerald-400')
                                    : (isLotProfit ? 'text-emerald-400' : 'text-rose-400');

                                const lotBg = isAsianTheme
                                    ? (isLotProfit ? 'bg-rose-500/5' : 'bg-emerald-500/5')
                                    : (isLotProfit ? 'bg-emerald-500/5' : 'bg-rose-500/5');

                                return (
                                    <div key={lot.id} className={`flex items-center justify-between p-2 rounded border border-white/5 ${lotBg} hover:bg-zinc-800/40 transition-all group`}>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-white font-mono font-bold">{lot.quantity.toLocaleString()}股 <span className="text-[9px] text-zinc-500 font-normal">@ ${lot.price.toFixed(1)}</span></span>
                                            <span className="text-[9px] text-zinc-500">{new Date(lot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="text-right leading-none">
                                                <div className={`text-[10px] font-mono font-bold ${lotColor}`}>
                                                    {isLotProfit ? '+' : ''}{lotPnl.toFixed(0)}
                                                </div>
                                                <div className={`text-[9px] opacity-80 ${lotColor}`}>
                                                    {isLotProfit ? '+' : ''}{lotPnlPercent.toFixed(1)}%
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => onSellLot?.(lot.id)}
                                                className="h-7 px-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white rounded text-[10px] font-bold transition-all transform active:scale-95 shadow-sm"
                                            >
                                                平倉
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
