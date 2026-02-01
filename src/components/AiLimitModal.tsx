import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Crown, Zap, AlertCircle, Loader2, Shield, Star } from 'lucide-react';
import { getSubscription, SubscriptionTier, AiBlockMode } from '@/services/subscriptionService';
import { useNavigate } from 'react-router-dom';

interface AiLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    blockMode: AiBlockMode;
    used?: number;
    limit?: number;
}

const AiLimitModal: React.FC<AiLimitModalProps> = ({
    isOpen,
    onClose,
    blockMode
}) => {
    const navigate = useNavigate();
    const subscription = getSubscription();

    const handleNavigateToPricing = () => {
        onClose();
        navigate('/pricing');
    };

    const getModalContent = () => {
        return {
            icon: Sparkles,
            title: 'Lifetime Required',
            subtitle: 'NEURAL HUB LOCKED',
            description: "Advanced AI features like Mind Mapping, Outlining, and Neural Chat require Lifetime Access.",
            primaryAction: {
                label: 'Unlock Forever',
                onClick: handleNavigateToPricing,
                color: '#00C896'
            }
        };
    };

    const content = getModalContent();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-50"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
                    >
                        <div className="relative w-full max-w-sm bg-white dark:bg-[#050505] rounded-[48px] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                            {/* Close */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 dark:bg-white/5 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-20"
                            >
                                <X size={16} className="text-gray-400" />
                            </button>

                            {/* Header Gradient */}
                            <div className="relative p-10 pb-6 bg-black text-white dark:bg-white dark:text-black overflow-hidden shrink-0">
                                <div className="absolute inset-0 opacity-20 pointer-events-none"
                                    style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                    className="w-20 h-20 mx-auto mb-8 bg-black/20 dark:bg-black/10 rounded-3xl flex items-center justify-center relative z-10 border border-white/20"
                                >
                                    <Sparkles size={32} className="text-white dark:text-black" />
                                </motion.div>

                                <div className="relative z-10 text-center space-y-2">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">
                                        {content.title}
                                    </h2>
                                    <p className="text-[10px] font-mono font-black uppercase tracking-[0.4em] opacity-40">
                                        {content.subtitle}
                                    </p>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-8 space-y-8">
                                <div className="p-5 bg-[#00C896]/5 rounded-3xl border border-[#00C896]/20">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle size={20} className="text-[#00C896] shrink-0 mt-0.5" />
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 leading-relaxed uppercase">
                                            {content.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                                        Lifetime Perks:
                                    </h3>
                                    <div className="grid gap-3">
                                        <InfoItem icon={Zap} text="Unlimited AI Documents" />
                                        <InfoItem icon={Star} text="Priority Neural Engine" />
                                        <InfoItem icon={Shield} text="One-Time Payment Only" />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={content.primaryAction.onClick}
                                        className="w-full py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] bg-[#00C896] text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all relative overflow-hidden flex items-center justify-center gap-3"
                                    >
                                        <Crown size={18} fill="currentColor" />
                                        {content.primaryAction.label}
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-full py-4 mt-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black dark:hover:text-white transition-colors"
                                    >
                                        Not Today
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

const InfoItem: React.FC<{ text: string, icon: any }> = ({ text, icon: Icon }) => (
    <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-[#00C896]">
            <Icon size={14} />
        </div>
        <span className="text-[11px] font-black uppercase tracking-tight text-gray-800 dark:text-gray-200">
            {text}
        </span>
    </div>
);

export default AiLimitModal;
