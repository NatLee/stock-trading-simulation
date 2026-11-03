import { MarketMakerBotConfig, BotOrder, effectiveInterval, intensityOf } from './types';
import { OrderSide } from '../matching/types';
import { PriceStep } from '../matching/PriceStep';
import { SimEnv, realEnv } from '../sim/env';

/**
 * MarketMakerBot - provides liquidity by placing orders on both sides
 *
 * Features:
 * - Maintains bid/ask quotes at multiple price levels
 * - Adjusts spread based on volatility
 * - Skews quotes based on inventory
 */
export class MarketMakerBot {
    private config: MarketMakerBotConfig;
    private inventory: number = 0; // Positive = long, negative = short
    private lastQuoteTime: number = 0;
    private env: SimEnv;

    constructor(config: MarketMakerBotConfig, env: SimEnv = realEnv) {
        this.config = { ...config };
        this.env = env;
    }

    /**
     * Update bot configuration
     */
    updateConfig(config: Partial<MarketMakerBotConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): MarketMakerBotConfig {
        return { ...this.config };
    }

    /**
     * Get refresh interval for burst-mode calculation
     */
    getRefreshInterval(): number {
        return this.config.refreshInterval;
    }

    /**
     * Generate quotes for the order book
     * Returns orders to place on both bid and ask sides (all bids first)
     */
    generateQuotes(
        currentPrice: number,
        volatilityMultiplier: number = 1.0,
        liquidityMultiplier: number = 1.0
    ): BotOrder[] {
        if (!this.config.enabled) return [];

        const { spreadPercent, levelStepPercent, depth, depthPerIntensity, sizeRange, depthSizeGrowth } = this.config;
        const baseSpread = spreadPercent * volatilityMultiplier;

        // Inventory skew - if holding too much, make sells more attractive
        const inventoryRatio = this.inventory / this.config.inventoryLimit;
        const skew: Record<OrderSide, number> = {
            buy: Math.max(0, -inventoryRatio * this.config.inventorySkew),
            sell: Math.max(0, inventoryRatio * this.config.inventorySkew),
        };

        const [minSize, maxSize] = sizeRange;
        const levels = depth + Math.floor(intensityOf(this.config) * depthPerIntensity);
        const orders: BotOrder[] = [];

        for (const side of ['buy', 'sell'] as OrderSide[]) {
            // Bids sit below the price (floor to a tick), asks above it (ceil)
            const direction = side === 'buy' ? -1 : 1;
            for (let i = 0; i < levels; i++) {
                const offset = baseSpread + i * levelStepPercent + skew[side] * baseSpread;
                const rawPrice = currentPrice * (1 + direction * offset);
                const price = side === 'buy' ? PriceStep.floorToTick(rawPrice) : PriceStep.ceilToTick(rawPrice);

                // Deeper levels are bigger: 1× at the touch up to (1 + depthSizeGrowth)×
                const depthScale = 1 + (i / levels) * depthSizeGrowth;
                const size = Math.floor((minSize + this.env.random() * (maxSize - minSize)) * liquidityMultiplier * depthScale);

                if (price > 0) {
                    orders.push({ side, type: 'limit', price, quantity: Math.max(1, size), botType: 'marketMaker' });
                }
            }
        }

        this.lastQuoteTime = this.env.now();
        return orders;
    }

    /**
     * Check if quotes need refresh
     */
    needsRefresh(): boolean {
        if (!this.config.enabled) return false;
        return this.env.now() - this.lastQuoteTime >= effectiveInterval(this.config.refreshInterval, this.config);
    }

    /**
     * Update inventory after a trade
     */
    updateInventory(side: OrderSide, quantity: number): void {
        if (side === 'buy') {
            this.inventory += quantity;
        } else {
            this.inventory -= quantity;
        }
    }

    /**
     * Get current inventory
     */
    getInventory(): number {
        return this.inventory;
    }

    /**
     * Reset inventory
     */
    resetInventory(): void {
        this.inventory = 0;
    }
}
