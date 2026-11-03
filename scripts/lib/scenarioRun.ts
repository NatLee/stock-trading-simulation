// Run one market scenario headless, with a seed, the way the trading page does.
//
// Used by `npm run sim` and by the docs generator. Everything here goes
// through the same MarketSimulation the browser uses; only the clock and the
// dice are swapped for a manual clock and a seeded random source.

import { MarketSimulation } from '../../src/lib/sim/MarketSimulation';
import { deterministicEnv, SIM_TICK_MS } from '../../src/lib/sim/env';
import { SCENARIO_LIFECYCLE, SCENARIO_MODIFIERS, DEFAULT_MARKET_MAKER_CONFIG } from '../../src/lib/bots/types';
import { MarketScenario } from '../../src/lib/matching/types';
import { CONFIG } from '../../src/constants/config';

export const ALL_SCENARIOS = Object.keys(SCENARIO_MODIFIERS) as MarketScenario[];

export interface RunOptions {
    scenario: MarketScenario;
    seed: number;
    seconds: number;
    /** Follow the automatic scenario switches (pump & dump -> crash -> ...). Default true. */
    followLifecycle?: boolean;
    /** Default: the app's starting price */
    startPrice?: number;
}

export interface RunResult {
    options: Required<RunOptions>;
    /** Last price at t = 0, 1, 2, ... seconds */
    prices: number[];
    /** Relative spread (best ask - best bid) / mid at every second, when both sides exist */
    spreads: number[];
    /** The market maker's inventory in lots at t = 0, 1, 2, ... seconds */
    inventory: number[];
    /** Scenario switches: [second, scenario] */
    phases: [number, MarketScenario][];
    trades: number;
    volume: number;
}

const START = Date.UTC(2026, 10, 3, 1, 0, 0); // any fixed moment works
const TICKS_PER_SECOND = 1000 / SIM_TICK_MS;

export function runScenario(opts: RunOptions): RunResult {
    const options: Required<RunOptions> = { followLifecycle: true, startPrice: CONFIG.BASE_PRICE, ...opts };
    const env = deterministicEnv(options.seed, START);
    // Picking a scenario on the page = starting the bots in it (setScenario also
    // resets the pace to the scenario's own intensity, like the slider does)
    const sim = new MarketSimulation({
        initialPrice: options.startPrice,
        candlePeriod: 15000,
        bots: { scenario: options.scenario },
    }, env);

    const phases: [number, MarketScenario][] = [[0, options.scenario]];
    let current = options.scenario;
    const switchAfter = (scenario: MarketScenario) => {
        const lifecycle = options.followLifecycle ? SCENARIO_LIFECYCLE[scenario] : undefined;
        return lifecycle ? Math.round(lifecycle.duration / SIM_TICK_MS) : Infinity;
    };
    let nextSwitchTick = switchAfter(current);

    const prices: number[] = [sim.engine.getLastPrice()];
    const inventory: number[] = [sim.bots.getMarketMakerInventory()];
    const spreads: number[] = [];
    let trades = 0;
    let volume = 0;

    const totalTicks = options.seconds * TICKS_PER_SECOND;
    for (let tick = 1; tick <= totalTicks; tick++) {
        if (tick > nextSwitchTick) {
            current = SCENARIO_LIFECYCLE[current]!.next;
            sim.bots.setScenario(current);
            phases.push([Math.round((tick - 1) / TICKS_PER_SECOND), current]);
            nextSwitchTick = tick - 1 + switchAfter(current);
        }

        env.clock.advance(SIM_TICK_MS);
        for (const t of sim.step()) {
            trades++;
            volume += t.quantity;
        }

        if (tick % TICKS_PER_SECOND === 0) {
            prices.push(sim.engine.getLastPrice());
            inventory.push(sim.bots.getMarketMakerInventory());
            const book = sim.engine.getOrderBookSnapshot(1);
            if (book.bestAsk !== null && book.bestBid !== null) {
                spreads.push((book.bestAsk - book.bestBid) / ((book.bestAsk + book.bestBid) / 2));
            }
        }
    }

    return { options, prices, spreads, inventory, phases, trades, volume };
}

export interface RunStats {
    /** % change from start to end */
    change: number;
    /** % change over the scenario's own phase, before the first automatic switch (null if none) */
    firstPhase: number | null;
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
    const firstSwitch = run.phases[1]?.[0];
    return {
        change: pct(run.prices[run.prices.length - 1]),
        firstPhase: firstSwitch === undefined ? null : pct(run.prices[firstSwitch]),
        high: pct(Math.max(...run.prices)),
        low: pct(Math.min(...run.prices)),
        move1s: sd,
        spread: (run.spreads.reduce((a, b) => a + b, 0) / Math.max(1, run.spreads.length)) * 100,
        tradesPerMinute: run.trades / (run.options.seconds / 60),
    };
}

/** Averages of statsOf over seeds 1 … seeds */
export interface ScenarioSummary {
    scenario: MarketScenario;
    seeds: number;
    change: number;
    endedUp: number;
    firstPhase: number | null;
    firstPhaseDown: number | null;
    range: number;
    move1s: number;
    spread: number;
    tradesPerMinute: number;
}

export function summarize(scenario: MarketScenario, seeds: number, seconds: number, followLifecycle = true): ScenarioSummary {
    const all = Array.from({ length: seeds }, (_, i) => statsOf(runScenario({ scenario, seed: i + 1, seconds, followLifecycle })));
    const avg = (f: (s: RunStats) => number) => all.reduce((a, s) => a + f(s), 0) / all.length;
    const hasPhase = all[0].firstPhase !== null;
    return {
        scenario,
        seeds,
        change: avg(s => s.change),
        endedUp: all.filter(s => s.change > 0).length,
        firstPhase: hasPhase ? avg(s => s.firstPhase!) : null,
        firstPhaseDown: hasPhase ? all.filter(s => s.firstPhase! < 0).length : null,
        range: avg(s => s.high - s.low),
        move1s: avg(s => s.move1s),
        spread: avg(s => s.spread),
        tradesPerMinute: avg(s => s.tradesPerMinute),
    };
}

/**
 * Run `fn` with some market-maker defaults changed, then put them back.
 * Only for what-if comparisons in tests and the docs (e.g. the inventory skew
 * switched off); the app never changes its defaults at run time.
 */
export function withMarketMakerDefaults<T>(patch: Partial<typeof DEFAULT_MARKET_MAKER_CONFIG>, fn: () => T): T {
    const saved = { ...DEFAULT_MARKET_MAKER_CONFIG };
    Object.assign(DEFAULT_MARKET_MAKER_CONFIG, patch);
    try {
        return fn();
    } finally {
        Object.assign(DEFAULT_MARKET_MAKER_CONFIG, saved);
    }
}

/** Largest |market-maker inventory| (lots) over seeds 1 … seeds */
export function peakInventory(scenario: MarketScenario, seeds: number, seconds: number): number {
    let peak = 0;
    for (let seed = 1; seed <= seeds; seed++) {
        const run = runScenario({ scenario, seed, seconds });
        peak = Math.max(peak, ...run.inventory.map(Math.abs));
    }
    return peak;
}

