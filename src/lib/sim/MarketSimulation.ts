import { MatchingEngine } from '../matching/MatchingEngine';
import { CandleAggregator, CandleData, CandleStats, prevCloseOf } from '../matching/CandleAggregator';
import { OrderBookSnapshot, Trade } from '../matching/types';
import { BotManager } from '../bots/BotManager';
import { BotManagerConfig } from '../bots/types';
import { SimEnv, realEnv } from './env';

export interface MarketSimulationOptions {
    /** Price the synthetic history starts from */
    initialPrice: number;
    /** Chart timeframe in ms (15 s candles are merged into it) */
    candlePeriod: number;
    /** Start of the synthetic history (ms). Leave out to start with an empty chart. */
    historyStart?: number;
    /** Bot manager settings (scenario, intensity, lot size, ...) */
    bots?: Partial<BotManagerConfig>;
}

export interface MarketSnapshot {
    orderBook: OrderBookSnapshot;
    candles: CandleData[];
    currentCandle: CandleData | null;
    currentPrice: number;
    recentTrades: Trade[];
    stats: CandleStats;
    /** Change against the previous candle's close */
    tickChange: number;
    tickChangePercent: number;
}

/**
 * The whole market in one object: matching engine, bots and candles.
 *
 * `step()` is one tick of the app (every 100 ms in the browser):
 *   1. the bots look at the last price and send orders (BotManager.tick),
 *   2. the matching engine fills whatever crosses; the last fill is the new price,
 *   3. every trade since the previous step goes into the 15 s candles,
 *   4. the open candle follows the last price.
 *
 * The React hook calls it on a timer; tests and the docs scripts call it in a
 * loop with a seeded random source and a manual clock.
 */
export class MarketSimulation {
    readonly engine: MatchingEngine;
    readonly bots: BotManager;
    readonly candles: CandleAggregator;
    private tradeCursor = 0;

    constructor(options: MarketSimulationOptions, env: SimEnv = realEnv) {
        this.candles = new CandleAggregator(options.candlePeriod, options.initialPrice, env);
        if (options.historyStart !== undefined) {
            this.candles.generateHistory(options.historyStart, options.initialPrice);
        }

        // Start trading where the history left off
        const startPrice = this.candles.getLastPrice();
        this.engine = new MatchingEngine(startPrice, env);
        this.bots = new BotManager(this.engine, options.bots ?? {}, env);
    }

    /**
     * Run one tick. Returns every trade made since the previous step, oldest
     * first: the bots' trades from this tick and any user trades in between.
     */
    step(): Trade[] {
        this.bots.tick();

        const trades = this.engine.getTradesSince(this.tradeCursor);
        this.tradeCursor = this.engine.getTradeCount();

        this.candles.processTrades(trades);
        this.candles.tick(this.engine.getLastPrice());
        return trades;
    }

    /** Everything the UI shows, read in one go */
    snapshot(showBotOrders: boolean = true, depth: number = 15, recentTradeCount: number = 20): MarketSnapshot {
        const currentPrice = this.engine.getLastPrice();
        const candles = this.candles.getCandles();
        const prevClose = prevCloseOf(candles, currentPrice);
        const tickChange = currentPrice - prevClose;

        return {
            orderBook: this.engine.getOrderBookSnapshot(depth, showBotOrders ? undefined : 'bot'),
            candles,
            currentCandle: candles.length > 0 ? candles[candles.length - 1] : null,
            currentPrice,
            recentTrades: this.engine.getRecentTrades(recentTradeCount),
            stats: this.candles.getStats(),
            tickChange,
            tickChangePercent: prevClose > 0 ? (tickChange / prevClose) * 100 : 0,
        };
    }
}
