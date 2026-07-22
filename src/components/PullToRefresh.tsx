import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValue } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const pullThreshold = 80;
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);

    /**
     * The app scrolls inside <main className="overflow-y-auto">, not the window,
     * so window.scrollY is permanently 0 and can't tell us whether we're at the
     * top. Walk up to the real scrolling ancestor and ask it instead.
     */
    const isAtTop = (): boolean => {
        let node: HTMLElement | null = containerRef.current;
        while (node) {
            const overflowY = window.getComputedStyle(node).overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') {
                return node.scrollTop <= 0;
            }
            node = node.parentElement;
        }
        return window.scrollY === 0;
    };

    const handleTouchStart = (e: TouchEvent) => {
        if (isAtTop()) {
            startY.current = e.touches[0].pageY;
        } else {
            startY.current = -1;
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (startY.current === -1 || isRefreshing) return;

        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;

        if (diff > 0) {
            // Rubber banding effect
            const distance = Math.min(diff * 0.4, pullThreshold + 20);
            setPullDistance(distance);
            if (distance > 10) {
                if (e.cancelable) e.preventDefault();
            }
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance >= pullThreshold && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(pullThreshold);
            await onRefresh();
            setIsRefreshing(false);
        }
        setPullDistance(0);
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd);

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [pullDistance, isRefreshing]);

    return (
        <div ref={containerRef} className="relative min-h-screen">
            <motion.div
                style={{
                    height: pullDistance,
                    opacity: pullDistance / pullThreshold,
                }}
                className="absolute top-0 left-0 right-0 flex items-center justify-center overflow-hidden z-50 pointer-events-none"
            >
                <motion.div
                    animate={isRefreshing ? { rotate: 360 } : { rotate: (pullDistance / pullThreshold) * 180 }}
                    transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : { type: "spring" }}
                    className="p-2 bg-white dark:bg-zinc-900 rounded-full shadow-xl border border-black/5 dark:border-white/5"
                >
                    <RefreshCw size={20} className={isRefreshing ? "text-emerald-500" : "text-gray-400"} />
                </motion.div>
            </motion.div>

            <motion.div
                animate={{ y: pullDistance }}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
            >
                {children}
            </motion.div>
        </div>
    );
};

export default PullToRefresh;
