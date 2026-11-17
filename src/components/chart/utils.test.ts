import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, calculateMA } from './utils';

describe('chart defaults', () => {
    it('has one moving-average colour per period', () => {
        // CandlestickChart draws config.maPeriods[i] in colors.ma[i]
        expect(DEFAULT_CONFIG.colors.ma).toHaveLength(DEFAULT_CONFIG.maPeriods.length);
    });
});

describe('calculateMA', () => {
    it('starts once there are enough closes', () => {
        expect(calculateMA([1, 2, 3, 4], 3)).toEqual([null, null, 2, 3]);
    });
});
