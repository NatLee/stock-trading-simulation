// 課程內容區塊類型
export type ContentBlock =
    | { type: 'paragraph'; text: string; highlights?: { text: string; color: string }[] }
    | { type: 'heading'; text: string; level?: 3 | 4 }
    | { type: 'list'; items: string[]; ordered?: boolean; color?: string }
    | { type: 'highlight-box'; title: string; color: string; items?: string[]; text?: string; icon?: string }
    | { type: 'grid'; columns: 2; items: GridItem[] }
    | { type: 'info-card'; title: string; description: string; icon?: string; subtext?: string }
    | { type: 'table'; headers: string[]; rows: string[][] }
    | { type: 'code-block'; title?: string; lines: { label?: string; value: string; color?: string }[] }
    | { type: 'key-value-list'; title?: string; items: { key: string; value: string; keyColor?: string }[] }
    | { type: 'gradient-bar'; leftLabel: string; rightLabel: string; middleLabel?: string; markers?: string[] }
    | { type: 'comparison-grid'; items: { title: string; description: string; color: string; subtext?: string; icon?: string }[] }
    // 範例區塊類型
    | { type: 'candlestick-example'; title: string; candles: CandleData[]; description?: string; annotations?: CandleAnnotation[] }
    | { type: 'trade-example'; title: string; scenario: TradeScenario; explanation?: string }
    | { type: 'indicator-example'; title: string; indicator: string; values: IndicatorValue[]; interpretation: string }
    | { type: 'quiz-example'; question: string; options: QuizOption[]; explanation: string }
    | { type: 'calculation-example'; title: string; steps: CalculationStep[]; result: { label: string; value: string; color?: string } }
    // 線圖範例
    | { type: 'line-chart-example'; title: string; data: LineChartData; description?: string }
    // 組合圖範例（K線 + 線圖雙視角）
    | { type: 'combo-chart-example'; title: string; candles: CandleData[]; lineData?: LineChartData; annotations?: CandleAnnotation[]; description?: string };

export interface GridItem {
    title: string;
    description?: string;
    color: string;
    icon?: string;
    subtext?: string;
}

// K線範例資料
export interface CandleData {
    open: number;
    high: number;
    low: number;
    close: number;
    label?: string; // 如 "Day 1", "9:00"
}

export interface CandleAnnotation {
    index: number;
    text: string;
    position: 'top' | 'bottom';
}

// 交易範例資料
export interface TradeScenario {
    action: 'buy' | 'sell';
    entryPrice: number;
    exitPrice?: number;
    quantity: number;
    stopLoss?: number;
    takeProfit?: number;
    fees?: number;
    result?: {
        profit: number;
        percentage: number;
    };
}

// 指標範例資料
export interface IndicatorValue {
    label: string;
    value: number | string;
    signal?: 'bullish' | 'bearish' | 'neutral';
}

// 測驗選項
export interface QuizOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

// 計算步驟
export interface CalculationStep {
    label: string;
    formula?: string;
    value: string;
    highlight?: boolean;
}

// 線圖資料
export interface LineChartData {
    points: LineChartPoint[];
    markers?: LineChartMarker[];
    lines?: LineChartLine[];
    zones?: LineChartZone[];
}

export interface LineChartPoint {
    x: number; // 0-based index or time
    y: number; // price
    label?: string; // x-axis label
}

export interface LineChartMarker {
    x: number;
    y: number;
    type: 'buy' | 'sell' | 'stopLoss' | 'takeProfit' | 'info';
    label: string;
}

export interface LineChartLine {
    type: 'support' | 'resistance' | 'trendline' | 'ma';
    y?: number; // for horizontal lines
    points?: { x: number; y: number }[]; // for diagonal lines
    label?: string;
    color?: string;
}

export interface LineChartZone {
    type: 'profit' | 'loss' | 'neutral';
    yStart: number;
    yEnd: number;
    label?: string;
}

// 子單元類型
export interface SubLessonData {
    id: string;
    title: string;
    content: ContentBlock[];
}

// 課程類型
export interface LessonData {
    id: string;
    title: string;
    description: string;
    duration: string;
    content: ContentBlock[];
    subLessons?: SubLessonData[]; // 可選的子單元
}

export interface CourseData {
    id: string;
    title: string;
    description: string;
    icon: string; // icon name from lucide-react
    color: string;
    lessons: LessonData[];
}

// 顏色類型
export type ColorName = 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple' | 'zinc';
