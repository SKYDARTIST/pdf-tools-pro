import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { signInWithGoogle } from '../services/googleAuthService';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-gray-200 dark:border-gray-800"
                >
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">🔐</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            Sign In to Use AI
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Your AI credits and subscription will sync across all your devices securely.
                        </p>
                    </div>

                    <div className="flex justify-center mb-6">
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-blue-600">
                                <span className="animate-spin text-xl">⏳</span>
                                <span className="font-medium">Signing in...</span>
                            </div>
                        ) : (
                            <GoogleLogin
                                onSuccess={async (credentialResponse) => {
                                    if (credentialResponse.credential) {
                                        setIsLoading(true);
                                        const user = await signInWithGoogle(credentialResponse.credential);
                                        setIsLoading(false);
                                        if (user) {
                                            onSuccess();
                                            onClose();
                                        }
                                    }
                                }}
                                onError={() => {
                                    console.error('Login Failed');
                                    setIsLoading(false);
                                }}
                                theme="filled_blue"
                                shape="pill"
                                width="250"
                            />
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                        Cancel
                    </button>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
                        <p className="text-xs text-gray-400">
                            🔒 Secure Google Authentication
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
