import { describe, expect, it } from 'vitest';
import { MarketMakerBot } from './MarketMakerBot';
import { TrendBot } from './TrendBot';
import { NoiseBot } from './NoiseBot';
import { BotManager } from './BotManager';
import {
    DEFAULT_MARKET_MAKER_CONFIG,
    DEFAULT_NOISE_BOT_CONFIG,
    DEFAULT_TREND_BOT_CONFIG,
    SCENARIO_MODIFIERS,
} from './types';
import { MatchingEngine } from '../matching/MatchingEngine';
import { PriceStep } from '../matching/PriceStep';
import { SimEnv, deterministicEnv, manualClock } from '../sim/env';

/** An env whose dice return the given numbers in a loop */
function fixedDice(values: number[], start = 1_000_000): SimEnv & { clock: ReturnType<typeof manualClock> } {
    const clock = manualClock(start);
    let i = 0;
    return { random: () => values[i++ % values.length], now: clock.now, clock };
}

describe('MarketMakerBot', () => {
    it('quotes depth + floor(2 × intensity) levels a side around the last price', () => {
        const env = fixedDice([0.5]);
        const mm = new MarketMakerBot({ ...DEFAULT_MARKET_MAKER_CONFIG, intensity: 1 }, env);
        const quotes = mm.generateQuotes(50, 1, 1);
        const bids = quotes.filter(q => q.side === 'buy');
        const asks = quotes.filter(q => q.side === 'sell');

        expect(bids).toHaveLength(12);
        expect(asks).toHaveLength(12);
        bids.forEach((q, i) => {
            // bid_i = floor_tick(P × (1 − (spread × volatility + 0.05% × i)))
            expect(q.price).toBe(PriceStep.floorToTick(50 * (1 - (0.002 + 0.0005 * i))));
            expect(q.type).toBe('limit');
        });
        asks.forEach((q, i) => {
            expect(q.price).toBe(PriceStep.ceilToTick(50 * (1 + (0.002 + 0.0005 * i))));
        });
        expect(bids[0].price).toBe(49.9);
        expect(asks[0].price).toBe(50.1);
    });

    it('widens the spread with volatility and grows size with liquidity and depth', () => {
        const env = fixedDice([0.5]);
        const mm = new MarketMakerBot({ ...DEFAULT_MARKET_MAKER_CONFIG, intensity: 1 }, env);
        const calm = mm.generateQuotes(100, 1, 1);
        const wild = mm.generateQuotes(100, 3, 2);

        const bestAsk = (qs: typeof calm) => Math.min(...qs.filter(q => q.side === 'sell').map(q => q.price!));
        expect(bestAsk(calm)).toBe(PriceStep.ceilToTick(100 * 1.002));
        expect(bestAsk(wild)).toBe(PriceStep.ceilToTick(100 * 1.006));

        // size_i = floor((min + U × (max − min)) × liquidity × (1 + 2i / levels)); U = 0.5 -> 6 lots
        const sizes = wild.filter(q => q.side === 'buy').map(q => q.quantity);
        expect(sizes[0]).toBe(12);
        expect(sizes[11]).toBe(Math.floor(6 * 2 * (1 + (11 / 12) * 2)));
    });

    it('refreshes every refreshInterval / intensity ms', () => {
        const env = fixedDice([0.5]);
        const mm = new MarketMakerBot({ ...DEFAULT_MARKET_MAKER_CONFIG, intensity: 2 }, env);
        expect(mm.needsRefresh()).toBe(true);
        mm.generateQuotes(50);
        env.clock.advance(249);
        expect(mm.needsRefresh()).toBe(false);
        env.clock.advance(1);
        expect(mm.needsRefresh()).toBe(true);
    });
});

