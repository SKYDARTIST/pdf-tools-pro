import { createClient } from '@supabase/supabase-js';
import Config from './configService';
import { SecurityLogger, maskEmail } from '../utils/securityUtils';
import { clearLogs } from './persistentLogService';
import AuthService from './authService';

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
        // Verify credential with Google backend (Verify ID Token)
        // Note: Ideally this verification happens on your SERVER to be truly secure.
        // For this implementation, we trust the client-side Google response initially
        // but verify against our Database Upsert.

        // Decode the JWT (Client-side decode just to get info, verification happens via API call usually)
        // For simplicity in Phase 1 without a backend verification endpoint yet:
        const base64Url = credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const decoded = JSON.parse(jsonPayload);

        const googleUid = decoded.sub; // Google's unique ID
        const email = decoded.email;
        const name = decoded.name;
        const picture = decoded.picture;

        SecurityLogger.log('Google Auth: Processing login for', { email: maskEmail(email) });

        // Create or update user in Supabase
        // We try to insert/update. If RLS blocks us (because we aren't "logged in" to Supabase Auth yet),
        // we might need to rely on our API endpoint or Supabase Auth.
        // BUT, for this custom flow (managing our own table `user_accounts`):
        const { data: user, error } = await supabase
            .from('user_accounts')
            .upsert([{
                google_uid: googleUid,
                email,
                name,
                picture,
                last_login: new Date().toISOString(),
                // created_at is default now()
            }], {
                onConflict: 'google_uid'
            })
            .select()
            .single();

        if (error) {
            const errorMsg = error.message || 'Unknown error';
            SecurityLogger.error('Google Auth: Supabase upsert failed', { message: errorMsg, code: error.code });
            // Fallback: If RLS prevents direct access, we might need to call our API
            // For now, assume public/service role or policy allows it, or we use API.
            // Let's implement the API call fallback if direct DB access fails.
            return null;
        }

        // Store ONLY the UID locally (No PII in localStorage for security/GDPR)
        localStorage.setItem('google_uid', googleUid);

        // Update memory cache
        cachedUser = { google_uid: googleUid, email, name, picture };

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
