import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flag, AlertTriangle, CheckCircle, Send } from 'lucide-react';

interface AIReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    contentId?: string;
}

const AIReportModal: React.FC<AIReportModalProps> = ({ isOpen, onClose, contentId }) => {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        // Log the report locally (or to a backend if available)
        console.log(`[Neural Report] Content: ${contentId}, Reason: ${reason}`);
        setStep('success');
        setTimeout(() => {
            onClose();
            setStep('form');
            setReason('');
        }, 2000);
    };

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

                            {step === 'form' ? (
                                <>
                                    {/* Header */}
                                    <div className="p-10 pb-8 bg-red-500/10 dark:bg-white/5 text-center">
                                        <div className="w-16 h-16 mx-auto mb-6 bg-red-500 text-white rounded-full flex items-center justify-center">
                                            <Flag size={32} />
                                        </div>
                                        <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-3">
                                            Flag Output
                                        </h2>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
                                            Neural Safety Protocol
                                        </p>
                                    </div>

                                    {/* Content */}
                                    <div className="p-8 space-y-6">
                                        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight leading-relaxed text-center">
                                            Help us refine the Anti-Gravity engine. Why are you flagging this neural response?
                                        </p>

                                        <div className="space-y-3">
                                            {[
                                                'Inaccurate / Hallucination',
                                                'Offensive / Harmful Content',
                                                'Formatting Error',
                                                'Security Concern'
                                            ].map((r) => (
                                                <button
                                                    key={r}
                                                    onClick={() => setReason(r)}
                                                    className={`w-full p-4 rounded-full border text-left transition-all ${reason === r
                                                        ? 'bg-black dark:bg-white border-transparent text-white dark:text-black'
                                                        : 'bg-transparent border-black/5 dark:border-white/5 text-gray-500 hover:border-black/20 dark:hover:border-white/20'
                                                        }`}
                                                >
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{r}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            disabled={!reason}
                                            onClick={handleSubmit}
                                            className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-20 disabled:scale-100"
                                        >
                                            Submit Report
                                            <Send size={14} className="inline-block ml-2" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="p-16 text-center space-y-6">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto"
                                    >
                                        <CheckCircle size={40} />
                                    </motion.div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black uppercase tracking-tighter">Report Received</h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Protocol Updated</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AIReportModal;
