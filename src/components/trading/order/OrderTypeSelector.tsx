'use client';

import { OrderType } from '@/types';

interface OrderTypeSelectorProps {
    value: OrderType;
    onChange: (type: OrderType) => void;
    marketLabel: string;
    limitLabel: string;
    disabled?: boolean;
}

export function OrderTypeSelector({
    value,
    onChange,
    marketLabel,
    limitLabel,
    disabled,
}: OrderTypeSelectorProps) {
    return (
        <div className="flex gap-2">
            <button
                type="button"
                onClick={() => onChange('market')}
                disabled={disabled}
                className={`flex-1 py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded
                   transition-all duration-200
                   ${value === 'market'
                        ? 'bg-indigo-600 text-white border border-indigo-500'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                    }
                   disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {marketLabel}
            </button>
            <button
                type="button"
                onClick={() => onChange('limit')}
                disabled={disabled}
                className={`flex-1 py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded
                   transition-all duration-200
                   ${value === 'limit'
                        ? 'bg-indigo-600 text-white border border-indigo-500'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                    }
                   disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {limitLabel}
            </button>
        </div>
    );
}
