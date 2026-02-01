import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    title?: string;
    headerRight?: ReactNode;
}

export function Card({ children, className = '', title, headerRight }: CardProps) {
    return (
        <div className={`bg-zinc-900 border border-zinc-800 rounded-sm ${className}`}>
            {(title || headerRight) && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
                    {title && (
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                            {title}
                        </span>
                    )}
                    {headerRight}
                </div>
            )}
            {children}
        </div>
    );
}

interface CardContentProps {
    children: ReactNode;
    className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
    return (
        <div className={`p-4 ${className}`}>
            {children}
        </div>
    );
}
