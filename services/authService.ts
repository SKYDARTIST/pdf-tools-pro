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
     * initializes the secure session by exchanging integrity proofs for a session token
     */
    async initializeSession(): Promise<string | null> {
        // If we have a valid token, return it
        if (this.sessionToken && Date.now() < this.tokenExpiry) {
            return this.sessionToken;
        }

        try {
            console.log('Anti-Gravity Auth: Initializing secure session...');
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
                body: JSON.stringify({ type: 'session_init' })
            });

            if (!response.ok) {
                console.error('Anti-Gravity Auth: Session handshake failed:', response.status);
                return null;
            }

            const data = await response.json();
            if (data.sessionToken) {
                this.sessionToken = data.sessionToken;
                // expired in 1 hour usually, but we'll respect server or default to 55 mins
                this.tokenExpiry = Date.now() + (55 * 60 * 1000);

                // SECURITY: Store CSRF token received from server for subsequent requests
                if (data.csrfToken) {
                    setCsrfToken(data.csrfToken);
                }

                console.log('Anti-Gravity Auth: ✅ Secure session established');
                return this.sessionToken;
            }
        } catch (error) {
            console.error('Anti-Gravity Auth: Network error during handshake:', error);
        }
        return null;
    }

    /**
     * Returns the Authorization header value (Bearer <token>)
     * Automatically refreshes session if needed
     */
    async getAuthHeader(): Promise<string> {
        let token = await this.initializeSession();
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
