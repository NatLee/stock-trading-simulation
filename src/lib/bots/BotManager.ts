import { MarketMakerBot } from './MarketMakerBot';
import { TrendBot } from './TrendBot';
import { NoiseBot } from './NoiseBot';
import {
    BotManagerConfig,
    BotOrder,
    DEFAULT_BOT_MANAGER_CONFIG,
    SCENARIO_MODIFIERS,
} from './types';
import { MatchingEngine, MarketScenario, Trade } from '../matching';

/**
 * BotManager - coordinates all trading bots
 * 
 * Features:
 * - Manages market maker, trend, and noise bots
 * - Handles order submission to matching engine
 * - Updates bot states based on market events
 */
export class BotManager {
    private config: BotManagerConfig;
    private marketMaker: MarketMakerBot;
    private trendBot: TrendBot;
    private noiseBot: NoiseBot;
    private engine: MatchingEngine;
    private lastCleanupTime: number = 0;

    constructor(engine: MatchingEngine, config: Partial<BotManagerConfig> = {}) {
        this.config = { ...DEFAULT_BOT_MANAGER_CONFIG, ...config };
        this.engine = engine;

        // Apply scenario modifiers
        this.applyScenario(this.config.scenario);

        // Initialize bots
        this.marketMaker = new MarketMakerBot(this.config.marketMaker);
        this.trendBot = new TrendBot(this.config.trend);
        this.noiseBot = new NoiseBot(this.config.noise);
    }

    /**
     * Apply scenario modifiers to configuration
     */
    applyScenario(scenario: MarketScenario): void {
        const modifier = SCENARIO_MODIFIERS[scenario];
        if (modifier) {
            this.config = {
                ...this.config,
                ...modifier,
                scenario,
                marketMaker: { ...this.config.marketMaker, ...modifier.marketMaker, intensity: modifier.intensity || this.config.intensity },
                trend: { ...this.config.trend, ...modifier.trend, intensity: modifier.intensity || this.config.intensity },
                noise: { ...this.config.noise, ...modifier.noise, intensity: modifier.intensity || this.config.intensity },
            };
        }
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<BotManagerConfig>): void {
        const oldScenario = this.config.scenario;

        // Update main config
        this.config = { ...this.config, ...config };

        if (config.marketMaker) {
            this.marketMaker.updateConfig(config.marketMaker);
        }
        if (config.trend) {
            this.trendBot.updateConfig(config.trend);
        }
        if (config.noise) {
            this.noiseBot.updateConfig(config.noise);
        }

        // Only apply scenario presets if scenario actually changed
        // This prevents overwriting manual intensity changes when other props update
        if (config.scenario && config.scenario !== oldScenario) {
            this.applyScenario(config.scenario);
        }

        // CRITICAL: If intensity was explicitly passed in this update, 
        // it must override any scenario defaults we just applied.
        if (config.intensity !== undefined) {
            this.config.intensity = config.intensity;
        }

        // Ensure all sub-bots get the latest intensity
        // We update them if intensity was passed OR if scenario changed (which might change default intensity)
        if (config.intensity !== undefined || (config.scenario && config.scenario !== oldScenario)) {
            const newIntensity = this.config.intensity;
            this.marketMaker.updateConfig({ intensity: newIntensity });
            this.trendBot.updateConfig({ intensity: newIntensity });
            this.noiseBot.updateConfig({ intensity: newIntensity });
        }
    }

    /**
     * Get current configuration
     */
    getConfig(): BotManagerConfig {
        return { ...this.config };
    }

