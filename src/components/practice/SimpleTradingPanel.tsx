'use client';

import { useState } from 'react';
import { PracticePosition, PracticeTrade } from '@/data/practice/types';

interface SimpleTradingPanelProps {
    currentPrice: number;
    balance: number;
    position: PracticePosition | null;
    trades: PracticeTrade[];
    onBuy: (quantity: number) => void;
    onSell: (quantity: number) => void;
    onClosePosition: () => void;
    isAsianTheme?: boolean;
}

export function SimpleTradingPanel({
    currentPrice,
    balance,
    position,
    trades,
    onBuy,
    onSell,
    onClosePosition,
    isAsianTheme = true,
}: SimpleTradingPanelProps) {
    const [quantity, setQuantity] = useState(100);
    
    const maxBuyQuantity = currentPrice > 0 ? Math.floor(balance / currentPrice) : 0;
    const canSell = position && position.quantity > 0;
    
    const handleQuantityChange = (value: number) => {
        setQuantity(Math.max(1, Math.min(value, maxBuyQuantity)));
    };
    
    // Calculate total cost
    const totalCost = quantity * currentPrice;
    const commission = totalCost * 0.001425;
    
    // Color based on theme
    const upColor = isAsianTheme ? 'text-rose-400' : 'text-emerald-400';
    const downColor = isAsianTheme ? 'text-emerald-400' : 'text-rose-400';
    
    return (
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 space-y-4">
            {/* Current Price */}
            <div className="text-center pb-4 border-b border-zinc-700">
                <div className="text-xs text-zinc-500 mb-1">目前價格</div>
                <div className="text-3xl font-bold text-white font-mono">
                    ${currentPrice.toFixed(2)}
                </div>
            </div>
            
            {/* Balance & Position */}
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <div className="text-zinc-500 text-xs">可用資金</div>
                    <div className="text-white font-mono">${balance.toLocaleString()}</div>
                </div>
                <div>
                    <div className="text-zinc-500 text-xs">持有股數</div>
                    <div className="text-white font-mono">{position?.quantity || 0}</div>
                </div>
            </div>
            
            {/* Position details */}
            {position && position.quantity > 0 && (
                <div className="bg-zinc-900/50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">平均成本</span>
                        <span className="text-white font-mono">${position.averageCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">未實現損益</span>
                        <span className={`font-mono ${position.unrealizedPnL >= 0 ? upColor : downColor}`}>
                            {position.unrealizedPnL >= 0 ? '+' : ''}
                            ${position.unrealizedPnL.toFixed(0)}
                            ({position.unrealizedPnLPercent >= 0 ? '+' : ''}
                            {position.unrealizedPnLPercent.toFixed(2)}%)
                        </span>
                    </div>
                </div>
            )}
            
            {/* Quantity Input */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-500">
                    <span>交易數量</span>
                    <span>最大: {maxBuyQuantity}</span>
                </div>
                <input
                    type="number"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                    min={1}
                    max={maxBuyQuantity}
                />
                {/* Quick quantity buttons */}
                <div className="grid grid-cols-4 gap-1">
                    {[10, 50, 100, 500].map((q) => (
                        <button
                            key={q}
                            onClick={() => setQuantity(Math.min(q, maxBuyQuantity))}
                            className={`py-1.5 rounded text-xs font-medium transition-all ${
                                quantity === q
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-600/50'
                            }`}
                        >
                            {q}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Order Preview */}
            <div className="text-xs text-zinc-500 space-y-1 bg-zinc-900/30 rounded-lg p-2">
                <div className="flex justify-between">
                    <span>交易金額</span>
                    <span className="text-zinc-300">${totalCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span>手續費</span>
                    <span className="text-zinc-300">${commission.toFixed(0)}</span>
                </div>
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => onBuy(quantity)}
                    disabled={currentPrice <= 0 || quantity <= 0 || totalCost + commission > balance}
                    className={`py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        isAsianTheme
                            ? 'bg-rose-600 hover:bg-rose-500 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                >
                    買入
                </button>
                <button
                    onClick={() => onSell(quantity)}
                    disabled={!canSell || quantity > (position?.quantity || 0)}
                    className={`py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        isAsianTheme
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                >
                    賣出
                </button>
            </div>
            
            {/* Close Position Button */}
            {canSell && (
                <button
                    onClick={onClosePosition}
                    className="w-full py-2 rounded-lg bg-amber-600/20 border border-amber-600/50 text-amber-400 hover:bg-amber-600/30 transition-all text-sm"
                >
                    平倉 (賣出全部 {position.quantity} 股)
                </button>
            )}
            
            {/* Trade History */}
            {trades.length > 0 && (
                <div className="pt-4 border-t border-zinc-700">
                    <div className="text-xs text-zinc-500 mb-2">交易紀錄 ({trades.length})</div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                        {trades.slice().reverse().map((trade) => (
                            <div
                                key={trade.id}
                                className="flex justify-between text-xs bg-zinc-900/50 rounded px-2 py-1"
                            >
                                <span className={trade.action === 'buy'
                                    ? (isAsianTheme ? 'text-rose-400' : 'text-emerald-400')
                                    : (isAsianTheme ? 'text-emerald-400' : 'text-rose-400')
                                }>
                                    {trade.action === 'buy' ? '買入' : '賣出'}
                                </span>
                                <span className="text-zinc-400">{trade.quantity} 股</span>
                                <span className="text-white font-mono">${trade.price.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
