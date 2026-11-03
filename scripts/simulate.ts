// Run market scenarios in the terminal, with seeds.
//
//   npm run sim -- --scenario crash --seed 7 --minutes 3   one run: sparkline + summary
//   npm run sim -- --all                                   every scenario, seed 1
//   npm run sim -- --all --seeds 20                        averages over seeds 1–20 (how the presets are tuned)
//
// --no-lifecycle stays in the chosen scenario (no automatic pump -> crash -> ... switch)

import { runScenario, summarize, formatRun, formatSummary, ALL_SCENARIOS } from './lib/scenarioRun';
import { MarketScenario } from '../src/lib/matching/types';

function arg(name: string, fallback: string): string {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

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
        console.log(formatSummary(summarize(scenario, seeds, seconds, followLifecycle)));
    } else {
        console.log(formatRun(runScenario({ scenario, seed, seconds, followLifecycle })).join('\n'));
    }
}
