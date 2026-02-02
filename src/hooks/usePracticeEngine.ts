'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
    PracticeMode,
    PracticeState,
    PatternScenario,
    PracticeTrade,
    PracticePosition,
    PracticeResult,
    ScoreBreakdown,
    RecognitionQuestion,
} from '@/data/practice/types';
import { PATTERN_SCENARIOS, generateRecognitionQuestions } from '@/data/practice/patternScenarios';

const INITIAL_BALANCE = 1000000; // 100萬初始資金
const COMMISSION_RATE = 0.001425; // 手續費率
const SHARES_PER_LOT = 1000; // 1張 = 1000股

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
    clearScenario: () => void;
    
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
    
    // Update position unrealized PnL (supports both long and short positions)
    useEffect(() => {
        const currentPrice = getCurrentPrice();
        if (currentPrice <= 0) return;
        
        setState(prev => {
            if (!prev.position || prev.position.quantity <= 0) return prev;
            
            let unrealizedPnL: number;
            
            if (prev.position.isShort) {
                // 空頭部位：價格下跌獲利
                unrealizedPnL = (prev.position.averageCost - currentPrice) * prev.position.quantity * SHARES_PER_LOT;
            } else {
                // 多頭部位：價格上漲獲利
                unrealizedPnL = (currentPrice - prev.position.averageCost) * prev.position.quantity * SHARES_PER_LOT;
            }
            
            const positionValue = prev.position.averageCost * prev.position.quantity * SHARES_PER_LOT;
            const unrealizedPnLPercent = positionValue > 0 ? (unrealizedPnL / positionValue) * 100 : 0;
            
            // 只在值有變化時更新，避免無限循環
            if (prev.position.unrealizedPnL === unrealizedPnL && 
                prev.position.unrealizedPnLPercent === unrealizedPnLPercent) {
                return prev;
            }
            
            return {
                ...prev,
                position: {
                    ...prev.position,
                    unrealizedPnL,
                    unrealizedPnLPercent,
                },
            };
        });
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
    
    // Clear scenario and return to initial state
    const clearScenario = useCallback(() => {
        // Stop any running timers
        if (playbackTimerRef.current) {
            clearInterval(playbackTimerRef.current);
            playbackTimerRef.current = null;
        }
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        
        setState({
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
        
        setQuestions([]);
        setQuestionIndex(0);
        setCorrectAnswers(0);
        setRemainingTime(30);
        setScoreBreakdown(null);
    }, []);
    
    // Trading actions - BUY (買入/空頭回補)
    const buy = useCallback((quantity: number) => {
        const price = getCurrentPrice();
        if (price <= 0 || quantity <= 0) return;
        
        const totalShares = quantity * SHARES_PER_LOT;
        const cost = price * totalShares;
        const commission = cost * COMMISSION_RATE;
        
        // 檢查是否有空頭部位需要回補
        if (state.position && state.position.isShort) {
            // 空頭回補
            const coverQuantity = Math.min(quantity, state.position.quantity);
            const coverShares = coverQuantity * SHARES_PER_LOT;
            const coverCost = price * coverShares;
            const coverCommission = coverCost * COMMISSION_RATE;
            
            // 計算空頭平倉損益
            const pnl = (state.position.averageCost - price) * coverShares;
            
            const trade: PracticeTrade = {
                id: `trade-${Date.now()}`,
                timestamp: Date.now(),
                action: 'buy',
                price,
                quantity: coverQuantity,
                candleIndex: state.playback.currentIndex,
            };
            
            setState(prev => {
                const remainingShortQuantity = prev.position!.quantity - coverQuantity;
                const newPosition: PracticePosition | null = remainingShortQuantity > 0
                    ? {
                        ...prev.position!,
                        quantity: remainingShortQuantity,
                    }
                    : null;
                
                return {
                    ...prev,
                    balance: prev.balance - coverCost - coverCommission + pnl,
                    position: newPosition,
                    trades: [...prev.trades, trade],
                };
            });
            
            return;
        }
        
        // 一般買入（建立或加碼多頭部位）
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
            const newPosition: PracticePosition = prev.position && !prev.position.isShort
                ? {
                    quantity: prev.position.quantity + quantity,
                    averageCost: ((prev.position.averageCost * prev.position.quantity) + (price * quantity)) / (prev.position.quantity + quantity),
                    unrealizedPnL: 0,
                    unrealizedPnLPercent: 0,
                    isShort: false,
                }
                : {
                    quantity,
                    averageCost: price,
                    unrealizedPnL: 0,
                    unrealizedPnLPercent: 0,
                    isShort: false,
                };
            
            return {
                ...prev,
                balance: prev.balance - totalCost,
                position: newPosition,
                trades: [...prev.trades, trade],
            };
        });
    }, [getCurrentPrice, state.balance, state.position, state.playback.currentIndex]);
    
    // Trading actions - SELL (賣出/做空)
    const sell = useCallback((quantity: number) => {
        const price = getCurrentPrice();
        if (price <= 0 || quantity <= 0) return;
        
        const totalShares = quantity * SHARES_PER_LOT;
        const revenue = price * totalShares;
        const commission = revenue * COMMISSION_RATE;
        
        // 檢查是否有多頭部位需要賣出
        if (state.position && !state.position.isShort && state.position.quantity > 0) {
            // 賣出多頭部位
            const sellQuantity = Math.min(quantity, state.position.quantity);
            const sellShares = sellQuantity * SHARES_PER_LOT;
            const sellRevenue = price * sellShares;
            const sellCommission = sellRevenue * COMMISSION_RATE;
            const netRevenue = sellRevenue - sellCommission;
            
            const trade: PracticeTrade = {
                id: `trade-${Date.now()}`,
                timestamp: Date.now(),
                action: 'sell',
                price,
                quantity: sellQuantity,
                candleIndex: state.playback.currentIndex,
            };
            
            setState(prev => {
                const remainingQuantity = prev.position!.quantity - sellQuantity;
                const newPosition: PracticePosition | null = remainingQuantity > 0
                    ? {
                        ...prev.position!,
                        quantity: remainingQuantity,
                    }
                    : null;
                
                return {
                    ...prev,
                    balance: prev.balance + netRevenue,
                    position: newPosition,
                    trades: [...prev.trades, trade],
                };
            });
            
            return;
        }
        
        // 做空（建立或加碼空頭部位）
        // 做空需要保證金，這裡簡化為需要有足夠資金作為保證金
        const marginRequired = revenue * 0.5; // 50% 保證金
        if (marginRequired > state.balance) return;
        
        const trade: PracticeTrade = {
            id: `trade-${Date.now()}`,
            timestamp: Date.now(),
            action: 'sell',
            price,
            quantity,
            candleIndex: state.playback.currentIndex,
        };
        
        setState(prev => {
            const newPosition: PracticePosition = prev.position && prev.position.isShort
                ? {
                    quantity: prev.position.quantity + quantity,
                    averageCost: ((prev.position.averageCost * prev.position.quantity) + (price * quantity)) / (prev.position.quantity + quantity),
                    unrealizedPnL: 0,
                    unrealizedPnLPercent: 0,
                    isShort: true,
                }
                : {
                    quantity,
                    averageCost: price,
                    unrealizedPnL: 0,
                    unrealizedPnLPercent: 0,
                    isShort: true,
                };
            
            return {
                ...prev,
                balance: prev.balance + revenue - commission, // 做空時收到賣出金額
                position: newPosition,
                trades: [...prev.trades, trade],
            };
        });
    }, [getCurrentPrice, state.position, state.balance, state.playback.currentIndex]);
    
    // 平倉（支援多頭和空頭）
    const closePosition = useCallback(() => {
        if (!state.position || state.position.quantity <= 0) return;
        
        if (state.position.isShort) {
            // 空頭平倉 - 買回
            buy(state.position.quantity);
        } else {
            // 多頭平倉 - 賣出
            sell(state.position.quantity);
        }
    }, [state.position, buy, sell]);
    
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
        if (state.position && state.position.quantity > 0) {
            const currentPrice = getCurrentPrice();
            const positionShares = state.position.quantity * SHARES_PER_LOT;
            if (state.position.isShort) {
                // 空頭部位未實現損益
                totalPnL += (state.position.averageCost - currentPrice) * positionShares;
            } else {
                // 多頭部位未實現損益
                totalPnL += (currentPrice - state.position.averageCost) * positionShares;
            }
        }
        const totalPnLPercent = (totalPnL / INITIAL_BALANCE) * 100;
        
        // Calculate score breakdown
        let entryAccuracy = 0;
        let exitAccuracy = 0;
        
        if (state.mode === 'trading' && state.currentScenario) {
            const scenario = state.currentScenario;
            
            // Check entry accuracy - 根據情境方向判斷進場
            if (scenario.optimalEntry) {
                const relevantTrades = scenario.expectedDirection === 'up'
                    ? state.trades.filter(t => t.action === 'buy')
                    : state.trades.filter(t => t.action === 'sell');
                    
                if (relevantTrades.length > 0) {
                    const firstTrade = relevantTrades[0];
                    const entryDiff = Math.abs(firstTrade.price - scenario.optimalEntry.price);
                    const entryTolerance = scenario.optimalEntry.price * 0.03; // 3% tolerance
                    if (entryDiff <= entryTolerance) {
                        entryAccuracy = 20;
                    }
                }
            }
            
            // Check exit accuracy - 根據情境方向判斷出場
            if (scenario.optimalExit) {
                const relevantTrades = scenario.expectedDirection === 'up'
                    ? state.trades.filter(t => t.action === 'sell')
                    : state.trades.filter(t => t.action === 'buy');
                    
                if (relevantTrades.length > 0) {
                    const lastTrade = relevantTrades[relevantTrades.length - 1];
                    const exitDiff = Math.abs(lastTrade.price - scenario.optimalExit.price);
                    const exitTolerance = scenario.optimalExit.price * 0.03;
                    if (exitDiff <= exitTolerance) {
                        exitAccuracy = 20;
                    }
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
        clearScenario,
        
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
