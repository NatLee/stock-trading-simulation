'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { MatchingEngine, CandleAggregator, MarketScenario, Trade, OrderBookSnapshot } from '../lib/matching';
import { BotManager, BotManagerConfig } from '../lib/bots';
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

/**
 * useMarketSimulator - main hook for the trading simulation
 * 
 * Integrates:
 * - MatchingEngine for order matching
 * - BotManager for automated trading
 * - CandleAggregator for K-line generation
 */
export function useMarketSimulator(config: Partial<MarketSimulatorConfig> = {}, callbacks: MarketSimulatorCallbacks = {}) {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };

    // Core components (refs to avoid re-creation)
    const engineRef = useRef<MatchingEngine | null>(null);
    const botManagerRef = useRef<BotManager | null>(null);
    const candleAggregatorRef = useRef<CandleAggregator | null>(null);
    const tickerRef = useRef<NodeJS.Timeout | null>(null);
    const lastTickRef = useRef<number>(0);
    const previousPriceRef = useRef<number>(fullConfig.initialPrice); // Track previous tick price
    const lastProcessedTradeIdRef = useRef<string | null>(null);
    const processedTradeIdsRef = useRef<Set<string>>(new Set());
    const processedUserTradeIdsRef = useRef<Set<string>>(new Set());

    const showBotOrdersRef = useRef<boolean>(true); // Default to true (visible)
    const isInitializedRef = useRef<boolean>(false);

    // State
    const [state, setState] = useState<MarketState>({
        orderBook: {
            asks: [],
            bids: [],
            spread: 0,
            bestAsk: null,
            bestBid: null,
            lastPrice: fullConfig.initialPrice,
            timestamp: Date.now(),
        },
        candles: [],
        currentCandle: null,
        currentPrice: fullConfig.initialPrice,
        recentTrades: [],
        volume24h: 0,
        high24h: fullConfig.initialPrice,
        low24h: fullConfig.initialPrice,
        change24h: 0,
        changePercent24h: 0,
        tickChange: 0,
        tickChangePercent: 0,
        scenario: fullConfig.scenario,
        isRunning: false,
        showBotOrders: true,
        intensity: fullConfig.intensity,
    });

    /**
     * Initialize components
     */
    const initializeComponents = useCallback(() => {
        // 1. Create candle aggregator first (to generate history)
        candleAggregatorRef.current = new CandleAggregator(
            fullConfig.candlePeriod,
            100,
            fullConfig.initialPrice
        );

        // Generate history starting from 09:00 AM
        const now = new Date();
        now.setHours(9, 0, 0, 0);
        let startTime = now.getTime();

        // If currently before 09:00, use yesterday's 09:00
        if (Date.now() < startTime) {
            startTime -= 24 * 60 * 60 * 1000;
        }

        candleAggregatorRef.current.generateHistory(startTime, fullConfig.initialPrice);

        // 2. Get the last price from history to start the engine
        // This ensures continuity between history and new simulation
        const startPrice = candleAggregatorRef.current.getLastPrice();

        // 3. Create matching engine with startPrice
        engineRef.current = new MatchingEngine(startPrice);

        // 4. Create bot manager
        botManagerRef.current = new BotManager(engineRef.current, {
            scenario: fullConfig.scenario,
            volatility: fullConfig.volatility,
            liquidity: fullConfig.liquidity,
            unitSize: fullConfig.unitSize,
            isOddLot: fullConfig.isOddLot,
            intensity: fullConfig.intensity,
        });

        // Update state to reflect initialized data immediately
        setState(prev => ({
            ...prev,
            currentPrice: startPrice,
            orderBook: {
                asks: [],
                bids: [],
                spread: 0,
                bestAsk: null,
                bestBid: null,
                lastPrice: startPrice,
                timestamp: Date.now(),
            },
            candles: candleAggregatorRef.current?.getAllCandles() as ChartCandleData[] || [],
            currentCandle: candleAggregatorRef.current?.getCurrentCandle() as ChartCandleData | null,
            // Reset 24h stats based on history
            ...candleAggregatorRef.current?.getStats(),
        }));

        isInitializedRef.current = true;
    }, [fullConfig.initialPrice, fullConfig.scenario, fullConfig.volatility, fullConfig.liquidity, fullConfig.candlePeriod]);

    /**
     * Re-initialize ONLY the aggregator when timeframe changes
     * Preserves current simulation state (order book, price)
     */
    const reinitializeAggregator = useCallback(() => {
        if (!candleAggregatorRef.current) return;

        // Just update the display period, aggregator handles resampling from base candles
        candleAggregatorRef.current.setPeriod(fullConfig.candlePeriod);

        // Update state immediately with re-aggregated candles
        setState(prev => ({
            ...prev,
            candles: candleAggregatorRef.current?.getAllCandles() as ChartCandleData[] || [],
            currentCandle: candleAggregatorRef.current?.getCurrentCandle() as ChartCandleData | null,
            ...candleAggregatorRef.current?.getStats(),
        }));
    }, [fullConfig.candlePeriod]);

    /**
     * Main tick function - runs the simulation
     */
    const tick = useCallback(() => {
        if (!engineRef.current || !botManagerRef.current || !candleAggregatorRef.current) {
            return;
        }

        const now = Date.now();
        if (now - lastTickRef.current < fullConfig.tickInterval) {
            return;
        }
        lastTickRef.current = now;

        // Run bot tick (generates and submits orders)
        botManagerRef.current.tick();

        // Get current state from engine
        const currentPrice = engineRef.current.getLastPrice();

        // Calculate Tick Change (relative to Previous Candle Close)
        const prevClose = candleAggregatorRef.current.getPrevClose();
        const tickChange = currentPrice - prevClose;
        const tickChangePercent = prevClose > 0 ? (tickChange / prevClose) * 100 : 0;

        // Update previous price for next tick (still needed for other logic?)
        previousPriceRef.current = currentPrice;

        const excludeSource = !showBotOrdersRef.current ? 'bot' : undefined;
        const orderBook = engineRef.current.getOrderBookSnapshot(15, excludeSource as any); // Cast because flexible types
        const recentTrades = engineRef.current.getRecentTrades(20);

        // Update candle aggregator with recent trades
        for (const trade of recentTrades) {
            // 1. Process for Candles
            if (!processedTradeIdsRef.current.has(trade.tradeId)) {
                candleAggregatorRef.current.processTrade(trade);
                processedTradeIdsRef.current.add(trade.tradeId);
                lastProcessedTradeIdRef.current = trade.tradeId;
            }

            // 2. Notify User Trades (Async Fills)
            // Check if user is involved (maker or taker)
            if (callbacks.onTrade && (trade.makerSource === 'user' || trade.takerSource === 'user')) {
                if (!processedUserTradeIdsRef.current.has(trade.tradeId)) {
                    callbacks.onTrade(trade);
                    processedUserTradeIdsRef.current.add(trade.tradeId);
                }
            }
        }

        // Cleanup processed IDs to prevent memory leak (keep last 500)
        if (processedTradeIdsRef.current.size > 1000) {
            const keepIds = Array.from(processedTradeIdsRef.current).slice(-500);
            processedTradeIdsRef.current = new Set(keepIds);
        }
        if (processedUserTradeIdsRef.current.size > 1000) {
            const keepIds = Array.from(processedUserTradeIdsRef.current).slice(-500);
            processedUserTradeIdsRef.current = new Set(keepIds);
        }

        // Also tick the candle aggregator with current price
        candleAggregatorRef.current.tick(currentPrice);

        // Get candle data
        const candles = candleAggregatorRef.current.getAllCandles();
        const currentCandle = candleAggregatorRef.current.getCurrentCandle();
        const stats = candleAggregatorRef.current.getStats();

        // Update state
        setState(prev => ({
            ...prev,
            orderBook,
            candles: candles as ChartCandleData[],
            currentCandle: currentCandle as ChartCandleData | null,
            currentPrice,
            recentTrades,
            volume24h: stats.volume24h,
            high24h: stats.high24h,
            low24h: stats.low24h,
            change24h: stats.change24h,
            changePercent24h: stats.changePercent24h,
            tickChange,
            tickChangePercent,
            isRunning: true,
        }));
    }, [fullConfig.tickInterval]);

    /**
     * Start the simulation
     */
    const start = useCallback(() => {
        if (!engineRef.current) {
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
        if (!engineRef.current) return null;

        return engineRef.current.submitOrder(side, type, quantity, price, 'user', condition);
    }, []);

    /**
     * Cancel a user order
     */
    const cancelOrder = useCallback((orderId: string) => {
        if (!engineRef.current) return false;
        return engineRef.current.cancelOrder(orderId);
    }, []);

    /**
     * Set market scenario
     */
    const setScenario = useCallback((scenario: MarketScenario) => {
        if (botManagerRef.current) {
            botManagerRef.current.setScenario(scenario);
        }
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
        if (botManagerRef.current) {
            botManagerRef.current.updateConfig(config);
        }
    }, []);

    /**
     * Get matching engine (for direct access if needed)
     */
    const getEngine = useCallback(() => engineRef.current, []);

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
        if (botManagerRef.current) {
            botManagerRef.current.updateConfig({
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
        if (engineRef.current) {
            engineRef.current.setCommissionRate(fullConfig.commissionRate);
        }
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
