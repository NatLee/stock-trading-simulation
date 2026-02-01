// TradingView 風格圖表類型定義

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

export interface ChartColors {
    background: string;
    grid: string;
    text: string;
    textMuted: string;
    bullish: string;
    bearish: string;
    line: string;
    crosshair: string;
    support: string;
    resistance: string;
    profitZone: string;
    lossZone: string;
    neutralZone: string;
}

export interface ChartScale {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    xRange: number;
    yRange: number;
}

// K線數據
export interface CandleDataExtended {
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    label?: string;
}

// 線圖數據點
export interface DataPoint {
    x: number;
    y: number;
    label?: string;
}

// 標記類型
export type MarkerType = 'buy' | 'sell' | 'stopLoss' | 'takeProfit' | 'info';

// 標記數據
export interface ChartMarker {
    x: number;
    y: number;
    type: MarkerType;
    label: string;
}

// 參考線類型
export type LineType = 'support' | 'resistance' | 'trendline' | 'ma';

// 參考線數據
export interface ChartLine {
    type: LineType;
    y?: number;
    points?: { x: number; y: number }[];
    label?: string;
    color?: string;
}

// 區域填充類型
export type ZoneType = 'profit' | 'loss' | 'neutral';

// 區域數據
export interface ChartZone {
    type: ZoneType;
    yStart: number;
    yEnd: number;
    label?: string;
}

// K線標註
export interface CandleAnnotation {
    index: number;
    text: string;
    position: 'top' | 'bottom';
}

// 十字準星數據
export interface CrosshairData {
    x: number;
    y: number;
    visible: boolean;
    dataIndex: number | null;
    price: number | null;
}

// 工具提示數據
export interface TooltipData {
    visible: boolean;
    x: number;
    y: number;
    content: {
        label?: string;
        price?: number;
        open?: number;
        high?: number;
        low?: number;
        close?: number;
        change?: number;
        changePercent?: number;
        marker?: ChartMarker;
    };
}

// 圖表配置
export interface ChartConfig {
    showGrid: boolean;
    showCrosshair: boolean;
    showTooltip: boolean;
    showYAxis: boolean;
    showXAxis: boolean;
    animated?: boolean;
}

// K線圖 Props
export interface CandlestickChartProps {
    candles: CandleDataExtended[];
    annotations?: CandleAnnotation[];
    config?: Partial<ChartConfig>;
    width?: number;
    height?: number;
    className?: string;
}

// 線圖 Props
export interface LineChartProps {
    points: DataPoint[];
    markers?: ChartMarker[];
    lines?: ChartLine[];
    zones?: ChartZone[];
    config?: Partial<ChartConfig>;
    width?: number;
    height?: number;
    className?: string;
}

// 預設配色
export const DEFAULT_COLORS: ChartColors = {
    background: '#18181b',
    grid: '#27272a',
    text: '#a1a1aa',
    textMuted: '#52525b',
    bullish: '#10b981',
    bearish: '#ef4444',
    line: '#6366f1',
    crosshair: '#71717a',
    support: '#10b981',
    resistance: '#ef4444',
    profitZone: 'rgba(16, 185, 129, 0.15)',
    lossZone: 'rgba(239, 68, 68, 0.15)',
    neutralZone: 'rgba(113, 113, 122, 0.15)',
};

// 預設配置
export const DEFAULT_CONFIG: ChartConfig = {
    showGrid: true,
    showCrosshair: true,
    showTooltip: true,
    showYAxis: true,
    showXAxis: true,
    animated: false,
};

// 標記樣式
export const MARKER_STYLES: Record<MarkerType, { color: string; icon: string; label: string }> = {
    buy: { color: '#10b981', icon: '▲', label: '買進' },
    sell: { color: '#ef4444', icon: '▼', label: '賣出' },
    stopLoss: { color: '#f97316', icon: '✕', label: '停損' },
    takeProfit: { color: '#06b6d4', icon: '◎', label: '停利' },
    info: { color: '#a855f7', icon: '●', label: '資訊' },
};
