import { describe, expect, it } from 'vitest';
import { runScenario, summarize, peakInventory, withMarketMakerDefaults } from './scenarioRun';
import { DEFAULT_MARKET_MAKER_CONFIG } from '../../src/lib/bots/types';

describe('runScenario', () => {
    it('is reproducible and records one price per second', () => {
        const a = runScenario({ scenario: 'volatile', seed: 3, seconds: 30 });
        const b = runScenario({ scenario: 'volatile', seed: 3, seconds: 30 });
        expect(a.prices).toHaveLength(31);
        expect(a.prices).toEqual(b.prices);
        expect(a.trades).toBeGreaterThan(0);
    });

    it('follows the automatic scenario switches', () => {
        const run = runScenario({ scenario: 'pump_dump', seed: 1, seconds: 60 });
        expect(run.phases).toEqual([[0, 'pump_dump'], [15, 'crash'], [40, 'dead_cat'], [50, 'bear']]);
        const still = runScenario({ scenario: 'pump_dump', seed: 1, seconds: 60, followLifecycle: false });
        expect(still.phases).toEqual([[0, 'pump_dump']]);
    });
});

// The targets the presets were tuned to (20 seeds, 3 minutes, automatic switches on).
// The measured numbers are in docs/bots.md; these are the floors the tuning must keep.
describe('each scenario does what its name says (20 seeds)', () => {
    const SEEDS = 20;
    const SECONDS = 180;
    const run = (s: Parameters<typeof summarize>[0]) => summarize(s, SEEDS, SECONDS);

    it('bull and bear lean their way', () => {
        const bull = run('bull');
        const bear = run('bear');
        expect(bull.endedUp).toBeGreaterThanOrEqual(17);
        expect(bull.change).toBeGreaterThan(3);
        expect(bear.endedUp).toBeLessThanOrEqual(3);
        expect(bear.change).toBeLessThan(-3);
    });

    it('crash is a clear fall, not a coin flip', () => {
        const crash = run('crash');
        expect(crash.firstPhaseDown).toBe(SEEDS);
        expect(crash.firstPhase!).toBeLessThan(-8);
        expect(crash.firstPhase!).toBeGreaterThan(-15);
        expect(crash.endedUp).toBeLessThanOrEqual(2);
    });

    it('pump & dump pumps, then ends below where it started', () => {
        const pump = run('pump_dump');
        expect(pump.firstPhaseDown).toBe(0);
        expect(pump.firstPhase!).toBeGreaterThan(5);
        expect(pump.change).toBeLessThan(0);
    });

    it('dead cat bounces, then gives it back', () => {
        const cat = run('dead_cat');
        expect(cat.firstPhase!).toBeGreaterThan(0);
        expect(cat.change).toBeLessThan(0);
    });

    it('breakout and squeeze break upwards; squeeze is quiet first', () => {
        expect(run('breakout').firstPhase!).toBeGreaterThan(3);
        const squeeze = run('squeeze');
        expect(Math.abs(squeeze.firstPhase!)).toBeLessThan(1);
        expect(squeeze.endedUp).toBeGreaterThanOrEqual(17);
    });

    it('accumulation and distribution lean gently', () => {
        const acc = run('accumulation');
        const dis = run('distribution');
        expect(acc.endedUp).toBeGreaterThanOrEqual(14);
        expect(dis.endedUp).toBeLessThanOrEqual(6);
        expect(acc.range).toBeLessThan(run('bull').range);
    });

    it('calm barely moves; volatile swings at least twice as wide as sideways, without a direction', () => {
        const calm = run('calm');
        const sideways = run('sideways');
        const volatile = run('volatile');
        expect(calm.range).toBeLessThan(1);
        expect(Math.abs(sideways.change)).toBeLessThan(2);
        expect(volatile.range).toBeGreaterThan(2 * sideways.range);
        expect(volatile.range).toBeLessThan(20);
        expect(volatile.endedUp).toBeGreaterThanOrEqual(6);
        expect(volatile.endedUp).toBeLessThanOrEqual(14);
    });
});

describe('market maker inventory skew (user decision 3)', () => {
    it('keeps the inventory far smaller than the same runs without it', () => {
        const skew = DEFAULT_MARKET_MAKER_CONFIG.inventorySkew;
        for (const scenario of ['bull', 'crash', 'pump_dump'] as const) {
            const withSkew = peakInventory(scenario, 10, 180);
            const without = withMarketMakerDefaults({ inventorySkew: 0 }, () => peakInventory(scenario, 10, 180));
            expect(withSkew).toBeLessThan(without);
            expect(withSkew).toBeLessThanOrEqual(2.5 * DEFAULT_MARKET_MAKER_CONFIG.inventoryLimit);
        }
        expect(DEFAULT_MARKET_MAKER_CONFIG.inventorySkew).toBe(skew); // restored after the what-if
    });
});
