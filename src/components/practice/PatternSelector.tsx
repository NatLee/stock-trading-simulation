'use client';

import { PatternInfo, PatternType } from '@/data/practice/types';
import { getAvailablePatterns, PATTERN_INFO } from '@/data/practice/patternScenarios';

interface PatternSelectorProps {
    selectedPattern: PatternType | null;
    onPatternSelect: (pattern: PatternType) => void;
}

const categoryColors = {
    reversal: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
    continuation: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    consolidation: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
};

const categoryNames = {
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
            <h3 className="text-sm font-medium text-zinc-400">選擇型態</h3>
            
            {Object.entries(groupedPatterns).map(([category, patterns]) => (
                <div key={category} className="space-y-2">
                    <div className={`text-xs px-2 py-1 rounded border inline-block ${categoryColors[category as keyof typeof categoryColors]}`}>
                        {categoryNames[category as keyof typeof categoryNames]}
                    </div>
                    <div className="space-y-1">
                        {patterns.map((pattern) => (
                            <button
                                key={pattern.id}
                                onClick={() => onPatternSelect(pattern.id)}
                                className={`w-full p-2 rounded text-left text-sm transition-all ${
                                    selectedPattern === pattern.id
                                        ? 'bg-indigo-600/30 text-white'
                                        : 'bg-zinc-800/30 text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                                }`}
                            >
                                <div className="font-medium">{pattern.name}</div>
                                <div className="text-xs text-zinc-500 truncate">{pattern.nameEn}</div>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            
            {/* Random button */}
            <button
                onClick={() => {
                    const randomIndex = Math.floor(Math.random() * availablePatterns.length);
                    onPatternSelect(availablePatterns[randomIndex].id);
                }}
                className="w-full p-3 rounded-lg border border-dashed border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-all"
            >
                🎲 隨機選擇
            </button>
        </div>
    );
}
