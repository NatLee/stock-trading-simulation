'use client';

import { TradeRecord } from '@/types';
import { formatCurrency, formatPercent } from '@/lib';

interface TradeRecordRowProps {
    record: TradeRecord;
    onClose?: (recordId: string) => void;
    labels: {
        holding: string;
        close: string;
    };
}

export function TradeRecordRow({ record, onClose, labels }: TradeRecordRowProps) {
    const time = new Date(record.entryTime).toLocaleTimeString().split(' ')[0];
    const isOpen = record.status === 'open';
    const isBuy = record.side === 'buy';
    const pnlColor = record.pnl && record.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500';

    return (
        <div className="flex items-center justify-between py-2 px-3 border-b border-zinc-800/50 
                    hover:bg-zinc-800/30 transition-colors text-xs font-mono">
            {/* Time */}
            <span className="text-zinc-500 w-16">{time}</span>

            {/* Side */}
            <span className={`font-bold w-12 ${isBuy ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isBuy ? '買進' : '賣出'}
            </span>

            {/* Quantity */}
            <span className="text-zinc-300 w-12 text-right">{record.quantity}</span>

            {/* Entry Price */}
            <span className="text-zinc-300 w-16 text-right">{record.entryPrice.toFixed(2)}</span>

            {/* Exit Price / Status */}
            <span className="text-zinc-300 w-16 text-right">
                {record.exitPrice ? record.exitPrice.toFixed(2) : '-'}
            </span>

            {/* PnL */}
            <span className={`w-20 text-right font-bold ${isOpen ? 'text-amber-500' : pnlColor}`}>
                {isOpen ? (
                    <span className="text-[10px] uppercase">{labels.holding}</span>
                ) : (
                    record.pnl !== undefined && (
                        <>
                            {record.pnl >= 0 ? '+' : ''}{formatCurrency(record.pnl, 0)}
                        </>
                    )
                )}
            </span>

            {/* Close button for open positions */}
            {isOpen && onClose && (
                <button
                    onClick={() => onClose(record.id)}
                    className="ml-2 px-2 py-1 text-[10px] font-bold uppercase
                   bg-zinc-700 hover:bg-zinc-600 rounded
                   text-zinc-300 hover:text-white
                   transition-colors"
                >
                    {labels.close}
                </button>
            )}
        </div>
    );
}
