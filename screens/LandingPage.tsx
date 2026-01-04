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
                            LOCAL AI.<br />NO CLOUD.
                        </h1>

                        <div className="space-y-4">
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto">
                                The local-first, zero-login AI PDF suite for high-performance builders.
                            </p>
                            <div className="flex flex-col items-center gap-2">
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-full">
                                    PRIVACY BY DESIGN • EDGE COMPUTING
                                </span>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                    $2.99 LIFETIME vs <span className="line-through opacity-40">$240/YEAR</span>
                                </span>
                            </div>
                        </div>
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

                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.4em] opacity-40">
                            Instant Access • No Account Required • Local-First
                        </p>

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

                    {/* Media Desk / Social Proof Section */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="pt-24 space-y-8"
                    >
                        <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Neural Trust Protocol</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { title: "ZERO-CLOUD", desc: "100% On-Device" },
                                { title: "AIR-GAPPED", desc: "No Internet Req." },
                                { title: "TRUSTED", desc: "50k+ Builders" },
                                { title: "ELITE", desc: "Privacy First" }
                            ].map((badge, i) => (
                                <div key={i} className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5">
                                    <div className="text-[10px] font-black uppercase tracking-tighter">{badge.title}</div>
                                    <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1 text-nowrap">{badge.desc}</div>
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 px-6 py-3 bg-emerald-500/5 border border-emerald-500/10 rounded-full inline-block">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                                "THE MOST PRIVATE PDF SUITE EVER BUILT" — TECH PROTOCOL 2026
                            </span>
                        </div>
                    </motion.div>
                </div>

                {/* Privacy Manifesto Offset Section */}
                <div className="w-full max-w-6xl mx-auto pt-32 pb-16 px-6 sm:px-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">
                        <div className="space-y-10">
                            <h2 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase leading-[0.9]">
                                The Privacy<br className="hidden sm:block" /> Manifesto.
                            </h2>
                            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-bold leading-relaxed tracking-tight max-w-lg">
                                In 2026, Adobe and Foxit are tied to "Cloud-First" strategies that require your data to leave your device. Anti-Gravity is different. We have no servers. We cannot see your documents. We cannot sell your data.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 sm:gap-10">
                                {[
                                    { title: "ZERO KNOWLEDGE", desc: "Absolute data isolation." },
                                    { title: "AIRPLANE MODE", desc: "100% Offline performance." },
                                    { title: "EDGE AI", desc: "Local neural processing." }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                                        <div className="space-y-1">
                                            <div className="text-[11px] font-black uppercase tracking-[0.2em]">{item.title}</div>
                                            <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{item.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[48px] p-8 sm:p-14 space-y-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                                <Shield size={160} />
                            </div>
                            <div className="space-y-6 relative z-10">
                                <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Technical Advantage</div>
                                <h3 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase leading-none">INSTANT SPEED.<br />ZERO RISK.</h3>
                                <p className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 leading-relaxed uppercase tracking-tight max-w-md">
                                    Because we process locally, there is no upload latency. Large PDFs are analyzed instantly by your device's own hardware. This is the future of secure document intelligence.
                                </p>
                                <div className="pt-10 flex items-center justify-between border-t border-black/10 dark:border-white/10">
                                    <div className="text-left">
                                        <div className="text-[9px] font-black opacity-30 uppercase tracking-[0.1em] mb-1">Latency</div>
                                        <div className="text-2xl sm:text-3xl font-black text-emerald-500 tracking-tighter">0ms</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] font-black opacity-30 uppercase tracking-[0.1em] mb-1">Cloud Leak</div>
                                        <div className="text-2xl sm:text-3xl font-black text-emerald-500 tracking-tighter">IMP***IBLE</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Premium Legal Footer */}
            <LegalFooter />
        </div>
    );
};

export default LandingPage;
