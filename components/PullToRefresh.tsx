import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

/**
 * PullToRefresh component that works with touch events
 * Optimized for mobile APKs where browser pull-to-refresh might be disabled
 */
export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
    // If running on WEB, just render children (browser has its own pull-to-refresh)
    if (Capacitor.getPlatform() === 'web') {
        return <>{children}</>;
    }

    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);

    const PULL_THRESHOLD = 80; // Distance to trigger refresh
    const MAX_PULL = 120; // Maximum visual pull distance

    const handleTouchStart = (e: TouchEvent) => {
        // Only allow pull to refresh if at the top of the page
        if (window.scrollY > 0 || isRefreshing) return;

        startY.current = e.touches[0].pageY;
        setIsPulling(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isPulling || isRefreshing || window.scrollY > 0) return;

        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;

        // Only allow pulling down
        if (diff > 0) {
            // Apply resistance to the pull
            const resistance = 0.4;
            const distance = Math.min(diff * resistance, MAX_PULL);
            setPullDistance(distance);

            // Prevent browser default scroll if we are pulling down at the top
            if (e.cancelable) e.preventDefault();
        } else {
            setIsPulling(false);
            setPullDistance(0);
        }
    };

    const handleTouchEnd = async () => {
        if (!isPulling || isRefreshing) return;

        if (pullDistance >= PULL_THRESHOLD) {
            setIsRefreshing(true);
            setPullDistance(PULL_THRESHOLD); // Snap to threshold

            try {
                await onRefresh();
            } catch (err) {
                console.error('Refresh failed:', err);
            } finally {
                // Delay resetting to show completion
                setTimeout(() => {
                    setIsRefreshing(false);
                    setPullDistance(0);
                    setIsPulling(false);
                }, 500);
            }
        } else {
            setPullDistance(0);
            setIsPulling(false);
        }
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        el.addEventListener('touchstart', handleTouchStart, { passive: false });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd);

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [pullDistance, isRefreshing, isPulling, onRefresh]);

    return (
        <div ref={containerRef} className="relative w-full h-full min-h-[50vh]">
            {/* Pull Indicator Area */}
            <div
                className="absolute left-0 right-0 flex items-center justify-center transition-all duration-200 pointer-events-none z-40 overflow-hidden"
                style={{
                    height: `${pullDistance}px`,
                    top: 0,
                    opacity: pullDistance > 20 ? 1 : 0
                }}
            >
                <div className={`p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
                    style={{ transform: `rotate(${pullDistance * 3}deg) scale(${Math.min(pullDistance / PULL_THRESHOLD, 1)})` }}>
                    <RefreshCw
                        size={20}
                        className={pullDistance >= PULL_THRESHOLD ? "text-brasil-green" : "text-brasil-blue"}
                    />
                </div>
            </div>

            {/* Content Area */}
            <div
                className="transition-transform duration-200"
                style={{ transform: `translateY(${pullDistance}px)` }}
            >
                {children}
            </div>
        </div>
    );
};
