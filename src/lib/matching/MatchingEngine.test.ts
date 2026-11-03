import { describe, expect, it } from 'vitest';
import { MatchingEngine } from './MatchingEngine';
import { PriceStep } from './PriceStep';
import { deterministicEnv } from '../sim/env';

function engineAt(price = 100) {
    const env = deterministicEnv(1, 1_000_000);
    return { engine: new MatchingEngine(price, env), env };
}

describe('PriceStep (TWSE tick sizes)', () => {
    it('uses the tick size of the price band', () => {
        expect(PriceStep.getTickSize(9.99)).toBe(0.01);
        expect(PriceStep.getTickSize(10)).toBe(0.05);
        expect(PriceStep.getTickSize(49.95)).toBe(0.05);
        expect(PriceStep.getTickSize(50)).toBe(0.1);
        expect(PriceStep.getTickSize(100)).toBe(0.5);
        expect(PriceStep.getTickSize(500)).toBe(1);
        expect(PriceStep.getTickSize(1000)).toBe(5);
    });

    it('rounds, floors and ceils to valid ticks without float noise', () => {
        expect(PriceStep.roundToTick(50.04)).toBe(50);
        expect(PriceStep.roundToTick(50.06)).toBe(50.1);
        expect(PriceStep.floorToTick(49.99)).toBe(49.95);
        expect(PriceStep.ceilToTick(50.01)).toBe(50.1);
        expect(PriceStep.roundToTick(0.1 + 0.2)).toBe(0.3);
    });

    it('keeps prices that already sit on a tick (regression: 49.9 floored to 49.85)', () => {
        for (const price of [49.9, 0.29, 50.3, 10.15, 99.5, 1005]) {
            expect(PriceStep.floorToTick(price)).toBe(price);
            expect(PriceStep.ceilToTick(price)).toBe(price);
        }
    });
});

describe('MatchingEngine', () => {
    it('rests limit orders that do not cross and reports best bid/ask', () => {
        const { engine } = engineAt();
        engine.submitOrder('buy', 'limit', 1000, 99.5, 'bot');
        engine.submitOrder('sell', 'limit', 2000, 100.5, 'bot');

        const book = engine.getOrderBookSnapshot();
        expect(book.bestBid).toBe(99.5);
        expect(book.bestAsk).toBe(100.5);
        expect(book.spread).toBe(1);
        expect(engine.getRecentTrades()).toHaveLength(0);
        expect(engine.getLastPrice()).toBe(100);
    });

    it('fills at the maker price, better prices first, then first come first served', () => {
        const { engine, env } = engineAt();
        engine.submitOrder('sell', 'limit', 1000, 101, 'bot'); // A
        env.clock.advance(1);
        engine.submitOrder('sell', 'limit', 1000, 100.5, 'bot'); // B (better price)
        env.clock.advance(1);
        const c = engine.submitOrder('sell', 'limit', 1000, 100.5, 'user'); // C (same price, later)

        const result = engine.submitOrder('buy', 'limit', 2500, 101, 'bot');

        expect(result.status).toBe('filled');
        expect(result.trades.map(t => [t.price, t.quantity])).toEqual([
            [100.5, 1000], // B
            [100.5, 1000], // C
            [101, 500],    // A, partly
        ]);
        expect(result.trades[1].sellOrderId).toBe(c.orderId);
        expect(result.trades[1].makerSource).toBe('user');
        expect(engine.getLastPrice()).toBe(101);
        expect(engine.getOrderBookSnapshot().asks).toEqual([
            { price: 101, quantity: 500, orderCount: 1, hasUserOrder: false, hasBotOrder: true },
        ]);
    });

    it('a crossing limit order fills what it can and rests the rest (GTC)', () => {
        const { engine } = engineAt();
        engine.submitOrder('sell', 'limit', 1000, 100, 'bot');
        const result = engine.submitOrder('buy', 'limit', 3000, 100, 'user');

        expect(result.status).toBe('partial');
        expect(result.filledQuantity).toBe(1000);
        expect(result.remainingQuantity).toBe(2000);
        expect(engine.getOrderBookSnapshot().bids[0]).toMatchObject({ price: 100, quantity: 2000, hasUserOrder: true });
    });

    it('market orders walk the book; the GTC rest becomes a limit at the last price', () => {
        const { engine } = engineAt();
        engine.submitOrder('sell', 'limit', 1000, 100, 'bot');
        engine.submitOrder('sell', 'limit', 1000, 100.5, 'bot');

        const result = engine.submitOrder('buy', 'market', 3000, null, 'user', 'GTC');

        expect(result.trades.map(t => t.price)).toEqual([100, 100.5]);
        expect(result.status).toBe('partial');
        expect(result.averagePrice).toBe(100.25);
        expect(engine.getOrderBookSnapshot().bids[0]).toMatchObject({ price: 100.5, quantity: 1000 });
    });

    it('IOC drops the unfilled rest, FOK fills all or nothing', () => {
        const { engine } = engineAt();
        engine.submitOrder('sell', 'limit', 1000, 100, 'bot');

        const ioc = engine.submitOrder('buy', 'market', 3000, null, 'user', 'IOC');
        expect(ioc.status).toBe('cancelled');
        expect(ioc.filledQuantity).toBe(1000);
        expect(engine.getOrderBookSnapshot().bids).toHaveLength(0);

        engine.submitOrder('sell', 'limit', 1000, 100, 'bot');
        const fok = engine.submitOrder('buy', 'limit', 3000, 100, 'user', 'FOK');
        expect(fok.status).toBe('cancelled');
        expect(fok.filledQuantity).toBe(0);
        expect(engine.getOrderBookSnapshot().asks[0].quantity).toBe(1000); // untouched

        const fokOk = engine.submitOrder('buy', 'limit', 1000, 100, 'user', 'FOK');
        expect(fokOk.status).toBe('filled');
    });

    it('snaps limit prices to the tick grid and never below 0.01', () => {
        const { engine } = engineAt(100);
        engine.submitOrder('buy', 'limit', 1000, 99.74, 'bot'); // tick 0.1 below 100 -> 99.7
        engine.submitOrder('buy', 'limit', 1000, -5, 'bot');
        const bids = engine.getOrderBookSnapshot().bids.map(l => l.price);
        expect(bids).toEqual([99.7, 0.01]);
    });

    it('cancels single orders and all orders of one source', () => {
        const { engine } = engineAt();
        const user = engine.submitOrder('buy', 'limit', 1000, 99, 'user');
        engine.submitOrder('buy', 'limit', 1000, 98, 'bot');
        engine.submitOrder('sell', 'limit', 1000, 102, 'bot');

        expect(engine.cancelOrdersBySource('bot')).toBe(2);
        expect(engine.cancelOrder(user.orderId)).toBe(true);
        expect(engine.cancelOrder(user.orderId)).toBe(false);
        const book = engine.getOrderBookSnapshot();
        expect(book.bids).toHaveLength(0);
        expect(book.asks).toHaveLength(0);
    });

    it('can hide bot orders from the snapshot', () => {
        const { engine } = engineAt();
        engine.submitOrder('buy', 'limit', 1000, 99, 'bot');
        engine.submitOrder('buy', 'limit', 2000, 99, 'user');
        engine.submitOrder('sell', 'limit', 1000, 101, 'bot');

        const book = engine.getOrderBookSnapshot(15, 'bot');
        expect(book.bids).toEqual([{ price: 99, quantity: 2000, orderCount: 1, hasUserOrder: true, hasBotOrder: false }]);
        expect(book.asks).toEqual([]);
    });
});

