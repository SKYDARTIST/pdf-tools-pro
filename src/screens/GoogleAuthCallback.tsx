import React from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '@/services/googleAuthService';
import { SecurityLogger, maskEmail } from '@/utils/securityUtils';
import Config from '@/services/configService';

const GoogleAuthCallback: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get code/token from URL (Google returns tokens in hash, codes in search or hash-query)
                const getParam = (name: string) => {
                    const search = new URLSearchParams(window.location.search);
                    if (search.has(name)) return search.get(name);

                    const hashPart = window.location.hash;
                    const queryIndex = hashPart.indexOf('?');
                    if (queryIndex !== -1) {
                        const hashSearch = new URLSearchParams(hashPart.substring(queryIndex + 1));
                        if (hashSearch.has(name)) return hashSearch.get(name);
                    }

                    // Also check if the hash ITSELF is just the query (fragment flow)
                    const fragmentSearch = new URLSearchParams(window.location.hash.substring(1));
                    if (fragmentSearch.has(name)) return fragmentSearch.get(name);

                    return null;
                };

                const code = getParam('code');
                const idToken = getParam('id_token');

                let credential = idToken;

                // Handle PKCE Code Exchange
                if (code) {
                    console.log('🔑 Found PKCE code, exchanging for token...');
                    const codeVerifier = localStorage.getItem('google_code_verifier');

                    if (!codeVerifier) {
                        throw new Error('No code verifier found in local state');
                    }

                    // Exchange code for tokens
                    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        /* RESTORING CORRECT STRUCTURE */
                        body: new URLSearchParams({
                            client_id: Config.GOOGLE_OAUTH_CLIENT_ID,
                            grant_type: 'authorization_code',
                            code: code,
                            redirect_uri: (window as any).Capacitor?.isNativePlatform()
                                ? 'com.cryptobulla.antigravity:/auth-callback'
                                : window.location.origin + '/auth-callback',
                            code_verifier: codeVerifier,
                        }),
                    });

                    const tokens = await tokenResponse.json();
                    if (tokens.error) {
                        throw new Error(`Token exchange failed: ${tokens.error_description || tokens.error}`);
                    }
                    credential = tokens.id_token;
                }

                if (credential) {
                    const user = await signInWithGoogle(credential);
                    if (user) {
                        SecurityLogger.log('✅ Signed in as:', { email: maskEmail(user.email) });

                        // Broadcast success to global listeners (like App.tsx to close modal)
                        window.dispatchEvent(new CustomEvent('neural-auth-success', { detail: { user } }));

                        // Use navigate instead of location.href for smoother Capacitor transitions
                        navigate('/workspace', { replace: true });
                    } else {
                        throw new Error('Supabase sync failed');
                    }
                } else {
                    console.warn('No credential or code found, redirecting...');
                    navigate('/workspace');
                }
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Authentication failed';
                console.error('Auth callback error:', { message: errorMsg, timestamp: new Date().toISOString() });

                // SHOW ERROR to user
                alert(`Login failed: ${errorMsg}\n\nRedirecting to homepage...`);

                // Let's just redirect after 2s
                setTimeout(() => navigate('/workspace'), 2000);
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div className='min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center'>
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-bold text-white mb-2">Processing Neural Link...</h2>
            <p className="text-gray-400">Authenticating secure session, please wait.</p>
        </div>
    );
};

export default GoogleAuthCallback;