    /**
     * Run one tick of bot activity
     * Returns the orders that were generated and submitted
     * 
     * Burst Mode: At high intensity, bots can execute multiple times per tick
     * Example: At 5.0x intensity with 100ms system tick:
     *   - MM: 500ms/5 = 100ms → fires 1x per tick
     *   - Trend: 3000ms/5 = 600ms → fires 1x every 6 ticks (but can burst if MM interval < tick)
     *   - Noise: 2000ms/5 = 400ms → fires 1x every 4 ticks
     */
    tick(): BotOrder[] {
        const currentPrice = this.engine.getLastPrice();
        const allOrders: BotOrder[] = [];

        // Determine multipliers based on mode
        const isOddLot = this.config.isOddLot;
        const unitSize = isOddLot ? 1 : (this.config.unitSize || 1000);

        // Scale quantity: 
        // Standard: Bot 1-5 -> 1000-5000 shares (1 * 1000)
        // Odd Lot: Bot 1-5 -> 100-500 shares (100 * 1)
        const qtyScale = isOddLot ? 100 : 1;

        // Volume scaling based on intensity (sqrt to avoid extreme values)
        const intensity = this.config.intensity || 1.0;
        const volumeMultiplier = Math.sqrt(intensity);

        // Burst-mode: Calculate how many times each bot should fire this tick
        const SYSTEM_TICK = 100; // ms
        const mmInterval = this.marketMaker.getRefreshInterval() / intensity;
        const trendInterval = this.trendBot.getTradeInterval() / intensity;
        const noiseInterval = this.noiseBot.getTradeInterval() / intensity;

        // If effective interval < system tick, bot can fire multiple times
        const mmBursts = mmInterval < SYSTEM_TICK ? Math.floor(SYSTEM_TICK / mmInterval) : 1;
        const trendBursts = trendInterval < SYSTEM_TICK ? Math.floor(SYSTEM_TICK / trendInterval) : 1;
        const noiseBursts = noiseInterval < SYSTEM_TICK ? Math.floor(SYSTEM_TICK / noiseInterval) : 1;

        // Protection Logic: Check if we need to delay reacting to user orders
        // If the best Bid/Ask is a User order placed very recently, bots should ignore it (simulating reaction time)
        const now = Date.now();
        const reactionDelay = this.config.reactionDelay || 1000;
        const book = this.engine.getOrderBook();

        const bestBid = book.getBestBid();
        const bestAsk = book.getBestAsk();

        let protectBuySide = false; // Protect User Bid (Don't Sell into it)
        let protectSellSide = false; // Protect User Ask (Don't Buy from it)

        if (bestBid && bestBid.orders.length > 0 && bestBid.orders[0].source === 'user') {
            if (now - bestBid.orders[0].timestamp < reactionDelay) {
                protectBuySide = true;
            }
        }

        if (bestAsk && bestAsk.orders.length > 0 && bestAsk.orders[0].source === 'user') {
            if (now - bestAsk.orders[0].timestamp < reactionDelay) {
                protectSellSide = true;
            }
        }

        const protect = {
            buyLimit: protectBuySide && bestBid ? bestBid.price : null,
            sellLimit: protectSellSide && bestAsk ? bestAsk.price : null
        };

        // Periodic Cleanup: Every 5 seconds, remove bot orders that are too far (>10%)
        if (now - this.lastCleanupTime > 5000) {
            this.engine.getOrderBook().pruneDistantOrders(currentPrice, 0.1, 'bot');
            this.lastCleanupTime = now;
        }

        // Update trend bot with price observation
        this.trendBot.observePrice(currentPrice);

        // Market Maker: refresh quotes if needed (can burst)
        for (let i = 0; i < mmBursts; i++) {
            if (this.marketMaker.needsRefresh()) {
                // Cancel old market maker orders
                this.engine.cancelOrdersBySource('bot');

                // Generate new quotes
                const mmOrders = this.marketMaker.generateQuotes(
                    currentPrice,
                    this.config.volatility,
                    this.config.liquidity
                );

                // Process orders with protection
                this.processOrders(mmOrders, qtyScale, unitSize, volumeMultiplier, protect);

                allOrders.push(...mmOrders);
            }
        }

        // Trend Bot: generate trend-following orders
        if (trendBursts > 1) {
            // Burst mode: execute multiple times without updating internal timer
            for (let i = 0; i < trendBursts; i++) {
                const trendOrders = this.trendBot.generateOrders(
                    currentPrice,
                    this.config.scenario,
                    true // force execution
                );

                this.processOrders(trendOrders, qtyScale, unitSize, volumeMultiplier, protect);
                allOrders.push(...trendOrders);
            }
        } else if (this.trendBot.isReady()) {
            // Normal mode
            const trendOrders = this.trendBot.generateOrders(
                currentPrice,
                this.config.scenario
            );
            this.processOrders(trendOrders, qtyScale, unitSize, volumeMultiplier, protect);
            allOrders.push(...trendOrders);
        }

        // Noise Bot: generate random orders
        if (noiseBursts > 1) {
            // Burst mode
            for (let i = 0; i < noiseBursts; i++) {
                const noiseOrders = this.noiseBot.generateOrders(currentPrice, true);
                this.processOrders(noiseOrders, qtyScale, unitSize, volumeMultiplier, protect);
                allOrders.push(...noiseOrders);
            }
        } else if (this.noiseBot.isReady()) {
            // Normal mode
            const noiseOrders = this.noiseBot.generateOrders(currentPrice);
            this.processOrders(noiseOrders, qtyScale, unitSize, volumeMultiplier, protect);
            allOrders.push(...noiseOrders);
        }

        return allOrders;
    }

