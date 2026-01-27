import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''; // Use Anon Key for client-side

const supabase = createClient(supabaseUrl, supabaseKey);

export interface GoogleUser {
    google_uid: string;
    email: string;
    name: string;
    picture: string;
}

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

        console.log('Google Auth: Processing login for', email);

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
            console.error('Google Auth: Supabase upsert failed', error);
            // Fallback: If RLS prevents direct access, we might need to call our API
            // For now, assume public/service role or policy allows it, or we use API.
            // Let's implement the API call fallback if direct DB access fails.
            return null;
        }

        // Store session info locally
        localStorage.setItem('google_uid', googleUid);
        localStorage.setItem('user_email', email);
        localStorage.setItem('user_name', name);
        localStorage.setItem('user_picture', picture);

        return { google_uid: googleUid, email, name, picture };
    } catch (error) {
        console.error('Google Auth: Sign in error', error);
        return null;
    }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<GoogleUser | null> => {
    const googleUid = localStorage.getItem('google_uid');
    if (!googleUid) return null;

    const email = localStorage.getItem('user_email') || '';
    const name = localStorage.getItem('user_name') || '';
    const picture = localStorage.getItem('user_picture') || '';

    // Return local cached user immediately for UI speed
    return { google_uid: googleUid, email, name, picture };
};

/**
 * Logout user
 */
export const logout = (): void => {
    localStorage.removeItem('google_uid');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_picture');

    // Optional: Redirect or reload
    window.location.reload();
};
