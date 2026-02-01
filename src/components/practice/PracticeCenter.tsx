'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePracticeEngine } from '@/hooks/usePracticeEngine';
import { ModeSelector } from './ModeSelector';
import { PatternSelector } from './PatternSelector';
import { PatternRecognition } from './PatternRecognition';
import { TradingPractice } from './TradingPractice';
import { ReplayMode } from './ReplayMode';
import { PracticeResults } from './PracticeResults';
import { PatternType, PracticeMode } from '@/data/practice/types';
import { getScenariosByPattern, PATTERN_SCENARIOS } from '@/data/practice/patternScenarios';

export function PracticeCenter() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedPatternType, setSelectedPatternType] = useState<PatternType | null>(null);
    
    const {
        state,
        visibleCandles,
        currentQuestion,
        questionIndex,
        totalQuestions,
        remainingTime,
        scoreBreakdown,
        
        setMode,
        loadScenario,
        loadRandomScenario,
        
        play,
        pause,
        stepForward,
        stepBackward,
        setSpeed,
        reset,
        
        buy,
        sell,
        closePosition,
        
        submitAnswer,
        nextQuestion,
        startRecognitionSession,
        
        completeSession,
        getCurrentPrice,
    } = usePracticeEngine();
    
    // Handle pattern selection
    const handlePatternSelect = (patternType: PatternType) => {
        setSelectedPatternType(patternType);
        const scenarios = getScenariosByPattern(patternType);
        if (scenarios.length > 0) {
            // Pick a random scenario of this pattern type
            const randomIndex = Math.floor(Math.random() * scenarios.length);
            loadScenario(scenarios[randomIndex]);
        }
    };
    
    // Handle mode change
    const handleModeChange = (mode: PracticeMode) => {
        setMode(mode);
        if (mode === 'recognition') {
            startRecognitionSession();
        } else if (selectedPatternType) {
            handlePatternSelect(selectedPatternType);
        }
    };
    
    // Handle restart
    const handleRestart = () => {
        if (state.mode === 'recognition') {
            startRecognitionSession();
        } else {
            reset();
        }
    };
    
    // Handle change pattern
    const handleChangePattern = () => {
        setSelectedPatternType(null);
        loadRandomScenario();
    };
    
    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <header className="bg-zinc-900 border-b border-zinc-800">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/"
                                className="text-zinc-400 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold">實戰練習</h1>
                                <p className="text-xs text-zinc-500">Chart Pattern Practice</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <Link
                                href="/learn"
                                className="text-sm text-zinc-400 hover:text-white transition-colors"
                            >
                                📚 學習中心
                            </Link>
                            <Link
                                href="/"
                                className="text-sm text-zinc-400 hover:text-white transition-colors"
                            >
                                📈 模擬交易
                            </Link>
                        </div>
                    </div>
                </div>
            </header>
            
            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex gap-6">
                    {/* Sidebar */}
                    <aside className={`${sidebarCollapsed ? 'w-12' : 'w-64'} flex-shrink-0 transition-all duration-300`}>
                        <div className="sticky top-6 space-y-6">
                            {/* Collapse Toggle */}
                            <button
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                className="w-full flex items-center justify-center p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-all"
                            >
                                <svg
                                    className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                </svg>
                            </button>
                            
                            {!sidebarCollapsed && (
                                <>
                                    {/* Mode Selector */}
                                    <ModeSelector
                                        currentMode={state.mode}
                                        onModeChange={handleModeChange}
                                    />
                                    
                                    {/* Pattern Selector (not shown in recognition mode) */}
                                    {state.mode !== 'recognition' && (
                                        <PatternSelector
                                            selectedPattern={selectedPatternType}
                                            onPatternSelect={handlePatternSelect}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </aside>
                    
                    {/* Main Area */}
                    <main className="flex-1 min-w-0">
                        {/* Show Results if complete */}
                        {state.isComplete && state.result ? (
                            <PracticeResults
                                result={state.result}
                                scoreBreakdown={scoreBreakdown}
                                onRestart={handleRestart}
                                onChangePattern={handleChangePattern}
                            />
                        ) : (
                            <>
                                {/* Recognition Mode */}
                                {state.mode === 'recognition' && (
                                    <PatternRecognition
                                        candles={visibleCandles}
                                        currentQuestion={currentQuestion}
                                        questionIndex={questionIndex}
                                        totalQuestions={totalQuestions}
                                        remainingTime={remainingTime}
                                        score={state.score}
                                        onSubmitAnswer={submitAnswer}
                                        onNextQuestion={nextQuestion}
                                    />
                                )}
                                
                                {/* Trading Practice Mode */}
                                {state.mode === 'trading' && (
                                    <TradingPractice
                                        scenario={state.currentScenario}
                                        visibleCandles={visibleCandles}
                                        playback={state.playback}
                                        position={state.position}
                                        trades={state.trades}
                                        balance={state.balance}
                                        score={state.score}
                                        getCurrentPrice={getCurrentPrice}
                                        onPlay={play}
                                        onPause={pause}
                                        onStepForward={stepForward}
                                        onStepBackward={stepBackward}
                                        onSpeedChange={setSpeed}
                                        onReset={reset}
                                        onBuy={buy}
                                        onSell={sell}
                                        onClosePosition={closePosition}
                                        onComplete={completeSession}
                                    />
                                )}
                                
                                {/* Replay Mode */}
                                {state.mode === 'replay' && (
                                    <ReplayMode
                                        scenario={state.currentScenario}
                                        visibleCandles={visibleCandles}
                                        playback={state.playback}
                                        position={state.position}
                                        trades={state.trades}
                                        balance={state.balance}
                                        getCurrentPrice={getCurrentPrice}
                                        onPlay={play}
                                        onPause={pause}
                                        onStepForward={stepForward}
                                        onStepBackward={stepBackward}
                                        onSpeedChange={setSpeed}
                                        onReset={reset}
                                        onBuy={buy}
                                        onSell={sell}
                                        onClosePosition={closePosition}
                                        onComplete={completeSession}
                                    />
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>
            
            {/* Footer */}
            <footer className="bg-zinc-900 border-t border-zinc-800 mt-12">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between text-sm text-zinc-500">
                        <div>
                            實戰練習模式 - 練習識別K線型態並進行模擬交易
                        </div>
                        <div className="flex items-center gap-4">
                            <Link href="/learn" className="hover:text-zinc-300 transition-colors">
                                學習中心
                            </Link>
                            <Link href="/" className="hover:text-zinc-300 transition-colors">
                                模擬交易
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
