'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Activity, Eye, EyeOff, Layers, Zap,
    Palette, Settings, TrendingUp, TrendingDown, Minus,
    X, MinusCircle, PlusCircle, Info
} from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { Language, TRANSLATIONS, CONFIG } from '@/constants';
import { useMarketSimulator } from '@/hooks/useMarketSimulator';
import { MarketScenario, HoldingLot } from '@/lib/matching';
import { SCENARIO_MODIFIERS } from '@/lib/bots/types';
import { CandleData, OrderType, OrderCondition, Holding, OrderRecord, LogEntry, AIState, AIRecommendation, PendingOrder } from '@/types';
import { Trade } from '@/lib/matching';
import { CandlestickChart } from '@/components/chart';
import { OrderBook, SupplyDemandChart } from './orderbook';
import { OrderForm } from './order';
import { OrderHistoryPanel, MarketTradesPanel } from './records';
import { HoldingsPanel } from './holdings';
import { PendingOrdersPanel } from './orders';
import { AITerminal, AIAnalysisPanel } from '@/components/ai';
import { generateId, getTimeString, calculateCommission, calculateTransactionTax, performAIAnalysis } from '@/lib';
import { AIDetailedAnalysis } from '@/types';

// Speed options removed as requested
// Default tick interval: 100ms

// Scenario options - Taiwan stock market patterns
const SCENARIO_OPTIONS: { label: string; value: MarketScenario; icon: React.ReactNode }[] = [
    { label: '強勢多頭', value: 'bull', icon: <TrendingUp size={14} className="text-emerald-400" /> },
    { label: '弱勢空頭', value: 'bear', icon: <TrendingDown size={14} className="text-rose-400" /> },
    { label: '盤整', value: 'sideways', icon: <Minus size={14} className="text-zinc-400" /> },
    { label: '劇烈震盪', value: 'volatile', icon: <Zap size={14} className="text-amber-400" /> },
    { label: '冷清', value: 'calm', icon: <Activity size={14} className="text-blue-400" /> },
    { label: '盤整突破', value: 'breakout', icon: <TrendingUp size={14} className="text-cyan-400" /> },
    { label: '恐慌崩盤', value: 'crash', icon: <TrendingDown size={14} className="text-red-600" /> },
    { label: '主力吸籌', value: 'accumulation', icon: <Activity size={14} className="text-green-400" /> },
    { label: '主力出貨', value: 'distribution', icon: <Activity size={14} className="text-orange-400" /> },
    { label: '拉高出貨', value: 'pump_dump', icon: <TrendingUp size={14} className="text-red-500" /> },
    { label: '死貓反彈', value: 'dead_cat', icon: <Activity size={14} className="text-orange-500" /> },
    { label: '盤整待變', value: 'squeeze', icon: <MinusCircle size={14} className="text-zinc-500" /> },
];

/**
 * Get simple SVG path for scenario preview
 */
const getScenarioPreviewPath = (scenario: MarketScenario) => {
    switch (scenario) {
        case 'bull': return "M 5 95 C 30 80, 60 40, 95 5";
        case 'bear': return "M 5 5 C 30 20, 60 60, 95 95";
        case 'sideways': return "M 5 50 Q 25 30, 50 50 T 95 50";
        case 'volatile': return "M 5 50 L 20 20 L 35 80 L 50 10 L 65 90 L 80 30 L 95 50";
        case 'calm': return "M 5 50 L 95 50";
        case 'breakout': return "M 5 80 L 50 70 L 60 20 L 95 10";
        case 'crash': return "M 5 10 L 30 20 L 40 90 L 95 95";
        case 'accumulation': return "M 5 80 Q 25 70, 50 80 T 95 20";
        case 'distribution': return "M 5 20 Q 25 30, 50 20 T 95 80";
        case 'pump_dump': return "M 5 80 L 30 10 L 50 20 L 70 90 L 95 95";
        case 'dead_cat': return "M 5 10 L 30 90 L 50 60 L 70 95 L 95 100";
        case 'squeeze': return "M 5 50 L 20 45 L 40 55 L 60 48 L 80 52 L 95 50";
        default: return "M 5 50 L 95 50";
    }
};

/**
 * Scenario Explanations & Stats
 */
