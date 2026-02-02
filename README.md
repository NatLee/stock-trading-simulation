[繁體中文](README_zh-tw.md)

# Stock Trading Simulator

![Trading Simulation](./docs/simulation.png)
*Main trading interface with real-time order book, candlestick chart, and trading panel*

A comprehensive stock trading simulator built with Next.js, featuring a real-time matching engine, bot-driven market simulation, and an integrated learning center for trading education.

## Features

### Trading Simulation

- **Matching Engine**: Price-time priority order matching
- **Order Types**: Market orders and limit orders
- **Order Conditions**: GTC (Good Till Cancel), IOC (Immediate Or Cancel), FOK (Fill Or Kill)
- **Order Book**: Real-time bid/ask visualization with depth display
- **Candlestick Charts**: Multiple timeframes (15s, 1m, 5m, 30m) with moving averages and volume overlay
- **24h Statistics**: High, low, volume, and price change tracking
- **Holdings Management**: Lot-based position tracking with P&L calculation
- **Trade History**: Complete record of executed trades

![Simulation Settings](./docs/simulation-settings.png)
*Market scenario configuration and bot settings*

### Bot-Driven Market Simulation

Three types of bots simulate realistic market activity:

- **MarketMakerBot**: Provides liquidity by quoting both bid and ask sides
- **TrendBot**: Follows market trends and adds directional pressure
- **NoiseBot**: Simulates retail trading with random orders

**Market Scenarios**:
- Bull Market - Higher volatility with upward bias
- Bear Market - Higher volatility with downward bias
- Sideways - Low volatility, high liquidity
- Volatile - Extreme price swings
- Calm - Minimal movement, very high liquidity

### Learning Center

19 courses across 4 categories:

| Category | Courses |
|----------|---------|
| **Beginner** | Trading Basics, Candlestick Charts, Technical Indicators, Fundamental Analysis |
| **Intermediate** | Trading Strategies, Risk Management, Chart Patterns, Trading Psychology |
| **Advanced** | Day Trading, Market Microstructure, Trading Scenarios, Stock Picking, Options, Sector Analysis |
| **Investment** | ETF Investing, Dividend Investing, Portfolio Management, US Stocks, Taiwan vs US Markets |

Features interactive quizzes, visual charts, and progress tracking.

![Learning Center](./docs/learn-center.png)
*Interactive learning center with 19 courses across 4 categories*

![Learning Sub Page](./docs/learn-sub-page.png)
*Detailed course content with visual charts and interactive quizzes*

### Practice Center

A comprehensive environment for mastering chart patterns and trading execution:

- **Pattern Recognition**: Interactive quiz mode to identify chart patterns (Head & Shoulders, Wedges, Triangles, etc.) from real market scenarios.
- **Trading Practice**: Risk-free simulation to trade specific patterns or random scenarios.
- **Rewind & Replay**: Review historical price action and replay scenarios to analyze decision-making.

![K-Chart Practice](./docs/k-chart-practice.png)
*Pattern recognition practice with candlestick charts*

![Guess Practice](./docs/guess-practice.png)
*Interactive quiz mode for identifying chart patterns*

### Market Analysis

Real-time market:

- **Trend Analysis**: Detects market direction (Bullish/Bearish) and strength.
- **Order Book Scanning**: Analyzes bid/ask pressure to gauge market sentiment.
- **Momentum Indicators**: Tracks RSI and volume velocity.
- **Pattern Detection**: Automatically identifies forming chart patterns with confidence scores.

### Additional Features

- **Taiwan Stock Exchange tick rules** for realistic price steps
- **Color theme toggle**: Asian (red=up) vs Western (green=up)
- **Standard/Odd lot trading modes**
- **Configurable commission rates**
- **Market intensity control**

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 16.1.6 (App Router)
- **UI Library**: [React](https://react.dev/) 19.2.3
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) 4
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

- Node.js 18.x or later

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/stock-trading-simulation.git

# Navigate to project directory
cd stock-trading-simulation

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) to view the trading simulator.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Main trading interface
│   └── learn/             # Learning center
├── components/
│   ├── trading/           # Trading UI components
│   │   ├── order/         # Order form components
│   │   ├── orderbook/     # Order book display
│   │   ├── holdings/      # Position management
│   │   └── records/       # Trade history
│   ├── chart/             # Candlestick chart
│   ├── learn/             # Learning center components
│   └── ui/                # Reusable UI components
├── hooks/
│   ├── useMarketSimulator.ts  # Main simulation orchestrator
│   ├── usePriceEngine.ts      # Price generation
│   └── useTradingEngine.ts    # Trading state management
├── lib/
│   ├── matching/          # Core matching engine
│   │   ├── MatchingEngine.ts  # Order matching logic
│   │   ├── OrderBook.ts       # Price-time priority book
│   │   └── CandleAggregator.ts # K-line generation
│   └── bots/              # Trading bots
│       ├── BotManager.ts      # Bot coordinator
│       ├── MarketMakerBot.ts  # Liquidity provider
│       ├── TrendBot.ts        # Trend follower
│       └── NoiseBot.ts        # Random trader
├── data/learn/            # Course content (JSON)
├── constants/             # Configuration
└── types/                 # TypeScript definitions
```

## Architecture

### Order Flow

```
User/Bot Order → MatchingEngine → OrderBook
                      ↓
              Price-Time Matching
                      ↓
              Trade Execution
                      ↓
              CandleAggregator → Chart Update
                      ↓
              State Update → UI Render
```

### Matching Engine

- Implements price-time priority matching
- Supports partial fills
- Handles market orders by consuming multiple price levels
- Applies Taiwan Stock Exchange tick size rules

### Bot System

The `BotManager` coordinates all bots on each tick (default 100ms):

1. **MarketMakerBot** refreshes quotes at multiple price levels
2. **TrendBot** analyzes price history and places directional orders
3. **NoiseBot** randomly submits market/limit orders

Order quantities scale with configurable `unitSize` and `intensity` parameters.

## Contributors

- [NatLee](https://github.com/NatLee)