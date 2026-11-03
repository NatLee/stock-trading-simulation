/**
 * Where the simulation gets its dice and its clock from.
 *
 * The app uses the real ones (`Math.random`, `Date.now`). Tests and the docs
 * scripts pass a seeded random source and a hand-driven clock instead, so a
 * whole market run can be replayed tick for tick.
 */
export interface SimEnv {
    /** Uniform random number in [0, 1), same contract as Math.random */
    random: () => number;
    /** Current time in ms, same contract as Date.now */
    now: () => number;
}

/** The real thing: what the browser app uses. */
export const realEnv: SimEnv = {
    random: () => Math.random(),
    now: () => Date.now(),
};

/**
 * Small, fast, seedable PRNG (mulberry32). Same seed, same sequence.
 * Good enough for a market toy; not for anything cryptographic.
 */
export function seededRandom(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** A clock that only moves when you tell it to. */
export interface ManualClock {
    now: () => number;
    advance: (ms: number) => void;
}

export function manualClock(start: number = 0): ManualClock {
    let t = start;
    return {
        now: () => t,
        advance: (ms: number) => {
            t += ms;
        },
    };
}

/** Seeded random + manual clock, ready to hand to the engine and the bots. */
export function deterministicEnv(seed: number, start: number = 0): SimEnv & { clock: ManualClock } {
    const clock = manualClock(start);
    return { random: seededRandom(seed), now: clock.now, clock };
}
