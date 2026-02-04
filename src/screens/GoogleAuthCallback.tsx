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
                console.log('🔍 GoogleAuthCallback: Starting auth flow', {
                    href: window.location.href,
                    search: window.location.search,
                    hash: window.location.hash
                });

                // Get code/token from URL - Google OAuth can redirect to root with query params
                // Then HashRouter moves them to hash, so we need to check both locations
                const getParam = (name: string) => {
                    // Priority 1: Standard query string (OAuth redirects here first)
                    const search = new URLSearchParams(window.location.search);
                    if (search.has(name)) {
                        const value = search.get(name);
                        if (value) {
                            console.log(`✅ Found ${name} in window.location.search`);
                            return value;
                        }
                    }

                    // Priority 2: Hash fragment query (HashRouter might move params here)
                    const hashPart = window.location.hash;
                    const queryIndex = hashPart.indexOf('?');
                    if (queryIndex !== -1) {
                        const hashSearch = new URLSearchParams(hashPart.substring(queryIndex + 1));
                        if (hashSearch.has(name)) {
                            const value = hashSearch.get(name);
                            if (value) {
                                console.log(`✅ Found ${name} in hash fragment`);
                                return value;
                            }
                        }
                    }

                    // Priority 3: Implicit flow (access_token in fragment)
                    const fragmentSearch = new URLSearchParams(window.location.hash.substring(1));
                    if (fragmentSearch.has(name)) {
                        const value = fragmentSearch.get(name);
                        if (value) {
                            console.log(`✅ Found ${name} in implicit fragment flow`);
                            return value;
                        }
                    }

                    console.warn(`❌ Parameter "${name}" not found in URL`);
                    console.log('🔍 Debug URL locations:', {
                        'window.location.href': window.location.href,
                        'window.location.search': window.location.search,
                        'window.location.hash': window.location.hash
                    });
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
                    const isCapacitor = (window as any).Capacitor?.isNativePlatform();
                    const redirectUri = isCapacitor
                        ? 'com.cryptobulla.antigravity:/auth-callback'
                        : window.location.origin + '/auth-callback';

                    let tokens;

                    if (isCapacitor) {
                        // Mobile: Direct exchange with Google (Safe/PKCE)
                        console.log('📱 Mobile Auth: Direct exchange with Google');
                        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({
                                client_id: Config.GOOGLE_OAUTH_CLIENT_ID,
                                grant_type: 'authorization_code',
                                code: code,
                                redirect_uri: redirectUri,
                                code_verifier: codeVerifier,
                            }),
                        });
                        tokens = await tokenResponse.json();
                    } else {
                        // Web: Proxy exchange via Backend (Safely uses GOOGLE_CLIENT_SECRET)
                        console.log('🌐 Web Auth: Proxying exchange via Backend');
                        const apiResponse = await fetch(`${Config.VITE_AG_API_URL}/api/index`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-ag-signature': import.meta.env.VITE_AG_PROTOCOL_SIGNATURE || import.meta.env.VITE_AG_SIGNATURE || ''
                            },
                            body: JSON.stringify({
                                type: 'exchange_google_code',
                                code: code,
                                codeVerifier: codeVerifier,
                                redirectUri: redirectUri
                            }),
                        });
                        tokens = await apiResponse.json();
                    }

                    if (!tokens || tokens.error) {
                        throw new Error(`Token exchange failed: ${tokens?.error_description || tokens?.error || 'Unknown error'}`);
                    }
                    credential = tokens.id_token;
                }

                if (credential) {
                    const user = await signInWithGoogle(credential);
                    if (user) {
                        SecurityLogger.log('✅ Signed in as:', { email: maskEmail(user.email) });

                        // Broadcast success to global listeners (like App.tsx to close modal)
                        window.dispatchEvent(new CustomEvent('neural-auth-success', { detail: { user } }));

                        // Redirect back to original destination if available, otherwise to workspace
                        const search = new URLSearchParams(window.location.search);
                        const stateFrom = localStorage.getItem('auth_redirect_path') || '/workspace';
                        localStorage.removeItem('auth_redirect_path');

                        navigate(stateFrom, { replace: true });
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
