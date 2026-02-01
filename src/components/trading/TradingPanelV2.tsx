'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Activity, Globe, RefreshCw, Eye, EyeOff, Layers, Zap,
    BookOpen, Palette, Bot, Settings, TrendingUp, TrendingDown, Minus,
    X, MinusCircle, PlusCircle, CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { Language, TRANSLATIONS, CONFIG } from '@/constants';
import { useMarketSimulator, MarketState } from '@/hooks/useMarketSimulator';
import { MarketScenario, HoldingLot } from '@/lib/matching';
import { CandleData, OrderType, OrderCondition, Holding, OrderRecord, LogEntry, AIState, AIRecommendation, PendingOrder } from '@/types';
import { Trade } from '@/lib/matching';
import { CandlestickChart } from '@/components/chart';
import { OrderBook, SupplyDemandChart } from './orderbook';
import { OrderForm } from './order';
import { OrderHistoryPanel, MarketTradesPanel } from './records';
import { HoldingsPanel } from './holdings';
import { PendingOrdersPanel } from './orders';
import { AITerminal, AIScanner } from '@/components/ai';
import { generateId, getTimeString, calculateCommission } from '@/lib';

// Speed options removed as requested
// Default tick interval: 100ms

// Scenario options
const SCENARIO_OPTIONS: { label: string; value: MarketScenario; icon: React.ReactNode }[] = [
    { label: '牛市', value: 'bull', icon: <TrendingUp size={14} className="text-emerald-400" /> },
    { label: '熊市', value: 'bear', icon: <TrendingDown size={14} className="text-rose-400" /> },
    { label: '盤整', value: 'sideways', icon: <Minus size={14} className="text-zinc-400" /> },
    { label: '高波動', value: 'volatile', icon: <Zap size={14} className="text-amber-400" /> },
    { label: '平靜', value: 'calm', icon: <Activity size={14} className="text-blue-400" /> },
];

/**
 * TradingPanel V2 - Uses new matching engine
 * This integrates the full order matching engine with bot-driven market simulation
 */
