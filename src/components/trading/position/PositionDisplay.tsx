'use client';

import { Lock } from 'lucide-react';
import { Holding } from '@/types';
import { formatCurrency } from '@/lib';

interface HoldingSummaryProps {
    holding: Holding;
    currentPrice: number;
    onClose: () => void;
    translations: {
        entry: string;
        close: string;
    };
}

export function HoldingSummary({ holding, currentPrice, onClose, translations: t }: HoldingSummaryProps) {
    const pnlColor = holding.unrealizedPnl >= 0 ? 'text-emerald-500' : 'text-rose-500';
    const direction = holding.quantity > 0 ? '做多' : '做空';
    const directionColor = holding.quantity > 0 ? 'text-emerald-500' : 'text-rose-500';

    return (
        <div className="mt-4 pt-4 border-t border-zinc-800 animate-in slide-in-from-bottom-2 space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    持倉狀態
                </span>
                <span className={`text-xs font-bold ${directionColor}`}>
                    {direction}
                </span>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">股數</span>
                    <span className="text-white font-mono">{Math.abs(holding.quantity)} 股</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">{t.entry}</span>
                    <span className="text-white font-mono">{formatCurrency(holding.averageCost)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">現價</span>
                    <span className="text-white font-mono">{formatCurrency(currentPrice)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">市值</span>
                    <span className="text-yellow-500 font-mono">{formatCurrency(holding.marketValue)}</span>
                </div>

                <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-zinc-400">未實現盈虧</span>
                    <span className={pnlColor}>
                        {holding.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(holding.unrealizedPnl)}
                        ({holding.unrealizedPnlPercent >= 0 ? '+' : ''}{holding.unrealizedPnlPercent.toFixed(2)}%)
                    </span>
                </div>
            </div>

            <button
                onClick={onClose}
                className="w-full py-3 bg-zinc-100 hover:bg-white text-black 
                 font-bold text-xs rounded flex items-center justify-center gap-2
                 transition-colors"
            >
                <Lock size={14} />
                {t.close}
            </button>
        </div>
    );
}
