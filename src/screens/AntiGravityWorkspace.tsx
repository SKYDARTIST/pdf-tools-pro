import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, Bot, X, MessageSquare, ListChecks, Sparkles, Activity, Zap, Flag, Database, Shield, Headphones, EyeOff, BookOpen, GitMerge, PenTool, Droplet, RotateCw, FileImage, Trash2, Hash, FileText, Image as ImageIcon } from 'lucide-react';

import { askGemini } from '@/services/aiService';
import { canUseAI, recordAIUsage, getSubscription, SubscriptionTier, AiOperationType } from '@/services/subscriptionService';
import { useNavigate } from 'react-router-dom';
import AIOptInModal from '@/components/AIOptInModal';
import AIReportModal from '@/components/AIReportModal';
import AiLimitModal from '@/components/AiLimitModal';
import NeuralPulse from '@/components/NeuralPulse';
import FileHistoryManager from '@/utils/FileHistoryManager';
import ToolGuide from '@/components/ToolGuide';
import { PDFDocument } from 'pdf-lib';
import { extractTextFromPdf, renderMultiplePagesToImages } from '@/utils/pdfExtractor';
import { getFriendlyErrorMessage } from '@/utils/errorMapping';

const AntiGravityWorkspace: React.FC = () => {
  const navigate = useNavigate();
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
  const [showAiLimit, setShowAiLimit] = useState(false);
  const [aiLimitInfo, setAiLimitInfo] = useState<{ blockMode: any }>({ blockMode: null });
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const showToast = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 3000);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      processFile(selected);
    }
  };

  const processFile = async (selected: File) => {
    if (!hasConsent) {
      setShowConsent(true);
      return;
    }

    const check = canUseAI(AiOperationType.HEAVY);
    if (!check.allowed) {
      const subscription = getSubscription();
      setAiLimitInfo({
        blockMode: check.blockMode,
      });
      setShowAiLimit(true);
      return;
    }

    setFile(selected);
    setIsImporting(true);
    setStatus('lifting');
    setSuggestedName(null);
    setImageContext(null);
    setProgress(0);

    try {
      const isImage = selected.type.startsWith('image/');
      let extractedText = '';
      let base64Images: string | string[] = '';

      if (isImage) {
        setProgress(30);
        const reader = new FileReader();
        base64Images = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(selected);
        });
        setProgress(100);
        setImageContext(base64Images);
      } else {
        const arrayBuffer = await selected.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        extractedText = await extractTextFromPdf(arrayBuffer.slice(0), undefined, undefined, (p) => setProgress(p));

        if (!extractedText) {
          base64Images = await renderMultiplePagesToImages(arrayBuffer.slice(0), 3);
          if ((base64Images as string[]).length > 0) {
            setImageContext(base64Images);
          }
        }
      }

      const context = `FILENAME: ${selected.name}\nCONTENT: ${extractedText || "Image-based analysis"}`;
      const analysisPrompt = `Analyze this document and summarize it. Respond in a professional tone.`;

      const { suggestDocumentName } = await import('@/services/namingService');
      const [initialAnalysisResp, smartName] = await Promise.all([
        askGemini(analysisPrompt, context, 'chat', base64Images || undefined),
        extractedText ? suggestDocumentName(extractedText) : Promise.resolve(null)
      ]);

      if (!initialAnalysisResp.success || !initialAnalysisResp.data) {
        showToast(initialAnalysisResp.error || 'Initial analysis failed. Credit NOT deducted.');
        setStatus('idle');
        setIsImporting(false);
        return;
      }

      const initialAnalysis = initialAnalysisResp.data;
      setAnalysis(initialAnalysis);
      setSuggestedName(smartName);
      setDocumentContext(context);
      setChatHistory([{ role: 'bot', text: initialAnalysis }]);
      setStatus('analyzed');

      const signaturePrompt = `1-sentence search summary. Document: ${initialAnalysis.substring(0, 500)}`;
      const neuralSignatureResp = await askGemini(signaturePrompt, context, 'chat');
      const neuralSignature = neuralSignatureResp.success ? neuralSignatureResp.data || '' : '';

      FileHistoryManager.addEntry({
        fileName: selected.name,
        operation: 'extract-text',
        status: 'success',
        neuralSignature: (neuralSignature || '').replace(/\n|"/g, '')
      });

      await recordAIUsage(AiOperationType.HEAVY);
    } catch (error) {
      console.error('Error processing document:', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      setError(getFriendlyErrorMessage(error) || "Connection failed. Please try a different document.");
      setStatus('idle');
    } finally {
      setIsImporting(false);
    }
  };

  const handleAsk = async () => {
    if (!query.trim() || isAsking) return;

    if (!hasConsent) {
      setShowConsent(true);
      return;
    }

    const currentQuery = query;
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', text: currentQuery }]);
    setIsAsking(true);

    try {
      const response = await askGemini(currentQuery, documentContext || "", 'chat', imageContext || undefined);

      if (response.success && response.data) {
        setChatHistory(prev => [...prev, { role: 'bot', text: response.data! }]);
        await recordAIUsage(AiOperationType.HEAVY);
      } else {
        showToast(response.error || 'Processing failed. Credit NOT deducted.');
      }
    } catch (err) {
      console.error('AI Chat Error:', err);
      showToast('Processing failed. Try again.');
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
            <div className="bg-white/20 p-1 rounded-full">⚠️</div>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
        <div className="space-y-3 min-w-0 w-full">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center shadow-2xl shrink-0"><Sparkles size={20} className="text-white dark:text-black" /></div>
            <div className="space-y-0.5 min-w-0">
              <div className="text-[9px] font-mono font-black uppercase tracking-[0.3em] text-emerald-500 truncate">Pro & Neural</div>
              <h2 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Workspace</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div key="idle" className="space-y-12 w-full">
              <ToolGuide
                title="Pro & Neural Operation Guide"
                description="The Pro & Neural Workspace is an elite suite for your most important documents. From heavy-duty AI analysis to secure professional utilities, everything happens with zero-cloud privacy."
                steps={[
                  "AI Neural Suite: Chat, compare, and extract structured data using local-first intelligence.",
                  "Pro Utilities: Securely sign, watermark, and manage pages in professional PDF documents.",
                  "Neural Pulse: Your operations are accelerated by on-device processing for maximum speed.",
                  "Privacy First: Files never leave your device. All Pro tools run in your private workspace."
                ]}
                useCases={[
                  "Deep AI Analysis", "Secure Signing", "Privacy Watermarking", "Data Extraction"
                ]}
              />
            </motion.div>
          )}


          {status === 'lifting' && (
            <motion.div key="lifting" className="flex-1 flex flex-col items-center justify-center space-y-16 py-20">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="w-64 h-64 border-t-2 border-l-2 border-emerald-500 rounded-full" />
              <h3 className="text-4xl font-black uppercase tracking-tighter">Analyzing...</h3>
              <div className="w-64 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-emerald-500" />
              </div>
            </motion.div>
          )}

          {status === 'analyzed' && (
            <motion.div key="analyzed" className="flex-1 flex flex-col space-y-8">
              <div className="flex-1 monolith-card overflow-hidden flex flex-col min-h-[600px] border-none shadow-2xl">
                <div className="px-8 py-6 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-black text-white dark:bg-zinc-900 dark:text-white">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <MessageSquare size={18} className="text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-mono tracking-[0.4em] text-emerald-400 uppercase">Smart Workspace</div>
                      {suggestedName && <div className="text-[10px] font-black uppercase tracking-tighter truncate opacity-60">{suggestedName}.pdf</div>}
                    </div>
                  </div>
                  <button onClick={() => setStatus('idle')} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-black/5 dark:bg-black/20">
                  {chatHistory.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] p-6 rounded-[32px] text-sm font-bold shadow-sm ${m.role === 'user' ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-none' : 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 border border-black/5 dark:border-white/5 rounded-tl-none'}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {isAsking && (
                    <div className="flex justify-start">
                      <div className="bg-white/50 dark:bg-zinc-800/50 p-6 rounded-full rounded-tl-none flex gap-1">
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-emerald-500 rounded-full" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-emerald-500 rounded-full" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-emerald-500 rounded-full" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-8 border-t border-black/5 dark:border-white/5 flex gap-4 bg-white dark:bg-zinc-900">
                  <input type="text" placeholder="TYPE YOUR QUESTION..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAsk()} className="flex-1 bg-black/5 dark:bg-white/5 border-none rounded-2xl px-8 py-5 text-xs font-black uppercase tracking-widest focus:outline-none dark:text-white shadow-inner" />
                  <button onClick={handleAsk} className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"><Zap size={24} fill="currentColor" /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Support/Troubleshooting Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-[32px] bg-rose-500/5 border border-rose-500/20 space-y-2"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-xl">
              <Shield size={18} className="text-rose-500" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-rose-500">AI Support Notice</div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed text-gray-500 dark:text-gray-400">
            Facing a <span className="text-rose-500">"Connection Error"</span> or blank page?
            Simply <span className="text-gray-900 dark:text-white underline">Logout</span> and <span className="text-gray-900 dark:text-white underline">Login</span> again.
            This refreshes your secure connection with our servers to ensure your AI credits sync correctly.
          </p>
        </motion.div>

        <div className="space-y-6">
          <div className="flex items-center gap-4 ml-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(0,200,150,0.5)]" />
            <h2 className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-gray-900 dark:text-gray-100">AI Neural Suite</h2>
            <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Smart Reader Hub", desc: "View • Chat • Outline • Map", icon: BookOpen, path: "/reader", color: "text-emerald-500", tag: "4-IN-1 HUB" },
              { title: "Smart Compare", desc: "AI Document Changes", icon: GitMerge, path: "/neural-diff", color: "text-indigo-500", tag: "VERSIONS" },
              { title: "Data Extractor", desc: "Analyze Photos & Scans", icon: Database, path: "/data-extractor", color: "text-purple-500", tag: "VISION" },
              { title: "AI Redact", desc: "Automated PII Filter", icon: EyeOff, path: "/smart-redact", color: "text-rose-500", tag: "SECURITY" },
            ].map((tool, i) => (
              <motion.button key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate(tool.path)} className="monolith-card rounded-[40px] p-6 flex flex-col items-start text-left space-y-4">
                <div className="text-[7px] font-black px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-500 uppercase tracking-widest bg-emerald-500/5">{tool.tag}</div>
                <div className={`p-6 bg-black/5 rounded-2xl ${tool.color}`}><tool.icon size={24} /></div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white mb-1">{tool.title}</div>
                  <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{tool.desc}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4 ml-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] shadow-[0_0_10px_rgba(0,200,150,0.5)]" />
            <h2 className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-gray-900 dark:text-gray-100">Pro Power Utilities</h2>
            <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { title: 'Sign', desc: 'Secure Sign', icon: PenTool, path: '/sign' },
              { title: 'Extract Text', desc: 'PDF to Text', icon: FileText, path: '/extract-text' },
              { title: 'Rotate', desc: 'Fix Pages', icon: RotateCw, path: '/rotate' },
              { title: 'Watermark', desc: 'Secure Files', icon: Droplet, path: '/watermark' },
              { title: 'Extract Images', desc: 'Save Assets', icon: FileImage, path: '/extract-images' },
              { title: 'Remove', desc: 'Delete Pages', icon: Trash2, path: '/remove-pages' },
              { title: 'Numbers', desc: 'Add Pages', icon: Hash, path: '/page-numbers' },
            ].map((tool, i) => (
              <motion.button
                key={i}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(tool.path)}
                className="monolith-card rounded-[32px] p-5 flex flex-col items-center text-center space-y-3"
              >
                <div className="p-4 bg-[#00C896]/10 rounded-2xl text-[#00C896]"><tool.icon size={20} /></div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-gray-900 dark:text-white leading-none mb-1">{tool.title}</div>
                  <div className="text-[7px] font-bold text-gray-400 uppercase tracking-tight">{tool.desc}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>


        <AIOptInModal isOpen={showConsent} onClose={() => setShowConsent(false)} onAccept={() => { localStorage.setItem('ai_neural_consent', 'true'); setHasConsent(true); setShowConsent(false); }} />
        <AIReportModal isOpen={showReport} onClose={() => setShowReport(false)} />
        <AiLimitModal isOpen={showAiLimit} onClose={() => setShowAiLimit(false)} blockMode={aiLimitInfo.blockMode} used={aiLimitInfo.used} limit={aiLimitInfo.limit} />
      </div>
    </motion.div >
  );
};

export default AntiGravityWorkspace;
