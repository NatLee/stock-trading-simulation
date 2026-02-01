import { Metadata } from 'next';
import { LearningCenter } from '@/components/learn';

export const metadata: Metadata = {
    title: '學習中心 | 股票交易模擬',
    description: '學習股票交易基礎知識、K線圖分析、技術指標和交易策略',
};

export default function LearnPage() {
    return <LearningCenter />;
}
