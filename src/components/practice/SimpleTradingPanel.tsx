'use client';

import { useState } from 'react';
import { PracticePosition, PracticeTrade } from '@/data/practice/types';

const SHARES_PER_LOT = 1000; // 1張 = 1000股

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
    const [quantity, setQuantity] = useState(1); // 預設 1 張
    
    // 計算最大可買張數（每張 = 1000股）
    const costPerLot = currentPrice * SHARES_PER_LOT;
    const maxBuyLots = currentPrice > 0 ? Math.floor(balance / (costPerLot * 1.001425)) : 0; // 含手續費
    
    // 計算做空所需保證金（50%）
    const marginPerLot = costPerLot * 0.5;
    const maxShortLots = currentPrice > 0 ? Math.floor(balance / marginPerLot) : 0;
    
    // 判斷部位狀態
    const isLong = position && !position.isShort && position.quantity > 0;
    const isShort = position && position.isShort && position.quantity > 0;
    const hasPosition = isLong || isShort;
    
    const handleQuantityChange = (value: number) => {
        const max = isShort ? maxShortLots : maxBuyLots;
        setQuantity(Math.max(1, Math.min(value, Math.max(max, 1))));
    };
    
    // 計算交易金額（以張為單位）
    const totalCost = quantity * costPerLot;
    const commission = totalCost * 0.001425;
    
    // Color based on theme
    const upColor = isAsianTheme ? 'text-rose-400' : 'text-emerald-400';
    const downColor = isAsianTheme ? 'text-emerald-400' : 'text-rose-400';
    const upBg = isAsianTheme ? 'bg-rose-600' : 'bg-emerald-600';
    const downBg = isAsianTheme ? 'bg-emerald-600' : 'bg-rose-600';
    
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
                    <div className="text-zinc-500 text-xs">持有張數</div>
                    <div className="flex items-center gap-1">
                        <span className="text-white font-mono">{position?.quantity || 0}</span>
                        {isShort && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-600/20 text-cyan-400">空</span>
                        )}
                        {isLong && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-600/20 text-amber-400">多</span>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Position details */}
            {hasPosition && position && (
                <div className={`rounded-lg p-3 space-y-2 ${
                    isShort ? 'bg-cyan-900/20 border border-cyan-800/30' : 'bg-zinc-900/50'
                }`}>
                    <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">
                            {isShort ? '做空均價' : '平均成本'}
                        </span>
                        <span className="text-white font-mono">${position.averageCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">未實現損益</span>
                        <span className={`font-mono ${position.unrealizedPnL >= 0 ? upColor : downColor}`}>
                            {position.unrealizedPnL >= 0 ? '+' : ''}
                            ${position.unrealizedPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            <span className="text-xs ml-1">
                                ({position.unrealizedPnLPercent >= 0 ? '+' : ''}
                                {position.unrealizedPnLPercent.toFixed(2)}%)
                            </span>
                        </span>
                    </div>
                </div>
            )}
            
            {/* Quantity Input */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-500">
                    <span>交易張數</span>
                    <span>
                        {isShort 
                            ? `可回補: ${position?.quantity || 0} 張`
                            : isLong 
                                ? `可賣: ${position?.quantity || 0} 張 / 可買: ${maxBuyLots} 張`
                                : `可買: ${maxBuyLots} 張 / 可空: ${maxShortLots} 張`
                        }
                    </span>
                </div>
                <input
                    type="number"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                    min={1}
                />
                {/* Quick quantity buttons */}
                <div className="grid grid-cols-4 gap-1">
                    {[1, 5, 10, 50].map((q) => (
                        <button
                            key={q}
                            onClick={() => setQuantity(q)}
                            className={`py-1.5 rounded text-xs font-medium transition-all ${
                                quantity === q
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-600/50'
                            }`}
                        >
                            {q} 張
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
                    <span className="text-zinc-300">${commission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between">
                    <span>股數 (1張=1000股)</span>
                    <span className="text-zinc-300">{(quantity * SHARES_PER_LOT).toLocaleString()} 股</span>
                </div>
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => onBuy(quantity)}
                    disabled={currentPrice <= 0 || quantity <= 0 || (isShort ? false : totalCost + commission > balance)}
                    className={`py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${upBg} hover:opacity-90 text-white`}
                >
                    {isShort ? '回補' : '買入'}
                </button>
                <button
                    onClick={() => onSell(quantity)}
                    disabled={currentPrice <= 0 || quantity <= 0 || (isLong ? quantity > position!.quantity : marginPerLot * quantity > balance)}
                    className={`py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${downBg} hover:opacity-90 text-white`}
                >
                    {isLong ? '賣出' : '做空'}
                </button>
            </div>
            
            {/* Close Position Button */}
            {hasPosition && position && (
                <button
                    onClick={onClosePosition}
                    className={`w-full py-2 rounded-lg border text-sm transition-all ${
                        isShort 
                            ? 'bg-cyan-600/20 border-cyan-600/50 text-cyan-400 hover:bg-cyan-600/30'
                            : 'bg-amber-600/20 border-amber-600/50 text-amber-400 hover:bg-amber-600/30'
                    }`}
                >
                    {isShort 
                        ? `空頭平倉 (回補 ${position.quantity} 張)`
                        : `多頭平倉 (賣出 ${position.quantity} 張)`
                    }
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
                                <span className={trade.action === 'buy' ? upColor : downColor}>
                                    {trade.action === 'buy' ? '買入' : '賣出'}
                                </span>
                                <span className="text-zinc-400">{trade.quantity} 張</span>
                                <span className="text-white font-mono">${trade.price.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
