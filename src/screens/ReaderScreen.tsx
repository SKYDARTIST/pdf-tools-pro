import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, BookOpen, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, X, Zap, Activity, Share2, GitBranch, Loader2, Shield, Flag, Volume2, List } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { extractTextFromPdf, renderPageToImage } from '@/utils/pdfExtractor';
import { canUseAI, recordAIUsage, getSubscription, SubscriptionTier, AiOperationType } from '@/services/subscriptionService';
import AiLimitModal from '@/components/AiLimitModal';
import { compressImage } from '@/utils/imageProcessor';
import MindMapComponent from '@/components/MindMapComponent';
import { askGemini } from '@/services/aiService';
import NeuralCoolingUI from '@/components/NeuralCoolingUI';
import AIOptInModal from '@/components/AIOptInModal';
import AIReportModal from '@/components/AIReportModal';
import NeuralPulse from '@/components/NeuralPulse';
import ToolGuide from '@/components/ToolGuide';
import MindMapSettingsModal from '@/components/MindMapSettingsModal';

// Configure PDF.js worker
const WORKER_PATH_LOCAL = window.location.origin + '/pdf.worker.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = WORKER_PATH_LOCAL;

const ReaderScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();

    // Initial mode can be 'chat' if coming from workspace
    const initialModeParam = searchParams.get('mode');

    const [file, setFile] = useState<File | null>(location.state?.sharedFile || null);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);

    // Hub Modes: 0=View, 1=Chat, 2=Outline, 3=Map
    const [activeHubMode, setActiveHubMode] = useState<number>(initialModeParam === 'chat' ? 1 : 0);

    const [mindMapData, setMindMapData] = useState<string>('');
    const [isGeneratingMindMap, setIsGeneratingMindMap] = useState<boolean>(false);
    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [outlineData, setOutlineData] = useState<string | null>(null);

    // Chat Logic
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot', text: string }[]>([]);
    const [chatQuery, setChatQuery] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [documentContext, setDocumentContext] = useState<string | null>(null);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

    const [showAiLimit, setShowAiLimit] = useState(false);
    const [showConsent, setShowConsent] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [showMindMapSettings, setShowMindMapSettings] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [hasConsent, setHasConsent] = useState(localStorage.getItem('ai_neural_consent') === 'true');
    const [aiLimitInfo, setAiLimitInfo] = useState<{ blockMode: any; used: number; limit: number }>({ blockMode: null, used: 0, limit: 0 });

    const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);

    // Helper to check for auth barriers
    const checkAuthBarrier = (response: string) => {
        // GLOBAL PRO OVERRIDE: Ignore backend auth errors on frontend
        return false;
    };

    const pdfOptions = useMemo(() => ({
        workerSrc: WORKER_PATH_LOCAL,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/cmaps/',
        cMapPacked: true,
    }), []);

    const docFile = useMemo(() => pdfData ? { data: pdfData } : null, [pdfData]);

    useEffect(() => {
        if (file) {
            setPdfError(null);
            setIsLoading(true);
            const reader = new FileReader();
            reader.onload = () => {
                const arrayBuffer = reader.result as ArrayBuffer;
                setPdfData(new Uint8Array(arrayBuffer));
                // We clear isLoading here, but Document might still be loading pages.
                // However, this prevents the 'Neural processing' overlay from being stuck.
                setIsLoading(false);
            };
            reader.onerror = () => {
                setPdfError("Could not read file data.");
                setIsLoading(false);
            };
            reader.readAsArrayBuffer(file);
        } else {
            setPdfData(null);
            setPdfError(null);
            setIsLoading(false);
        }
    }, [file]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPageNumber(1);
            resetAllStates();
        }
    };

    const resetAllStates = () => {
        setMindMapData('');
        setOutlineData(null);
        setChatHistory([]);
        setDocumentContext(null);
        setPageNumber(1);
        window.speechSynthesis?.cancel();
    };

    const generateChatSummary = async (forceText?: string) => {
        if (!file || isGeneratingSummary || chatHistory.length > 0) return;

        // AI CREDIT CHECK - Add this block
        const aiCheck = canUseAI(AiOperationType.HEAVY);
        if (!aiCheck.allowed) {
            const sub = getSubscription();
            setAiLimitInfo({
                blockMode: aiCheck.blockMode,
                used: sub.aiDocsThisMonth,
                limit: sub.tier === SubscriptionTier.FREE ? 3 : 50
            });
            setShowAiLimit(true);
            return; // STOP - user has no credits
        }

        setIsGeneratingSummary(true);
        try {
            let extractedText = forceText;
            if (!extractedText) {
                const buffer = await file.arrayBuffer();
                extractedText = await extractTextFromPdf(buffer.slice(0), undefined, undefined, (p) => setLoadProgress(p));
            }
            const context = `FILENAME: ${file.name}\nCONTENT: ${extractedText || "[SCANNED]"}`;
            setDocumentContext(context);

            const prompt = `Analyze this document and summarize it. Respond in a professional tone.`;
            const response = await askGemini(prompt, context, 'chat');

            if (response.success && response.data) {
                setChatHistory([{ role: 'bot', text: response.data }]);
                await recordAIUsage(AiOperationType.HEAVY);
            }
        } catch (err) {
            console.error('Summary Error:', err);
        } finally {
            setIsGeneratingSummary(false);
            setLoadProgress(0);
        }
    };

    const handleAsk = async () => {
        if (!chatQuery.trim() || isAsking || !documentContext) return;

        // AI CREDIT CHECK - Add this block
        const aiCheck = canUseAI(AiOperationType.HEAVY);
        if (!aiCheck.allowed) {
            const sub = getSubscription();
            setAiLimitInfo({
                blockMode: aiCheck.blockMode,
                used: sub.aiDocsThisMonth,
                limit: sub.tier === SubscriptionTier.FREE ? 3 : 50
            });
            setShowAiLimit(true);
            return; // STOP - user has no credits
        }

        const currentQuery = chatQuery;
        setChatQuery('');
        setChatHistory(prev => [...prev, { role: 'user', text: currentQuery }]);
        setIsAsking(true);
        try {
            const response = await askGemini(currentQuery, documentContext, 'chat');
            if (response.success && response.data) {
                setChatHistory(prev => [...prev, { role: 'bot', text: response.data! }]);
                await recordAIUsage(AiOperationType.HEAVY);
            }
        } catch (err) {
            console.error('Chat Error:', err);
        } finally {
            setIsAsking(false);
        }
    };


    const generateMindMap = async (settings?: { range: string; focus: string }) => {
        if (!file || isGeneratingMindMap) return;

        if (!hasConsent) { setShowConsent(true); return; }
        if (activeHubMode === 3 && !settings) { setActiveHubMode(0); return; }
        if (!settings && !mindMapData) { setShowMindMapSettings(true); return; }

        // AI CREDIT CHECK - Add this block
        const aiCheck = canUseAI(AiOperationType.HEAVY);
        if (!aiCheck.allowed) {
            const sub = getSubscription();
            setAiLimitInfo({
                blockMode: aiCheck.blockMode,
                used: sub.aiDocsThisMonth,
                limit: sub.tier === SubscriptionTier.FREE ? 3 : 50
            });
            setShowAiLimit(true);
            return; // STOP - user has no credits
        }

        setActiveHubMode(3);

        if (mindMapData && !settings) return;
        setShowMindMapSettings(false);
        setIsGeneratingMindMap(true);
        try {
            let text = "";
            let imageBase64 = "";
            let fileMime = file.type || 'image/jpeg';

            // Parse page range settings
            let startPage = 1;
            let endPage = numPages;
            if (settings?.range) {
                const parts = settings.range.split('-').map(p => parseInt(p.trim()));
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    startPage = parts[0];
                    endPage = parts[1];
                } else if (parts.length === 1 && !isNaN(parts[0])) {
                    startPage = parts[0];
                    endPage = parts[0];
                }
            }

            if (file.type === "application/pdf") {
                const buffer = await file.arrayBuffer();
                text = await extractTextFromPdf(buffer.slice(0), startPage, endPage, (p) => setLoadProgress(p));
                if (!text || text.trim() === '') {
                    imageBase64 = await renderPageToImage(buffer.slice(0), startPage);
                    fileMime = 'image/jpeg';
                    text = "[SCANNED]";
                }
            } else {
                const rawBase64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
                imageBase64 = await compressImage(rawBase64);
            }

            const prompt = `Generate a single-level Mind Map summary in indented list format.
CRITICAL RULES:
1. CENTER NODE: The absolute main topic. MAX 2 WORDS.
2. BRANCHES: Exactly 12 branches extracting the most important details.
3. LABEL LIMIT: Each branch label MUST be exactly 1 or 2 words. NO MORE.
4. FORMAT: Use a single dash (-) for branches. NO markdown, NO bolding, NO extra text.
${settings?.focus ? `STRATEGIC FOCUS: ${settings.focus}` : ""}

Analyze the provided document text and return ONLY the indented list structure.`;

            const response = await askGemini(prompt, text, "mindmap", imageBase64 || undefined, fileMime);
            if (response.success && response.data) {
                setMindMapData(response.data);
                await recordAIUsage(AiOperationType.HEAVY);
            }
        } catch (error) { console.error(error); } finally {
            setIsGeneratingMindMap(false);
            setLoadProgress(0);
        }
    };

    const generateOutline = async () => {
        if (!file || isGeneratingOutline) return;
        if (!hasConsent) { setShowConsent(true); return; }

        const aiCheck = canUseAI(AiOperationType.HEAVY);
        if (!aiCheck.allowed) {
            const sub = getSubscription();
            setAiLimitInfo({ blockMode: aiCheck.blockMode, used: sub.aiDocsThisMonth, limit: sub.tier === SubscriptionTier.FREE ? 3 : 50 });
            setShowAiLimit(true);
            return;
        }

        setActiveHubMode(2);

        if (outlineData) return;
        setIsGeneratingOutline(true);
        try {
            const buffer = await file.arrayBuffer();
            const text = await extractTextFromPdf(buffer.slice(0), undefined, undefined, (p) => setLoadProgress(p));
            if (!documentContext) setDocumentContext(`FILENAME: ${file.name}\nCONTENT: ${text}`);
            const prompt = `Provide a structured outline of this document.`;
            const response = await askGemini(prompt, text, "outline");
            if (response.success && response.data) {
                setOutlineData(response.data);
                await recordAIUsage(AiOperationType.HEAVY);
            }
        } catch (error) { console.error(error); } finally {
            setIsGeneratingOutline(false);
            setLoadProgress(0);
        }
    };



    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-gray-100 flex flex-col pb-32 pt-32">
            <div className="flex-1 max-w-7xl mx-auto w-full px-6">
                {!file ? (
                    <div className="space-y-12 max-w-2xl mx-auto">
                        <div className="space-y-3">
                            <div className="text-technical">Available Tools / Reader</div>
                            <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Reader</h1>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-relaxed">Immersive reading environment with neural augmentation</p>
                        </div>

                        <ToolGuide
                            title="Document Intelligence Guide"
                            description="Analyze, summarize, and visualize document architecture privately."
                            steps={[
                                "Upload the document you want to read.",
                                "Select 'Mobile View' for streamlined reading.",
                                "Use 'Outline' to view the document structure.",
                                "Generate 'Mind Map' for a visual intelligence breakdown."
                            ]}
                            useCases={[
                                "Academic Research", "Technical Analysis", "Summarization", "Visual Learning"
                            ]}
                        />
                        <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 cursor-pointer">
                            <div className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center mb-6"><FileUp size={28} /></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-center px-6">Select Document</span>
                            <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                            <div className="space-y-3 max-w-2xl">
                                <div className="text-technical">Neural Reader / Document Hub</div>
                                <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-gray-900 dark:text-white">Neural Hub</h1>
                            </div>

                            {/* Unified 4-Function Nav */}
                            <div className="flex items-center gap-1.5 p-1.5 bg-black/5 dark:bg-white/5 rounded-[22px] border border-black/5 dark:border-white/5 w-full md:w-auto overflow-x-auto no-scrollbar">
                                {[
                                    { id: 0, label: 'View', icon: BookOpen },
                                    { id: 1, label: 'Chat', icon: Zap },
                                    { id: 2, label: 'Outline', icon: List },
                                    { id: 3, label: 'Map', icon: GitBranch }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveHubMode(tab.id);
                                            if (tab.id === 1) generateChatSummary();
                                            if (tab.id === 2) generateOutline();
                                            if (tab.id === 3) generateMindMap();
                                        }}
                                        className={`flex items-center gap-2 px-5 py-3 rounded-[16px] transition-all whitespace-nowrap ${activeHubMode === tab.id
                                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl scale-[1.02]'
                                            : 'text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                                            }`}
                                    >
                                        <tab.icon size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div >

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2">
                                    <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} className="p-2.5 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"><ChevronLeft size={16} /></button>
                                    <span className="text-[9px] font-black flex items-center min-w-[40px] justify-center">{pageNumber} / {numPages}</span>
                                    <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} className="p-2.5 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"><ChevronRight size={16} /></button>
                                </div>

                                {activeHubMode === 0 && (
                                    <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 px-4 py-2 rounded-full border border-black/5 dark:border-white/5">
                                        <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors" title="Zoom Out"><ZoomOut size={14} /></button>
                                        <span className="text-[9px] font-black w-8 text-center">{Math.round(scale * 100)}%</span>
                                        <button onClick={() => setScale(s => Math.min(3.0, s + 0.1))} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors" title="Zoom In"><ZoomIn size={14} /></button>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setFile(null)} className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-full transition-all"><X size={18} /></button>
                        </div>

                        <div className="monolith-card bg-gray-50 dark:bg-[#0a0a0a] min-h-[600px] overflow-hidden relative border-none shadow-inner">
                            <AnimatePresence mode="wait">
                                {(isGeneratingMindMap || isGeneratingOutline || isLoading || isGeneratingSummary) && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-md"
                                    >
                                        <div className="relative">
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                                className="w-16 h-16 border-t-2 border-l-2 border-black dark:border-white rounded-full"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Zap size={20} className="text-black dark:text-white animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="mt-8 text-center space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black dark:text-white">
                                                {isLoading ? "Reading Document..." : (isGeneratingMindMap || isGeneratingOutline || isGeneratingSummary) ? "Neural Processing..." : "Synchronizing..."}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {activeHubMode === 3 ? (
                                    <motion.div key="mm" className="p-8 h-full"><MindMapComponent data={mindMapData} /></motion.div>
                                ) : activeHubMode === 2 ? (
                                    <motion.div key="ot" className="p-8 h-full overflow-y-auto font-mono text-xs leading-relaxed whitespace-pre-wrap">{outlineData}</motion.div>
                                ) : activeHubMode === 1 ? (
                                    <motion.div key="chat" className="flex flex-col h-[600px]">
                                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                            {chatHistory.map((m, i) => (
                                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[85%] p-5 rounded-[28px] text-xs font-bold leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-none' : 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border border-black/5 rounded-tl-none'}`}>
                                                        {m.text}
                                                    </div>
                                                </div>
                                            ))}
                                            {isAsking && <div className="flex justify-start"><div className="bg-black/5 p-4 rounded-full rounded-tl-none animate-pulse">...</div></div>}
                                        </div>
                                        <div className="p-6 border-t border-black/5 dark:border-white/5 flex gap-3">
                                            <input type="text" placeholder="ASK NEURAL ENGINE..." value={chatQuery} onChange={(e) => setChatQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAsk()} className="flex-1 bg-black/5 dark:bg-white/5 border-none rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest focus:outline-none dark:text-white" />
                                            <button onClick={handleAsk} className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shadow-xl hover:scale-105 transition-all"><Zap size={18} fill="currentColor" /></button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="h-[600px] overflow-auto flex justify-center p-8 bg-gray-200 dark:bg-[#111]">
                                        {docFile && (
                                            <Document
                                                file={docFile}
                                                options={pdfOptions}
                                                onLoadSuccess={d => {
                                                    setNumPages(d.numPages);
                                                    setPdfError(null);
                                                }}
                                                onLoadError={(err) => {
                                                    console.error("PDF Load Error:", err);
                                                    setPdfError("Neural link failed to stabilize. Possible document corruption.");
                                                }}
                                                loading={
                                                    <div className="flex flex-col items-center justify-center p-20 space-y-4">
                                                        <Loader2 size={32} className="animate-spin text-black/20 dark:text-white/20" />
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Streaming...</p>
                                                    </div>
                                                }
                                            >
                                                {pdfError ? (
                                                    <div className="p-12 text-center text-xs font-bold text-rose-500 uppercase tracking-tighter">
                                                        {pdfError}
                                                    </div>
                                                ) : (
                                                    <Page
                                                        pageNumber={pageNumber}
                                                        scale={scale}
                                                        loading={<div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin opacity-10" /></div>}
                                                        renderTextLayer={true}
                                                        renderAnnotationLayer={true}
                                                    />
                                                )}
                                            </Document>
                                        )}
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
            <AIOptInModal isOpen={showConsent} onClose={() => setShowConsent(false)} onAccept={() => { localStorage.setItem('ai_neural_consent', 'true'); setHasConsent(true); setShowConsent(false); }} />
            <AIReportModal isOpen={showReport} onClose={() => setShowReport(false)} />
            <AiLimitModal isOpen={showAiLimit} onClose={() => setShowAiLimit(false)} blockMode={aiLimitInfo.blockMode} used={aiLimitInfo.used} limit={aiLimitInfo.limit} />
            <MindMapSettingsModal isOpen={showMindMapSettings} numPages={numPages} onClose={() => setShowMindMapSettings(false)} onConfirm={s => generateMindMap(s)} />

            {/* Login Required Modal */}
            <AnimatePresence>
                {showLoginPrompt && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-[32px] overflow-hidden shadow-2xl border border-gray-100 dark:border-[#333]"
                        >
                            <div className="p-8 space-y-6 text-center">
                                <div className="w-16 h-16 mx-auto bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center">
                                    <Shield size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">
                                        Authentication Required
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                                        Advanced neural features like Mind Map and Outline require a verified Google account for security.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        onClick={() => setShowLoginPrompt(false)}
                                        className="py-4 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowLoginPrompt(false);
                                            navigate('/login');
                                        }}
                                        className="py-4 bg-black dark:bg-white text-white dark:text-black text-xs font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg"
                                    >
                                        Sign In
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ReaderScreen;
