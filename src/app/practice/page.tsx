import { Metadata } from 'next';
import { PracticeCenter } from '@/components/practice';

export const metadata: Metadata = {
    title: '實戰練習 | 股票交易模擬',
    description: '透過型態辨識、模擬交易和歷史回放來練習股票交易技巧',
};

export default function PracticePage() {
    return <PracticeCenter />;
}
