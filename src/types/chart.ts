// Chart-related type definitions

export interface ChartConfig {
    width: number;
    height: number;
    paddingRight: number;
    viewCount: number;       // 顯示的K線數量
    gridLineCount: number;
    fontSize: number;
    candleWidth: number;
    showMA: boolean;
    showFib: boolean;
    maPeriod: number;
}

export interface ChartTheme {
    background: string;
    gridLine: string;
    textPrimary: string;
    textSecondary: string;
    bullish: string;        // 上漲顏色 (綠)
    bearish: string;        // 下跌顏色 (紅)
    volumeBullish: string;
    volumeBearish: string;
    maLine: string;
    fibLine: string;
    fibHighlight: string;
    priceLine: string;
    positionLine: string;
}

export interface CandleRenderData {
    x: number;
    yOpen: number;
    yClose: number;
    yHigh: number;
    yLow: number;
    width: number;
    isGreen: boolean;
}

// Mouse/Touch interaction state
export interface ChartInteraction {
    hoveredCandleIndex: number | null;
    hoveredPrice: number | null;
    isHovering: boolean;
}
