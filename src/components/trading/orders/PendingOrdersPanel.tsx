'use client';

import { X, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { PendingOrder } from '@/types';
import { Card } from '@/components/ui';

interface PendingOrdersPanelProps {
    pendingOrders: PendingOrder[];
    onCancelOrder: (orderId: string) => void;
    isAsianTheme?: boolean;
}

export function PendingOrdersPanel({ pendingOrders, onCancelOrder, isAsianTheme = true }: PendingOrdersPanelProps) {
    if (pendingOrders.length === 0) {
        return (
            <Card title="掛單">
                <div className="py-3 text-center text-zinc-600 text-sm">
                    目前無掛單
                </div>
            </Card>
        );
    }

    const getBuyColor = () => isAsianTheme ? 'text-rose-400' : 'text-emerald-400';
    const getSellColor = () => isAsianTheme ? 'text-emerald-400' : 'text-rose-400';
    const getBuyBg = () => isAsianTheme ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30';
    const getSellBg = () => isAsianTheme ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30';

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
        <Card
            title="掛單"
            headerRight={
                <span className="text-xs text-amber-400 font-mono">
                    {pendingOrders.length} 筆
                </span>
            }
        >
            <div className="space-y-2">
                {pendingOrders.map(order => {
                    const isBuy = order.side === 'buy';
                    const color = isBuy ? getBuyColor() : getSellColor();
                    const bgClass = isBuy ? getBuyBg() : getSellBg();

                    return (
                        <div
                            key={order.orderId}
                            className={`p-2 rounded border ${bgClass} flex items-center justify-between`}
                        >
                            <div className="flex items-center gap-3">
                                {/* Side icon */}
                                <div className={color}>
                                    {isBuy ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                </div>

                                {/* Order info */}
                                <div className="text-xs font-mono">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold ${color}`}>
                                            {isBuy ? '買入' : '賣出'}
                                        </span>
                                        <span className="text-white">
                                            {order.remainingQuantity}
                                            {order.remainingQuantity !== order.quantity && (
                                                <span className="text-zinc-500">/{order.quantity}</span>
                                            )}
                                            股
                                        </span>
                                    </div>
                                    <div className="text-zinc-400 text-[10px] flex items-center gap-2 mt-0.5">
                                        <span>限價 ${order.limitPrice.toFixed(2)}</span>
                                        <span className="flex items-center gap-0.5">
                                            <Clock size={10} />
                                            {formatTime(order.timestamp)}
                                        </span>
                                        {order.status === 'partial' && (
                                            <span className="text-amber-400">部分成交</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Cancel button */}
                            <button
                                onClick={() => onCancelOrder(order.orderId)}
                                className="p-1.5 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-rose-400 transition-colors"
                                title="取消掛單"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
