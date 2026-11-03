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
    resolveBotConfig,
    SCENARIO_LABELS,
    SCENARIO_LEVELS,
    scenarioLevel,
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

    it('quotes lower when long and higher when short, by up to inventorySkew spreads', () => {
        // At 100 one tick is 0.5, so use a spread of several ticks: 0.2% × 5 = 1.0
        const VOLATILITY = 5;
        const config = { ...DEFAULT_MARKET_MAKER_CONFIG, intensity: 1 };
        const quotesWith = (inventory: number) => {
            const mm = new MarketMakerBot(config, fixedDice([0.5]));
            mm.updateInventory(inventory > 0 ? 'buy' : 'sell', Math.abs(inventory));
            const qs = mm.generateQuotes(100, VOLATILITY, 1);
            return {
                bid: Math.max(...qs.filter(q => q.side === 'buy').map(q => q.price!)),
                ask: Math.min(...qs.filter(q => q.side === 'sell').map(q => q.price!)),
            };
        };
        const flat = quotesWith(0);
        const long = quotesWith(config.inventoryLimit);       // full: shift = inventorySkew spreads down
        const short = quotesWith(-config.inventoryLimit);
        const s = config.spreadPercent * VOLATILITY;
        expect(long.bid).toBe(PriceStep.floorToTick(100 * (1 - s - config.inventorySkew * s)));
        expect(long.ask).toBe(PriceStep.ceilToTick(100 * (1 + s - config.inventorySkew * s)));
        expect(short.bid).toBe(PriceStep.floorToTick(100 * (1 - s + config.inventorySkew * s)));
        expect(long.ask).toBeLessThan(flat.ask);   // too much stock: sell more eagerly
        expect(long.bid).toBeLessThan(flat.bid);   // ...and buy less
        expect(short.bid).toBeGreaterThan(flat.bid); // short: buy back more eagerly
        expect(short.ask).toBeGreaterThan(flat.ask);
        // beyond the limit the shift stays at its full size
        expect(quotesWith(5 * config.inventoryLimit)).toEqual(long);
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

    it('stays out when |trend + bias| is below entryThreshold × (1 − strength)', () => {
        const { bot } = withHistory(Array(10).fill(50));
        expect(bot.generateOrders(50)).toEqual([]);
        // ...and keeps checking every tick: a skipped signal does not start the wait
        expect(bot.isReady()).toBe(true);
    });

    it('with a +0.3 bias places a passive bid 0.1–0.3% under the price', () => {
        // bias +0.3 ≥ threshold 0.3 × (1 − 0.3); size = floor(2 + 3 × 0.3 × 0.3) = 2 lots
        const { bot } = withHistory(Array(10).fill(50), { bias: 0.3 });
        const orders = bot.generateOrders(50);
        expect(orders).toEqual([
            { side: 'buy', type: 'limit', price: PriceStep.floorToTick(50 * (1 - 0.002)), quantity: 2, botType: 'trend' },
        ]);
        expect(bot.isReady()).toBe(false);
    });

    it('crosses the spread (price ± 0.5%) when the combined signal is above 0.6', () => {
        const { bot } = withHistory([50, 50, 50, 50, 50, 51, 51, 51, 51, 51]);
        const [order] = bot.generateOrders(51);
        expect(order.side).toBe('buy');
        expect(order.price).toBe(PriceStep.floorToTick(51 * 1.005));
        expect(order.quantity).toBe(Math.floor(2 + 3 * 1 * 0.3));

        const down = withHistory([51, 51, 51, 51, 51, 50, 50, 50, 50, 50]).bot.generateOrders(50)[0];
        expect(down.side).toBe('sell');
        expect(down.price).toBe(PriceStep.ceilToTick(50 * 0.995));
    });

    it('uses buyStrength / sellStrength instead of aggressiveness when given', () => {
        // bias −0.3, sellStrength 0.8 -> threshold 0.06, size floor(2 + 3 × 0.3 × 0.8) = 2
        const { bot } = withHistory(Array(10).fill(50), { buyStrength: 0.2, sellStrength: 0.8, bias: -0.3 });
        const [order] = bot.generateOrders(50);
        expect(order.side).toBe('sell');
        expect(order.price).toBe(PriceStep.ceilToTick(50 * 1.002));
    });

    it('skips about 30% of passive orders and 10% of aggressive ones', () => {
        const env = fixedDice([0.5, 0.75]); // second draw decides whether to send
        const bot = new TrendBot({ ...DEFAULT_TREND_BOT_CONFIG, bias: 0.3, intensity: 1 }, env);
        Array(10).fill(50).forEach(p => bot.observePrice(p));
        expect(bot.generateOrders(50)).toEqual([]); // 0.75 ≥ 0.7
        expect(bot.isReady()).toBe(false); // still counts as its turn
    });

    it('a bias above aggressiveAbove crosses the spread every turn, in the bias direction', () => {
        const { bot, env } = withHistory(Array(10).fill(50), { bias: -0.8, sellStrength: 0.95 });
        for (let turn = 0; turn < 5; turn++) {
            const [order] = bot.generateOrders(50);
            if (order) {
                expect(order.side).toBe('sell');
                expect(order.price).toBe(PriceStep.ceilToTick(50 * 0.995));
            }
            env.clock.advance(DEFAULT_TREND_BOT_CONFIG.tradeInterval);
        }
    });

    it('biasJitter adds a random lean of ±biasJitter each turn', () => {
        // dice: first draw is the jitter. U = 1 -> +jitter, U = 0 -> −jitter
        const up = new TrendBot({ ...DEFAULT_TREND_BOT_CONFIG, biasJitter: 0.7, intensity: 1 }, fixedDice([0.99999, 0.5, 0]));
        const down = new TrendBot({ ...DEFAULT_TREND_BOT_CONFIG, biasJitter: 0.7, intensity: 1 }, fixedDice([0, 0.5, 0]));
        Array(10).fill(50).forEach(p => { up.observePrice(p); down.observePrice(p); });
        expect(up.generateOrders(50)[0].side).toBe('buy');
        expect(down.generateOrders(50)[0].side).toBe('sell');
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

    it('applies a scenario as defaults + its preset, to itself and to each bot', () => {
        const { bots } = managerAt(50);
        bots.setScenario('crash');
        const config = bots.getConfig();
        const preset = SCENARIO_MODIFIERS.crash;
        expect(config).toMatchObject({ scenario: 'crash', volatility: preset.volatility, liquidity: preset.liquidity, intensity: preset.intensity });
        expect(config.marketMaker).toEqual({ ...DEFAULT_MARKET_MAKER_CONFIG, ...preset.marketMaker, intensity: preset.intensity });
        expect(config.trend).toEqual({ ...DEFAULT_TREND_BOT_CONFIG, ...preset.trend, intensity: preset.intensity });
        expect(config.noise).toEqual({ ...DEFAULT_NOISE_BOT_CONFIG, ...preset.noise, intensity: preset.intensity });
    });

    it('behaves the same whichever scenario came before (user decision 2)', () => {
        const fresh = new BotManager(new MatchingEngine(50), { scenario: 'bull' }).getConfig();
        const { bots } = managerAt(50);
        for (const s of ['crash', 'volatile', 'accumulation', 'calm'] as const) bots.setScenario(s);
        bots.setScenario('bull');
        expect(bots.getConfig()).toEqual(fresh);
        expect(resolveBotConfig('bull')).toEqual(fresh);
    });

    it('keeps the chosen scenario when the page sends its own settings (user decision 1)', () => {
        // The page moves the intensity slider right after a pick, and resends lot size / odd lots
        const { bots } = managerAt(50);
        bots.setScenario('bull');
        bots.updateSettings({ unitSize: 2000, isOddLot: false, intensity: 1.5 });
        const config = bots.getConfig();
        expect(config.scenario).toBe('bull');
        expect(config.volatility).toBe(SCENARIO_MODIFIERS.bull.volatility);
        expect(config.trend.bias).toBe(SCENARIO_MODIFIERS.bull.trend!.bias);
        expect(config.unitSize).toBe(2000);
    });

    it('the intensity slider overrides the preset until the next scenario pick', () => {
        const { bots } = managerAt(50);
        bots.updateSettings({ intensity: 2.2 });
        expect(bots.getConfig().intensity).toBe(2.2);
        expect(bots.getConfig().trend.intensity).toBe(2.2);
        bots.setScenario('calm');
        expect(bots.getConfig().intensity).toBe(SCENARIO_MODIFIERS.calm.intensity);
    });

    it('books fills of its own quotes into the market maker inventory, in lots (user decision 3)', () => {
        // Squeeze: the other bots are quiet for seconds after their first move
        const { engine, bots, env } = managerAt(50, { scenario: 'squeeze' });
        bots.tick(); // first quotes (the noise bot may trade once too)
        env.clock.advance(100);
        bots.tick(); // ...which gets booked here
        const before = bots.getMarketMakerInventory();

        const buy = engine.submitOrder('buy', 'market', 3000, null, 'user', 'IOC'); // the market maker sells 3 lots
        expect(buy.trades.every(t => t.makerSource === 'bot')).toBe(true);
        env.clock.advance(100);
        bots.tick();
        expect(bots.getMarketMakerInventory()).toBe(before - 3);

        engine.submitOrder('sell', 'market', 5000, null, 'user', 'IOC'); // and buys 5
        env.clock.advance(100);
        bots.tick();
        expect(bots.getMarketMakerInventory()).toBe(before + 2);
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
        const orders = bots.tick().filter(o => o.botType === 'marketMaker');
        expect(orders.length).toBeGreaterThan(0);
        for (const o of orders) {
            expect(Number.isInteger(o.quantity)).toBe(true);
            expect(o.quantity).toBeGreaterThanOrEqual(200); // MM min 2 lots
            expect(o.quantity % 100).toBeLessThan(99);
        }
    });

    it('re-quoting cancels every resting bot order, not just the market maker ones', () => {
        const { engine, bots, env } = managerAt(50);
        bots.tick();
        engine.submitOrder('buy', 'limit', 1000, 40, 'bot'); // e.g. a resting trend/noise order
        engine.submitOrder('buy', 'limit', 1000, 40, 'user');
        env.clock.advance(500); // refreshInterval / intensity 1

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

describe('scenario tables', () => {
    const scenarios = Object.keys(SCENARIO_MODIFIERS) as (keyof typeof SCENARIO_MODIFIERS)[];

    it('names every scenario in both languages', () => {
        expect(Object.keys(SCENARIO_LABELS).sort()).toEqual([...scenarios].sort());
        for (const s of scenarios) {
            expect(SCENARIO_LABELS[s].zh).not.toBe('');
            expect(SCENARIO_LABELS[s].en).not.toBe('');
        }
    });

    it('derives the card bars from the presets: lowest preset 1, highest SCENARIO_LEVELS', () => {
        const levels = (key: 'volatility' | 'liquidity') => scenarios.map(s => scenarioLevel(s, key));
        for (const key of ['volatility', 'liquidity'] as const) {
            expect(Math.min(...levels(key))).toBe(1);
            expect(Math.max(...levels(key))).toBe(SCENARIO_LEVELS);
        }
        // Calm has the most liquidity of all presets, so it gets the full bar
        const mostLiquid = scenarios.reduce((a, b) => ((SCENARIO_MODIFIERS[b].liquidity ?? 1) > (SCENARIO_MODIFIERS[a].liquidity ?? 1) ? b : a));
        expect(scenarioLevel(mostLiquid, 'liquidity')).toBe(SCENARIO_LEVELS);
    });
});
