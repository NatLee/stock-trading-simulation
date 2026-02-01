'use client';

import { Target, TrendingUp, Clock } from 'lucide-react';
import { PracticeMode } from '@/data/practice/types';

interface ModeSelectorProps {
    currentMode: PracticeMode;
    onModeChange: (mode: PracticeMode) => void;
}

const modes: { id: PracticeMode; name: string; description: string; icon: typeof Target; color: string }[] = [
    {
        id: 'recognition',
        name: '型態辨識',
        description: '限時辨識K線型態',
        icon: Target,
        color: 'amber',
    },
    {
        id: 'trading',
        name: '交易練習',
        description: '在特定型態上練習買賣',
        icon: TrendingUp,
        color: 'emerald',
    },
    {
        id: 'replay',
        name: '歷史回放',
        description: '逐根K線回放練習',
        icon: Clock,
        color: 'indigo',
    },
];

const colorClasses: Record<string, { bg: string; border: string; text: string; activeBg: string }> = {
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', activeBg: 'bg-amber-500/20' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', activeBg: 'bg-emerald-500/20' },
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', activeBg: 'bg-indigo-500/20' },
};

export function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
    return (
        <div className="space-y-2">
            <h3 className="text-xs font-medium text-zinc-500 mb-3 px-2">練習模式</h3>
            <div className="space-y-1">
                {modes.map((mode) => {
                    const isActive = currentMode === mode.id;
                    const colors = colorClasses[mode.color];
                    const Icon = mode.icon;
                    
                    return (
                        <button
                            key={mode.id}
                            onClick={() => onModeChange(mode.id)}
                            className={`w-full p-3 rounded-lg border transition-all text-left ${
                                isActive
                                    ? `${colors.activeBg} ${colors.border} ${colors.text}`
                                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isActive ? colors.bg : 'bg-zinc-800'}`}>
                                    <Icon size={18} className={isActive ? colors.text : 'text-zinc-500'} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`font-medium ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                                        {mode.name}
                                    </div>
                                    <div className="text-xs text-zinc-500 truncate">{mode.description}</div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
