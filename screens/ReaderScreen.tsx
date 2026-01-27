import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, BookOpen, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, X, Zap, Activity, Share2, GitBranch, Loader2, Sparkles, Shield, Flag, Volume2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { downloadFile } from '../services/downloadService';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { extractTextFromPdf, renderPageToImage } from '../utils/pdfExtractor';
import { canUseAI, recordAIUsage, getSubscription, SubscriptionTier, AiOperationType } from '../services/subscriptionService';
import AiLimitModal from '../components/AiLimitModal';
import { compressImage } from '../utils/imageProcessor';
import MindMapComponent from '../components/MindMapComponent';
import { askGemini } from '../services/aiService';
import NeuralCoolingUI from '../components/NeuralCoolingUI';
import AIOptInModal from '../components/AIOptInModal';
import AIReportModal from '../components/AIReportModal';
import NeuralPulse from '../components/NeuralPulse';
import ToolGuide from '../components/ToolGuide';
import MindMapSettingsModal from '../components/MindMapSettingsModal';
import NeuralProtocolBrief from '../components/NeuralProtocolBrief';
import BriefingSettingsModal from '../components/BriefingSettingsModal';
import { useAIAuth } from '../hooks/useAIAuth';
import { AuthModal } from '../components/AuthModal';
import { getCurrentUser } from '../services/googleAuthService';
import { initSubscription } from '../services/subscriptionService';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

// Configure PDF.js worker - using local file for offline/Capacitor support
const WORKER_PATH_LOCAL = window.location.origin + '/pdf.worker.mjs';
const WORKER_PATH_CDN = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

// Set default globally as well for secondary modules
pdfjs.GlobalWorkerOptions.workerSrc = WORKER_PATH_LOCAL;

console.log('Neural Link: Worker Paths:', { LOCAL: WORKER_PATH_LOCAL, CDN: WORKER_PATH_CDN });

const ReaderScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const protocol = searchParams.get('protocol');
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
    const [showConsent, setShowConsent] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [showMindMapSettings, setShowMindMapSettings] = useState(false);
    const [hasConsent, setHasConsent] = useState(localStorage.getItem('ai_neural_consent') === 'true');
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [showAiLimit, setShowAiLimit] = useState(false);
    const [aiLimitInfo, setAiLimitInfo] = useState<{ blockMode: any; used: number; limit: number }>({ blockMode: null, used: 0, limit: 0 });
    const { authModalOpen, setAuthModalOpen, checkAndPrepareAI } = useAIAuth();

    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditData, setAuditData] = useState<string | null>(null);
    const [outlineData, setOutlineData] = useState<string | null>(null);
    const [isOutlineMode, setIsOutlineMode] = useState(false);
    const [showBrief, setShowBrief] = useState(false);
    const [briefType, setBriefType] = useState<'audit' | 'briefing' | 'reader'>('reader');
    const [showBriefingSettings, setShowBriefingSettings] = useState(false);
    const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();

    // Stable options object to prevent "Invariant failed"
    const pdfOptions = useMemo(() => ({
        workerSrc: WORKER_PATH_LOCAL,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/cmaps/',
        cMapPacked: true,
    }), []);

    // Stable file object to prevent "Invariant failed"
    const docFile = useMemo(() => pdfData ? { data: pdfData } : null, [pdfData]);

    useEffect(() => {
        if (file) {
            setPdfError(null);
            setIsLoading(true);
            // We don't clear pdfData here to prevent Document unmount/invariant fail
            console.log('Neural Link: Reading file into memory buffer...');

            const reader = new FileReader();
            reader.onload = () => {
                const arrayBuffer = reader.result as ArrayBuffer;
                setPdfData(new Uint8Array(arrayBuffer));
                // Note: We don't set isLoading(false) here, onLoadSuccess/Error handles it
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
            setIsFluidMode(false);
            setFluidContent('');
            resetAllStates();
        }
    };

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => setNumPages(numPages);
    const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
    const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages));

    const resetAllStates = () => {
        setIsFluidMode(false);
        setIsMindMapMode(false);
        setIsOutlineMode(false);
        setFluidContent('');
        setMindMapData('');
        setOutlineData(null);
        setAuditData(null);
        setPageNumber(1);
        setIsAudioPlaying(false);
        TextToSpeech.stop().catch(() => { });
        window.speechSynthesis?.cancel();
    };

    const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
    const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));

    useEffect(() => {
        const sharedFile = (location.state as any)?.sharedFile;
        if (sharedFile) {
            setFile(sharedFile);
            resetAllStates();
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const toggleFluidMode = async () => {
        if (!file) return;
        if (isFluidMode) { setIsFluidMode(false); return; }
        if (!fluidContent) {
            setIsLoadingFluid(true);
            try {
                const buffer = await file.arrayBuffer();
                const text = await extractTextFromPdf(buffer.slice(0));
                setFluidContent(text);
            } catch (error) {
                console.error("Text extraction failed:", error);
            } finally {
                setIsLoadingFluid(false);
            }
        }
        setIsFluidMode(true);
        setIsMindMapMode(false);
        setIsOutlineMode(false);
        setAuditData(null);
    };

    const generateMindMap = async (settings?: { range: string; focus: string }) => {
        if (!file || isGeneratingMindMap) return;

        // 1. Auth & Subscription Check
        if (!await checkAndPrepareAI()) {
            setPendingAction(() => () => generateMindMap(settings));
            return;
        }

        if (!hasConsent) { setPendingAction(() => () => generateMindMap(settings)); setShowConsent(true); return; }
        if (isMindMapMode && !settings) { setIsMindMapMode(false); return; }
        if (!settings && !mindMapData) { setShowMindMapSettings(true); return; }

        setIsMindMapMode(true);
        setIsFluidMode(false);
        setIsOutlineMode(false);
        setAuditData(null);

        if (mindMapData && !settings) return;
        setShowMindMapSettings(false);
        setIsGeneratingMindMap(true);
        try {
            let text = "";
            let imageBase64 = "";
            let fileMime = file.type || 'image/jpeg';
            let startPage = 1;
            let endPage = numPages;

            if (file.type === "application/pdf") {
                const buffer = await file.arrayBuffer();
                text = await extractTextFromPdf(buffer.slice(0), startPage, endPage);
                if (!text || text.trim() === '') {
                    imageBase64 = await renderPageToImage(buffer.slice(0), startPage);
                    fileMime = 'image/jpeg';
                    text = "[SCANNED] Vision mode active.";
                }
            } else {
                const rawBase64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(file);
                });
                imageBase64 = await compressImage(rawBase64);
            }

            const prompt = `Generate a high-fidelity Mind Map of this document. 
            RULES:
            1. TOPIC: Identify the main subject in exactly TWO WORDS for the center. 
            2. BRANCHES: Maximum 12 secondary branches total. 
            3. CONTENT: Each branch must be exactly 1-2 words. 
            4. FORMAT: Indented list with dashes (-). No preamble.`;

            const response = await askGemini(prompt, text, "mindmap", imageBase64 || undefined, fileMime);
            if (response.startsWith('AI_RATE_LIMIT')) { setIsCooling(true); setMindMapData(''); return; }
            setMindMapData(response);
            await recordAIUsage(AiOperationType.GUIDANCE);
        } catch (error) {
            console.error("MindMap Failed:", error);
        } finally {
            setIsGeneratingMindMap(false);
        }
    };

    async function startSpeaking(text: string) {
        try { await TextToSpeech.stop(); } catch (e) { }
        window.speechSynthesis?.cancel();

        let sanitizedText = text.replace(/[*#_]+/g, '').trim();
        if (!sanitizedText.toLowerCase().startsWith("welcome")) { sanitizedText = "Welcome to Anti-Gravity. " + sanitizedText; }
        setIsAudioPlaying(true);

        try {
            const nativeVoices = await TextToSpeech.getSupportedVoices();
            const voice = nativeVoices.voices.find(v => v.lang.includes('en') && (v.name.includes('Female') || v.name.includes('Samantha')));
            const voiceIndex = nativeVoices.voices.findIndex(v => v.name === voice?.name);
            await TextToSpeech.speak({ text: sanitizedText, lang: 'en-US', rate: 1.0, pitch: 1.05, volume: 1.0, voice: voiceIndex !== -1 ? voiceIndex : undefined, category: 'ambient' });
            setIsAudioPlaying(false);
        } catch (err) {
            console.log("Native TTS failed, using browser fallback.");
            const chunks = sanitizedText.match(/[^.!?]+[.!?]+/g) || [sanitizedText];
            let currentChunk = 0;
            const speakNextChunk = () => {
                if (currentChunk >= chunks.length) { setIsAudioPlaying(false); return; }
                const utterance = new SpeechSynthesisUtterance(chunks[currentChunk].trim());
                utterance.onend = () => { currentChunk++; speakNextChunk(); };
                utterance.onerror = () => setIsAudioPlaying(false);
                window.speechSynthesis?.speak(utterance);
            };
            speakNextChunk();
        }
    }

    const toggleAudioNarrator = async (settings?: { range: string; focus: string }) => {
        if (isAudioPlaying) { resetAllStates(); return; }

        // 1. Auth & Subscription Check
        if (!await checkAndPrepareAI()) {
            setPendingAction(() => () => toggleAudioNarrator(settings));
            return;
        }

        if (!hasConsent) { setPendingAction(() => () => toggleAudioNarrator(settings)); setShowConsent(true); return; }
        if (audioScript && !settings) { startSpeaking(audioScript); return; }
        if (!settings && numPages > 1) { setShowBriefingSettings(true); return; }

        const aiCheck = canUseAI(AiOperationType.HEAVY);
        if (!aiCheck.allowed) {
            const sub = getSubscription();
            setAiLimitInfo({ blockMode: aiCheck.blockMode, used: sub.tier === SubscriptionTier.FREE ? sub.aiDocsThisWeek : sub.aiDocsThisMonth, limit: sub.tier === SubscriptionTier.FREE ? 1 : 10 });
            setShowAiLimit(true);
            return;
        }

        setShowBriefingSettings(false);
        setIsGeneratingAudio(true);
        try {
            let text = "";
            let imageBase64 = "";
            let fileMime = file?.type || 'image/jpeg';
            if (file?.type === "application/pdf") {
                const buffer = await file.arrayBuffer();
                text = await extractTextFromPdf(buffer.slice(0));
                if (!text || text.trim() === '') {
                    imageBase64 = await renderPageToImage(buffer.slice(0), 1);
                    fileMime = 'image/jpeg';
                    text = "[SCANNED] Vision mode active.";
                }
            } else if (file) {
                const rawBase64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
                imageBase64 = await compressImage(rawBase64);
            }

            const prompt = `Synthesize this document into a professional, engaging audio briefing script. Start with 'Welcome to Anti-Gravity.' Focus on the core message. No markdown or meta-commentary.`;
            const response = await askGemini(prompt, text, "audio_script", imageBase64 || undefined, fileMime);
            if (response.startsWith('AI_RATE_LIMIT')) { setIsCooling(true); return; }
            setAudioScript(response);
            const stats = await recordAIUsage(AiOperationType.HEAVY);
            if (stats?.message) alert(stats.message);
            startSpeaking(response);
        } catch (error) {
            console.error("Audio Failed:", error);
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const generateOutline = async () => {
        if (!file || isGeneratingOutline) return;

        // 1. Auth & Subscription Check
        if (!await checkAndPrepareAI()) {
            setPendingAction(() => generateOutline);
            return;
        }

        if (isOutlineMode) { setIsOutlineMode(false); return; }
        if (!hasConsent) { setPendingAction(() => generateOutline); setShowConsent(true); return; }

        const aiCheck = canUseAI(AiOperationType.HEAVY);
        if (!aiCheck.allowed) {
            const sub = getSubscription();
            setAiLimitInfo({ blockMode: aiCheck.blockMode, used: sub.tier === SubscriptionTier.FREE ? sub.aiDocsThisWeek : sub.aiDocsThisMonth, limit: sub.tier === SubscriptionTier.FREE ? 1 : 10 });
            setShowAiLimit(true);
            return;
        }

        setIsOutlineMode(true);
        setIsMindMapMode(false);
        setIsFluidMode(false);
        setAuditData(null);

        if (outlineData) return;
        setIsGeneratingOutline(true);
        try {
            let text = fluidContent;
            let imageBase64 = "";
            let fileMime = file.type || 'image/jpeg';
            if (!text) {
                if (file.type === "application/pdf") {
                    const buffer = await file.arrayBuffer();
                    text = await extractTextFromPdf(buffer.slice(0));
                    setFluidContent(text);
                    if (!text || text.trim() === '') {
                        text = "[SCANNED] Vision fallback.";
                        imageBase64 = await renderPageToImage(buffer.slice(0), 1);
                        fileMime = 'image/jpeg';
                    }
                } else {
                    const rawBase64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                    });
                    imageBase64 = await compressImage(rawBase64);
                }
            }
            const prompt = `Generate a high-fidelity summary and outline of this document. Focus on the main architectural points and key takeaways.`;
            const response = await askGemini(prompt, text, "outline", imageBase64 || undefined, fileMime);
            if (response.startsWith('AI_RATE_LIMIT')) { setIsCooling(true); return; }
            setOutlineData(response);
            const stats = await recordAIUsage(AiOperationType.HEAVY);
            if (stats?.message) alert(stats.message);
        } catch (error) {
            console.error("Outline Failed:", error);
        } finally {
            setIsGeneratingOutline(false);
        }
    };

    const runNeuralAudit = async () => {
        if (!file || isAuditing) return;

        // 1. Auth & Subscription Check
        if (!await checkAndPrepareAI()) {
            setPendingAction(() => runNeuralAudit);
            return;
        }

        if (!hasConsent) { setPendingAction(() => runNeuralAudit); setShowConsent(true); return; }

        const aiCheck = canUseAI(AiOperationType.HEAVY);
        if (!aiCheck.allowed) {
            const sub = getSubscription();
            setAiLimitInfo({ blockMode: aiCheck.blockMode, used: sub.tier === SubscriptionTier.FREE ? sub.aiDocsThisWeek : sub.aiDocsThisMonth, limit: sub.tier === SubscriptionTier.FREE ? 1 : 10 });
            setShowAiLimit(true);
            return;
        }

        setIsAuditing(true);
        setIsOutlineMode(false);
        setIsMindMapMode(false);
        setIsFluidMode(false);

        try {
            let text = fluidContent;
            let imageBase64 = "";
            let fileMime = file.type || 'image/jpeg';
            if (!text) {
                if (file.type === "application/pdf") {
                    const buffer = await file.arrayBuffer();
                    text = await extractTextFromPdf(buffer.slice(0));
                    if (!text || text.trim() === '') { text = "[SCANNED] Vision fallback."; imageBase64 = await renderPageToImage(buffer.slice(0), 1); fileMime = 'image/jpeg'; }
                } else {
                    const rawBase64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                    });
                    imageBase64 = await compressImage(rawBase64);
                }
            }
            const prompt = `Perform a Neural Security Audit on this document. Identify sensitive information, risks, and PII that should be redacted. Be precise.`;
            const response = await askGemini(prompt, text, "redact", imageBase64 || undefined, fileMime);
            if (response.startsWith('AI_RATE_LIMIT')) { setIsCooling(true); return; }
            setAuditData(response);
            const stats = await recordAIUsage(AiOperationType.HEAVY);
            if (stats?.message) alert(stats.message);
        } catch (error) { console.error("Audit Failed:", error); } finally { setIsAuditing(false); }
    };

    const handleShareSummary = async (content: string, type: string) => {
        try {
            const { Share } = await import('@capacitor/share');
            await Share.share({ title: `AI ${type} - Anti-Gravity`, text: content, dialogTitle: `Share AI ${type}` });
        } catch (err) { console.error('Share failed:', err); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-white dark:bg-[#050505] text-gray-900 dark:text-gray-100 flex flex-col pt-24">
            <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8">
                <div className="flex flex-col gap-6">
                    {!file ? (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {/* Standard Header */}
                            <div className="space-y-3">
                                <div className="text-technical">
                                    {protocol === 'audit' ? 'NEURAL SECURITY PROTOCOL' :
                                        protocol === 'briefing' ? 'INTELLIGENCE BRIEFING' : 'NEURAL DOCUMENT INTERFACE'}
                                </div>
                                <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">
                                    {protocol === 'audit' ? 'AI Audit' :
                                        protocol === 'briefing' ? 'Briefing' : 'Reader'}
                                </h1>
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    {protocol === 'audit' ? 'Advanced Risk Detection & Redaction' :
                                        protocol === 'briefing' ? 'Audio Synthesis & Strategic Summaries' : 'Secure High-Speed PDF Intelligence'}
                                </p>
                                <div className="pt-2">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full neural-glow">
                                        <Shield size={10} className="text-emerald-500" fill="currentColor" />
                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                            {protocol === 'audit' ? 'Elite: Deep Scan Active' : 'Elite: Local Processing'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Dynamic Tool Guide */}
                            <ToolGuide
                                title={
                                    protocol === 'audit' ? 'Security Audit Guide' :
                                        protocol === 'briefing' ? 'Briefing Protocol' : 'Reader Operations'
                                }
                                description={
                                    protocol === 'audit' ? 'Identify hidden risks, financial discrepancies, and PII. AI scans every layer of your document.' :
                                        protocol === 'briefing' ? 'Convert documents into audio briefings and executive summaries for rapid consumption.' : 'Experience the fastest PDF engine. Analyze, summarize, and visualize your documents.'
                                }
                                steps={
                                    protocol === 'audit' ? [
                                        "Select a document for security analysis.",
                                        "Tap 'Neural Scan' to initialize the scan.",
                                        "Review risk flags and sensitive data.",
                                        "Export the sanitized report."
                                    ] :
                                        protocol === 'briefing' ? [
                                            "Upload a report or contract.",
                                            "Tap 'Audio Brief' for a synthesized readout.",
                                            "Use 'Strategic Summary' for key points.",
                                            "Listen on the go with background playback."
                                        ] : [
                                            "Open any PDF document instantly.",
                                            "Use 'Mobile View' for reflowed reading.",
                                            "Generate 'Mind Maps' for visual structure.",
                                            "Ask the AI Assistant for specific details."
                                        ]
                                }
                                useCases={
                                    protocol === 'audit' ? ["Risk Assessment", "PII Redaction", "Compliance Check", "Contract Review"] :
                                        protocol === 'briefing' ? ["Commute Listening", "Executive Summary", "Rapid Learning", "Podcast Style"] : ["Deep Reading", "Visual Learning", "Research", "Document Analysis"]
                                }
                            />

                            {/* Standardized File Input */}
                            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: 180 }}
                                    className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shadow-2xl mb-4"
                                >
                                    {protocol === 'audit' ? <Shield size={24} /> :
                                        protocol === 'briefing' ? <Activity size={24} /> : <FileUp size={24} />}
                                </motion.div>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-900 dark:text-white">
                                    {protocol === 'audit' ? 'Select File to Audit' : 'Select Source Document'}
                                </span>
                                <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                    ) : (
                        <>
                            <div className="monolith-card p-6 md:p-10 space-y-10 border-none shadow-none bg-transparent">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Active Protocol</span>
                                        </div>
                                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none break-all">{file.name}</h1>
                                    </div>
                                    {protocol === 'briefing' ? (
                                        <div className="flex flex-col md:flex-row items-center justify-center gap-6 my-8 w-full md:w-auto">
                                            {/* BRIEFING Button */}
                                            <button
                                                onClick={() => generateOutline()}
                                                disabled={isGeneratingOutline}
                                                className="flex items-center gap-2 px-8 py-4 border border-gray-400 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-all whitespace-nowrap"
                                            >
                                                {isGeneratingOutline ? <Loader2 size={18} className="animate-spin" /> : <BookOpen size={18} />}
                                                <span className="font-bold text-sm uppercase">Briefing</span>
                                            </button>

                                            {/* AUDIO BRIEFING Button */}
                                            <button
                                                onClick={() => toggleAudioNarrator()}
                                                disabled={isGeneratingAudio}
                                                className="flex items-center gap-2 px-8 py-4 border border-gray-400 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-all whitespace-nowrap"
                                            >
                                                {isGeneratingAudio ? <Loader2 size={18} className="animate-spin" /> : <Volume2 size={18} />}
                                                <span className="font-bold text-sm uppercase">{isAudioPlaying ? 'Stop Audio' : 'Audio Briefing'}</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={`flex items-center gap-3 md:pb-0 ${protocol === 'audit' ? 'w-full justify-center md:justify-end overflow-visible p-2' : 'overflow-x-auto pb-2 scrollbar-hide'}`}>
                                            {protocol !== 'audit' && (
                                                <>
                                                    <button onClick={toggleFluidMode} className={`px-6 py-4 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${isFluidMode ? 'bg-black dark:bg-white text-white dark:text-black shadow-2xl scale-105' : 'bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100'}`}>
                                                        <Zap size={14} /> {isFluidMode ? 'Classic View' : 'Read in Mobile View'}
                                                    </button>
                                                    <button onClick={() => generateOutline()} disabled={isGeneratingOutline} className={`px-6 py-4 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${isOutlineMode ? 'bg-black dark:bg-white text-white dark:text-black shadow-2xl scale-105' : 'bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100'}`}>
                                                        {isGeneratingOutline ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />} Outline
                                                    </button>
                                                    <button onClick={() => generateMindMap()} disabled={isGeneratingMindMap} className={`px-6 py-4 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${isMindMapMode ? 'bg-black dark:bg-white text-white dark:text-black shadow-2xl scale-105' : 'bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100'}`}>
                                                        {isGeneratingMindMap ? <Loader2 size={14} className="animate-spin" /> : <GitBranch size={14} />} Mind Map
                                                    </button>
                                                    <button onClick={() => toggleAudioNarrator()} disabled={isGeneratingAudio} className={`px-6 py-4 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${isAudioPlaying ? 'bg-black dark:bg-white text-white dark:text-black shadow-2xl scale-105' : 'bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100'}`}>
                                                        {isGeneratingAudio ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />} {isAudioPlaying ? 'Stop Audio' : 'Audio Brief'}
                                                    </button>
                                                </>
                                            )}
                                            {protocol === 'audit' && (
                                                <button onClick={() => runNeuralAudit()} disabled={isAuditing} className={`px-6 py-4 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all flex-shrink-0 whitespace-nowrap ${auditData ? 'bg-black dark:bg-white text-white dark:text-black shadow-2xl scale-105' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'} ${protocol === 'audit' && !auditData ? 'ring-2 ring-emerald-500 ring-offset-4 dark:ring-offset-black scale-105' : ''}`}>
                                                    {isAuditing ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />} {auditData ? 'Analysis Ready' : (protocol === 'audit' ? 'Neural Scan' : 'Neural Audit')}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="h-[1px] w-full bg-black/5 dark:bg-white/5" />
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-1.5 flex-1">
                                        <button onClick={goToPrevPage} disabled={pageNumber <= 1 || isFluidMode} className="p-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full disabled:opacity-10 transition-all"><ChevronLeft size={16} /></button>
                                        <span className="text-[9px] font-black uppercase tracking-tighter min-w-[50px] text-center">{isFluidMode ? "LIVE" : `${pageNumber} / ${numPages}`}</span>
                                        <button onClick={goToNextPage} disabled={pageNumber >= numPages || isFluidMode} className="p-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full disabled:opacity-10 transition-all"><ChevronRight size={16} /></button>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={zoomOut} disabled={isFluidMode} className="p-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full"><ZoomOut size={16} /></button>
                                        <button onClick={zoomIn} disabled={isFluidMode} className="p-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full"><ZoomIn size={16} /></button>
                                        <div className="w-[1px] h-6 bg-black/5 dark:bg-white/5 mx-1" />
                                        <button onClick={() => { setFile(null); resetAllStates(); }} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-full"><X size={18} /></button>
                                    </div>
                                </div>
                            </div>

                            <div className="monolith-card bg-gray-50 dark:bg-[#0a0a0a] border-none shadow-2xl p-0 overflow-hidden relative min-h-[600px]">
                                <AnimatePresence mode="wait">
                                    {isMindMapMode ? (
                                        <motion.div key="mindmap-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 p-8 flex flex-col">
                                            <div className="flex justify-between items-center mb-8">
                                                <div className="flex items-center gap-2"><GitBranch size={16} /><span className="text-[10px] font-black uppercase tracking-widest">AI Document Map</span></div>
                                                <div className="flex items-center gap-4">
                                                    <button onClick={() => setShowReport(true)} className="text-[9px] font-black uppercase tracking-widest text-rose-500 opacity-60 hover:opacity-100 transition-all"><Flag size={10} className="inline mr-2" />Report</button>
                                                    <button onClick={() => setIsMindMapMode(false)} className="text-[10px] font-black uppercase tracking-widest text-gray-400">Back</button>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-h-0">{isGeneratingMindMap ? <div className="h-full flex items-center justify-center"><Loader2 size={32} className="animate-spin opacity-20" /></div> : <MindMapComponent data={mindMapData} />}</div>
                                        </motion.div>
                                    ) : isOutlineMode ? (
                                        <motion.div key="outline-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 p-8 flex flex-col">
                                            <div className="flex justify-between items-center mb-8">
                                                <div className="flex items-center gap-2"><BookOpen size={16} /><span className="text-[10px] font-black uppercase tracking-widest">{protocol === 'briefing' ? 'Strategic Summary' : 'AI Outline'}</span></div>
                                                <div className="flex items-center gap-4">
                                                    <button onClick={() => handleShareSummary(outlineData || '', 'Outline')} className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded-full text-[10px] font-black text-emerald-500"><Share2 size={14} />Share</button>
                                                    <button onClick={() => setIsOutlineMode(false)} className="text-[10px] font-black uppercase tracking-widest text-gray-400">Back</button>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 bg-white dark:bg-white/5 rounded-[40px]">
                                                {isGeneratingOutline ? <div className="h-full flex items-center justify-center"><NeuralPulse color="bg-emerald-500" size="lg" /></div> : <div className="prose prose-sm dark:prose-invert max-w-none shadow-glow-emerald">{outlineData?.split('\n').map((line, i) => <p key={i} className="mb-2 text-xs font-bold uppercase">{line}</p>)}</div>}
                                            </div>
                                        </motion.div>
                                    ) : auditData ? (
                                        <motion.div key="audit-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 p-8 flex flex-col bg-emerald-500/5">
                                            <div className="flex justify-between items-center mb-8">
                                                <div className="flex items-center gap-2"><Shield size={16} className="text-emerald-500" /><span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Risk Analysis</span></div>
                                                <div className="flex items-center gap-4">
                                                    <button onClick={() => handleShareSummary(auditData, 'Audit')} className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded-full text-[10px] font-black text-emerald-600"><Share2 size={14} />Share</button>
                                                    <button onClick={() => setAuditData(null)} className="text-[10px] font-black uppercase tracking-widest text-gray-400">Back</button>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 bg-white dark:bg-[#0c0c0c] rounded-[40px] border border-emerald-500/10">
                                                <div className="prose prose-sm dark:prose-invert max-w-none">{auditData.split('\n').map((line, i) => <p key={i} className={`mb-2 text-xs font-bold ${line.startsWith('#') ? 'text-gray-900 dark:text-white border-b border-black/5 pb-2 mt-4' : line.startsWith('!') ? 'text-rose-600' : 'opacity-80'}`}>{line.replace(/^#+\s*/, '')}</p>)}</div>
                                            </div>
                                        </motion.div>
                                    ) : isFluidMode ? (
                                        <motion.div key="fluid-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 md:p-10 h-[70vh] md:h-[600px] overflow-y-auto custom-scrollbar relative">
                                            <div className="sticky top-0 right-0 flex justify-end pointer-events-none z-20"><div className="bg-black/80 dark:bg-white/90 px-4 py-2 rounded-full text-[9px] font-black text-white dark:text-black uppercase tracking-widest shadow-2xl flex items-center gap-2"><Activity size={10} className="text-emerald-400" />Page {pageNumber}</div></div>
                                            {fluidContent && fluidContent.trim() !== '' ? fluidContent.split('\n\n').map((para, i) => <p key={i} className="text-[14px] leading-relaxed mb-6 font-medium text-gray-800 dark:text-gray-200">{para.startsWith('[PAGE') ? <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-black/5 pt-8">{para}</span> : para}</p>) : <div className="flex flex-col items-center justify-center h-full opacity-60"><BookOpen size={48} className="mb-4 text-gray-400" /><p className="text-sm font-bold text-center uppercase tracking-widest">No Textual Content</p><button onClick={toggleFluidMode} className="mt-6 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl">Exit Mobile View</button></div>}
                                        </motion.div>
                                    ) : (
                                        <motion.div key="classic-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[600px] overflow-auto bg-gray-200 dark:bg-black/40 custom-scrollbar">
                                            <div className="p-8 min-h-full flex items-start justify-center">
                                                {docFile && (
                                                    <Document
                                                        file={docFile}
                                                        options={pdfOptions}
                                                        onLoadSuccess={(doc) => {
                                                            setNumPages(doc.numPages);
                                                            setPdfError(null);
                                                            setIsLoading(false);
                                                            console.log('Neural Link: Loading Success. Pages:', doc.numPages);
                                                        }}
                                                        onLoadError={(err: any) => {
                                                            console.error("PDF Load Error:", err);
                                                            const errMsg = err?.message || String(err);
                                                            // Attempt CDN Fallback if local loading fails and it's not an Invariant error
                                                            if (errMsg.includes('Worker') && !errMsg.includes('Invariant')) {
                                                                console.warn("Local worker failed. Attempting CDN fallback...");
                                                                // Note: We can't easily update workerSrc mid-render without refactoring
                                                                setPdfError("Worker Error: " + errMsg);
                                                            } else {
                                                                setPdfError("Protocol Sync Failure: " + errMsg);
                                                            }
                                                            setIsLoading(false);
                                                        }}
                                                        onSourceError={(err: any) => {
                                                            console.error("PDF Source Error:", err);
                                                            setPdfError("Source Conflict: " + (err?.message || String(err)));
                                                            setIsLoading(false);
                                                        }}
                                                        className="shadow-2xl border border-black/5 dark:border-white/5"
                                                        loading={<div className="w-96 h-[500px] bg-black/5 animate-pulse rounded-[40px] flex flex-col items-center justify-center gap-4">
                                                            <NeuralPulse color="bg-emerald-500" size="lg" />
                                                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Loading Neural Core...</div>
                                                        </div>}
                                                    >
                                                        <Page
                                                            pageNumber={pageNumber}
                                                            scale={scale}
                                                            renderTextLayer={true}
                                                            renderAnnotationLayer={true}
                                                            onRenderError={(err) => {
                                                                console.error("Page Render Error:", err);
                                                                setPdfError("Rendering stage failed.");
                                                            }}
                                                        />
                                                    </Document>
                                                )}
                                                {pdfError && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 dark:bg-black/90 p-10 text-center z-50 backdrop-blur-md">
                                                        <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6">
                                                            <X size={32} />
                                                        </div>
                                                        <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900 dark:text-white mb-2">Protocol Failure</h3>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-[280px] leading-relaxed">
                                                            {pdfError}
                                                        </p>
                                                        <button
                                                            onClick={() => setFile(null)}
                                                            className="mt-8 px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl transition-transform active:scale-95"
                                                        >
                                                            Try Another Document
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {(isGeneratingMindMap || isGeneratingAudio || isGeneratingOutline || isLoadingFluid) && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-4 right-4 z-50 pointer-events-none shadow-2xl"><div className="bg-black/80 dark:bg-white/90 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-3 border border-white/10"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[8px] font-black uppercase tracking-widest text-white dark:text-black">Neural Processing Active</span></div></motion.div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
            <NeuralCoolingUI isVisible={isCooling} onComplete={() => setIsCooling(false)} />
            <AIOptInModal isOpen={showConsent} onClose={() => setShowConsent(false)} onAccept={() => { localStorage.setItem('ai_neural_consent', 'true'); setHasConsent(true); setShowConsent(false); pendingAction?.(); setPendingAction(null); }} />
            <AIReportModal isOpen={showReport} onClose={() => setShowReport(false)} />
            <AiLimitModal isOpen={showAiLimit} onClose={() => setShowAiLimit(false)} blockMode={aiLimitInfo.blockMode} used={aiLimitInfo.used} limit={aiLimitInfo.limit} />
            <MindMapSettingsModal isOpen={showMindMapSettings} numPages={numPages} onClose={() => setShowMindMapSettings(false)} onConfirm={(s: any) => generateMindMap(s)} />
            <NeuralProtocolBrief isOpen={showBrief} onClose={() => setShowBrief(false)} type={briefType} />
            <BriefingSettingsModal isOpen={showBriefingSettings} onClose={() => setShowBriefingSettings(false)} numPages={numPages} onConfirm={(s: any) => toggleAudioNarrator(s)} />

            <AuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
                onSuccess={async () => {
                    const user = await getCurrentUser();
                    if (user) await initSubscription(user);

                    if (pendingAction) {
                        pendingAction();
                        setPendingAction(null);
                    }
                }}
            />
        </motion.div >
    );
};

export default ReaderScreen;
