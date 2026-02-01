'use client';

import { useState, useCallback, useRef } from 'react';
import {
    CandleData, Holding, OrderRecord, MarketRegime,
    LogEntry, AIState, AIRecommendation, Scenario,
    OrderType, OrderSide, PendingOrder, FilledOrder
} from '@/types';
import { CONFIG, TRANSLATIONS, Language } from '@/constants';
import { generateId, getTimeString, calculateCommission } from '@/lib';

// Generate sequential order ID
function generateOrderId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${dateStr}-${seq}`;
}

interface OrderBookEntry {
    price: string;
    size: string;
    bg: string;
}

interface OrderBook {
    asks: OrderBookEntry[];
    bids: OrderBookEntry[];
}

interface TradingEngineState {
    // Price & Chart
    candles: CandleData[];
    currentCandle: CandleData | null;
    currentPrice: number;

    // Market
    regime: MarketRegime;
    sentiment: number;
    scenario: Scenario | null;

    // Trading - Holdings based
    balance: number;
    holding: Holding | null;
    orderHistory: OrderRecord[];
    pendingOrders: PendingOrder[];
    realizedPnl: number;

    // AI
    aiState: AIState;
    aiRecommendation: AIRecommendation;
    logs: LogEntry[];

    // Order Book
    orderBook: OrderBook;
}

export function useTradingEngine(lang: Language = 'zh') {
    const t = TRANSLATIONS[lang];
    const orderCountRef = useRef(0);

    // State
    const [state, setState] = useState<TradingEngineState>({
        candles: [],
        currentCandle: null,
        currentPrice: CONFIG.BASE_PRICE,
        regime: 'CHOP',
        sentiment: 50,
        scenario: null,
        balance: CONFIG.INITIAL_BALANCE,
        holding: null,
        orderHistory: [],
        pendingOrders: [],
        realizedPnl: 0,
        aiState: 'idle',
        aiRecommendation: null,
        logs: [{ id: generateId(), text: t.logReady, type: 'info', time: getTimeString(), timestamp: Date.now() }],
        orderBook: { asks: [], bids: [] },
    });

    // Refs
    const basePriceRef = useRef(CONFIG.BASE_PRICE);
    const organicTrendRef = useRef(0);
    const historyRef = useRef<CandleData[]>([]);
    const currentCandleRef = useRef<CandleData | null>(null);

    // Add log helper
    const addLog = useCallback((text: string, type: LogEntry['type'] = 'info') => {
        setState(prev => ({
            ...prev,
            logs: [
                { id: generateId(), text, type, time: getTimeString(), timestamp: Date.now() },
                ...prev.logs
            ].slice(0, 8)
        }));
    }, []);

    // Process a single fill and update holdings/balance
    const processFill = useCallback((
        side: OrderSide,
        quantity: number,
        price: number,
        commission: number,
        orderId: string,
        prevState: TradingEngineState
    ): { newState: Partial<TradingEngineState>, orderPnl: number } => {
        let newHolding: Holding = prevState.holding ? { ...prevState.holding } : {
            symbol: 'NATLEE',
            quantity: 0,
            averageCost: 0,
            marketValue: 0,
            unrealizedPnl: 0,
            unrealizedPnlPercent: 0,
        };

        let newBalance = prevState.balance;
        let newRealizedPnl = prevState.realizedPnl;
        let orderPnl = 0;
        const totalCost = quantity * price;

        if (side === 'buy') {
            // BUY: Deduct money, add shares
            const cost = totalCost + commission;
            newBalance -= cost;

            if (newHolding.quantity >= 0) {
                const totalShares = newHolding.quantity + quantity;
                const totalCostBasis = newHolding.quantity * newHolding.averageCost + totalCost;
                newHolding.averageCost = totalShares > 0 ? totalCostBasis / totalShares : price;
                newHolding.quantity = totalShares;
            } else {
                const coverQty = Math.min(quantity, Math.abs(newHolding.quantity));
                orderPnl = coverQty * (newHolding.averageCost - price);
                newRealizedPnl += orderPnl;
                newHolding.quantity += quantity;
                if (newHolding.quantity > 0) {
                    newHolding.averageCost = price;
                }
            }
        } else {
            // SELL: Add money, reduce shares
            if (newHolding.quantity > 0) {
                const sellQty = Math.min(quantity, newHolding.quantity);
                const proceeds = sellQty * price - commission;
                orderPnl = sellQty * (price - newHolding.averageCost);
                newRealizedPnl += orderPnl;
                newBalance += proceeds;
                newHolding.quantity -= sellQty;

                const shortQty = quantity - sellQty;
                if (shortQty > 0 && newHolding.quantity === 0) {
                    newHolding.quantity = -shortQty;
                    newHolding.averageCost = price;
                    newBalance += shortQty * price;
                }

                if (newHolding.quantity === 0) {
                    newHolding.averageCost = 0;
                }
            } else {
                const proceeds = totalCost - commission;
                newBalance += proceeds;

                if (newHolding.quantity < 0) {
                    const totalShortShares = Math.abs(newHolding.quantity) + quantity;
                    const totalCostBasis = Math.abs(newHolding.quantity) * newHolding.averageCost + totalCost;
                    newHolding.averageCost = totalCostBasis / totalShortShares;
                } else {
                    newHolding.averageCost = price;
                }
                newHolding.quantity -= quantity;
            }
        }

        // Update market value (will be updated by price changes)
        if (newHolding.quantity !== 0) {
            const absQty = Math.abs(newHolding.quantity);
            newHolding.marketValue = absQty * prevState.currentPrice;

            if (newHolding.quantity > 0) {
                newHolding.unrealizedPnl = newHolding.quantity * (prevState.currentPrice - newHolding.averageCost);
            } else {
                newHolding.unrealizedPnl = absQty * (newHolding.averageCost - prevState.currentPrice);
            }

            const costBasis = absQty * newHolding.averageCost;
            newHolding.unrealizedPnlPercent = costBasis > 0 ? (newHolding.unrealizedPnl / costBasis) * 100 : 0;
        } else {
            newHolding.marketValue = 0;
            newHolding.unrealizedPnl = 0;
            newHolding.unrealizedPnlPercent = 0;
        }

        return {
            newState: {
                holding: newHolding.quantity !== 0 ? newHolding : null,
                balance: newBalance,
                realizedPnl: newRealizedPnl,
            },
            orderPnl,
        };
    }, []);

    // Submit order - NEW LOGIC with order book consumption
    const submitOrder = useCallback((
        side: OrderSide,
        quantity: number,
        price: number,
        leverage: number,
        orderType: OrderType,
        orderBook: OrderBook
    ) => {
        const orderId = generateOrderId();
        orderCountRef.current += 1;

        if (orderType === 'limit') {
            // Limit order: add to pending orders
            const pendingOrder: PendingOrder = {
                orderId,
                timestamp: Date.now(),
                side,
                quantity,
                remainingQuantity: quantity,
                limitPrice: price,
                leverage,
                status: 'pending',
            };

            setState(prev => ({
                ...prev,
                pendingOrders: [...prev.pendingOrders, pendingOrder],
            }));

            addLog(`[${orderId}] 限價單掛單: ${side === 'buy' ? '買' : '賣'} ${quantity}股 @ $${price.toFixed(2)}`, 'info');
            return;
        }

        // Market order: consume order book
        const entries = side === 'buy'
            ? [...orderBook.asks].reverse()  // Buy: lowest ask first
            : [...orderBook.bids];            // Sell: highest bid first

        let remainingQuantity = quantity;
        const filledOrders: FilledOrder[] = [];

        setState(prev => {
            let currentState = { ...prev };

            for (const entry of entries) {
                if (remainingQuantity <= 0) break;

                const entryPrice = parseFloat(entry.price);
                const entrySize = parseInt(entry.size);

                if (entrySize <= 0 || isNaN(entryPrice)) continue;

                const fillQuantity = Math.min(remainingQuantity, entrySize);
                const fillTotal = fillQuantity * entryPrice;
                const commission = calculateCommission(fillTotal);

                const { newState, orderPnl } = processFill(
                    side,
                    fillQuantity,
                    entryPrice,
                    commission,
                    orderId,
                    currentState
                );

                // Create order record
                const newOrder: OrderRecord = {
                    orderId: filledOrders.length === 0 ? orderId : `${orderId}-${filledOrders.length + 1}`,
                    timestamp: Date.now(),
                    symbol: 'NATLEE',
                    side,
                    quantity: fillQuantity,
                    price: entryPrice,
                    total: fillTotal,
                    commission,
                    status: 'filled',
                    pnl: orderPnl,
                };

                currentState = {
                    ...currentState,
                    ...newState,
                    orderHistory: [newOrder, ...currentState.orderHistory],
                };

                filledOrders.push({
                    orderId: newOrder.orderId,
                    timestamp: newOrder.timestamp,
                    side,
                    quantity: fillQuantity,
                    price: entryPrice,
                    total: fillTotal,
                    commission,
                    pnl: orderPnl,
                });

                remainingQuantity -= fillQuantity;
            }

            return currentState;
        });

        if (filledOrders.length > 0) {
            const totalQty = filledOrders.reduce((sum, o) => sum + o.quantity, 0);
            const avgPrice = filledOrders.reduce((sum, o) => sum + o.price * o.quantity, 0) / totalQty;
            addLog(`[${orderId}] 市價單成交: ${side === 'buy' ? '買' : '賣'} ${totalQty}股 @ 均價 $${avgPrice.toFixed(2)} (${filledOrders.length}筆)`, 'success');
        } else {
            addLog(`[${orderId}] 市價單失敗: order book 無可用掛單`, 'error');
        }

        if (remainingQuantity > 0) {
            addLog(`警告: ${remainingQuantity}股未能成交 (order book 深度不足)`, 'warning');
        }
    }, [addLog, processFill]);

    // Check pending orders against order book
    const checkPendingOrders = useCallback((orderBook: OrderBook) => {
        setState(prev => {
            let currentState = { ...prev };
            const updatedPendingOrders: PendingOrder[] = [];
            let hasChanges = false;

            for (const originalPendingOrder of currentState.pendingOrders) {
                // Create a mutable copy of the pending order
                const pendingOrder = { ...originalPendingOrder };
                const { side, limitPrice, orderId } = pendingOrder;
                let matched = false;

                if (side === 'buy') {
                    // Buy limit: match if ask price <= limit price
                    const matchingAsks = orderBook.asks
                        .map(a => ({ price: parseFloat(a.price), size: parseInt(a.size) }))
                        .filter(a => a.price <= limitPrice && a.size > 0)
                        .sort((a, b) => a.price - b.price);

                    for (const match of matchingAsks) {
                        if (pendingOrder.remainingQuantity <= 0) break;

                        const fillQuantity = Math.min(pendingOrder.remainingQuantity, match.size);
                        const commission = calculateCommission(fillQuantity * match.price);

                        const { newState, orderPnl } = processFill(
                            side,
                            fillQuantity,
                            match.price,
                            commission,
                            orderId,
                            currentState
                        );

                        const newOrder: OrderRecord = {
                            orderId: `${orderId}-F${Date.now()}`,
                            timestamp: Date.now(),
                            symbol: 'NATLEE',
                            side,
                            quantity: fillQuantity,
                            price: match.price,
                            total: fillQuantity * match.price,
                            commission,
                            status: 'filled',
                            pnl: orderPnl,
                        };

                        currentState = {
                            ...currentState,
                            holding: newState.holding !== undefined ? newState.holding : currentState.holding,
                            balance: newState.balance !== undefined ? newState.balance : currentState.balance,
                            realizedPnl: newState.realizedPnl !== undefined ? newState.realizedPnl : currentState.realizedPnl,
                            orderHistory: [newOrder, ...currentState.orderHistory],
                        };

                        pendingOrder.remainingQuantity -= fillQuantity;
                        matched = true;
                        hasChanges = true;
                    }
                } else {
                    // Sell limit: match if bid price >= limit price
                    const matchingBids = orderBook.bids
                        .map(b => ({ price: parseFloat(b.price), size: parseInt(b.size) }))
                        .filter(b => b.price >= limitPrice && b.size > 0)
                        .sort((a, b) => b.price - a.price);

                    for (const match of matchingBids) {
                        if (pendingOrder.remainingQuantity <= 0) break;

                        const fillQuantity = Math.min(pendingOrder.remainingQuantity, match.size);
                        const commission = calculateCommission(fillQuantity * match.price);

                        const { newState, orderPnl } = processFill(
                            side,
                            fillQuantity,
                            match.price,
                            commission,
                            orderId,
                            currentState
                        );

                        const newOrder: OrderRecord = {
                            orderId: `${orderId}-F${Date.now()}`,
                            timestamp: Date.now(),
                            symbol: 'NATLEE',
                            side,
                            quantity: fillQuantity,
                            price: match.price,
                            total: fillQuantity * match.price,
                            commission,
                            status: 'filled',
                            pnl: orderPnl,
                        };

                        currentState = {
                            ...currentState,
                            holding: newState.holding !== undefined ? newState.holding : currentState.holding,
                            balance: newState.balance !== undefined ? newState.balance : currentState.balance,
                            realizedPnl: newState.realizedPnl !== undefined ? newState.realizedPnl : currentState.realizedPnl,
                            orderHistory: [newOrder, ...currentState.orderHistory],
                        };

                        pendingOrder.remainingQuantity -= fillQuantity;
                        matched = true;
                        hasChanges = true;
                    }
                }

                if (pendingOrder.remainingQuantity > 0) {
                    pendingOrder.status = matched ? 'partial' : 'pending';
                    updatedPendingOrders.push(pendingOrder);
                } else if (matched) {
                    addLog(`[${orderId}] 限價單已成交`, 'success');
                    hasChanges = true;
                }
            }

            // Only return new state if there were changes
            if (!hasChanges) {
                return prev;
            }

            return {
                ...currentState,
                pendingOrders: updatedPendingOrders,
            };
        });
    }, [addLog, processFill]);

    // Cancel pending order
    const cancelPendingOrder = useCallback((orderId: string) => {
        setState(prev => ({
            ...prev,
            pendingOrders: prev.pendingOrders.filter(o => o.orderId !== orderId),
        }));
        addLog(`[${orderId}] 掛單已取消`, 'warning');
    }, [addLog]);

    // Start AI scan
    const startScan = useCallback(() => {
        if (state.aiState === 'scanning') return;

        setState(prev => ({ ...prev, aiState: 'scanning', aiRecommendation: null }));
        addLog(t.logInit, 'info');

        setTimeout(() => addLog(t.logMap, 'info'), 800);
        setTimeout(() => addLog(t.logCalc, 'info'), 1600);

        setTimeout(() => {
            const trend = organicTrendRef.current;
            const regime = state.regime;

            let recommendation: AIRecommendation = null;
            let logMsg = '';
            let confidence = 60 + Math.random() * 30;

            if (trend > 0.1 || regime === 'BULL') {
                recommendation = 'LONG';
                logMsg = trend > 0.5 ? t.aiStrongMom : t.aiTrendFollow;
            } else if (trend < -0.1 || regime === 'BEAR') {
                recommendation = 'SHORT';
                logMsg = trend < -0.5 ? t.aiBearStruct : t.aiWeakness;
            } else {
                recommendation = Math.random() > 0.5 ? 'LONG' : 'SHORT';
                logMsg = t.aiScalp;
                confidence = 55;
            }

            setState(prev => ({
                ...prev,
                aiState: 'analyzed',
                aiRecommendation: recommendation,
            }));

            if (recommendation) {
                addLog(`>> ${t.logSignal}: ${logMsg} (${confidence.toFixed(1)}% CONF)`, 'success');
            } else {
                addLog(t.aiMarketUnclear, 'warning');
            }
        }, 2200);
    }, [state.aiState, state.regime, addLog, t]);

    // Reset system
    const reset = useCallback(() => {
        historyRef.current = [];
        currentCandleRef.current = null;
        basePriceRef.current = CONFIG.BASE_PRICE;
        organicTrendRef.current = 0;
        orderCountRef.current = 0;

        setState({
            candles: [],
            currentCandle: null,
            currentPrice: CONFIG.BASE_PRICE,
            regime: 'CHOP',
            sentiment: 50,
            scenario: null,
            balance: CONFIG.INITIAL_BALANCE,
            holding: null,
            orderHistory: [],
            pendingOrders: [],
            realizedPnl: 0,
            aiState: 'idle',
            aiRecommendation: null,
            logs: [{ id: generateId(), text: t.logReset, type: 'warning', time: getTimeString(), timestamp: Date.now() }],
            orderBook: { asks: [], bids: [] },
        });
    }, [t]);

    // Calculate total P&L (realized + unrealized)
    const totalUnrealizedPnl = state.holding?.unrealizedPnl || 0;
    const totalPnl = state.realizedPnl + totalUnrealizedPnl;

    return {
        ...state,
        totalUnrealizedPnl,
        pnl: totalPnl,
        submitOrder,
        checkPendingOrders,
        cancelPendingOrder,
        startScan,
        reset,
        addLog,
    };
}
