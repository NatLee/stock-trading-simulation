'use client';

import { Target, TrendingUp, Clock, Shuffle, Zap, ArrowRight, Sparkles, Play } from 'lucide-react';
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
        subtitle: 'Pattern Recognition',
        description: '限時辨識 K 線型態，訓練你的圖表解讀能力',
        icon: Target,
        gradient: 'from-amber-500 to-orange-600',
        bgGlow: 'bg-amber-500/20',
        features: ['5 題隨機挑戰', '30 秒限時作答', '即時計分反饋'],
    },
    {
        id: 'trading' as PracticeMode,
        name: '交易練習',
        subtitle: 'Trading Practice',
        description: '在真實型態上模擬交易，練習最佳進出場時機',
        icon: TrendingUp,
        gradient: 'from-emerald-500 to-teal-600',
        bgGlow: 'bg-emerald-500/20',
        features: ['模擬下單操作', '即時損益追蹤', '進出場評分'],
    },
    {
        id: 'replay' as PracticeMode,
        name: '歷史回放',
        subtitle: 'Market Replay',
        description: '逐根 K 線觀察走勢演變，深入理解型態形成過程',
        icon: Clock,
        gradient: 'from-indigo-500 to-purple-600',
        bgGlow: 'bg-indigo-500/20',
        features: ['逐 K 播放控制', '播放速度可調', '隨時進場交易'],
    },
];

export function WelcomePage({ onModeSelect, onPatternSelect, onRandomStart }: WelcomePageProps) {
    return (
        <div className="max-w-5xl mx-auto py-6 md:py-10 px-2">
            {/* Hero Section */}
            <div className="text-center mb-10 md:mb-14">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-6">
                    <Sparkles className="text-amber-400" size={16} />
                    <span className="text-amber-400 text-sm font-medium">實戰練習模式</span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                    精進你的
                    <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent"> 交易技巧</span>
                </h1>
                <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                    透過三種練習模式，從型態辨識到實戰操作，<br className="hidden sm:block" />
                    全方位提升你的技術分析能力
                </p>
            </div>

            {/* Mode Cards - Main CTA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-12">
                {modeConfig.map((mode) => {
                    const Icon = mode.icon;
                    
                    return (
                        <button
                            key={mode.id}
                            onClick={() => onModeSelect(mode.id)}
                            className="group relative overflow-hidden rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 text-left"
                        >
                            {/* Background Glow Effect */}
                            <div className={`absolute -top-20 -right-20 w-40 h-40 ${mode.bgGlow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                            
                            <div className="relative p-6 md:p-7">
                                {/* Icon */}
                                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon className="text-white" size={24} />
                                </div>
                                
                                {/* Title */}
                                <div className="mb-3">
                                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-300 group-hover:bg-clip-text transition-all">
                                        {mode.name}
                                    </h3>
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider">{mode.subtitle}</p>
                                </div>
                                
                                {/* Description */}
                                <p className="text-zinc-400 text-sm mb-5 leading-relaxed">
                                    {mode.description}
                                </p>
                                
                                {/* Features */}
                                <div className="space-y-2 mb-5">
                                    {mode.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-center gap-2.5 text-sm text-zinc-500">
                                            <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${mode.gradient}`} />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* CTA Button */}
                                <div className={`flex items-center gap-2 text-sm font-medium bg-gradient-to-r ${mode.gradient} bg-clip-text text-transparent`}>
                                    <Play size={14} className="text-current opacity-80" style={{ fill: 'currentColor' }} />
                                    <span>開始練習</span>
                                    <ArrowRight size={14} className="text-current opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Quick Start Section */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
                    {/* Random Start */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                <Shuffle className="text-white" size={18} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">快速開始</h3>
                                <p className="text-xs text-zinc-500">系統隨機選擇型態開始練習</p>
                            </div>
                        </div>
                        <button
                            onClick={onRandomStart}
                            className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <Zap size={16} />
                                隨機開始練習
                            </span>
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block w-px h-20 bg-zinc-800" />
                    <div className="md:hidden h-px bg-zinc-800" />

                    {/* Popular Patterns */}
                    <div className="flex-[2]">
                        <h3 className="font-semibold text-white mb-3">熱門型態</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {POPULAR_PATTERNS.map((patternId) => {
                                const pattern = PATTERN_INFO[patternId];
                                if (!pattern) return null;
                                
                                const signalColor = pattern.signal === 'bullish' 
                                    ? 'bg-emerald-500' 
                                    : pattern.signal === 'bearish' 
                                        ? 'bg-rose-500' 
                                        : 'bg-amber-500';
                                
                                return (
                                    <button
                                        key={patternId}
                                        onClick={() => onPatternSelect(patternId)}
                                        className="group flex items-center gap-2.5 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 transition-all"
                                    >
                                        <div className={`w-2 h-2 rounded-full ${signalColor} shrink-0`} />
                                        <span className="text-sm text-zinc-300 truncate group-hover:text-white transition-colors">
                                            {pattern.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Footer */}
            <div className="mt-8 text-center">
                <p className="text-sm text-zinc-600">
                    共計 <span className="text-zinc-400 font-medium">{Object.keys(PATTERN_INFO).length}</span> 種型態、<span className="text-zinc-400 font-medium">100+</span> 個練習場景
                </p>
            </div>
        </div>
    );
}
