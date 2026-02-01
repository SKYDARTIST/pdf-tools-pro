/**
 * Server Time Service - Fetches real time from backend for clock validation
 */
import Config from './configService';
import { secureFetch } from './apiService';

let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // Cache for 5 minutes
let cachedServerTime: string | null = null;

export const fetchServerTime = async (): Promise<string | null> => {
    // Return cached value if fresh
    if (cachedServerTime && Date.now() - lastFetchTime < CACHE_DURATION) {
        return cachedServerTime;
    }

    try {
        const backendUrl = `${Config.VITE_AG_API_URL}/api/index`;

        const response = await secureFetch(backendUrl, {
            method: 'POST',
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
