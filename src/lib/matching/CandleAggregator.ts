import { Trade } from './types';
import { SimEnv, realEnv } from '../sim/env';

/**
 * Candle data structure
 */
export interface CandleData {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
    tradeCount: number;
}

export interface CandleStats {
    high24h: number;
    low24h: number;
    open24h: number;
    volume24h: number;
    change24h: number;
    changePercent24h: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Shape of the synthetic history: each 15 s candle moves by
 * trend + (U − 0.5) × volatility, with U uniform in [0, 1).
 */
export const SYNTHETIC_HISTORY = {
    /** volatility = minVolatility + U × extraVolatility */
    minVolatility: 0.002,
    extraVolatility: 0.003,
    /** trend = (U − 0.5) × trendRange */
    trendRange: 0.0005,
    /** wicks reach up to wickRatio × volatility beyond the body */
    wickRatio: 0.5,
    /** volume = minVolume + U × extraVolume shares */
    minVolume: 500,
    extraVolume: 2000,
    /** trade count = minTrades + U × extraTrades */
    minTrades: 2,
    extraTrades: 8,
};

/**
 * CandleAggregator - aggregates trades into OHLCV candles
 *
 * Trades land in fixed 15 s "base" candles. The chart's timeframe (15 s, 1 m,
 * 5 m, 30 m) is made by merging base candles, so switching timeframe never
 * loses history.
 *
 * The app asks for candles on every 100 ms tick, and by the evening there are
 * thousands of base candles. Finished base candles never change, so their
 * merged buckets and 24 h numbers are cached and only rebuilt when a base
 * candle is finished, dropped or the timeframe changes; each call only merges
 * the candle that is still open.
 */
export class CandleAggregator {
    private baseCandles: CandleData[] = []; // Finished 15 s candles, oldest first
    private currentBaseCandle: CandleData | null = null;
    private displayPeriodMs: number;
    private readonly basePeriodMs: number = 15000; // Fixed base resolution (15s)
    private maxBaseCandles: number = 10000; // Store enough history (~40 hours of 15s data)
    private lastPrice: number;
    private env: SimEnv;

    /** Bumped whenever baseCandles changes; cache keys use it */
    private version = 0;
    private aggregateCache: { version: number; period: number; candles: CandleData[] } | null = null;
    private statsCache: { version: number; first: number; high: number; low: number; volume: number } | null = null;

    /**
     * @param periodMs display timeframe
     * @param initialPrice price to report before any trade
     */
    constructor(periodMs: number = 15000, initialPrice: number = 50, env: SimEnv = realEnv) {
        this.displayPeriodMs = periodMs;
        this.lastPrice = initialPrice;
        this.env = env;
    }

    /**
     * Set the display period (aggregation window)
     */
    setPeriod(periodMs: number): void {
        this.displayPeriodMs = periodMs;
        // No need to clear history, we just re-aggregate
    }

    /**
     * Process a batch of trades
     */
    processTrades(trades: Trade[]): void {
        for (const trade of trades) {
            this.processTrade(trade);
        }
    }

    /**
     * Process a single trade
     */
    processTrade(trade: Trade): void {
        const baseTimestamp = this.getBaseTimestamp(trade.timestamp);

        if (!this.currentBaseCandle) {
            this.currentBaseCandle = this.createCandle(trade.price, trade.quantity, baseTimestamp);
        } else if (this.currentBaseCandle.timestamp !== baseTimestamp) {
            // New base candle
            this.finalizeCurrentBaseCandle();
            this.currentBaseCandle = this.createCandle(trade.price, trade.quantity, baseTimestamp);
        } else {
            // Update current base candle
            this.updateCandle(this.currentBaseCandle, trade.price, trade.quantity);
        }

        this.lastPrice = trade.price;
    }

    /**
     * Update candle with tick
     */
    tick(currentPrice: number): void {
        const baseTimestamp = this.getBaseTimestamp(this.env.now());

        if (!this.currentBaseCandle) {
            this.currentBaseCandle = this.createCandle(currentPrice, 0, baseTimestamp);
        } else if (this.currentBaseCandle.timestamp !== baseTimestamp) {
            this.finalizeCurrentBaseCandle();
            this.currentBaseCandle = this.createCandle(currentPrice, 0, baseTimestamp);
        } else {
            this.currentBaseCandle.high = Math.max(this.currentBaseCandle.high, currentPrice);
            this.currentBaseCandle.low = Math.min(this.currentBaseCandle.low, currentPrice);
            this.currentBaseCandle.close = currentPrice;
        }

        this.lastPrice = currentPrice;
    }

