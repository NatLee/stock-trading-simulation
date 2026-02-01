// Internationalization translations

export const TRANSLATIONS = {
    en: {
        // Header
        title: "GILBERT X PRO",
        equity: "ASSETS",
        pnl: "UNREALIZED PNL",

        // Chart
        ma: "MA LINES",
        fib: "FIB LEVELS",
        pair: "NATLEE (7777)",

        // Order Form
        orderType: "ORDER TYPE",
        marketOrder: "MARKET",
        limitOrder: "LIMIT",
        quantity: "QUANTITY",
        shares: "shares",
        price: "PRICE",
        limitPrice: "LIMIT PRICE",
        useCurrentPrice: "USE CURRENT",
        leverage: "LEVERAGE",

        // Quick buttons
        quickAmount: "QUICK AMOUNT",
        max: "MAX",

        // Order Preview
        orderPreview: "ORDER PREVIEW",
        estimatedPrice: "Est. Price",
        estimatedTotal: "Est. Total",
        commission: "Commission",
        availableBalance: "Available",

        // Trade Actions
        buy: "BUY / LONG",
        sell: "SELL / SHORT",
        close: "CLOSE POSITION",
        entry: "AVG COST",

        // AI
        terminalTitle: "AI STRATEGY LOG",
        processing: "CALCULATING",
        scanIdle: "RUN AI SCAN",
        scanRunning: "SCANNING...",
        recommended: "AI SIGNAL",

        // Market Stats
        marketVitals: "MARKET VITALS",
        sentiment: "SENTIMENT",
        h24: "24h High",
        l24: "24h Low",

        // Trade Records
        tradeRecords: "TRADE RECORDS",
        viewAll: "VIEW ALL",
        time: "TIME",
        type: "TYPE",
        qty: "QTY",
        entryPrice: "ENTRY",
        exitPrice: "EXIT",
        pnlLabel: "P&L",
        holding: "HOLDING",
        todayPerformance: "TODAY",

        // Actions
        reset: "RESET SYSTEM",
        confirm: "CONFIRM",
        cancel: "CANCEL",

        // Logs
        logReady: "Market Data Stream Connected.",
        logInit: "Analyzing NATLEE(7777) Ticker...",
        logMap: "Checking Institutional Order Flow...",
        logCalc: "Calculating RSI Divergence...",
        logSignal: "SIGNAL DETECTED",
        logFilled: "ORDER EXECUTED",
        logClosed: "POSITION CLOSED",
        logReset: "SYSTEM REBOOTED.",
        logWarn: "SYSTEM WARNING: ANOMALY DETECTED",

        // Regimes
        regimeBull: "REGIME: BULL MARKET",
        regimeBear: "REGIME: BEAR MARKET",
        regimeChop: "REGIME: CHOPPY / RANGE",

        // Scenarios & Tags
        tagBreakout: "BREAKOUT", descBreakout: "VOLATILITY BREAKOUT", explBreakout: "Price breaking resistance.",
        tagDoubleBottom: "W-BOTTOM", descDoubleBottom: "DOUBLE BOTTOM", explDoubleBottom: "Bullish reversal confirmed.",
        tagCupHandle: "CUP & HANDLE", descCupHandle: "CUP & HANDLE", explCupHandle: "Continuation pattern detected.",
        tagPump: "PUMP", descPump: "MOMENTUM SPIKE", explPump: "Aggressive buying detected.",
        tagDoubleTop: "M-TOP", descDoubleTop: "DOUBLE TOP", explDoubleTop: "Bearish reversal confirmed.",
        tagHeadShoulders: "H&S TOP", descHeadShoulders: "HEAD & SHOULDERS", explHeadShoulders: "Trend reversal imminent.",
        tagBleed: "BLEED", descBleed: "SLOW BLEED", explBleed: "Support failing slowly.",
        tagBart: "BART", descBart: "LIQUIDITY TRAP", explBart: "High volatility manipulation.",
        tagSavior: "OVERSOLD", descSavior: "OVERSOLD BOUNCE", explSavior: "Technical rebound expected.",
        tagCrash: "CRASH", evtCrash: "FLASH CRASH", explCrash: "Liquidity crisis detected.",
        tagNews: "NEWS", evtNews: "NEWS SPIKE", explNews: "Positive news catalyst.",
        tagWhale: "CHOP", evtWhale: "WHALE ACTIVITY", explWhale: "High volatility range.",
        tagGod: "GOD CANDLE", descGod: "INSTITUTIONAL BUYING", explGod: "Massive volume injection.",
        tagSqueeze: "SQUEEZE", descSqueeze: "SHORT SQUEEZE", explSqueeze: "Shorts forced to cover.",
        tagDeadCat: "DEAD CAT", descDeadCat: "DEAD CAT BOUNCE", explDeadCat: "Temporary recovery before fall.",
        tagStairsUp: "UPTREND", descStairsUp: "STAIRCASE UP", explStairsUp: "Steady algorithmic buying.",
        tagStairsDown: "DOWNTREND", descStairsDown: "STAIRCASE DOWN", explStairsDown: "Steady algorithmic selling.",

        // AI Messages
        aiPattern: "PATTERN",
        aiHighVol: "HIGH VOLATILITY",
        aiUncertain: "UNCERTAIN",
        aiStrongMom: "STRONG MOMENTUM",
        aiTrendFollow: "TREND FOLLOWING",
        aiBearStruct: "BEARISH STRUCTURE",
        aiWeakness: "WEAKNESS DETECTED",
        aiScalp: "SCALPING OPPORTUNITY",
        aiQuickScalp: "QUICK SCALP",
        aiOversold: "OVERSOLD ZONE",
        aiPumpExhaust: "PUMP EXHAUSTION",
        aiMarketUnclear: "MARKET UNCLEAR, HOLD.",
        aiSignal: "AI SIGNAL",
    },
    zh: {
        // Header
        title: "GILBERT X 量化交易",
        equity: "總資產 (Assets)",
        pnl: "未實現損益 (PnL)",

        // Chart
        ma: "均線 (MA)",
        fib: "黃金分割 (Fib)",
        pair: "NATLEE (7777)",

        // Order Form
        orderType: "訂單類型",
        marketOrder: "市價單",
        limitOrder: "限價單",
        quantity: "數量",
        shares: "股",
        price: "價格",
        limitPrice: "限價",
        useCurrentPrice: "使用當前價",
        leverage: "融資槓桿",

        // Quick buttons
        quickAmount: "快速選擇",
        max: "最大",

        // Order Preview
        orderPreview: "訂單預覽",
        estimatedPrice: "預估價格",
        estimatedTotal: "預估總額",
        commission: "手續費",
        availableBalance: "可用餘額",

        // Trade Actions
        buy: "買進 (做多)",
        sell: "賣出 (放空)",
        close: "平倉",
        entry: "持有成本",

        // AI
        terminalTitle: "AI 策略日誌",
        processing: "運算中",
        scanIdle: "啟動 AI 診斷",
        scanRunning: "全盤掃描中...",
        recommended: "AI 強力建議",

        // Market Stats
        marketVitals: "市場即時概況",
        sentiment: "多空情緒",
        h24: "24h 最高",
        l24: "24h 最低",

        // Trade Records
        tradeRecords: "交易記錄",
        viewAll: "查看全部",
        time: "時間",
        type: "類型",
        qty: "數量",
        entryPrice: "買入價",
        exitPrice: "賣出價",
        pnlLabel: "盈虧",
        holding: "持有中",
        todayPerformance: "今日績效",

        // Actions
        reset: "系統重置",
        confirm: "確認",
        cancel: "取消",

        // Logs
        logReady: "行情數據串流已連線...",
        logInit: "正在分析 NATLEE(7777) 盤勢...",
        logMap: "檢測主力籌碼流向...",
        logCalc: "計算 RSI 背離訊號...",
        logSignal: "AI 捕捉訊號",
        logFilled: "委託已成交",
        logClosed: "已平倉出場",
        logReset: "系統已重置，清除所有緩存。",
        logWarn: "系統警示：監測到異常數據波動...",

        // Regimes
        regimeBull: "當前週期：牛市 (Bull)",
        regimeBear: "當前週期：熊市 (Bear)",
        regimeChop: "當前週期：震盪 (Choppy)",

        // Scenarios
        tagBreakout: "黃金交叉", descBreakout: "多頭突破確認", explBreakout: "【教學】均線向上發散，動能轉強。",
        tagDoubleBottom: "W 底成型", descDoubleBottom: "W 底確認", explDoubleBottom: "【教學】兩次探底不破，頸線突破。",
        tagCupHandle: "杯柄型態", descCupHandle: "杯柄型突破", explCupHandle: "【教學】洗盤結束，主力鎖碼。",
        tagPump: "主力吃貨", descPump: "巨鯨大單敲進", explPump: "【教學】底部爆量，主力吸籌。",
        tagDoubleTop: "M 頭成型", descDoubleTop: "M 頭反轉", explDoubleTop: "【教學】高檔壓力沉重，買盤力竭。",
        tagHeadShoulders: "頭肩頂", descHeadShoulders: "頭肩頂型態", explHeadShoulders: "【教學】右肩反彈無力，空方確立。",
        tagBleed: "陰跌不止", descBleed: "空方抵抗", explBleed: "【教學】多頭棄守，支撐位失效。",
        tagBart: "巴特圖", descBart: "巴特型態 (誘多)", explBart: "【警示】急漲後橫盤，提防崩跌。",
        tagSavior: "超跌反彈", descSavior: "乖離率過大", explSavior: "【AI護盤】嚴重超跌，搶反彈。",
        tagCrash: "閃崩警報", evtCrash: "CRITICAL：市場閃崩", explCrash: "【系統】流動性枯竭，請注意風險。",
        tagNews: "突發利多", evtNews: "快訊：重磅消息", explNews: "【系統】利多政策發布，程式單追價。",
        tagWhale: "多空激戰", evtWhale: "巨鯨對決", explWhale: "【系統】關鍵價位多空互掛大單。",
        tagGod: "神之燭", descGod: "機構進場", explGod: "【訊號】爆量長紅，主力不計價買進。",
        tagSqueeze: "軋空秀", descSqueeze: "強勢軋空", explSqueeze: "【訊號】空頭停損踩踏，價格噴出。",
        tagDeadCat: "死貓跳", descDeadCat: "死貓反彈", explDeadCat: "【警示】弱勢反彈，逃命波。",
        tagStairsUp: "階梯上漲", descStairsUp: "階梯式多頭", explStairsUp: "【趨勢】量化程式單穩定推升。",
        tagStairsDown: "階梯下跌", descStairsDown: "階梯式空頭", explStairsDown: "【趨勢】量化程式單穩定出貨。",

        // AI Messages
        aiPattern: "型態識別",
        aiHighVol: "高波動警示",
        aiUncertain: "方向不明",
        aiStrongMom: "動能強勁",
        aiTrendFollow: "順勢交易",
        aiBearStruct: "空頭結構",
        aiWeakness: "走勢疲弱",
        aiScalp: "短線頭皮單",
        aiQuickScalp: "極短線操作",
        aiOversold: "超賣區博反彈",
        aiPumpExhaust: "多頭力竭",
        aiMarketUnclear: "市場不明，建議觀望",
        aiSignal: "AI 訊號",
    }
} as const;

export type Language = keyof typeof TRANSLATIONS;
export type TranslationKey = keyof typeof TRANSLATIONS.en;
