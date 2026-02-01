'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
    PracticeMode,
    PracticeState,
    PatternScenario,
    PracticeTrade,
    PracticePosition,
    PracticeResult,
    PlaybackState,
    ScoreBreakdown,
    RecognitionQuestion,
} from '@/data/practice/types';
import { PATTERN_SCENARIOS, generateRecognitionQuestions, PATTERN_INFO } from '@/data/practice/patternScenarios';

const INITIAL_BALANCE = 1000000; // 100萬初始資金
const COMMISSION_RATE = 0.001425; // 手續費率

interface UsePracticeEngineReturn {
    // State
    state: PracticeState;
    visibleCandles: typeof PATTERN_SCENARIOS[0]['candles'];
    currentQuestion: RecognitionQuestion | null;
    questionIndex: number;
    totalQuestions: number;
    remainingTime: number;
    scoreBreakdown: ScoreBreakdown | null;
    
    // Actions
    setMode: (mode: PracticeMode) => void;
    loadScenario: (scenario: PatternScenario) => void;
    loadRandomScenario: () => void;
    
    // Playback controls
    play: () => void;
    pause: () => void;
    stepForward: () => void;
    stepBackward: () => void;
    setSpeed: (speed: number) => void;
    reset: () => void;
    
    // Trading actions
    buy: (quantity: number) => void;
    sell: (quantity: number) => void;
    closePosition: () => void;
    
    // Recognition mode
    submitAnswer: (answer: string) => boolean;
    nextQuestion: () => void;
    startRecognitionSession: () => void;
    
    // Session
    completeSession: () => void;
    getCurrentPrice: () => number;
}

