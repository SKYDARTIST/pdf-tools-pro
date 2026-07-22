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
    // Cached: getComputedStyle forces a style recalculation, and this would
    // otherwise walk the ancestor chain on every single touch.
    const scrollerRef = useRef<HTMLElement | null | undefined>(undefined);

    const getScroller = (): HTMLElement | null => {
        if (scrollerRef.current !== undefined) return scrollerRef.current;

        let node: HTMLElement | null = containerRef.current;
        while (node) {
            const overflowY = window.getComputedStyle(node).overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') break;
            node = node.parentElement;
        }
        scrollerRef.current = node;
        return node;
    };

    const isAtTop = (): boolean => {
        const scroller = getScroller();
        return scroller ? scroller.scrollTop <= 0 : window.scrollY === 0;
    };

    // Mirrors of the render state, so the listeners below can be attached once
    // instead of being torn down and rebuilt on every frame of a pull.
    const pullDistanceRef = useRef(0);
    const isRefreshingRef = useRef(false);
    const onRefreshRef = useRef(onRefresh);
    onRefreshRef.current = onRefresh;

    const updatePull = (distance: number) => {
        pullDistanceRef.current = distance;
        setPullDistance(distance);
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // touchmove has to be non-passive because pulling must preventDefault to
        // stop the native scroll. A non-passive listener makes the browser wait
        // for JS before it may scroll, so leaving it attached permanently taxed
        // every scroll in the app — this component wraps every screen.
        //
        // Only gestures that begin at the top can ever become a pull, so the
        // blocking listener is attached then and removed on touchend. Ordinary
        // mid-screen scrolling never sees it.
        const handleTouchMove = (e: TouchEvent) => {
            if (startY.current === -1 || isRefreshingRef.current) return;

            const diff = e.touches[0].pageY - startY.current;
            if (diff > 0) {
                // Rubber banding effect
                const distance = Math.min(diff * 0.4, pullThreshold + 20);
                updatePull(distance);
                if (distance > 10 && e.cancelable) e.preventDefault();
            }
        };

        const detachMove = () => el.removeEventListener('touchmove', handleTouchMove);

        const handleTouchStart = (e: TouchEvent) => {
            detachMove();
            if (!isAtTop()) {
                startY.current = -1;
                return;
            }
            startY.current = e.touches[0].pageY;
            el.addEventListener('touchmove', handleTouchMove, { passive: false });
        };

        const handleTouchEnd = async () => {
            detachMove();
            if (pullDistanceRef.current >= pullThreshold && !isRefreshingRef.current) {
                isRefreshingRef.current = true;
                setIsRefreshing(true);
                updatePull(pullThreshold);
                await onRefreshRef.current();
                isRefreshingRef.current = false;
                setIsRefreshing(false);
            }
            updatePull(0);
        };

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchend', handleTouchEnd, { passive: true });
        el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

        return () => {
            detachMove();
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchend', handleTouchEnd);
            el.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, []);

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
