'use client';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
    return (
        <label className={`inline-flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="relative">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                    className="sr-only"
                />
                <div className={`w-10 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-zinc-700'}`}>
                    <div
                        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                </div>
            </div>
            {label && (
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    {label}
                </span>
            )}
        </label>
    );
}
