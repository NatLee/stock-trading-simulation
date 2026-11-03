import { describe, expect, it } from 'vitest';
import { runScenario } from './scenarioRun';

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
