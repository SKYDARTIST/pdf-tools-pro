/**
 * Server Time Service - Fetches real time from backend for clock validation
 */
import { getDeviceId } from './deviceService';
import Config from './configService';
import AuthService from './authService';
import { getCsrfToken } from './csrfService';

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
        const deviceId = await getDeviceId();
        const csrfToken = getCsrfToken();

        // SECURITY: Require authenticated session token for server_time endpoint
        const authHeader = await AuthService.getAuthHeader();

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-ag-signature': Config.VITE_AG_PROTOCOL_SIGNATURE,
                'x-ag-device-id': deviceId,
                'Authorization': authHeader,
                'x-csrf-token': csrfToken || ''
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
