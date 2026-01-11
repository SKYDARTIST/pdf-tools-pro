import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, Sparkles, Shield, Cpu, MessageSquare, ArrowRight, Twitter } from 'lucide-react';
import LegalFooter from '../components/LegalFooter';
import NeuralPulse from '../components/NeuralPulse';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;
        setMousePos({ x, y });
    };

    return (
        <div
            onMouseMove={handleMouseMove}
            className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col overflow-x-hidden selection:bg-emerald-500 selection:text-white"
        >
            {/* Minimalist Landing Header */}
            <header className="px-8 py-10 flex justify-between items-center relative z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-black dark:bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                        <Zap size={20} className="text-white dark:text-black" fill="currentColor" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[14px] font-black uppercase tracking-tighter leading-none">ANTI-GRAVITY</span>
                        <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">OS 2.0.1</span>
                    </div>
                </div>
                <a
                    href="https://x.com/Cryptobullaaa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-right ml-auto group transition-transform hover:scale-105"
                >
                    <div className="text-[7px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 group-hover:text-emerald-500 group-hover:opacity-100 transition-all">AUTH PROTOCOL</div>
                    <div className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap group-hover:text-emerald-500 transition-colors">BUILT BY CRYPTOBULLA</div>
                </a>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center px-8 relative">
                {/* Background Tech Pulse */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none select-none overflow-hidden">
                    <motion.div
                        style={{
                            x: mousePos.x * -2,
                            y: mousePos.y * -2,
                            rotateX: mousePos.y * 0.1,
                            rotateY: mousePos.x * -0.1
                        }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[35rem] font-black tracking-[-0.1em] leading-none text-black dark:text-white opacity-10"
                    >
                        AG
                    </motion.div>
                </div>

                <div className="relative z-10 max-w-sm w-full space-y-16 text-center">
                    {/* Brand Signature */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                        className="space-y-6"
                    >
                        <div className="flex justify-center mb-12 relative">
                            {/* Abstract Blueprint Grid Behind Logo */}
                            <div className="absolute inset-x-0 -top-20 h-64 opacity-[0.03] dark:opacity-[0.07] pointer-events-none -z-10">
                                <svg viewBox="0 0 400 400" className="w-full h-full animate-[pulse_8s_infinite]">
                                    <path d="M0 200 H400 M200 0 V400 M100 0 V400 M300 0 V400 M0 100 H400 M0 300 H400" stroke="currentColor" strokeWidth="1" fill="none" />
                                    <circle cx="200" cy="200" r="100" stroke="currentColor" strokeWidth="0.5" fill="none" />
                                    <circle cx="200" cy="200" r="150" stroke="currentColor" strokeWidth="0.5" fill="none" strokeDasharray="10 10" />
                                </svg>
                            </div>

                            <motion.div
                                animate={{
                                    rotate: [0, 5, -5, 0],
                                    boxShadow: [
                                        "0 0 20px rgba(16, 185, 129, 0.1)",
                                        "0 0 40px rgba(16, 185, 129, 0.3)",
                                        "0 0 20px rgba(16, 185, 129, 0.1)"
                                    ]
                                }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                className="px-5 sm:px-8 py-3 bg-white dark:bg-white/5 rounded-full border border-black/5 dark:border-white/10 flex items-center gap-3 shadow-xl backdrop-blur-md"
                            >
                                <NeuralPulse color="bg-emerald-500" size="sm" />
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 dark:text-emerald-400">Neural Link: Active</span>
                            </motion.div>
                        </div>

                        <motion.h1
                            style={{
                                rotateX: mousePos.y * 0.2,
                                rotateY: mousePos.x * -0.2,
                                filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.1))',
                                letterSpacing: '-0.08em'
                            }}
                            className="text-[10vw] xs:text-6xl sm:text-8xl font-black uppercase leading-[0.8] text-gray-900 dark:text-white drop-shadow-2xl px-2"
                        >
                            ANTIGRAVITY<br />AI PDF
                        </motion.h1>

                        <div className="space-y-6">
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto">
                                The local-first, zero-login AI workspace built for the next generation.
                            </p>
                            <div className="flex flex-col items-center gap-3">
                                <div className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                                    PRIVACY BY DESIGN • EDGE NEURAL
                                </div>
                                <div className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-tighter">
                                    $2.99 LIFETIME PASS • <span className="opacity-40">STRICT PRIVACY</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Entry CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-8"
                    >
                        <motion.button
                            whileHover={{
                                scale: 1.02,
                                y: -8,
                                boxShadow: "0 40px 80px -20px rgba(16, 185, 129, 0.4)"
                            }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate('/workspace')}
                            className="w-full bg-emerald-500 dark:bg-white text-white dark:text-black py-10 rounded-[40px] flex items-center justify-center group shadow-2xl relative overflow-hidden btn-neural"
                        >
                            <span className="text-sm font-black uppercase tracking-[0.5em] relative z-10">Initialize Workspace</span>
                            <ArrowRight size={22} className="ml-5 group-hover:translate-x-3 transition-transform relative z-10" />
                        </motion.button>

                        <div className="flex flex-col items-center gap-2">
                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.5em] opacity-40">
                                v2026.1.0 Protocol
                            </div>
                            <div className="h-[1px] w-12 bg-black/10 dark:bg-white/10" />
                        </div>

                        <div className="flex justify-center gap-14 pt-4 opacity-30 group-hover:opacity-100 transition-opacity">
                            {[
                                { icon: Shield, label: 'Secure' },
                                { icon: Cpu, label: 'Edge AI' },
                                { icon: Sparkles, label: 'Local' }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-3">
                                    <item.icon size={18} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
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
                                { title: "ZERO-DATA", desc: "No Trace Left" },
                                { title: "EPHEMERAL", desc: "Transient Brain" },
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
                                In 2026, traditional cloud-first PDF suites are tied to "Cloud-First" strategies that require your data to leave your device for storage. Anti-Gravity is different. We have no storage servers. We cannot see your documents. We cannot sell your data.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 sm:gap-10">
                                {[
                                    { title: "ZERO KNOWLEDGE", desc: "Absolute data isolation." },
                                    { title: "ZERO STORAGE", desc: "No server-side memory." },
                                    { title: "EDGE NEURAL", desc: "Private AI processing." }
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
                                    By using an ephemeral processing model, we eliminate traditional upload bottlenecks. Your documents are analyzed through a secure, transient link that clears immediately after each operation. This is the future of secure document intelligence.
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

                {/* Communication Protocol / Contact Section */}
                <div className="w-full max-w-sm mx-auto pt-24 pb-32 px-8 text-center">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="p-10 monolith-glass rounded-[48px] border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50" />
                        <div className="space-y-6 relative z-10">
                            <div className="flex justify-center mb-4">
                                <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
                                    <MessageSquare size={24} />
                                </div>
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-emerald-500">Built By Cryptobulla</h3>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                                Connect with the architect behind the neural link for collaboration and updates.
                            </p>
                            <a
                                href="https://x.com/Cryptobullaaa"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20"
                            >
                                <Twitter size={14} fill="currentColor" />
                                Initiate Contact
                            </a>
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
