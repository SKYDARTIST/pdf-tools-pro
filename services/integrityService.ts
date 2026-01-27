/**
 * Play Integrity API Service
 * In 2026, this is used to verify that requests come from a legitimate, 
 * unmodified version of the app installed via the Google Play Store.
 */
import { PlayIntegrity } from '@capacitor-community/play-integrity';
import { Capacitor } from '@capacitor/core';
import { getDeviceId } from './usageService';

export const getIntegrityToken = async (): Promise<string> => {
    // DEV MODE: Capacitor on localhost uses mock
    const isCapacitor = !!(window as any).Capacitor;
    const isDevelopment = window.location.hostname === 'localhost' && !isCapacitor;

    if (isDevelopment) {
        console.warn('Anti-Gravity Integrity: Using MOCK token (Dev Mode)');
        const deviceId = await getDeviceId();

        // Secure Nonce for Mock
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        const secureNonce = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

        const payload = {
            deviceId,
            timestamp: Date.now(),
            nonce: secureNonce,
            platform: 'mock-dev',
            version: '0.0.0-dev'
        };
        return btoa(JSON.stringify(payload));
    }


    try {
        // SAFETY CHECK: Ensure we are really on a device before calling native code
        if (!Capacitor.isNativePlatform()) {
            console.warn('Anti-Gravity Integrity: Not native platform, returning web fallback');
            const deviceId = await getDeviceId();
            return btoa(JSON.stringify({ deviceId, platform: 'web-fallback' }));
        }

        // PROD MODE: Real Google Play Integrity API
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        const nonce = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

        // Google Cloud Project Number for "Pdf Toola Pro"
        const CLOUD_PROJECT_NUMBER = 577377406590;

        console.log('Anti-Gravity Integrity: Requesting token...');

        // TIMEOUT GUARD: If Google Play Services is hung, don't crash the app. Return fallback after 10s.
        const integrityPromise = PlayIntegrity.requestIntegrityToken({
            nonce: nonce,
            googleCloudProjectNumber: CLOUD_PROJECT_NUMBER
        });

        const timeoutPromise = new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error('Integrity API Timeout')), 10000)
        );

        const result: any = await Promise.race([integrityPromise, timeoutPromise]);

        console.log('Anti-Gravity Integrity: ✅ Real Token Generated');
        return result.token;

    } catch (error) {
        console.error('Anti-Gravity Integrity: ❌ API Failure (Handled):', error);

        // FAIL-SAFE: Return a usable fallback so the app DOES NOT CRASH
        const deviceId = await getDeviceId();
        const fallbackPayload = {
            deviceId,
            timestamp: Date.now(),
            error: (error as Error).message || 'Unknown Native Error',
            platform: 'android-fallback',
            isFallback: true
        };
        return btoa(JSON.stringify(fallbackPayload));
    }
};
