'use client';

import { Target, TrendingUp, Clock, Shuffle, Zap, ChevronRight, BarChart3 } from 'lucide-react';
import { PracticeMode, PatternType } from '@/data/practice/types';
import { PATTERN_INFO } from '@/data/practice/patternScenarios';

interface WelcomePageProps {
    onModeSelect: (mode: PracticeMode) => void;
    onPatternSelect: (pattern: PatternType) => void;
    onRandomStart: () => void;
}

// Popular patterns for quick access
const POPULAR_PATTERNS: PatternType[] = [
    'head-and-shoulders-top',
    'double-bottom',
    'ascending-triangle',
    'bull-flag',
    'morning-star',
    'hammer',
];

const modeConfig = [
    {
        id: 'recognition' as PracticeMode,
        name: '型態辨識',
        description: '限時辨識K線型態，訓練你的技術分析眼力',
        icon: Target,
        color: 'amber',
        features: ['5題隨機挑戰', '30秒限時作答', '即時計分'],
    },
    {
        id: 'trading' as PracticeMode,
        name: '交易練習',
        description: '在特定型態上練習買賣，體驗真實交易決策',
        icon: TrendingUp,
        color: 'emerald',
        features: ['模擬下單', '損益計算', '進出場評分'],
    },
    {
        id: 'replay' as PracticeMode,
        name: '歷史回放',
        description: '逐根K線觀察價格走勢，掌握型態演變過程',
        icon: Clock,
        color: 'indigo',
        features: ['逐K播放', '速度可調', '隨時進場'],
    },
];

const colorClasses = {
    amber: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        hoverBg: 'hover:bg-amber-500/20',
        iconBg: 'bg-amber-500/20',
    },
    emerald: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        hoverBg: 'hover:bg-emerald-500/20',
        iconBg: 'bg-emerald-500/20',
    },
    indigo: {
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/30',
        text: 'text-indigo-400',
        hoverBg: 'hover:bg-indigo-500/20',
        iconBg: 'bg-indigo-500/20',
    },
};

export function WelcomePage({ onModeSelect, onPatternSelect, onRandomStart }: WelcomePageProps) {
    return (
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 py-4 md:py-8">
            {/* Header */}
            <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
                    <Zap className="text-amber-400" size={18} />
                    <span className="text-amber-400 font-medium">實戰練習</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                    精進你的交易技巧
                </h1>
                <p className="text-zinc-400 text-sm md:text-base max-w-lg mx-auto">
                    透過三種練習模式，從型態辨識到實戰操作，全方位提升你的技術分析能力
                </p>
            </div>

            {/* Mode Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                {modeConfig.map((mode) => {
                    const colors = colorClasses[mode.color as keyof typeof colorClasses];
                    const Icon = mode.icon;
                    
                    return (
                        <button
                            key={mode.id}
                            onClick={() => onModeSelect(mode.id)}
                            className={`p-4 md:p-5 rounded-xl border ${colors.border} ${colors.bg} ${colors.hoverBg} transition-all text-left group`}
                        >
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${colors.iconBg} flex items-center justify-center mb-3 md:mb-4`}>
                                <Icon className={colors.text} size={20} />
                            </div>
                            <h3 className={`text-lg font-bold ${colors.text} mb-1`}>
                                {mode.name}
                            </h3>
                            <p className="text-zinc-400 text-sm mb-3">
                                {mode.description}
                            </p>
                            <div className="space-y-1">
                                {mode.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs text-zinc-500">
                                        <div className={`w-1 h-1 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
                                        {feature}
                                    </div>
                                ))}
                            </div>
                            <div className={`mt-4 flex items-center gap-1 text-sm ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                <span>開始練習</span>
                                <ChevronRight size={16} />
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs text-zinc-600">或選擇型態直接開始</span>
                <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Popular Patterns */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <BarChart3 size={16} className="text-zinc-500" />
                    <h3 className="text-sm font-medium text-zinc-400">熱門練習型態</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {POPULAR_PATTERNS.map((patternId) => {
                        const pattern = PATTERN_INFO[patternId];
                        if (!pattern) return null;
                        
                        const signalColor = pattern.signal === 'bullish' 
                            ? 'bg-emerald-400' 
                            : pattern.signal === 'bearish' 
                                ? 'bg-rose-400' 
                                : 'bg-amber-400';
                        
                        return (
                            <button
                                key={patternId}
                                onClick={() => onPatternSelect(patternId)}
                                className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 transition-all text-left group"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${signalColor}`} />
                                    <span className="text-xs text-zinc-500 truncate">{pattern.nameEn}</span>
                                </div>
                                <div className="text-sm font-medium text-white truncate group-hover:text-indigo-400 transition-colors">
                                    {pattern.name}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Random Start Button */}
            <div className="pt-2">
                <button
                    onClick={onRandomStart}
                    className="w-full p-4 rounded-xl border-2 border-dashed border-zinc-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
                >
                    <div className="flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                            <Shuffle className="text-indigo-400" size={18} />
                        </div>
                        <div className="text-left">
                            <div className="font-medium text-white group-hover:text-indigo-400 transition-colors">
                                隨機開始練習
                            </div>
                            <div className="text-xs text-zinc-500">
                                系統將隨機選擇一個型態開始交易練習
                            </div>
                        </div>
                    </div>
                </button>
            </div>

            {/* Stats hint */}
            <div className="text-center text-xs text-zinc-600">
                目前共有 <span className="text-zinc-400">{Object.keys(PATTERN_INFO).length}</span> 種型態可供練習
            </div>
        </div>
    );
}
