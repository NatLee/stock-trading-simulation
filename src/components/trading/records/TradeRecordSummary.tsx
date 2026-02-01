'use client';

import { useMemo } from 'react';
import { TradeRecord } from '@/types';
import { formatCurrency, formatPercent } from '@/lib';

interface TradeRecordSummaryProps {
    records: TradeRecord[];
    initialBalance: number;
    label: string;
}

export function TradeRecordSummary({ records, initialBalance, label }: TradeRecordSummaryProps) {
    const summary = useMemo(() => {
        const closedRecords = records.filter(r => r.status === 'closed' && r.pnl !== undefined);
        const totalPnl = closedRecords.reduce((sum, r) => sum + (r.pnl || 0), 0);
        const pnlPercent = (totalPnl / initialBalance) * 100;
        const wins = closedRecords.filter(r => r.pnl && r.pnl > 0).length;
        const losses = closedRecords.filter(r => r.pnl && r.pnl < 0).length;
        const winRate = closedRecords.length > 0 ? (wins / closedRecords.length) * 100 : 0;

        return { totalPnl, pnlPercent, wins, losses, winRate, totalTrades: closedRecords.length };
    }, [records, initialBalance]);

    const pnlColor = summary.totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500';

    return (
        <div className="flex items-center justify-between py-2 px-3 bg-zinc-800/50 border-t border-zinc-700">
            <span className="text-xs text-zinc-400">{label}:</span>
            <div className="flex items-center gap-4">
                <span className={`text-sm font-bold font-mono ${pnlColor}`}>
                    {summary.totalPnl >= 0 ? '+' : ''}{formatCurrency(summary.totalPnl)}
                </span>
                <span className={`text-xs font-mono ${pnlColor}`}>
                    ({formatPercent(summary.pnlPercent)})
                </span>
                {summary.totalTrades > 0 && (
                    <span className="text-[10px] text-zinc-500">
                        {summary.wins}W / {summary.losses}L ({summary.winRate.toFixed(0)}%)
                    </span>
                )}
            </div>
        </div>
    );
}
