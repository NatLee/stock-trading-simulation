'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { MarketScenario, Trade, OrderBookSnapshot } from '../lib/matching';
import { BotManagerConfig } from '../lib/bots';
import { MarketSimulation } from '../lib/sim/MarketSimulation';
import { CandleData as ChartCandleData, OrderCondition } from '@/types';

/**
 * Market simulator state
 */
export interface MarketState {
    orderBook: OrderBookSnapshot;
    candles: ChartCandleData[];
    currentCandle: ChartCandleData | null;
    currentPrice: number;
    recentTrades: Trade[];
    volume24h: number;
    high24h: number;
    low24h: number;
    change24h: number;
    changePercent24h: number;
    tickChange: number;
    tickChangePercent: number;
    scenario: MarketScenario;
    isRunning: boolean;
    showBotOrders: boolean;
    intensity: number;
}

/**
 * Market simulator configuration
 */
export interface MarketSimulatorConfig {
    initialPrice: number;
    tickInterval: number;
    candlePeriod: number;
    scenario: MarketScenario;
    volatility: number;
    liquidity: number;
    unitSize: number;
    isOddLot: boolean;
    commissionRate: number;
    enabled: boolean;
    intensity: number;
}

const DEFAULT_CONFIG: MarketSimulatorConfig = {
    initialPrice: 50,
    tickInterval: 100,
    candlePeriod: 15000,
    scenario: 'sideways',
    volatility: 1.0,
    liquidity: 1.0,
    unitSize: 1000,
    isOddLot: false,
    commissionRate: 0.001425,
    enabled: true,
    intensity: 1.0,
};

export interface MarketSimulatorCallbacks {
    onTrade?: (trade: Trade) => void;
}

/** Today's 09:00 (local), or yesterday's if it is not 09:00 yet: where the synthetic history starts */
function historyStartTime(now: number): number {
    const nineAm = new Date(now);
    nineAm.setHours(9, 0, 0, 0);
    const start = nineAm.getTime();
    return now < start ? start - 24 * 60 * 60 * 1000 : start;
}

function emptyState(config: MarketSimulatorConfig): MarketState {
    return {
        orderBook: {
            asks: [],
            bids: [],
            spread: 0,
            bestAsk: null,
            bestBid: null,
            lastPrice: config.initialPrice,
            timestamp: 0,
        },
        candles: [],
        currentCandle: null,
        currentPrice: config.initialPrice,
        recentTrades: [],
        volume24h: 0,
        high24h: config.initialPrice,
        low24h: config.initialPrice,
        change24h: 0,
        changePercent24h: 0,
        tickChange: 0,
        tickChangePercent: 0,
        scenario: config.scenario,
        isRunning: false,
        showBotOrders: true,
        intensity: config.intensity,
    };
}

/**
 * useMarketSimulator - main hook for the trading simulation
 *
 * A thin React wrapper around MarketSimulation (matching engine + bots +
 * candles): it runs `step()` on a timer, publishes a snapshot as state and
 * forwards the user's own fills to `callbacks.onTrade`.
 */
