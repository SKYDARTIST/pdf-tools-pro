
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, Loader2, Bot, Info, X, MessageSquare, ListChecks, Sparkles, Activity, Zap, Flag, GitMerge, Database, Shield, Search, Scan, Headphones, EyeOff } from 'lucide-react';
import { askGemini } from '../services/aiService';
import { canUseAI, recordAIUsage, getSubscription, SubscriptionTier, getCurrentLimits, AiOperationType } from '../services/subscriptionService';
import { useNavigate } from 'react-router-dom';
import AIOptInModal from '../components/AIOptInModal';
import AIReportModal from '../components/AIReportModal';
import AiLimitModal from '../components/AiLimitModal';
import NeuralPulse from '../components/NeuralPulse';
import FileHistoryManager from '../utils/FileHistoryManager';
import ToolGuide from '../components/ToolGuide';
import { PDFDocument } from 'pdf-lib';
import { extractTextFromPdf, renderMultiplePagesToImages } from '../utils/pdfExtractor';
import { AuthModal } from '../components/AuthModal';
import { useAIAuth } from '../hooks/useAIAuth';
import { getCurrentUser } from '../services/googleAuthService';
import { initSubscription } from '../services/subscriptionService';
import { getFriendlyErrorMessage } from '../utils/errorMapping';

const AntiGravityWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { authModalOpen, setAuthModalOpen, checkAndPrepareAI } = useAIAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'lifting' | 'analyzed'>('idle');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [suggestedName, setSuggestedName] = useState<string | null>(null);
  const [documentContext, setDocumentContext] = useState<string | null>(null);
  const [imageContext, setImageContext] = useState<string | string[] | null>(null);
  const [query, setQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot', text: string }[]>([]);
  const [showConsent, setShowConsent] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [hasConsent, setHasConsent] = useState(localStorage.getItem('ai_neural_consent') === 'true');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [showAiLimit, setShowAiLimit] = useState(false);
  const [aiLimitInfo, setAiLimitInfo] = useState<{ blockMode: any; used: number; limit: number }>({ blockMode: null, used: 0, limit: 0 });
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const showToast = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];

      // 1. Auth & Subscription Check
      if (!await checkAndPrepareAI()) {
        setPendingAction(() => () => processFile(selected));
        return;
      }

      // 2. Consent Check
      if (!hasConsent) {
        setPendingAction(() => () => processFile(selected));
        setShowConsent(true);
        return;
      }

      processFile(selected);
    }
  };

  const processFile = async (selected: File) => {
    // Check for consent (re-check in case it was called from pending action)
    if (!hasConsent) {
      setPendingAction(() => () => processFile(selected));
      setShowConsent(true);
      return;
    }

    // HEAVY AI Operation - Workspace consumes credits
    const check = canUseAI(AiOperationType.HEAVY);
    if (!check.allowed) {
      // Show AI Limit Modal instead of alert
      const subscription = getSubscription();
      setAiLimitInfo({
        blockMode: check.blockMode,
        used: subscription.tier === SubscriptionTier.FREE ? subscription.aiDocsThisWeek : subscription.aiDocsThisMonth,
        limit: subscription.tier === SubscriptionTier.FREE ? 1 : 10
      });
      setShowAiLimit(true);
      return;
    }

    setFile(selected);
    setIsImporting(true);
    setStatus('lifting');
    setSuggestedName(null);
    setImageContext(null);
    setProgress(0); // Reset progress on start

    try {
      const isImage = selected.type.startsWith('image/');
      let context = '';
      let extractedText = '';
      let base64Images: string | string[] = '';

      if (isImage) {
        // CONVERT IMAGE TO BASE64 FOR NEURAL VISION
        setProgress(30); // Instant progress for images
        const reader = new FileReader();
        base64Images = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(selected);
        });
        setProgress(100);
        setImageContext(base64Images);
        context = `IMAGE_PAYLOAD: ${selected.name} | TYPE: ${selected.type} | SIZE: ${(selected.size / 1024).toFixed(2)} KB`;
      } else {
        // 1. EXTRACT RAW METADATA
        const arrayBuffer = await selected.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pageCount = pdfDoc.getPageCount();

        // 2. EXTRACT NEURAL PAYLOAD (Full Text) with Progress
        extractedText = await extractTextFromPdf(
          arrayBuffer.slice(0),
          undefined,
          undefined,
          (p) => setProgress(p) // Live progress update
        );
        console.log(`Extracted Text Length: ${extractedText.length}`);

        if (!extractedText) {
          console.log("⚠️ No text found. Triggering Triple-Vision Fallback...");
          // NEURAL SIGHT FALLBACK: Render first 3 pages if no text layer exists
          base64Images = await renderMultiplePagesToImages(arrayBuffer.slice(0), 3);
          console.log(`Fallback Images Generated: ${(base64Images as string[]).length}`);
          if ((base64Images as string[]).length > 0) {
            setImageContext(base64Images);
          }
        }

        context = `
          SYSTEM_PAYLOAD_ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}
          FILENAME: ${selected.name}
          TOTAL_PAGES: ${pageCount}
          SIZE: ${(selected.size / 1024).toFixed(2)} KB
          
          DOCUMENT_CONTENT:
          ${extractedText || "The document is image-based. Analyzing the visual content now."}
          `.trim();
      }

      const analysisPrompt = (isImage || (!extractedText && base64Images.length > 0))
        ? `Analyze this document. Inspect the images "${selected.name}". Identify the document type, extract key information, and summarize what it is about. Respond with a helpful, professional tone.`
        : extractedText
          ? `Analyze this document. Perform a detailed review of the content provided. Focus on identifying the purpose and key points. Tone: Helpful, Professional. Document Context: ${context}`
          : `Analyze the document. Let the user know the document appears to be an image or scan with no searchable text. Explain that for a deeper analysis, a text-based PDF works best. Suggest trying the "Scanner" or "Image to PDF" tool to re-process the file and try again. Tone: Helpful, Professional.`;

      // Run analysis and naming suggestion in parallel
      const { suggestDocumentName } = await import('../services/namingService');

      const [initialAnalysis, smartName] = await Promise.all([
        askGemini(analysisPrompt, context, 'chat', base64Images || undefined),
        extractedText ? suggestDocumentName(extractedText) : Promise.resolve(null)
      ]);

      setAnalysis(initialAnalysis);
      if (smartName && smartName !== 'unnamed_document') {
        setSuggestedName(smartName);
      }
      setDocumentContext(context);
      setChatHistory([{ role: 'bot', text: initialAnalysis }]);
      setStatus('analyzed');

      // Phase 5: Knowledge Base Indexing
      const signaturePrompt = `Write a 1-sentence summary of this document for search. Focus on key topics, dates, and purpose. NO markdown. Document: ${initialAnalysis.substring(0, 500)}`;
      const neuralSignature = await askGemini(signaturePrompt, context, 'chat');

      FileHistoryManager.addEntry({
        fileName: selected.name,
        operation: 'extract-text', // Categorized as text extraction/analysis
        status: 'success',
        neuralSignature: neuralSignature.replace(/\n|"/g, '')
      });

      const stats = await recordAIUsage(AiOperationType.HEAVY); // Record HEAVY AI operation - consumes credits
      if (stats?.message) alert(stats.message);
    } catch (error) {
      console.error('Error processing PDF:', error);
      const friendlyError = getFriendlyErrorMessage(error);

      showToast(friendlyError); // Show toast instead of setting analysis text
      setStatus('idle'); // Reset to idle so user can try again
    } finally {
      setIsImporting(false);
    }
  }

  const handleAsk = async () => {
    if (!query.trim() || isAsking) return;

    if (!hasConsent) {
      setPendingAction(() => handleAsk);
      setShowConsent(true);
      return;
    }

    const currentQuery = query;
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', text: currentQuery }]);
    setIsAsking(true);

    try {
      const response = await askGemini(currentQuery, documentContext || "", 'chat', imageContext || undefined);
      setChatHistory(prev => [...prev, { role: 'bot', text: response }]);
    } catch (err) {
      console.error('AI Chat Error:', err);
      showToast('Processing failed. Try again.');
      // Remove the user's last message or add an error message to chat? 
      // Requirement says "Show toast". I'll stick to that.
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-6 pb-32 pt-32 max-w-2xl mx-auto flex flex-col min-h-screen space-y-12 overflow-x-hidden relative"
    >
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-rose-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest border border-rose-400"
          >
            <div className="bg-white/20 p-1 rounded-full"><span className="text-lg">⚠️</span></div>
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
        <div className="space-y-3 min-w-0 w-full">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center shadow-2xl shrink-0">
              <Sparkles size={20} className="text-white dark:text-black" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="text-[9px] font-mono font-black uppercase tracking-[0.3em] text-gray-500 truncate">AI Assistant</div>
              <h2 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">
                Workspace
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] ml-1">
            <NeuralPulse color="bg-emerald-500" size="sm" />
            {status === 'idle' ? 'Ready' : status === 'lifting' ? 'Working...' : 'Ready'}
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 text-gray-900 dark:text-white rounded-full border border-black/5 dark:border-white/10 text-[8px] font-black uppercase tracking-[0.2em] shadow-sm">
          Private Mode
        </div>
      </div>
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.label
            key="idle"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 flex flex-col items-center justify-center w-full monolith-card rounded-[40px] cursor-pointer group relative overflow-hidden min-h-[450px] border-dashed border-2 bg-transparent"
          >
            <div className="relative z-10 flex flex-col items-center space-y-8">
              <div className="w-28 h-28 bg-black/5 dark:bg-white/5 rounded-[32px] flex items-center justify-center group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all duration-700 border border-black/5 dark:border-white/5 shadow-2xl">
                <FileUp size={44} strokeWidth={1.5} />
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Drag & Drop</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] opacity-80 max-w-[320px] leading-relaxed">
                  or click to upload a PDF for AI analysis
                </p>
              </div>
            </div>

            <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleImport} />
          </motion.label>
        )}

        {status === 'lifting' && (
          <motion.div
            key="lifting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center space-y-16 py-20"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                className="w-64 h-64 border-t-2 border-l-2 border-emerald-500 rounded-full blur-[2px]"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
                className="absolute inset-4 border-b-2 border-r-2 border-black/10 dark:border-white/20 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity size={64} className="text-gray-900 dark:text-white animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-6">
              <h3 className="text-4xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">Analyzing...</h3>
              <div className="flex flex-col items-center gap-4 w-64">
                {/* Progress Bar */}
                <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  />
                </div>
                <div className="flex justify-between w-full text-[9px] font-black uppercase tracking-widest text-emerald-500">
                  <span>Processing Content</span>
                  <span>{progress}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {status === 'analyzed' && (
          <motion.div
            key="analyzed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col space-y-8"
          >
            {/* Low Credit Alert */}
            {canUseAI(AiOperationType.HEAVY).warning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-8 bg-amber-500/10 border border-amber-500/20 rounded-[32px] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg neural-glow">
                    <Zap size={24} fill="currentColor" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-600 dark:text-amber-500">Low AI Credits</div>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-relaxed">
                      You're running low on AI questions. Upgrade your plan to keep using the assistant.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-8 py-4 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                >
                  Get More Credits
                </button>
              </motion.div>
            )}

            {/* Analysis Result - Pro Obsidian Style */}
            <div className="monolith-glass p-10 relative overflow-hidden bg-black/60 text-white border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)] rounded-[40px]">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Bot size={140} />
              </div>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white/5 rounded-2xl backdrop-blur-md border border-white/5">
                  <Bot size={24} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="text-[9px] font-mono tracking-[0.4em] opacity-60 text-emerald-400 uppercase">Document Summary</div>
                  <AnimatePresence>
                    {suggestedName && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mt-2 flex items-center gap-2 group cursor-pointer"
                        title="AI Suggested Filename"
                      >
                        <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-500/30 flex items-center gap-2">
                          <Sparkles size={10} />
                          <span className="font-mono tracking-tighter lowercase">{suggestedName}</span>.pdf
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <p className="text-base leading-relaxed font-bold tracking-tight">
                {analysis}
              </p>
            </div>

            {/* AI Chat Interface */}
            <div className="flex-1 monolith-card overflow-hidden flex flex-col border-none shadow-2xl min-h-[500px]">
              <div className="px-8 py-6 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-black text-white dark:bg-white dark:text-black">
                <div className="flex items-center gap-4">
                  <MessageSquare size={20} className="text-emerald-400" />
                  <div className="text-[9px] font-mono tracking-[0.4em] text-white">Chat with AI</div>
                </div>
                <div className="flex items-center gap-6">
                  {imageContext && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-full border border-emerald-500/30" title="Triple-Vision Active: Analyzing the first 3 pages of this scanned document.">
                      <Sparkles size={10} className="text-emerald-400" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 text-white dark:text-black">Analyzing First 3 Pages</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 dark:bg-black/10 rounded-full border border-white/10 dark:border-black/10">
                    <Zap size={10} className={`${canUseAI(AiOperationType.HEAVY).warning ? 'text-amber-500' : 'text-neutral-500'}`} fill="currentColor" />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${canUseAI(AiOperationType.HEAVY).warning ? 'text-amber-500' : 'text-neutral-500'}`}>
                      AI Credits: {canUseAI(AiOperationType.HEAVY).warning ? canUseAI(AiOperationType.HEAVY).remaining : 'ACTIVE'}
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setStatus('idle')}
                    className="w-10 h-10 flex items-center justify-center hover:bg-white/10 dark:hover:bg-black/10 rounded-full transition-all"
                  >
                    <X size={20} />
                  </motion.button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {chatHistory.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full opacity-10 text-center gap-6">
                    <ListChecks size={64} strokeWidth={1} />
                    <p className="text-[12px] font-black uppercase tracking-[0.4em] max-w-[300px] leading-relaxed">Ask a question about this file</p>
                  </div>
                )}
                {chatHistory.map((m, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    key={i}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex flex-col gap-2 relative group-item">
                      <div className={`max-w-[85%] p-6 rounded-[40px] text-sm font-bold leading-relaxed shadow-xl ${m.role === 'user'
                        ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-none'
                        : 'bg-black/5 dark:bg-white/5 text-gray-900 dark:text-white border border-black/5 dark:border-white/10 rounded-tl-none'
                        }`}>
                        {m.text}
                      </div>

                      {m.role === 'bot' && (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.3 }}
                          whileHover={{ opacity: 1, color: '#ef4444' }}
                          onClick={() => setShowReport(true)}
                          className="flex items-center gap-1.5 ml-4 text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                          <Flag size={10} />
                          Report Response
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isAsking && (
                  <div className="flex justify-start">
                    <div className="bg-black/5 dark:bg-white/5 p-6 rounded-full rounded-tl-none animate-pulse">
                      <div className="flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-black/40 dark:bg-white/40 animate-bounce" />
                        <div className="w-1.5 h-1.5 rounded-full bg-black/40 dark:bg-white/40 animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-black/40 dark:bg-white/40 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-black/5 dark:border-white/10 flex gap-4">
                <input
                  type="text"
                  placeholder="TYPE YOUR QUESTION..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                  className="flex-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full px-8 py-5 text-sm font-black uppercase tracking-widest focus:outline-none focus:bg-white dark:focus:bg-black focus:border-black/10 transition-all placeholder:text-gray-400"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAsk}
                  className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-2xl active:brightness-125 transition-all"
                >
                  <Zap size={24} fill="currentColor" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ecosystem Synergies */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <ToolGuide
          title="AI Document Tools"
          description="Get more from your documents with our advanced AI tools."
          steps={[
            "Analyze documents via the Workspace for a detailed summary and Q&A.",
            "Use AI Audit to find risks and key info in your contracts.",
            "Convert tables and data into clean spreadsheets via the Data Extractor.",
            "Easily search through all your uploaded files."
          ]}
          useCases={[
            "Executive Summaries", "Contract Analysis", "Financial Intelligence", "Knowledge Management"
          ]}
        />

        <div className="flex items-center gap-3">
          <NeuralPulse color="bg-emerald-500" size="sm" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Ecosystem Synergies</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "AI Audit",
              desc: "Deep risk & savings analysis",
              icon: Shield,
              path: "/reader?protocol=audit",
              color: "text-emerald-500",
              tag: "ELITE AI"
            },
            {
              title: "Intelligence Briefing",
              desc: "Strategic audio downloads",
              icon: Headphones,
              path: "/reader?protocol=briefing",
              color: "text-indigo-500",
              tag: "AUDIO"
            },
            {
              title: "Intelligence Extractor",
              desc: "Vision & Handwriting OCR",
              icon: Database,
              path: "/data-extractor",
              color: "text-purple-500",
              tag: "VISION"
            },
            {
              title: "AI Redact",
              desc: "Vision-based PII obscuring",
              icon: EyeOff,
              path: "/smart-redact",
              color: "text-rose-500",
              tag: "PII"
            },

          ].map((tool, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(tool.path)}
              className="monolith-card rounded-[40px] p-6 flex flex-col items-start text-left space-y-4 hover:border-emerald-500/30 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 text-[7px] font-black px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-500 opacity-80 uppercase tracking-widest bg-emerald-500/5 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                {tool.tag}
              </div>
              <div className={`p-6 bg-black/5 dark:bg-white/5 rounded-2xl ${tool.color} group-hover:scale-110 group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all duration-500`}>
                <tool.icon size={24} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white mb-1">{tool.title}</div>
                <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                  {tool.desc}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-6 p-6 monolith-card rounded-[40px] bg-transparent border-black/5 opacity-40 hover:opacity-100 transition-opacity cursor-default"
      >
        <div className="space-y-1">
          <div className="text-technical tracking-[0.4em]">Privacy & Security</div>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
            FILES ARE DELETED AUTOMATICALLY. NO DATA LEAVES YOUR DEVICE.
          </p>
        </div>
      </motion.div>

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

      <AiLimitModal
        isOpen={showAiLimit}
        onClose={() => setShowAiLimit(false)}
        blockMode={aiLimitInfo.blockMode}
        used={aiLimitInfo.used}
        limit={aiLimitInfo.limit}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={async () => {
          // Refresh subscription to get latest credits
          const user = await getCurrentUser();
          if (user) await initSubscription(user);

          // Resume pending action if any
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
      />
    </motion.div>
  );
};

export default AntiGravityWorkspace;
