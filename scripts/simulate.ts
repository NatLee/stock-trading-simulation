// Run one market scenario in the terminal, with a seed.
//
//   npm run sim -- --scenario crash --seed 7 --minutes 3
//   npm run sim -- --scenario bull --mode preset
//   npm run sim -- --all
//
// --mode app     what the app does today when you click the scenario (default)
// --mode preset  the preset exactly as written in SCENARIO_MODIFIERS
// --no-lifecycle stay in the chosen scenario (no automatic pump -> crash -> ... switch)

import { runScenario, statsOf, ALL_SCENARIOS, RunMode } from './lib/scenarioRun';
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
const seconds = Math.round(Number(arg('minutes', '3')) * 60);
const mode = arg('mode', 'app') as RunMode;
const followLifecycle = !process.argv.includes('--no-lifecycle');

if (mode !== 'app' && mode !== 'preset') {
    console.error('--mode must be app or preset');
    process.exit(1);
}

const scenarios: MarketScenario[] = process.argv.includes('--all')
    ? ALL_SCENARIOS
    : [arg('scenario', 'sideways') as MarketScenario];

for (const scenario of scenarios) {
    if (!ALL_SCENARIOS.includes(scenario)) {
        console.error(`Unknown scenario "${scenario}". Pick one of: ${ALL_SCENARIOS.join(', ')}`);
        process.exit(1);
    }
    const run = runScenario({ scenario, seed, seconds, mode, followLifecycle });
    const s = statsOf(run);
    const phases = run.phases.map(([t, sc]) => `${t}s ${sc}`).join(' -> ');
    console.log(`${scenario} (${mode}, seed ${seed}, ${seconds} s)  ${phases}`);
    console.log(`  ${run.prices[0].toFixed(2)} ${sparkline(run.prices)} ${run.prices[run.prices.length - 1].toFixed(2)}`);
    console.log(`  change ${pct(s.change)}  high ${pct(s.high)}  low ${pct(s.low)}  1 s move ${s.move1s.toFixed(2)}%  spread ${s.spread.toFixed(2)}%  ${s.tradesPerMinute.toFixed(0)} trades/min`);
}
