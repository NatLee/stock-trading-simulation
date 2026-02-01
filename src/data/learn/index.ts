export * from './types';

import { CourseData } from './types';

// Import JSON data - 基礎課程
import basicsData from './courses/basics.json';
import candlestickData from './courses/candlestick.json';
import indicatorsData from './courses/indicators.json';
import strategyData from './courses/strategy.json';
import fundamentalsData from './courses/fundamentals.json';
import riskManagementData from './courses/riskManagement.json';

// Import JSON data - 進階課程
import dayTradingData from './courses/dayTrading.json';
import patternsData from './courses/patterns.json';
import chipsData from './courses/chips.json';
import psychologyData from './courses/psychology.json';
import etfData from './courses/etf.json';
import dividendData from './courses/dividend.json';
import stockPickingData from './courses/stockPicking.json';
import tradingScenariosData from './courses/tradingScenarios.json';
import portfolioData from './courses/portfolio.json';

// Import JSON data - 新增課程
import usStocksData from './courses/us-stocks.json';
import usTwComparisonData from './courses/us-tw-comparison.json';
import optionsData from './courses/options.json';
import sectorData from './courses/sector.json';

// Type assertion for JSON imports - 基礎課程
export const basicsCourse = basicsData as CourseData;
export const candlestickCourse = candlestickData as CourseData;
export const indicatorsCourse = indicatorsData as CourseData;
export const strategyCourse = strategyData as CourseData;
export const fundamentalsCourse = fundamentalsData as CourseData;
export const riskManagementCourse = riskManagementData as CourseData;

// Type assertion for JSON imports - 進階課程
export const dayTradingCourse = dayTradingData as CourseData;
export const patternsCourse = patternsData as CourseData;
export const chipsCourse = chipsData as CourseData;
export const psychologyCourse = psychologyData as CourseData;
export const etfCourse = etfData as CourseData;
export const dividendCourse = dividendData as CourseData;
export const stockPickingCourse = stockPickingData as CourseData;
export const tradingScenariosCourse = tradingScenariosData as CourseData;
export const portfolioCourse = portfolioData as CourseData;

// Type assertion for JSON imports - 新增課程
export const usStocksCourse = usStocksData as CourseData;
export const usTwComparisonCourse = usTwComparisonData as CourseData;
export const optionsCourse = optionsData as CourseData;
export const sectorCourse = sectorData as CourseData;

export const COURSES_DATA: CourseData[] = [
    // 基礎課程
    basicsCourse,
    candlestickCourse,
    indicatorsCourse,
    strategyCourse,
    fundamentalsCourse,
    riskManagementCourse,
    // 進階課程
    dayTradingCourse,
    patternsCourse,
    chipsCourse,
    psychologyCourse,
    etfCourse,
    dividendCourse,
    stockPickingCourse,
    tradingScenariosCourse,
    portfolioCourse,
    // 新增課程
    usStocksCourse,
    usTwComparisonCourse,
    optionsCourse,
    sectorCourse,
];
