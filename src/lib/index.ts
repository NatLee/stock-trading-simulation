export * from './utils';
export * from './orderCalculations';
export * from './aiAnalysis';

// Re-export matching module - contains the new matching engine
export {
    MatchingEngine,
    OrderBook as MatchingOrderBook,
    CandleAggregator,
    generateOrderId as generateMatchingOrderId,
    generateTradeId,
    calculateTradeCommission,
    COMMISSION_RATE,
} from './matching';
export type {
    OrderEntry,
    PriceLevel,
    OrderBookSnapshot,
    OrderBookLevel,
    Trade,
    MatchResult,
    MarketScenario,
    OrderSide as MatchingOrderSide,
    MatchingOrderType,
    MatchingOrderStatus,
    OrderSource,
} from './matching';

// Re-export bots module
export {
    BotManager,
    MarketMakerBot,
    TrendBot,
    NoiseBot,
    DEFAULT_BOT_MANAGER_CONFIG,
    SCENARIO_MODIFIERS,
} from './bots';
export type {
    BotManagerConfig,
    MarketMakerBotConfig,
    TrendBotConfig as BotTrendConfig,
    NoiseBotConfig as BotNoiseConfig,
    BotOrder,
    BotType,
} from './bots';
