import { getDeviceId } from './usageService';
import { getIntegrityToken } from './integrityService';
import Config from './configService';
import { setCsrfToken, clearCsrfToken } from './csrfService';

// Backend URL selection (DRY principle)
const getBackendUrl = () => {
    return `${Config.VITE_AG_API_URL}/api/index`;
};

class AuthService {
    private sessionToken: string | null = null;
    private tokenExpiry: number = 0;

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

        try {
            console.log(credential ? 'Anti-Gravity Auth: UPGRADING session identity...' : 'Anti-Gravity Auth: Handshaking...');
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
                    credential // PASS verified ID token to backend
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
        // SECURITY: Clear CSRF token on logout
        clearCsrfToken();
    }
}

export default new AuthService();
