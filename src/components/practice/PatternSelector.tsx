'use client';

import { useState } from 'react';
import { Shuffle, ChevronDown, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { PatternInfo, PatternType } from '@/data/practice/types';
import { getAvailablePatterns } from '@/data/practice/patternScenarios';

interface PatternSelectorProps {
    selectedPattern: PatternType | null;
    onPatternSelect: (pattern: PatternType) => void;
}

const categoryConfig: Record<string, { 
    name: string; 
    icon: typeof TrendingUp;
    bg: string; 
    border: string; 
    text: string;
    activeBg: string;
}> = {
    reversal: { 
        name: '反轉型態', 
        icon: TrendingDown,
        bg: 'bg-rose-500/10', 
        border: 'border-rose-500/30', 
        text: 'text-rose-400',
        activeBg: 'bg-rose-500/20',
    },
    continuation: { 
        name: '持續型態', 
        icon: TrendingUp,
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/30', 
        text: 'text-emerald-400',
        activeBg: 'bg-emerald-500/20',
    },
    consolidation: { 
        name: '整理型態', 
        icon: Minus,
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/30', 
        text: 'text-amber-400',
        activeBg: 'bg-amber-500/20',
    },
};

export function PatternSelector({ selectedPattern, onPatternSelect }: PatternSelectorProps) {
    const availablePatterns = getAvailablePatterns();
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    
    // Group patterns by category
    const groupedPatterns = availablePatterns.reduce((acc, pattern) => {
        const category = pattern.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(pattern);
        return acc;
    }, {} as Record<string, PatternInfo[]>);
    
    // Find which category the selected pattern belongs to
    const selectedCategory = selectedPattern 
        ? availablePatterns.find(p => p.id === selectedPattern)?.category 
        : null;
    
    const toggleCategory = (category: string) => {
        setExpandedCategory(prev => prev === category ? null : category);
    };
    
    // Get selected pattern info
    const selectedPatternInfo = selectedPattern 
        ? availablePatterns.find(p => p.id === selectedPattern) 
        : null;
    
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-medium text-zinc-500">選擇型態</h3>
                <span className="text-xs text-zinc-600">{availablePatterns.length} 種</span>
            </div>
            
            {/* Selected Pattern Display */}
            {selectedPatternInfo && (
                <div className={`p-2.5 rounded-lg border ${
                    categoryConfig[selectedPatternInfo.category]?.border || 'border-indigo-500/50'
                } ${categoryConfig[selectedPatternInfo.category]?.activeBg || 'bg-indigo-600/20'}`}>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                            selectedPatternInfo.signal === 'bullish' ? 'bg-emerald-400' :
                            selectedPatternInfo.signal === 'bearish' ? 'bg-rose-400' : 'bg-amber-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-sm truncate">{selectedPatternInfo.name}</div>
                            <div className="text-xs text-zinc-400 truncate">{selectedPatternInfo.nameEn}</div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Category Accordions */}
            <div className="space-y-1">
                {Object.entries(groupedPatterns).map(([category, patterns]) => {
                    const config = categoryConfig[category];
                    const Icon = config.icon;
                    const isExpanded = expandedCategory === category;
                    const hasSelected = selectedCategory === category;
                    const selectedCount = patterns.filter(p => p.id === selectedPattern).length;
                    
                    return (
                        <div key={category} className="rounded-lg overflow-hidden">
                            {/* Category Header */}
                            <button
                                onClick={() => toggleCategory(category)}
                                className={`w-full flex items-center justify-between p-2.5 transition-all ${
                                    isExpanded 
                                        ? `${config.activeBg} ${config.border} border`
                                        : hasSelected
                                            ? `${config.bg} ${config.border} border`
                                            : 'bg-zinc-800/30 hover:bg-zinc-800/50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Icon size={14} className={config.text} />
                                    <span className={`text-sm font-medium ${isExpanded || hasSelected ? config.text : 'text-zinc-400'}`}>
                                        {config.name}
                                    </span>
                                    <span className="text-xs text-zinc-500">({patterns.length})</span>
                                </div>
                                <ChevronDown 
                                    size={14} 
                                    className={`text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                />
                            </button>
                            
                            {/* Pattern List */}
                            {isExpanded && (
                                <div className="bg-zinc-900/30 border-x border-b border-zinc-800/50 p-1.5 space-y-0.5">
                                    {patterns.map((pattern) => {
                                        const isSelected = selectedPattern === pattern.id;
                                        return (
                                            <button
                                                key={pattern.id}
                                                onClick={() => onPatternSelect(pattern.id)}
                                                className={`w-full flex items-center gap-2 p-2 rounded text-left text-sm transition-all ${
                                                    isSelected
                                                        ? 'bg-indigo-600/30 text-white'
                                                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                                                }`}
                                            >
                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                    pattern.signal === 'bullish' ? 'bg-emerald-400' :
                                                    pattern.signal === 'bearish' ? 'bg-rose-400' : 'bg-amber-400'
                                                }`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="truncate">{pattern.name}</div>
                                                </div>
                                                {isSelected && (
                                                    <div className="text-indigo-400 text-xs">✓</div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Random button */}
            <button
                onClick={() => {
                    const randomIndex = Math.floor(Math.random() * availablePatterns.length);
                    onPatternSelect(availablePatterns[randomIndex].id);
                }}
                className="w-full p-2.5 rounded-lg border border-dashed border-zinc-700 text-zinc-400 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all flex items-center justify-center gap-2 text-sm"
            >
                <Shuffle size={14} />
                <span>隨機選擇</span>
            </button>
        </div>
    );
}
