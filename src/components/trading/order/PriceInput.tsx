import { NumberInput } from '@/components/ui';

interface PriceInputProps {
    value: number;
    onChange: (value: number) => void;
    currentPrice: number;
    label: string;
    useCurrentLabel: string;
    disabled?: boolean;
}

export function PriceInput({
    value,
    onChange,
    currentPrice,
    label,
    useCurrentLabel,
    disabled,
}: PriceInputProps) {
    const handleUseCurrent = () => {
        onChange(currentPrice);
    };

    return (
        <div className="space-y-2">
            <NumberInput
                value={value}
                onChange={onChange}
                min={0}
                step={0.1}
                largeStep={1}
                label={label}
                disabled={disabled}
                showStepButtons={true}
            />

            <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-zinc-500 font-mono">
                    當前價: <span className="text-zinc-300">${currentPrice.toFixed(2)}</span>
                </span>
                <button
                    type="button"
                    onClick={handleUseCurrent}
                    disabled={disabled}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {useCurrentLabel}
                </button>
            </div>
        </div>
    );
}
