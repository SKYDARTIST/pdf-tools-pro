/**
 * Server Time Service - Fetches real time from backend for clock validation
 */
import { getDeviceId } from './usageService';

let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // Cache for 5 minutes
let cachedServerTime: string | null = null;

export const fetchServerTime = async (): Promise<string | null> => {
    // Return cached value if fresh
    if (cachedServerTime && Date.now() - lastFetchTime < CACHE_DURATION) {
        return cachedServerTime;
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
                'x-ag-device-id': await getDeviceId()
            },
            body: JSON.stringify({ type: 'server_time' }),
        });

        if (response.ok) {
            const data = await response.json();
            cachedServerTime = data.serverTime;
            lastFetchTime = Date.now();
            return cachedServerTime;
        } else {
            console.debug('Handshake Protocol: Server time check deferred.');
        }
    } catch (error) {
        console.warn('Server time fetch failed');
    }

    return null;
};

// Initialize on load (call this early in app startup)
export const initServerTime = (): void => {
    fetchServerTime().catch(() => { });
};
