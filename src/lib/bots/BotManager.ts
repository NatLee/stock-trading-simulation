import { MarketMakerBot } from './MarketMakerBot';
import { TrendBot } from './TrendBot';
import { NoiseBot } from './NoiseBot';
import {
    BotManagerConfig,
    BotOrder,
    DEFAULT_BOT_MANAGER_CONFIG,
    SCENARIO_MODIFIERS,
    SHARES_PER_LOT,
    ODD_LOT_SHARES,
    ODD_LOT_JITTER,
    effectiveInterval,
    intensityOf,
} from './types';
import { MatchingEngine, MarketScenario, Trade, PriceLevel } from '../matching';
import { SimEnv, realEnv, SIM_TICK_MS } from '../sim/env';

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
    private env: SimEnv;

    constructor(engine: MatchingEngine, config: Partial<BotManagerConfig> = {}, env: SimEnv = realEnv) {
        this.config = { ...DEFAULT_BOT_MANAGER_CONFIG, ...config };
        this.engine = engine;
        this.env = env;

        // Apply scenario modifiers
        this.applyScenario(this.config.scenario);

        // Initialize bots
        this.marketMaker = new MarketMakerBot(this.config.marketMaker, env);
        this.trendBot = new TrendBot(this.config.trend, env);
        this.noiseBot = new NoiseBot(this.config.noise, env);
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
     * How many times a bot acts this tick. A bot whose interval (÷ intensity)
     * is shorter than one tick acts several times ("burst"), skipping its own
     * timer; otherwise it acts once when its timer says it is ready.
     */
    private turnsThisTick(baseInterval: number, ready: () => boolean): { count: number; force: boolean } {
        const interval = effectiveInterval(baseInterval, this.config);
        const bursts = interval < SIM_TICK_MS ? Math.floor(SIM_TICK_MS / interval) : 1;
        if (bursts > 1) return { count: bursts, force: true };
        return { count: ready() ? 1 : 0, force: false };
    }

    /**
     * Run one tick of bot activity
     * Returns the orders that were generated and submitted
     */
    tick(): BotOrder[] {
        const currentPrice = this.engine.getLastPrice();
        const allOrders: BotOrder[] = [];
        const now = this.env.now();

        // Protection Logic: if the best bid/ask is a user order placed less than
        // reactionDelay ago, bots do not trade against it yet (simulated reaction time)
        const book = this.engine.getOrderBook();
        const isFreshUserOrder = (level: PriceLevel | null) =>
            !!level && level.orders.length > 0 && level.orders[0].source === 'user'
            && now - level.orders[0].timestamp < this.config.reactionDelay;
        const bestBid = book.getBestBid();
        const bestAsk = book.getBestAsk();
        const protect = {
            buyLimit: isFreshUserOrder(bestBid) ? bestBid!.price : null,   // don't sell into it
            sellLimit: isFreshUserOrder(bestAsk) ? bestAsk!.price : null,  // don't buy from it
        };

        // Periodic cleanup: remove bot orders that drifted too far from the price
        if (now - this.lastCleanupTime > this.config.pruneInterval) {
            book.pruneDistantOrders(currentPrice, this.config.pruneDistance, 'bot');
            this.lastCleanupTime = now;
        }

        // Update trend bot with price observation
        this.trendBot.observePrice(currentPrice);

        // Market maker: re-quote when due (at most once a tick: a second
        // re-quote in the same tick would replace the first one unchanged)
        if (this.marketMaker.needsRefresh()) {
            this.engine.cancelOrdersBySource('bot');
            const quotes = this.marketMaker.generateQuotes(currentPrice, this.config.volatility, this.config.liquidity);
            this.processOrders(quotes, protect);
            allOrders.push(...quotes);
        }

        // Trend bot, then noise bot
        const trend = this.turnsThisTick(this.trendBot.getTradeInterval(), () => this.trendBot.isReady());
        for (let i = 0; i < trend.count; i++) {
            const orders = this.trendBot.generateOrders(currentPrice, this.config.scenario, trend.force);
            this.processOrders(orders, protect);
            allOrders.push(...orders);
        }

        const noise = this.turnsThisTick(this.noiseBot.getTradeInterval(), () => this.noiseBot.isReady());
        for (let i = 0; i < noise.count; i++) {
            const orders = this.noiseBot.generateOrders(currentPrice, noise.force);
            this.processOrders(orders, protect);
            allOrders.push(...orders);
        }

        return allOrders;
    }

    /**
     * Turn bot lots into shares and submit them, skipping orders that would
     * trade against a protected (fresh) user order
     */
    private processOrders(orders: BotOrder[], protect: { buyLimit: number | null, sellLimit: number | null }): void {
        const { isOddLot } = this.config;
        // One bot "lot" is a board lot of unitSize shares, or ODD_LOT_SHARES in odd-lot mode;
        // sizes grow with √intensity so busy markets also trade a bit bigger
        const lotShares = isOddLot ? ODD_LOT_SHARES : (this.config.unitSize || SHARES_PER_LOT);
        const volumeMultiplier = Math.sqrt(intensityOf(this.config));

        for (const order of orders) {
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

            let qty = order.quantity * lotShares * volumeMultiplier;
            qty = isOddLot
                ? Math.floor(qty) + Math.floor(this.env.random() * ODD_LOT_JITTER)
                : Math.max(SHARES_PER_LOT, Math.round(qty / SHARES_PER_LOT) * SHARES_PER_LOT);

            if (qty > 0) {
                this.engine.submitOrder(order.side, order.type, qty, order.price, 'bot');
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
}