describe('TrendBot', () => {
    function withHistory(prices: number[], config = {}) {
        const env = fixedDice([0.5]);
        const bot = new TrendBot({ ...DEFAULT_TREND_BOT_CONFIG, intensity: 1, ...config }, env);
        prices.forEach(p => bot.observePrice(p));
        return { bot, env };
    }

    it('measures trend as the % change between the last two 5-tick averages, × 100, clamped to ±1', () => {
        expect(withHistory([100, 100, 100, 100]).bot.calculateTrend()).toBe(0);
        expect(withHistory([100, 100, 100, 100, 100, 100.2, 100.2, 100.2, 100.2, 100.2]).bot.calculateTrend()).toBeCloseTo(0.2);
        expect(withHistory([100, 100, 100, 100, 100, 90, 90, 90, 90, 90]).bot.calculateTrend()).toBe(-1);
    });

    it('stays out when |trend + scenario bias| is below 0.3 × (1 − strength)', () => {
        const { bot } = withHistory(Array(10).fill(50));
        expect(bot.generateOrders(50, 'sideways')).toEqual([]);
        // ...and keeps checking every tick: a skipped signal does not start the wait
        expect(bot.isReady()).toBe(true);
    });

    it('in a bull scenario places a passive bid 0.1–0.3% under the price', () => {
        // bias +0.3 ≥ threshold 0.3 × (1 − 0.3); size = floor(2 + 3 × 0.3 × 0.3) = 2 lots
        const { bot } = withHistory(Array(10).fill(50));
        const orders = bot.generateOrders(50, 'bull');
        expect(orders).toEqual([
            { side: 'buy', type: 'limit', price: PriceStep.floorToTick(50 * (1 - 0.002)), quantity: 2, botType: 'trend' },
        ]);
        expect(bot.isReady()).toBe(false);
    });

    it('crosses the spread (price ± 0.5%) when the combined signal is above 0.6', () => {
        const { bot } = withHistory([50, 50, 50, 50, 50, 51, 51, 51, 51, 51]);
        const [order] = bot.generateOrders(51, 'sideways');
        expect(order.side).toBe('buy');
        expect(order.price).toBe(PriceStep.floorToTick(51 * 1.005));
        expect(order.quantity).toBe(Math.floor(2 + 3 * 1 * 0.3));

        const down = withHistory([51, 51, 51, 51, 51, 50, 50, 50, 50, 50]).bot.generateOrders(50, 'sideways')[0];
        expect(down.side).toBe('sell');
        expect(down.price).toBe(PriceStep.ceilToTick(50 * 0.995));
    });

    it('uses buyStrength / sellStrength instead of aggressiveness when given', () => {
        // bear: bias −0.3, sellStrength 0.8 -> threshold 0.06, size floor(2 + 3 × 0.3 × 0.8) = 2
        const { bot } = withHistory(Array(10).fill(50), SCENARIO_MODIFIERS.bear.trend);
        const [order] = bot.generateOrders(50, 'bear');
        expect(order.side).toBe('sell');
        expect(order.price).toBe(PriceStep.ceilToTick(50 * 1.002));
    });

    it('skips about 30% of passive orders and 10% of aggressive ones', () => {
        const env = fixedDice([0.5, 0.75]); // second draw decides whether to send
        const bot = new TrendBot({ ...DEFAULT_TREND_BOT_CONFIG, intensity: 1 }, env);
        Array(10).fill(50).forEach(p => bot.observePrice(p));
        expect(bot.generateOrders(50, 'bull')).toEqual([]); // 0.75 ≥ 0.7
        expect(bot.isReady()).toBe(false); // still counts as its turn
    });
});

describe('NoiseBot', () => {
    it('sends one random order per interval: side 50/50, 1–2 lots, market or limit within ±0.5%', () => {
        const env = deterministicEnv(5, 1_000_000);
        const bot = new NoiseBot({ ...DEFAULT_NOISE_BOT_CONFIG, intensity: 1 }, env);
        const orders = [];
        for (let i = 0; i < 2000; i++) {
            orders.push(...bot.generateOrders(100));
            env.clock.advance(2000);
        }
        expect(orders).toHaveLength(2000);

        const buys = orders.filter(o => o.side === 'buy').length;
        const markets = orders.filter(o => o.type === 'market');
        expect(buys / orders.length).toBeGreaterThan(0.45);
        expect(buys / orders.length).toBeLessThan(0.55);
        expect(markets.length / orders.length).toBeCloseTo(0.3, 1);
        expect(new Set(orders.map(o => o.quantity))).toEqual(new Set([1, 2])); // floor(1 + U × 2): 3 never comes up
        for (const o of orders.filter(o => o.type === 'limit')) {
            expect(o.price!).toBeGreaterThanOrEqual(99.5);
            expect(o.price!).toBeLessThanOrEqual(100.5);
        }
        for (const o of markets) expect(o.price).toBeNull();
    });

    it('waits tradeInterval / intensity between orders', () => {
        const env = fixedDice([0.4]);
        const bot = new NoiseBot({ ...DEFAULT_NOISE_BOT_CONFIG, intensity: 4 }, env);
        expect(bot.generateOrders(100)).toHaveLength(1);
        env.clock.advance(499);
        expect(bot.isReady()).toBe(false);
        expect(bot.generateOrders(100)).toEqual([]);
        env.clock.advance(1);
        expect(bot.isReady()).toBe(true);
    });
});

