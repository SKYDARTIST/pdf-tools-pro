import { supabase } from './supabaseClient';
import Config from './configService';
import { SecurityLogger, maskEmail } from '@/utils/securityUtils';
import { clearLogs } from './persistentLogService';
import AuthService from './authService';
import { getDeviceId } from './deviceService';
import { initSubscription } from './subscriptionService';

export interface GoogleUser {
    google_uid: string;
    email: string;
    name: string;
    picture: string;
}

// Memory cache for the current user profile to avoid redundant DB calls per session
let cachedUser: GoogleUser | null = null;

/**
 * Exchange Google credential for Supabase session
 */
export const signInWithGoogle = async (credential: string): Promise<GoogleUser | null> => {
    try {
        // SECURITY: Verification now happens SERVER-SIDE during the session handshake.

        // 1. Establish/Upgrade secure session with the Google credential
        // The backend will also sync the user to the DB using the Service Role
        console.log('🔑 Establishing secure session and syncing profile...');
        const { token, profile } = await AuthService.initializeSession(credential);

        if (!token) {
            SecurityLogger.error('Google Auth: Failed to establish verified session');
            return null;
        }

        // 2. Decode profile info for IMMEDIATE UI update (Self-Hydration)
        // We favor the profile returned by the backend if available
        let userProfile: GoogleUser;

        if (profile) {
            userProfile = profile;
        } else {
            const tempDecoded = JSON.parse(atob(credential.split('.')[1]));
            userProfile = {
                google_uid: tempDecoded.sub,
                email: tempDecoded.email,
                name: tempDecoded.name,
                picture: tempDecoded.picture
            };
        }

        SecurityLogger.log('Google Auth: Session established for', { email: maskEmail(userProfile.email) });

        // Store identity locally for instant Header hydration
        localStorage.setItem('google_uid', userProfile.google_uid);
        localStorage.setItem('user_profile', JSON.stringify(userProfile));

        // Update memory cache
        cachedUser = userProfile;

        // PROACTIVE: Pull latest usage/tier data for the new identity
        try {
            await initSubscription();
        } catch (subErr) {
            console.warn('Google Auth: Background subscription sync failed', subErr);
        }

        return cachedUser;
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        SecurityLogger.error('Google Auth: Sign in error', { message: errorMsg });
        return null;
    }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<GoogleUser | null> => {
    const googleUid = localStorage.getItem('google_uid');
    if (!googleUid) return null;

    // 1. Check Memory Cache first
    if (cachedUser && cachedUser.google_uid === googleUid) {
        return cachedUser;
    }

    // 2. Check local storage cache (Self-Hydration)
    const stored = localStorage.getItem('user_profile');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed.google_uid === googleUid) {
                cachedUser = parsed;
                return cachedUser;
            }
        } catch (e) { }
    }

    // SECURITY: CRITICAL VULNERABILITY FIX (v3.1)
    // REMOVED: Fallback to client-side Supabase fetch.
    // Client-side fetching of profiles in RLS-less mode is a data leak.
    // All profile sync must happen via the backend handshake.

    return null;
};

/**
 * Logout user
 */
export const logout = (): void => {
    // 1. Clear Auth Keys
    localStorage.removeItem('google_uid');
    localStorage.removeItem('user_profile');

    // Clear Memory Cache
    cachedUser = null;

    // 2. Clear Subscription & Billing Keys
    localStorage.removeItem('pdf_tools_subscription');
    localStorage.removeItem('pdf_tools_task_limit');
    localStorage.removeItem('consumed_purchases');

    // 3. Optional: Clear cached Integrity tokens
    localStorage.removeItem('integrity_token');

    // 4. SECURITY: Clear persistent debug logs on logout
    clearLogs();

    // 5. SECURITY: Clear session token and CSRF token
    AuthService.clearSession();

    SecurityLogger.log('Google Auth: Session purged. Hard reloading...');

    // Hard reload to reset all memory states
    window.location.reload();
};
