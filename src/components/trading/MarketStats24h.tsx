'use client';

import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';
import { MarketScenario } from '@/lib/matching';

interface MarketStats24hProps {
    currentPrice: number;
    high24h: number;
    low24h: number;
    change24h: number;
    changePercent24h: number;
    volume24h: number;
    spread: number;
    scenario: MarketScenario;
    isAsianTheme?: boolean;
}

const SCENARIO_LABELS: Record<MarketScenario, { label: string; color: string }> = {
    bull: { label: '牛市', color: 'text-emerald-400' },
    bear: { label: '熊市', color: 'text-rose-400' },
    sideways: { label: '盤整', color: 'text-zinc-400' },
    volatile: { label: '高波動', color: 'text-amber-400' },
    calm: { label: '平靜', color: 'text-blue-400' },
};

/**
 * Enhanced market stats with 24h data display
 */
export function MarketStats24h({
    currentPrice,
    high24h,
    low24h,
    change24h,
    changePercent24h,
    volume24h,
    spread,
    scenario,
    isAsianTheme = true,
}: MarketStats24hProps) {
    const isPositive = change24h >= 0;

    const getTextColor = (positive: boolean) => {
        if (isAsianTheme) {
            return positive ? 'text-rose-400' : 'text-emerald-400';
        }
        return positive ? 'text-emerald-400' : 'text-rose-400';
    };

    const scenarioInfo = SCENARIO_LABELS[scenario];

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-3">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <BarChart3 size={14} className="text-indigo-400" />
                    <span className="text-xs font-bold text-zinc-400">市場概況</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-800 ${scenarioInfo.color}`}>
                    {scenarioInfo.label}
                </span>
            </div>

            {/* Current Price */}
            <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-white font-mono">
                    ${currentPrice.toFixed(2)}
                </span>
                <div className={`flex items-center gap-1 ${getTextColor(isPositive)}`}>
                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span className="text-sm font-medium">
                        {isPositive ? '+' : ''}{change24h.toFixed(2)}
                    </span>
                    <span className="text-xs">
                        ({isPositive ? '+' : ''}{changePercent24h.toFixed(2)}%)
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-800/50 rounded p-2">
                    <div className="text-[10px] text-zinc-500 mb-0.5">24H 最高</div>
                    <div className={`text-sm font-mono font-medium ${isAsianTheme ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ${high24h.toFixed(2)}
                    </div>
                </div>
                <div className="bg-zinc-800/50 rounded p-2">
                    <div className="text-[10px] text-zinc-500 mb-0.5">24H 最低</div>
                    <div className={`text-sm font-mono font-medium ${isAsianTheme ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ${low24h.toFixed(2)}
                    </div>
                </div>
                <div className="bg-zinc-800/50 rounded p-2">
                    <div className="text-[10px] text-zinc-500 mb-0.5">24H 成交額</div>
                    <div className="text-sm font-mono font-medium text-white">
                        ${(volume24h / 1000).toFixed(1)}K
                    </div>
                </div>
                <div className="bg-zinc-800/50 rounded p-2">
                    <div className="text-[10px] text-zinc-500 mb-0.5">買賣價差</div>
                    <div className="text-sm font-mono font-medium text-amber-400">
                        ${spread.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Price Range Bar */}
            <div className="mt-3">
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                    <span>24H 價格區間</span>
                    <span>{((currentPrice - low24h) / (high24h - low24h || 1) * 100).toFixed(0)}%</span>
                </div>
                <div className="relative h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-rose-500 opacity-50"
                        style={{ width: '100%' }}
                    />
                    <div
                        className="absolute top-0 bottom-0 w-1 bg-white rounded-full transform -translate-x-1/2"
                        style={{
                            left: `${Math.max(0, Math.min(100, ((currentPrice - low24h) / (high24h - low24h || 1) * 100)))}%`
                        }}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
                    <span>${low24h.toFixed(2)}</span>
                    <span>${high24h.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}
