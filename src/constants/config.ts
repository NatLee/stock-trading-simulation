// Application configuration constants

export const CONFIG = {
    // Trading
    INITIAL_BALANCE: 1000000,
    DEFAULT_LEVERAGE: 1,
    MAX_LEVERAGE: 10,
    COMMISSION_RATE: 0.0005,  // 0.05%

    // Chart
    BASE_PRICE: 50.00,
    MAX_CANDLES: 100,
    CANDLE_PROGRESS_MAX: 240,
    DEFAULT_VIEW_COUNT: 60,
    MOBILE_VIEW_COUNT: 30,

    // Price Engine
    BASE_VOLATILITY: 0.0015,
    REGIME_DURATION_MIN: 3000,
    REGIME_DURATION_MAX: 6000,

    // Order Book
    ORDER_BOOK_DEPTH: 15,
    SPREAD_PERCENT: 0.001,  // Tighter spread
    ORDER_SIZE_MIN: 10,
    ORDER_SIZE_MAX: 100,

    // AI
    AI_SCAN_DELAY: 2200,

    // Symbol
    DEFAULT_SYMBOL: 'NATLEE',
    DEFAULT_SYMBOL_CODE: '7777',
} as const;

export const COLORS = {
    bullish: '#10b981',     // emerald-500
    bearish: '#f43f5e',     // rose-500
    warning: '#eab308',     // yellow-500
    info: '#6366f1',        // indigo-500
    background: '#09090b',  // zinc-950
    surface: '#18181b',     // zinc-900
    border: '#27272a',      // zinc-800
    text: '#d4d4d8',        // zinc-300
    textMuted: '#71717a',   // zinc-500
} as const;
