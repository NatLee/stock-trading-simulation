import { MarketMakerBotConfig, BotOrder } from './types';
import { OrderSide } from '../matching/types';
import { PriceStep } from '../matching/PriceStep';

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

    constructor(config: MarketMakerBotConfig) {
        this.config = { ...config };
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
     * Returns orders to place on both bid and ask sides
     */
    generateQuotes(
        currentPrice: number,
        volatilityMultiplier: number = 1.0,
        liquidityMultiplier: number = 1.0
    ): BotOrder[] {
        if (!this.config.enabled) return [];

        const now = Date.now();
        const orders: BotOrder[] = [];

        // Calculate spread with volatility adjustment
        const baseSpread = this.config.spreadPercent * volatilityMultiplier;

        // Inventory skew - if holding too much, make sells more attractive
        const inventoryRatio = this.inventory / this.config.inventoryLimit;
        const bidSkew = Math.max(0, -inventoryRatio * 0.5);  // Reduce if long
        const askSkew = Math.max(0, inventoryRatio * 0.5);   // Reduce if short

        const [minSize, maxSize] = this.config.sizeRange;
        const sizeMultiplier = liquidityMultiplier;

        // Dynamic depth based on intensity
        const intensity = this.config.intensity || 1.0;
        const dynamicDepth = this.config.depth + Math.floor(intensity * 2);

        // Generate bid (buy) orders
        for (let i = 0; i < dynamicDepth; i++) {
            const levelOffset = baseSpread + (i * 0.0005);
            const skewedOffset = levelOffset + bidSkew * baseSpread;
            const rawPrice = currentPrice * (1 - skewedOffset);
            const price = PriceStep.floorToTick(rawPrice); // Use floor for bids to be safe

            // Increase size for deeper levels (scale 1.0 to ~3.0)
            const depthScale = 1 + (i / dynamicDepth) * 2.0;
            const size = Math.floor((minSize + Math.random() * (maxSize - minSize)) * sizeMultiplier * depthScale);

            if (price > 0) {
                orders.push({
                    side: 'buy',
                    type: 'limit',
                    price: price,
                    quantity: Math.max(1, size),
                    botType: 'marketMaker',
                });
            }
        }

        // Generate ask (sell) orders
        for (let i = 0; i < dynamicDepth; i++) {
            const levelOffset = baseSpread + (i * 0.0005);
            const skewedOffset = levelOffset + askSkew * baseSpread;
            const rawPrice = currentPrice * (1 + skewedOffset);
            const price = PriceStep.ceilToTick(rawPrice); // Use ceil for asks to be safe

            // Increase size for deeper levels
            const depthScale = 1 + (i / dynamicDepth) * 2.0;
            const size = Math.floor((minSize + Math.random() * (maxSize - minSize)) * sizeMultiplier * depthScale);

            orders.push({
                side: 'sell',
                type: 'limit',
                price: price,
                quantity: Math.max(1, size),
                botType: 'marketMaker',
            });
        }

        this.lastQuoteTime = now;
        return orders;
    }

    /**
     * Check if quotes need refresh
     */
    needsRefresh(): boolean {
        if (!this.config.enabled) return false;
        const intensity = this.config.intensity || 1.0;
        const effectiveInterval = this.config.refreshInterval / intensity;
        return Date.now() - this.lastQuoteTime >= effectiveInterval;
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

    /**
     * Get time until next refresh
     */
    getTimeUntilRefresh(): number {
        const elapsed = Date.now() - this.lastQuoteTime;
        return Math.max(0, this.config.refreshInterval - elapsed);
    }
}
