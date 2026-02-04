import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, Shield, Cpu, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { generateCodeVerifier, generateCodeChallenge } from '@/services/pkce';
import { Browser } from '@capacitor/browser';
import { getFriendlyErrorMessage } from '@/utils/errorMapping';

import Config from '@/services/configService';

const LoginScreen: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // If user is already logged in, push to workspace
    useEffect(() => {
        if (localStorage.getItem('google_uid')) {
            navigate('/workspace', { replace: true });
        }
    }, [navigate]);

    const handleGoogleSignIn = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const codeVerifier = generateCodeVerifier();
            const codeChallenge = await generateCodeChallenge(codeVerifier);
            localStorage.setItem('google_code_verifier', codeVerifier);

            const isNative = Capacitor.isNativePlatform();
            const clientId = isNative ? Config.GOOGLE_ANDROID_CLIENT_ID : Config.GOOGLE_WEB_CLIENT_ID;
            const redirectUri = isNative
                ? 'com.cryptobulla.antigravity:/auth-callback'
                : window.location.origin + '/auth-callback';

            const scope = 'openid profile email';

            const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${clientId}&` +
                `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                `response_type=code&` +
                `scope=${encodeURIComponent(scope)}&` +
                `code_challenge=${codeChallenge}&` +
                `code_challenge_method=S256`;

            if (isNative) {
                await Browser.open({ url: googleAuthUrl, windowName: '_self' });
            } else {
                window.location.href = googleAuthUrl;
            }
        } catch (err) {
            setError(getFriendlyErrorMessage(err));
            setIsLoading(false);
        }
    };



    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Immersive Background Element */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-sm space-y-12"
            >
                {/* Brand Identity */}
                <div className="text-center space-y-6">
                    <motion.div
                        animate={{
                            rotateY: [0, 360],
                            boxShadow: ["0 0 20px rgba(16, 185, 129, 0.2)", "0 0 50px rgba(16, 185, 129, 0.4)", "0 0 20px rgba(16, 185, 129, 0.2)"]
                        }}
                        transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                        className="w-20 h-20 bg-emerald-500 rounded-[24px] mx-auto flex items-center justify-center shadow-2xl"
                    >
                        <Zap size={40} className="text-white fill-current" />
                    </motion.div>
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Secure Link</h1>
                        <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-[0.4em]">Initialize Neural Session</p>
                    </div>
                </div>

                {/* Main Card */}
                <div className="monolith-glass rounded-[40px] p-8 border border-white/5 space-y-8 shadow-2xl">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                <Shield size={18} />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-white uppercase tracking-wide">Privacy First</div>
                                <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">End-to-End Encryption</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                <Cpu size={18} />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-white uppercase tracking-wide">Local Processing</div>
                                <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">On-Device Intelligence</div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[9px] font-black text-red-500 uppercase tracking-wider text-center"
                        >
                            {error}
                        </motion.div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="w-full h-16 bg-white text-black rounded-3xl flex items-center justify-center gap-4 group transition-all disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin text-emerald-600" size={24} />
                        ) : (
                            <>
                                <svg className="w-6 h-6" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Sign In with Google</span>
                            </>
                        )}
                    </motion.button>
                </div>

                <div className="text-center space-y-4">
                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                        By initializing, you agree to the <br />
                        <span onClick={() => navigate('/legal/privacy')} className="text-emerald-500 cursor-pointer">Privacy Protocol</span> & <span onClick={() => navigate('/legal/tos')} className="text-emerald-500 cursor-pointer">Terms of Service</span>
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-white transition-colors"
                    >
                        Back to Landing
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginScreen;
