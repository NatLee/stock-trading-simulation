import { TrendBotConfig, BotOrder } from './types';
import { OrderSide } from '../matching/types';
import { PriceStep } from '../matching/PriceStep';
import { MarketScenario } from '../matching/types';

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
    private maxHistoryLength: number = 20;

    constructor(config: TrendBotConfig) {
        this.config = { ...config };
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
     * Record a price observation
     */
    observePrice(price: number): void {
        this.priceHistory.push(price);
        if (this.priceHistory.length > this.maxHistoryLength) {
            this.priceHistory.shift();
        }
    }

    /**
     * Calculate current trend direction (-1 to 1)
     */
    calculateTrend(): number {
        if (this.priceHistory.length < 5) return 0;

        // Simple moving average comparison
        const recentPrices = this.priceHistory.slice(-5);
        const olderPrices = this.priceHistory.slice(-10, -5);

        if (olderPrices.length === 0) return 0;

        const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
        const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;

        // Normalize to -1 to 1 range
        const change = (recentAvg - olderAvg) / olderAvg;
        return Math.max(-1, Math.min(1, change * 100)); // Scale up for sensitivity
    }

    /**
     * Generate trend-following orders
     */
    generateOrders(
        currentPrice: number,
        scenario: MarketScenario
    ): BotOrder[] {
        if (!this.config.enabled) return [];

        const now = Date.now();
        const intensity = this.config.intensity || 1.0;
        const effectiveInterval = this.config.tradeInterval / intensity;
        if (now - this.lastTradeTime < effectiveInterval) return [];

        const trend = this.calculateTrend();
        const scenarioBias = this.getScenarioBias(scenario);
        const combinedTrend = trend + scenarioBias;

        // Only trade if trend is strong enough
        const threshold = 0.3 * (1 - this.config.aggressiveness);
        if (Math.abs(combinedTrend) < threshold) return [];

        const orders: BotOrder[] = [];
        const [minSize, maxSize] = this.config.sizeRange;
        const size = Math.floor(
            minSize + (maxSize - minSize) * Math.abs(combinedTrend) * this.config.aggressiveness
        );

        if (size > 0) {
            // Limit orders - place slightly away from market
            if (Math.random() < 0.7) {
                const side: OrderSide = combinedTrend > 0 ? 'buy' : 'sell';
                const deviation = 0.001 + Math.random() * 0.002;
                const rawPrice = side === 'buy'
                    ? currentPrice * (1 - deviation)
                    : currentPrice * (1 + deviation);

                const price = side === 'buy'
                    ? PriceStep.floorToTick(rawPrice)
                    : PriceStep.ceilToTick(rawPrice);

                orders.push({
                    side,
                    type: 'limit',
                    price,
                    quantity: Math.max(1, size),
                    botType: 'trend',
                });
            }
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
            case 'volatile': return (Math.random() - 0.5) * 0.4;
            default: return 0;
        }
    }

    /**
     * Calculate limit price based on trend
     */
    private getLimitPrice(currentPrice: number, side: OrderSide, trend: number): number {
        const offset = 0.001 + Math.abs(trend) * 0.002;

        if (side === 'buy') {
            return Math.round(currentPrice * (1 - offset) * 100) / 100;
        } else {
            return Math.round(currentPrice * (1 + offset) * 100) / 100;
        }
    }

    /**
     * Check if ready to trade
     */
    isReady(): boolean {
        if (!this.config.enabled) return false;
        const intensity = this.config.intensity || 1.0;
        const effectiveInterval = this.config.tradeInterval / intensity;
        return Date.now() - this.lastTradeTime >= effectiveInterval;
    }

    /**
     * Reset state
     */
    reset(): void {
        this.priceHistory = [];
        this.lastTradeTime = 0;
    }
}
