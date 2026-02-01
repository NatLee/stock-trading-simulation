'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
    BookOpen, 
    TrendingUp, 
    BarChart3, 
    Brain, 
    ChevronRight, 
    ChevronLeft,
    ChevronDown,
    Play, 
    CheckCircle, 
    ArrowLeft, 
    Activity,
    FileText,
    Shield,
    Zap,
    Shapes,
    Users,
    PieChart,
    Coins,
    Search,
    SkipBack,
    SkipForward,
    Home,
    List,
    GraduationCap,
    Rocket,
    LucideIcon
} from 'lucide-react';
import { COURSES_DATA, CourseData, LessonData, SubLessonData } from '@/data/learn';
import { ContentRenderer } from './ContentRenderer';

// Icon 映射
const ICON_MAP: Record<string, LucideIcon> = {
    BookOpen,
    TrendingUp,
    BarChart3,
    Brain,
    FileText,
    Shield,
    Zap,
    Shapes,
    Users,
    PieChart,
    Coins,
    Search,
};

// 顏色類別映射
const COLOR_CLASSES: Record<string, Record<string, string>> = {
    indigo: { bg: 'bg-indigo-500/20', border: 'border-indigo-500/50', text: 'text-indigo-400', solid: 'bg-indigo-500' },
    emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400', solid: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400', solid: 'bg-amber-500' },
    rose: { bg: 'bg-rose-500/20', border: 'border-rose-500/50', text: 'text-rose-400', solid: 'bg-rose-500' },
    cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-400', solid: 'bg-cyan-500' },
    purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400', solid: 'bg-purple-500' },
    zinc: { bg: 'bg-zinc-500/20', border: 'border-zinc-500/50', text: 'text-zinc-400', solid: 'bg-zinc-500' },
};

// 課程分類
const COURSE_CATEGORIES = [
    {
        id: 'beginner',
        title: '入門基礎',
        icon: GraduationCap,
        description: '從零開始學習股票交易',
        courseIds: ['basics', 'candlestick', 'indicators', 'fundamentals'],
    },
    {
        id: 'intermediate',
        title: '策略進階',
        icon: TrendingUp,
        description: '建立自己的交易系統',
        courseIds: ['strategy', 'riskManagement', 'patterns', 'psychology'],
    },
    {
        id: 'advanced',
        title: '專業技巧',
        icon: Rocket,
        description: '掌握高階交易技術',
        courseIds: ['dayTrading', 'chips', 'tradingScenarios', 'stockPicking', 'options', 'sector'],
    },
    {
        id: 'investment',
        title: '投資理財',
        icon: Coins,
        description: '長期投資與資產配置',
        courseIds: ['etf', 'dividend', 'portfolio', 'us-stocks', 'us-tw-comparison'],
    },
];

