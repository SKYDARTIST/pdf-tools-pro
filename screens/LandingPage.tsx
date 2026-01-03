import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, Sparkles, Shield, Cpu, MessageSquare, ArrowRight, Twitter } from 'lucide-react';
import LegalFooter from '../components/LegalFooter';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col overflow-x-hidden">
            {/* Minimalist Landing Header */}
            <header className="px-8 py-10 flex justify-between items-center relative z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-black dark:bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                        <Zap size={20} className="text-white dark:text-black" fill="currentColor" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[14px] font-black uppercase tracking-tighter leading-none">Anti-Gravity</span>
                        <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">OS 2.0.1</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[8px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">Authenticated Pulse</div>
                    <div className="text-[10px] font-black uppercase tracking-widest">Built By Cryptobulla</div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center px-8 relative">
                {/* Background Tech Pulse */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none select-none overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30rem] font-black tracking-[-0.1em] leading-none text-black dark:text-white opacity-10">
                        AG
                    </div>
                </div>

                <div className="relative z-10 max-w-sm w-full space-y-16 text-center">
                    {/* Brand Signature */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                        className="space-y-6"
                    >
                        <div className="flex justify-center mb-8">
                            <motion.div
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                                className="px-6 py-2 bg-black/5 dark:bg-white/5 rounded-full border border-black/5 dark:border-white/5 flex items-center gap-2"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Neural Protocol Ready</span>
                            </motion.div>
                        </div>

                        <h1 className="text-7xl font-black uppercase tracking-tighter leading-[0.85] text-gray-900 dark:text-white">
                            Anti<br />Gravity
                        </h1>

                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto">
                            The elite, ad-free AI PDF utility for high-performance builders.
                        </p>
                    </motion.div>

                    {/* Entry CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-6"
                    >
                        <motion.button
                            whileHover={{ scale: 1.05, y: -4 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/workspace')}
                            className="w-full bg-black dark:bg-white text-white dark:text-black py-8 rounded-[40px] flex items-center justify-center group shadow-2xl relative overflow-hidden"
                        >
                            <motion.div
                                animate={{ x: ['-200%', '200%'] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "linear", repeatDelay: 1 }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-black/10 to-transparent skew-x-12"
                            />
                            <span className="text-sm font-black uppercase tracking-[0.3em] ml-2">Enter Workspace</span>
                            <ArrowRight size={20} className="ml-4 group-hover:translate-x-2 transition-transform" />
                        </motion.button>

                        <div className="flex justify-center gap-12 pt-8 opacity-40">
                            {[
                                { icon: Shield, label: 'Secure' },
                                { icon: Cpu, label: 'Neural' },
                                { icon: Sparkles, label: 'Elite' }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                    <item.icon size={16} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* Premium Legal Footer */}
            <LegalFooter />
        </div>
    );
};

export default LandingPage;