export function useMarketSimulator(config: Partial<MarketSimulatorConfig> = {}, callbacks: MarketSimulatorCallbacks = {}) {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };

    // Core components (refs to avoid re-creation)
    const simRef = useRef<MarketSimulation | null>(null);
    const tickerRef = useRef<NodeJS.Timeout | null>(null);
    const lastTickRef = useRef<number>(0);
    const callbacksRef = useRef<MarketSimulatorCallbacks>(callbacks);

    const showBotOrdersRef = useRef<boolean>(true); // Default to true (visible)
    const isInitializedRef = useRef<boolean>(false);

    // State
    const [state, setState] = useState<MarketState>(() => emptyState(fullConfig));

    // Always call the latest callbacks from the timer
    useEffect(() => {
        callbacksRef.current = callbacks;
    });

    /**
     * Initialize components
     */
    const initializeComponents = useCallback(() => {
        // History from 09:00 up to now, then the engine starts at its last price
        const sim = new MarketSimulation({
            initialPrice: fullConfig.initialPrice,
            candlePeriod: fullConfig.candlePeriod,
            historyStart: historyStartTime(Date.now()),
            bots: {
                scenario: fullConfig.scenario,
                volatility: fullConfig.volatility,
                liquidity: fullConfig.liquidity,
                unitSize: fullConfig.unitSize,
                isOddLot: fullConfig.isOddLot,
                intensity: fullConfig.intensity,
            },
        });
        simRef.current = sim;

        // Update state to reflect initialized data immediately
        const snapshot = sim.snapshot();
        setState(prev => ({
            ...prev,
            currentPrice: snapshot.currentPrice,
            orderBook: {
                asks: [],
                bids: [],
                spread: 0,
                bestAsk: null,
                bestBid: null,
                lastPrice: snapshot.currentPrice,
                timestamp: Date.now(),
            },
            candles: snapshot.candles,
            currentCandle: snapshot.currentCandle,
            // Reset 24h stats based on history
            ...snapshot.stats,
        }));

        isInitializedRef.current = true;
    }, [fullConfig.initialPrice, fullConfig.scenario, fullConfig.volatility, fullConfig.liquidity, fullConfig.candlePeriod, fullConfig.unitSize, fullConfig.isOddLot, fullConfig.intensity]);

    /**
     * Re-initialize ONLY the aggregator when timeframe changes
     * Preserves current simulation state (order book, price)
     */
    const reinitializeAggregator = useCallback(() => {
        const sim = simRef.current;
        if (!sim) return;

        // Just update the display period, aggregator handles resampling from base candles
        sim.candles.setPeriod(fullConfig.candlePeriod);
        const candles = sim.candles.getCandles();

        // Update state immediately with re-aggregated candles
        setState(prev => ({
            ...prev,
            candles,
            currentCandle: candles.length > 0 ? candles[candles.length - 1] : null,
            ...sim.candles.getStats(),
        }));
    }, [fullConfig.candlePeriod]);

    /**
     * Main tick function - runs the simulation
     */
    const tick = useCallback(() => {
        const sim = simRef.current;
        if (!sim) return;

        const now = Date.now();
        if (now - lastTickRef.current < fullConfig.tickInterval) {
            return;
        }
        lastTickRef.current = now;

        // Bots trade, every new trade goes into the candles
        const trades = sim.step();

        // Tell the page about the user's own fills (async fills of resting orders too).
        // step() returns every trade since the last tick, so none can be missed.
        const onTrade = callbacksRef.current.onTrade;
        if (onTrade) {
            for (const trade of trades) {
                if (trade.makerSource === 'user' || trade.takerSource === 'user') {
                    onTrade(trade);
                }
            }
        }

        const snapshot = sim.snapshot(showBotOrdersRef.current);

        // Update state
        setState(prev => ({
            ...prev,
            orderBook: snapshot.orderBook,
            candles: snapshot.candles,
            currentCandle: snapshot.currentCandle,
            currentPrice: snapshot.currentPrice,
            recentTrades: snapshot.recentTrades,
            volume24h: snapshot.stats.volume24h,
            high24h: snapshot.stats.high24h,
            low24h: snapshot.stats.low24h,
            change24h: snapshot.stats.change24h,
            changePercent24h: snapshot.stats.changePercent24h,
            tickChange: snapshot.tickChange,
            tickChangePercent: snapshot.tickChangePercent,
            isRunning: true,
        }));
    }, [fullConfig.tickInterval]);

    /**
     * Start the simulation
     */
    const start = useCallback(() => {
        if (!simRef.current) {
            initializeComponents();
        }

        if (tickerRef.current) {
            clearInterval(tickerRef.current);
        }

        tickerRef.current = setInterval(tick, fullConfig.tickInterval);
        setState(prev => ({ ...prev, isRunning: true }));
    }, [tick, fullConfig.tickInterval, initializeComponents]);

    /**
     * Stop the simulation
     */
    const stop = useCallback(() => {
        if (tickerRef.current) {
            clearInterval(tickerRef.current);
            tickerRef.current = null;
        }
        setState(prev => ({ ...prev, isRunning: false }));
    }, []);

    /**
     * Reset the simulation
     */
    // Reset function removed as requested

    /**
     * Submit a user order
     */
    const submitOrder = useCallback((
        side: 'buy' | 'sell',
        type: 'market' | 'limit',
        quantity: number,
        price: number | null,
        condition: OrderCondition = 'GTC'
    ) => {
        if (!simRef.current) return null;

        return simRef.current.engine.submitOrder(side, type, quantity, price, 'user', condition);
    }, []);

    /**
     * Cancel a user order
     */
    const cancelOrder = useCallback((orderId: string) => {
        if (!simRef.current) return false;
        return simRef.current.engine.cancelOrder(orderId);
    }, []);

    /**
     * Set market scenario
     */
    const setScenario = useCallback((scenario: MarketScenario) => {
        simRef.current?.bots.setScenario(scenario);
        setState(prev => ({ ...prev, scenario }));
    }, []);

    /**
     * Toggle bot order visibility
     */
    const toggleBotOrderVisibility = useCallback(() => {
        showBotOrdersRef.current = !showBotOrdersRef.current;
        setState(prev => ({ ...prev, showBotOrders: showBotOrdersRef.current }));
    }, []);

    /**
     * Update bot configuration
     */
    const updateBotConfig = useCallback((config: Partial<BotManagerConfig>) => {
        simRef.current?.bots.updateConfig(config);
    }, []);

    /**
     * Get matching engine (for direct access if needed)
     */
    const getEngine = useCallback(() => simRef.current?.engine ?? null, []);

    // Initialize on mount
    useEffect(() => {
        initializeComponents();
        if (fullConfig.enabled) {
            start();
        }
        return () => { stop(); };
    }, []); // Run once on mount

    // Handle Timeframe Change (Seamless update)
    useEffect(() => {
        if (isInitializedRef.current) {
            reinitializeAggregator();
        }
    }, [fullConfig.candlePeriod]);

    // Handle Speed Change (Restart Interval without full reset)
    useEffect(() => {
        if (state.isRunning) {
            start(); // Restart timer with new interval
        }
    }, [fullConfig.tickInterval]);

    // Update bot config when props change (scenario, settings)
    useEffect(() => {
        if (simRef.current) {
            simRef.current.bots.updateConfig({
                scenario: fullConfig.scenario,
                volatility: fullConfig.volatility,
                liquidity: fullConfig.liquidity,
                unitSize: fullConfig.unitSize,
                isOddLot: fullConfig.isOddLot,
                intensity: fullConfig.intensity,
            });
        }
    }, [fullConfig.scenario, fullConfig.volatility, fullConfig.liquidity, fullConfig.unitSize, fullConfig.isOddLot, fullConfig.intensity]);

    // Update commission rate
    useEffect(() => {
        simRef.current?.engine.setCommissionRate(fullConfig.commissionRate);
    }, [fullConfig.commissionRate]);

    // Return interface
    return {
        state,
        start,
        stop,
        // reset, // Removed
        submitOrder,
        cancelOrder,
        setScenario,
        toggleBotOrderVisibility,
        updateBotConfig,
        getEngine,
    };
}
