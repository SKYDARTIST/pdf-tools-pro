import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, BookOpen, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, X, Zap, ZapOff, Activity, Share2, Headphones, GitBranch, Play, Square, Loader2, Sparkles } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { extractTextFromPdf } from '../utils/pdfExtractor';
import MindMapComponent from '../components/MindMapComponent';
import { askGemini } from '../services/aiService';
import NeuralCoolingUI from '../components/NeuralCoolingUI';
import AIOptInModal from '../components/AIOptInModal';
import AIReportModal from '../components/AIReportModal';
import { Flag } from 'lucide-react';

// Configure PDF.js worker - using CDN fallback for maximum reliability if local fails
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const ReaderScreen: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.0);
    const [isFluidMode, setIsFluidMode] = useState<boolean>(false);
    const [fluidContent, setFluidContent] = useState<string>('');
    const [isLoadingFluid, setIsLoadingFluid] = useState<boolean>(false);

    // Advanced Intelligence State
    const [isMindMapMode, setIsMindMapMode] = useState<boolean>(false);
    const [mindMapData, setMindMapData] = useState<string>('');
    const [isGeneratingMindMap, setIsGeneratingMindMap] = useState<boolean>(false);

    const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
    const [isCooling, setIsCooling] = useState<boolean>(false);
    const [audioScript, setAudioScript] = useState<string>('');
    const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
    const [speechUtterance, setSpeechUtterance] = useState<SpeechSynthesisUtterance | null>(null);
    const [showConsent, setShowConsent] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [hasConsent, setHasConsent] = useState(localStorage.getItem('ai_neural_consent') === 'true');
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setPageNumber(1);
            setIsFluidMode(false);
            setFluidContent('');
        }
    };

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const goToPrevPage = () => {
        setPageNumber((prev) => Math.max(prev - 1, 1));
    };

    const goToNextPage = () => {
        setPageNumber((prev) => Math.min(prev + 1, numPages));
    };

    const zoomIn = () => {
        setScale((prev) => Math.min(prev + 0.2, 3.0));
    };

    const zoomOut = () => {
        setScale((prev) => Math.max(prev - 0.2, 0.5));
    };

    const toggleFluidMode = async () => {
        if (!file) return;

        if (!isFluidMode && !fluidContent) {
            setIsLoadingFluid(true);
            try {
                const buffer = await file.arrayBuffer();
                const text = await extractTextFromPdf(buffer);
                setFluidContent(text);
            } catch (error) {
                console.error("Fluid Extraction Failed:", error);
            } finally {
                setIsLoadingFluid(false);
            }
        }
        setIsFluidMode(!isFluidMode);
        setIsMindMapMode(false);
    };

    const generateMindMap = async () => {
        if (!file || isGeneratingMindMap) return;

        if (!hasConsent) {
            setPendingAction(() => generateMindMap);
            setShowConsent(true);
            return;
        }

        setIsMindMapMode(true);
        setIsFluidMode(false);

        if (mindMapData) return;

        setIsGeneratingMindMap(true);
        try {
            let text = fluidContent;
            if (!text) {
                const buffer = await file.arrayBuffer();
                text = await extractTextFromPdf(buffer);
                setFluidContent(text);
            }
            const response = await askGemini("Extract a hierarchical mind map structure from this PDF. Use a simple indented list. STRICT LIMITS: Max 5 level-1 branches and 3 level-2 sub-branches per node. Group similar concepts together to ensure a clean, focused hierarchy. Output only the indented list.", text, "mindmap");
            if (response.startsWith('AI_RATE_LIMIT')) {
                setIsCooling(true);
                setMindMapData(null);
                return;
            }
            setMindMapData(response);
        } catch (error) {
            console.error("Mind Map Generation Failed:", error);
        } finally {
            setIsGeneratingMindMap(false);
        }
    };

    const toggleAudioNarrator = async () => {
        if (isAudioPlaying) {
            window.speechSynthesis.cancel();
            setIsAudioPlaying(false);
            return;
        }

        if (!hasConsent) {
            setPendingAction(() => toggleAudioNarrator);
            setShowConsent(true);
            return;
        }

        if (audioScript) {
            startSpeaking(audioScript);
            return;
        }

        setIsGeneratingAudio(true);
        try {
            let text = fluidContent;
            if (!text) {
                const buffer = await file.arrayBuffer();
                text = await extractTextFromPdf(buffer);
                setFluidContent(text);
            }
            const response = await askGemini("Convert this document into a concise, engaging 'podcast-style' audio script for a narrator. Focus on the core value and findings.", text, "audio_script");
            setAudioScript(response);
            startSpeaking(response);
        } catch (error) {
            console.error("Audio Generation Failed:", error);
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const startSpeaking = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => setIsAudioPlaying(false);
        setSpeechUtterance(utterance);
        window.speechSynthesis.speak(utterance);
        setIsAudioPlaying(true);
    };

    const handleMindMintHandoff = async () => {
        if (!file) return;

        let text = fluidContent;
        if (!text) {
            try {
                const buffer = await file.arrayBuffer();
                text = await extractTextFromPdf(buffer);
                setFluidContent(text);
            } catch (err) {
                console.error("Text extraction failed for handoff", err);
                return;
            }
        }

        // Copy context for manual paste on MindMint
        const context = text.substring(0, 6000);
        try {
            await navigator.clipboard.writeText(context);
            if (window.confirm("ECO-EXPANSION: Study Studio Integrated!\n\nWe've optimized this document's text and copied it to your clipboard. \n\nGet an amazing educational boost at MindMint.study (Free Tier Included):\n• Generate Quizzes & Flashcards\n• Create Study Infographics\n• PWA Mobile-Ready\n\nClick 'OK' to launch your expansion studio.")) {
                window.open("https://www.mindmint.study/", '_blank');
            }
        } catch (e) {
            alert("Clipboard access failed. Please copy the text manually from Fluid Mode.");
            window.open("https://www.mindmint.study/", '_blank');
        }
    };

    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-screen pb-32 pt-32 max-w-2xl mx-auto px-6"
        >
            <div className="space-y-12">
                {/* Header Section */}
                <div className="space-y-3">
                    <div className="text-technical">Protocol Assets / Linear Reading</div>
                    <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Read</h1>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        {isFluidMode ? "Neural Reflow Mode - Responsive Data Stream" : "Execute sequential data interpretation via high-fidelity document rendering"}
                    </p>
                </div>

                {!file ? (
                    <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
                        <motion.div
                            whileHover={{ scale: 1.1, y: -5 }}
                            className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
                        >
                            <BookOpen size={32} />
                        </motion.div>
                        <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Initialize Reader</span>
                        <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                    </label>
                ) : (
                    <div className="space-y-8">
                        {/* Advanced Controls Bar */}
                        <div className="flex items-center justify-between monolith-card p-6 border-none shadow-xl gap-4 overflow-x-auto no-scrollbar">
                            <div className="flex items-center gap-2">
                                {/* Reflow/Fluid Toggle */}
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={toggleFluidMode}
                                    className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isFluidMode
                                        ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/20 dark:shadow-white/20'
                                        : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'
                                        }`}
                                >
                                    {isFluidMode ? <Zap size={14} fill="currentColor" /> : <Zap size={14} />}
                                    {isFluidMode ? "Disable Fluid" : "Fluid Mode"}
                                </motion.button>

                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={generateMindMap}
                                    className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isMindMapMode
                                        ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/20 dark:shadow-white/20'
                                        : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'
                                        }`}
                                >
                                    <GitBranch size={14} />
                                    {isGeneratingMindMap ? "Scanning..." : "Neural Map"}
                                </motion.button>

                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={toggleAudioNarrator}
                                    className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isAudioPlaying
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'
                                        }`}
                                >
                                    {isGeneratingAudio ? <Loader2 size={14} className="animate-spin" /> : isAudioPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} />}
                                    {isAudioPlaying ? "Stop Audio" : "Audio Brief"}
                                </motion.button>

                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleMindMintHandoff}
                                    className="flex items-center gap-3 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all group"
                                >
                                    <Sparkles size={14} className="group-hover:rotate-12 transition-transform" fill="currentColor" />
                                    Expansion Studio
                                </motion.button>
                            </div>

                            <AnimatePresence mode="wait">
                                {!isFluidMode ? (
                                    <motion.div
                                        key="classic-controls"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="flex items-center gap-4 shrink-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={goToPrevPage}
                                                disabled={pageNumber <= 1}
                                                className="p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all"
                                            >
                                                <ChevronLeft size={18} className="text-gray-900 dark:text-white" />
                                            </button>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white min-w-[60px] text-center">
                                                {pageNumber} / {numPages}
                                            </span>
                                            <button
                                                onClick={goToNextPage}
                                                disabled={pageNumber >= numPages}
                                                className="p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all"
                                            >
                                                <ChevronRight size={18} className="text-gray-900 dark:text-white" />
                                            </button>
                                        </div>

                                        <div className="h-8 w-[1px] bg-black/5 dark:bg-white/5 hidden sm:block" />

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={zoomOut}
                                                disabled={scale <= 0.5}
                                                className="p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all"
                                            >
                                                <ZoomOut size={18} className="text-gray-900 dark:text-white" />
                                            </button>
                                            <button
                                                onClick={zoomIn}
                                                disabled={scale >= 3.0}
                                                className="p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all"
                                            >
                                                <ZoomIn size={18} className="text-gray-900 dark:text-white" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="fluid-indicator"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-2"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        Responsive Stream Active
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                onClick={() => {
                                    setFile(null);
                                    setIsFluidMode(false);
                                }}
                                className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="monolith-card bg-gray-50 dark:bg-[#0a0a0a] border-none shadow-2xl p-0 overflow-hidden relative min-h-[600px]">
                            <AnimatePresence mode="wait">
                                {isMindMapMode ? (
                                    <motion.div
                                        key="mindmap-view"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 p-8 flex flex-col"
                                    >
                                        <div className="flex justify-between items-center mb-8">
                                            <div className="flex items-center gap-2">
                                                <GitBranch size={16} className="text-black dark:text-white" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black dark:text-white">Neural Mind Map Projection</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => setShowReport(true)}
                                                    className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:opacity-100 opacity-60 transition-all mr-4"
                                                >
                                                    <Flag size={10} />
                                                    Report Content
                                                </button>
                                                <button
                                                    onClick={() => setIsMindMapMode(false)}
                                                    className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white"
                                                >
                                                    Back to Reader
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-h-0">
                                            {isGeneratingMindMap ? (
                                                <div className="h-full flex flex-col items-center justify-center space-y-4">
                                                    <Loader2 size={32} className="animate-spin text-black dark:text-white opacity-20" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Synthesizing Document Structure...</span>
                                                </div>
                                            ) : (
                                                <MindMapComponent data={mindMapData} />
                                            )}
                                        </div>
                                    </motion.div>
                                ) : isLoadingFluid ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center"
                                    >
                                        <Zap size={48} className="text-black dark:text-white animate-pulse mb-6 opacity-20" />
                                        <h3 className="text-sm font-black uppercase tracking-widest text-black dark:text-white mb-2">Neural Reflow Processing</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Optimizing sequential data for mobile consumption...</p>
                                    </motion.div>
                                ) : isFluidMode ? (
                                    <motion.div
                                        key="fluid-view"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="p-10 h-[600px] overflow-y-auto custom-scrollbar prose prose-sm dark:prose-invert max-w-none relative"
                                        onScroll={(e) => {
                                            const container = e.currentTarget;
                                            const markers = container.querySelectorAll('.page-marker');
                                            let currentVisiblePage = 1;
                                            markers.forEach((marker) => {
                                                const rect = marker.getBoundingClientRect();
                                                const containerRect = container.getBoundingClientRect();
                                                if (rect.top <= containerRect.top + 100) {
                                                    const pageMatch = marker.textContent?.match(/PAGE (\d+)/);
                                                    if (pageMatch) currentVisiblePage = parseInt(pageMatch[1]);
                                                }
                                            });
                                            if (currentVisiblePage !== pageNumber) setPageNumber(currentVisiblePage);
                                        }}
                                    >
                                        {/* Floating Page Indicator for Fluid Mode */}
                                        <div className="sticky top-0 right-0 flex justify-end pointer-events-none z-20">
                                            <div className="bg-black/80 dark:bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-[9px] font-black text-white dark:text-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2">
                                                <Activity size={10} className="text-emerald-400" />
                                                Streaming Page {pageNumber}
                                            </div>
                                        </div>

                                        {fluidContent.split('\n\n').map((para, i) => (
                                            <p key={i} className="text-[14px] leading-relaxed text-gray-800 dark:text-gray-200 font-medium mb-6">
                                                {para.startsWith('[PAGE') ? (
                                                    <span className="page-marker block text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-4 pb-2 border-b border-black/5 dark:border-white/5 pt-8">
                                                        {para}
                                                    </span>
                                                ) : para}
                                            </p>
                                        ))}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="classic-view"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="h-[600px] overflow-auto bg-gray-200 dark:bg-black/40 custom-scrollbar"
                                    >
                                        <div className="p-8 min-h-full flex items-start justify-center">
                                            <Document
                                                file={file}
                                                onLoadSuccess={onDocumentLoadSuccess}
                                                className="shadow-[0_0_80px_rgba(0,0,0,0.1)] dark:shadow-[0_0_80px_rgba(255,255,255,0.05)] border border-black/5 dark:border-white/5"
                                            >
                                                <Page
                                                    pageNumber={pageNumber}
                                                    scale={scale}
                                                    renderTextLayer={true}
                                                    renderAnnotationLayer={true}
                                                    loading={<div className="w-96 h-[500px] bg-black/5 dark:bg-white/5 animate-pulse rounded-2xl" />}
                                                />
                                            </Document>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
            {/* Neural Cooling Safety Valve */}
            <NeuralCoolingUI isVisible={isCooling} onComplete={() => setIsCooling(false)} />

            <AIOptInModal
                isOpen={showConsent}
                onClose={() => setShowConsent(false)}
                onAccept={() => {
                    localStorage.setItem('ai_neural_consent', 'true');
                    setHasConsent(true);
                    setShowConsent(false);
                    if (pendingAction) {
                        pendingAction();
                        setPendingAction(null);
                    }
                }}
            />

            <AIReportModal
                isOpen={showReport}
                onClose={() => setShowReport(false)}
            />
        </motion.div>
    );
};

export default ReaderScreen;