const SCENARIO_DETAILS: Record<MarketScenario, { desc: string; vol: number; liq: number }> = {
    bull: { desc: "市場情緒樂觀，買盤強勁，價格呈現多頭排列。", vol: 3, liq: 4 },
    bear: { desc: "市場情緒悲觀，賣壓沉重，價格持續探底。", vol: 3, liq: 3 },
    sideways: { desc: "市場缺乏明確方向，價格在區間內來回波動，流動性充足。", vol: 2, liq: 5 },
    volatile: { desc: "多空交戰激烈，價格上下沖洗，風險極高。", vol: 5, liq: 2 },
    calm: { desc: "交易清淡，價格波動極小，市場觀望氣氛濃厚。", vol: 1, liq: 1 },
    breakout: { desc: "價格突破關鍵壓力位，伴隨大量買盤，趨勢可能反轉。", vol: 4, liq: 3 },
    crash: { desc: "恐慌性拋售，價格直線崩落，流動性瞬間枯竭。", vol: 5, liq: 1 },
    accumulation: { desc: "主力在低檔悄悄吸納籌碼，價格波動被刻意壓低。", vol: 2, liq: 4 },
    distribution: { desc: "主力在高檔掩護出貨，價格看似強勢實則虛浮。", vol: 2, liq: 4 },
    pump_dump: { desc: "人為極速拉抬股價，隨後將出現垂直崩盤。", vol: 5, liq: 3 },
    dead_cat: { desc: "崩盤後的技術性反彈，幅度有限，通常是逃命波。", vol: 4, liq: 2 },
    squeeze: { desc: "成交量窒息，波幅壓縮至極限，即將出現大行情。", vol: 1, liq: 2 },
};

/**
 * Scenario Lifecycle Config (Transient Scenarios)
 */
const SCENARIO_LIFECYCLE: Partial<Record<MarketScenario, { duration: number; next: MarketScenario; label: string }>> = {
    pump_dump: { duration: 15000, next: 'crash', label: '拉高結束 -> 殺盤開始' },
    crash: { duration: 20000, next: 'dead_cat', label: '恐慌結束 -> 死貓反彈' },
    breakout: { duration: 25000, next: 'bull', label: '突破確立 -> 轉為多頭' },
    squeeze: { duration: 30000, next: 'breakout', label: '盤整結束 -> 向上突破' },
};

/**
 * TradingPanel V2 - Uses new matching engine
 * This integrates the full order matching engine with bot-driven market simulation
 */
