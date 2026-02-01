'use client';

import { OrderPreviewData } from '@/types';
import { formatCurrency, formatPercent } from '@/lib';

interface OrderPreviewProps {
    data: OrderPreviewData;
    title: string;
    labels: {
        symbol: string;
        quantity: string;
        price: string;
        subtotal: string;
        commission: string;
        total: string;
        available: string;
    };
    commissionRate?: number;
}

export function OrderPreview({ data, title, labels, commissionRate = 0.001425 }: OrderPreviewProps) {
    const isAffordable = data.total <= data.availableBalance;
    const ratePercent = (commissionRate * 100).toFixed(4); // e.g. 0.1425

    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded p-3 space-y-2">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                {title}
            </div>

            <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                    <span className="text-zinc-500">{labels.symbol}:</span>
                    <span className="text-white font-bold">{data.symbol}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-zinc-500">{labels.quantity}:</span>
                    <span className="text-white">{data.quantity.toLocaleString()} 股</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-zinc-500">{labels.price}:</span>
                    <span className="text-white">{formatCurrency(data.price)}</span>
                </div>

                <div className="border-t border-zinc-800 my-2" />

                <div className="flex justify-between">
                    <span className="text-zinc-500">{labels.subtotal}:</span>
                    <span className="text-white">{formatCurrency(data.subtotal, 0)}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-zinc-500">{labels.commission}:</span>
                    <span className="text-zinc-400">
                        {formatCurrency(data.commission, 0)}
                        <span className="text-zinc-600 ml-1">({ratePercent}%)</span>
                    </span>
                </div>

                <div className="border-t border-zinc-800 my-2" />

                <div className="flex justify-between font-bold">
                    <span className="text-zinc-400">{labels.total}:</span>
                    <span className="text-white">{formatCurrency(data.total, 0)}</span>
                </div>

                <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-600">{labels.available}:</span>
                    <span className={isAffordable ? 'text-emerald-500' : 'text-rose-500'}>
                        {formatCurrency(data.availableBalance, 0)}
                    </span>
                </div>
            </div>

            {!isAffordable && (
                <div className="text-rose-500 text-[10px] font-bold mt-2 p-2 bg-rose-500/10 border border-rose-500/30 rounded">
                    餘額不足
                </div>
            )}
        </div>
    );
}
