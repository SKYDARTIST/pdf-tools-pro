
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitBranch, Layout, FileText, Settings2, Sparkles } from 'lucide-react';

interface MindMapSettings {
    range: string;
    focus: string;
}

interface MindMapSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (settings: MindMapSettings) => void;
    numPages: number;
}

const MindMapSettingsModal: React.FC<MindMapSettingsModalProps> = ({ isOpen, onClose, onConfirm, numPages }) => {
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
                                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                                        <GitBranch size={20} className="text-indigo-500" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Projection Configuration</span>
                                </div>
                                <h2 className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Mind Map Focus</h2>
                            </div>
                            <button onClick={onClose} className="p-3 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black/10 dark:hover:bg-white/10 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Page Range */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <FileText size={12} />
                                        <span>Neural Scan Range</span>
                                    </div>
                                    <span>Total: {numPages} Pages</span>
                                </div>
                                <input
                                    type="text"
                                    value={range}
                                    onChange={(e) => setRange(e.target.value)}
                                    placeholder="e.g. 1-10 or 5, 8, 12-15"
                                    className="w-full p-6 bg-black/5 dark:bg-white/5 rounded-3xl border-none text-sm font-bold tracking-tight focus:ring-2 ring-indigo-500 transition-all"
                                />
                                <p className="text-[9px] font-medium text-gray-500 dark:text-gray-400 italic">Large documents (50+ pages) are optimized when scanned in segments.</p>
                            </div>

                            {/* Specific Focus */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <Settings2 size={12} />
                                    <span>Strategic Focus (Optional)</span>
                                </div>
                                <textarea
                                    value={focus}
                                    onChange={(e) => setFocus(e.target.value)}
                                    placeholder="What should the AI prioritize? e.g. 'Extract legal risks' or 'Summarize Chapter 4'"
                                    className="w-full p-6 bg-black/5 dark:bg-white/5 rounded-3xl border-none text-sm font-bold tracking-tight focus:ring-2 ring-indigo-500 transition-all min-h-[120px] resize-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => onConfirm({ range, focus })}
                            className="w-full group relative overflow-hidden p-6 bg-indigo-500 rounded-[30px] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-indigo-500/20"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            <Sparkles size={20} className="text-white" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Execute Neural Synthesis</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default MindMapSettingsModal;
