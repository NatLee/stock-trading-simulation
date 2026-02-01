'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Globe, RefreshCw, Eye, EyeOff, Layers, Zap, BookOpen, Palette, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Language, TRANSLATIONS, CONFIG } from '@/constants';
import { generateOrderBook } from '@/lib';
import { useTradingEngine, usePriceEngine } from '@/hooks';
import { CandleData, MarketRegime, OrderType } from '@/types';
import { CandlestickChart } from '@/components/chart';
import { OrderBook } from './orderbook';
import { OrderForm } from './order';
import { MarketStats } from './market';
import { OrderHistoryPanel } from './records';
import { HoldingsPanel } from './holdings';
import { PendingOrdersPanel } from './orders';
import { AITerminal, AIScanner } from '@/components/ai';

// Speed options in milliseconds
const SPEED_OPTIONS = [
    { label: '0.1秒', value: 100 },
    { label: '0.5秒', value: 500 },
    { label: '1秒', value: 1000 },
];

interface OrderBookEntry {
    price: string;
    size: string;
    bg: string;
}

export function SimulatedTradingSection() {
    const [lang, setLang] = useState<Language>('zh');
    const t = TRANSLATIONS[lang];

    const [showMA, setShowMA] = useState(true);
    const [showVolume, setShowVolume] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [chartSize, setChartSize] = useState({ width: 800, height: 400 });
    const [speed, setSpeed] = useState(100);

    // Color theme (Asian: up=red, Western: up=green)
    const [isAsianTheme, setIsAsianTheme] = useState(true);

    // Order book state with typed entries
    const [orderBook, setOrderBook] = useState<{ asks: OrderBookEntry[], bids: OrderBookEntry[] }>({ asks: [], bids: [] });
    const orderBookRef = useRef(orderBook);

    // Keep ref updated
    useEffect(() => {
        orderBookRef.current = orderBook;
    }, [orderBook]);

    // Price engine state
    const [candles, setCandles] = useState<CandleData[]>([]);
    const [priceEngineState, setPriceEngineState] = useState<{
        currentPrice: number;
        regime: MarketRegime;
        sentiment: number;
    }>({
        currentPrice: CONFIG.BASE_PRICE,
        regime: 'CHOP' as MarketRegime,
        sentiment: 50,
    });

    const {
        balance,
        holding,
        pnl,
        orderHistory,
        pendingOrders,
        aiState,
        aiRecommendation,
        logs,
        submitOrder,
        checkPendingOrders,
        cancelPendingOrder,
        startScan,
        reset: resetTrading,
    } = useTradingEngine(lang);

    // Order form state - controlled here to fix reset bug
    const [orderQuantity, setOrderQuantity] = useState(0);

    // Handler with order book - pass order book to engine
    const handleSubmitOrder = useCallback((
        side: 'buy' | 'sell',
        quantity: number,
        price: number,
        leverage: number,
        orderType: OrderType
    ) => {
        submitOrder(side, quantity, price, leverage, orderType, orderBookRef.current);
        setOrderQuantity(0); // Reset quantity after trade
    }, [submitOrder]);

    // Check pending orders whenever order book updates
    useEffect(() => {
        if (pendingOrders.length > 0) {
            checkPendingOrders(orderBook);
        }
    }, [orderBook, pendingOrders.length, checkPendingOrders]);

    // Price engine
    const handlePriceUpdate = useCallback((state: {
        candles: CandleData[];
        currentCandle: CandleData | null;
        currentPrice: number;
        regime: MarketRegime;
        sentiment: number;
    }) => {
        setCandles(state.candles);
        setPriceEngineState({
            currentPrice: state.currentPrice,
            regime: state.regime,
            sentiment: state.sentiment,
        });
    }, []);

    const { reset: resetPrice } = usePriceEngine({
        onUpdate: handlePriceUpdate,
        enabled: true,
        speed,
    });

    const handleReset = useCallback(() => {
        resetTrading();
        resetPrice();
        setCandles([]);
        setOrderQuantity(0);
    }, [resetTrading, resetPrice]);

    // Check mobile and set chart size
    useEffect(() => {
        const updateSize = () => {
            const mobile = window.innerWidth < 640;
            setIsMobile(mobile);

            const containerWidth = Math.min(window.innerWidth - 32, 1200);
            const chartWidth = mobile ? containerWidth : containerWidth * 0.75 - 16;
            const chartHeight = mobile ? 280 : 400;

            setChartSize({ width: chartWidth, height: chartHeight });
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Update order book periodically - also initialize immediately
    useEffect(() => {
        // Initialize immediately
        const initialOrderBook = generateOrderBook(priceEngineState.currentPrice, 2 + Math.random() * 2);
        setOrderBook(initialOrderBook);
        orderBookRef.current = initialOrderBook;

        const interval = setInterval(() => {
            const newOrderBook = generateOrderBook(priceEngineState.currentPrice, 2 + Math.random() * 2);
            setOrderBook(newOrderBook);
            orderBookRef.current = newOrderBook;
        }, 400);
        return () => clearInterval(interval);
    }, [priceEngineState.currentPrice]);

    // Color helpers based on theme
    const getTextColor = (isPositive: boolean) => {
        if (isAsianTheme) {
            return isPositive ? 'text-rose-500' : 'text-emerald-500';
        }
        return isPositive ? 'text-emerald-500' : 'text-rose-500';
    };

    // Calculate total equity (balance + holding market value)
    const holdingMarketValue = holding ? Math.abs(holding.quantity) * priceEngineState.currentPrice : 0;
    const totalEquity = balance + holdingMarketValue;
    const unrealizedPnl = holding
        ? (holding.quantity > 0
            ? holding.quantity * (priceEngineState.currentPrice - holding.averageCost)
            : Math.abs(holding.quantity) * (holding.averageCost - priceEngineState.currentPrice))
        : 0;

    return (
        <div className="w-full max-w-7xl mx-auto p-4 bg-zinc-950 font-sans text-zinc-300 select-none">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-zinc-800 pb-3 gap-3 sm:gap-0">
                <div className="flex items-center gap-2 sm:gap-3">
                    <Activity className="text-indigo-500" size={18} />
                    <span className="text-base sm:text-lg font-bold text-white tracking-wide font-mono">{t.title}</span>
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
                            <span className={`${getTextColor(pnl >= 0)} font-bold`}>
                                {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <div className="h-6 w-px bg-zinc-800 hidden sm:block"></div>
                    <div className="flex items-center gap-2">
                        {/* Color Theme Toggle */}
                        <button
                            onClick={() => setIsAsianTheme(!isAsianTheme)}
                            className={`p-2 rounded-full border transition-all ${isAsianTheme
                                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                }`}
                            title={isAsianTheme ? '漲紅跌綠 (台股)' : '漲綠跌紅 (美股)'}
                        >
                            <Palette size={14} />
                        </button>
                        {/* Learning Center Link */}
                        <Link
                            href="/learn"
                            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/50 hover:bg-indigo-500/30 text-xs font-bold transition-all text-indigo-400"
                        >
                            <BookOpen size={14} />
                            <span className="hidden sm:inline">學習</span>
                        </Link>
                        <button
                            onClick={handleReset}
                            className="p-2 rounded-full bg-zinc-900 border border-zinc-700 hover:border-red-500 hover:text-red-500 hover:bg-red-500/10 transition-all text-zinc-500"
                            title={t.reset}
                        >
                            <RefreshCw size={14} />
                        </button>
                        <button
                            onClick={() => setLang(prev => prev === 'en' ? 'zh' : 'en')}
                            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-xs font-bold transition-all"
                        >
                            <Globe size={14} className="text-indigo-400" />
                            <span className="hidden sm:inline">{lang === 'en' ? 'EN' : '中'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Left Area - Chart + AI Terminal + Trade Records */}
                <div className="lg:col-span-3 flex flex-col gap-3 h-full">
                    {/* Candlestick Chart */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-sm relative overflow-hidden">
                        {/* Chart overlay controls */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-2 items-center z-20">
                            <div className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold font-mono">
                                {t.pair}
                            </div>
                            <div className="bg-zinc-800/80 text-white px-2 py-0.5 rounded text-[10px] sm:text-xs font-mono">
                                ${priceEngineState.currentPrice.toFixed(2)}
                            </div>
                        </div>

                        {/* Speed selector */}
                        <div className="absolute top-3 right-3 flex items-center gap-1 z-20">
                            <Zap size={12} className="text-amber-400" />
                            {SPEED_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setSpeed(opt.value)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${speed === opt.value
                                        ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                                        : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <CandlestickChart
                            candles={candles}
                            currentPrice={priceEngineState.currentPrice}
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
                        title={t.terminalTitle}
                        processingLabel={t.processing}
                    />

                    {/* Pending Orders Panel - Between AI Terminal and Holdings */}
                    <PendingOrdersPanel
                        pendingOrders={pendingOrders}
                        onCancelOrder={cancelPendingOrder}
                        isAsianTheme={isAsianTheme}
                    />

                    {/* Holdings Panel - Between Pending Orders and Trade Records */}
                    <HoldingsPanel
                        holding={holding}
                        currentPrice={priceEngineState.currentPrice}
                        isAsianTheme={isAsianTheme}
                    />

                    {/* Order History - Below Holdings */}
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
                        asks={orderBook.asks}
                        bids={orderBook.bids}
                        currentPrice={priceEngineState.currentPrice.toFixed(2)}
                        priceLabel={t.price}
                        sizeLabel={lang === 'en' ? 'SIZE' : '量'}
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

                        {/* Market Stats */}
                        <div className="my-3">
                            <MarketStats
                                sentiment={priceEngineState.sentiment}
                                regime={priceEngineState.regime}
                                translations={{
                                    marketVitals: t.marketVitals,
                                    sentiment: t.sentiment,
                                    regimeBull: t.regimeBull,
                                    regimeBear: t.regimeBear,
                                    regimeChop: t.regimeChop,
                                }}
                                isAsianTheme={isAsianTheme}
                            />
                        </div>

                        {/* Order Form */}
                        <OrderForm
                            currentPrice={priceEngineState.currentPrice}
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
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
