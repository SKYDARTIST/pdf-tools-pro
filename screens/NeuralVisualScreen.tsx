import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Linkedin, Briefcase, GraduationCap, Palette,
    ArrowLeft, Download, RefreshCw, AlertCircle, Wand2,
    Image as ImageIcon, Share2, ShieldCheck, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateImage, VisualResponse } from '../services/visualService';
import UpgradeModal from '../components/UpgradeModal';
import { useSearchParams } from 'react-router-dom';
import FileHistoryManager, { FileHistoryEntry } from '../utils/FileHistoryManager';

type PersonaKey = 'linkedin' | 'business' | 'student' | 'creative';

interface Persona {
    id: PersonaKey;
    label: string;
    description: string;
    icon: any;
    color: string;
    promptHint: string;
}

const PERSONAS: Persona[] = [
    {
        id: 'linkedin',
        label: 'LinkedIn Header',
        description: 'Auto-generate professional 16:9 banners.',
        icon: Linkedin,
        color: '#0077b5',
        promptHint: 'e.g., "Future of AI in Finance" or "Sustainable Architecture"'
    },
    {
        id: 'business',
        label: 'Slide Deck Background',
        description: 'Clean, minimal abstracts for presentations.',
        icon: Briefcase,
        color: '#0ea5e9',
        promptHint: 'e.g., "Data connectivity networks" or "Modern minimalist office"'
    },
    {
        id: 'student',
        label: 'Study Poster',
        description: 'Vertical 9:16 infographics from notes.',
        icon: GraduationCap,
        color: '#8b5cf6',
        promptHint: 'e.g., "Quantum Mechanics summary" or "Biology of Cells"'
    },
    {
        id: 'creative',
        label: 'Conceptual Art',
        description: 'Metaphorical art for document themes.',
        icon: Palette,
        color: '#ec4899',
        promptHint: 'e.g., "Knowledge as a glowing library" or "Digital transformation"'
    }
];

const NeuralVisualScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // State
    const [selectedPersona, setSelectedPersona] = useState<PersonaKey | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [step, setStep] = useState<'triage' | 'prompt' | 'result'>('triage');

    const [selectedDoc, setSelectedDoc] = useState<FileHistoryEntry | null>(null);
    const [recentDocs, setRecentDocs] = useState<FileHistoryEntry[]>([]);
    const [useContext, setUseContext] = useState(false);

    useEffect(() => {
        setRecentDocs(FileHistoryManager.getRecent(5));
    }, []);

    useEffect(() => {
        const queryPersona = searchParams.get('persona') as PersonaKey;
        if (queryPersona && PERSONAS.find(p => p.id === queryPersona)) {
            setSelectedPersona(queryPersona);
            setStep('prompt');
        }
    }, [searchParams]);

    const handleGenerate = async () => {
        if (!prompt.trim() || !selectedPersona) return;

        setIsGenerating(true);
        setError(null);

        try {
            const finalPrompt = useContext && selectedDoc
                ? `[Context from document: ${selectedDoc.fileName}] ${prompt}`
                : prompt;
            const response = await generateImage(finalPrompt, selectedPersona);

            if (response.status === 'success' && response.imageUrl) {
                setResult(response.imageUrl);
                setStep('result');
            } else if (response.status === 'quota_exceeded') {
                setShowUpgrade(true);
                setError(response.error || 'Quota exceeded.');
            } else if (response.status === 'safety_violation') {
                setError('Safety Protocol Triggered: Request blocked.');
            } else {
                setError(response.error || 'Neural link failure.');
            }
        } catch (err) {
            setError('Unexpected neural disruption.');
        } finally {
            setIsGenerating(false);
        }
    };

    const reset = () => {
        setResult(null);
        setError(null);
        setPrompt('');
        setStep('triage');
        setSelectedPersona(null);
    };

    return (
        <div className="min-h-screen bg-transparent pt-24 pb-32 px-6 max-w-md mx-auto">
            <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />

            <AnimatePresence mode="wait">
                {step === 'triage' && (
                    <motion.div
                        key="triage"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-8"
                    >
                        <header className="space-y-2">
                            <div className="flex items-center gap-2 text-violet-500 text-[10px] font-black uppercase tracking-[0.3em]">
                                <Sparkles size={14} />
                                Neural Visual Engine
                            </div>
                            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-black dark:text-white">
                                Select<br />Protocol
                            </h1>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">
                                Choose a visual specialty to begin<br />high-fidelity generation.
                            </p>
                        </header>

                        <div className="grid gap-4">
                            {PERSONAS.map((p) => (
                                <motion.button
                                    key={p.id}
                                    whileHover={{ scale: 1.02, x: 5 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setSelectedPersona(p.id);
                                        setStep('prompt');
                                    }}
                                    className="monolith-card group p-5 flex items-center justify-between text-left border-black/5 dark:border-white/5 shadow-sm hover:shadow-xl transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black"
                                            style={{ backgroundColor: `${p.color}10`, color: p.color }}
                                        >
                                            <p.icon size={20} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-wider text-black dark:text-white mb-0.5">{p.label}</h3>
                                            <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight line-clamp-1">{p.description}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-300 dark:text-gray-700 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {step === 'prompt' && selectedPersona && (
                    <motion.div
                        key="prompt"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <button
                            onClick={() => setStep('triage')}
                            className="flex items-center gap-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Back to Protocols</span>
                        </button>

                        <header className="space-y-4">
                            <div className="flex items-center gap-3">
                                {(() => {
                                    const p = PERSONAS.find(p => p.id === selectedPersona)!;
                                    return (
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${p.color}20`, color: p.color }}>
                                            <p.icon size={18} />
                                        </div>
                                    )
                                })()}
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter text-black dark:text-white">
                                        {PERSONAS.find(p => p.id === selectedPersona)?.label}
                                    </h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Input creative signal</p>
                                </div>
                            </div>
                        </header>

                        <div className="space-y-6">
                            {/* Neural Context Selection */}
                            <div className="monolith-card p-4 border-black/5 dark:border-white/5 bg-violet-500/5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={14} className="text-violet-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">Neural Context</span>
                                    </div>
                                    <button
                                        onClick={() => setUseContext(!useContext)}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${useContext ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-800'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useContext ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {useContext && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-3">Select Recent Source:</p>
                                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                                {recentDocs.length > 0 ? recentDocs.map(doc => (
                                                    <button
                                                        key={doc.id}
                                                        onClick={() => setSelectedDoc(doc)}
                                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap border transition-all ${selectedDoc?.id === doc.id
                                                            ? 'bg-violet-500 text-white border-violet-500'
                                                            : 'bg-white dark:bg-black text-gray-500 border-black/5 dark:border-white/5'}`}
                                                    >
                                                        {doc.fileName}
                                                    </button>
                                                )) : (
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase italic">No recent documents found</span>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="monolith-card p-6 space-y-4 border-black/5 dark:border-white/5 shadow-2xl">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-violet-500">Signal Prompt</label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={PERSONAS.find(p => p.id === selectedPersona)?.promptHint}
                                    className="w-full h-32 bg-transparent text-sm font-bold text-black dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700 focus:outline-none resize-none"
                                />
                                {error && (
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-red-500 bg-red-500/10 p-3 rounded-xl">
                                        <AlertCircle size={14} />
                                        {error}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !prompt.trim()}
                                className="w-full h-16 bg-black dark:bg-white text-white dark:text-black rounded-[24px] font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 group overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                {isGenerating ? (
                                    <>
                                        <Wand2 size={16} className="animate-spin" />
                                        Generating Visual...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        Engage Pulse
                                    </>
                                )}
                            </button>

                            <div className="flex items-center gap-2 justify-center py-4">
                                <ShieldCheck size={14} className="text-emerald-500" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">SynthID Watermark Embedded</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 'result' && result && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="space-y-8"
                    >
                        <header className="flex items-center justify-between">
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-black dark:text-white">Neural Asset</h2>
                            <button
                                onClick={reset}
                                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                            >
                                <RefreshCw size={20} className="text-gray-400" />
                            </button>
                        </header>

                        <div className="monolith-card overflow-hidden bg-black aspect-square relative shadow-2xl group">
                            <img
                                src={result}
                                alt="Generated Visual"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = result;
                                        link.download = `neural_visual_${Date.now()}.jpg`;
                                        link.click();
                                    }}
                                    className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-2xl"
                                >
                                    <Download size={24} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-2xl"
                                >
                                    <Share2 size={24} />
                                </motion.button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={reset}
                                className="w-full h-16 border-2 border-black/5 dark:border-white/5 rounded-[24px] font-black uppercase tracking-[0.3em] text-[10px] text-gray-400 hover:text-black dark:hover:text-white transition-all shadow-sm"
                            >
                                Generate New Signal
                            </button>

                            <div className="text-center">
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-300 dark:text-gray-700">
                                    Captured via Nano Banana • 1024x1024 High-Fi
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NeuralVisualScreen;
