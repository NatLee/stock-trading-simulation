export class PriceStep {
    /**
     * Get the minimum price tick (step) for a given price according to TWSE rules
     * 
     * Rules:
     * < 10: 0.01
     * 10 - <50: 0.05
     * 50 - <100: 0.1
     * 100 - <500: 0.5
     * 500 - <1000: 1
     * >= 1000: 5
     */
    static getTickSize(price: number): number {
        if (price < 10) return 0.01;
        if (price < 50) return 0.05;
        if (price < 100) return 0.1;
        if (price < 500) return 0.5;
        if (price < 1000) return 1;
        return 5;
    }

    /**
     * Round a price to the nearest valid tick (Normalizes floating point)
     */
    static roundToTick(price: number): number {
        const tick = this.getTickSize(price);
        const result = Math.round(price / tick) * tick;
        return Math.round(result * 100) / 100; // TWSE max precision is 2 decimals (0.01)
    }

    /**
     * Round a price down to the nearest valid tick
     */
    static floorToTick(price: number): number {
        const tick = this.getTickSize(price);
        const result = Math.floor(price / tick) * tick;
        return Math.round(result * 100) / 100;
    }

    /**
     * Round a price up to the nearest valid tick
     */
    static ceilToTick(price: number): number {
        const tick = this.getTickSize(price);
        const result = Math.ceil(price / tick) * tick;
        return Math.round(result * 100) / 100;
    }
}
