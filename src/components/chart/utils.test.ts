import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, calculateMA, calculateScale, maLegendBox, priceToY } from './utils';

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

describe('maLegendBox', () => {
    it('keeps the MA legend above the highest price the chart can draw', () => {
        // Regression: the legend used to sit 40 px down, inside the price area, so the
        // current-price line ran through it whenever the price was near the top.
        const { dimensions, volumeHeight } = DEFAULT_CONFIG;
        const scale = calculateScale([{ high: 50, low: 45, volume: 1 }], dimensions, 50);
        const highestY = priceToY(
            scale.priceMax, scale.priceMin, scale.priceRange, scale.chartHeight,
            dimensions.padding.top, volumeHeight,
        );
        const box = maLegendBox(dimensions);
        expect(box.top + box.height).toBeLessThanOrEqual(highestY);
        // and the strip is tall enough for the legend's 10 px text (text-[10px] leading-none)
        expect(box.height).toBeGreaterThanOrEqual(10);
    });
});
