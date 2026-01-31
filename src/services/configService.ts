/**
 * Anti-Gravity Config Service
 * Enforces STRICT MODE for environment variables.
 * Prevents build-time leakage of fallback secrets.
 */

interface AppConfig {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    VITE_AG_PROTOCOL_SIGNATURE: string;
    VITE_AG_API_URL: string;
    VITE_ADMIN_UIDS: string[];
    IS_PRODUCTION: boolean;
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
    VITE_AG_PROTOCOL_SIGNATURE: getEnvVar('VITE_AG_PROTOCOL_SIGNATURE'),
    VITE_AG_API_URL: import.meta.env.PROD
        ? 'https://pdf-tools-pro-indol.vercel.app'
        : 'http://localhost:3000',
    VITE_ADMIN_UIDS: (import.meta.env.VITE_ADMIN_UIDS || '').split(',').filter(Boolean),
    IS_PRODUCTION: import.meta.env.PROD
};

export default Config;
