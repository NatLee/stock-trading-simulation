'use client';

import { Activity, Zap } from 'lucide-react';
import { AIState } from '@/types';
import { Button } from '@/components/ui';

interface AIScannerProps {
    state: AIState;
    onStartScan: () => void;
    disabled?: boolean;
    scanIdleLabel: string;
    scanRunningLabel: string;
}

export function AIScanner({
    state,
    onStartScan,
    disabled,
    scanIdleLabel,
    scanRunningLabel,
}: AIScannerProps) {
    const isScanning = state === 'scanning';

    return (
        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg p-3">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></div>
                        <div className={`absolute inset-0 w-2 h-2 rounded-full ${isScanning ? 'bg-amber-400' : 'bg-emerald-400'} opacity-50`}></div>
                    </div>
                    <span className="text-xs font-bold text-indigo-300 tracking-wider">AI 市場診斷系統</span>
                </div>
                <span className="text-[10px] font-mono text-indigo-500/60">NEURAL-NET V2</span>
            </div>

            <button
                onClick={onStartScan}
                disabled={isScanning || disabled}
                className={`w-full py-3 rounded relative overflow-hidden group
                    flex items-center justify-center gap-2 
                    transition-all duration-300
                    border
                    ${isScanning
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500/50 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]'
                    }
                    disabled:opacity-50`}
            >
                {/* Scan line animation */}
                {!isScanning && !disabled && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]" />
                )}

                {isScanning ? (
                    <>
                        <Activity size={16} className="animate-spin text-amber-400" />
                        <span className="text-xs font-bold tracking-widest animate-pulse">{scanRunningLabel}</span>
                    </>
                ) : (
                    <>
                        <Zap size={16} className={disabled ? '' : 'text-yellow-300 group-hover:scale-110 transition-transform'} />
                        <span className="text-xs font-bold tracking-widest">{scanIdleLabel}</span>
                    </>
                )}
            </button>

            {/* Decorative Grid */}
            <div className="mt-2 grid grid-cols-6 gap-1 opacity-20">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={`h-0.5 rounded-full ${isScanning ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500'}`} style={{ animationDelay: `${i * 100}ms` }} />
                ))}
            </div>
        </div>
    );
}