describe('BotManager', () => {
    function managerAt(price: number, config = {}, seed = 1) {
        const env = deterministicEnv(seed, 1_000_000);
        const engine = new MatchingEngine(price, env);
        const bots = new BotManager(engine, { scenario: 'sideways', intensity: 1, ...config }, env);
        return { engine, bots, env };
    }

    it('applies a scenario preset to itself and to each bot', () => {
        const { bots } = managerAt(50);
        bots.setScenario('crash');
        const config = bots.getConfig();
        expect(config).toMatchObject({ scenario: 'crash', volatility: 3, liquidity: 0.5, intensity: 3 });
        expect(config.marketMaker).toMatchObject({ spreadPercent: 0.01, depth: 5, intensity: 3 });
        expect(config.trend).toMatchObject({ aggressiveness: 0.9, buyStrength: 0.05, sellStrength: 0.95, tradeInterval: 800 });
        expect(config.noise).toMatchObject({ marketOrderProbability: 0.7, tradeInterval: 1000 });
    });

    it('turns bot lot counts into shares: whole lots of 1000, at least one', () => {
        const { bots } = managerAt(50, { unitSize: 1000, intensity: 1 });
        const orders = bots.tick();
        expect(orders.length).toBeGreaterThan(0);
        for (const o of orders) {
            expect(o.quantity % 1000).toBe(0);
            expect(o.quantity).toBeGreaterThanOrEqual(1000);
        }
    });

    it('in odd-lot mode sends lots × 100 × √intensity shares plus 0–98 random shares', () => {
        const { bots } = managerAt(50, { isOddLot: true });
        bots.updateConfig({ intensity: 1 }); // the sideways preset had set 0.8
        const orders = bots.tick().filter(o => o.botType === 'marketMaker');
        expect(orders.length).toBeGreaterThan(0);
        for (const o of orders) {
            expect(Number.isInteger(o.quantity)).toBe(true);
            expect(o.quantity).toBeGreaterThanOrEqual(200); // MM min 2 lots
            expect(o.quantity % 100).toBeLessThan(99);
        }
    });

    it('a scenario preset sets intensity even when the constructor got another one', () => {
        // The trading page sends its slider value right after, see useMarketSimulator
        const { bots } = managerAt(50, { intensity: 1 });
        expect(bots.getConfig().intensity).toBe(0.8);
    });

    it('re-quoting cancels every resting bot order, not just the market maker ones', () => {
        const { engine, bots, env } = managerAt(50);
        bots.tick();
        engine.submitOrder('buy', 'limit', 1000, 40, 'bot'); // e.g. a resting trend/noise order
        engine.submitOrder('buy', 'limit', 1000, 40, 'user');
        env.clock.advance(625); // 500 ms / intensity 0.8

        bots.tick();
        const level = engine.getOrderBookSnapshot(100).bids.find(l => l.price === 40);
        expect(level).toMatchObject({ quantity: 1000, hasUserOrder: true, hasBotOrder: false });
    });

    it('gives a fresh user bid one second before bots sell into it', () => {
        const { engine, bots, env } = managerAt(50, { intensity: 1 }, 11);
        for (let i = 0; i < 50; i++) { env.clock.advance(100); bots.tick(); }

        const bestAsk = engine.getOrderBookSnapshot().bestAsk!;
        const order = engine.submitOrder('buy', 'limit', 1000, PriceStep.floorToTick(bestAsk - 0.05), 'user');
        expect(order.status).toBe('pending');

        // Within the reaction delay no bot order may hit it
        for (let i = 0; i < 9; i++) {
            env.clock.advance(100);
            bots.tick();
            expect(engine.getOrderBook().getOrder(order.orderId)?.remainingQuantity).toBe(1000);
        }
    });
});
