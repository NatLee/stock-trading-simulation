'use client';

import { Sun, CloudRain, Wind, BarChart3 } from 'lucide-react';
import { MarketRegime } from '@/types';

interface MarketStatsProps {
    sentiment: number;
    regime: MarketRegime;
    translations: {
        marketVitals: string;
        sentiment: string;
        regimeBull: string;
        regimeBear: string;
        regimeChop: string;
    };
    isAsianTheme?: boolean;
}

export function MarketStats({ sentiment, regime, translations: t, isAsianTheme = true }: MarketStatsProps) {
    const getRegimeIcon = () => {
        switch (regime) {
            case 'BULL':
                return <Sun size={14} className="text-yellow-500" />;
            case 'BEAR':
                return <CloudRain size={14} className="text-blue-400" />;
            default:
                return <Wind size={14} className="text-zinc-400" />;
        }
    };

    const getRegimeLabel = () => {
        switch (regime) {
            case 'BULL':
                return t.regimeBull;
            case 'BEAR':
                return t.regimeBear;
            default:
                return t.regimeChop;
        }
    };

    // Color based on theme
    const positiveColor = isAsianTheme ? 'text-rose-500' : 'text-emerald-500';
    const negativeColor = isAsianTheme ? 'text-emerald-500' : 'text-rose-500';
    const positiveBg = isAsianTheme ? 'bg-rose-500' : 'bg-emerald-500';
    const negativeBg = isAsianTheme ? 'bg-emerald-900/30' : 'bg-rose-900/30';

    return (
        <div className="space-y-2 border-t border-b border-zinc-800/50 py-3">
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">
                <BarChart3 size={10} />
                {t.marketVitals}
            </div>

            {/* Regime Display */}
            <div className="flex justify-between items-center bg-zinc-950 p-2 rounded border border-zinc-800/50 mb-2">
                <div className="flex items-center gap-2">
                    {getRegimeIcon()}
                    <span className="text-[10px] font-bold text-zinc-300">
                        {getRegimeLabel()}
                    </span>
                </div>
            </div>

            {/* Sentiment Bar */}
            <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>{t.sentiment}</span>
                    <span className={sentiment > 50 ? positiveColor : negativeColor}>
                        {Math.floor(sentiment)}%
                    </span>
                </div>
                <div className={`h-1.5 w-full ${negativeBg} rounded-full overflow-hidden`}>
                    <div
                        className={`h-full ${positiveBg} transition-all duration-1000 ease-out`}
                        style={{ width: `${sentiment}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
