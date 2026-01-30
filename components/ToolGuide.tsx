
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, CheckCircle2 } from 'lucide-react';

interface ToolGuideProps {
    title: string;
    description: string;
    steps: string[];
    useCases: string[];
    samplePreview?: {
        label: string;
        previewText: string;
    };
}

const ToolGuide: React.FC<ToolGuideProps> = ({ title, description, steps, useCases, samplePreview }) => {
    const [showPreview, setShowPreview] = React.useState(false);

    return (
        <div className="monolith-card rounded-[40px] p-6 bg-violet-500/5 border-violet-500/10 border space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500">
                        <Info size={16} />
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-400">Operation Guide</h4>
                        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-0.5">{title}</p>
                    </div>
                </div>
                {samplePreview && (
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="px-3 py-1.5 bg-violet-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
                    >
                        {showPreview ? 'Close Preview' : 'View Sample Report'}
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showPreview && samplePreview && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-5 bg-black text-white dark:bg-white dark:text-black rounded-[24px] border border-violet-500/20 shadow-2xl space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[8px] font-mono font-black bg-violet-500 px-2 py-0.5 rounded text-white uppercase tracking-tighter">SAMPLE {samplePreview.label}</span>
                            </div>
                            <div className="text-[10px] font-mono leading-relaxed whitespace-pre-line opacity-80 italic">
                                {samplePreview.previewText}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <p className="text-[12px] leading-relaxed text-gray-600 dark:text-gray-400 font-medium">
                {description}
            </p>

            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-3">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2">Instructions</h5>
                    {steps?.map((step, i) => (
                        <div key={i} className="flex gap-3">
                            <span className="text-[10px] font-black text-violet-500 opacity-40 shrink-0">0{i + 1}</span>
                            <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 leading-tight">{step}</p>
                        </div>
                    ))}
                </div>

                {useCases && useCases.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-black/5 dark:border-white/5">
                        <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2">Recommended Use Cases</h5>
                        <div className="flex flex-wrap gap-2">
                            {useCases.map((useCase, i) => (
                                <div key={i} className="px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-full flex items-center gap-2">
                                    <CheckCircle2 size={10} className="text-emerald-500" />
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{useCase}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ToolGuide;
