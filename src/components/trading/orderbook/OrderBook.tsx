'use client';

interface OrderBookEntry {
    price: string;
    size: string;
    bg: string;
}

interface OrderBookProps {
    asks: OrderBookEntry[];
    bids: OrderBookEntry[];
    currentPrice: string;
    priceLabel: string;
    sizeLabel: string;
    stats?: {
        high24h: number;
        low24h: number;
        volume24h: number;
        change24h: number;
        changePercent24h: number;
    };
    isAsianTheme?: boolean;
}

export function OrderBook({ asks, bids, currentPrice, priceLabel, sizeLabel, stats, isAsianTheme = true }: OrderBookProps) {
    // Asian: asks=green (down), bids=red (up)
    // Western: asks=red (up), bids=green (down)
    const askColor = isAsianTheme ? 'text-emerald-500' : 'text-rose-500';
    const bidColor = isAsianTheme ? 'text-rose-500' : 'text-emerald-500';
    const askBg = isAsianTheme ? 'bg-emerald-500/10' : 'bg-rose-500/10';
    const bidBg = isAsianTheme ? 'bg-rose-500/10' : 'bg-emerald-500/10';

    const formatNumber = (num: number) => num.toLocaleString(undefined, { maximumFractionDigits: 0 });

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-3 flex flex-col h-[320px]">
            {/* Header: Market Stats */}
            <div className="mb-2 pb-2 border-b border-zinc-800">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-2xl font-bold text-white tracking-tight">${currentPrice}</span>
                    {stats && (
                        <div className={`text-xs font-mono font-bold ${stats.change24h >= 0 ? (isAsianTheme ? 'text-rose-500' : 'text-emerald-500') : (isAsianTheme ? 'text-emerald-500' : 'text-rose-500')}`}>
                            {stats.change24h >= 0 ? '+' : ''}{stats.change24h.toFixed(2)} ({stats.changePercent24h.toFixed(2)}%)
                        </div>
                    )}
                </div>

                {stats && (
                    <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-zinc-500">
                        <div className="flex flex-col">
                            <span>24H High</span>
                            <span className="text-zinc-300">${stats.high24h.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col text-center">
                            <span>24H Low</span>
                            <span className="text-zinc-300">${stats.low24h.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span>24H Vol</span>
                            <span className="text-zinc-300">{formatNumber(stats.volume24h)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Side-by-Side Layout */}
            <div className="flex-1 flex gap-2 overflow-hidden">
                {/* Left: Bids (Buy) - High to Low */}
                <div className="flex-1 flex flex-col">
                    <div className="flex justify-between text-[10px] text-zinc-500 mb-1 border-b border-zinc-800 pb-1">
                        <span>買進</span>
                        <span>量</span>
                    </div>
                    <div className="flex-1 overflow-hidden space-y-[1px]">
                        {bids.map((item) => (
                            <div key={item.price} className="flex justify-between relative h-5 items-center px-1">
                                <span className={`${bidColor} font-mono text-xs z-10`}>{item.price}</span>
                                <span className="text-zinc-400 font-mono text-[10px] z-10">{item.size}</span>
                                <div
                                    className={`absolute left-0 top-0 bottom-0 ${bidBg} z-0 transition-all duration-300 ease-out`}
                                    style={{ width: `${Math.min(100, parseFloat(item.size))}%` }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Asks (Sell) - Low to High */}
                <div className="flex-1 flex flex-col">
                    <div className="flex justify-between text-[10px] text-zinc-500 mb-1 border-b border-zinc-800 pb-1">
                        <span>價格</span>
                        <span>賣出</span>
                    </div>
                    <div className="flex-1 overflow-hidden space-y-[1px]">
                        {asks.map((item) => (
                            <div key={item.price} className="flex justify-between relative h-5 items-center px-1">
                                <span className={`${askColor} font-mono text-xs z-10`}>{item.price}</span>
                                <span className="text-zinc-400 font-mono text-[10px] z-10">{item.size}</span>
                                <div
                                    className={`absolute right-0 top-0 bottom-0 ${askBg} z-0 transition-all duration-300 ease-out`}
                                    style={{ width: `${Math.min(100, parseFloat(item.size))}%` }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
