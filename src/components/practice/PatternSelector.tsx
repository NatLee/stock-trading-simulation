'use client';

import { Shuffle } from 'lucide-react';
import { PatternInfo, PatternType } from '@/data/practice/types';
import { getAvailablePatterns } from '@/data/practice/patternScenarios';

interface PatternSelectorProps {
    selectedPattern: PatternType | null;
    onPatternSelect: (pattern: PatternType) => void;
}

const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
    reversal: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' },
    continuation: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    consolidation: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
};

const categoryNames: Record<string, string> = {
    reversal: '反轉型態',
    continuation: '持續型態',
    consolidation: '整理型態',
};

export function PatternSelector({ selectedPattern, onPatternSelect }: PatternSelectorProps) {
    const availablePatterns = getAvailablePatterns();
    
    // Group patterns by category
    const groupedPatterns = availablePatterns.reduce((acc, pattern) => {
        const category = pattern.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(pattern);
        return acc;
    }, {} as Record<string, PatternInfo[]>);
    
    return (
        <div className="space-y-4">
            <h3 className="text-xs font-medium text-zinc-500 px-2">選擇型態</h3>
            
            {Object.entries(groupedPatterns).map(([category, patterns]) => {
                const colors = categoryColors[category];
                return (
                    <div key={category} className="space-y-2">
                        <div className={`text-xs px-2 py-1 rounded border inline-block ${colors.bg} ${colors.border} ${colors.text}`}>
                            {categoryNames[category]}
                        </div>
                        <div className="space-y-1">
                            {patterns.map((pattern) => (
                                <button
                                    key={pattern.id}
                                    onClick={() => onPatternSelect(pattern.id)}
                                    className={`w-full p-2.5 rounded-lg text-left text-sm transition-all ${
                                        selectedPattern === pattern.id
                                            ? 'bg-indigo-600/20 border border-indigo-500/50 text-white'
                                            : 'bg-zinc-900/30 border border-transparent text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                                    }`}
                                >
                                    <div className="font-medium">{pattern.name}</div>
                                    <div className="text-xs text-zinc-500">{pattern.nameEn}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
            
            {/* Random button */}
            <button
                onClick={() => {
                    const randomIndex = Math.floor(Math.random() * availablePatterns.length);
                    onPatternSelect(availablePatterns[randomIndex].id);
                }}
                className="w-full p-3 rounded-lg border border-dashed border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/30 transition-all flex items-center justify-center gap-2"
            >
                <Shuffle size={16} />
                <span>隨機選擇</span>
            </button>
        </div>
    );
}
