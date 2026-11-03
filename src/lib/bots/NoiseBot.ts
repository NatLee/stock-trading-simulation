import { NoiseBotConfig, BotOrder, effectiveInterval } from './types';
import { OrderSide } from '../matching/types';
import { PriceStep } from '../matching/PriceStep';
import { SimEnv, realEnv } from '../sim/env';

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
    private env: SimEnv;

    constructor(config: NoiseBotConfig, env: SimEnv = realEnv) {
        this.config = { ...config };
        this.env = env;
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
     * Get trade interval for burst-mode calculation
     */
    getTradeInterval(): number {
        return this.config.tradeInterval;
    }

    /**
     * Generate random trading orders
     */
    generateOrders(currentPrice: number, force: boolean = false): BotOrder[] {
        if (!this.config.enabled) return [];

        const now = this.env.now();
        if (!force && !this.isReady()) return [];

        const orders: BotOrder[] = [];
        const [minSize, maxSize] = this.config.sizeRange;

        // Random side
        const side: OrderSide = this.env.random() > 0.5 ? 'buy' : 'sell';

        // Random size
        const size = Math.floor(minSize + this.env.random() * (maxSize - minSize));

        // Random order type
        const useMarket = this.env.random() < this.config.marketOrderProbability;
        const type = useMarket ? 'market' : 'limit';

        if (size > 0) {
            let price: number | null = null;

            // For limit orders, pick a price near current price
            if (type === 'limit') {
                const bandWidth = 2 * this.config.limitBand; // ± limitBand around the price
                const deviation = (this.env.random() - 0.5) * bandWidth;
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

            if (!force) {
                this.lastTradeTime = now;
            }
        }

        return orders;
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
        this.lastTradeTime = 0;
    }
}