export function usePracticeEngine(): UsePracticeEngineReturn {
    // Core state
    const [state, setState] = useState<PracticeState>({
        mode: 'trading',
        currentScenario: null,
        playback: {
            isPlaying: false,
            speed: 1,
            currentIndex: 0,
            totalCandles: 0,
        },
        position: null,
        trades: [],
        balance: INITIAL_BALANCE,
        score: 0,
        isComplete: false,
        result: null,
    });
    
    // Recognition mode state
    const [questions, setQuestions] = useState<RecognitionQuestion[]>([]);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [remainingTime, setRemainingTime] = useState(30);
    const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
    
    // Refs
    const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
    const sessionStartTimeRef = useRef<number>(0);
    
    // Computed visible candles
    const visibleCandles = state.currentScenario
        ? state.currentScenario.candles.slice(0, state.playback.currentIndex + 1)
        : [];
    
    // Current question
    const currentQuestion = questions[questionIndex] || null;
    
    // Get current price
    const getCurrentPrice = useCallback(() => {
        if (visibleCandles.length === 0) return 0;
        return visibleCandles[visibleCandles.length - 1].close;
    }, [visibleCandles]);
    
    // Update position unrealized PnL
    useEffect(() => {
        if (state.position && state.position.quantity > 0) {
            const currentPrice = getCurrentPrice();
            const unrealizedPnL = (currentPrice - state.position.averageCost) * state.position.quantity;
            const unrealizedPnLPercent = (unrealizedPnL / (state.position.averageCost * state.position.quantity)) * 100;
            
            setState(prev => ({
                ...prev,
                position: prev.position ? {
                    ...prev.position,
                    unrealizedPnL,
                    unrealizedPnLPercent,
                } : null,
            }));
        }
    }, [getCurrentPrice, state.playback.currentIndex]);
    
    // Playback timer effect
    useEffect(() => {
        if (state.playback.isPlaying && state.currentScenario) {
            const interval = 1000 / state.playback.speed;
            
            playbackTimerRef.current = setInterval(() => {
                setState(prev => {
                    if (prev.playback.currentIndex >= prev.playback.totalCandles - 1) {
                        // Reached the end
                        if (playbackTimerRef.current) {
                            clearInterval(playbackTimerRef.current);
                        }
                        return {
                            ...prev,
                            playback: { ...prev.playback, isPlaying: false },
                        };
                    }
                    
                    return {
                        ...prev,
                        playback: {
                            ...prev.playback,
                            currentIndex: prev.playback.currentIndex + 1,
                        },
                    };
                });
            }, interval);
            
            return () => {
                if (playbackTimerRef.current) {
                    clearInterval(playbackTimerRef.current);
                }
            };
        }
    }, [state.playback.isPlaying, state.playback.speed, state.currentScenario]);
    
    // Recognition countdown timer
    useEffect(() => {
        if (state.mode === 'recognition' && currentQuestion && remainingTime > 0) {
            countdownTimerRef.current = setTimeout(() => {
                setRemainingTime(prev => prev - 1);
            }, 1000);
            
            return () => {
                if (countdownTimerRef.current) {
                    clearTimeout(countdownTimerRef.current);
                }
            };
        } else if (remainingTime === 0 && state.mode === 'recognition') {
            // Time's up, move to next question
            nextQuestion();
        }
    }, [state.mode, currentQuestion, remainingTime]);
    
    // Mode setter
    const setMode = useCallback((mode: PracticeMode) => {
        setState(prev => ({
            ...prev,
            mode,
            isComplete: false,
            result: null,
        }));
        
        if (mode === 'recognition') {
            startRecognitionSession();
        }
    }, []);
    
    // Load a scenario
    const loadScenario = useCallback((scenario: PatternScenario) => {
        setState(prev => ({
            ...prev,
            currentScenario: scenario,
            playback: {
                isPlaying: false,
                speed: 1,
                currentIndex: Math.min(5, scenario.candles.length - 1), // Start with first 6 candles visible
                totalCandles: scenario.candles.length,
            },
            position: null,
            trades: [],
            balance: INITIAL_BALANCE,
            score: 0,
            isComplete: false,
            result: null,
        }));
        sessionStartTimeRef.current = Date.now();
    }, []);
    
    // Load random scenario
    const loadRandomScenario = useCallback(() => {
        const index = Math.floor(Math.random() * PATTERN_SCENARIOS.length);
        loadScenario(PATTERN_SCENARIOS[index]);
    }, [loadScenario]);
    
    // Playback controls
    const play = useCallback(() => {
        setState(prev => ({
            ...prev,
            playback: { ...prev.playback, isPlaying: true },
        }));
    }, []);
    
    const pause = useCallback(() => {
        setState(prev => ({
            ...prev,
            playback: { ...prev.playback, isPlaying: false },
        }));
    }, []);
    
    const stepForward = useCallback(() => {
        setState(prev => ({
            ...prev,
            playback: {
                ...prev.playback,
                isPlaying: false,
                currentIndex: Math.min(prev.playback.currentIndex + 1, prev.playback.totalCandles - 1),
            },
        }));
    }, []);
    
    const stepBackward = useCallback(() => {
        setState(prev => ({
            ...prev,
            playback: {
                ...prev.playback,
                isPlaying: false,
                currentIndex: Math.max(prev.playback.currentIndex - 1, 0),
            },
        }));
    }, []);
    
    const setSpeed = useCallback((speed: number) => {
        setState(prev => ({
            ...prev,
            playback: { ...prev.playback, speed },
        }));
    }, []);
    
    const reset = useCallback(() => {
        if (state.currentScenario) {
            loadScenario(state.currentScenario);
        }
    }, [state.currentScenario, loadScenario]);
    
    // Trading actions
    const buy = useCallback((quantity: number) => {
        const price = getCurrentPrice();
        if (price <= 0 || quantity <= 0) return;
        
        const cost = price * quantity;
        const commission = cost * COMMISSION_RATE;
        const totalCost = cost + commission;
        
        if (totalCost > state.balance) return;
        
        const trade: PracticeTrade = {
            id: `trade-${Date.now()}`,
            timestamp: Date.now(),
            action: 'buy',
            price,
            quantity,
            candleIndex: state.playback.currentIndex,
        };
        
        setState(prev => {
            const newPosition: PracticePosition = prev.position
                ? {
                    quantity: prev.position.quantity + quantity,
                    averageCost: ((prev.position.averageCost * prev.position.quantity) + cost) / (prev.position.quantity + quantity),
                    unrealizedPnL: 0,
                    unrealizedPnLPercent: 0,
                }
                : {
                    quantity,
                    averageCost: price,
                    unrealizedPnL: 0,
                    unrealizedPnLPercent: 0,
                };
            
            return {
                ...prev,
                balance: prev.balance - totalCost,
                position: newPosition,
                trades: [...prev.trades, trade],
            };
        });
    }, [getCurrentPrice, state.balance, state.playback.currentIndex]);
    
    const sell = useCallback((quantity: number) => {
        const price = getCurrentPrice();
        if (price <= 0 || quantity <= 0) return;
        if (!state.position || state.position.quantity < quantity) return;
        
        const revenue = price * quantity;
        const commission = revenue * COMMISSION_RATE;
        const netRevenue = revenue - commission;
        
        const trade: PracticeTrade = {
            id: `trade-${Date.now()}`,
            timestamp: Date.now(),
            action: 'sell',
            price,
            quantity,
            candleIndex: state.playback.currentIndex,
        };
        
        setState(prev => {
            const newQuantity = prev.position!.quantity - quantity;
            const newPosition: PracticePosition | null = newQuantity > 0
                ? {
                    ...prev.position!,
                    quantity: newQuantity,
                }
                : null;
            
            return {
                ...prev,
                balance: prev.balance + netRevenue,
                position: newPosition,
                trades: [...prev.trades, trade],
            };
        });
    }, [getCurrentPrice, state.position, state.playback.currentIndex]);
    
    const closePosition = useCallback(() => {
        if (state.position && state.position.quantity > 0) {
            sell(state.position.quantity);
        }
    }, [state.position, sell]);
    
    // Recognition mode functions
    const startRecognitionSession = useCallback(() => {
        const newQuestions = generateRecognitionQuestions(5);
        setQuestions(newQuestions);
        setQuestionIndex(0);
        setCorrectAnswers(0);
        setRemainingTime(30);
        sessionStartTimeRef.current = Date.now();
        
        // Load the first question's scenario
        if (newQuestions.length > 0) {
            const firstScenario = PATTERN_SCENARIOS.find(s => s.id === newQuestions[0].scenarioId);
            if (firstScenario) {
                setState(prev => ({
                    ...prev,
                    currentScenario: firstScenario,
                    playback: {
                        isPlaying: false,
                        speed: 1,
                        currentIndex: firstScenario.candles.length - 1, // Show all candles
                        totalCandles: firstScenario.candles.length,
                    },
                }));
            }
        }
    }, []);
    
    const submitAnswer = useCallback((answer: string): boolean => {
        if (!currentQuestion) return false;
        
        const isCorrect = answer === currentQuestion.correctAnswer;
        
        if (isCorrect) {
            setCorrectAnswers(prev => prev + 1);
            // Score: base + time bonus
            const timeBonus = Math.floor(remainingTime * 0.5);
            setState(prev => ({
                ...prev,
                score: prev.score + 10 + timeBonus,
            }));
        } else {
            setState(prev => ({
                ...prev,
                score: Math.max(0, prev.score - 5),
            }));
        }
        
        return isCorrect;
    }, [currentQuestion, remainingTime]);
    
    const nextQuestion = useCallback(() => {
        if (questionIndex < questions.length - 1) {
            const nextIdx = questionIndex + 1;
            setQuestionIndex(nextIdx);
            setRemainingTime(30);
            
            // Load next question's scenario
            const nextScenario = PATTERN_SCENARIOS.find(s => s.id === questions[nextIdx].scenarioId);
            if (nextScenario) {
                setState(prev => ({
                    ...prev,
                    currentScenario: nextScenario,
                    playback: {
                        isPlaying: false,
                        speed: 1,
                        currentIndex: nextScenario.candles.length - 1,
                        totalCandles: nextScenario.candles.length,
                    },
                }));
            }
        } else {
            // Complete recognition session
            completeSession();
        }
    }, [questionIndex, questions]);
    
    // Complete session and calculate results
    const completeSession = useCallback(() => {
        const endTime = Date.now();
        
        // Calculate trading P&L
        let totalPnL = state.balance - INITIAL_BALANCE;
        if (state.position) {
            const currentPrice = getCurrentPrice();
            totalPnL += (currentPrice - state.position.averageCost) * state.position.quantity;
        }
        const totalPnLPercent = (totalPnL / INITIAL_BALANCE) * 100;
        
        // Calculate score breakdown
        let entryAccuracy = 0;
        let exitAccuracy = 0;
        
        if (state.mode === 'trading' && state.currentScenario) {
            const scenario = state.currentScenario;
            
            // Check entry accuracy
            const buyTrades = state.trades.filter(t => t.action === 'buy');
            if (buyTrades.length > 0 && scenario.optimalEntry) {
                const firstBuy = buyTrades[0];
                const entryDiff = Math.abs(firstBuy.price - scenario.optimalEntry.price);
                const entryTolerance = scenario.optimalEntry.price * 0.03; // 3% tolerance
                if (entryDiff <= entryTolerance) {
                    entryAccuracy = 20;
                }
            }
            
            // Check exit accuracy
            const sellTrades = state.trades.filter(t => t.action === 'sell');
            if (sellTrades.length > 0 && scenario.optimalExit) {
                const lastSell = sellTrades[sellTrades.length - 1];
                const exitDiff = Math.abs(lastSell.price - scenario.optimalExit.price);
                const exitTolerance = scenario.optimalExit.price * 0.03;
                if (exitDiff <= exitTolerance) {
                    exitAccuracy = 20;
                }
            }
        }
        
        // Calculate time bonus
        const sessionDuration = (endTime - sessionStartTimeRef.current) / 1000;
        const timeBonus = state.mode === 'recognition' ? 0 : Math.max(0, Math.floor((300 - sessionDuration) * 0.1));
        
        // Trading PnL score
        const tradingScore = totalPnL > 0 ? Math.floor(totalPnL / 1000) : Math.floor(totalPnL / 2000);
        
        const breakdown: ScoreBreakdown = {
            tradingPnL: tradingScore,
            entryAccuracy,
            exitAccuracy,
            timeBonus,
            total: state.score + tradingScore + entryAccuracy + exitAccuracy + timeBonus,
        };
        
        setScoreBreakdown(breakdown);
        
        const result: PracticeResult = {
            mode: state.mode,
            patternType: state.currentScenario?.patternType,
            startTime: sessionStartTimeRef.current,
            endTime,
            score: breakdown.total,
            trades: state.trades,
            totalPnL,
            totalPnLPercent,
            correctIdentifications: state.mode === 'recognition' ? correctAnswers : undefined,
            totalQuestions: state.mode === 'recognition' ? questions.length : undefined,
        };
        
        setState(prev => ({
            ...prev,
            score: breakdown.total,
            isComplete: true,
            result,
        }));
    }, [state, getCurrentPrice, correctAnswers, questions.length]);
    
    return {
        state,
        visibleCandles,
        currentQuestion,
        questionIndex,
        totalQuestions: questions.length,
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
    };
}
