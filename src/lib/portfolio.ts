// What one fill does to the user's account: lots, fees, tax, realized P&L and cash.

import { HoldingLot, OrderSide, Trade } from './matching/types';
import { calculateCommission } from './utils';

/** Fee settings, rates as decimals (0.001425 = 0.1425%) */
export interface FeeSettings {
    commissionRate: number;
    /** Minimum commission per fill (TWD) */
    minCommission: number;
    /** Securities transaction tax on sells */
    taxRate: number;
    /** Tax on sells that close a lot opened the same day */
    dayTradeTaxRate: number;
}

export interface UserFill {
    /** The user's side of this trade */
    side: OrderSide;
    /** The user's order that was filled */
    orderId: string;
    price: number;
    quantity: number;
    /** price × quantity */
    total: number;
    commission: number;
    tax: number;
    /** Realized P&L of the part that closed existing lots, after fees and tax */
    realizedPnl: number;
    /** What happens to cash (short collateral included) */
    balanceChange: number;
    /** The new lots; lots that were closed completely are gone */
    lots: HoldingLot[];
}

/** Which side of the trade belongs to the user (taker first, else maker) */
export function userSideOf(trade: Trade): OrderSide {
    if (trade.takerSource === 'user') return trade.takerSide;
    return trade.takerSide === 'buy' ? 'sell' : 'buy';
}

/** The user's order ID in this trade */
export function userOrderIdOf(trade: Trade): string {
    return userSideOf(trade) === 'buy' ? trade.buyOrderId : trade.sellOrderId;
}

function sameDay(a: number, b: number): boolean {
    return new Date(a).toDateString() === new Date(b).toDateString();
}

/**
 * Apply one fill to the user's lots. Pure: the input array and its lots are
 * not touched, so calling it again with the returned lots for the next fill
 * of the same order gives the right result.
 *
 * Rules (unchanged from the trading page):
 * - The fill first closes lots on the other side, oldest first (FIFO). When
 *   `targetLotId` is set (the "close this lot" button), only that lot is closed.
 * - Whatever is left opens a new lot on the user's side.
 * - Commission (with the minimum) is charged on the whole fill. Tax is charged
 *   on sells only: the day-trade rate when the closed lot was opened the same
 *   day, the normal rate otherwise and for opening a short.
 * - Shorts lock their value as collateral; closing a short releases it.
 */
export function applyUserFill(
    lots: HoldingLot[],
    trade: Trade,
    fees: FeeSettings,
    options: { targetLotId?: string | null; newLotId: () => string },
): UserFill {
    const side = userSideOf(trade);
    const orderId = userOrderIdOf(trade);
    const closeSide: OrderSide = side === 'buy' ? 'sell' : 'buy';

    const price = trade.price;
    const quantity = trade.quantity;
    const total = price * quantity;
    const commission = calculateCommission(total, fees.commissionRate, fees.minCommission);

    const nextLots = lots.map(lot => ({ ...lot }));
    let remaining = quantity;
    let tax = 0;
    let realizedPnl = 0;
    let closedShortValue = 0; // collateral released by closing shorts
    let openedShortValue = 0; // collateral locked by opening shorts

    // 1. Close existing lots (FIFO, or only the targeted lot)
    for (const lot of nextLots) {
        if (remaining <= 0) break;
        if (lot.quantity <= 0 || lot.side !== closeSide) continue;
        if (options.targetLotId && lot.id !== options.targetLotId) continue;

        const closeQty = Math.min(lot.quantity, remaining);
        const grossPnl = lot.side === 'buy'
            ? (price - lot.price) * closeQty
            : (lot.price - price) * closeQty;

        // Entry commission pro rata of the lot, exit commission pro rata of this fill
        const entryCommission = (closeQty / lot.originalQuantity) * lot.commission;
        const exitCommission = (closeQty / quantity) * commission;

        let lotTax = 0;
        if (side === 'sell') {
            // Selling closes a long: day-trade tax if the lot was opened today
            const rate = sameDay(lot.timestamp, trade.timestamp) ? fees.dayTradeTaxRate : fees.taxRate;
            lotTax = Math.floor(price * closeQty * rate);
        }
        tax += lotTax;
        realizedPnl += grossPnl - entryCommission - exitCommission - lotTax;

        if (lot.side === 'sell') {
            closedShortValue += lot.price * closeQty;
        }

        lot.quantity -= closeQty;
        remaining -= closeQty;
    }

    // 2. Open a new lot with whatever is left
    if (remaining > 0) {
        if (side === 'sell') {
            tax += Math.floor(price * remaining * fees.taxRate);
            openedShortValue += price * remaining;
        }
        nextLots.push({
            id: options.newLotId(),
            tradeId: trade.tradeId,
            timestamp: trade.timestamp,
            side,
            price,
            quantity: remaining,
            originalQuantity: remaining,
            commission: (remaining / quantity) * commission,
        });
    }

    // 3. Cash: sells bring money in, buys take it out; then fees, tax, collateral
    const cashFlow = side === 'sell' ? total : -total;
    const balanceChange = cashFlow - commission - tax + closedShortValue - openedShortValue;

    return {
        side,
        orderId,
        price,
        quantity,
        total,
        commission,
        tax,
        realizedPnl,
        balanceChange,
        lots: nextLots.filter(lot => lot.quantity > 0),
    };
}
