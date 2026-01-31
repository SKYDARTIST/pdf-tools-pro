import { supabase } from './supabaseClient';
import { getDeviceId } from './deviceService';
import { getIntegrityToken } from './integrityService';
import Config from './configService';
import { setCsrfToken, clearCsrfToken } from './csrfService';
import { STORAGE_KEYS } from '@/utils/constants';

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
    async initializeSession(credential?: string): Promise<{ token: string | null; profile?: any; success: boolean }> {
        // If we have a valid token AND no new identity is being bound, return it
        const isExpired = !this.sessionToken || Date.now() >= this.tokenExpiry;
        const needsRefresh = !isExpired && (this.tokenExpiry - Date.now() < 5 * 60 * 1000); // 5 min buffer

        // If it's valid and NOT a forced login (credential provided), return existing
        if (!isExpired && !needsRefresh && !credential) {
            return { token: this.sessionToken, success: true };
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

        return this.performHandshakeWithRetry(activeCredential);
    }

    /**
     * Handshake with exponential backoff retry (Fix for 401 loops)
     */
    private async performHandshakeWithRetry(credential?: string, attempt: number = 0): Promise<{ token: string | null; profile?: any; success: boolean }> {
        const MAX_RETRIES = 3;
        try {
            console.log(`Anti-Gravity Auth: Handshake attempt ${attempt + 1}/${MAX_RETRIES}`, { hasCredential: !!credential });

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
                    credential: credential // PASS verified ID token to backend
                })
            });

            if (response.status === 401) {
                console.warn('Anti-Gravity Auth: Server rejected credentials (401).');

                // Try refreshing Supabase session if credential-based
                if (credential) {
                    try {
                        console.log('Anti-Gravity Auth: 🔄 Attempting Supabase session refresh...');
                        const { data: refreshData } = await supabase.auth.refreshSession();
                        if (refreshData.session?.access_token && attempt < MAX_RETRIES - 1) {
                            return this.performHandshakeWithRetry(refreshData.session.access_token, attempt + 1);
                        }
                    } catch (e) {
                        console.error('Supabase refresh failed:', e);
                    }
                }

                this.clearSession();
                return { token: null, success: false };
            }

            // Retry on 5xx or network failures
            if (!response.ok && attempt < MAX_RETRIES - 1) {
                const backoff = 200 * Math.pow(2, attempt);
                console.warn(`Anti-Gravity Auth: Handshake failed (${response.status}). Retrying in ${backoff}ms...`);
                await new Promise(r => setTimeout(r, backoff));
                return this.performHandshakeWithRetry(credential, attempt + 1);
            }

            if (!response.ok) {
                console.error('Anti-Gravity Auth: Session handshake failed permanently:', response.status);
                return { token: null, success: false };
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
                return { token: this.sessionToken, profile: data.profile, success: true };
            }
        } catch (error) {
            console.error('Anti-Gravity Auth: Network error during handshake:', error);
            if (attempt < MAX_RETRIES - 1) {
                await new Promise(r => setTimeout(r, 200));
                return this.performHandshakeWithRetry(credential, attempt + 1);
            }
        }
        return { token: null, success: false };
    }

    /**
     * Diagnostic: Get current session status
     */
    getSessionStatus() {
        const isValid = this.sessionToken && Date.now() < this.tokenExpiry;
        const minutesUntilExpiry = this.tokenExpiry ? Math.round((this.tokenExpiry - Date.now()) / 60000) : -1;

        return {
            hasToken: !!this.sessionToken,
            isValid,
            expiresInMins: minutesUntilExpiry,
            tokenPreview: this.sessionToken ? this.sessionToken.substring(0, 15) + '...' : null
        };
    }

    /**
     * Call this when a non-handshake request returns 401
     */
    handleUnauthorized() {
        console.warn('Anti-Gravity Auth: 🛡️ Unauthorized response detected. Purging dead session.');
        this.clearSession();
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
        // Test account whitelist disabled in production for security
        return false;
    }
}

export default new AuthService();
