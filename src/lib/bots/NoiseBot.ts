import { NoiseBotConfig, BotOrder } from './types';
import { OrderSide } from '../matching/types';
import { PriceStep } from '../matching/PriceStep';

/**
 * NoiseBot - adds random market activity
 * 
 * Features:
 * - Places random buy/sell orders
 * - Mix of market and limit orders
 * - Simulates retail trader behavior
 */
export class NoiseBot {
    private config: NoiseBotConfig;
    private lastTradeTime: number = 0;

    constructor(config: NoiseBotConfig) {
        this.config = { ...config };
    }

    /**
     * Update bot configuration
     */
    updateConfig(config: Partial<NoiseBotConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): NoiseBotConfig {
        return { ...this.config };
    }

    /**
     * Generate random trading orders
     */
    generateOrders(currentPrice: number): BotOrder[] {
        if (!this.config.enabled) return [];

        const now = Date.now();
        const intensity = this.config.intensity || 1.0;
        const effectiveInterval = this.config.tradeInterval / intensity;
        if (now - this.lastTradeTime < effectiveInterval) return [];

        const orders: BotOrder[] = [];
        const [minSize, maxSize] = this.config.sizeRange;

        // Random side
        const side: OrderSide = Math.random() > 0.5 ? 'buy' : 'sell';

        // Random size
        const size = Math.floor(minSize + Math.random() * (maxSize - minSize));

        // Random order type
        const useMarket = Math.random() < this.config.marketOrderProbability;
        const type = useMarket ? 'market' : 'limit';

        if (size > 0) {
            let price: number | null = null;

            // For limit orders, pick a price near current price
            if (type === 'limit') {
                const deviation = (Math.random() - 0.5) * 0.01; // +/- 0.5%
                const rawPrice = currentPrice * (1 + deviation);
                price = PriceStep.roundToTick(rawPrice);
            }

            orders.push({
                side,
                type,
                price: price,
                quantity: Math.max(1, size),
                botType: 'noise',
            });

            this.lastTradeTime = now;
        }

        return orders;
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
        this.lastTradeTime = 0;
    }
}
