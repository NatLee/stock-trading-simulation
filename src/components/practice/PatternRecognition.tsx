'use client';

import { useState } from 'react';
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
            <div className="flex items-center justify-center h-full">
                <div className="text-zinc-400">載入中...</div>
            </div>
        );
    }
    
    const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
    
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <span className="text-zinc-400">
                        問題 {questionIndex + 1} / {totalQuestions}
                    </span>
                    <span className="text-indigo-400 font-medium">
                        分數: {score}
                    </span>
                </div>
                
                {/* Timer */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    remainingTime <= 10 ? 'bg-rose-600/20 text-rose-400' : 'bg-zinc-800 text-zinc-300'
                }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-mono text-lg">{remainingTime}s</span>
                </div>
            </div>
            
            {/* Chart */}
            <div className="bg-zinc-900 rounded-lg p-4 overflow-hidden">
                <div className="text-center text-zinc-400 mb-4">
                    請辨識以下K線圖形是什麼型態？
                </div>
                <div className="w-full overflow-x-auto">
                    <CandlestickChart
                        candles={candles}
                        currentPrice={currentPrice}
                        width={700}
                        height={300}
                        showMA={false}
                        showVolume={true}
                        isAsianTheme={true}
                    />
                </div>
            </div>
            
            {/* Options */}
            <div className="grid grid-cols-2 gap-3">
                {currentQuestion.options.map((option) => {
                    const patternInfo = PATTERN_INFO[option];
                    const isSelected = selectedAnswer === option;
                    const isCorrectAnswer = option === currentQuestion.correctAnswer;
                    
                    let buttonClass = 'bg-zinc-800 border-zinc-700 hover:border-zinc-600';
                    if (showResult) {
                        if (isCorrectAnswer) {
                            buttonClass = 'bg-emerald-600/20 border-emerald-500';
                        } else if (isSelected && !isCorrect) {
                            buttonClass = 'bg-rose-600/20 border-rose-500';
                        }
                    } else if (isSelected) {
                        buttonClass = 'bg-indigo-600/20 border-indigo-500';
                    }
                    
                    return (
                        <button
                            key={option}
                            onClick={() => handleSubmit(option)}
                            disabled={showResult}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${buttonClass} ${
                                showResult ? 'cursor-default' : ''
                            }`}
                        >
                            <div className="font-medium text-white">{patternInfo.name}</div>
                            <div className="text-xs text-zinc-500">{patternInfo.nameEn}</div>
                        </button>
                    );
                })}
            </div>
            
            {/* Result & Next Button */}
            {showResult && (
                <div className="space-y-4">
                    <div className={`p-4 rounded-lg text-center ${
                        isCorrect ? 'bg-emerald-600/20 text-emerald-400' : 'bg-rose-600/20 text-rose-400'
                    }`}>
                        {isCorrect ? (
                            <div>
                                <span className="text-2xl mr-2">✓</span>
                                正確！+{10 + Math.floor(remainingTime * 0.5)} 分
                            </div>
                        ) : (
                            <div>
                                <span className="text-2xl mr-2">✗</span>
                                答錯了！正確答案是 {PATTERN_INFO[currentQuestion.correctAnswer].name}
                            </div>
                        )}
                    </div>
                    
                    <button
                        onClick={handleNext}
                        className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all"
                    >
                        {questionIndex < totalQuestions - 1 ? '下一題' : '查看結果'}
                    </button>
                </div>
            )}
        </div>
    );
}
