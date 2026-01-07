
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Headphones, Zap, CheckCircle2, Info } from 'lucide-react';

interface NeuralProtocolBriefProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'audit' | 'briefing' | 'reader';
}

const NeuralProtocolBrief: React.FC<NeuralProtocolBriefProps> = ({ isOpen, onClose, type }) => {
    const content = {
        audit: {
            title: "Neural Audit Protocol",
            subtitle: "Deep-Layer Structural Investigation",
            description: "An advanced AI-driven scanner that identifies hidden risks, financial discrepancies, and strategic savings within any document.",
            icon: <Shield size={24} className="text-emerald-500" />,
            color: "emerald",
            features: [
                "Risk Identification: Flag legal loopholes and dangerous clauses.",
                "Financial Audit: Detect math errors and inconsistent billing.",
                "Strategic Savings: Identify areas for cost reduction.",
                "On-Device Cleaning: Scrubs PII before processing."
            ]
        },
        briefing: {
            title: "Intelligence Briefing Protocol",
            subtitle: "Strategic Audio Download",
            description: "Converts long-form PDF assets into high-end professional podcast scripts for hands-free intellectual consumption.",
            icon: <Headphones size={24} className="text-violet-500" />,
            color: "violet",
            features: [
                "Host Simulation: Professional executive tone.",
                "Summarization: Focuses on core strategic decisions.",
                "Mobile Intake: Optimized for commuters and elite travelers.",
                "Text-to-Insight: Transmutes data into narrative wisdom."
            ]
        },
        reader: {
            title: "Secure Reader Protocol",
            subtitle: "High-Fidelity Sequential Intake",
            description: "A secure environment for deep focus and document absorption with neural reflow capabilities.",
            icon: <Zap size={24} className="text-amber-500" />,
            color: "amber",
            features: [
                "Fluid Mode: Responsive document reflow for mobile.",
                "Deep Focus: Zero-distraction reading environment.",
                "Instant Sync: Map architecture as you read.",
                "Local-Only: Your documents never leave your storage."
            ]
        }
    };

    const current = content[type];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg monolith-card p-8 overflow-hidden"
                    >
                        {/* High-tech background glow */}
                        <div className={`absolute -top-24 -right-24 w-64 h-64 bg-${current.color}-500/10 rounded-full blur-[100px] pointer-events-none`} />

                        <div className="flex justify-between items-start mb-8 relative">
                            <div className="flex gap-4">
                                <div className={`w-14 h-14 rounded-2xl bg-${current.color}-500/10 flex items-center justify-center border border-${current.color}-500/20`}>
                                    {current.icon}
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">Neural Briefing</h4>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-900 dark:text-white leading-none">
                                        {current.title}
                                    </h2>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-6 relative">
                            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 tracking-tight leading-relaxed">
                                {current.description}
                            </p>

                            <div className="space-y-4">
                                <h5 className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-400">Core Matrix Features</h5>
                                <div className="grid grid-cols-1 gap-3">
                                    {current.features.map((feature, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex gap-3 items-start"
                                        >
                                            <CheckCircle2 size={14} className={`text-${current.color}-500 mt-0.5 shrink-0`} />
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-snug">
                                                {feature}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onClose}
                                className={`w-full py-4 rounded-[20px] bg-black dark:bg-white text-white dark:text-black text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl mt-4`}
                            >
                                Synchronize & Continue
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default NeuralProtocolBrief;
