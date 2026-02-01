'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Asian default: Red = up, Green = down
// Western: Green = up, Red = down

interface ColorTheme {
    bullish: string;
    bearish: string;
    bullishBg: string;
    bearishBg: string;
    isAsianTheme: boolean;
}

const ASIAN_THEME: ColorTheme = {
    bullish: 'text-rose-500',
    bearish: 'text-emerald-500',
    bullishBg: 'bg-rose-500',
    bearishBg: 'bg-emerald-500',
    isAsianTheme: true,
};

const WESTERN_THEME: ColorTheme = {
    bullish: 'text-emerald-500',
    bearish: 'text-rose-500',
    bullishBg: 'bg-emerald-500',
    bearishBg: 'bg-rose-500',
    isAsianTheme: false,
};

interface ColorThemeContextType {
    theme: ColorTheme;
    toggleTheme: () => void;
    getColor: (isPositive: boolean) => string;
    getBgColor: (isPositive: boolean) => string;
    getHexColor: (isPositive: boolean) => string;
}

const ColorThemeContext = createContext<ColorThemeContextType | null>(null);

export function ColorThemeProvider({ children }: { children: ReactNode }) {
    const [isAsian, setIsAsian] = useState(true); // Default to Asian (up=red)

    const theme = isAsian ? ASIAN_THEME : WESTERN_THEME;

    const toggleTheme = () => setIsAsian(!isAsian);

    const getColor = (isPositive: boolean) =>
        isPositive ? theme.bullish : theme.bearish;

    const getBgColor = (isPositive: boolean) =>
        isPositive ? theme.bullishBg : theme.bearishBg;

    const getHexColor = (isPositive: boolean) => {
        if (isAsian) {
            return isPositive ? '#f43f5e' : '#10b981'; // rose-500, emerald-500
        }
        return isPositive ? '#10b981' : '#f43f5e'; // emerald-500, rose-500
    };

    return (
        <ColorThemeContext.Provider value={{ theme, toggleTheme, getColor, getBgColor, getHexColor }}>
            {children}
        </ColorThemeContext.Provider>
    );
}

export function useColorTheme() {
    const ctx = useContext(ColorThemeContext);
    if (!ctx) {
        // Fallback for components outside provider
        return {
            theme: ASIAN_THEME,
            toggleTheme: () => { },
            getColor: (isPositive: boolean) => isPositive ? 'text-rose-500' : 'text-emerald-500',
            getBgColor: (isPositive: boolean) => isPositive ? 'bg-rose-500' : 'bg-emerald-500',
            getHexColor: (isPositive: boolean) => isPositive ? '#f43f5e' : '#10b981',
        };
    }
    return ctx;
}