    private getBaseTimestamp(timestamp: number): number {
        return Math.floor(timestamp / this.basePeriodMs) * this.basePeriodMs;
    }

    private createCandle(price: number, volume: number, timestamp: number): CandleData {
        return {
            open: price,
            high: price,
            low: price,
            close: price,
            volume,
            timestamp,
            tradeCount: volume > 0 ? 1 : 0,
        };
    }

    private updateCandle(candle: CandleData, price: number, volume: number): void {
        candle.high = Math.max(candle.high, price);
        candle.low = Math.min(candle.low, price);
        candle.close = price;
        candle.volume += volume;
        candle.tradeCount++;
    }

    private pushBaseCandle(candle: CandleData): void {
        this.baseCandles.push(candle);
        if (this.baseCandles.length > this.maxBaseCandles) {
            this.baseCandles.shift(); // Keep size manageable
        }
        this.version++;
    }

    private finalizeCurrentBaseCandle(): void {
        if (this.currentBaseCandle) {
            this.pushBaseCandle(this.currentBaseCandle);
        }
    }

    /**
     * Get aggregated candles for current period (a new array every call)
     */
    getCandles(): CandleData[] {
        const finished = this.getFinishedBuckets();
        const current = this.currentBaseCandle;
        if (!current) return finished.slice();

        const bucket = this.bucketOf(current.timestamp);
        const last = finished[finished.length - 1];

        if (last && last.timestamp === bucket) {
            // The open base candle belongs to the newest bucket: merge into a copy
            const merged: CandleData = {
                ...last,
                high: Math.max(last.high, current.high),
                low: Math.min(last.low, current.low),
                close: current.close,
                volume: last.volume + current.volume,
                tradeCount: last.tradeCount + current.tradeCount,
            };
            const result = finished.slice(0, -1);
            result.push(merged);
            return result;
        }

        const result = finished.slice();
        result.push({ ...current, timestamp: bucket });
        return result;
    }

    /**
     * Get all aggregated candles including current
     */
    getAllCandles(): CandleData[] {
        return this.getCandles();
    }

    /**
     * Get current aggregated candle
     */
    getCurrentCandle(): CandleData | null {
        const all = this.getCandles();
        return all.length > 0 ? all[all.length - 1] : null;
    }

    private bucketOf(timestamp: number): number {
        return Math.floor(timestamp / this.displayPeriodMs) * this.displayPeriodMs;
    }

    /** Merged buckets of the finished base candles, cached until they change */
    private getFinishedBuckets(): CandleData[] {
        const cache = this.aggregateCache;
        if (cache && cache.version === this.version && cache.period === this.displayPeriodMs) {
            return cache.candles;
        }
        const candles = aggregateCandles(this.baseCandles, this.displayPeriodMs);
        this.aggregateCache = { version: this.version, period: this.displayPeriodMs, candles };
        return candles;
    }

    /**
     * Get last price
     */
    getLastPrice(): number {
        return this.currentBaseCandle?.close ?? this.lastPrice;
    }

    /**
     * Reset
     */
    reset(initialPrice: number = 50): void {
        this.baseCandles = [];
        this.currentBaseCandle = null;
        this.lastPrice = initialPrice;
        this.version++;
    }

