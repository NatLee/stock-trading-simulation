'use client';

import { useState, useRef, useEffect } from 'react';
import { CandlestickChart } from '@/components/chart';
import { RecognitionQuestion, PatternType, ScenarioCandle } from '@/data/practice/types';
import { PATTERN_INFO } from '@/data/practice/patternScenarios';

interface PatternRecognitionProps {
    candles: ScenarioCandle[];
    currentQuestion: RecognitionQuestion | null;
    questionIndex: number;
    totalQuestions: number;
    remainingTime: number;
    score: number;
    onSubmitAnswer: (answer: PatternType) => boolean;
    onNextQuestion: () => void;
}

export function PatternRecognition({
    candles,
    currentQuestion,
    questionIndex,
    totalQuestions,
    remainingTime,
    score,
    onSubmitAnswer,
    onNextQuestion,
}: PatternRecognitionProps) {
    const [selectedAnswer, setSelectedAnswer] = useState<PatternType | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = useState(800);
    
    // Dynamically calculate chart width based on container
    useEffect(() => {
        const updateWidth = () => {
            if (chartContainerRef.current) {
                const containerWidth = chartContainerRef.current.clientWidth;
                // Account for padding (p-6 = 24px * 2 = 48px)
                const width = Math.min(containerWidth - 48, 900);
                setChartWidth(Math.max(width, 400));
            }
        };
        
        updateWidth();
        
        const resizeObserver = new ResizeObserver(updateWidth);
        if (chartContainerRef.current) {
            resizeObserver.observe(chartContainerRef.current);
        }
        
        return () => resizeObserver.disconnect();
    }, []);
    
    const handleSubmit = (answer: PatternType) => {
        if (showResult) return;
        
        setSelectedAnswer(answer);
        const correct = onSubmitAnswer(answer);
        setIsCorrect(correct);
        setShowResult(true);
    };
    
    const handleNext = () => {
        setSelectedAnswer(null);
        setShowResult(false);
        onNextQuestion();
    };
    
    if (!currentQuestion) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-zinc-400">載入中...</div>
            </div>
        );
    }
    
    const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
    
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-zinc-500">問題</span>
                        <span className="text-xl font-bold text-white">{questionIndex + 1}</span>
                        <span className="text-zinc-500">/ {totalQuestions}</span>
                    </div>
                    <div className="h-4 w-px bg-zinc-700" />
                    <div className="flex items-center gap-2">
                        <span className="text-zinc-500">分數</span>
                        <span className="text-xl font-bold text-indigo-400">{score}</span>
                    </div>
                </div>
                
                {/* Timer */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    remainingTime <= 10 ? 'bg-rose-600/20 text-rose-400 animate-pulse' : 'bg-zinc-800 text-zinc-300'
                }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-mono text-xl font-bold">{remainingTime}s</span>
                </div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
                />
            </div>
            
            {/* Chart - 置中且響應式 */}
            <div 
                ref={chartContainerRef}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
            >
                <div className="text-center text-zinc-400 mb-4 text-lg">
                    請辨識以下 K 線圖形是什麼型態？
                </div>
                <div className="flex justify-center">
                    <CandlestickChart
                        candles={candles}
                        currentPrice={currentPrice}
                        width={chartWidth}
                        height={350}
                        showMA={false}
                        showVolume={true}
                        isAsianTheme={true}
                    />
                </div>
            </div>
            
            {/* Options - 2x2 grid */}
            <div className="grid grid-cols-2 gap-4">
                {currentQuestion.options.map((option) => {
                    const patternInfo = PATTERN_INFO[option];
                    const isSelected = selectedAnswer === option;
                    const isCorrectAnswer = option === currentQuestion.correctAnswer;
                    
                    let buttonClass = 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50';
                    if (showResult) {
                        if (isCorrectAnswer) {
                            buttonClass = 'bg-emerald-600/20 border-emerald-500';
                        } else if (isSelected && !isCorrect) {
                            buttonClass = 'bg-rose-600/20 border-rose-500';
                        } else {
                            buttonClass = 'bg-zinc-900/50 border-zinc-800 opacity-50';
                        }
                    } else if (isSelected) {
                        buttonClass = 'bg-indigo-600/20 border-indigo-500';
                    }
                    
                    return (
                        <button
                            key={option}
                            onClick={() => handleSubmit(option)}
                            disabled={showResult}
                            className={`p-5 rounded-xl border-2 transition-all text-left ${buttonClass} ${
                                showResult ? 'cursor-default' : 'cursor-pointer'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-lg text-white">{patternInfo.name}</div>
                                    <div className="text-sm text-zinc-500 mt-1">{patternInfo.nameEn}</div>
                                </div>
                                {showResult && isCorrectAnswer && (
                                    <div className="text-emerald-400">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                                {showResult && isSelected && !isCorrect && (
                                    <div className="text-rose-400">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
            
            {/* Result & Next Button */}
            {showResult && (
                <div className="space-y-4">
                    <div className={`p-6 rounded-xl text-center ${
                        isCorrect ? 'bg-emerald-600/20 border border-emerald-500/50' : 'bg-rose-600/20 border border-rose-500/50'
                    }`}>
                        {isCorrect ? (
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-4xl">🎉</span>
                                <div>
                                    <div className="text-xl font-bold text-emerald-400">正確！</div>
                                    <div className="text-emerald-400/80">+{10 + Math.floor(remainingTime * 0.5)} 分</div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-4xl">😅</span>
                                <div>
                                    <div className="text-xl font-bold text-rose-400">答錯了</div>
                                    <div className="text-rose-400/80">
                                        正確答案是 <span className="font-bold">{PATTERN_INFO[currentQuestion.correctAnswer].name}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <button
                        onClick={handleNext}
                        className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg transition-all"
                    >
                        {questionIndex < totalQuestions - 1 ? '下一題 →' : '查看結果'}
                    </button>
                </div>
            )}
        </div>
    );
}