describe('MatchingEngine trade cursor', () => {
    function trade(engine: MatchingEngine) {
        engine.submitOrder('sell', 'limit', 1000, 100, 'bot');
        engine.submitOrder('buy', 'limit', 1000, 100, 'bot');
    }

    it('returns exactly the trades after a cursor', () => {
        const { engine } = engineAt();
        trade(engine);
        const cursor = engine.getTradeCount();
        expect(cursor).toBe(1);
        expect(engine.getTradesSince(cursor)).toEqual([]);

        trade(engine);
        trade(engine);
        const since = engine.getTradesSince(cursor);
        expect(since).toHaveLength(2);
        expect(since[1]).toBe(engine.getRecentTrades(1)[0]);
    });

    it('keeps working after the history is trimmed', () => {
        const { engine } = engineAt();
        for (let i = 0; i < 2500; i++) trade(engine);
        const cursor = engine.getTradeCount();
        for (let i = 0; i < 30; i++) trade(engine);

        expect(engine.getTradeCount()).toBe(2530);
        expect(engine.getTradesSince(cursor)).toHaveLength(30);
        expect(engine.getRecentTrades(50)).toHaveLength(50);
        // Asking for more than is kept gives what is kept
        expect(engine.getTradesSince(0).length).toBeLessThanOrEqual(2000);
    });

    it('returns nothing after a reset', () => {
        const { engine } = engineAt();
        trade(engine);
        engine.reset(100);
        expect(engine.getTradesSince(0)).toEqual([]);
    });
});

describe('OrderBook.pruneDistantOrders', () => {
    it('drops bot orders more than the threshold away, keeps user orders', () => {
        const { engine } = engineAt(100);
        engine.submitOrder('buy', 'limit', 1000, 85, 'bot');
        engine.submitOrder('buy', 'limit', 1000, 85, 'user');
        engine.submitOrder('buy', 'limit', 1000, 95, 'bot');
        engine.submitOrder('sell', 'limit', 1000, 115, 'bot');

        const removed = engine.getOrderBook().pruneDistantOrders(100, 0.1, 'bot');

        expect(removed).toBe(2);
        const book = engine.getOrderBookSnapshot();
        expect(book.bids.map(l => [l.price, l.hasUserOrder, l.hasBotOrder])).toEqual([[95, false, true], [85, true, false]]);
        expect(book.asks).toEqual([]);
    });
});
