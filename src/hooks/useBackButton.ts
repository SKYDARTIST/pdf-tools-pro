import { useEffect } from 'react';

/**
 * Android hardware back button interception.
 *
 * Capacitor's AppPlugin only runs its default back behaviour when NOBODY is
 * listening for the 'backButton' event. Once App.tsx registers its listener we
 * own the back button completely, so every dismissable surface (modals, sheets,
 * overlays) has to opt in here or it will be skipped.
 *
 * Interceptors are stored in a LIFO stack: the most recently mounted surface
 * gets first refusal, which matches how stacked modals look to the user.
 */

export type BackInterceptor = () => boolean;

const interceptors: BackInterceptor[] = [];

/**
 * Runs interceptors top-down. Returns true as soon as one claims the press.
 * Called by the single global listener in App.tsx.
 */
export const runBackInterceptors = (): boolean => {
    for (let i = interceptors.length - 1; i >= 0; i--) {
        try {
            if (interceptors[i]()) return true;
        } catch (err) {
            console.warn('Back interceptor threw, skipping:', err);
        }
    }
    return false;
};

/**
 * Claim the back button while `active` is true.
 *
 * @param handler Return true if you consumed the press (e.g. closed a modal),
 *                false to let the next interceptor or route-back handle it.
 * @param active  Usually the modal's own open state.
 */
export const useBackButton = (handler: BackInterceptor, active: boolean = true) => {
    useEffect(() => {
        if (!active) return;

        interceptors.push(handler);
        return () => {
            const idx = interceptors.lastIndexOf(handler);
            if (idx !== -1) interceptors.splice(idx, 1);
        };
        // `handler` is intentionally in deps: an inline arrow re-registers each
        // render, which is cheap (array push/splice) and keeps the closure fresh.
    }, [handler, active]);
};
