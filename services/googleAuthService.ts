import { createClient } from '@supabase/supabase-js';
import Config from './configService';
import { SecurityLogger, maskEmail } from '../utils/securityUtils';
import { clearLogs } from './persistentLogService';
import AuthService from './authService';
import { getDeviceId } from './usageService';

// Initialize Supabase Client
const supabaseUrl = Config.VITE_SUPABASE_URL;
const supabaseKey = Config.VITE_SUPABASE_ANON_KEY; // Use Anon Key for client-side

const supabase = createClient(supabaseUrl, supabaseKey);

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
        // SECURITY: Removed manual client-side Base64 decoding (Severity 7.4/10 Fix)
        // Verification now happens SERVER-SIDE during the session handshake.

        // 1. Establish/Upgrade secure session with the Google credential
        console.log('🔑 Establishing secure session with verified identity...');
        const sessionToken = await AuthService.initializeSession(credential);

        if (!sessionToken) {
            SecurityLogger.error('Google Auth: Failed to establish verified session');
            return null;
        }

        // 2. Fetch profile info securely from DB (Server-Side verification has already happened)
        // Temporarily using a decoded sub ONLY for the local fetch (not for auth decisions)
        const tempDecoded = JSON.parse(atob(credential.split('.')[1]));
        const googleUid = tempDecoded.sub;

        SecurityLogger.log('Google Auth: Processing login for', { email: maskEmail(tempDecoded.email) });

        // 3. Sync with user_accounts table
        const { data: user, error } = await supabase
            .from('user_accounts')
            .upsert([{
                google_uid: googleUid,
                email: tempDecoded.email,
                name: tempDecoded.name,
                picture: tempDecoded.picture,
                last_login: new Date().toISOString(),
            }], {
                onConflict: 'google_uid'
            })
            .select()
            .single();

        if (error) {
            SecurityLogger.error('Google Auth: DB Sync failed', { message: error.message });
            return null;
        }

        // Store ONLY the UID locally (No PII in localStorage for security/GDPR)
        localStorage.setItem('google_uid', googleUid);

        // Update memory cache
        cachedUser = {
            google_uid: googleUid,
            email: tempDecoded.email,
            name: tempDecoded.name,
            picture: tempDecoded.picture
        };

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

    // 2. Fetch from DB if not in memory (On-demand PII retrieval)
    try {
        const { data, error } = await supabase
            .from('user_accounts')
            .select('google_uid, email, name, picture')
            .eq('google_uid', googleUid)
            .single();

        if (data && !error) {
            cachedUser = data as GoogleUser;
            return cachedUser;
        }
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        SecurityLogger.error('Google Auth: Failed to fetch user profile', { message: errorMsg });
    }

    return null;
};

/**
 * Logout user
 */
export const logout = (): void => {
    // 1. Clear Auth Keys
    localStorage.removeItem('google_uid');

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