    /**
     * Generate synthetic history (base candles): a random walk from
     * `startTime` up to now, so the chart is not empty when the page opens.
     */
    generateHistory(startTime: number, basePrice: number): void {
        this.reset(basePrice);

        const now = this.env.now();
        if (startTime >= now) return;

        const random = this.env.random;
        const h = SYNTHETIC_HISTORY;
        let price = basePrice;
        let currentTime = this.getBaseTimestamp(startTime);
        const endTime = this.getBaseTimestamp(now);

        while (currentTime < endTime) {
            const volatility = h.minVolatility + random() * h.extraVolatility;
            const trend = (random() - 0.5) * h.trendRange;

            const change = trend + (random() - 0.5) * volatility;
            const open = price;
            const close = price * (1 + change);
            const range = Math.abs(close - open) + price * volatility * h.wickRatio;
            const high = Math.max(open, close) + random() * range;
            const low = Math.min(open, close) - random() * range;
            const volume = Math.floor(h.minVolume + random() * h.extraVolume);

            this.pushBaseCandle({
                open, high, low, close, volume,
                timestamp: currentTime,
                tradeCount: Math.floor(h.minTrades + random() * h.extraTrades),
            });
            price = close;
            currentTime += this.basePeriodMs;
        }

        this.lastPrice = price;
        this.currentBaseCandle = this.createCandle(price, 0, this.getBaseTimestamp(now));
    }

    /**
     * Get previous completed candle close price
     */
    getPrevClose(): number {
        return prevCloseOf(this.getCandles(), this.lastPrice);
    }

    /**
     * Get OHLC stats (24h) based on BASE candles for accuracy
     */
    getStats(): CandleStats {
        const dayAgo = this.env.now() - DAY_MS;
        const first = firstIndexAtOrAfter(this.baseCandles, dayAgo);
        const current = this.currentBaseCandle && this.currentBaseCandle.timestamp >= dayAgo
            ? this.currentBaseCandle
            : null;

        let cache = this.statsCache;
        if (!cache || cache.version !== this.version || cache.first !== first) {
            let high = -Infinity;
            let low = Infinity;
            let volume = 0;
            for (let i = first; i < this.baseCandles.length; i++) {
                const c = this.baseCandles[i];
                if (c.high > high) high = c.high;
                if (c.low < low) low = c.low;
                volume += c.volume;
            }
            cache = { version: this.version, first, high, low, volume };
            this.statsCache = cache;
        }

        const hasFinished = first < this.baseCandles.length;
        if (!hasFinished && !current) {
            return {
                high24h: this.lastPrice,
                low24h: this.lastPrice,
                open24h: this.lastPrice,
                volume24h: 0,
                change24h: 0,
                changePercent24h: 0,
            };
        }

        const high24h = current ? Math.max(cache.high, current.high) : cache.high;
        const low24h = current ? Math.min(cache.low, current.low) : cache.low;
        const open24h = hasFinished ? this.baseCandles[first].open : current!.open;
        const close24h = current ? current.close : this.baseCandles[this.baseCandles.length - 1].close;
        const volume24h = cache.volume + (current ? current.volume : 0);
        const change24h = close24h - open24h;
        const changePercent24h = (change24h / open24h) * 100;

        return { high24h, low24h, open24h, volume24h, change24h, changePercent24h };
    }
}

/**
 * Merge time-ordered candles into buckets of `periodMs` (pure; returns new objects)
 */
export function aggregateCandles(source: CandleData[], periodMs: number): CandleData[] {
    const aggregated: CandleData[] = [];
    let currentAgg: CandleData | null = null;

    for (const candle of source) {
        const aggTimestamp = Math.floor(candle.timestamp / periodMs) * periodMs;

        if (!currentAgg || currentAgg.timestamp !== aggTimestamp) {
            if (currentAgg) aggregated.push(currentAgg);
            currentAgg = { ...candle, timestamp: aggTimestamp };
        } else {
            currentAgg.high = Math.max(currentAgg.high, candle.high);
            currentAgg.low = Math.min(currentAgg.low, candle.low);
            currentAgg.close = candle.close;
            currentAgg.volume += candle.volume;
            currentAgg.tradeCount += candle.tradeCount;
        }
    }

    if (currentAgg) aggregated.push(currentAgg);
    return aggregated;
}

/** Close of the previous candle; falls back to the first open, then `fallback` */
export function prevCloseOf(candles: CandleData[], fallback: number): number {
    if (candles.length >= 2) return candles[candles.length - 2].close;
    return candles.length > 0 ? candles[0].open : fallback;
}

/** Index of the first candle with timestamp >= t (candles sorted by time) */
function firstIndexAtOrAfter(candles: CandleData[], t: number): number {
    let lo = 0;
    let hi = candles.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (candles[mid].timestamp < t) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
