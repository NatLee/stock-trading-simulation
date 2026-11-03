// Run market scenarios in the terminal, with seeds.
//
//   npm run sim -- --scenario crash --seed 7 --minutes 3   one run: sparkline + summary
//   npm run sim -- --all                                   every scenario, seed 1
//   npm run sim -- --all --seeds 20                        averages over seeds 1–20 (how the presets are tuned)
//
// --no-lifecycle stays in the chosen scenario (no automatic pump -> crash -> ... switch)

import { runScenario, statsOf, summarize, ALL_SCENARIOS } from './lib/scenarioRun';
import { MarketScenario } from '../src/lib/matching/types';

function arg(name: string, fallback: string): string {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const BARS = '▁▂▃▄▅▆▇█';
function sparkline(values: number[], width = 60): string {
    const step = Math.max(1, Math.floor(values.length / width));
    const sampled = values.filter((_, i) => i % step === 0);
    const min = Math.min(...sampled);
    const max = Math.max(...sampled);
    return sampled.map(v => BARS[max === min ? 3 : Math.round(((v - min) / (max - min)) * (BARS.length - 1))]).join('');
}

const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const seed = Number(arg('seed', '1'));
const seeds = Number(arg('seeds', '0'));
const seconds = Math.round(Number(arg('minutes', '3')) * 60);
const followLifecycle = !process.argv.includes('--no-lifecycle');

const scenarios: MarketScenario[] = process.argv.includes('--all')
    ? ALL_SCENARIOS
    : [arg('scenario', 'sideways') as MarketScenario];

for (const scenario of scenarios) {
    if (!ALL_SCENARIOS.includes(scenario)) {
        console.error(`Unknown scenario "${scenario}". Pick one of: ${ALL_SCENARIOS.join(', ')}`);
        process.exit(1);
    }
    if (seeds > 0) {
        const s = summarize(scenario, seeds, seconds, followLifecycle);
        const first = s.firstPhase === null ? '' : `  first phase ${pct(s.firstPhase)} (${s.firstPhaseDown}/${seeds} down)`;
        console.log(`${scenario.padEnd(13)} avg ${pct(s.change).padStart(7)}  up ${String(s.endedUp).padStart(2)}/${seeds}  range ${s.range.toFixed(1)}%  1 s move ${s.move1s.toFixed(2)}%${first}`);
        continue;
    }
    const run = runScenario({ scenario, seed, seconds, followLifecycle });
    const s = statsOf(run);
    const phases = run.phases.map(([t, sc]) => `${t}s ${sc}`).join(' -> ');
    console.log(`${scenario} (seed ${seed}, ${seconds} s)  ${phases}`);
    console.log(`  ${run.prices[0].toFixed(2)} ${sparkline(run.prices)} ${run.prices[run.prices.length - 1].toFixed(2)}`);
    console.log(`  change ${pct(s.change)}  high ${pct(s.high)}  low ${pct(s.low)}  1 s move ${s.move1s.toFixed(2)}%  spread ${s.spread.toFixed(2)}%  ${s.tradesPerMinute.toFixed(0)} trades/min`);
}