export function LearningCenter() {
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
    const [selectedSubLessonId, setSelectedSubLessonId] = useState<string | null>(null);
    const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
    const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const activeCourse = COURSES_DATA.find(c => c.id === selectedCourseId);
    const activeLesson = activeCourse?.lessons.find(l => l.id === selectedLessonId);
    const activeSubLesson = activeLesson?.subLessons?.find(s => s.id === selectedSubLessonId);

    const getColorClasses = (color: string, element: 'bg' | 'border' | 'text' | 'solid') => {
        return COLOR_CLASSES[color]?.[element] || '';
    };

    const getIcon = (iconName: string) => {
        const IconComponent = ICON_MAP[iconName];
        return IconComponent ? <IconComponent size={20} /> : <BookOpen size={20} />;
    };

    const getLessonKey = (courseId: string, lessonId: string, subLessonId?: string) => 
        subLessonId ? `${courseId}-${lessonId}-${subLessonId}` : `${courseId}-${lessonId}`;

    const isLessonCompleted = (courseId: string, lessonId: string, subLessonId?: string) => {
        return completedLessons.has(getLessonKey(courseId, lessonId, subLessonId));
    };

    const toggleLessonComplete = (courseId: string, lessonId: string, subLessonId?: string) => {
        const key = getLessonKey(courseId, lessonId, subLessonId);
        setCompletedLessons(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    const toggleLessonExpand = (lessonId: string) => {
        setExpandedLessons(prev => {
            const newSet = new Set(prev);
            if (newSet.has(lessonId)) {
                newSet.delete(lessonId);
            } else {
                newSet.add(lessonId);
            }
            return newSet;
        });
    };

    const getCompletedCount = (course: CourseData) => {
        let count = 0;
        course.lessons.forEach(lesson => {
            if (lesson.subLessons && lesson.subLessons.length > 0) {
                lesson.subLessons.forEach(sub => {
                    if (isLessonCompleted(course.id, lesson.id, sub.id)) count++;
                });
            } else {
                if (isLessonCompleted(course.id, lesson.id)) count++;
            }
        });
        return count;
    };

    const getTotalLessonsCount = (course: CourseData) => {
        let count = 0;
        course.lessons.forEach(lesson => {
            if (lesson.subLessons && lesson.subLessons.length > 0) {
                count += lesson.subLessons.length;
            } else {
                count++;
            }
        });
        return count;
    };

    // 導航函數
    const navigateToHome = () => {
        setSelectedCourseId(null);
        setSelectedLessonId(null);
        setSelectedSubLessonId(null);
    };

    const navigateToCourse = (courseId: string) => {
        setSelectedCourseId(courseId);
        setSelectedLessonId(null);
        setSelectedSubLessonId(null);
    };

    const navigateToLesson = (lessonId: string, subLessonId?: string) => {
        setSelectedLessonId(lessonId);
        setSelectedSubLessonId(subLessonId || null);
    };

    // 導航相關邏輯
    const getCurrentLessonIndex = () => {
        if (!activeCourse || !selectedLessonId) return -1;
        return activeCourse.lessons.findIndex(l => l.id === selectedLessonId);
    };

    const getCurrentCourseIndex = () => {
        if (!selectedCourseId) return -1;
        return COURSES_DATA.findIndex(c => c.id === selectedCourseId);
    };

    const goToPreviousLesson = () => {
        if (!activeCourse || !activeLesson) return;
        
        // 如果在子單元中，先檢查是否有前一個子單元
        if (activeSubLesson && activeLesson.subLessons) {
            const subIndex = activeLesson.subLessons.findIndex(s => s.id === selectedSubLessonId);
            if (subIndex > 0) {
                setSelectedSubLessonId(activeLesson.subLessons[subIndex - 1].id);
                return;
            }
            // 回到主課程內容
            setSelectedSubLessonId(null);
            return;
        }

        // 如果當前課程有子單元但沒選中，跳到上一課的最後一個子單元
        const currentIndex = getCurrentLessonIndex();
        if (currentIndex > 0) {
            const prevLesson = activeCourse.lessons[currentIndex - 1];
            setSelectedLessonId(prevLesson.id);
            if (prevLesson.subLessons && prevLesson.subLessons.length > 0) {
                setSelectedSubLessonId(prevLesson.subLessons[prevLesson.subLessons.length - 1].id);
            } else {
                setSelectedSubLessonId(null);
            }
        }
    };

    const goToNextLesson = () => {
        if (!activeCourse || !activeLesson) return;

        // 如果當前課程有子單元，先遍歷子單元
        if (activeLesson.subLessons && activeLesson.subLessons.length > 0) {
            if (!activeSubLesson) {
                // 進入第一個子單元
                setSelectedSubLessonId(activeLesson.subLessons[0].id);
                return;
            }
            const subIndex = activeLesson.subLessons.findIndex(s => s.id === selectedSubLessonId);
            if (subIndex < activeLesson.subLessons.length - 1) {
                setSelectedSubLessonId(activeLesson.subLessons[subIndex + 1].id);
                return;
            }
        }

        // 跳到下一課
        const currentIndex = getCurrentLessonIndex();
        if (currentIndex < activeCourse.lessons.length - 1) {
            const nextLesson = activeCourse.lessons[currentIndex + 1];
            setSelectedLessonId(nextLesson.id);
            setSelectedSubLessonId(null);
        }
    };

    const hasPreviousContent = () => {
        if (!activeCourse || !activeLesson) return false;
        if (activeSubLesson) return true;
        return getCurrentLessonIndex() > 0;
    };

    const hasNextContent = () => {
        if (!activeCourse || !activeLesson) return false;
        const currentIndex = getCurrentLessonIndex();
        if (activeLesson.subLessons && activeLesson.subLessons.length > 0) {
            if (!activeSubLesson) return true;
            const subIndex = activeLesson.subLessons.findIndex(s => s.id === selectedSubLessonId);
            if (subIndex < activeLesson.subLessons.length - 1) return true;
        }
        return currentIndex < activeCourse.lessons.length - 1;
    };

    // 當前顯示的內容
    const currentContent = activeSubLesson?.content || activeLesson?.content;
    const currentTitle = activeSubLesson?.title || activeLesson?.title;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-300">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <BookOpen className="text-indigo-500" size={22} />
                                <h1 className="text-lg font-bold text-white">學習中心</h1>
                            </div>
                            
                            {/* Breadcrumb */}
                            <nav className="hidden md:flex items-center text-sm">
                                <button
                                    onClick={navigateToHome}
                                    className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 transition-colors ${
                                        !selectedCourseId ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    <Home size={14} />
                                    <span>首頁</span>
                                </button>
                                
                                {activeCourse && (
                                    <>
                                        <ChevronRight size={14} className="text-zinc-600 mx-1" />
                                        <button
                                            onClick={() => navigateToCourse(activeCourse.id)}
                                            className={`px-2 py-1 rounded hover:bg-zinc-800 transition-colors ${
                                                !selectedLessonId ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                        >
                                            {activeCourse.title}
                                        </button>
                                    </>
                                )}
                                
                                {activeLesson && (
                                    <>
                                        <ChevronRight size={14} className="text-zinc-600 mx-1" />
                                        <button
                                            onClick={() => navigateToLesson(activeLesson.id)}
                                            className={`px-2 py-1 rounded hover:bg-zinc-800 transition-colors truncate max-w-[150px] ${
                                                !selectedSubLessonId ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                        >
                                            {activeLesson.title}
                                        </button>
                                    </>
                                )}
                                
                                {activeSubLesson && (
                                    <>
                                        <ChevronRight size={14} className="text-zinc-600 mx-1" />
                                        <span className="text-indigo-400 truncate max-w-[150px]">
                                            {activeSubLesson.title}
                                        </span>
                                    </>
                                )}
                            </nav>
                        </div>
                        
                        <Link
                            href="/"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/50 hover:bg-indigo-500/30 text-sm font-medium transition-all text-indigo-400"
                        >
                            <Activity size={14} />
                            <span className="hidden sm:inline">模擬交易</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Mobile Breadcrumb */}
            {selectedCourseId && (
                <div className="md:hidden border-b border-zinc-800 bg-zinc-900/50 px-4 py-2">
                    <div className="flex items-center gap-2 text-xs overflow-x-auto">
                        <button onClick={navigateToHome} className="text-zinc-500 hover:text-white shrink-0">
                            <Home size={12} />
                        </button>
                        <ChevronRight size={12} className="text-zinc-600 shrink-0" />
                        <button 
                            onClick={() => navigateToCourse(activeCourse!.id)}
                            className="text-zinc-400 hover:text-white truncate shrink-0"
                        >
                            {activeCourse?.title}
                        </button>
                        {activeLesson && (
                            <>
                                <ChevronRight size={12} className="text-zinc-600 shrink-0" />
                                <span className="text-indigo-400 truncate">{activeLesson.title}</span>
                            </>
                        )}
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto">
                {/* Course List - 首頁 */}
                {!selectedCourseId && (
                    <div className="p-4 space-y-8">
                        {/* 歡迎區塊 */}
                        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6">
                            <h2 className="text-2xl font-bold text-white mb-2">歡迎來到學習中心</h2>
                            <p className="text-zinc-400">系統化學習股票交易，從入門到精通</p>
                            <div className="flex gap-4 mt-4 text-sm">
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <BookOpen size={16} className="text-indigo-400" />
                                    <span>{COURSES_DATA.length} 門課程</span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <FileText size={16} className="text-emerald-400" />
                                    <span>{COURSES_DATA.reduce((sum, c) => sum + c.lessons.length, 0)} 個單元</span>
                                </div>
                            </div>
                        </div>

                        {/* 課程分類 */}
                        {COURSE_CATEGORIES.map(category => {
                            const categoryCourses = COURSES_DATA.filter(c => category.courseIds.includes(c.id));
                            if (categoryCourses.length === 0) return null;

                            return (
                                <section key={category.id}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 rounded-lg bg-zinc-800">
                                            <category.icon size={20} className="text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{category.title}</h3>
                                            <p className="text-sm text-zinc-500">{category.description}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {categoryCourses.map(course => {
                                            const completedCount = getCompletedCount(course);
                                            const totalCount = getTotalLessonsCount(course);
                                            const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

                                            return (
                                                <button
                                                    key={course.id}
                                                    onClick={() => navigateToCourse(course.id)}
                                                    className={`p-5 rounded-xl border ${getColorClasses(course.color, 'border')} bg-zinc-900/50 
                                                        hover:bg-zinc-800/50 transition-all text-left group`}
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className={`p-2.5 rounded-lg ${getColorClasses(course.color, 'bg')} ${getColorClasses(course.color, 'text')}`}>
                                                            {getIcon(course.icon)}
                                                        </div>
                                                        <ChevronRight className="text-zinc-600 group-hover:text-white transition-colors" size={18} />
                                                    </div>
                                                    <h4 className="text-base font-bold text-white mb-1.5">{course.title}</h4>
                                                    <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{course.description}</p>
                                                    <div className="flex items-center justify-between text-xs mb-2">
                                                        <span className="text-zinc-600">{course.lessons.length} 單元</span>
                                                        <span className={getColorClasses(course.color, 'text')}>
                                                            {completedCount}/{totalCount}
                                                        </span>
                                                    </div>
                                                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${getColorClasses(course.color, 'solid')} transition-all`}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}

                {/* Lesson List - 課程頁 */}
                {selectedCourseId && !selectedLessonId && activeCourse && (
                    <div className="p-4">
                        {/* 課程標題 */}
                        <div className={`mb-6 p-6 rounded-xl border ${getColorClasses(activeCourse.color, 'border')} ${getColorClasses(activeCourse.color, 'bg')}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${getColorClasses(activeCourse.color, 'bg')} ${getColorClasses(activeCourse.color, 'text')}`}>
                                    {getIcon(activeCourse.icon)}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-white">{activeCourse.title}</h2>
                                    <p className="text-sm text-zinc-400 mt-1">{activeCourse.description}</p>
                                </div>
                                <div className="text-right">
                                    <div className={`text-2xl font-bold ${getColorClasses(activeCourse.color, 'text')}`}>
                                        {getCompletedCount(activeCourse)}/{getTotalLessonsCount(activeCourse)}
                                    </div>
                                    <div className="text-xs text-zinc-500">已完成</div>
                                </div>
                            </div>
                        </div>

                        {/* 單元列表 */}
                        <div className="space-y-2">
                            {activeCourse.lessons.map((lesson, index) => {
                                const hasSubLessons = lesson.subLessons && lesson.subLessons.length > 0;
                                const isExpanded = expandedLessons.has(lesson.id);
                                const completed = hasSubLessons 
                                    ? lesson.subLessons!.every(sub => isLessonCompleted(activeCourse.id, lesson.id, sub.id))
                                    : isLessonCompleted(activeCourse.id, lesson.id);

                                return (
                                    <div key={lesson.id} className="border border-zinc-800 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => {
                                                if (hasSubLessons) {
                                                    toggleLessonExpand(lesson.id);
                                                } else {
                                                    navigateToLesson(lesson.id);
                                                }
                                            }}
                                            className="w-full p-4 bg-zinc-900/50 hover:bg-zinc-800/50 transition-all text-left flex items-center gap-4"
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                                                ${completed
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-zinc-800 text-zinc-500'}`}
                                            >
                                                {completed ? <CheckCircle size={20} /> : index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-white font-medium truncate">
                                                    {lesson.title}
                                                </h4>
                                                <p className="text-sm text-zinc-500 truncate">{lesson.description}</p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-xs text-zinc-600">{lesson.duration}</span>
                                                {hasSubLessons ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-zinc-500">{lesson.subLessons!.length} 子單元</span>
                                                        <ChevronDown 
                                                            size={18} 
                                                            className={`text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                                        />
                                                    </div>
                                                ) : (
                                                    <Play size={18} className="text-zinc-600" />
                                                )}
                                            </div>
                                        </button>

                                        {/* 子單元列表 */}
                                        {hasSubLessons && isExpanded && (
                                            <div className="border-t border-zinc-800 bg-zinc-950/50">
                                                {/* 主內容項 */}
                                                <button
                                                    onClick={() => navigateToLesson(lesson.id)}
                                                    className="w-full p-3 pl-16 hover:bg-zinc-800/30 transition-all text-left flex items-center gap-3"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                                                        <FileText size={12} className="text-zinc-500" />
                                                    </div>
                                                    <span className="text-sm text-zinc-400">課程概覽</span>
                                                    <ChevronRight size={14} className="text-zinc-600 ml-auto" />
                                                </button>
                                                
                                                {lesson.subLessons!.map((sub, subIndex) => {
                                                    const subCompleted = isLessonCompleted(activeCourse.id, lesson.id, sub.id);
                                                    return (
                                                        <button
                                                            key={sub.id}
                                                            onClick={() => navigateToLesson(lesson.id, sub.id)}
                                                            className="w-full p-3 pl-16 hover:bg-zinc-800/30 transition-all text-left flex items-center gap-3"
                                                        >
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                                                                ${subCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}
                                                            >
                                                                {subCompleted ? <CheckCircle size={12} /> : `${index + 1}.${subIndex + 1}`}
                                                            </div>
                                                            <span className="text-sm text-zinc-300">{sub.title}</span>
                                                            <ChevronRight size={14} className="text-zinc-600 ml-auto" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Lesson Content - 內容頁 */}
                {activeLesson && activeCourse && (
                    <div className="flex">
                        {/* Sidebar */}
                        <aside className={`hidden lg:block border-r border-zinc-800 bg-zinc-900/30 transition-all ${
                            sidebarCollapsed ? 'w-12' : 'w-72'
                        }`}>
                            <div className="sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
                                <div className="p-3">
                                    <button
                                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                        className="w-full p-2 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center"
                                    >
                                        <List size={18} className="text-zinc-500" />
                                    </button>
                                </div>
                                
                                {!sidebarCollapsed && (
                                    <nav className="px-3 pb-4">
                                        {/* 課程進度總覽 */}
                                        <div className="mb-3 p-2 rounded-lg bg-zinc-800/50">
                                            <div className="flex items-center justify-between text-xs mb-1.5">
                                                <span className="text-zinc-400">課程進度</span>
                                                <span className={getColorClasses(activeCourse.color, 'text')}>
                                                    {getCompletedCount(activeCourse)}/{getTotalLessonsCount(activeCourse)}
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${getColorClasses(activeCourse.color, 'solid')} transition-all duration-300`}
                                                    style={{ width: `${(getCompletedCount(activeCourse) / getTotalLessonsCount(activeCourse)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="text-xs font-medium text-zinc-500 mb-2 px-2">課程大綱</div>
                                        {activeCourse.lessons.map((lesson, index) => {
                                            const isActive = lesson.id === selectedLessonId;
                                            const hasSubLessons = lesson.subLessons && lesson.subLessons.length > 0;
                                            // 檢查完成狀態
                                            const lessonCompleted = hasSubLessons 
                                                ? lesson.subLessons!.every(sub => isLessonCompleted(activeCourse.id, lesson.id, sub.id))
                                                : isLessonCompleted(activeCourse.id, lesson.id);
                                            
                                            return (
                                                <div key={lesson.id}>
                                                    <button
                                                        onClick={() => navigateToLesson(lesson.id)}
                                                        className={`w-full p-2 rounded-lg text-left text-sm transition-colors flex items-center gap-2 ${
                                                            isActive && !selectedSubLessonId
                                                                ? 'bg-indigo-500/20 text-indigo-400'
                                                                : 'hover:bg-zinc-800 text-zinc-400'
                                                        }`}
                                                    >
                                                        {lessonCompleted ? (
                                                            <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                                                        ) : (
                                                            <span className="w-3.5 h-3.5 rounded-full border border-zinc-600 shrink-0" />
                                                        )}
                                                        <span className="truncate flex-1">{lesson.title}</span>
                                                    </button>
                                                    
                                                    {hasSubLessons && isActive && (
                                                        <div className="ml-5 mt-1 space-y-1 border-l border-zinc-800 pl-2">
                                                            {lesson.subLessons!.map((sub, subIndex) => {
                                                                const subCompleted = isLessonCompleted(activeCourse.id, lesson.id, sub.id);
                                                                return (
                                                                    <button
                                                                        key={sub.id}
                                                                        onClick={() => navigateToLesson(lesson.id, sub.id)}
                                                                        className={`w-full p-1.5 rounded text-left text-xs transition-colors flex items-center gap-2 ${
                                                                            selectedSubLessonId === sub.id
                                                                                ? 'bg-indigo-500/20 text-indigo-400'
                                                                                : 'hover:bg-zinc-800/50 text-zinc-500'
                                                                        }`}
                                                                    >
                                                                        {subCompleted ? (
                                                                            <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                                                                        ) : (
                                                                            <span className="w-3 h-3 rounded-full border border-zinc-700 shrink-0" />
                                                                        )}
                                                                        <span className="truncate">{sub.title}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </nav>
                                )}
                            </div>
                        </aside>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                            <div className="max-w-4xl mx-auto p-4 lg:p-6">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                    {/* 內容標題 */}
                                    <div className="p-6 border-b border-zinc-800">
                                        <div className="flex items-center gap-2 text-sm text-zinc-500 mb-3">
                                            <span className={getColorClasses(activeCourse.color, 'text')}>
                                                {activeCourse.title}
                                            </span>
                                            <span>•</span>
                                            <span>第 {getCurrentLessonIndex() + 1} / {activeCourse.lessons.length} 單元</span>
                                            {activeSubLesson && (
                                                <>
                                                    <span>•</span>
                                                    <span>{activeSubLesson.title}</span>
                                                </>
                                            )}
                                        </div>
                                        <h2 className="text-2xl font-bold text-white">{currentTitle}</h2>
                                        <p className="text-sm text-zinc-500 mt-2">{activeLesson.description}</p>
                                    </div>

                                    {/* 內容區 */}
                                    <div className="p-6">
                                        <div className="prose prose-invert prose-zinc max-w-none text-zinc-300">
                                            {currentContent && <ContentRenderer content={currentContent} />}
                                        </div>
                                    </div>

                                    {/* 完成與導航 */}
                                    <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
                                        <div className="flex justify-center mb-6">
                                            <button
                                                onClick={() => toggleLessonComplete(
                                                    activeCourse.id, 
                                                    activeLesson.id, 
                                                    activeSubLesson?.id
                                                )}
                                                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                                    isLessonCompleted(activeCourse.id, activeLesson.id, activeSubLesson?.id)
                                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                                }`}
                                            >
                                                {isLessonCompleted(activeCourse.id, activeLesson.id, activeSubLesson?.id) 
                                                    ? '✓ 已完成' 
                                                    : '標記完成'
                                                }
                                            </button>
                                        </div>

                                        {/* 導航按鈕 */}
                                        <div className="flex items-center justify-between gap-4">
                                            <button
                                                onClick={goToPreviousLesson}
                                                disabled={!hasPreviousContent()}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                                                    hasPreviousContent()
                                                        ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                                                        : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                                                }`}
                                            >
                                                <ChevronLeft size={16} />
                                                <span className="hidden sm:inline">上一節</span>
                                            </button>

                                            <button
                                                onClick={() => navigateToCourse(activeCourse.id)}
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                                            >
                                                <List size={16} />
                                                <span className="hidden sm:inline">課程大綱</span>
                                            </button>

                                            <button
                                                onClick={goToNextLesson}
                                                disabled={!hasNextContent()}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                                                    hasNextContent()
                                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                                        : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                                                }`}
                                            >
                                                <span className="hidden sm:inline">下一節</span>
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
