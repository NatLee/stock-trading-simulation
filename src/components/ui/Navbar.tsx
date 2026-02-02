'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, BookOpen, Zap, Github, Globe } from 'lucide-react';

export type PageType = 'trading' | 'learn' | 'practice';

interface NavbarProps {
    currentPage: PageType;
    leftContent?: React.ReactNode;
    rightContent?: React.ReactNode;
}

const NAV_ITEMS = [
    {
        id: 'trading' as const,
        href: '/',
        label: '模擬交易',
        shortLabel: '模擬',
        icon: Activity,
        color: 'emerald',
    },
    {
        id: 'learn' as const,
        href: '/learn',
        label: '教學中心',
        shortLabel: '教學',
        icon: BookOpen,
        color: 'indigo',
    },
    {
        id: 'practice' as const,
        href: '/practice',
        label: '實戰練習',
        shortLabel: '實戰',
        icon: Zap,
        color: 'amber',
    },
];

const AUTHOR_LINKS = [
    {
        href: 'https://github.com/NatLee',
        icon: Github,
        title: 'GitHub',
    },
    {
        href: 'https://natlee.github.io/',
        icon: Globe,
        title: '個人頁面',
    },
];

// Color classes for each nav item
const colorClasses = {
    emerald: {
        base: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        active: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
        hover: 'hover:bg-emerald-500/30',
    },
    indigo: {
        base: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
        active: 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300',
        hover: 'hover:bg-indigo-500/30',
    },
    amber: {
        base: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        active: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
        hover: 'hover:bg-amber-500/30',
    },
};

export const Navbar: React.FC<NavbarProps> = ({
    currentPage,
    leftContent,
    rightContent,
}) => {
    return (
        <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    {/* Left section: Navigation links */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Main navigation */}
                        <nav className="flex items-center gap-1 sm:gap-2">
                            {NAV_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentPage === item.id;
                                const colors = colorClasses[item.color as keyof typeof colorClasses];
                                
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        className={`
                                            flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 
                                            rounded-lg border text-xs sm:text-sm font-medium 
                                            transition-all
                                            ${isActive ? colors.active : colors.base}
                                            ${colors.hover}
                                        `}
                                    >
                                        <Icon size={14} />
                                        <span className="hidden sm:inline">{item.label}</span>
                                        <span className="sm:hidden">{item.shortLabel}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Page-specific left content (breadcrumbs, etc.) */}
                        {leftContent && (
                            <>
                                <div className="h-5 w-px bg-zinc-700 hidden md:block" />
                                <div className="hidden md:flex items-center">
                                    {leftContent}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right section: Page controls + Author links */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Page-specific right content (settings, controls, etc.) */}
                        {rightContent}

                        {/* Separator */}
                        {rightContent && (
                            <div className="h-5 w-px bg-zinc-700 hidden sm:block" />
                        )}

                        {/* Author links */}
                        <div className="flex items-center gap-1">
                            {AUTHOR_LINKS.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <a
                                        key={link.href}
                                        href={link.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                        title={link.title}
                                    >
                                        <Icon size={18} />
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
