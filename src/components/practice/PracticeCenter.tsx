'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
    Zap, 
    ChevronRight,
    Home,
    List,
    Target,
    TrendingUp,
    Clock,
    X,
    Menu,
    Settings2
} from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { usePracticeEngine } from '@/hooks/usePracticeEngine';
import { ModeSelector } from './ModeSelector';
import { PatternSelector } from './PatternSelector';
import { PatternRecognition } from './PatternRecognition';
import { TradingPractice } from './TradingPractice';
import { ReplayMode } from './ReplayMode';
import { PracticeResults } from './PracticeResults';
import { WelcomePage } from './WelcomePage';
import { PatternType, PracticeMode } from '@/data/practice/types';
import { getScenariosByPattern, getRandomScenario, PATTERN_SCENARIOS, PATTERN_INFO } from '@/data/practice/patternScenarios';

const MODE_LABELS: Record<PracticeMode, { label: string; icon: typeof Target }> = {
    recognition: { label: '型態辨識', icon: Target },
    trading: { label: '交易練習', icon: TrendingUp },
    replay: { label: '歷史回放', icon: Clock },
};

export function PracticeCenter() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedPatternType, setSelectedPatternType] = useState<PatternType | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true); // Track if welcome page should be shown
    
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
        setShowWelcome(false); // Hide welcome page
        const scenarios = getScenariosByPattern(patternType);
        if (scenarios.length > 0) {
            // Pick a random scenario of this pattern type
            const randomIndex = Math.floor(Math.random() * scenarios.length);
            loadScenario(scenarios[randomIndex]);
        }
        // Close mobile menu after selection
        setMobileMenuOpen(false);
    };
    
    // Handle mode change
    const handleModeChange = (mode: PracticeMode) => {
        setMode(mode);
        if (mode === 'recognition') {
            setShowWelcome(false); // Hide welcome page
            startRecognitionSession();
            setMobileMenuOpen(false);
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
    
    // Handle random start from welcome page
    const handleRandomStart = () => {
        setShowWelcome(false);
        const randomScenario = getRandomScenario();
        setSelectedPatternType(randomScenario.patternType);
        loadScenario(randomScenario);
    };
    
    // Check if we should show welcome page
    const shouldShowWelcome = showWelcome && !state.currentScenario && state.mode !== 'recognition';

    const modeInfo = MODE_LABELS[state.mode];
    const ModeIcon = modeInfo.icon;

    // Breadcrumb for navbar leftContent
    const breadcrumb = (
        <nav className="flex items-center text-sm">
            <span className="flex items-center gap-1 px-2 py-1 text-amber-400">
                <ModeIcon size={14} />
                {modeInfo.label}
            </span>
            
            {selectedPatternType && state.mode !== 'recognition' && (
                <>
                    <ChevronRight size={14} className="text-zinc-600 mx-1" />
                    <span className="text-zinc-300 truncate max-w-[150px]">
                        {PATTERN_INFO[selectedPatternType]?.name}
                    </span>
                </>
            )}
        </nav>
    );
    
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-300">
            {/* Unified Navbar */}
            <Navbar 
                currentPage="practice"
                leftContent={breadcrumb}
            />

            {/* Mobile Breadcrumb with Menu Button */}
            <div className="lg:hidden border-b border-zinc-800 bg-zinc-900/50 px-4 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs overflow-x-auto flex-1 min-w-0">
                        <Link href="/" className="text-zinc-500 hover:text-white shrink-0">
                            <Home size={12} />
                        </Link>
                        <ChevronRight size={12} className="text-zinc-600 shrink-0" />
                        <span className="flex items-center gap-1 text-amber-400 shrink-0">
                            <ModeIcon size={12} />
                            {modeInfo.label}
                        </span>
                        {selectedPatternType && state.mode !== 'recognition' && (
                            <>
                                <ChevronRight size={12} className="text-zinc-600 shrink-0" />
                                <span className="text-zinc-300 truncate">
                                    {PATTERN_INFO[selectedPatternType]?.name}
                                </span>
                            </>
                        )}
                    </div>
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="ml-2 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors shrink-0"
                    >
                        <Settings2 size={16} />
                    </button>
                </div>
            </div>

            {/* Mobile Bottom Sheet */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-50">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    {/* Sheet */}
                    <div className="absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-2xl max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
                        {/* Handle */}
                        <div className="flex justify-center py-2">
                            <div className="w-10 h-1 rounded-full bg-zinc-700" />
                        </div>
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
                            <h2 className="text-lg font-semibold text-white">練習設定</h2>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        {/* Content */}
                        <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(80vh-80px)]">
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
                        </div>
                    </div>
                </div>
            )}
            
            {/* Main Content */}
            <main className="max-w-7xl mx-auto">
                <div className="flex">
                    {/* Sidebar */}
                    <aside className={`hidden lg:block border-r border-zinc-800 bg-zinc-900/30 transition-all ${
                        sidebarCollapsed ? 'w-12' : 'w-72'
                    }`}>
                        <div className="sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
                            <div className="p-3">
                                <button
                                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                    className="w-full p-2 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center"
                                >
                                    <List size={18} className="text-zinc-500" />
                                </button>
                            </div>
                            
                            {!sidebarCollapsed && (
                                <div className="px-3 pb-4 space-y-6">
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
                                </div>
                            )}
                        </div>
                    </aside>
                    
                    {/* Main Area */}
                    <div className="flex-1 min-w-0">
                        <div className="p-4 lg:p-6">
                            {/* Show Welcome Page */}
                            {shouldShowWelcome ? (
                                <WelcomePage
                                    onModeSelect={handleModeChange}
                                    onPatternSelect={handlePatternSelect}
                                    onRandomStart={handleRandomStart}
                                />
                            ) : state.isComplete && state.result ? (
                                /* Show Results if complete */
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
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
