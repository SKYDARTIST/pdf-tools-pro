import React from 'react';

import { signInWithGoogle } from '@/services/googleAuthService';
import Config from '@/services/configService';
import { getFriendlyErrorMessage } from '@/utils/errorMapping';
import { motion, AnimatePresence } from 'framer-motion';
import { generateCodeVerifier, generateCodeChallenge } from '@/services/pkce';
import { Browser } from '@capacitor/browser';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title?: string;
    message?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    title = 'Sign In to Use AI Features',
    message = 'Your AI credits and subscription sync across devices when you sign in'
}) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // Reset state when modal closes
    React.useEffect(() => {
        if (!isOpen) {
            setIsLoading(false);
            setError(null);
        }
    }, [isOpen]);

    const handleGoogleSignIn = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Generate PKCE values
            const codeVerifier = generateCodeVerifier();
            const codeChallenge = await generateCodeChallenge(codeVerifier);

            // Store verifier for later exchange in the callback
            localStorage.setItem('google_code_verifier', codeVerifier);

            // Add listener to reset loading state if user closes the browser manually
            Browser.addListener('browserFinished', () => {
                console.log('🔑 Browser: Tab closed by user, resetting loading state');
                setIsLoading(false);
            });

            // Use the dynamic Client ID from Config (Defaults to Mobile, Overrides with Web on Vercel)
            const clientId = Config.GOOGLE_OAUTH_CLIENT_ID;

            // If we are on a real device (Capacitor), use the custom scheme with double-slash
            // This MUST match the android:host in AndroidManifest.xml
            const isCapacitor = (window as any).Capacitor?.isNativePlatform();
            const redirectUri = isCapacitor
                ? 'com.cryptobulla.antigravity:/auth-callback'
                : window.location.origin + '/auth-callback';

            const scope = 'openid profile email';

            // response_type=code is MANDATORY for Native Client IDs (PKCE flow)
            const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${clientId}&` +
                `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                `response_type=code&` +
                `scope=${encodeURIComponent(scope)}&` +
                `code_challenge=${codeChallenge}&` +
                `code_challenge_method=S256`;

            // THE TOP-CLASS SOLUTION: Chrome Custom Tabs / Safari View Controller
            // This makes the browser "vanish" after login and doesn't pollute history.
            if (isCapacitor) {
                try {
                    await Browser.open({ url: googleAuthUrl, windowName: '_self' });
                } catch (browserError) {
                    console.warn('Browser plugin not synced yet, falling back to location.href');
                    window.location.href = googleAuthUrl;
                }
            } else {
                window.location.href = googleAuthUrl;
            }
            setIsLoading(false);
        } catch (error) {
            setError(getFriendlyErrorMessage(error));
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-[9998]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    >
                        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-sm w-full p-6">
                            {/* Header */}
                            <div className="mb-6 text-center">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🔐</span>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    {title}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    {message}
                                </p>
                            </div>

                            {/* Error Display */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Google Sign In Button */}
                            <div className="mb-6 flex justify-center">
                                <button
                                    onClick={handleGoogleSignIn}
                                    disabled={isLoading}
                                    className='w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                                >
                                    <svg className='w-5 h-5' viewBox='0 0 24 24'>
                                        <path fill='currentColor' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' />
                                        <path fill='currentColor' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' />
                                        <path fill='currentColor' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' />
                                        <path fill='currentColor' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' />
                                    </svg>
                                    <span className="text-gray-700 dark:text-gray-200 font-medium">
                                        {isLoading ? 'Connecting...' : 'Sign In with Google'}
                                    </span>
                                </button>
                            </div>

                            {/* Cancel Button */}
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
