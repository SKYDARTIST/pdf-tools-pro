/**
 * Anti-Gravity Config Service
 * Enforces STRICT MODE for environment variables.
 * Prevents build-time leakage of fallback secrets.
 */

interface AppConfig {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    // REMOVED: VITE_AG_PROTOCOL_SIGNATURE (server-side secret only)
    VITE_AG_API_URL: string;
    VITE_ADMIN_UIDS: string[];
    IS_PRODUCTION: boolean;
    GOOGLE_WEB_CLIENT_ID: string;
    GOOGLE_ANDROID_CLIENT_ID: string;
}

const getEnvVar = (name: string, fallback?: string): string => {
    const value = import.meta.env[name];
    if (!value && !fallback) {
        const error = `FATAL: Missing critical environment variable: ${name}. App cannot initialize in secure mode.`;
        console.error(error);
        // In production, we want a hard crash to prevent insecure state
        if (import.meta.env.PROD) {
            throw new Error(error);
        }
        return `MISSING_${name}`;
    }
    return value || fallback || "";
};

export const Config: AppConfig = {
    VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL'),
    VITE_SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY'),
    // REMOVED: VITE_AG_PROTOCOL_SIGNATURE (accessed directly from import.meta.env where needed)
    VITE_AG_API_URL: import.meta.env.PROD
        ? 'https://pdf-tools-pro-indol.vercel.app'
        : 'http://localhost:3000',
    VITE_ADMIN_UIDS: (import.meta.env.VITE_ADMIN_UIDS || '').split(',').filter(Boolean),
    IS_PRODUCTION: import.meta.env.PROD,
    GOOGLE_WEB_CLIENT_ID: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ||
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        '577377406590-9jl373159h9a2bgr3i6fbngv18ndjf75.apps.googleusercontent.com',
    GOOGLE_ANDROID_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID_ANDROID ||
        '577377406590-rcr0l7607ok07odbb9787017en9nikqp.apps.googleusercontent.com'
};

export default Config;
