import { describe, expect, it } from 'vitest';
import { runScenario, statsOf } from './scenarioRun';

describe('runScenario', () => {
    it('is reproducible and records one price per second', () => {
        const a = runScenario({ scenario: 'volatile', seed: 3, seconds: 30, mode: 'app' });
        const b = runScenario({ scenario: 'volatile', seed: 3, seconds: 30, mode: 'app' });
        expect(a.prices).toHaveLength(31);
        expect(a.prices).toEqual(b.prices);
        expect(a.trades).toBeGreaterThan(0);
    });

    it('follows the automatic scenario switches', () => {
        const run = runScenario({ scenario: 'pump_dump', seed: 1, seconds: 40, mode: 'app' });
        expect(run.phases).toEqual([[0, 'pump_dump'], [15, 'crash'], [35, 'dead_cat']]);
        const still = runScenario({ scenario: 'pump_dump', seed: 1, seconds: 40, mode: 'app', followLifecycle: false });
        expect(still.phases).toEqual([[0, 'pump_dump']]);
    });

    it('app mode loses the scenario lean that the preset has (see docs/bots.md)', () => {
        // Same seed, same bots; only the snap-back to sideways differs
        const app = runScenario({ scenario: 'bull', seed: 1, seconds: 60, mode: 'app' });
        const preset = runScenario({ scenario: 'bull', seed: 1, seconds: 60, mode: 'preset' });
        expect(app.prices).not.toEqual(preset.prices);
        expect(statsOf(preset).spread).toBeGreaterThan(statsOf(app).spread); // volatility 1.2 vs 0.6
    });
});
