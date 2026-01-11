
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Headphones, FileText, Settings2, Zap } from 'lucide-react';

interface BriefingSettings {
    range: string;
    focus: string;
}

interface BriefingSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (settings: BriefingSettings) => void;
    numPages: number;
}

const BriefingSettingsModal: React.FC<BriefingSettingsModalProps> = ({ isOpen, onClose, onConfirm, numPages }) => {
    const [range, setRange] = useState(`1-${Math.min(numPages, 10)}`);
    const [focus, setFocus] = useState('');

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-xl"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg bg-white dark:bg-[#0a0a0a] rounded-[40px] shadow-2xl border border-black/5 dark:border-white/5 overflow-hidden"
                >
                    <div className="p-8 space-y-8">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-emerald-500/10 rounded-xl">
                                        <Zap size={20} className="text-emerald-500" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Briefing Protocol Tuning</span>
                                </div>
                                <h2 className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none text-balance">Podcast Configuration</h2>
                            </div>
                            <button onClick={onClose} className="p-3 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Page Range */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <FileText size={12} />
                                        <span>Target Intelligence Range</span>
                                    </div>
                                    <span>Total: {numPages} Pages</span>
                                </div>
                                <input
                                    type="text"
                                    value={range}
                                    onChange={(e) => setRange(e.target.value)}
                                    placeholder="e.g. 1-10 or 15-20"
                                    className="w-full p-6 bg-black/5 dark:bg-white/5 rounded-3xl border-none text-sm font-bold tracking-tight focus:ring-2 ring-emerald-500 transition-all"
                                />
                                <p className="text-[9px] font-medium text-gray-500 dark:text-gray-400 italic leading-relaxed">
                                    Strategic Tip: Large books (200+ pages) yield higher fidelity podcasts when processed in 10-15 page chapters.
                                </p>
                            </div>

                            {/* Specific Focus */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <Settings2 size={12} />
                                    <span>Briefing Lens (Optional)</span>
                                </div>
                                <textarea
                                    value={focus}
                                    onChange={(e) => setFocus(e.target.value)}
                                    placeholder="e.g. 'Focus on the psychology of the subconscious' or 'Skip the introduction'"
                                    className="w-full p-6 bg-black/5 dark:bg-white/5 rounded-3xl border-none text-sm font-bold tracking-tight focus:ring-2 ring-emerald-500 transition-all min-h-[120px] resize-none text-balance"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => onConfirm({ range, focus })}
                            className="w-full group relative overflow-hidden p-6 bg-emerald-500 rounded-[30px] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-emerald-500/20"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            <Headphones size={20} className="text-white" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Execute Audio Synthesis</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default BriefingSettingsModal;
