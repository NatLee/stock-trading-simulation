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
        if (config.scenario) {
            this.applyScenario(config.scenario);
        }

        // Ensure all sub-bots get the latest intensity if it changed
        if (config.intensity !== undefined || config.scenario) {
            this.marketMaker.updateConfig({ intensity: this.config.intensity });
            this.trendBot.updateConfig({ intensity: this.config.intensity });
            this.noiseBot.updateConfig({ intensity: this.config.intensity });
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

        // Update trend bot with price observation
        this.trendBot.observePrice(currentPrice);

        // Market Maker: refresh quotes if needed
        if (this.marketMaker.needsRefresh()) {
            // Cancel old market maker orders
            this.engine.cancelOrdersBySource('bot');

            // Generate new quotes
            const mmOrders = this.marketMaker.generateQuotes(
                currentPrice,
                this.config.volatility,
                this.config.liquidity
            );

            // Submit orders
            for (const order of mmOrders) {
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

            allOrders.push(...mmOrders);
        }

        // Trend Bot: generate trend-following orders
        if (this.trendBot.isReady()) {
            const trendOrders = this.trendBot.generateOrders(
                currentPrice,
                this.config.scenario
            );

            for (const order of trendOrders) {
                let qty = order.quantity * qtyScale * unitSize * volumeMultiplier;

                if (isOddLot) {
                    qty = Math.floor(qty) + Math.floor(Math.random() * 99);
                } else {
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
                    order.quantity = qty;
                }
            }

            allOrders.push(...trendOrders);
        }

        // Noise Bot: generate random orders
        if (this.noiseBot.isReady()) {
            const noiseOrders = this.noiseBot.generateOrders(currentPrice);

            for (const order of noiseOrders) {
                let qty = order.quantity * qtyScale * unitSize * volumeMultiplier;

                if (isOddLot) {
                    qty = Math.floor(qty) + Math.floor(Math.random() * 99);
                } else {
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
                    order.quantity = qty;
                }
            }

            allOrders.push(...noiseOrders);
        }

        return allOrders;
    }

    /**
     * Handle trade event - update bot inventories
     */
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
