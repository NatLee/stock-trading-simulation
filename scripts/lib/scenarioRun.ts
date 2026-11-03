// Run one market scenario headless, with a seed, the way the trading page does.
//
// Used by `npm run sim` and by the docs chart generator. Everything here goes
// through the same MarketSimulation the browser uses; only the clock and the
// dice are swapped for a manual clock and a seeded random source.

import { MarketSimulation } from '../../src/lib/sim/MarketSimulation';
import { deterministicEnv } from '../../src/lib/sim/env';
import { SCENARIO_LIFECYCLE, SCENARIO_MODIFIERS } from '../../src/lib/bots/types';
import { MarketScenario } from '../../src/lib/matching/types';

export const ALL_SCENARIOS = Object.keys(SCENARIO_MODIFIERS) as MarketScenario[];

/**
 * 'app'    - what clicking the scenario button does in the app today: the page
 *            pushes its other settings right after, and that resets the bot
 *            manager's own scenario, volatility and liquidity (see docs/bots.md).
 * 'preset' - the preset exactly as written in SCENARIO_MODIFIERS.
 */
export type RunMode = 'app' | 'preset';

export interface RunOptions {
    scenario: MarketScenario;
    seed: number;
    seconds: number;
    mode: RunMode;
    /** Follow the automatic scenario switches (pump & dump -> crash -> ...). Default true. */
    followLifecycle?: boolean;
    startPrice?: number;
}

export interface RunResult {
    options: Required<RunOptions>;
    /** Last price at t = 0, 1, 2, ... seconds */
    prices: number[];
    /** Relative spread (best ask - best bid) / mid at every second, when both sides exist */
    spreads: number[];
    /** Scenario switches: [second, scenario] */
    phases: [number, MarketScenario][];
    trades: number;
    volume: number;
}

const START = Date.UTC(2026, 10, 3, 1, 0, 0); // any fixed moment works
const TICK_MS = 100;

/** The page's settings right after it loads (useMarketSimulator defaults) */
const PAGE_SETTINGS = { scenario: 'sideways' as MarketScenario, volatility: 1, liquidity: 1, unitSize: 1000, isOddLot: false };

export function runScenario(opts: RunOptions): RunResult {
    const options: Required<RunOptions> = { followLifecycle: true, startPrice: 50, ...opts };
    const env = deterministicEnv(options.seed, START);
    const sim = new MarketSimulation({
        initialPrice: options.startPrice,
        candlePeriod: 15000,
        bots: { ...PAGE_SETTINGS, intensity: 1 },
    }, env);
    // On mount the hook sends its config once more
    sim.bots.updateConfig({ ...PAGE_SETTINGS, intensity: 1 });

    const phases: [number, MarketScenario][] = [];
    const choose = (scenario: MarketScenario, second: number) => {
        phases.push([second, scenario]);
        // The button (and the lifecycle timer) call setScenario, then move the
        // intensity slider to the preset's intensity...
        sim.bots.setScenario(scenario);
        const intensity = SCENARIO_MODIFIERS[scenario].intensity ?? 1;
        if (options.mode === 'app') {
            // ...which re-sends all the page's settings, scenario 'sideways' included
            sim.bots.updateConfig({ ...PAGE_SETTINGS, intensity });
        } else {
            sim.bots.updateConfig({ intensity });
        }
    };
    choose(options.scenario, 0);

    let current = options.scenario;
    let nextSwitchAt = Infinity;
    const scheduleSwitch = (atMs: number) => {
        const lifecycle = SCENARIO_LIFECYCLE[current];
        nextSwitchAt = options.followLifecycle && lifecycle ? atMs + lifecycle.duration : Infinity;
    };
    scheduleSwitch(0);

    const prices: number[] = [sim.engine.getLastPrice()];
    const spreads: number[] = [];
    let trades = 0;
    let volume = 0;

    const totalTicks = Math.round((options.seconds * 1000) / TICK_MS);
    for (let tick = 1; tick <= totalTicks; tick++) {
        const elapsed = tick * TICK_MS;
        if (elapsed >= nextSwitchAt) {
            current = SCENARIO_LIFECYCLE[current]!.next;
            choose(current, Math.round(elapsed / 1000));
            scheduleSwitch(elapsed);
        }

        env.clock.advance(TICK_MS);
        for (const t of sim.step()) {
            trades++;
            volume += t.quantity;
        }

        if (elapsed % 1000 === 0) {
            prices.push(sim.engine.getLastPrice());
            const book = sim.engine.getOrderBookSnapshot(1);
            if (book.bestAsk !== null && book.bestBid !== null) {
                spreads.push((book.bestAsk - book.bestBid) / ((book.bestAsk + book.bestBid) / 2));
            }
        }
    }

    return { options, prices, spreads, phases, trades, volume };
}

export interface RunStats {
    /** % change from start to end */
    change: number;
    /** highest and lowest price, % from start */
    high: number;
    low: number;
    /** typical size of a 1-second move, in % (standard deviation) */
    move1s: number;
    /** average relative spread, in % */
    spread: number;
    tradesPerMinute: number;
}

export function statsOf(run: RunResult): RunStats {
    const p0 = run.prices[0];
    const pct = (p: number) => (p / p0 - 1) * 100;
    const returns = run.prices.slice(1).map((p, i) => Math.log(p / run.prices[i]) * 100);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const sd = Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length);
    return {
        change: pct(run.prices[run.prices.length - 1]),
        high: pct(Math.max(...run.prices)),
        low: pct(Math.min(...run.prices)),
        move1s: sd,
        spread: (run.spreads.reduce((a, b) => a + b, 0) / Math.max(1, run.spreads.length)) * 100,
        tradesPerMinute: run.trades / (run.options.seconds / 60),
    };
}
