'use client';

import { NumberInput } from '@/components/ui';

interface QuantityInputProps {
    value: number;
    onChange: (value: number) => void;
    maxQuantity: number;
    currentPrice: number;
    onPercentageClick: (percent: number) => void;
    onMaxClick: () => void;
    label: string;
    unit: string;
    disabled?: boolean;
    isOddLot?: boolean;
}

export function QuantityInput({
    value,
    onChange,
    maxQuantity,
    currentPrice,
    onPercentageClick,
    onMaxClick,
    label,
    unit,
    disabled,
    isOddLot = false,
}: QuantityInputProps) {
    const estimatedTotal = value * currentPrice;

    // Logic for Standard Mode (Zhang/Lots) vs Odd Lot (Shares)
    // If Standard: 1 Unit = 1000 Shares. Value passed in is Shares.
    const displayValue = isOddLot ? value : Math.floor(value / 1000);
    const displayMax = isOddLot ? maxQuantity : Math.floor(maxQuantity / 1000);

    // Step configuration
    const step = 1; // Always 1 (either 1 share or 1 lot)
    const largeStep = isOddLot ? 100 : undefined; // Standard mode uses Max/Min instead of large step
    const doubleArrowMode = isOddLot ? 'step' : 'maxMin';
    const displayUnit = isOddLot ? unit : '張';

    const handleDisplayChange = (newVal: number) => {
        if (isOddLot) {
            onChange(newVal);
        } else {
            onChange(newVal * 1000);
        }
    };

    return (
        <div className="space-y-2">
            <NumberInput
                value={displayValue}
                onChange={handleDisplayChange}
                min={0}
                max={displayMax}
                step={step}
                largeStep={largeStep}
                label={label}
                unit={displayUnit}
                showStepButtons={true}
                quickPercentages={[25, 50, 75]}
                onPercentageClick={onPercentageClick}
                onMaxClick={onMaxClick}
                disabled={disabled}
                doubleArrowMode={doubleArrowMode}
            />

            {value > 0 && (
                <div className="text-xs text-zinc-500 font-mono text-right">
                    預估金額: <span className="text-zinc-300">${estimatedTotal.toLocaleString()}</span>
                    {!isOddLot && <span className="ml-2 text-zinc-600">({value.toLocaleString()} 股)</span>}
                </div>
            )}
        </div>
    );
}
