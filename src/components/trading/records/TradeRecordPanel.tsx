'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Eye } from 'lucide-react';
import { OrderRecord } from '@/types';
import { Card } from '@/components/ui';

interface OrderHistoryPanelProps {
    orders: OrderRecord[];
    currentPrice?: number;
    translations: {
        title: string;
        viewAll: string;
        time: string;
        type: string;
        qty: string;
        entryPrice: string;
        pnlLabel: string;
    };
    isAsianTheme?: boolean;
}

export function OrderHistoryPanel({ orders, currentPrice = 0, translations: t, isAsianTheme = true }: OrderHistoryPanelProps) {
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

    const formatTime = (timestamp: number) => {
        const d = new Date(timestamp);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    };

    const formatDate = (timestamp: number) => {
        const d = new Date(timestamp);
        return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    };

    // Helper for P&L color and sign
    const getPnlDisplay = (pnl: number) => {
        const isPositive = pnl >= 0;
        const color = isAsianTheme
            ? (isPositive ? 'text-rose-400' : 'text-emerald-400')
            : (isPositive ? 'text-emerald-400' : 'text-rose-400');
        const sign = isPositive ? '+' : '';
        return { color, text: `${sign}${pnl.toFixed(2)}` };
    };

    // Calculate summary stats
    const totalBought = orders.filter(o => o.side === 'buy').reduce((sum, o) => sum + o.total, 0);
    const totalSold = orders.filter(o => o.side === 'sell').reduce((sum, o) => sum + o.total, 0);
    const totalCommission = orders.reduce((sum, o) => sum + o.commission, 0);
    const totalPnl = orders.reduce((sum, o) => sum + (o.pnl || 0), 0);
    const totalPnlDisplay = getPnlDisplay(totalPnl);

    return (
        <Card title={t.title}>
            {orders.length === 0 ? (
                <div className="py-12 text-center text-zinc-600 text-sm italic">
                    暫無帳戶交易流水記錄
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Summary Stats Grid */}
                    <div className="grid grid-cols-4 gap-2 p-3 bg-zinc-900/80 border border-white/5 rounded-lg text-[10px] font-mono">
                        <div>
                            <div className="text-zinc-500 mb-1 uppercase tracking-tighter">Buy Turnover</div>
                            <div className={`font-bold ${isAsianTheme ? 'text-rose-400' : 'text-emerald-400'}`}>${totalBought.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        </div>
                        <div>
                            <div className="text-zinc-500 mb-1 uppercase tracking-tighter">Sell Turnover</div>
                            <div className={`font-bold ${isAsianTheme ? 'text-emerald-400' : 'text-rose-400'}`}>${totalSold.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        </div>
                        <div>
                            <div className="text-zinc-500 mb-1 uppercase tracking-tighter">Commission</div>
                            <div className="text-amber-500/80 font-bold">${totalCommission.toFixed(2)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-zinc-500 mb-1 uppercase tracking-tighter font-sans">Realized P&L</div>
                            <div className={`font-black ${totalPnlDisplay.color}`}>{totalPnlDisplay.text}</div>
                        </div>
                    </div>

                    {/* Order List */}
                    <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                        {orders.map(order => {
                            const pnlDisplay = order.pnl !== undefined ? getPnlDisplay(order.pnl) : null;
                            const itemKey = order.tradeId || order.orderId;

                            return (
                                <div key={itemKey} className="py-2">
                                    {/* Main Row */}
                                    <button
                                        onClick={() => setExpandedOrder(expandedOrder === itemKey ? null : itemKey)}
                                        className="w-full flex items-center gap-2 text-xs font-mono hover:bg-zinc-800/30 rounded px-1 transition-colors"
                                    >
                                        <span className="text-zinc-600 w-12 text-left">
                                            {formatTime(order.timestamp)}
                                        </span>
                                        <span
                                            className={`w-8 font-bold ${order.side === 'buy'
                                                ? (isAsianTheme ? 'text-rose-500' : 'text-emerald-500')
                                                : (isAsianTheme ? 'text-emerald-500' : 'text-rose-500')
                                                }`}
                                        >
                                            {order.side === 'buy' ? '買' : '賣'}
                                        </span>
                                        <span className="text-white w-10 text-right">{order.quantity}</span>
                                        <span className="text-zinc-500">@</span>
                                        <span className="text-white flex-1 text-left">${order.price.toFixed(2)}</span>
                                        <span className="text-yellow-500 w-16 text-right">${order.total.toFixed(0)}</span>
                                        {pnlDisplay && order.pnl !== 0 && (
                                            <span className={`w-16 text-right ${pnlDisplay.color}`}>
                                                {pnlDisplay.text}
                                            </span>
                                        )}
                                        <ChevronDown
                                            size={12}
                                            className={`text-zinc-600 transition-transform ${expandedOrder === itemKey ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {/* Expanded Details */}
                                    {expandedOrder === itemKey && (
                                        <div className="mt-2 ml-4 p-3 bg-zinc-800/50 rounded text-[10px] font-mono space-y-1.5 animate-in slide-in-from-top-1">
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">訂單編號</span>
                                                <span className="text-zinc-300">{order.orderId}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">成交日期</span>
                                                <span className="text-zinc-300">{formatDate(order.timestamp)} {formatTime(order.timestamp)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">成交價格</span>
                                                <span className="text-white">${order.price.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">成交數量</span>
                                                <span className="text-white">{order.quantity} 股</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">成交金額</span>
                                                <span className="text-yellow-400">${order.total.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">手續費</span>
                                                <span className="text-amber-400">${order.commission.toFixed(2)}</span>
                                            </div>
                                            {order.pnl !== undefined && (
                                                <div className="flex justify-between pt-1 border-t border-zinc-700">
                                                    <span className="text-zinc-500">實現盈虧</span>
                                                    <span className={pnlDisplay?.color}>{pnlDisplay?.text}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </Card>
    );
}
