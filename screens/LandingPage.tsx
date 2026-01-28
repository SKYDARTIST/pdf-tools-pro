import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, Sparkles, Shield, Cpu, MessageSquare, ArrowRight, Twitter } from 'lucide-react';
import LegalFooter from '../components/LegalFooter';
import NeuralPulse from '../components/NeuralPulse';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });


    const handleLaunch = () => {
        const uid = localStorage.getItem('google_uid');
        if (uid) {
            navigate('/workspace');
        } else {
            console.log('🛡️ Landing: User not authenticated, showing Login Screen');
            navigate('/login');
        }
    };

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
            <header className="px-6 sm:px-8 pt-12 pb-6 sm:py-10 flex justify-between items-center relative z-20">
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
                    <div className="text-[7px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 group-hover:text-emerald-500 group-hover:opacity-100 transition-all">CONNECT WITH ME</div>
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

                <div className="relative z-10 max-w-sm w-full space-y-24 sm:space-y-32 text-center">
                    {/* Brand Signature */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                        className="space-y-16"
                    >
                        <div className="flex justify-center mb-8 relative">
                            {/* Drastically Subtler Grid */}
                            <div className="absolute inset-x-0 -top-20 h-64 opacity-[0.01] dark:opacity-[0.03] pointer-events-none -z-10">
                                <svg viewBox="0 0 400 400" className="w-full h-full">
                                    <path d="M0 200 H400 M200 0 V400" stroke="currentColor" strokeWidth="1" fill="none" />
                                    <circle cx="200" cy="200" r="100" stroke="currentColor" strokeWidth="0.5" fill="none" />
                                </svg>
                            </div>

                            <motion.div
                                animate={{
                                    boxShadow: [
                                        "0 0 20px rgba(16, 185, 129, 0.05)",
                                        "0 0 40px rgba(16, 185, 129, 0.15)",
                                        "0 0 20px rgba(16, 185, 129, 0.05)"
                                    ]
                                }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                className="px-6 py-2 bg-[#E6FAF5] dark:bg-white/5 rounded-full border border-[#00D9A3]/20 flex items-center gap-3 backdrop-blur-md"
                            >
                                <NeuralPulse color="bg-[#00C896]" size="sm" />
                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#00C896]">PRIVACY GUARD ACTIVE</span>
                            </motion.div>
                        </div>

                        <motion.h1
                            style={{
                                rotateX: mousePos.y * 0.1,
                                rotateY: mousePos.x * -0.1,
                                letterSpacing: '-0.08em'
                            }}
                            className="text-6xl android-sm:text-5xl sm:text-9xl font-black uppercase leading-[0.8] text-[#000000] dark:text-white drop-shadow-2xl"
                        >
                            ANTI<br />GRAVITY
                        </motion.h1>

                        <div className="text-[10px] font-black uppercase tracking-[0.6em] text-[#2D3748] dark:text-gray-400 opacity-60">
                            Elite AI • Zero Cloud • Private
                        </div>
                    </motion.div>

                    {/* Entry CTA - Boosted Spacing */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-12"
                    >
                        <motion.button
                            whileHover={{
                                scale: 1.02,
                                y: -4,
                                boxShadow: "0 30px 60px -15px rgba(16, 185, 129, 0.3)"
                            }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleLaunch}
                            className="w-full bg-black dark:bg-white text-white dark:text-black py-8 rounded-[40px] flex items-center justify-center group shadow-2xl relative overflow-hidden"
                        >
                            <span className="text-xs font-black uppercase tracking-[0.5em] relative z-10">Launch Workspace</span>
                            <ArrowRight size={20} className="ml-5 group-hover:translate-x-3 transition-transform relative z-10" />
                        </motion.button>

                        <div className="flex flex-col items-center gap-4">
                            <div className="text-[8px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.8em]">
                                v2.2.0 Stable Build
                            </div>
                        </div>
                    </motion.div>

                    {/* Simplified Social Proof - Single Airy Row */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="pt-24 space-y-12"
                    >
                        <div className="h-[1px] w-full bg-black/5 dark:bg-white/5" />

                        <div className="flex justify-between items-center gap-2">
                            {[
                                { title: "LOCAL", desc: "GEMINI AI" },
                                { title: "ZERO", desc: "Cloud" },
                                { title: "100%", desc: "Private" }
                            ].map((badge, i) => (
                                <React.Fragment key={i}>
                                    <div className="flex flex-col items-center">
                                        <div className="text-[16px] font-black uppercase tracking-tighter text-[#000000] dark:text-white">{badge.title}</div>
                                        <div className="text-[7px] font-black text-[#718096] uppercase tracking-[0.3em] mt-1">{badge.desc}</div>
                                    </div>
                                    {i < 2 && <div className="h-8 w-[1px] bg-[#E2E8F0] dark:bg-white/10" />}
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="text-[8px] font-black uppercase tracking-[0.3em] text-[#00C896]/60 transition-opacity hover:opacity-100">
                            "The Future of Secure Document Intelligence"
                        </div>
                    </motion.div>
                </div>

                {/* Privacy Manifesto Offset Section */}
                <div className="w-full bg-[#F7FFFC] dark:bg-[#050505] py-24 sm:py-32 border-y border-[#00C896]/5 shadow-inner">
                    <div className="max-w-6xl mx-auto px-6 sm:px-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">
                            <div className="space-y-10">
                                <h2 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase leading-[0.9] text-[#000000] dark:text-white">
                                    Our Privacy<br className="hidden sm:block" /> Promise.
                                </h2>
                                <p className="text-sm sm:text-base text-[#2D3748] dark:text-gray-400 font-bold leading-relaxed tracking-tight max-w-lg">
                                    We believe your data belongs to you. Anti-Gravity processes everything locally on your device, ensuring total privacy without any cloud storage.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 sm:gap-10">
                                    {[
                                        { title: "ABS-OLUTE PRIVACY", desc: "Your data stays with you." },
                                        { title: "ZERO STORAGE", desc: "Nothing is saved on our end." },
                                        { title: "LOCAL AI", desc: "Private on-device intelligence." }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] mt-2 shrink-0 shadow-[0_0_8px_rgba(0,200,150,0.4)]" />
                                            <div className="space-y-1">
                                                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#000000] dark:text-white">{item.title}</div>
                                                <div className="text-[10px] font-black text-[#718096] dark:text-gray-500 uppercase tracking-widest">{item.desc}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-[#FFFFFF] dark:bg-white/5 border border-[#E2E8F0] dark:border-white/5 shadow-2xl rounded-[48px] p-8 sm:p-14 space-y-8 relative overflow-hidden group hover:translate-y-[-4px] transition-transform">
                                <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity text-[#00C896]">
                                    <Shield size={160} />
                                </div>
                                <div className="space-y-6 relative z-10">
                                    <div className="text-[10px] font-black uppercase tracking-[0.4em] text-[#718096] opacity-60">OUR ADVANTAGE</div>
                                    <h3 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase leading-none text-[#000000] dark:text-white">INSTANT SPEED.<br />ZERO RISK.</h3>
                                    <p className="text-xs sm:text-sm font-bold text-[#4A5568] dark:text-gray-400 leading-relaxed uppercase tracking-tight max-w-md">
                                        By using local processing, we skip the slow uploads. Your documents are analyzed privately on your device. This is the future of secure document tools.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full bg-[#FFFCF7] dark:bg-[#080808] py-24 sm:py-32">
                        <div className="max-w-4xl mx-auto px-8 text-center">
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
                                    <h3 className="text-xl font-black uppercase tracking-tighter text-[#00C896]">Built By Cryptobulla</h3>
                                    <p className="text-[10px] font-bold text-[#4A5568] uppercase tracking-widest leading-relaxed">
                                        Connect with the developer for collaborations and latest app updates.
                                    </p>
                                    <a
                                        href="https://x.com/Cryptobullaaa"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-br from-[#00D9A3] to-[#00C896] text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-xl shadow-[#00C896]/30"
                                    >
                                        <Twitter size={14} fill="currentColor" />
                                        SAY HELLO ON X
                                    </a>
                                </div>
                            </motion.div>
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