export function TradingPanelV2() {
    const [lang, setLang] = useState<Language>('zh');
    const t = TRANSLATIONS[lang];

    const [showMA, setShowMA] = useState(true);
    const [showVolume, setShowVolume] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [chartSize, setChartSize] = useState({ width: 800, height: 400 });
    // Speed state removed - fixed at 100ms
    const [timeframe, setTimeframe] = useState(60000); // Default 1m
    const [showSettings, setShowSettings] = useState(false);
    const [botVolume, setBotVolume] = useState(1); // 1 Unit = 1000 shares
    const [isOddLot, setIsOddLot] = useState(false);
    const [commissionRatePercent, setCommissionRatePercent] = useState(0.1425); // Default 0.1425%
    const [intensity, setIntensity] = useState(1.0);

    // Color theme (Asian: up=red, Western: up=green)
    const [isAsianTheme, setIsAsianTheme] = useState(true);

    // Market simulator - new matching engine powered
    const simConfig = useMemo(() => ({
        initialPrice: CONFIG.BASE_PRICE,
        tickInterval: 100, // Fixed reliable speed
        candlePeriod: timeframe,
        unitSize: botVolume * 1000,
        isOddLot,
        commissionRate: commissionRatePercent / 100, // Convert % to decimal
        enabled: true,
        intensity,
    }), [timeframe, botVolume, isOddLot, commissionRatePercent, intensity]);

    // Ref to hold the latest callback (prevents cycle)
    const onTradeRef = useRef<(trade: Trade) => void>(() => { });

    const {
        state: marketState,
        start,
        stop,
        submitOrder: submitMarketOrder,
        cancelOrder,
        setScenario,
        toggleBotOrderVisibility,
    } = useMarketSimulator(simConfig, { onTrade: (t) => onTradeRef.current(t) });



    // Local trading state (balance, holdings, orders)
    const [balance, setBalance] = useState<number>(CONFIG.INITIAL_BALANCE);
    const [holding, setHolding] = useState<Holding | null>(null);
    const [lots, setLots] = useState<HoldingLot[]>([]);
    const sellTargetRef = useCallback((lotId: string | null) => {
        // Simple mechanism to store the intended lot ID for the next sell
        // We can't easily use useRef here because we need it inside the callback
        // Better: store in a MutableRefObject
        _lotIdRef.current = lotId;
    }, []);
    const _lotIdRef = useState<{ current: string | null }>({ current: null })[0]; // Ref-like that persists

    const [orderHistory, setOrderHistory] = useState<OrderRecord[]>([]);
    const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
    const [realizedPnl, setRealizedPnl] = useState(0);

    // Update Holdings Aggregation automatically (Moved here to access 'lots')
    useEffect(() => {
        const totalQty = lots.reduce((sum, l) => sum + l.quantity, 0);
        // Cost basis includes pro-rata portion of the original commission paid for this quantity
        const totalCostBasis = lots.reduce((sum, l) => {
            const proRataCommission = (l.quantity / l.originalQuantity) * (l.commission || 0);
            return sum + (l.quantity * l.price) + proRataCommission;
        }, 0);

        const avgCost = totalQty > 0 ? totalCostBasis / totalQty : 0;

        if (totalQty > 0) {
            setHolding({
                symbol: 'NATLEE',
                quantity: totalQty,
                averageCost: avgCost,
                marketValue: totalQty * marketState.currentPrice,
                unrealizedPnl: (marketState.currentPrice * totalQty) - totalCostBasis,
                unrealizedPnlPercent: totalCostBasis > 0 ? ((marketState.currentPrice * totalQty - totalCostBasis) / totalCostBasis) * 100 : 0,
            });
        } else {
            setHolding(null);
        }
    }, [lots, marketState.currentPrice]);

    // AI state
    const [aiState, setAiState] = useState<AIState>('idle');
    const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation>(null);
    const [logs, setLogs] = useState<LogEntry[]>([
        { id: generateId(), text: t.logReady, type: 'info', time: getTimeString(), timestamp: Date.now() }
    ]);

    // Order form state
    const [orderQuantity, setOrderQuantity] = useState(0);

    // Add log helper
    const addLog = useCallback((text: string, type: LogEntry['type'] = 'info') => {
        setLogs(prev => [...prev.slice(-49), {
            id: generateId(),
            text,
            type,
            time: getTimeString(),
            timestamp: Date.now(),
        }]);
    }, []);

    // Handle order submission
    // Centralized Trade Handler (Async & Sync)
    const handleUserTrade = useCallback((trade: Trade) => {
        const isUserTaker = trade.takerSource === 'user';
        const userSide = isUserTaker ? trade.takerSide : (trade.takerSide === 'buy' ? 'sell' : 'buy');

        const price = trade.price;
        const quantity = trade.quantity;
        const total = price * quantity;

        // Commission only on BUY
        const commission = userSide === 'buy' ? calculateCommission(total, commissionRatePercent / 100) : 0;
        const netTotal = userSide === 'buy' ? (total + commission) : total;

        // Identify which order ID was mine
        const myOrderId = userSide === 'buy' ? trade.buyOrderId : trade.sellOrderId;

        // 1. Update Balance
        setBalance(prev => userSide === 'buy' ? prev - netTotal : prev + netTotal);

        // Synchronized state update for PnL calculation
        let tradePnl: number | undefined = undefined;

        // 2. Update Lots (and calculate Realized PnL)
        let nextLots = [...lots];

        if (userSide === 'buy') {
            const newLot: HoldingLot = {
                id: 'LOT-' + generateId(),
                tradeId: trade.tradeId,
                timestamp: trade.timestamp,
                price: price,
                quantity: quantity,
                originalQuantity: quantity,
                commission: commission, // Store buy commission
            };
            nextLots.push(newLot);
        } else {
            // Sell Logic - Calculate accurate net PnL
            let remainingToSell = quantity;
            let realizedPnlDelta = 0;

            // Targeted Lot Sell?
            if (_lotIdRef.current) {
                const targetIdx = nextLots.findIndex(l => l.id === _lotIdRef.current);
                if (targetIdx !== -1) {
                    const lot = nextLots[targetIdx];
                    const sellQty = Math.min(lot.quantity, remainingToSell);

                    // Calculate pro-rated buy commission for this portion
                    const buyCommProRata = (sellQty / lot.originalQuantity) * lot.commission;

                    // PnL = (Sell - Buy) * Qty - Pro-rated Buy Commission
                    realizedPnlDelta += (price - lot.price) * sellQty - buyCommProRata;

                    lot.quantity -= sellQty;
                    remainingToSell -= sellQty;
                }
                _lotIdRef.current = null;
            }

            // FIFO for remaining
            if (remainingToSell > 0) {
                for (let i = 0; i < nextLots.length; i++) {
                    const lot = nextLots[i];
                    if (remainingToSell <= 0) break;
                    if (lot.quantity <= 0) continue;

                    const sellQty = Math.min(lot.quantity, remainingToSell);
                    const buyCommProRata = (sellQty / lot.originalQuantity) * (lot.commission || 0);

                    realizedPnlDelta += (price - lot.price) * sellQty - buyCommProRata;

                    lot.quantity -= sellQty;
                    remainingToSell -= sellQty;
                }
            }

            tradePnl = realizedPnlDelta;
            setRealizedPnl(p => p + realizedPnlDelta);
        }

        // 2. Update Lots (filtered)
        setLots(nextLots.filter(l => l.quantity > 0));

        // 3. Update Pending Orders
        setPendingOrders(prev => {
            return prev.map(o => {
                if (o.orderId === myOrderId) {
                    const newRem = o.remainingQuantity - quantity;
                    if (newRem <= 0.0001) return null; // Fully filled
                    return { ...o, remainingQuantity: newRem };
                }
                return o;
            }).filter(Boolean) as PendingOrder[];
        });

        // 4. Log & History
        // Use the captured tradePnl if available
        const pnlText = tradePnl !== undefined ? tradePnl.toFixed(2) : '0.00';
        addLog(
            userSide === 'buy'
                ? `買入成交 ${quantity}股 @ $${price.toFixed(2)}`
                : `賣出成交 ${quantity}股 @ $${price.toFixed(2)} | 淨盈虧: ${tradePnl && tradePnl >= 0 ? '+' : ''}${pnlText}`,
            userSide === 'buy' || (tradePnl !== undefined && tradePnl >= 0) ? 'success' : 'warning'
        );

        setOrderHistory(prev => [{
            orderId: myOrderId,
            tradeId: trade.tradeId,
            timestamp: trade.timestamp,
            symbol: 'NATLEE',
            side: userSide,
            quantity: quantity,
            price: price,
            total: total,
            commission: commission,
            status: 'filled' as const,
            pnl: tradePnl // Net Realized PnL (Sell Price - Buy Price - Both Commissions)
        }, ...prev].slice(0, 50));

    }, [commissionRatePercent, addLog, _lotIdRef, lots]);

    // Link Ref to the Callback
    useEffect(() => {
        onTradeRef.current = handleUserTrade;
    }, [handleUserTrade]);

    const handleSubmitOrder = useCallback((
        side: 'buy' | 'sell',
        quantity: number,
        price: number,
        leverage: number,
        type: OrderType,
        condition: OrderCondition
    ) => {
        if (quantity <= 0) {
            addLog('數量必須大於0', 'error');
            return;
        }

        const result = submitMarketOrder(
            side,
            type === 'market' ? 'market' : 'limit',
            quantity,
            type === 'limit' ? price : null,
            condition
        );

        if (!result) {
            addLog('下單失敗：引擎未就緒', 'error');
            return;
        }

        if (result.status === 'filled') {
            // Handled by onUserTrade
        } else if (result.status === 'partial') {
            // Partial Fill
            if (result.remainingQuantity > 0) {
                const pendingOrder: PendingOrder = {
                    orderId: result.orderId,
                    timestamp: Date.now(),
                    side,
                    quantity: result.remainingQuantity,
                    remainingQuantity: result.remainingQuantity,
                    limitPrice: price,
                    leverage,
                    status: 'pending',
                };
                setPendingOrders(prev => [...prev, pendingOrder]);
                addLog(`部分成交，剩餘 ${result.remainingQuantity}股 掛單中`, 'info');
            }
        } else if (result.status === 'pending') {
            // Add to pending orders
            const pendingOrder: PendingOrder = {
                orderId: result.orderId,
                timestamp: Date.now(),
                side,
                quantity,
                remainingQuantity: quantity,
                limitPrice: price,
                leverage,
                status: 'pending',
            };
            setPendingOrders(prev => [...prev, pendingOrder]);
            addLog(`限價單已掛出: ${side === 'buy' ? '買' : '賣'} ${quantity}股 @ $${price.toFixed(2)}`, 'info');
        } else if (result.status === 'cancelled') {
            addLog(`訂單已取消 (FOK/IOC 條件未滿足)`, 'warning');
        }

        setOrderQuantity(0);
    }, [submitMarketOrder, balance, lots, marketState.currentPrice, addLog]); // Added lots to dependency

    // Cancel pending order
    const handleCancelOrder = useCallback((orderId: string) => {
        cancelOrder(orderId);
        setPendingOrders(prev => prev.filter(o => o.orderId !== orderId));
        addLog(`訂單已取消: ${orderId}`, 'info');
    }, [cancelOrder, addLog]);

    // Handle Sell Specific Lot
    const handleSellLot = useCallback((lotId: string) => {
        // Find lot
        const lot = lots.find(l => l.id === lotId);
        if (!lot) return;

        // Set target
        _lotIdRef.current = lotId;

        // Execute Sell (Market Order)
        handleSubmitOrder('sell', lot.quantity, marketState.currentPrice, 1, 'market', 'GTC');
    }, [lots, marketState.currentPrice, handleSubmitOrder, _lotIdRef]);

    // Handle reset
    // Reset logic removed

    // AI Scanner
    const startScan = useCallback(() => {
        setAiState('scanning');
        addLog('AI 分析中...', 'info');

        setTimeout(() => {
            const scenario = marketState.scenario;
            let recommendation: typeof aiRecommendation = null;

            if (scenario === 'bull') {
                recommendation = 'LONG';
                addLog('AI 建議：多頭趨勢，建議買入', 'success');
            } else if (scenario === 'bear') {
                recommendation = 'SHORT';
                addLog('AI 建議：空頭趨勢，建議賣出', 'warning');
            } else {
                addLog('AI 分析：市場震盪，建議觀望', 'info');
            }

            setAiRecommendation(recommendation);
            setAiState('analyzed');
        }, 2000);
    }, [marketState.scenario, addLog]);

    // Chart Container Resize Observer
    const chartContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const updateHeight = () => {
            const mobile = window.innerWidth < 640;
            setIsMobile(mobile);
            setChartSize(prev => ({
                ...prev,
                height: mobile ? 280 : 400
            }));
        };

        updateHeight();
        window.addEventListener('resize', updateHeight);

        // ResizeObserver for Width
        if (!chartContainerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                if (width > 0) {
                    setChartSize(prev => ({ ...prev, width }));
                }
            }
        });

        observer.observe(chartContainerRef.current);

        return () => {
            window.removeEventListener('resize', updateHeight);
            observer.disconnect();
        };
    }, []);

    // Color helpers based on theme
    const getTextColor = (isPositive: boolean) => {
        if (isAsianTheme) {
            return isPositive ? 'text-rose-500' : 'text-emerald-500';
        }
        return isPositive ? 'text-emerald-500' : 'text-rose-500';
    };

    // Calculate total equity
    const holdingMarketValue = holding ? Math.abs(holding.quantity) * marketState.currentPrice : 0;
    const totalEquity = balance + holdingMarketValue;
    const unrealizedPnl = holding
        ? (holding.quantity > 0
            ? holding.quantity * (marketState.currentPrice - holding.averageCost)
            : Math.abs(holding.quantity) * (holding.averageCost - marketState.currentPrice))
        : 0;

    // Convert order book for display
    const displayOrderBook = {
        asks: marketState.orderBook.asks.map(level => ({
            price: level.price.toFixed(2),
            size: level.quantity.toString(),
            bg: `rgba(244, 63, 94, ${0.1 + (0.02 * Math.min(level.quantity / 100, 1))})`,
        })),
        bids: marketState.orderBook.bids.map(level => ({
            price: level.price.toFixed(2),
            size: level.quantity.toString(),
            bg: `rgba(16, 185, 129, ${0.1 + (0.02 * Math.min(level.quantity / 100, 1))})`,
        })),
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 bg-zinc-950 font-sans text-zinc-300 select-none">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-zinc-800 pb-3 gap-3 sm:gap-0">
                <div className="flex items-center gap-2 sm:gap-3">
                    <Activity className="text-indigo-500" size={18} />
                    <span className="text-base sm:text-lg font-bold text-white tracking-wide font-mono">{t.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        V2 撮合引擎
                    </span>
                </div>
                <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex gap-2 sm:gap-4 text-[10px] sm:text-xs font-mono">
                        <div className="flex flex-col items-end">
                            <span className="text-zinc-500 hidden sm:inline">{t.equity}</span>
                            <span className="text-white font-bold">${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-zinc-500 hidden sm:inline">未實現</span>
                            <span className={`${getTextColor(unrealizedPnl >= 0)} font-bold`}>
                                {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-zinc-500 hidden sm:inline">{t.pnl}</span>
                            <span className={`${getTextColor(realizedPnl >= 0)} font-bold`}>
                                {realizedPnl >= 0 ? '+' : ''}{realizedPnl.toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <div className="h-6 w-px bg-zinc-800 hidden sm:block"></div>
                    <div className="flex items-center gap-2">
                        {/* Bot visibility toggle */}

                        {/* Scenario selector */}
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-2 rounded-full border transition-all ${showSettings
                                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                                }`}
                            title="設定"
                        >
                            <Settings size={14} />
                        </button>
                        {/* Color Theme Toggle */}
                        <button
                            onClick={() => setIsAsianTheme(!isAsianTheme)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${isAsianTheme
                                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                }`}
                            title={isAsianTheme ? '漲紅跌綠 (台股)' : '漲綠跌紅 (美股)'}
                        >
                            <Palette size={14} />
                            <span className="text-xs font-bold">{isAsianTheme ? '台股配色' : '美股配色'}</span>
                        </button>
                        {/* Learning Center Link */}
                        <Link
                            href="/learn"
                            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/50 hover:bg-indigo-500/30 text-xs font-bold transition-all text-indigo-400"
                        >
                            <BookOpen size={14} />
                            <span className="hidden sm:inline">學習</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Settings Panel (collapsible) */}
            {showSettings && (
                <div className="mb-6 p-6 bg-zinc-900 border border-zinc-800 rounded-lg relative shadow-2xl overflow-hidden group">
                    <button
                        onClick={() => setShowSettings(false)}
                        className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors p-1 rounded-full hover:bg-zinc-800"
                    >
                        <X size={18} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Scenario */}
                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">市場情境</label>
                                <p className="text-[10px] text-zinc-500 leading-relaxed">調整市場趨勢（如多頭、空頭或盤整），影響機器人的交易偏好。</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {SCENARIO_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setScenario(opt.value)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${marketState.scenario === opt.value
                                            ? 'bg-indigo-500/30 border border-indigo-500/50 text-indigo-300'
                                            : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                            }`}
                                    >
                                        {opt.icon}
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bot Volume & Odd Lot */}
                        <div className="space-y-6">
                            {/* Bot Volume */}
                            <div className="space-y-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">每筆交易規模 (單位: 張/Unit)</label>
                                    <p className="text-[10px] text-zinc-500 leading-relaxed">機器人每次掛單或成交的基本量，數值越大市場深度越厚。</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        className="text-zinc-500 hover:text-rose-400 transition-colors"
                                        onClick={() => setBotVolume(prev => Math.max(1, prev - 1))}
                                    >
                                        <MinusCircle size={20} />
                                    </button>
                                    <div className="text-center w-20 bg-zinc-800 rounded-lg border border-zinc-700 py-1.5 text-sm font-mono text-white font-bold">
                                        {botVolume}
                                    </div>
                                    <button
                                        className="text-zinc-500 hover:text-emerald-400 transition-colors"
                                        onClick={() => setBotVolume(prev => prev + 1)}
                                    >
                                        <PlusCircle size={20} />
                                    </button>
                                    <span className="text-xs text-zinc-500 font-mono">= {(botVolume * 1000).toLocaleString()} 股</span>
                                </div>
                            </div>

                            {/* Odd Lot Toggle */}
                            <div className="space-y-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">零股交易模式</label>
                                    <p className="text-[10px] text-zinc-500 leading-relaxed">切換整股（1000股）或零股（1股）交易邏輯，影響委託下單的最小單位。</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsOddLot(!isOddLot)}
                                        className={`w-11 h-6 rounded-full relative transition-colors border border-zinc-700 ${isOddLot ? 'bg-indigo-500/80 border-indigo-500' : 'bg-zinc-800'}`}
                                    >
                                        <div className={`absolute top-1 w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm ${isOddLot ? 'left-6' : 'left-1'}`} />
                                    </button>
                                    <span className="text-xs text-zinc-500 font-sans">
                                        {isOddLot ? '開啟 (每次 +/- 1 股)' : '關閉 (每次 +/- 1000 股)'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Commission Setting */}
                        <div className="space-y-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">交易手續費 (%)</label>
                                <p className="text-[10px] text-zinc-500 leading-relaxed">僅在買入時收取的費用比例，影響持倉成本與最終淨損益。</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    value={commissionRatePercent}
                                    onChange={(e) => setCommissionRatePercent(Math.max(0, parseFloat(e.target.value) || 0))}
                                    className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm w-24 text-white font-mono focus:outline-none focus:border-indigo-500"
                                />
                                <span className="text-xs text-zinc-500 font-mono">% (預設 0.1425%)</span>
                            </div>
                        </div>

                        {/* Market Intensity */}
                        <div className="md:col-span-2 pt-6 border-t border-zinc-800/50">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">市場熱絡度 (Market Intensity)</label>
                                    <p className="text-[10px] text-zinc-500 leading-relaxed max-w-xl">控制機器人的下單頻率。高熱絡度會導致委託簿快速變動與頻繁成交，產生「上沖下洗」的劇烈震盪感。</p>
                                </div>
                                <span className={`text-xs font-mono font-bold px-3 py-1 rounded shadow-sm ${intensity >= 2.0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                    intensity >= 1.0 ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                                        'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                    }`}>
                                    {intensity.toFixed(1)}x {intensity >= 4.0 ? '極限' : intensity >= 2.0 ? '熱絡' : intensity >= 1.0 ? '正常' : '冷清'}
                                </span>
                            </div>
                            <div className="px-1">
                                <input
                                    type="range"
                                    min="0.1"
                                    max="5.0"
                                    step="0.1"
                                    value={intensity}
                                    onChange={(e) => setIntensity(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <div className="flex justify-between mt-2 text-[10px] text-zinc-600 font-mono tracking-tighter">
                                    <span>0.1 (冷清)</span>
                                    <span>1.0 (正常)</span>
                                    <span>2.5 (熱絡)</span>
                                    <span>5.0 (極限)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Left Area - Chart + AI Terminal + Trade Records */}
                <div className="lg:col-span-3 flex flex-col gap-3 h-full">

                    {/* Chart Header & Controls (Moved outside Chart) */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 px-1">
                        {/* Pair Info */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold text-white tracking-wider">NAT/USD</span>
                                <span className={`text-lg font-mono font-bold ${getTextColor(marketState.tickChange >= 0)}`}>
                                    ${marketState.currentPrice.toFixed(2)}
                                </span>
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded ${marketState.tickChange >= 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                <span>{marketState.tickChange >= 0 ? '+' : ''}{marketState.tickChange.toFixed(2)}</span>
                                <span>({marketState.tickChangePercent >= 0 ? '+' : ''}{marketState.tickChangePercent.toFixed(2)}%)</span>
                            </div>
                        </div>

                        {/* Timeframe Selector */}
                        <div className="flex bg-zinc-900 rounded p-1 border border-zinc-800">
                            {[
                                { label: '15秒', value: 15000 },
                                { label: '1分', value: 60000 },
                                { label: '5分', value: 300000 },
                                { label: '30分', value: 1800000 }
                            ].map(tf => (
                                <button
                                    key={tf.value}
                                    onClick={() => setTimeframe(tf.value)}
                                    className={`px-3 py-1 rounded text-xs font-mono transition-all ${timeframe === tf.value
                                        ? 'bg-indigo-500 text-white shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Candlestick Chart */}
                    <div
                        ref={chartContainerRef}
                        className="bg-zinc-900 border border-zinc-800 rounded-sm relative w-full overflow-hidden"
                        style={{ height: chartSize.height }}
                    >
                        <CandlestickChart
                            candles={marketState.candles as CandleData[]}
                            currentPrice={marketState.currentPrice}
                            width={chartSize.width}
                            height={chartSize.height}
                            showMA={showMA}
                            showVolume={showVolume}
                            isAsianTheme={isAsianTheme}
                        />
                    </div>

                    {/* AI Terminal */}
                    <AITerminal
                        logs={logs}
                        isScanning={aiState === 'scanning'}
                        title="系統記錄"
                        processingLabel={t.processing}
                    />

                    {/* Pending Orders Panel */}
                    <PendingOrdersPanel
                        pendingOrders={pendingOrders}
                        onCancelOrder={handleCancelOrder}
                        isAsianTheme={isAsianTheme}
                    />

                    {/* Holdings Panel */}
                    <HoldingsPanel
                        holding={holding}
                        lots={lots}
                        currentPrice={marketState.currentPrice}
                        isAsianTheme={isAsianTheme}
                        onSellLot={handleSellLot}
                    />

                    {/* Order History */}
                    <OrderHistoryPanel
                        orders={orderHistory}
                        translations={{
                            title: t.tradeRecords,
                            viewAll: t.viewAll,
                            time: t.time,
                            type: t.type,
                            qty: t.qty,
                            entryPrice: t.entryPrice,
                            pnlLabel: t.pnlLabel,
                        }}
                        isAsianTheme={isAsianTheme}
                    />

                    {/* Market Trades (Time & Sales) */}
                    <MarketTradesPanel
                        trades={marketState.recentTrades}
                        candles={marketState.candles as CandleData[]}
                        isAsianTheme={isAsianTheme}
                    />
                </div>

                {/* Right Controls */}
                <div className="lg:col-span-1 flex flex-col gap-3 h-full">
                    {/* Indicator Toggles */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowMA(!showMA)}
                            className={`flex-1 px-2.5 py-2 rounded text-[10px] sm:text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${showMA
                                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-600'
                                }`}
                        >
                            {showMA ? <Eye size={14} /> : <EyeOff size={14} />}
                            <span className="whitespace-nowrap">{t.ma}</span>
                        </button>
                        <button
                            onClick={() => setShowVolume(!showVolume)}
                            className={`flex-1 px-2.5 py-2 rounded text-[10px] sm:text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${showVolume
                                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                                : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-600'
                                }`}
                        >
                            <Layers size={14} />
                            <span className="whitespace-nowrap">VOL</span>
                        </button>
                    </div>

                    {/* Order Book */}
                    <OrderBook
                        asks={displayOrderBook.asks}
                        bids={displayOrderBook.bids}
                        currentPrice={marketState.currentPrice.toFixed(2)}
                        priceLabel={t.price}
                        sizeLabel={lang === 'en' ? 'SIZE' : '量'}
                        isAsianTheme={isAsianTheme}
                        stats={{
                            high24h: marketState.high24h,
                            low24h: marketState.low24h,
                            volume24h: marketState.volume24h,
                            change24h: marketState.tickChange,
                            changePercent24h: marketState.tickChangePercent
                        }}
                    />

                    <SupplyDemandChart
                        orderBook={marketState.orderBook}
                        isAsianTheme={isAsianTheme}
                    />

                    {/* Trading Panel */}
                    <div className="flex-1 min-h-fit bg-zinc-900 border border-zinc-800 rounded-sm p-4 flex flex-col">
                        {/* AI Scanner */}
                        <AIScanner
                            state={aiState}
                            onStartScan={startScan}
                            disabled={false}
                            scanIdleLabel={t.scanIdle}
                            scanRunningLabel={t.scanRunning}
                        />

                        {/* Market Stats (Merged into OrderBook) */}
                        <div className="hidden"></div>

                        {/* Order Form */}
                        <OrderForm
                            currentPrice={marketState.currentPrice}
                            availableBalance={balance}
                            holding={holding}
                            aiRecommendation={aiRecommendation}
                            onSubmitOrder={handleSubmitOrder}
                            quantity={orderQuantity}
                            onQuantityChange={setOrderQuantity}
                            translations={{
                                orderType: t.orderType,
                                marketOrder: t.marketOrder,
                                limitOrder: t.limitOrder,
                                quantity: t.quantity,
                                shares: t.shares,
                                limitPrice: t.limitPrice,
                                useCurrentPrice: t.useCurrentPrice,
                                leverage: t.leverage,
                                orderPreview: t.orderPreview,
                                buy: t.buy,
                                sell: t.sell,
                            }}
                            isAsianTheme={isAsianTheme}
                            isOddLot={isOddLot}
                        />
                    </div>
                </div>
            </div>
        </div >
    );
}
