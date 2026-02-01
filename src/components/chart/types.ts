// Chart-related type definitions

export interface ChartDimensions {
    width: number;
    height: number;
    padding: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
}

export interface ChartScale {
    priceMin: number;
    priceMax: number;
    priceRange: number;
    volumeMax: number;
    candleWidth: number;
    candleGap: number;
}

export interface ChartColors {
    background: string;
    grid: string;
    text: string;
    bullish: string;
    bearish: string;
    volume: string;
    volumeBullish: string;
    volumeBearish: string;
    ma7: string;
    ma25: string;
    priceLine: string;
    crosshair: string;
}

export interface ChartConfig {
    dimensions: ChartDimensions;
    colors: ChartColors;
    showVolume: boolean;
    showMA: boolean;
    showGrid: boolean;
    showCrosshair: boolean;
    volumeHeight: number; // percentage of chart height
    maPeriods: number[];
}

export interface CrosshairData {
    x: number;
    y: number;
    visible: boolean;
    candleIndex: number | null;
}

export interface TooltipData {
    visible: boolean;
    x: number;
    y: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
    change: number;
    changePercent: number;
}
