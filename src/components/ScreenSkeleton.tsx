import React from 'react';

/**
 * Shown while a lazy-loaded screen's chunk is still downloading.
 *
 * Every tool screen is code-split, and the Suspense fallback used to be null —
 * so tapping a tool rendered literally nothing until the chunk arrived, which
 * reads as a freeze on a cold cache or a slow device.
 *
 * Deliberately generic: it mirrors the shared screen shape (eyebrow, big title,
 * card) rather than any one tool, so it never mismatches what loads next.
 */
const ScreenSkeleton: React.FC = () => (
    <div
        className="min-h-screen pb-32 pt-32 max-w-2xl mx-auto px-6"
        role="status"
        aria-label="Loading tool"
    >
        <div className="space-y-12 animate-pulse">
            <div className="space-y-3">
                <div className="h-2 w-32 rounded-full bg-black/10 dark:bg-white/10" />
                <div className="h-12 w-52 rounded-2xl bg-black/10 dark:bg-white/10" />
                <div className="h-2 w-64 rounded-full bg-black/5 dark:bg-white/5" />
            </div>

            <div className="h-24 rounded-[32px] bg-black/5 dark:bg-white/5" />

            <div className="h-80 rounded-[40px] border-2 border-dashed border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5" />
        </div>

        <span className="sr-only">Loading</span>
    </div>
);

export default ScreenSkeleton;
