import { describe, expect, it } from 'vitest';
import { MarketSimulation } from './MarketSimulation';
import { deterministicEnv, seededRandom } from './env';
import { MarketScenario } from '../matching/types';

const START = Date.UTC(2026, 10, 3, 1, 0, 0);

function run(seed: number, ticks: number, scenario: MarketScenario = 'sideways') {
    const env = deterministicEnv(seed, START);
    const sim = new MarketSimulation({ initialPrice: 50, candlePeriod: 15000, bots: { scenario } }, env);
    const prices: number[] = [];
    for (let i = 0; i < ticks; i++) {
        env.clock.advance(100);
        sim.step();
        prices.push(sim.engine.getLastPrice());
    }
    return { sim, env, prices };
}

describe('seeded random source', () => {
    it('gives the same numbers for the same seed, all in [0, 1)', () => {
        const a = seededRandom(42);
        const b = seededRandom(42);
        const xs = Array.from({ length: 1000 }, () => a());
        expect(Array.from({ length: 1000 }, () => b())).toEqual(xs);
        expect(xs.every(x => x >= 0 && x < 1)).toBe(true);
        expect(seededRandom(43)()).not.toBe(xs[0]);
    });
});

describe('MarketSimulation', () => {
    it('replays exactly with the same seed', () => {
        expect(run(7, 600).prices).toEqual(run(7, 600).prices);
        expect(run(8, 600).prices).not.toEqual(run(7, 600).prices);
    });

    it('produces trades, a two-sided book and candles', () => {
        const { sim } = run(1, 300);
        const snap = sim.snapshot();
        expect(snap.recentTrades.length).toBeGreaterThan(0);
        expect(snap.orderBook.bestBid).toBeLessThan(snap.orderBook.bestAsk!);
        expect(snap.candles.length).toBeGreaterThanOrEqual(2); // 30 s of 15 s candles
        expect(snap.currentCandle).toBe(snap.candles[snap.candles.length - 1]);
    });

    it('hands every user trade to the caller even when there are more than 20 in one tick', () => {
        // Regression: the hook only looked at the last 20 trades of each tick,
        // so older user fills never reached the account.
        const { sim, env } = run(3, 50);
        for (let i = 0; i < 25; i++) {
            const r = sim.engine.submitOrder('buy', 'market', 1000, null, 'user', 'IOC');
            expect(r.filledQuantity).toBe(1000);
        }
        env.clock.advance(100);
        const trades = sim.step();
        expect(trades.filter(t => t.takerSource === 'user')).toHaveLength(25);
        // What the old code read: not all of them
        expect(sim.engine.getRecentTrades(20).filter(t => t.takerSource === 'user').length).toBeLessThan(25);
    });

    it('puts every trade into the candles (volume adds up)', () => {
        const { sim } = run(5, 1200);
        const candles = sim.candles.getCandles();
        const volume = candles.reduce((s, c) => s + c.volume, 0);
        const trades = sim.engine.getTradesSince(0);
        expect(sim.engine.getTradeCount()).toBe(trades.length); // nothing trimmed yet
        expect(volume).toBe(trades.reduce((s, t) => s + t.quantity, 0));
    });

    it('starts trading where the synthetic history ends', () => {
        const env = deterministicEnv(2, START + 3600_000);
        const sim = new MarketSimulation({ initialPrice: 50, candlePeriod: 60000, historyStart: START }, env);
        const candles = sim.candles.getCandles();
        expect(candles).toHaveLength(61);
        expect(sim.engine.getLastPrice()).toBe(candles[candles.length - 1].close);
    });

    it('calm moves less than sideways, which moves less than volatile', () => {
        const spread = (scenario: MarketScenario) => {
            let total = 0;
            for (const seed of [1, 2, 3]) {
                const env = deterministicEnv(seed, START);
                const sim = new MarketSimulation({ initialPrice: 50, candlePeriod: 15000 }, env);
                sim.bots.setScenario(scenario);
                const prices: number[] = [];
                for (let i = 0; i < 1500; i++) {
                    env.clock.advance(100);
                    sim.step();
                    prices.push(sim.engine.getLastPrice());
                }
                total += Math.max(...prices) - Math.min(...prices);
            }
            return total / 3;
        };
        const calm = spread('calm');
        const sideways = spread('sideways');
        const volatile = spread('volatile');
        expect(calm).toBeLessThan(sideways);
        expect(sideways).toBeLessThan(volatile);
    });
});
