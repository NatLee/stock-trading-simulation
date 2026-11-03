import { TrendBotConfig, BotOrder, effectiveInterval } from './types';
import { OrderSide, MarketScenario } from '../matching/types';
import { PriceStep } from '../matching/PriceStep';
import { SimEnv, realEnv } from '../sim/env';

/**
 * TrendBot - follows market trends and adds directional pressure
 * 
 * Features:
 * - Analyzes recent price movements to determine trend
 * - Places orders in the direction of the trend
 * - Aggressiveness determines order size and frequency
 */
export class TrendBot {
    private config: TrendBotConfig;
    private lastTradeTime: number = 0;
    private priceHistory: number[] = [];
    private env: SimEnv;

    constructor(config: TrendBotConfig, env: SimEnv = realEnv) {
        this.config = { ...config };
        this.env = env;
    }

    /**
     * Update bot configuration
     */
    updateConfig(config: Partial<TrendBotConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): TrendBotConfig {
        return { ...this.config };
    }

    /**
     * Get trade interval for burst-mode calculation
     */
    getTradeInterval(): number {
        return this.config.tradeInterval;
    }

    /**
     * Record a price observation
     */
    observePrice(price: number): void {
        this.priceHistory.push(price);
        // Two windows are all the momentum ever looks at
        if (this.priceHistory.length > 2 * this.config.momentumWindow) {
            this.priceHistory.shift();
        }
    }

    /**
     * Calculate current trend direction (-1 to 1)
     */
    calculateTrend(): number {
        const window = this.config.momentumWindow;
        if (this.priceHistory.length < window) return 0;

        // Simple moving average comparison: the last window vs the one before
        const recentPrices = this.priceHistory.slice(-window);
        const olderPrices = this.priceHistory.slice(-2 * window, -window);

        if (olderPrices.length === 0) return 0;

        const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
        const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;

        // Normalize to -1 to 1 range
        const change = (recentAvg - olderAvg) / olderAvg;
        return Math.max(-1, Math.min(1, change * this.config.momentumScale));
    }

    /**
     * Generate trend-following orders
     */
    generateOrders(
        currentPrice: number,
        scenario: MarketScenario,
        force: boolean = false
    ): BotOrder[] {
        if (!this.config.enabled) return [];

        const now = this.env.now();
        if (!force && !this.isReady()) return [];

        const trend = this.calculateTrend();
        const scenarioBias = this.getScenarioBias(scenario);
        const combinedTrend = trend + scenarioBias;

        // Use separate buy/sell strength if provided, otherwise use aggressiveness
        const buyStrength = this.config.buyStrength ?? this.config.aggressiveness;
        const sellStrength = this.config.sellStrength ?? this.config.aggressiveness;

        // Determine side based on trend
        const isBuying = combinedTrend > 0;
        const strength = isBuying ? buyStrength : sellStrength;

        // Only trade if trend is strong enough
        const threshold = this.config.entryThreshold * (1 - strength);
        if (Math.abs(combinedTrend) < threshold) return [];

        const orders: BotOrder[] = [];
        const [minSize, maxSize] = this.config.sizeRange;
        const size = Math.floor(
            minSize + (maxSize - minSize) * Math.abs(combinedTrend) * strength
        );

        if (size > 0) {
            // Determine order urgency based on trend strength
            const isAggressive = Math.abs(combinedTrend) > this.config.aggressiveAbove;
            const side: OrderSide = combinedTrend > 0 ? 'buy' : 'sell';

            // Aggressive: priced crossPercent past the price, so it crosses the spread
            // and fills at once like a market order with a cap.
            // Passive: sits passiveOffset on its own side of the price.
            let rawPrice: number;
            if (isAggressive) {
                const crossing = this.config.crossPercent;
                rawPrice = side === 'buy'
                    ? currentPrice * (1 + crossing)
                    : currentPrice * (1 - crossing);
            } else {
                const [minOffset, maxOffset] = this.config.passiveOffset;
                const deviation = minOffset + this.env.random() * (maxOffset - minOffset);
                rawPrice = side === 'buy'
                    ? currentPrice * (1 - deviation)
                    : currentPrice * (1 + deviation);
            }
            const price = side === 'buy'
                ? PriceStep.floorToTick(rawPrice)
                : PriceStep.ceilToTick(rawPrice);

            const sendProbability = isAggressive
                ? this.config.aggressiveSendProbability
                : this.config.passiveSendProbability;
            if (this.env.random() < sendProbability) {
                orders.push({
                    side,
                    type: 'limit',
                    price,
                    quantity: Math.max(1, size),
                    botType: 'trend',
                });
            }
        }

        if (!force) {
            this.lastTradeTime = now;
        }

        return orders;
    }

    /**
     * Get scenario-based bias
     */
    private getScenarioBias(scenario: MarketScenario): number {
        switch (scenario) {
            case 'bull': return 0.3;
            case 'bear': return -0.3;
            case 'volatile': return (this.env.random() - 0.5) * 0.4;
            default: return 0;
        }
    }

    /**
     * Check if ready to trade
     */
    isReady(): boolean {
        if (!this.config.enabled) return false;
        return this.env.now() - this.lastTradeTime >= effectiveInterval(this.config.tradeInterval, this.config);
    }

    /**
     * Reset state
     */
    reset(): void {
        this.priceHistory = [];
        this.lastTradeTime = 0;
    }
}
