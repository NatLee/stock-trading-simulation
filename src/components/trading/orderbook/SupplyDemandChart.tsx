'use client';

import { OrderBookSnapshot } from '@/lib/matching';

interface SupplyDemandChartProps {
    orderBook: OrderBookSnapshot;
    isAsianTheme?: boolean;
}

/** Running total of quantity, level by level */
function cumulative(levels: { price: number; quantity: number }[]): { price: number; volume: number }[] {
    let total = 0;
    return levels.map(level => {
        total += level.quantity;
        return { price: level.price, volume: total };
    });
}

export function SupplyDemandChart({ orderBook, isAsianTheme = true }: SupplyDemandChartProps) {
    // Process data for depth chart
    const bids = [...orderBook.bids].sort((a, b) => b.price - a.price); // High to low
    const asks = [...orderBook.asks].sort((a, b) => a.price - b.price); // Low to high

    // Calculate cumulative volume
    const bidPoints = cumulative(bids);
    const askPoints = cumulative(asks);
    const bidAccum = bidPoints.length > 0 ? bidPoints[bidPoints.length - 1].volume : 0;
    const askAccum = askPoints.length > 0 ? askPoints[askPoints.length - 1].volume : 0;

    const maxVolume = Math.max(bidAccum, askAccum);

    // Colors
    const bidColor = isAsianTheme ? '#f43f5e' : '#10b981'; // Red/Green
    const askColor = isAsianTheme ? '#10b981' : '#f43f5e'; // Green/Red

    if (bidPoints.length === 0 || askPoints.length === 0) {
        return <div className="h-[120px] bg-zinc-900 border border-zinc-800 rounded-sm flex items-center justify-center text-zinc-600 text-xs">No Data</div>;
    }

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-3 mt-2">
            <div className="text-[10px] text-zinc-500 mb-2">供需深度圖</div>
            <div className="h-[100px] flex items-end gap-1 relative overflow-hidden">
                {/* Visualizing as two opposing bars for simple total supply/demand comparison first */}
                {/* Total Demand (Bids) */}
                <div className="flex-1 flex flex-col justify-end group relative h-full">
                    <div className="text-[10px] text-zinc-400 absolute bottom-1 left-1 z-10 font-mono">
                        買盤: {bidAccum.toLocaleString()}
                    </div>
                    <div
                        className="w-full transition-all duration-500 ease-out rounded-t-sm relative"
                        style={{
                            height: `${(bidAccum / maxVolume) * 100}%`,
                            backgroundColor: bidColor,
                            opacity: 0.3
                        }}
                    >
                        <div
                            className="absolute bottom-0 left-0 right-0 top-0 opacity-50"
                            style={{
                                background: `linear-gradient(to top, ${bidColor}, transparent)`
                            }}
                        />
                    </div>
                </div>

                {/* Total Supply (Asks) */}
                <div className="flex-1 flex flex-col justify-end group relative h-full">
                    <div className="text-[10px] text-zinc-400 absolute bottom-1 right-1 z-10 font-mono text-right">
                        賣盤: {askAccum.toLocaleString()}
                    </div>
                    <div
                        className="w-full transition-all duration-500 ease-out rounded-t-sm relative"
                        style={{
                            height: `${(askAccum / maxVolume) * 100}%`,
                            backgroundColor: askColor,
                            opacity: 0.3
                        }}
                    >
                        <div
                            className="absolute bottom-0 left-0 right-0 top-0 opacity-50"
                            style={{
                                background: `linear-gradient(to top, ${askColor}, transparent)`
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Balance Bar */}
            <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
                <div
                    className="h-full transition-all duration-500"
                    style={{
                        width: `${(bidAccum / (bidAccum + askAccum)) * 100}%`,
                        backgroundColor: bidColor
                    }}
                />
                <div
                    className="h-full transition-all duration-500"
                    style={{
                        width: `${(askAccum / (bidAccum + askAccum)) * 100}%`,
                        backgroundColor: askColor
                    }}
                />
            </div>
        </div>
    );
}
