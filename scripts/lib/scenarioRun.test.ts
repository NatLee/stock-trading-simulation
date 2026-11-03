import { describe, expect, it } from 'vitest';
import { runScenario, peakInventory, withMarketMakerDefaults } from './scenarioRun';
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
        expect(run.phases).toEqual([[0, 'pump_dump'], [15, 'crash'], [35, 'dead_cat']]);
        const still = runScenario({ scenario: 'pump_dump', seed: 1, seconds: 60, followLifecycle: false });
        expect(still.phases).toEqual([[0, 'pump_dump']]);
    });
});

describe('market maker inventory skew (user decision 3)', () => {
    it('keeps the inventory far smaller than the same runs without it', () => {
        const skew = DEFAULT_MARKET_MAKER_CONFIG.inventorySkew;
        for (const scenario of ['bull', 'bear'] as const) {
            const withSkew = peakInventory(scenario, 10, 180);
            const without = withMarketMakerDefaults({ inventorySkew: 0 }, () => peakInventory(scenario, 10, 180));
            expect(withSkew).toBeLessThan(without);
            expect(withSkew).toBeLessThanOrEqual(2.5 * DEFAULT_MARKET_MAKER_CONFIG.inventoryLimit);
        }
        expect(DEFAULT_MARKET_MAKER_CONFIG.inventorySkew).toBe(skew); // restored after the what-if
    });
});
