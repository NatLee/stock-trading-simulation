import { Trade } from './types';

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

/**
 * CandleAggregator - aggregates trades into OHLCV candles
 * 
 * Features:
 * - Configurable time period
 * - Real-time current candle updates
 * - Historical candle storage
 */
export class CandleAggregator {
    private baseCandles: CandleData[] = []; // Store fine-grained candles (e.g. 15s)
    private currentBaseCandle: CandleData | null = null;
    private displayPeriodMs: number;
    private readonly basePeriodMs: number = 15000; // Fixed base resolution (15s)
    private maxBaseCandles: number = 10000; // Store enough history (~40 hours of 15s data)
    private lastPrice: number;

    constructor(periodMs: number = 15000, maxCandles: number = 100, initialPrice: number = 50) {
        this.displayPeriodMs = periodMs;
        // maxCandles is for display limit, but we store more base history
        this.lastPrice = initialPrice;
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
        const now = Date.now();
        const baseTimestamp = this.getBaseTimestamp(now);

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

    private finalizeCurrentBaseCandle(): void {
        if (this.currentBaseCandle) {
            this.baseCandles.push(this.currentBaseCandle);
            if (this.baseCandles.length > this.maxBaseCandles) {
                this.baseCandles.shift(); // Keep size manageable
            }
        }
    }

    /**
     * Get aggregated candles for current period
     */
    getCandles(): CandleData[] {
        return this.aggregateCandles(this.baseCandles, this.currentBaseCandle, this.displayPeriodMs);
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

    /**
     * Aggregate base candles into target period candles
     */
    private aggregateCandles(baseData: CandleData[], current: CandleData | null, periodMs: number): CandleData[] {
        const source = [...baseData];
        if (current) source.push(current);

        if (source.length === 0) return [];

        const aggregated: CandleData[] = [];
        let currentAgg: CandleData | null = null;

        for (const candle of source) {
            const aggTimestamp = Math.floor(candle.timestamp / periodMs) * periodMs;

            if (!currentAgg) {
                currentAgg = { ...candle, timestamp: aggTimestamp };
            } else if (currentAgg.timestamp !== aggTimestamp) {
                aggregated.push(currentAgg);
                currentAgg = { ...candle, timestamp: aggTimestamp };
            } else {
                // Merge
                currentAgg.high = Math.max(currentAgg.high, candle.high);
                currentAgg.low = Math.min(currentAgg.low, candle.low);
                currentAgg.close = candle.close;
                currentAgg.volume += candle.volume;
                currentAgg.tradeCount += candle.tradeCount;
            }
        }

        if (currentAgg) {
            aggregated.push(currentAgg);
        }

        return aggregated;
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
    }

    /**
     * Generate synthetic history (base candles)
     */
    generateHistory(startTime: number, basePrice: number): void {
        this.reset(basePrice);

        const now = Date.now();
        if (startTime >= now) return;

        let price = basePrice;
        let currentTime = this.getBaseTimestamp(startTime);
        const endTime = this.getBaseTimestamp(now);

        while (currentTime < endTime) {
            const volatility = 0.002 + Math.random() * 0.003;
            // Shorter trend for shorter period
            const trend = (Math.random() - 0.5) * 0.0005;

            const change = trend + (Math.random() - 0.5) * volatility;
            const open = price;
            const close = price * (1 + change);
            const range = Math.abs(close - open) + price * volatility * 0.5;
            const high = Math.max(open, close) + Math.random() * range;
            const low = Math.min(open, close) - Math.random() * range;
            const volume = Math.floor(500 + Math.random() * 2000); // Smaller volume for 15s

            const candle: CandleData = {
                open, high, low, close, volume,
                timestamp: currentTime,
                tradeCount: Math.floor(2 + Math.random() * 8),
            };

            this.baseCandles.push(candle);
            price = close;
            currentTime += this.basePeriodMs;

            if (this.baseCandles.length > this.maxBaseCandles) {
                this.baseCandles.shift();
            }
        }

        this.lastPrice = price;
        this.currentBaseCandle = this.createCandle(price, 0, this.getBaseTimestamp(now));
    }

    // No need for backward generation anymore
    generateHistoryBackwards(endTime: number, endPrice: number): void {
        // Deprecated/No-op, as we use resampling now
    }

    /**
     * Get previous completed candle close price
     */
    getPrevClose(): number {
        const candles = this.getCandles();
        if (candles.length >= 2) {
            return candles[candles.length - 2].close;
        }
        return candles.length > 0 ? candles[0].open : this.lastPrice;
    }

    /**
     * Get OHLC stats (24h) based on BASE candles for accuracy
     */
    getStats() {
        // Use base candles for 24h stats
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recent = this.baseCandles.filter(c => c.timestamp >= dayAgo);

        if (this.currentBaseCandle && this.currentBaseCandle.timestamp >= dayAgo) {
            recent.push(this.currentBaseCandle);
        }

        if (recent.length === 0) {
            return {
                high24h: this.lastPrice,
                low24h: this.lastPrice,
                open24h: this.lastPrice,
                volume24h: 0,
                change24h: 0,
                changePercent24h: 0,
            };
        }

        const high24h = Math.max(...recent.map(c => c.high));
        const low24h = Math.min(...recent.map(c => c.low));
        const open24h = recent[0].open;
        const close24h = recent[recent.length - 1].close;
        const volume24h = recent.reduce((sum, c) => sum + c.volume, 0);
        const change24h = close24h - open24h;
        const changePercent24h = (change24h / open24h) * 100;

        return { high24h, low24h, open24h, volume24h, change24h, changePercent24h };
    }
}
