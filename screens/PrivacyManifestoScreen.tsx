import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Cpu, ArrowLeft, Lock, EyeOff, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyManifestoScreen: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white px-8 py-20 relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            <div className="max-w-3xl mx-auto relative z-10 space-y-24">
                {/* Back Nav */}
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-4 text-gray-400 hover:text-black dark:hover:text-white transition-colors group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-2 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Return to Base</span>
                </motion.button>

                {/* Hero */}
                <div className="space-y-8">
                    <h1 className="text-[12vw] sm:text-8xl font-black uppercase tracking-tighter leading-none">
                        Privacy is<br />Absolute.
                    </h1>
                    <p className="text-xl text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tight max-w-xl leading-relaxed">
                        Anti-Gravity 2026: No Servers. No Cookies. No Compromise.
                    </p>
                </div>

                {/* The 3 Pillars */}
                <div className="space-y-16">
                    {[
                        {
                            icon: Lock,
                            title: "Zero-Knowledge Infrastructure",
                            desc: "Engineered without a central server. Anti-Gravity is physically unable to track your session, store your files, or sell your identity. Your documents reside only in your device's active RAM during manipulation."
                        },
                        {
                            icon: EyeOff,
                            title: "Transient AI Processing",
                            desc: "Neural interactions are powered by the Google Gemini API via encrypted TLS 1.3 links. All data transmission is stateless and transient; your documents are never used for model training and are purged immediately after response generation."
                        },
                        {
                            icon: Lock,
                            title: "Zero-Persistence Storage",
                            desc: "Operational state (Consent, Neural Budget) is stored in encrypted LocalStorage. No document identifiers or sensitive content ever persist beyond your active processing window."
                        },
                        {
                            icon: Zap,
                            title: "2026 AI Safety Compliance",
                            desc: "Every AI-generated insight follows strict safety protocols. The integrated 'Flag AI' mechanism allows for immediate reporting of neural inaccuracies, ensuring absolute technical integrity and accountability."
                        }
                    ].map((pillar, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="flex flex-col sm:flex-row gap-8 items-start pb-16 border-b border-black/5 dark:border-white/5 last:border-0"
                        >
                            <div className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-[24px] flex items-center justify-center shrink-0">
                                <pillar.icon size={28} />
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-2xl font-black uppercase tracking-tighter">{pillar.title}</h2>
                                <p className="text-sm text-gray-400 dark:text-gray-500 font-bold leading-relaxed tracking-tight uppercase">
                                    {pillar.desc}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Final Callout */}
                <div className="p-12 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[40px] text-center space-y-8">
                    <Globe size={48} className="mx-auto opacity-20" />
                    <h3 className="text-3xl font-black uppercase tracking-tighter">Distributed & Secure</h3>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                        Join the 2026 Privacy Revolution. Use Anti-Gravity for all your sensitive document workflows without ever worrying about a data breach.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyManifestoScreen;
