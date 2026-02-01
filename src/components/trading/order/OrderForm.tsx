'use client';

import { useState, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { OrderType, OrderSide, AIRecommendation, OrderPreviewData, Holding, OrderCondition } from '@/types';
import { CONFIG } from '@/constants';
import { calculateMaxQuantity, calculateQuantityFromPercent, calculateCommission } from '@/lib';
import { Slider } from '@/components/ui';
import { OrderTypeSelector } from './OrderTypeSelector';
import { QuantityInput } from './QuantityInput';
import { PriceInput } from './PriceInput';
import { OrderPreview } from './OrderPreview';

interface OrderFormProps {
    currentPrice: number;
    availableBalance: number;
    holding: Holding | null;
    aiRecommendation: AIRecommendation;
    onSubmitOrder: (side: OrderSide, quantity: number, price: number, leverage: number, type: OrderType, condition: OrderCondition) => void;
    quantity: number;
    onQuantityChange: (qty: number) => void;
    translations: {
        orderType: string;
        marketOrder: string;
        limitOrder: string;
        quantity: string;
        shares: string;
        limitPrice: string;
        useCurrentPrice: string;
        leverage: string;
        orderPreview: string;
        buy: string;
        sell: string;
    };
    symbol?: string;
    isAsianTheme?: boolean;
    isOddLot?: boolean;
    commissionRate?: number;
}

export function OrderForm({
    currentPrice,
    availableBalance,
    holding,
    aiRecommendation,
    onSubmitOrder,
    quantity,
    onQuantityChange,
    translations: t,
    symbol = 'NATLEE (7777)',
    isAsianTheme = true,
    isOddLot = false,
    commissionRate = 0.001425,
}: OrderFormProps) {
    const [orderType, setOrderType] = useState<OrderType>('market');
    const [limitPrice, setLimitPrice] = useState<number>(currentPrice);
    const [leverage, setLeverage] = useState<number>(CONFIG.DEFAULT_LEVERAGE);
    const [condition, setCondition] = useState<OrderCondition>('IOC'); // Market defaults to IOC
    const [lastOrderSide, setLastOrderSide] = useState<OrderSide | null>(null);

    // Initialize limit price only once when switching to limit order
    const handleOrderTypeChange = useCallback((type: OrderType) => {
        if (type === 'limit') {
            if (orderType !== 'limit') {
                setLimitPrice(currentPrice);
            }
            setCondition('GTC'); // Limit defaults to GTC
        } else {
            setCondition('IOC'); // Market defaults to IOC
        }
        setOrderType(type);
    }, [orderType, currentPrice]);

    const effectivePrice = orderType === 'market' ? currentPrice : limitPrice;

    const maxQuantity = useMemo(() =>
        calculateMaxQuantity(availableBalance, effectivePrice, leverage),
        [availableBalance, effectivePrice, leverage]
    );

    const handlePercentageClick = useCallback((percent: number) => {
        const qty = calculateQuantityFromPercent(availableBalance, percent, effectivePrice, leverage);
        onQuantityChange(qty);
    }, [availableBalance, effectivePrice, leverage, onQuantityChange]);

    const handleMaxClick = useCallback(() => {
        onQuantityChange(maxQuantity);
    }, [maxQuantity, onQuantityChange]);

    const previewData: OrderPreviewData = useMemo(() => {
        const subtotal = Math.round(quantity * effectivePrice); // Round subtotal
        const side = lastOrderSide || 'buy';
        const commission = side === 'buy' ? calculateCommission(subtotal, commissionRate) : 0;
        const total = side === 'buy' ? subtotal + commission : subtotal;

        return {
            symbol,
            side,
            type: orderType,
            quantity,
            price: effectivePrice,
            subtotal,
            commission,
            total,
            availableBalance,
            isAffordable: total <= availableBalance * leverage,
        };
    }, [quantity, effectivePrice, orderType, symbol, availableBalance, leverage, lastOrderSide, commissionRate]);

    const handleBuy = useCallback(() => {
        if (quantity > 0 && previewData.isAffordable) {
            setLastOrderSide('buy');
            onSubmitOrder('buy', quantity, effectivePrice, leverage, orderType, condition);
            // quantity reset is handled by parent
        }
    }, [quantity, effectivePrice, leverage, orderType, onSubmitOrder, previewData.isAffordable]);

    const handleSell = useCallback(() => {
        if (quantity > 0) {
            setLastOrderSide('sell');
            onSubmitOrder('sell', quantity, effectivePrice, leverage, orderType, condition);
            // quantity reset is handled by parent
        }
    }, [quantity, effectivePrice, leverage, orderType, onSubmitOrder]);

    const canBuy = quantity > 0 && previewData.isAffordable;
    const canSell = quantity > 0;

    // Color based on theme
    const buyColor = isAsianTheme ? 'rose' : 'emerald';
    const sellColor = isAsianTheme ? 'emerald' : 'rose';

    return (
        <div className="space-y-4">
            {/* Order Type Selector */}
            <OrderTypeSelector
                value={orderType}
                onChange={handleOrderTypeChange}
                marketLabel={t.marketOrder}
                limitLabel={t.limitOrder}
            />

            {/* Quantity Input */}
            <QuantityInput
                value={quantity}
                onChange={onQuantityChange}
                maxQuantity={maxQuantity}
                currentPrice={effectivePrice}
                onPercentageClick={handlePercentageClick}
                onMaxClick={handleMaxClick}
                label={t.quantity}
                unit={t.shares}
                isOddLot={isOddLot}
            />

            {/* Limit Price (only for limit orders) */}
            {orderType === 'limit' && (
                <PriceInput
                    value={limitPrice}
                    onChange={setLimitPrice}
                    currentPrice={currentPrice}
                    label={t.limitPrice}
                    useCurrentLabel={t.useCurrentPrice}
                />
            )}

            {/* Leverage Slider */}
            <Slider
                value={leverage}
                onChange={setLeverage}
                min={1}
                max={CONFIG.MAX_LEVERAGE}
                step={1}
                label={t.leverage}
                unit="x"
            />

            {/* Order Condition Selector */}
            <div className="flex bg-zinc-900 border border-white/5 rounded p-1 gap-1">
                {(['GTC', 'IOC', 'FOK'] as OrderCondition[]).map((c) => (
                    <button
                        key={c}
                        onClick={() => setCondition(c)}
                        className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all duration-200 ${condition === c
                            ? 'bg-zinc-800 text-white border-white/10'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        {c === 'GTC' ? 'GTC (全成/掛)' : c === 'IOC' ? 'IOC (即成/其刪)' : 'FOK (全成或刪)'}
                    </button>
                ))}
            </div>

            {/* Buy/Sell Buttons */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={handleBuy}
                    disabled={!canBuy}
                    className={`py-4 rounded flex flex-col items-center justify-center gap-1 
                     transition-all duration-200 border relative overflow-hidden
                     ${!canBuy
                            ? 'opacity-40 cursor-not-allowed bg-zinc-800 border-transparent'
                            : `bg-${buyColor}-600/10 hover:bg-${buyColor}-600/20 text-${buyColor}-500 border-transparent hover:border-${buyColor}-500/50`
                        }
                     ${aiRecommendation === 'LONG'
                            ? `border-${buyColor}-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]`
                            : ''
                        }`}
                    style={{
                        backgroundColor: canBuy ? (isAsianTheme ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)') : undefined,
                        borderColor: aiRecommendation === 'LONG' ? (isAsianTheme ? '#f43f5e' : '#10b981') : undefined,
                    }}
                >
                    {aiRecommendation === 'LONG' && (
                        <div
                            className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                            style={{ background: `linear-gradient(to right, transparent, ${isAsianTheme ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.2)'}, transparent)` }}
                        />
                    )}
                    <TrendingUp
                        size={18}
                        style={{ color: isAsianTheme ? '#fb7185' : '#34d399' }}
                    />
                    <span className="text-xs font-black relative z-10" style={{ color: isAsianTheme ? '#fb7185' : '#34d399' }}>{t.buy}</span>
                </button>

                <button
                    onClick={handleSell}
                    disabled={!canSell}
                    className={`py-4 rounded flex flex-col items-center justify-center gap-1 
                     transition-all duration-200 border relative overflow-hidden
                     ${!canSell
                            ? 'opacity-40 cursor-not-allowed bg-zinc-800 border-transparent'
                            : ''
                        }`}
                    style={{
                        backgroundColor: canSell ? (isAsianTheme ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)') : undefined,
                        borderColor: aiRecommendation === 'SHORT' ? (isAsianTheme ? '#10b981' : '#f43f5e') : undefined,
                    }}
                >
                    {aiRecommendation === 'SHORT' && (
                        <div
                            className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                            style={{ background: `linear-gradient(to right, transparent, ${isAsianTheme ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}, transparent)` }}
                        />
                    )}
                    <TrendingDown
                        size={18}
                        style={{ color: isAsianTheme ? '#34d399' : '#fb7185' }}
                    />
                    <span className="text-xs font-black relative z-10" style={{ color: isAsianTheme ? '#34d399' : '#fb7185' }}>{t.sell}</span>
                </button>
            </div>

            {/* Order Preview - Always render for layout stability */}
            <OrderPreview
                data={previewData}
                title={t.orderPreview}
                commissionRate={commissionRate}
                labels={{
                    symbol: '股票',
                    quantity: '數量',
                    price: '預估價格',
                    subtotal: '小計',
                    commission: '手續費',
                    total: '預估總額',
                    available: '可用餘額',
                }}
            />
        </div>
    );
}
