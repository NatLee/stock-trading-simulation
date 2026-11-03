import { describe, expect, it } from 'vitest';
import { CandleAggregator, CandleData, aggregateCandles, prevCloseOf } from './CandleAggregator';
import { Trade } from './types';
import { deterministicEnv, seededRandom } from '../sim/env';

const T0 = Date.UTC(2026, 0, 5, 1, 0, 0); // on a 30 min boundary

function trade(timestamp: number, price: number, quantity = 1000): Trade {
    return {
        tradeId: `T${timestamp}-${price}`,
        timestamp,
        price,
        quantity,
        buyOrderId: 'B',
        sellOrderId: 'S',
        takerSide: 'buy',
        makerSource: 'bot',
        takerSource: 'bot',
    };
}

/** The pre-cache implementation: aggregate everything, every call */
function naiveCandles(base: CandleData[], current: CandleData | null, period: number): CandleData[] {
    return aggregateCandles(current ? [...base, current] : base, period);
}

describe('CandleAggregator', () => {
    it('buckets trades into 15 s candles and merges them for the chosen timeframe', () => {
        const env = deterministicEnv(1, T0);
        const agg = new CandleAggregator(60000, 100, 50, env);

        agg.processTrade(trade(T0 + 1000, 50, 1000));
        agg.processTrade(trade(T0 + 5000, 51, 2000));
        agg.processTrade(trade(T0 + 16000, 49, 1000)); // next 15 s candle, same minute
        agg.processTrade(trade(T0 + 61000, 50.5, 3000)); // next minute

        expect(agg.getCandles()).toEqual([
            { open: 50, high: 51, low: 49, close: 49, volume: 4000, timestamp: T0, tradeCount: 3 },
            { open: 50.5, high: 50.5, low: 50.5, close: 50.5, volume: 3000, timestamp: T0 + 60000, tradeCount: 1 },
        ]);

        agg.setPeriod(15000);
        expect(agg.getCandles()).toHaveLength(3);
        expect(agg.getCurrentCandle()?.close).toBe(50.5);
        expect(agg.getPrevClose()).toBe(49);
    });

    it('lets the open candle follow the price between trades', () => {
        const env = deterministicEnv(1, T0);
        const agg = new CandleAggregator(15000, 100, 50, env);
        agg.processTrade(trade(T0, 50));
        env.clock.advance(100);
        agg.tick(50.4);
        env.clock.advance(100);
        agg.tick(49.8);
        expect(agg.getCurrentCandle()).toMatchObject({ open: 50, high: 50.4, low: 49.8, close: 49.8, volume: 1000 });
    });

    it('generates the same synthetic history for the same seed', () => {
        const make = () => {
            const env = deterministicEnv(7, T0 + 3 * 3600_000);
            const agg = new CandleAggregator(60000, 100, 50, env);
            agg.generateHistory(T0, 50);
            return agg.getCandles();
        };
        const a = make();
        expect(a).toHaveLength(181); // 3 h of 1 min candles + the open one
        expect(a).toEqual(make());
        expect(a[0].open).toBe(50);
    });

    it('cached candles and stats match a full recompute, tick after tick', () => {
        // Regression for the per-tick cache: same output as the old code path.
        const env = deterministicEnv(3, T0 + 2 * 3600_000);
        const random = seededRandom(99);
        const agg = new CandleAggregator(60000, 100, 50, env);
        agg.generateHistory(T0, 50);

        const internals = agg as unknown as { baseCandles: CandleData[]; currentBaseCandle: CandleData | null };
        const periods = [15000, 60000, 300000, 1800000];
        let price = agg.getLastPrice();

        for (let i = 0; i < 3000; i++) {
            env.clock.advance(100);
            price = Math.max(1, price * (1 + (random() - 0.5) * 0.004));
            if (random() < 0.3) agg.processTrade(trade(env.now(), price, 1000 + Math.floor(random() * 5000)));
            agg.tick(price);
            if (i % 700 === 0) agg.setPeriod(periods[(i / 700) % periods.length]);

            if (i % 37 === 0) {
                const period = (agg as unknown as { displayPeriodMs: number }).displayPeriodMs;
                const expected = naiveCandles(internals.baseCandles, internals.currentBaseCandle, period);
                expect(agg.getCandles()).toEqual(expected);
                expect(agg.getPrevClose()).toBe(prevCloseOf(expected, price));

                const all = [...internals.baseCandles, internals.currentBaseCandle!];
                const stats = agg.getStats();
                expect(stats.high24h).toBe(Math.max(...all.map(c => c.high)));
                expect(stats.low24h).toBe(Math.min(...all.map(c => c.low)));
                expect(stats.volume24h).toBe(all.reduce((s, c) => s + c.volume, 0));
                expect(stats.open24h).toBe(all[0].open);
            }
        }
    });

    it('never hands out the cached objects, so callers cannot corrupt the cache', () => {
        const env = deterministicEnv(1, T0 + 600_000);
        const agg = new CandleAggregator(60000, 100, 50, env);
        agg.generateHistory(T0, 50);
        const first = agg.getCandles();
        first.pop();
        expect(agg.getCandles()).toHaveLength(first.length + 1);
    });

    it('24 h stats only look at the last 24 hours', () => {
        const env = deterministicEnv(1, T0);
        const agg = new CandleAggregator(15000, 100, 50, env);
        agg.processTrade(trade(T0, 80, 5000)); // a spike that will age out
        env.clock.advance(15000);
        agg.tick(50);
        env.clock.advance(25 * 3600_000);
        agg.processTrade(trade(env.now(), 51, 1000));
        agg.tick(51);

        const stats = agg.getStats();
        expect(stats.high24h).toBe(51);
        expect(stats.volume24h).toBe(1000);
    });
});
