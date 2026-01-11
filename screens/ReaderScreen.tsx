import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, BookOpen, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, X, Zap, ZapOff, Activity, Share2, Headphones, GitBranch, Play, Square, Loader2, Sparkles, Shield, Mic, Info } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { downloadFile } from '../services/downloadService';
import UpgradeModal from '../components/UpgradeModal';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { extractTextFromPdf } from '../utils/pdfExtractor';
import { canUseAI, recordAIUsage } from '../services/subscriptionService';
import MindMapComponent from '../components/MindMapComponent';
import { askGemini } from '../services/aiService';
import NeuralCoolingUI from '../components/NeuralCoolingUI';
import AIOptInModal from '../components/AIOptInModal';
import AIReportModal from '../components/AIReportModal';
import { Flag } from 'lucide-react';
import NeuralPulse from '../components/NeuralPulse';
import ToolGuide from '../components/ToolGuide';
import MindMapSettingsModal from '../components/MindMapSettingsModal';
import NeuralProtocolBrief from '../components/NeuralProtocolBrief';
import BriefingSettingsModal from '../components/BriefingSettingsModal';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

// Configure PDF.js worker - using CDN fallback for maximum reliability if local fails
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditData, setAuditData] = useState<string | null>(null);
    const [outlineData, setOutlineData] = useState<string | null>(null);
    const [isOutlineMode, setIsOutlineMode] = useState(false);
    const [showBrief, setShowBrief] = useState(false);
    const [briefType, setBriefType] = useState<'audit' | 'briefing' | 'reader'>('reader');
    const [showBriefingSettings, setShowBriefingSettings] = useState(false);
    const location = useLocation();

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
        try {
            TextToSpeech.stop().catch(() => { });
            window.speechSynthesis?.cancel();
        } catch (e) { }
    };

    const zoomIn = () => {
        setScale((prev) => Math.min(prev + 0.2, 3.0));
    };

    const zoomOut = () => {
        setScale((prev) => Math.max(prev - 0.2, 0.5));
    };

    // Handle Direct-Share Inbound
    useEffect(() => {
        const sharedFile = (location.state as any)?.sharedFile;
        if (sharedFile) {
            setFile(sharedFile);
            resetAllStates();
            // Clear state so it doesn't reload on every mount
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const toggleFluidMode = async () => {
        if (!file) return;

        if (isFluidMode) {
            setIsFluidMode(false);
            return;
        }

        if (!fluidContent) {
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
        setIsFluidMode(true);
        setIsMindMapMode(false);
        setIsOutlineMode(false);
        setAuditData(null);
    };

    const generateMindMap = async (settings?: { range: string; focus: string }) => {
        if (!file || isGeneratingMindMap) return;

        if (!hasConsent) {
            setPendingAction(() => () => generateMindMap(settings));
            setShowConsent(true);
            return;
        }

        const aiCheck = canUseAI();
        if (!aiCheck.allowed) {
            setShowUpgradeModal(true);
            return;
        }

        if (isMindMapMode && !settings) {
            setIsMindMapMode(false);
            return;
        }

        if (!settings && !mindMapData) {
            setShowMindMapSettings(true);
            return;
        }

        setIsMindMapMode(true);
        setIsFluidMode(false);
        setIsOutlineMode(false);
        setAuditData(null);

        if (mindMapData && !settings) return;

        setShowMindMapSettings(false);
        setIsGeneratingMindMap(true);
        try {
            let text = "";
            let startPage = 1;
            let endPage = numPages; // Default to all pages

            if (settings?.range) {
                const parts = settings.range.split('-').map(p => parseInt(p.trim()));
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    startPage = Math.max(1, parts[0]);
                    endPage = Math.min(parts[1], numPages);
                } else if (parts.length === 1 && !isNaN(parts[0])) {
                    startPage = Math.max(1, parts[0]);
                    endPage = Math.min(parts[0] + 9, numPages); // Default to 10 pages from start
                }
            }

            const buffer = await file.arrayBuffer();
            text = await extractTextFromPdf(buffer, startPage, endPage);

            const prompt = `Perform a high-fidelity Neural Mind Map Synthesis. 
            Target Range: Pages ${startPage} to ${endPage}.
            Strategic Focus: ${settings?.focus || "Core document architecture and key thematic pillars"}.
            
            STRUCTURE RULES:
            - Root: The absolute central concept (MAX 1).
            - Level 1: Primary strategic pillars (MAX 5).
            - Level 2: Critical evidentiary sub-nodes (MAX 3 per pillar).
            - LABEL LIMIT: Each node MUST be 1-2 words maximum. No sentences. Use punchy, nouns/verbs.
            
            OUTPUT FORMAT:
            A simple indented list using dashes (-). No bolding, no extra text, no symbols except dashes for hierarchy.
            
            Example:
            Artificial Intelligence
            - Neural Networks
              - Backpropagation
              - Training Sets
            - Machine Learning
            `;

            const response = await askGemini(prompt, text, "mindmap");
            if (response.startsWith('AI_RATE_LIMIT')) {
                setIsCooling(true);
                setMindMapData('');
                return;
            }
            setMindMapData(response);
            await recordAIUsage();
        } catch (error) {
            console.error("Mind Map Generation Failed:", error);
        } finally {
            setIsGeneratingMindMap(false);
        }
    };

    const toggleAudioNarrator = async (settings?: { range: string; focus: string }) => {
        if (isAudioPlaying) {
            try {
                await TextToSpeech.stop();
            } catch (e) {
                window.speechSynthesis?.cancel();
            }
            setIsAudioPlaying(false);
            return;
        }

        if (!hasConsent) {
            setPendingAction(() => () => toggleAudioNarrator(settings));
            setShowConsent(true);
            return;
        }


        const aiCheck = canUseAI();
        if (!aiCheck.allowed) {
            setShowUpgradeModal(true);
            return;
        }

        if (audioScript && !settings) {
            startSpeaking(audioScript);
            return;
        }

        if (!settings && numPages > 1) {
            setShowBriefingSettings(true);
            return;
        }

        setShowBriefingSettings(false);
        setIsGeneratingAudio(true);
        try {
            let text = "";
            let startPage = 1;
            let endPage = numPages;

            if (settings?.range) {
                const parts = settings.range.split('-').map(p => parseInt(p.trim()));
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    startPage = Math.max(1, parts[0]);
                    endPage = Math.min(parts[1], numPages);
                }
            }

            const buffer = await file.arrayBuffer();
            text = await extractTextFromPdf(buffer, startPage, endPage);

            const prompt = `Convert this high-stakes intelligence context into a professional podcast script.
            Target Range: ${settings?.range || "Full Document"}.
            Focus: ${settings?.focus || "Strategic summary and key structural insights"}.
            
            ROLE: Act as a professional intelligence host. Providing a high-end strategic download.
            TONE: Elite, objective, clear.
            
            RULES:
            - START DIRECTLY with 'Welcome to Anti-Gravity.'
            - Focus on clarity and narrative flow.
            - NO markdown symbols, NO asterisks, NO formatting characters.
            - Length: Optimized for a 2-3 minute briefing.
            `;

            const response = await askGemini(prompt, text, "audio_script");

            if (response.startsWith('AI_RATE_LIMIT')) {
                setIsCooling(true);
                return;
            }

            if (response.startsWith('AI_ERROR') || response.startsWith('BACKEND_ERROR')) {
                console.error("Audio Generation AI Error:", response);
                return;
            }

            setAudioScript(response);
            await recordAIUsage();
            startSpeaking(response);
        } catch (error) {
            console.error("Audio Generation Failed:", error);
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const startSpeaking = async (text: string) => {
        try {
            await TextToSpeech.stop();
        } catch (e) { }
        window.speechSynthesis?.cancel();

        // Sanitize text: Remove markdown symbols (*, #, _, etc.)
        let sanitizedText = text
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/#/g, '')
            .replace(/__/g, '')
            .replace(/_/g, '')
            .trim();

        if (!sanitizedText.toLowerCase().startsWith("welcome to anti-gravity")) {
            sanitizedText = "Welcome to Anti-Gravity. " + sanitizedText;
        }

        setIsAudioPlaying(true);

        try {
            // Attempt Native Hardware Synthesis first (for Android/iOS/Mac)
            const nativeVoices = await TextToSpeech.getSupportedVoices();
            // let selectedNativeVoice = '';

            const selectedNativeVoice = nativeVoices.voices.find(v =>
                v.name.toLowerCase().includes('female') ||
                v.name.toLowerCase().includes('samantha') ||
                v.name.toLowerCase().includes('zira') ||
                v.name.toLowerCase().includes('karen') ||
                v.name.toLowerCase().includes('moira') ||
                v.name.toLowerCase().includes('tessa') ||
                v.name.toLowerCase().includes('susan') ||
                (v.name.toLowerCase().includes('google') && v.lang.includes('en-US') && !v.name.toLowerCase().includes('male'))
            )?.name || '';

            const voiceIndex = nativeVoices.voices.findIndex(v => v.name === selectedNativeVoice);

            await TextToSpeech.speak({
                text: sanitizedText,
                lang: 'en-US',
                rate: 1.0,
                pitch: 1.05,
                volume: 1.0,
                voice: voiceIndex !== -1 ? voiceIndex : undefined,
                category: 'ambient',
            });
            setIsAudioPlaying(false);
        } catch (err) {
            console.log("Native TTS failed or not present, falling back to browser engine.");

            // Browser Fallback (Legacy/Desktop)
            const chunks = sanitizedText.match(/[^.!?]+[.!?]+/g) || [sanitizedText];
            let currentChunk = 0;

            const speakNextChunk = () => {
                if (currentChunk >= chunks.length) {
                    setIsAudioPlaying(false);
                    return;
                }

                const UtteranceClass = (window as any).SpeechSynthesisUtterance ||
                    (window as any).webkitSpeechSynthesisUtterance ||
                    (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);

                if (!UtteranceClass) {
                    console.error("No Speech synthesis engine available on this device.");
                    setIsAudioPlaying(false);
                    return;
                }

                const utterance = new UtteranceClass(chunks[currentChunk].trim());
                utterance.rate = 1.0;
                utterance.pitch = 1.05;

                const browserVoices = window.speechSynthesis.getVoices();
                utterance.voice = browserVoices.find(v =>
                    v.name.toLowerCase().includes('female') ||
                    v.name.toLowerCase().includes('samantha') ||
                    v.name.toLowerCase().includes('zira') ||
                    v.name.toLowerCase().includes('karen') ||
                    v.name.toLowerCase().includes('moira') ||
                    v.name.toLowerCase().includes('tessa') ||
                    (v.name.toLowerCase().includes('google') && v.lang.includes('en-US') && !v.name.toLowerCase().includes('male'))
                ) || null;

                utterance.onend = () => {
                    currentChunk++;
                    speakNextChunk();
                };

                utterance.onerror = (e: any) => {
                    setIsAudioPlaying(false);
                    window.speechSynthesis?.cancel();
                };

                if (window.speechSynthesis) {
                    window.speechSynthesis.speak(utterance);
                } else {
                    setIsAudioPlaying(false);
                }
            };
            speakNextChunk();
        }
    };


    const generateOutline = async () => {
        if (!file || isGeneratingOutline) return;

        if (isOutlineMode) {
            setIsOutlineMode(false);
            return;
        }

        if (!hasConsent) {
            setPendingAction(() => generateOutline);
            setShowConsent(true);
            return;
        }


        const aiCheck = canUseAI();
        if (!aiCheck.allowed) {
            setShowUpgradeModal(true);
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
            if (!text) {
                const buffer = await file.arrayBuffer();
                text = await extractTextFromPdf(buffer);
                setFluidContent(text);
            }
            const isBriefing = protocol === 'briefing';
            const contextPrompt = isBriefing
                ? "Synthesize this document into a high-fidelity Strategic Executive Summary. Focus on macro-level insights, key architectural decisions, and the 'bottom line' for an elite decision-maker. Output as markdown."
                : "Synthesize this document into a professional, high-fidelity executive outline. Use clear headings and bullet points. Focus on key decisions, findings, and actionable data. Output as markdown.";

            const response = await askGemini(contextPrompt, text, "outline");
            if (response.startsWith('AI_RATE_LIMIT')) {
                setIsCooling(true);
                return;
            }
            setOutlineData(response);
            await recordAIUsage();
        } catch (error) {
            console.error("Outline Generation Failed:", error);
        } finally {
            setIsGeneratingOutline(false);
        }
    };

    const runNeuralAudit = async () => {
        if (!file || isAuditing) return;

        if (!hasConsent) {
            setPendingAction(() => runNeuralAudit);
            setShowConsent(true);
            return;
        }


        const aiCheck = canUseAI();
        if (!aiCheck.allowed) {
            setShowUpgradeModal(true);
            return;
        }

        setIsAuditing(true);
        setIsOutlineMode(false);
        setIsMindMapMode(false);
        setIsFluidMode(false);

        try {
            let text = fluidContent;
            if (!text) {
                const buffer = await file.arrayBuffer();
                text = await extractTextFromPdf(buffer);
                setFluidContent(text);
            }
            const response = await askGemini(`
Perform a high-level Neural Audit of this high-stakes document. 
Identify hidden risks, financial discrepancies, and legal exposure. 

REPORT STRUCTURE:
1. ### [SCOPE OF ANALYSIS]
   - List exactly what parameters were scanned (e.g., Clause Consistency, Mathematical Accuracy, Termination Risks).
2. ### [CRITICAL FINDINGS]
   - Flag high-risk items with a "!" prefix.
3. ### [STRATEGIC OPPORTUNITIES]
   - Suggest potential savings or logic improvements.

Be direct and objective. Use a professional technical tone. Output as markdown.`, text, "redact");
            if (response.startsWith('AI_RATE_LIMIT')) {
                setIsCooling(true);
                return;
            }
            setAuditData(response);
            await recordAIUsage();
        } catch (error) {
            console.error("Audit Failed:", error);
        } finally {
            setIsAuditing(false);
        }
    };

    const handleShareSummary = async (content: string, type: string) => {
        if (!content) return;
        const fileName = `${type.toLowerCase()}_${Date.now()}.txt`;
        const blob = new Blob([content], { type: 'text/plain' });
        await downloadFile(blob, fileName);
    };

    useEffect(() => {
        // Neural Warmup: Initialize voices for mobile browsers
        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices();
        }
        return () => {
            window.speechSynthesis?.cancel();
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

                <div className="space-y-8">
                    {/* Protocol Guidance Layer */}
                    {(protocol || file) && (
                        <ToolGuide
                            title={
                                protocol === 'briefing' ? "Intelligence Briefing Protocol" :
                                    protocol === 'audit' ? "Neural Audit Protocol" :
                                        "Secure Reader Protocol"
                            }
                            description={
                                protocol === 'briefing' ? "Convert complex documents into strategic high-end audio downloads. ACTIVATE the headset mode for hands-free intake." :
                                    protocol === 'audit' ? "Deep-layer structural investigation. Identify risks, financial discrepancies, and strategic savings." :
                                        "High-fidelity sequential data interpretation. Optimized for deep focus and long-form document absorption."
                            }
                            steps={
                                protocol === 'briefing' ? [
                                    "Initialize the operational context by uploading a PDF carrier.",
                                    "System extracts high-fidelity lexical streams from the document.",
                                    "Execute Synthesis to generate a strategic Intelligence Briefing podcast.",
                                    "Stream or download the audio payload for elite mobile intake."
                                ] : protocol === 'audit' ? [
                                    "Initialize the operational context by uploading a PDF carrier.",
                                    "Run Neural Audit to perform a deep-layer risk assessment.",
                                    "AI identifies critical discrepancies, savings, and legal exposure.",
                                    "Synthesize a comprehensive Risk Analysis report."
                                ] : [
                                    "Initialize the operational context by uploading a PDF carrier.",
                                    "Configure visual parameters (Zoom, Fluid Mode) for optimal intake.",
                                    "Use Neural Mind Mapping to project document architecture.",
                                    "Engage with the document via High-Fidelity sequential rendering."
                                ]
                            }
                            useCases={
                                protocol === 'briefing' ? [
                                    "Commuter Consumption", "Rapid Executive Briefing", "Mobile Data Sync", "Auditory Learning"
                                ] : protocol === 'audit' ? [
                                    "Legal Compliance", "Financial Auditing", "Due Diligence", "Investment Analysis"
                                ] : [
                                    "Deep Reading", "Technical Review", "Knowledge Acquisition", "Asset Verification"
                                ]
                            }
                        />
                    )}

                    {!file ? (
                        <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
                            <motion.div
                                whileHover={{ scale: 1.1, y: -5 }}
                                className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-2xl mb-6"
                            >
                                <BookOpen size={32} />
                            </motion.div>
                            <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">
                                {protocol === 'audit' ? "Inject Audit Payload" :
                                    protocol === 'briefing' ? "Inject Briefing Payload" :
                                        "Initialize Reader"}
                            </span>
                            <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                        </label>
                    ) : (
                        <>
                            {/* Optimized 2-Tier Control Hub */}
                            <div className="monolith-card p-4 space-y-4 shadow-xl border-none">
                                {protocol === 'audit' && (
                                    <div className="flex items-center gap-2">
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={runNeuralAudit}
                                            className={`flex items-center justify-center gap-3 px-4 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all flex-1 border-2 ${auditData || isAuditing
                                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-xl'
                                                : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10'
                                                }`}
                                        >
                                            <Shield size={16} fill={isAuditing ? "currentColor" : "none"} />
                                            {isAuditing ? "Synthesizing Risk Map" : "Neural Audit Protocol"}
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                setBriefType('audit');
                                                setShowBrief(true);
                                            }}
                                            className="p-4 rounded-full bg-emerald-500/5 border-2 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 transition-all"
                                        >
                                            <Info size={16} />
                                        </motion.button>
                                    </div>
                                )}

                                {protocol === 'briefing' && (
                                    <div className="flex flex-col gap-2 flex-1">
                                        <div className="flex items-center gap-2">
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => toggleAudioNarrator()}
                                                className={`flex items-center justify-center gap-3 px-4 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all flex-1 border-2 ${isAudioPlaying
                                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-xl'
                                                    : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-600 hover:bg-indigo-500/10'
                                                    }`}
                                            >
                                                {isGeneratingAudio ? <Loader2 size={16} className="animate-spin" /> : isAudioPlaying ? <Square size={16} fill="currentColor" /> : <Headphones size={16} />}
                                                {isAudioPlaying ? "Halt Intake" : "Execute Briefing Podcast"}
                                            </motion.button>
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => {
                                                    setBriefType('briefing');
                                                    setShowBrief(true);
                                                }}
                                                className="p-4 rounded-full bg-indigo-500/5 border-2 border-indigo-500/20 text-indigo-600 hover:bg-indigo-500/10 transition-all"
                                            >
                                                <Info size={16} />
                                            </motion.button>
                                        </div>
                                    </div>
                                )}
                                {/* Tier 1: Neural & AI Intelligence Tools */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={toggleFluidMode}
                                        className={`flex items-center justify-center gap-3 px-4 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex-1 ${isFluidMode
                                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl neural-glow'
                                            : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        <Zap size={14} fill={isFluidMode ? "currentColor" : "none"} />
                                        {isFluidMode ? "Neural Reflow" : "Fluid Mode"}
                                    </motion.button>

                                    <div className="flex gap-2 flex-1 min-w-[200px]">
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={generateOutline}
                                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex-1 ${isOutlineMode
                                                ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl'
                                                : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'
                                                }`}
                                        >
                                            <BookOpen size={14} />
                                            {isGeneratingOutline ? "Thinking" : (protocol === 'briefing' ? "Summary" : "Outline")}
                                        </motion.button>

                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => generateMindMap()}
                                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex-1 ${isMindMapMode
                                                ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl neural-glow'
                                                : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'
                                                }`}
                                        >
                                            <GitBranch size={14} />
                                            {isGeneratingMindMap ? "Projecting" : "Mind Map"}
                                        </motion.button>
                                    </div>
                                </div>

                                {/* Divider Line */}
                                <div className="h-[1px] w-full bg-black/5 dark:bg-white/5" />

                                {/* Tier 2: Core Navigation & Utility */}
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-1.5 flex-1">
                                        <button
                                            onClick={goToPrevPage}
                                            disabled={pageNumber <= 1 || isFluidMode}
                                            className="p-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full disabled:opacity-10 transition-all font-black text-[12px]"
                                        >
                                            <ChevronLeft size={16} className="text-gray-900 dark:text-white" />
                                        </button>
                                        <span className="text-[9px] font-black uppercase tracking-tighter text-gray-900 dark:text-white min-w-[50px] text-center opacity-80">
                                            {isFluidMode ? "LIVE" : `${pageNumber} / ${numPages}`}
                                        </span>
                                        <button
                                            onClick={goToNextPage}
                                            disabled={pageNumber >= numPages || isFluidMode}
                                            className="p-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full disabled:opacity-10 transition-all font-black text-[12px]"
                                        >
                                            <ChevronRight size={16} className="text-gray-900 dark:text-white" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={zoomOut}
                                                disabled={scale <= 0.5 || isFluidMode}
                                                className="p-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full disabled:opacity-10 transition-all"
                                            >
                                                <ZoomOut size={16} className="text-gray-900 dark:text-white" />
                                            </button>
                                            <button
                                                onClick={zoomIn}
                                                disabled={scale >= 3.0 || isFluidMode}
                                                className="p-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full disabled:opacity-10 transition-all"
                                            >
                                                <ZoomIn size={16} className="text-gray-900 dark:text-white" />
                                            </button>
                                        </div>

                                        <div className="w-[1px] h-6 bg-black/5 dark:bg-white/5 mx-1" />

                                        <button
                                            onClick={() => {
                                                setFile(null);
                                                resetAllStates();
                                            }}
                                            className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
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
                                    ) : isOutlineMode ? (
                                        <motion.div
                                            key="outline-view"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 p-8 flex flex-col"
                                        >
                                            <div className="flex justify-between items-center mb-8">
                                                <div className="flex items-center gap-2">
                                                    <BookOpen size={16} className="text-black dark:text-white" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black dark:text-white">
                                                        {protocol === 'briefing' ? "Strategic Executive Summary" : "Neural Executive Outline"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => handleShareSummary(outlineData || '', protocol === 'briefing' ? 'Summary' : 'Outline')}
                                                        className="flex items-center gap-1.5 p-2 bg-black/5 dark:bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10 transition-all"
                                                        title="Share Summary"
                                                    >
                                                        <Share2 size={14} />
                                                        Share
                                                    </button>
                                                    <button
                                                        onClick={() => setIsOutlineMode(false)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white"
                                                    >
                                                        Back to Reader
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 bg-white dark:bg-white/5 rounded-[40px] border border-black/5 dark:border-white/5 relative">
                                                {isGeneratingOutline ? (
                                                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                                                        <div className="relative">
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <NeuralPulse color="bg-emerald-500" size="lg" />
                                                            </div>
                                                            <motion.div
                                                                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                                                                transition={{ repeat: Infinity, duration: 2 }}
                                                                className="absolute inset-0 bg-emerald-500 rounded-full blur-xl"
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 animate-pulse">On-Device Neural Processing active...</span>
                                                    </div>
                                                ) : (
                                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                                        {outlineData?.split('\n').map((line, i) => (
                                                            <p key={i} className="mb-2 text-xs font-bold uppercase tracking-tight opacity-80">{line}</p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ) : auditData ? (
                                        <motion.div
                                            key="audit-view"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 p-8 flex flex-col bg-emerald-500/5"
                                        >
                                            <div className="flex justify-between items-center mb-8">
                                                <div className="flex items-center gap-2">
                                                    <Shield size={16} className="text-emerald-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Neural Risk Analysis Report</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => handleShareSummary(auditData || '', 'Audit')}
                                                        className="flex items-center gap-1.5 p-2 bg-emerald-500/10 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-500/20 transition-all"
                                                        title="Share Audit Report"
                                                    >
                                                        <Share2 size={14} />
                                                        Share
                                                    </button>
                                                    <button
                                                        onClick={() => setAuditData(null)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black dark:hover:text-white"
                                                    >
                                                        Back to Reader
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 bg-white dark:bg-[#0c0c0c] rounded-[40px] border border-emerald-500/10">
                                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                                    {auditData.split('\n').map((line, i) => {
                                                        const isHeader = line.startsWith('#');
                                                        const isRisk = line.startsWith('!') || line.toLowerCase().includes('risk');
                                                        return (
                                                            <p key={i} className={`
                                                                mb-2 text-xs font-bold tracking-tight
                                                                ${isHeader ? 'text-gray-900 dark:text-white border-b border-black/5 dark:border-white/5 pb-1 mt-4' : 'opacity-80'}
                                                                ${isRisk ? 'text-rose-600 dark:text-rose-500' : ''}
                                                            `}>
                                                                {line.replace(/^#+\s*/, '')}
                                                            </p>
                                                        );
                                                    })}
                                                </div>
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
                                                        loading={<div className="w-96 h-[500px] bg-black/5 dark:bg-white/5 animate-pulse rounded-[40px]" />}
                                                    />
                                                </Document>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Instant Pulse UI Overlay (shows when ANY AI action is running) */}
                                {(isGeneratingMindMap || isGeneratingAudio || isGeneratingOutline || isLoadingFluid) && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute bottom-4 right-4 z-50 pointer-events-none"
                                    >
                                        <div className="bg-black/80 dark:bg-white/90 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-3 shadow-2xl border border-white/10">
                                            <div className="relative">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute inset-0" />
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 relative z-10" />
                                            </div>
                                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white dark:text-black">
                                                LOCAL NEURAL SYNC
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </>
                    )}
                </div>
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

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
            />
            <MindMapSettingsModal
                isOpen={showMindMapSettings}
                numPages={numPages}
                onClose={() => setShowMindMapSettings(false)}
                onConfirm={(settings) => generateMindMap(settings)}
            />
            <NeuralProtocolBrief
                isOpen={showBrief}
                onClose={() => setShowBrief(false)}
                type={briefType}
            />
            <BriefingSettingsModal
                isOpen={showBriefingSettings}
                onClose={() => setShowBriefingSettings(false)}
                numPages={numPages}
                onConfirm={(settings: any) => toggleAudioNarrator(settings)}
            />
        </motion.div >
    );
};

export default ReaderScreen;
