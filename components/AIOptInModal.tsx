import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Cpu, Zap, ArrowRight, EyeOff } from 'lucide-react';

interface AIOptInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept: () => void;
}

const AIOptInModal: React.FC<AIOptInModalProps> = ({ isOpen, onClose, onAccept }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100]"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 z-[101] flex items-center justify-center p-6 pointer-events-none"
                    >
                        <div className="relative w-full max-w-sm bg-white dark:bg-[#0a0a0a] rounded-[40px] overflow-hidden border border-black/5 dark:border-white/5 shadow-2xl pointer-events-auto">
                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-10"
                            >
                                <X size={20} className="text-slate-600 dark:text-gray-400" />
                            </button>

                            {/* Header */}
                            <div className="relative p-10 pb-8 bg-black text-white dark:bg-white dark:text-black overflow-hidden group">
                                <div className="absolute inset-0 opacity-10 pointer-events-none"
                                    style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                                <motion.div
                                    animate={{
                                        scale: [1, 1.05, 1],
                                        filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"]
                                    }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-16 h-16 mx-auto mb-6 bg-white/10 dark:bg-black/10 rounded-2xl flex items-center justify-center relative z-10"
                                >
                                    <Shield size={32} className="text-white dark:text-black" />
                                </motion.div>

                                <div className="relative z-10 text-center">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-3">
                                        Neural Consent
                                    </h2>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
                                        Privacy Protocol v2026
                                    </p>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-8 space-y-8">
                                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight leading-relaxed text-center">
                                    To initialize AI operations, we must transmit your document data via secure HTTPS to the Google Gemini Neural Engine.
                                </p>

                                <div className="space-y-6">
                                    <ConsentItem
                                        icon={EyeOff}
                                        title="Ephemeral Processing"
                                        desc="No data is stored for model training."
                                    />
                                    <ConsentItem
                                        icon={Zap}
                                        title="Secure Tunnel"
                                        desc="Encrypted via SSL/TLS during transit."
                                    />
                                    <ConsentItem
                                        icon={Cpu}
                                        title="Play Store Compliant"
                                        desc="Verified privacy-first architecture."
                                    />
                                </div>

                                <div className="space-y-4 pt-4">
                                    <button
                                        onClick={onAccept}
                                        className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:brightness-110 active:scale-95 transition-all relative overflow-hidden group"
                                    >
                                        Accept Protocol
                                        <ArrowRight size={14} className="inline-block ml-2 group-hover:translate-x-1 transition-transform" />
                                    </button>

                                    <button
                                        onClick={onClose}
                                        className="w-full py-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-black dark:hover:text-white transition-colors"
                                    >
                                        Decline & Return
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const ConsentItem: React.FC<{ icon: any; title: string; desc: string }> = ({ icon: Icon, title, desc }) => (
    <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-black dark:text-white" />
        </div>
        <div>
            <h4 className="text-[11px] font-black uppercase tracking-tight text-gray-900 dark:text-white">{title}</h4>
            <p className="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-tight">{desc}</p>
        </div>
    </div>
);

export default AIOptInModal;