    /**
     * Helper to process and submit orders
     */
    private processOrders(
        orders: BotOrder[],
        qtyScale: number,
        unitSize: number,
        volumeMultiplier: number,
        protect: { buyLimit: number | null, sellLimit: number | null }
    ): void {
        const isOddLot = this.config.isOddLot;

        for (const order of orders) {
            // Filter orders that hit protected user price levels
            // If protectBuyLimit (User Bid) is set, Don't SELL <= that price
            if (order.side === 'sell' && protect.buyLimit !== null) {
                if (order.type === 'market') continue; // Market sell hits bid
                if (order.type === 'limit' && order.price! <= protect.buyLimit) continue; // Limit sell crosses bid
            }
            // If protectSellLimit (User Ask) is set, Don't BUY >= that price
            if (order.side === 'buy' && protect.sellLimit !== null) {
                if (order.type === 'market') continue; // Market buy hits ask
                if (order.type === 'limit' && order.price! >= protect.sellLimit) continue; // Limit buy crosses ask
            }

            let qty = order.quantity * qtyScale * unitSize * volumeMultiplier;

            if (isOddLot) {
                // Odd lot: floor to integer and add randomness (0-99 shares)
                qty = Math.floor(qty) + Math.floor(Math.random() * 99);
            } else {
                // Standard: round to nearest lot (1000 shares)
                qty = Math.max(1000, Math.round(qty / 1000) * 1000);
            }

            if (qty > 0) {
                this.engine.submitOrder(
                    order.side,
                    order.type,
                    qty,
                    order.price,
                    'bot'
                );
                // Update order object for return
                order.quantity = qty;
            }
        }
    }
    onTrade(trade: Trade): void {
        // Update market maker inventory if it was involved
        if (trade.makerSource === 'bot') {
            // Market maker was the maker
            const side = trade.buyOrderId.startsWith('BOT') ? 'buy' : 'sell';
            this.marketMaker.updateInventory(side, trade.quantity);
        }
    }

    /**
     * Reset all bots
     */
    reset(): void {
        this.marketMaker.resetInventory();
        this.trendBot.reset();
        this.noiseBot.reset();
        this.engine.cancelOrdersBySource('bot');
    }

    /**
     * Set scenario preset
     */
    setScenario(scenario: MarketScenario): void {
        this.applyScenario(scenario);
        this.marketMaker.updateConfig(this.config.marketMaker);
        this.trendBot.updateConfig(this.config.trend);
        this.noiseBot.updateConfig(this.config.noise);
    }

    /**
     * Enable/disable specific bot
     */
    setBotEnabled(botType: 'marketMaker' | 'trend' | 'noise', enabled: boolean): void {
        switch (botType) {
            case 'marketMaker':
                this.config.marketMaker.enabled = enabled;
                this.marketMaker.updateConfig({ enabled });
                break;
            case 'trend':
                this.config.trend.enabled = enabled;
                this.trendBot.updateConfig({ enabled });
                break;
            case 'noise':
                this.config.noise.enabled = enabled;
                this.noiseBot.updateConfig({ enabled });
                break;
        }
    }

    /**
     * Get bot stats
     */
    getStats(): {
        marketMakerInventory: number;
        trendBotReady: boolean;
        noiseBotReady: boolean;
        scenario: MarketScenario;
        volatility: number;
        liquidity: number;
    } {
        return {
            marketMakerInventory: this.marketMaker.getInventory(),
            trendBotReady: this.trendBot.isReady(),
            noiseBotReady: this.noiseBot.isReady(),
            scenario: this.config.scenario,
            volatility: this.config.volatility,
            liquidity: this.config.liquidity,
        };
    }
}
