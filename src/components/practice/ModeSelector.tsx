'use client';

import { PracticeMode } from '@/data/practice/types';

interface ModeSelectorProps {
    currentMode: PracticeMode;
    onModeChange: (mode: PracticeMode) => void;
}

const modes: { id: PracticeMode; name: string; description: string; icon: string }[] = [
    {
        id: 'recognition',
        name: '型態辨識',
        description: '限時辨識K線型態',
        icon: '🎯',
    },
    {
        id: 'trading',
        name: '交易練習',
        description: '在特定型態上練習買賣',
        icon: '📈',
    },
    {
        id: 'replay',
        name: '歷史回放',
        description: '逐根K線回放練習',
        icon: '⏱️',
    },
];

export function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">練習模式</h3>
            <div className="space-y-2">
                {modes.map((mode) => (
                    <button
                        key={mode.id}
                        onClick={() => onModeChange(mode.id)}
                        className={`w-full p-3 rounded-lg border transition-all text-left ${
                            currentMode === mode.id
                                ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl">{mode.icon}</span>
                            <div>
                                <div className="font-medium">{mode.name}</div>
                                <div className="text-xs text-zinc-500">{mode.description}</div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
