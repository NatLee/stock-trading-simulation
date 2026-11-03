import { MarketMakerBot } from './MarketMakerBot';
import { TrendBot } from './TrendBot';
import { NoiseBot } from './NoiseBot';
import {
    BotManagerConfig,
    BotOrder,
    BotSettings,
    DEFAULT_BOT_MANAGER_CONFIG,
    resolveBotConfig,
    SHARES_PER_LOT,
    ODD_LOT_SHARES,
    ODD_LOT_JITTER,
    effectiveInterval,
    intensityOf,
} from './types';
import { MatchingEngine, MarketScenario, OrderSide, PriceLevel } from '../matching';
import { SimEnv, realEnv, SIM_TICK_MS } from '../sim/env';

/**
 * BotManager - coordinates all trading bots
 *
 * - Holds the scenario and the page's own settings, and always derives the
 *   bots' configuration from them (resolveBotConfig): defaults, then the
 *   scenario preset, then the page's settings.
 * - Runs the bots every tick and submits their orders.
 * - Tells the market maker which of its quotes were filled, so it can move
 *   its quotes with its inventory.
 */
export class BotManager {
    private scenario: MarketScenario;
    private settings: Partial<BotSettings>;
    private config: BotManagerConfig;
    private marketMaker: MarketMakerBot;
    private trendBot: TrendBot;
    private noiseBot: NoiseBot;
    private engine: MatchingEngine;
    private lastCleanupTime: number = 0;
    private env: SimEnv;
    /** The market maker's resting quotes: order ID -> side */
    private quoteSides = new Map<string, OrderSide>();
    /** Engine trade cursor: trades before it have been checked for quote fills */
    private tradeCursor: number;

    constructor(
        engine: MatchingEngine,
        options: Partial<BotSettings> & { scenario?: MarketScenario } = {},
        env: SimEnv = realEnv,
    ) {
        const { scenario = DEFAULT_BOT_MANAGER_CONFIG.scenario, ...settings } = options;
        this.engine = engine;
        this.env = env;
        this.scenario = scenario;
        this.settings = settings;
        this.config = resolveBotConfig(scenario, settings);
        this.tradeCursor = engine.getTradeCount();

        this.marketMaker = new MarketMakerBot(this.config.marketMaker, env);
        this.trendBot = new TrendBot(this.config.trend, env);
        this.noiseBot = new NoiseBot(this.config.noise, env);
    }

    /**
     * Switch scenario. The bots start over from the defaults plus this
     * scenario's preset, and the pace goes back to the scenario's own
     * intensity (the page moves its slider there too).
     */
    setScenario(scenario: MarketScenario): void {
        this.scenario = scenario;
        delete this.settings.intensity;
        this.applyConfig();
    }

    /**
     * Change the page's own settings (lot size, odd lots, intensity slider).
     * The scenario stays as it is.
     */
    updateSettings(settings: Partial<BotSettings>): void {
        this.settings = { ...this.settings, ...settings };
        this.applyConfig();
    }

    private applyConfig(): void {
        this.config = resolveBotConfig(this.scenario, this.settings);
        this.marketMaker.updateConfig(this.config.marketMaker);
        this.trendBot.updateConfig(this.config.trend);
        this.noiseBot.updateConfig(this.config.noise);
    }

    /**
     * Get current configuration
     */
    getConfig(): BotManagerConfig {
        return { ...this.config };
    }

    /** The market maker's inventory, in lots (+ long, − short) */
    getMarketMakerInventory(): number {
        return this.marketMaker.getInventory();
    }

    /** One bot lot in shares, in the current mode */
    private lotShares(): number {
        return this.config.isOddLot ? ODD_LOT_SHARES : (this.config.unitSize || SHARES_PER_LOT);
    }

    /**
     * Book every fill of the market maker's quotes since the last check into
     * its inventory. Runs before it re-quotes, so the IDs of the quotes it is
     * about to cancel are still known.
     */
    private syncMarketMakerInventory(): void {
        const trades = this.engine.getTradesSince(this.tradeCursor);
        this.tradeCursor = this.engine.getTradeCount();
        const lotShares = this.lotShares();
        for (const trade of trades) {
            if (this.quoteSides.has(trade.buyOrderId)) this.marketMaker.updateInventory('buy', trade.quantity / lotShares);
            if (this.quoteSides.has(trade.sellOrderId)) this.marketMaker.updateInventory('sell', trade.quantity / lotShares);
        }
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

        // Market maker: book its fills, then re-quote when due (at most once a
        // tick: a second re-quote in the same tick would replace the first one unchanged)
        this.syncMarketMakerInventory();
        if (this.marketMaker.needsRefresh()) {
            this.engine.cancelOrdersBySource('bot');
            this.quoteSides.clear();
            const quotes = this.marketMaker.generateQuotes(currentPrice, this.config.volatility, this.config.liquidity);
            for (const { orderId, side } of this.processOrders(quotes, protect)) {
                this.quoteSides.set(orderId, side);
            }
            allOrders.push(...quotes);
        }

        // Trend bot, then noise bot
        const trend = this.turnsThisTick(this.trendBot.getTradeInterval(), () => this.trendBot.isReady());
        for (let i = 0; i < trend.count; i++) {
            const orders = this.trendBot.generateOrders(currentPrice, trend.force);
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
     * trade against a protected (fresh) user order. Returns what was submitted.
     */
    private processOrders(
        orders: BotOrder[],
        protect: { buyLimit: number | null, sellLimit: number | null },
    ): { orderId: string; side: OrderSide }[] {
        const { isOddLot } = this.config;
        // One bot "lot" is a board lot of unitSize shares, or ODD_LOT_SHARES in odd-lot mode;
        // sizes grow with √intensity so busy markets also trade a bit bigger
        const lotShares = this.lotShares();
        const volumeMultiplier = Math.sqrt(intensityOf(this.config));
        const submitted: { orderId: string; side: OrderSide }[] = [];

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
                const result = this.engine.submitOrder(order.side, order.type, qty, order.price, 'bot');
                submitted.push({ orderId: result.orderId, side: order.side });
                // Update order object for return
                order.quantity = qty;
            }
        }
        return submitted;
    }

    /**
     * Reset all bots
     */
    reset(): void {
        this.marketMaker.resetInventory();
        this.quoteSides.clear();
        this.tradeCursor = this.engine.getTradeCount();
        this.trendBot.reset();
        this.noiseBot.reset();
        this.engine.cancelOrdersBySource('bot');
    }
}
