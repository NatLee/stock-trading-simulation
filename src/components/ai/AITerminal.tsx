'use client';

import { useRef, useEffect } from 'react';
import { Terminal, Activity } from 'lucide-react';
import { LogEntry } from '@/types';

interface AITerminalProps {
    logs: LogEntry[];
    isScanning: boolean;
    title: string;
    processingLabel: string;
}

export function AITerminal({ logs, isScanning, title, processingLabel }: AITerminalProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="w-full h-48 bg-black border border-zinc-800 rounded-sm p-3 
                    font-mono text-xs overflow-hidden flex flex-col shadow-inner shadow-black/50">
            {/* Header */}
            <div className="flex items-center gap-2 text-zinc-500 mb-2 border-b border-zinc-900 pb-1">
                <Terminal size={12} />
                <span className="uppercase tracking-widest text-[10px]">{title}</span>
                {isScanning && (
                    <span className="animate-pulse text-indigo-500 flex items-center gap-1">
                        <Activity size={10} className="animate-spin" />
                        {processingLabel}
                    </span>
                )}
            </div>

            {/* Logs Area with scrollbar */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto pr-2 flex flex-col gap-1.5 custom-scrollbar"
            >
                {logs.map((log, i) => (
                    <div key={log.id || i} className="flex gap-2">
                        <span className="text-zinc-700 shrink-0">[{log.time}]</span>
                        <div className={`${getLogColor(log.type)} break-words flex items-start gap-1.5`}>
                            {log.type !== 'subtle' && <span className="text-zinc-600 shrink-0 text-[10px] mt-0.5 opacity-50">➜</span>}
                            <span>{log.text}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function getLogColor(type: LogEntry['type']): string {
    switch (type) {
        case 'alert':
            return 'text-rose-500 font-bold';
        case 'success':
            return 'text-emerald-400 font-bold';
        case 'subtle':
            return 'text-zinc-500 italic block pl-6 border-l-2 border-zinc-800';
        case 'warning':
            return 'text-yellow-400';
        default:
            return 'text-zinc-400';
    }
}
