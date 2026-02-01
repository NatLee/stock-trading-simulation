'use client';

import { PlaybackState } from '@/data/practice/types';

interface PlaybackControlsProps {
    playback: PlaybackState;
    onPlay: () => void;
    onPause: () => void;
    onStepForward: () => void;
    onStepBackward: () => void;
    onSpeedChange: (speed: number) => void;
    onReset: () => void;
}

const speedOptions = [0.5, 1, 2];

export function PlaybackControls({
    playback,
    onPlay,
    onPause,
    onStepForward,
    onStepBackward,
    onSpeedChange,
    onReset,
}: PlaybackControlsProps) {
    const progress = playback.totalCandles > 0
        ? ((playback.currentIndex + 1) / playback.totalCandles) * 100
        : 0;
    
    return (
        <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-500">
                    <span>進度</span>
                    <span>{playback.currentIndex + 1} / {playback.totalCandles} 根K線</span>
                </div>
                <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center justify-between">
                {/* Left: Step controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onStepBackward}
                        disabled={playback.currentIndex <= 0}
                        className="p-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        title="上一根"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    
                    {playback.isPlaying ? (
                        <button
                            onClick={onPause}
                            className="p-3 rounded-lg bg-amber-600 hover:bg-amber-500 transition-all"
                            title="暫停"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            onClick={onPlay}
                            disabled={playback.currentIndex >= playback.totalCandles - 1}
                            className="p-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title="播放"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            </svg>
                        </button>
                    )}
                    
                    <button
                        onClick={onStepForward}
                        disabled={playback.currentIndex >= playback.totalCandles - 1}
                        className="p-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        title="下一根"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                
                {/* Center: Speed selector */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">速度:</span>
                    <div className="flex gap-1">
                        {speedOptions.map((speed) => (
                            <button
                                key={speed}
                                onClick={() => onSpeedChange(speed)}
                                className={`px-3 py-1 rounded text-sm transition-all ${
                                    playback.speed === speed
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                                }`}
                            >
                                {speed}x
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Right: Reset */}
                <button
                    onClick={onReset}
                    className="p-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-white transition-all"
                    title="重新開始"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
