'use client';

import { useRef, useEffect, useCallback } from 'react';
import { CandleData, MarketRegime } from '@/types';
import { CONFIG } from '@/constants';

interface PriceEngineState {
    candles: CandleData[];
    currentCandle: CandleData | null;
    currentPrice: number;
    regime: MarketRegime;
    sentiment: number;
}

interface UsePriceEngineOptions {
    onUpdate: (state: PriceEngineState) => void;
    enabled?: boolean;
    speed?: number; // ms per tick
}

export function usePriceEngine({ onUpdate, enabled = true, speed = 100 }: UsePriceEngineOptions) {
    const animationRef = useRef<number>(0);
    const basePriceRef = useRef<number>(CONFIG.BASE_PRICE);
    const organicTrendRef = useRef(0);
    const regimeTimerRef = useRef(0);
    const candleProgressRef = useRef(0);
    const historyRef = useRef<CandleData[]>([]);
    const currentCandleRef = useRef<CandleData | null>(null);
    const lastTickRef = useRef(0);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const tick = () => {
            const now = Date.now();
            if (now - lastTickRef.current < speed) {
                animationRef.current = requestAnimationFrame(tick);
                return;
            }
            lastTickRef.current = now;

            // Organic trend drift
            organicTrendRef.current += (Math.random() - 0.5) * 0.02;
            organicTrendRef.current = Math.max(-1, Math.min(1, organicTrendRef.current));

            // Regime changes
            regimeTimerRef.current++;
            let regime: MarketRegime = 'CHOP';
            if (regimeTimerRef.current > 100) {
                const rnd = Math.random();
                if (rnd < 0.3) {
                    regime = 'BULL';
                    organicTrendRef.current = Math.abs(organicTrendRef.current);
                } else if (rnd < 0.6) {
                    regime = 'BEAR';
                    organicTrendRef.current = -Math.abs(organicTrendRef.current);
                }
                if (rnd < 0.1) regimeTimerRef.current = 0;
            }

            // Price movement
            const volatility = 0.002 + Math.random() * 0.003;
            const trendBias = organicTrendRef.current * 0.001;
            const priceChange = basePriceRef.current * (volatility * (Math.random() - 0.5) + trendBias);
            basePriceRef.current = Math.max(100, basePriceRef.current + priceChange);

            // Update current candle
            candleProgressRef.current++;
            const currentPrice = basePriceRef.current;

            if (!currentCandleRef.current || candleProgressRef.current >= 30) {
                // New candle
                if (currentCandleRef.current) {
                    historyRef.current = [...historyRef.current, currentCandleRef.current].slice(-CONFIG.MAX_CANDLES);
                }

                currentCandleRef.current = {
                    open: currentPrice,
                    high: currentPrice,
                    low: currentPrice,
                    close: currentPrice,
                    volume: Math.floor(Math.random() * 50000) + 10000,
                    timestamp: Date.now(),
                };
                candleProgressRef.current = 0;
            } else {
                // Update candle
                currentCandleRef.current = {
                    ...currentCandleRef.current,
                    high: Math.max(currentCandleRef.current.high, currentPrice),
                    low: Math.min(currentCandleRef.current.low, currentPrice),
                    close: currentPrice,
                    volume: currentCandleRef.current.volume + Math.floor(Math.random() * 1000),
                };
            }

            // Calculate sentiment
            const recentChange = historyRef.current.length > 5
                ? (currentPrice - historyRef.current[historyRef.current.length - 5].close) / historyRef.current[historyRef.current.length - 5].close
                : 0;
            const sentiment = Math.round(50 + recentChange * 500);

            onUpdate({
                candles: [...historyRef.current, currentCandleRef.current].filter(Boolean) as CandleData[],
                currentCandle: currentCandleRef.current,
                currentPrice,
                regime,
                sentiment: Math.max(0, Math.min(100, sentiment)),
            });

            animationRef.current = requestAnimationFrame(tick);
        };

        animationRef.current = requestAnimationFrame(tick);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [enabled, onUpdate, speed]);

    const reset = useCallback(() => {
        historyRef.current = [];
        currentCandleRef.current = null;
        basePriceRef.current = CONFIG.BASE_PRICE;
        organicTrendRef.current = 0;
        candleProgressRef.current = 0;
        regimeTimerRef.current = 0;
    }, []);

    return { reset };
}