export function TradingPanelV2() {
    const [lang] = useState<Language>('zh');
    const t = TRANSLATIONS[lang];

    const [showMA, setShowMA] = useState(true);
    const [showVolume, setShowVolume] = useState(true);
    const [chartSize, setChartSize] = useState({ width: 800, height: 400 });
    // Speed state removed - fixed at 100ms
    const [timeframe, setTimeframe] = useState(60000); // Default 1m
    // Configuration State
    const [balance, setBalance] = useState(1000000);
    const [lots, setLots] = useState<HoldingLot[]>([]);
    const [holding, setHolding] = useState<Holding | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [botVolume, setBotVolume] = useState(1); // 1 Unit = 1000 shares
    const [isOddLot, setIsOddLot] = useState(false);
    const [commissionRatePercent, setCommissionRatePercent] = useState(0.1425);
    const [minCommissionFee, setMinCommissionFee] = useState(20);
    // Tax Rates (Sell Only)
    const [taxRatePercent, setTaxRatePercent] = useState(0.3);
    const [dayTradeTaxRatePercent, setDayTradeTaxRatePercent] = useState(0.15);
    const [intensity, setIntensity] = useState(1.0);
    const [showScenarioInfo, setShowScenarioInfo] = useState(false);
    const [showIntensityInfo, setShowIntensityInfo] = useState(false);
    const [showBotInfo, setShowBotInfo] = useState(false);
    const [showFeeInfo, setShowFeeInfo] = useState(false);

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
        submitOrder: submitMarketOrder,
        cancelOrder,
        setScenario,
    } = useMarketSimulator(simConfig, { onTrade: (t) => onTradeRef.current(t) });





    // Local trading state (balance, holdings, orders)
    // const [balance, setBalance] = useState<number>(CONFIG.INITIAL_BALANCE); // Moved
    // const [holding, setHolding] = useState<Holding | null>(null); // Moved
    // const [lots, setLots] = useState<HoldingLot[]>([]); // Moved
    const lotIdRef = useRef<string | null>(null);

    const [orderHistory, setOrderHistory] = useState<OrderRecord[]>([]);
    const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
    const [realizedPnl, setRealizedPnl] = useState(0);

    // Update Holdings Aggregation automatically (Moved here to access 'lots')
    useEffect(() => {
        // Calculate Net Quantity (Longs + Shorts)
        const netQty = lots.reduce((sum, l) => sum + (l.side === 'buy' ? l.quantity : -l.quantity), 0);
        const isLong = netQty >= 0;
        const absQty = Math.abs(netQty);

        // Calculate Cost Basis based on dominant side lots
        const dominantSide = isLong ? 'buy' : 'sell';
        const relevantLots = lots.filter(l => l.side === dominantSide);
        const relevantTotalQty = relevantLots.reduce((s, l) => s + l.quantity, 0);

        const totalCostBasis = relevantLots.reduce((sum, l) => {
            const proRataCommission = (l.quantity / l.originalQuantity) * (l.commission || 0);
            return sum + (l.quantity * l.price) + proRataCommission;
        }, 0);

        const avgCost = relevantTotalQty > 0 ? totalCostBasis / relevantTotalQty : 0;

        if (absQty > 0) {
            const marketValue = absQty * marketState.currentPrice;
            // PnL: Long = (Price - Cost), Short = (Cost - Price)
            const unrealizedPnl = isLong
                ? (marketState.currentPrice * absQty) - totalCostBasis
                : totalCostBasis - (marketState.currentPrice * absQty);

            setHolding({
                symbol: 'NATLEE',
                quantity: netQty,
                averageCost: avgCost,
                marketValue: marketValue,
                unrealizedPnl: unrealizedPnl,
                unrealizedPnlPercent: totalCostBasis > 0 ? (unrealizedPnl / totalCostBasis) * 100 : 0,
            });
        } else {
            setHolding(null);
        }
    }, [lots, marketState.currentPrice]);

    // AI state
    const [aiState, setAiState] = useState<AIState>('idle');
    const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation>(null);
    const [aiAnalysis, setAiAnalysis] = useState<AIDetailedAnalysis | null>(null);
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

    // Scenario Lifecycle Management
    const scenarioTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Clear existing timeout
        if (scenarioTimeoutRef.current) {
            clearTimeout(scenarioTimeoutRef.current);
            scenarioTimeoutRef.current = null;
        }

        const lifecycle = SCENARIO_LIFECYCLE[marketState.scenario];
        if (lifecycle) {
            scenarioTimeoutRef.current = setTimeout(() => {
                addLog(`[劇本切換] ${lifecycle.label}`, 'warning');
                setScenario(lifecycle.next);

                // If switching implies intensity change, update it too
                const modifier = SCENARIO_MODIFIERS[lifecycle.next];
                if (modifier?.intensity) setIntensity(modifier.intensity);

            }, lifecycle.duration);
        }

        return () => {
            if (scenarioTimeoutRef.current) {
                clearTimeout(scenarioTimeoutRef.current);
            }
        };
    }, [marketState.scenario, setScenario, addLog]);

    // Handle order submission
    // Centralized Trade Handler (Async & Sync)
    const handleUserTrade = useCallback((trade: Trade) => {
        const isUserTaker = trade.takerSource === 'user';
        const userSide = isUserTaker ? trade.takerSide : (trade.takerSide === 'buy' ? 'sell' : 'buy');

        const price = trade.price;
        const totalQty = trade.quantity;
        const total = price * totalQty;

        // --- FEE CALCULATION ---
        // 1. Commission (Both Buy and Sell): 0.1425%, Min 20
        // Note: Discount logic can be added here (e.g., * 0.6) if we add a setting for it.
        // For now, assuming standard full fee as per request base rule, or maybe hardcode a discount?
        // User example: "Buy 1000 shares @ 100... 142.5 * 0.6 = 85.5".
        // Let's stick to the base rate passed in `commissionRatePercent` but ensure Min $20 check.
        const rawCommission = calculateCommission(total, commissionRatePercent / 100, minCommissionFee);
        const commission = rawCommission;

        // 2. Transaction Tax (Sell Only): 0.3% (Normal) or 0.15% (Day Trade)
        let tax = 0;
        let isDayTrade = false;

        // Identify which order ID was mine
        const myOrderId = userSide === 'buy' ? trade.buyOrderId : trade.sellOrderId;

        // --- CORE LOGIC ---
        const nextLots = [...lots];

        // Determine Close Side
        const closeSide = userSide === 'buy' ? 'sell' : 'buy';
        let remainingQty = totalQty;
        let realizedPnlDelta = 0;
        let tradePnl: number | undefined = undefined; // For single trade reporting

        // Track Collateral Improvements
        let closedShortValue = 0; // Collateral returned from closing shorts
        let openedShortValue = 0; // Collateral locked for opening shorts

        // 1. Close Existing Positions (FIFO)
        for (let i = 0; i < nextLots.length; i++) {
            if (remainingQty <= 0) break;
            const lot = nextLots[i];

            if (lot.quantity > 0 && lot.side === closeSide) {
                // Targeted close?
                if (lotIdRef.current && lot.id !== lotIdRef.current) continue;

                // Day Trade Detection: Check if lot was opened on the same day (Locale Date String match)
                const lotDate = new Date(lot.timestamp).toDateString();
                const tradeDate = new Date(trade.timestamp).toDateString();
                if (lotDate === tradeDate) {
                    isDayTrade = true;
                }

                const closeQty = Math.min(lot.quantity, remainingQty);

                // PnL Calc
                const grossPnl = lot.side === 'buy'
                    ? (price - lot.price) * closeQty
                    : (lot.price - price) * closeQty;

                // Commission breakdown (Pro-rated entry commission)
                const entryComm = (closeQty / lot.originalQuantity) * lot.commission;
                // Exit Commission (Pro-rated for this portion of the trade)
                const exitComm = (closeQty / totalQty) * commission;

                // Tax (Pro-rated) - Only calculated if User is SELLING (Closing Buy) or BUYING (Closing Sell... wait, Tax is only on SELL actions)
                // Tax Rule: "Transaction Tax (Allocated on Sell)"
                // If userSide == 'sell' (Closing Buy), we pay tax.
                // If userSide == 'buy'  (Closing Sell), we DO NOT pay tax.

                // Wait! "Day trade tax halved" applies when you SELL.
                // If I am SELLING (closing a Long), I pay tax.
                // If I am BUYING (closing a Short), I do NOT pay tax.

                // BUT, wait... 
                // "Day Trading deduction": If I buy then sell same day -> Sell has lower tax.
                // If I Sell (Short) then Buy (Cover) same day -> Sell had tax. Does the Short Sell get lower tax retroactively?
                // Usually Day Trade Tax Reduction is applied on the SELL side.
                // If Short Selling: You Sell First. You pay tax. If you cover same day, do you get a refund? 
                // Taiwan rule: "Day Trading Tax" applies to the Sell leg.
                // If you Sell (Short) and match a Buy (Cover) later same day -> The original Sell should have been 0.15%.
                // But we already paid 0.3% when we opened the Short?
                // For simplicity in simulation:
                // - If Closing Long (User Sell): Check if Day Trade. If yes, 0.15%, else 0.3%.
                // - If Opening Short (User Sell): Always 0.3% initially? Or speculate? 
                //   Real broker: Charges 0.3% first, refunds diff next month or end of day.
                //   Sim: Let's simpler. If Opening Short, charge 0.3%. 

                // Let's handle Tax calculation outside loop for the whole trade first, then allocate PnL?
                // No, we need to know if it's a Day Trade to calculate the Tax rate for the whole Sell order?
                // Actually, an order can partially close old positions (0.3% or 0.15%) and partially open new shorts.
                // This is complex. 
                // Simplified approach: 
                // If User Sells:
                //   Calculate Tax based on "Is this a Day Trade?".
                //   It is a Day Trade if we are closing a position opened today.
                //   If we are closing multiple lots, some might be today, some yesterday.
                //   So Tax should be calculated per-lot closed?

                let portionTax = 0;
                if (userSide === 'sell') {
                    // We are selling. (Closing Long)
                    const isLotDayTrade = new Date(lot.timestamp).toDateString() === new Date(trade.timestamp).toDateString();
                    // Use configurable tax rates
                    const taxRate = isLotDayTrade ? (dayTradeTaxRatePercent / 100) : (taxRatePercent / 100);
                    portionTax = Math.floor(price * closeQty * taxRate);
                }

                // Accumulate Tax to total tax for this trade
                tax += portionTax;

                realizedPnlDelta += (grossPnl - entryComm - exitComm - portionTax);

                // Short Collateral Logic
                if (lot.side === 'sell') {
                    // Closing a Short.
                    // We are BUYING. No Tax on Buy.
                    closedShortValue += lot.price * closeQty;
                }

                lot.quantity -= closeQty;
                remainingQty -= closeQty;
            }
        }

        lotIdRef.current = null; // Reset target

        // 2. Open New Positions (if remaining)
        if (remainingQty > 0) {
            // We are opening a new position (Long or Short).
            // If User Sell (Short Open): Tax applies.
            // Since it's a new position, it's not a "Day Trade Close". But it IS the start of a potential day trade?
            // No, Tax is on Sell. If Shorting, you pay 0.3% (or 0.15% if you qualify as Day Trading dealer?).
            // Standard: Pay 0.3% (or user configured standard tax).
            if (userSide === 'sell') {
                const portionTax = Math.floor(price * remainingQty * (taxRatePercent / 100));
                tax += portionTax;
            }

            const newLot: HoldingLot = {
                id: 'LOT-' + generateId(),
                tradeId: trade.tradeId,
                timestamp: trade.timestamp,
                side: userSide,
                price: price,
                quantity: remainingQty,
                originalQuantity: remainingQty,
                commission: (remainingQty / totalQty) * commission
            };
            nextLots.push(newLot);

            if (userSide === 'sell') {
                openedShortValue += price * remainingQty;
            }
        }

        tradePnl = realizedPnlDelta;

        // 3. Balance Update
        // Base Flow: Sell = Inflow, Buy = Outflow
        let balanceDelta = userSide === 'sell' ? total : -total;

        // Deduct Fee & Tax
        balanceDelta -= commission;
        balanceDelta -= tax;

        // Apply Collateral
        const finalBalanceChange = balanceDelta + closedShortValue - openedShortValue;

        setBalance(prev => prev + finalBalanceChange);
        setRealizedPnl(p => p + realizedPnlDelta);
        setLots(nextLots.filter(l => l.quantity > 0));

        // 4. Update Pending Orders
        setPendingOrders(prev => {
            return prev.map(o => {
                if (o.orderId === myOrderId) {
                    const newRem = o.remainingQuantity - totalQty;
                    if (newRem <= 0.0001) return null; // Fully filled
                    return { ...o, remainingQuantity: newRem };
                }
                return o;
            }).filter(Boolean) as PendingOrder[];
        });

        // 5. Log & History
        const pnlText = Math.abs(tradePnl).toFixed(2);
        const pnlSign = tradePnl >= 0 ? '+' : '-';
        const logSide = userSide === 'buy' ? '買入' : '賣出';

        let logMsg = `${logSide} ${totalQty}股 @ $${price.toFixed(2)}`;
        // Append details
        if (Math.abs(tradePnl) > 0.001) {
            logMsg += ` | 損益: ${pnlSign}${pnlText}`;
        }
        // Show Fee/Tax
        logMsg += ` (費:${Math.floor(commission)} 稅:${Math.floor(tax)})`;

        addLog(logMsg, tradePnl >= 0 ? 'success' : 'warning');

        setOrderHistory(prev => [{
            orderId: myOrderId,
            tradeId: trade.tradeId,
            timestamp: trade.timestamp,
            symbol: 'NATLEE',
            side: userSide,
            quantity: totalQty,
            price: price,
            total: total,
            commission: commission,
            tax: tax,
            status: 'filled' as const,
            pnl: tradePnl // Net Realized One-Time PnL
        }, ...prev].slice(0, 50));

    }, [commissionRatePercent, minCommissionFee, taxRatePercent, dayTradeTaxRatePercent, addLog, lots]);

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
    }, [submitMarketOrder, addLog, setOrderQuantity, setPendingOrders]);

    // Cancel pending order
    const handleCancelOrder = useCallback((orderId: string) => {
        cancelOrder(orderId);
        setPendingOrders(prev => prev.filter(o => o.orderId !== orderId));
        addLog(`訂單已取消: ${orderId}`, 'info');
    }, [cancelOrder, addLog]);

    // Handle Sell/Close Specific Lot
    const handleSellLot = useCallback((lotId: string) => {
        // Find lot
        const lot = lots.find(l => l.id === lotId);
        if (!lot) return;

        // Set target
        lotIdRef.current = lotId;

        // Determine action: Buy closes Sell (Short), Sell closes Buy (Long)
        const closeAction = lot.side === 'buy' ? 'sell' : 'buy';

        // Execute Close Order (Market Order)
        handleSubmitOrder(closeAction, lot.quantity, marketState.currentPrice, 1, 'market', 'GTC');
    }, [lots, marketState.currentPrice, handleSubmitOrder]);

    // Handle reset
    // Reset logic removed

    // AI Scanner - Real market analysis
    const startScan = useCallback(() => {
        setAiState('scanning');
        addLog('AI 啟動市場分析...', 'info');

        // Simulate analysis time for UX
        setTimeout(() => {
            addLog('正在分析 K 線趨勢...', 'subtle');
        }, 300);

        setTimeout(() => {
            addLog('正在分析委託簿買賣壓...', 'subtle');
        }, 800);

        setTimeout(() => {
            addLog('正在計算動能指標...', 'subtle');
        }, 1300);

        setTimeout(() => {
            addLog('正在識別 K 線型態...', 'subtle');
        }, 1800);

        setTimeout(() => {
            // Perform real analysis
            const analysis = performAIAnalysis(
                marketState.candles,
                marketState.orderBook,
                10
            );

            setAiAnalysis(analysis);

            // Update legacy recommendation state for OrderForm
            if (analysis.overall.recommendation === 'LONG') {
                setAiRecommendation('LONG');
            } else if (analysis.overall.recommendation === 'SHORT') {
                setAiRecommendation('SHORT');
            } else {
                setAiRecommendation(null);
            }

            // Log analysis results
            addLog(`趨勢分析: ${analysis.trend.description}`, 'info');
            addLog(`委託簿分析: ${analysis.orderBook.description}`, 'info');
            addLog(`動能分析: ${analysis.momentum.description}`, 'info');

            if (analysis.pattern.detected) {
                addLog(`K線型態: ${analysis.pattern.detected} - ${analysis.pattern.description}`,
                    analysis.pattern.signal === 'bullish' ? 'success' :
                        analysis.pattern.signal === 'bearish' ? 'warning' : 'info'
                );
            }

            // Log final recommendation
            const recText = analysis.overall.recommendation === 'LONG' ? '買進 (LONG)' :
                analysis.overall.recommendation === 'SHORT' ? '賣出 (SHORT)' : '觀望 (HOLD)';
            const recType = analysis.overall.recommendation === 'LONG' ? 'success' :
                analysis.overall.recommendation === 'SHORT' ? 'warning' : 'info';

            addLog(`AI 建議: ${recText} (信心度: ${analysis.overall.confidence}%)`, recType);

            // Log reasons
            analysis.overall.reasons.forEach(reason => {
                addLog(`  → ${reason}`, 'subtle');
            });

            setAiState('analyzed');
        }, 2300);
    }, [marketState.candles, marketState.orderBook, addLog]);

    // Chart Container Resize Observer
    const chartContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const updateHeight = () => {
            const mobile = window.innerWidth < 640;
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

    // Trading controls for navbar rightContent
    const tradingControls = (
        <div className="flex items-center gap-2">
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
                <span className="text-xs font-bold hidden sm:inline">{isAsianTheme ? '台股配色' : '美股配色'}</span>
            </button>
        </div>
    );

    // Portfolio stats for navbar leftContent
    const portfolioStats = (
        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-mono">
            <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">{t.equity}</span>
                <span className="text-white font-bold">${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">未實現</span>
                <span className={`${getTextColor(unrealizedPnl >= 0)} font-bold`}>
                    {unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnl.toFixed(2)}
                </span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">{t.pnl}</span>
                <span className={`${getTextColor(realizedPnl >= 0)} font-bold`}>
                    {realizedPnl >= 0 ? '+' : ''}{realizedPnl.toFixed(2)}
                </span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-950 font-sans text-zinc-300 select-none">
            {/* Unified Navbar */}
            <Navbar 
                currentPage="trading"
                leftContent={portfolioStats}
                rightContent={tradingControls}
            />

            {/* Main Content */}
            <div className="w-full max-w-7xl mx-auto p-4">

            {/* Settings Panel (collapsible) */}
            {showSettings && (
                <div className="mb-6 p-6 bg-zinc-900 border border-zinc-800 rounded-lg relative shadow-2xl overflow-hidden group">
                    <button
                        onClick={() => setShowSettings(false)}
                        className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors p-1 rounded-full hover:bg-zinc-800"
                    >
                        <X size={18} />
                    </button>

                    <div className="space-y-8">
                        {/* Group 1: Market Environment */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-white border-l-4 border-indigo-500 pl-3">市場環境 (Market Environment)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pl-1">
                                {/* Scenario */}
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-col gap-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">市場情境</label>
                                                <button onClick={() => setShowScenarioInfo(!showScenarioInfo)} className="text-zinc-500 hover:text-indigo-400 transition-colors" title="查看說明"><Info size={14} /></button>
                                            </div>
                                            <p className="text-[10px] text-zinc-500 leading-relaxed">調整市場趨勢（如多頭、空頭或盤整）。</p>
                                            {showScenarioInfo && (
                                                <div className="mt-2 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-[10px] text-zinc-400 leading-relaxed space-y-2 z-10 relative">
                                                    <p className="font-semibold text-indigo-400">程式邏輯說明：</p>
                                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                                        <li><strong>買賣強度</strong>：影響 Buy/Sell 機率。</li>
                                                        <li><strong>波動率</strong>：影響價差寬度。</li>
                                                        <li><strong>流動性</strong>：影響委託簿深度。</li>
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {SCENARIO_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => {
                                                    setScenario(opt.value);
                                                    const modifier = SCENARIO_MODIFIERS[opt.value];
                                                    if (modifier?.intensity) setIntensity(modifier.intensity);
                                                }}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border relative overflow-hidden ${marketState.scenario === opt.value
                                                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50'
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                                    }`}
                                            >
                                                {/* Active Indicator */}
                                                {marketState.scenario === opt.value && (
                                                    <div className="absolute inset-0 bg-indigo-500/10 animate-pulse" />
                                                )}
                                                {opt.icon} {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Scenario Overview Card */}
                                <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-lg p-4 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 opacity-10">
                                        <Activity size={100} />
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                                        {/* Left: Visualization */}
                                        <div className="flex-shrink-0 flex flex-col items-center justify-center gap-2">
                                            <div className="w-[120px] h-[60px] bg-zinc-900/50 rounded flex items-center justify-center p-2 border border-zinc-800">
                                                <svg width="100" height="40" viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full stroke-current text-indigo-500 fill-none stroke-2 shadow-lg filter drop-shadow">
                                                    <path d={getScenarioPreviewPath(marketState.scenario)} vectorEffect="non-scaling-stroke" />
                                                </svg>
                                            </div>
                                            <div className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">Pattern Preview</div>
                                        </div>

                                        {/* Right: Info & Stats */}
                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="text-sm font-bold text-white">
                                                        {SCENARIO_OPTIONS.find(o => o.value === marketState.scenario)?.label}
                                                    </h4>
                                                    {SCENARIO_LIFECYCLE[marketState.scenario] && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded animate-pulse">
                                                            自動切換中...
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-zinc-400 leading-relaxed">
                                                    {SCENARIO_DETAILS[marketState.scenario]?.desc}
                                                </p>
                                            </div>

                                            {/* Stats Bars */}
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[10px] text-zinc-500 uppercase">
                                                        <span>Volatility</span>
                                                        <span>{SCENARIO_DETAILS[marketState.scenario]?.vol}/5</span>
                                                    </div>
                                                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${(SCENARIO_DETAILS[marketState.scenario]?.vol / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[10px] text-zinc-500 uppercase">
                                                        <span>Liquidity</span>
                                                        <span>{SCENARIO_DETAILS[marketState.scenario]?.liq}/5</span>
                                                    </div>
                                                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${(SCENARIO_DETAILS[marketState.scenario]?.liq / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Intensity */}
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-col gap-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">市場熱絡度 (Intensity)</label>
                                                <button onClick={() => setShowIntensityInfo(!showIntensityInfo)} className="text-zinc-500 hover:text-indigo-400 transition-colors" title="查看說明"><Info size={14} /></button>
                                            </div>
                                            <p className="text-[10px] text-zinc-500 leading-relaxed">控制機器人的下單頻率與成交速度。</p>
                                            {showIntensityInfo && (
                                                <div className="mt-2 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-[10px] text-zinc-400 leading-relaxed space-y-2 z-10 relative">
                                                    <p className="font-semibold text-indigo-400">程式邏輯說明：</p>
                                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                                        <li><strong>下單頻率</strong>：數值越高，機器人動作越快。</li>
                                                        <li><strong>訂單量</strong>：數值越高，單筆量越大。</li>
                                                        <li><strong>委託深度</strong>：數值越高，掛單越密集。</li>
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <input
                                                type="range"
                                                min="0.1"
                                                max="5.0"
                                                step="0.1"
                                                value={intensity}
                                                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                                                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                            />
                                            <span className={`ml-3 text-xs font-mono font-bold px-2 py-0.5 rounded whitespace-nowrap ${intensity >= 2.0 ? 'bg-rose-500/20 text-rose-400' : 'bg-zinc-700 text-zinc-300'}`}>
                                                {intensity.toFixed(1)}x
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-zinc-600 font-mono tracking-tighter">
                                            <span>0.1 (冷清)</span>
                                            <span>1.0 (正常)</span>
                                            <span>2.5 (熱絡)</span>
                                            <span>5.0 (極限)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Group 2: Trading Config */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-white border-l-4 border-emerald-500 pl-3">交易設定 (Configuration)</h3>
                            <div className="space-y-4 pl-1">
                                <div className="flex items-start gap-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">基本參數</label>
                                            <button onClick={() => setShowBotInfo(!showBotInfo)} className="text-zinc-500 hover:text-indigo-400 transition-colors" title="查看說明"><Info size={14} /></button>
                                        </div>
                                        {showBotInfo && (
                                            <div className="mb-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-[10px] text-zinc-400 leading-relaxed space-y-2 z-10 relative">
                                                <p className="font-semibold text-emerald-400">參數說明：</p>
                                                <ul className="list-disc list-inside space-y-1 pl-2">
                                                    <li><strong>每筆規模</strong>：機器人掛單的單位量 (1 Unit = 1000 股)。</li>
                                                    <li><strong>零股模式</strong>：開啟後最小單位變為 1 股，適合測試小額交易。</li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                    {/* Bot Volume */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] text-zinc-500">每筆規模 (Unit Size)</label>
                                        <div className="flex items-center gap-3">
                                            <button className="text-zinc-500 hover:text-rose-400" onClick={() => setBotVolume(Math.max(1, botVolume - 1))}><MinusCircle size={20} /></button>
                                            <div className="text-center w-16 bg-zinc-800 rounded border border-zinc-700 py-1 text-sm font-mono text-white font-bold">{botVolume}</div>
                                            <button className="text-zinc-500 hover:text-emerald-400" onClick={() => setBotVolume(botVolume + 1)}><PlusCircle size={20} /></button>
                                            <span className="text-xs text-zinc-500 font-mono">= {(botVolume * 1000).toLocaleString()} 股</span>
                                        </div>
                                    </div>

                                    {/* Odd Lot */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] text-zinc-500">交易模式 (Mode)</label>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setIsOddLot(!isOddLot)}
                                                className={`w-10 h-5 rounded-full relative transition-colors border border-zinc-700 ${isOddLot ? 'bg-indigo-500/80 border-indigo-500' : 'bg-zinc-800'}`}
                                            >
                                                <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm ${isOddLot ? 'left-5' : 'left-0.5'}`} />
                                            </button>
                                            <span className="text-xs text-zinc-400">{isOddLot ? '零股 (Odd Lot)' : '整股 (Standard)'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Group 3: Fee Group */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-white border-l-4 border-amber-500 pl-3">費率結構 (Fee Structure)</h3>
                            <div className="space-y-4 pl-1">
                                <div className="flex items-start gap-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">交易成本參數</label>
                                            <button onClick={() => setShowFeeInfo(!showFeeInfo)} className="text-zinc-500 hover:text-indigo-400 transition-colors" title="查看說明"><Info size={14} /></button>
                                        </div>
                                        {showFeeInfo && (
                                            <div className="mb-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-[10px] text-zinc-400 leading-relaxed space-y-2 z-10 relative">
                                                <p className="font-semibold text-amber-400">費用計算規則：</p>
                                                <ul className="list-disc list-inside space-y-1 pl-2">
                                                    <li><strong>手續費</strong>：買賣皆收。計算公式 = 成交金額 * 費率 (最低收 Min Fee)。</li>
                                                    <li><strong>證交稅</strong>：僅賣出時收取。</li>
                                                    <li><strong>當沖稅率</strong>：若賣出的股票是同一天買入的 (Day Trade)，適用優惠稅率。</li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-zinc-400">手續費率 (Rate)</label>
                                        <div className="flex items-center gap-1 bg-zinc-800 rounded px-2 py-1.5 border border-zinc-700">
                                            <input type="number" min="0" step="0.0001" value={commissionRatePercent} onChange={(e) => setCommissionRatePercent(Math.max(0, parseFloat(e.target.value) || 0))} className="bg-transparent text-xs w-full text-white font-mono focus:outline-none" />
                                            <span className="text-[10px] text-zinc-500">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-zinc-400">最低手續費 (Min)</label>
                                        <div className="flex items-center gap-1 bg-zinc-800 rounded px-2 py-1.5 border border-zinc-700">
                                            <span className="text-[10px] text-zinc-500">$</span>
                                            <input type="number" min="0" step="1" value={minCommissionFee} onChange={(e) => setMinCommissionFee(Math.max(0, parseInt(e.target.value) || 0))} className="bg-transparent text-xs w-full text-white font-mono focus:outline-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-zinc-400">證交稅率 (Tax)</label>
                                        <div className="flex items-center gap-1 bg-zinc-800 rounded px-2 py-1.5 border border-zinc-700">
                                            <input type="number" min="0" step="0.0001" value={taxRatePercent} onChange={(e) => setTaxRatePercent(Math.max(0, parseFloat(e.target.value) || 0))} className="bg-transparent text-xs w-full text-white font-mono focus:outline-none" />
                                            <span className="text-[10px] text-zinc-500">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-zinc-400">當沖稅率 (DT)</label>
                                        <div className="flex items-center gap-1 bg-zinc-800 rounded px-2 py-1.5 border border-zinc-700">
                                            <input type="number" min="0" step="0.0001" value={dayTradeTaxRatePercent} onChange={(e) => setDayTradeTaxRatePercent(Math.max(0, parseFloat(e.target.value) || 0))} className="bg-transparent text-xs w-full text-white font-mono focus:outline-none" />
                                            <span className="text-[10px] text-zinc-500">%</span>
                                        </div>
                                    </div>
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
                                <span className="text-xl font-bold text-white tracking-wider">NATLEE/TWD</span>
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

                    {/* AI Analysis Panel - Dedicated Section */}
                    <AIAnalysisPanel
                        state={aiState}
                        analysis={aiAnalysis}
                        onStartScan={startScan}
                        disabled={false}
                        isAsianTheme={isAsianTheme}
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
            </div>
        </div>
    );
}
