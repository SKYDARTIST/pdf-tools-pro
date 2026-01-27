
/**
 * Play Integrity API Service
 * In 2026, this is used to verify that requests come from a legitimate, 
 * unmodified version of the app installed via the Google Play Store.
 */
import { PlayIntegrity } from '@capacitor-community/play-integrity';
import { getDeviceId } from './usageService';

export const getIntegrityToken = async (): Promise<string> => {
    // DEV MODE: Capacitor on localhost uses mock
    const isCapacitor = !!(window as any).Capacitor;
    const isDevelopment = window.location.hostname === 'localhost' && !isCapacitor;

    if (isDevelopment) {
        console.warn('Anti-Gravity Integrity: Using MOCK token (Dev Mode)');
        const deviceId = await getDeviceId();
        const payload = {
            deviceId,
            timestamp: Date.now(),
            nonce: Math.random().toString(36).substring(7),
            platform: 'mock-dev',
            version: '0.0.0-dev'
        };
        return btoa(JSON.stringify(payload));
    }

    try {
        // PROD MODE: Real Google Play Integrity API
        // Generate a cryptographic nonce (server should validate this, but client-side random is better than static)
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        const nonce = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

        // Request the integrity token from Google Play
        // standardRequest() is the modern API call
        const result = await PlayIntegrity.requestIntegrityToken({
            nonce: nonce, // Google requires a nonce to prevent replay attacks
            cloudProjectNumber: 577377406590 // Source: User Screenshot
        });

        console.log('Anti-Gravity Integrity: ✅ Real Token Generated');
        return result.token;
    } catch (error) {
        console.error('Anti-Gravity Integrity: ❌ API Failure:', error);

        // FAIL-SAFE: If Google Play Services is unavailable (e.g. Huawei device, emulator without Play Store)
        // We return a "limited" token that the backend can choose to accept with lower trust score
        const deviceId = await getDeviceId();
        const fallbackPayload = {
            deviceId,
            timestamp: Date.now(),
            error: (error as Error).message,
            platform: 'android-fallback',
            isFallback: true
        };
        return btoa(JSON.stringify(fallbackPayload));
    }
};
