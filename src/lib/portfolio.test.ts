import { describe, expect, it } from 'vitest';
import { applyUserFill, FeeSettings, userOrderIdOf, userSideOf } from './portfolio';
import { HoldingLot, Trade } from './matching/types';

const FEES: FeeSettings = { commissionRate: 0.001425, minCommission: 20, taxRate: 0.003, dayTradeTaxRate: 0.0015 };
const DAY1 = Date.UTC(2026, 10, 3, 2, 0, 0);
const DAY2 = DAY1 + 24 * 3600_000;

let lotCounter = 0;
const newLotId = () => `LOT-${++lotCounter}`;

function fill(p: Partial<Trade> & { price: number; quantity: number }): Trade {
    return {
        tradeId: `T-${Math.random()}`,
        timestamp: DAY1,
        buyOrderId: 'USR-1',
        sellOrderId: 'BOT-1',
        takerSide: 'buy',
        makerSource: 'bot',
        takerSource: 'user',
        ...p,
    };
}

describe('userSideOf / userOrderIdOf', () => {
    it('reads the user side from the taker, or the opposite side when the user was the maker', () => {
        const taker = fill({ price: 50, quantity: 1000 });
        expect(userSideOf(taker)).toBe('buy');
        expect(userOrderIdOf(taker)).toBe('USR-1');

        const maker = fill({ price: 50, quantity: 1000, takerSide: 'buy', takerSource: 'bot', makerSource: 'user', buyOrderId: 'BOT-9', sellOrderId: 'USR-2' });
        expect(userSideOf(maker)).toBe('sell');
        expect(userOrderIdOf(maker)).toBe('USR-2');
    });
});

describe('applyUserFill', () => {
    it('keeps every fill of one order (regression: holdings kept only the last fill)', () => {
        // One market buy of 20 lots that hit three resting asks, as seen in the app
        const fills = [
            fill({ price: 48.8, quantity: 8000 }),
            fill({ price: 48.85, quantity: 7000 }),
            fill({ price: 48.85, quantity: 5000 }),
        ];
        let lots: HoldingLot[] = [];
        let cash = 0;
        for (const f of fills) {
            const r = applyUserFill(lots, f, FEES, { newLotId });
            lots = r.lots;
            cash += r.balanceChange;
        }

        expect(lots.map(l => l.quantity)).toEqual([8000, 7000, 5000]);
        expect(lots.reduce((s, l) => s + l.quantity, 0)).toBe(20000);
        const paid = 8000 * 48.8 + 7000 * 48.85 + 5000 * 48.85;
        const commissions = Math.floor(8000 * 48.8 * 0.001425) + Math.floor(7000 * 48.85 * 0.001425) + Math.floor(5000 * 48.85 * 0.001425);
        expect(cash).toBeCloseTo(-(paid + commissions), 6);
    });

    it('does not touch the lots it was given', () => {
        const lots: HoldingLot[] = [{ id: 'L1', tradeId: 'T', timestamp: DAY1, side: 'buy', price: 50, quantity: 2000, originalQuantity: 2000, commission: 142 }];
        const before = structuredClone(lots);
        applyUserFill(lots, fill({ price: 51, quantity: 1000, takerSide: 'sell', buyOrderId: 'BOT-1', sellOrderId: 'USR-1' }), FEES, { newLotId });
        expect(lots).toEqual(before);
    });

    it('closes the oldest long first, with pro-rata fees and day-trade tax', () => {
        const lots: HoldingLot[] = [
            { id: 'OLD', tradeId: 'T1', timestamp: DAY1 - 24 * 3600_000, side: 'buy', price: 50, quantity: 1000, originalQuantity: 1000, commission: 71 },
            { id: 'NEW', tradeId: 'T2', timestamp: DAY1, side: 'buy', price: 52, quantity: 2000, originalQuantity: 2000, commission: 148 },
        ];
        const sell = fill({ price: 53, quantity: 2000, takerSide: 'sell', buyOrderId: 'BOT-1', sellOrderId: 'USR-7' });

        const r = applyUserFill(lots, sell, FEES, { newLotId });

        const commission = Math.floor(106000 * 0.001425); // 151
        const taxOld = Math.floor(53 * 1000 * 0.003);     // yesterday's lot: normal tax
        const taxNew = Math.floor(53 * 1000 * 0.0015);    // today's lot: day-trade tax
        expect(r.side).toBe('sell');
        expect(r.orderId).toBe('USR-7');
        expect(r.commission).toBe(commission);
        expect(r.tax).toBe(taxOld + taxNew);
        expect(r.lots).toEqual([{ ...lots[1], quantity: 1000 }]);
        const pnlOld = 3 * 1000 - 71 - commission / 2 - taxOld;
        const pnlNew = 1 * 1000 - 148 / 2 - commission / 2 - taxNew;
        expect(r.realizedPnl).toBeCloseTo(pnlOld + pnlNew, 6);
        expect(r.balanceChange).toBeCloseTo(106000 - commission - taxOld - taxNew, 6);
    });

    it('with a target lot closes only that lot', () => {
        const lots: HoldingLot[] = [
            { id: 'A', tradeId: 'T1', timestamp: DAY1, side: 'buy', price: 50, quantity: 1000, originalQuantity: 1000, commission: 71 },
            { id: 'B', tradeId: 'T2', timestamp: DAY1, side: 'buy', price: 51, quantity: 1000, originalQuantity: 1000, commission: 72 },
        ];
        const sell = fill({ price: 52, quantity: 1000, takerSide: 'sell', buyOrderId: 'BOT-1', sellOrderId: 'USR-1' });
        const r = applyUserFill(lots, sell, FEES, { targetLotId: 'B', newLotId });
        expect(r.lots.map(l => l.id)).toEqual(['A']);
    });

    it('opens a short with tax and locked collateral, and releases it on cover', () => {
        const short = applyUserFill([], fill({ price: 50, quantity: 1000, takerSide: 'sell', buyOrderId: 'BOT-1', sellOrderId: 'USR-1', timestamp: DAY1 }), FEES, { newLotId });
        const commission = Math.floor(50000 * 0.001425);
        const tax = Math.floor(50000 * 0.003);
        expect(short.lots).toMatchObject([{ side: 'sell', price: 50, quantity: 1000, commission }]);
        expect(short.tax).toBe(tax);
        expect(short.balanceChange).toBe(-commission - tax); // proceeds are held as collateral

        const cover = applyUserFill(short.lots, fill({ price: 48, quantity: 1000, timestamp: DAY2 }), FEES, { newLotId });
        const coverCommission = Math.floor(48000 * 0.001425);
        expect(cover.lots).toEqual([]);
        expect(cover.tax).toBe(0); // buying is not taxed
        expect(cover.realizedPnl).toBeCloseTo(2000 - commission - coverCommission, 6);
        expect(cover.balanceChange).toBe(-48000 - coverCommission + 50000);
    });

    it('charges at least the minimum commission per fill', () => {
        const r = applyUserFill([], fill({ price: 10, quantity: 100 }), FEES, { newLotId });
        expect(r.commission).toBe(20);
    });
});
