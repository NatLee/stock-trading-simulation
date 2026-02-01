'use client';

interface SliderProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    showValue?: boolean;
    unit?: string;
    disabled?: boolean;
}

export function Slider({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    label,
    showValue = true,
    unit = '',
    disabled,
}: SliderProps) {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className="space-y-2">
            {(label || showValue) && (
                <div className="flex justify-between text-xs">
                    {label && (
                        <span className="font-bold text-zinc-400 uppercase tracking-wider">
                            {label}
                        </span>
                    )}
                    {showValue && (
                        <span className="font-bold text-yellow-500">
                            {value}{unit}
                        </span>
                    )}
                </div>
            )}

            <div className="relative">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    disabled={disabled}
                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500
                   disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        background: `linear-gradient(to right, rgb(99 102 241) 0%, rgb(99 102 241) ${percentage}%, rgb(63 63 70) ${percentage}%, rgb(63 63 70) 100%)`,
                    }}
                />
            </div>
        </div>
    );
}
