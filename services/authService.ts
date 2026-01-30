import { supabase } from './supabaseClient';
import { getDeviceId } from './deviceService';
import { getIntegrityToken } from './integrityService';
import Config from './configService';
import { setCsrfToken, clearCsrfToken } from './csrfService';
import { STORAGE_KEYS } from '../utils/constants';

// Backend URL selection (DRY principle)
const getBackendUrl = () => {
    return `${Config.VITE_AG_API_URL}/api/index`;
};

class AuthService {
    private sessionToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor() {
        this.loadSession();
    }

    /**
     * Load persisted session from storage
     */
    private loadSession() {
        try {
            const stored = localStorage.getItem('ag_session_token');
            const expiry = localStorage.getItem('ag_session_expiry');
            if (stored && expiry) {
                const expiryTime = parseInt(expiry);
                if (Date.now() < expiryTime) {
                    this.sessionToken = stored;
                    this.tokenExpiry = expiryTime;
                    console.log('Anti-Gravity Auth: ⚡ Restored persisted session');
                } else {
                    this.clearSession(); // Cleanup expired
                }
            }
        } catch (e) {
            console.error('Auth Restore Error', e);
        }
    }

    /**
     * Save session to storage
     */
    private persistSession(token: string, expiry: number) {
        localStorage.setItem('ag_session_token', token);
        localStorage.setItem('ag_session_expiry', expiry.toString());
    }

    /**
     * initializes the secure session by exchanging integrity proofs (and optionally identity) for a session token
     */
    async initializeSession(credential?: string): Promise<{ token: string | null; profile?: any }> {
        // If we have a valid token AND no new identity is being bound, return it
        const isExpired = !this.sessionToken || Date.now() >= this.tokenExpiry;
        const needsRefresh = !isExpired && (this.tokenExpiry - Date.now() < 5 * 60 * 1000); // 5 min buffer

        // If it's valid and NOT a forced login (credential provided), return existing
        if (!isExpired && !needsRefresh && !credential) {
            return { token: this.sessionToken };
        }

        // AUTO-AUTH: If no credential provided, check if we have a persisted Supabase session
        let activeCredential = credential;
        if (!activeCredential) {
            try {
                // Check standard Supabase storage keys via helper
                const { data } = await supabase.auth.getSession();
                if (data.session?.access_token) {
                    activeCredential = data.session.access_token; // Use existing token for handshake
                    console.log('Anti-Gravity Auth: Restored active session from storage');
                }
            } catch (e) {
                console.warn('Anti-Gravity Auth: Failed to restore session from storage', e);
            }
        }

        try {
            console.log(activeCredential ? 'Anti-Gravity Auth: UPGRADING session identity...' : 'Anti-Gravity Auth: Handshaking...');
            const deviceId = await getDeviceId();
            const integrityToken = await getIntegrityToken();
            const signature = Config.VITE_AG_PROTOCOL_SIGNATURE;

            const response = await fetch(getBackendUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-ag-signature': signature,
                    'x-ag-device-id': deviceId,
                    'x-ag-integrity-token': integrityToken
                },
                body: JSON.stringify({
                    type: 'session_init',
                    credential: activeCredential // PASS verified ID token to backend
                })
            });

            if (!response.ok) {
                console.error('Anti-Gravity Auth: Session handshake failed:', response.status);
                return { token: null };
            }

            const data = await response.json();
            if (data.sessionToken) {
                this.sessionToken = data.sessionToken;
                // Expiry buffer: 55 mins (server issues 1h)
                this.tokenExpiry = Date.now() + (55 * 60 * 1000);

                // PERSIST SESSION
                this.persistSession(this.sessionToken, this.tokenExpiry);

                if (data.csrfToken) {
                    setCsrfToken(data.csrfToken);
                }

                console.log('Anti-Gravity Auth: ✅ Secure session synchronized');
                return { token: this.sessionToken, profile: data.profile };
            }
        } catch (error) {
            console.error('Anti-Gravity Auth: Network error during handshake:', error);
        }
        return { token: null };
    }

    /**
     * Returns the Authorization header value (Bearer <token>)
     * Automatically triggers silent refresh if nearing expiry
     */
    async getAuthHeader(): Promise<string> {
        const { token } = await this.initializeSession();
        return token ? `Bearer ${token}` : '';
    }

    /**
     * Clear session (e.g. on logout or critical error)
     */
    clearSession() {
        this.sessionToken = null;
        this.tokenExpiry = 0;
        localStorage.removeItem('ag_session_token');
        localStorage.removeItem('ag_session_expiry');
        // SECURITY: Clear CSRF token on logout
        clearCsrfToken();
    }

    /**
     * Helper to detect authorized test accounts
     */
    isTestAccount(): boolean {
        const uid = localStorage.getItem(STORAGE_KEYS.GOOGLE_UID);
        const TEST_ACCOUNTS = ['reviewer_555', 'test@example.com']; // Whitelist
        return TEST_ACCOUNTS.some(testId => uid?.includes(testId));
    }
}

export default new AuthService();
