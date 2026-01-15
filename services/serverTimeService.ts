/**
 * Server Time Service - Fetches real time from backend to prevent clock manipulation
 */
import { getDeviceId } from './usageService';

let cachedTestingPeriod: boolean | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // Cache for 5 minutes

export const fetchServerTestingStatus = async (): Promise<boolean> => {
    // Return cached value if fresh
    if (cachedTestingPeriod !== null && Date.now() - lastFetchTime < CACHE_DURATION) {
        return cachedTestingPeriod;
    }

    try {
        const isCapacitor = !!(window as any).Capacitor;
        const isDevelopment = window.location.hostname === 'localhost' && !isCapacitor;
        const backendUrl = isDevelopment
            ? 'http://localhost:3000/api/index'
            : 'https://pdf-tools-pro-indol.vercel.app/api/index';

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-ag-signature': import.meta.env.VITE_AG_PROTOCOL_SIGNATURE || 'AG_NEURAL_LINK_2026_PROTOTYPE_SECURE',
                'x-ag-device-id': getDeviceId()
            },
            body: JSON.stringify({ type: 'server_time' }),
        });

        if (response.ok) {
            const data = await response.json();
            cachedTestingPeriod = data.isTestingPeriod;
            lastFetchTime = Date.now();
            return cachedTestingPeriod;
        } else {
            console.debug('Handshake Protocol: Server time check deferred.');
        }
    } catch (error) {
        console.warn('Server time fetch failed, using local fallback');
    }

    // Fallback to local time if server unreachable
    const TESTING_PERIOD_END = new Date('2026-01-28T23:59:59Z');
    return new Date() < TESTING_PERIOD_END;
};

// Sync check (for immediate UI needs) - uses cached value or local fallback
export const isTestingPeriodSync = (): boolean => {
    if (cachedTestingPeriod !== null) {
        return cachedTestingPeriod;
    }

    // Fallback to local time if not yet fetched
    const TESTING_PERIOD_END = new Date('2026-01-28T23:59:59Z');
    return new Date() < TESTING_PERIOD_END;
};

// Initialize on load (call this early in app startup)
export const initServerTime = (): void => {
    fetchServerTestingStatus().catch(() => { });
};
