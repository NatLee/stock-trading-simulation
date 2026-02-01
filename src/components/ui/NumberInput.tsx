'use client';

import { useState, useCallback, useEffect, InputHTMLAttributes, forwardRef } from 'react';
import { Minus, Plus, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: number;
    onChange: (value: number) => void;
    step?: number;
    largeStep?: number;
    min?: number;
    max?: number;
    label?: string;
    unit?: string;
    showStepButtons?: boolean;
    quickPercentages?: number[];
    maxValue?: number;
    onPercentageClick?: (percent: number) => void;
    onMaxClick?: () => void;
    doubleArrowMode?: 'step' | 'maxMin';
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
    ({
        value,
        onChange,
        step = 1,
        largeStep,
        min = 0,
        max = Infinity,
        label,
        unit,
        showStepButtons = true,
        quickPercentages,
        onPercentageClick,
        onMaxClick,
        doubleArrowMode = 'step',
        disabled,
        className = '',
        ...props
    }, ref) => {
        const [inputValue, setInputValue] = useState(value.toString());

        useEffect(() => {
            setInputValue(value.toString());
        }, [value]);

        const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            const rawValue = e.target.value;
            setInputValue(rawValue);

            const numValue = parseFloat(rawValue);
            if (!isNaN(numValue)) {
                const clampedValue = Math.min(Math.max(numValue, min), max);
                onChange(clampedValue);
            }
        }, [onChange, min, max]);

        const handleBlur = useCallback(() => {
            setInputValue(value.toString());
        }, [value]);

        const handleStep = useCallback((amount: number) => {
            // Fix double precision (e.g. 1.1 + 0.1 = 1.200000002)
            // Determine precision from step or amount
            const precision = amount.toString().split('.')[1]?.length || 0;
            const stepPrecision = step.toString().split('.')[1]?.length || 0;
            const maxPrecision = Math.max(precision, stepPrecision);

            // Calculate raw value then round
            const rawNewValue = value + amount;
            const roundedValue = parseFloat(rawNewValue.toFixed(maxPrecision));

            const newValue = Math.min(Math.max(roundedValue, min), max);
            onChange(newValue);
            setInputValue(newValue.toString());
        }, [value, min, max, onChange, step]);

        const handleMaxMin = useCallback((target: 'max' | 'min') => {
            const newValue = target === 'max' ? max : min;
            onChange(newValue);
            setInputValue(newValue.toString());
        }, [max, min, onChange]);

        // Show double arrows if largeStep is defined OR mode is maxMin
        const showDoubleArrows = showStepButtons && (largeStep !== undefined || doubleArrowMode === 'maxMin');

        return (
            <div className={`space-y-2 ${className}`}>
                {label && (
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        {label}
                    </label>
                )}

                <div className="flex items-stretch gap-px">
                    {/* Large Step Down / Min */}
                    {showDoubleArrows && (
                        <button
                            type="button"
                            onClick={() => doubleArrowMode === 'maxMin' ? handleMaxMin('min') : handleStep(-(largeStep || step * 10))}
                            disabled={disabled || value <= min}
                            className="px-2 bg-zinc-800 border border-zinc-700 rounded-l
                                   hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed
                                   transition-colors text-zinc-500 hover:text-zinc-300"
                        >
                            <ChevronsLeft size={14} />
                        </button>
                    )}

                    {showStepButtons && (
                        <button
                            type="button"
                            onClick={() => handleStep(-step)}
                            disabled={disabled || value <= min}
                            className={`px-3 bg-zinc-800 border border-zinc-700 
                                   hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed
                                   transition-colors ${showDoubleArrows ? '' : 'rounded-l border-r-0'}`}
                        >
                            <Minus size={14} className="text-zinc-400" />
                        </button>
                    )}

                    <div className="relative flex-1">
                        <input
                            ref={ref}
                            type="number"
                            value={inputValue}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            disabled={disabled}
                            className={`
                                w-full px-3 py-2.5 text-center font-mono font-bold text-white
                                bg-zinc-900 border border-zinc-700
                                focus:outline-none focus:border-indigo-500
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${showStepButtons ? '' : 'rounded'}
                                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                            `}
                            {...props}
                        />
                        {unit && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                                {unit}
                            </span>
                        )}
                    </div>

                    {showStepButtons && (
                        <button
                            type="button"
                            onClick={() => handleStep(step)}
                            disabled={disabled || value >= max}
                            className={`px-3 bg-zinc-800 border border-zinc-700 
                                   hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed
                                   transition-colors ${showDoubleArrows ? '' : 'rounded-r border-l-0'}`}
                        >
                            <Plus size={14} className="text-zinc-400" />
                        </button>
                    )}

                    {/* Large Step Up / Max */}
                    {showDoubleArrows && (
                        <button
                            type="button"
                            onClick={() => doubleArrowMode === 'maxMin' ? handleMaxMin('max') : handleStep(largeStep || step * 10)}
                            disabled={disabled || value >= max}
                            className="px-2 bg-zinc-800 border border-zinc-700 rounded-r
                                   hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed
                                   transition-colors text-zinc-500 hover:text-zinc-300"
                        >
                            <ChevronsRight size={14} />
                        </button>
                    )}
                </div>

                {(quickPercentages || onMaxClick) && (
                    <div className="flex gap-2">
                        {quickPercentages?.map((percent) => (
                            <button
                                key={percent}
                                type="button"
                                onClick={() => onPercentageClick?.(percent)}
                                disabled={disabled}
                                className="flex-1 py-1.5 text-xs font-bold text-zinc-400
                                     bg-zinc-800 border border-zinc-700 rounded
                                     hover:bg-zinc-700 hover:text-zinc-200
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     transition-colors"
                            >
                                {percent}%
                            </button>
                        ))}
                        {onMaxClick && (
                            <button
                                type="button"
                                onClick={onMaxClick}
                                disabled={disabled}
                                className="flex-1 py-1.5 text-xs font-bold text-amber-500
                                     bg-amber-500/10 border border-amber-500/30 rounded
                                     hover:bg-amber-500/20
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     transition-colors"
                            >
                                MAX
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

NumberInput.displayName = 'NumberInput';
