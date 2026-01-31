import { Device } from '@capacitor/device';
import { STORAGE_KEYS } from '@/utils/constants';
import { Logger } from '@/utils/logger';

const generateUUID = () => {
    try {
        if (typeof crypto !== 'undefined') {
            if (crypto.randomUUID) {
                return crypto.randomUUID();
            }
            if (crypto.getRandomValues) {
                const buff = new Uint8Array(16);
                crypto.getRandomValues(buff);
                buff[6] = (buff[6] & 0x0f) | 0x40; // Version 4
                buff[8] = (buff[8] & 0x3f) | 0x80; // Variant 10
                return [...buff].map((b, i) => {
                    const hex = b.toString(16).padStart(2, '0');
                    if (i === 4 || i === 6 || i === 8 || i === 10) return '-' + hex;
                    return hex;
                }).join('');
            }
        }
    } catch (e) { }

    // Extreme fallback (only if crypto API is completely missing)
    Logger.warn('Security', 'Crypto API missing, using insecure fallback');
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

// Get or generate a persistent ID for this device
export const getDeviceId = async (): Promise<string> => {
    try {
        // Try to get hardware ID first (Android/iOS)
        const info = await Device.getId();
        if (info && info.identifier) {
            return info.identifier;
        }
    } catch (e) {
        // Fallback for web or if plugin fails
    }

    // Fallback: localStorage
    let id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!id) {
        id = generateUUID();
        localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
    }
    return id;
};
