import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Zap, Shield, Sparkles, Check, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TaskLimitManager from '../utils/TaskLimitManager';
import { upgradeTier, SubscriptionTier } from '../services/subscriptionService';
import BillingService from '../services/billingService';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    reason?: 'limit_reached' | 'upgrade_prompt';
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
    isOpen,
    onClose,
    reason = 'upgrade_prompt'
}) => {
    const navigate = useNavigate();
    const remaining = TaskLimitManager.getRemainingTasks();
    const limit = TaskLimitManager.getDailyLimit();
    const [isLoading, setIsLoading] = useState(false);

    const handleUpgrade = () => {
        onClose();
        navigate('/pricing');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
                    >
                        <div className="relative w-full max-w-sm bg-white dark:bg-[#0a0a0a] rounded-[32px] sm:rounded-[40px] overflow-hidden border border-black/5 dark:border-white/5 shadow-2xl flex flex-col max-h-[90vh]">
                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-20 shadow-sm"
                            >
                                <X size={16} className="text-slate-600 dark:text-gray-400" />
                            </button>

                            {/* Header - More compact */}
                            <div className="relative p-6 sm:p-10 pb-4 sm:pb-8 bg-black text-white dark:bg-white dark:text-black overflow-hidden shrink-0">
                                <div className="absolute inset-0 opacity-10 pointer-events-none"
                                    style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '15px 15px' }} />

                                <motion.div
                                    animate={{
                                        y: [0, -3, 0],
                                        filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"]
                                    }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-10 h-10 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-6 bg-white/10 dark:bg-black/10 rounded-xl sm:rounded-2xl flex items-center justify-center relative z-10"
                                >
                                    <Crown size={20} className="sm:text-[32px] text-white dark:text-black" fill="currentColor" />
                                </motion.div>

                                <div className="relative z-10 text-center">
                                    <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tighter leading-none mb-1 sm:mb-3">
                                        {reason === 'limit_reached' ? 'Daily Limit' : 'Anti-Gravity Pro'}
                                    </h2>
                                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] opacity-60">
                                        {reason === 'limit_reached' ? 'Daily free tasks completed' : 'Get Unlimited Access'}
                                    </p>
                                </div>
                            </div>

                            {/* Scrollable Content Area */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-4 sm:space-y-6">
                                {/* Pricing */}
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2 mb-1 sm:mb-2 text-violet-600 dark:text-violet-400">
                                        <Sparkles size={20} className="animate-pulse" />
                                        <span className="text-xl sm:text-2xl font-black uppercase tracking-tighter">Premium Access</span>
                                    </div>
                                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest">
                                        Choose your protocol in the next step
                                    </p>
                                </div>

                                {/* Features */}
                                <div className="space-y-3 sm:space-y-4">
                                    <Feature icon={Zap} text="Unlimited Daily Tasks" />
                                    <Feature icon={Sparkles} text="All 14 Powerful Tools" />
                                    <Feature icon={Check} text="Zero Watermarks • All Plans" />
                                    <Feature icon={Shield} text="100% Private Processing" />
                                </div>

                                {/* Comparison Card - More compact */}
                                <div className="p-4 sm:p-8 bg-black/5 dark:bg-white/5 rounded-[24px] sm:rounded-[40px] space-y-2 sm:space-y-4 border border-black/[0.03] dark:border-white/[0.03]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-40">Standard Apps</span>
                                        <span className="text-[10px] sm:text-xs font-black text-red-500 uppercase tracking-tighter">$100/YEAR</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-40 text-black dark:text-white">Anti-Gravity</span>
                                        <span className="text-xs sm:text-sm font-black text-emerald-500 uppercase tracking-tighter">BEST VALUE</span>
                                    </div>
                                </div>
                            </div>

                            {/* CTA - Fixed at bottom */}
                            <div className="p-6 sm:p-8 pt-2 sm:pt-4 bg-white dark:bg-[#0a0a0a] border-t border-black/5 dark:border-white/5 shrink-0">
                                <div className="space-y-3 sm:space-y-4">
                                    <button
                                        onClick={handleUpgrade}
                                        disabled={isLoading}
                                        className="w-full py-4 sm:py-6 bg-black dark:bg-white text-white dark:text-black rounded-full font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] shadow-xl hover:brightness-110 active:scale-95 transition-all relative overflow-hidden group flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <motion.div
                                            animate={{ x: ['-100%', '200%'] }}
                                            transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 1 }}
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-black/10 to-transparent skew-x-12"
                                        />
                                        {isLoading ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Synchronizing...
                                            </>
                                        ) : (
                                            <>
                                                <span>View Pro Plans</span>
                                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>

                                    {reason === 'limit_reached' && (
                                        <button
                                            onClick={onClose}
                                            className="w-full py-1 text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-black dark:hover:text-white transition-colors"
                                        >
                                            Keep Free Version
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const Feature: React.FC<{ icon: any; text: string }> = ({ icon: Icon, text }) => (
    <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-black dark:text-white" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-tight text-gray-900 dark:text-white">{text}</span>
    </div>
);

export default UpgradeModal;
