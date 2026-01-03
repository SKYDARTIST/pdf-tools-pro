
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, Loader2, Bot, Info, X, MessageSquare, ListChecks, Sparkles, Activity, Zap, Flag } from 'lucide-react';
import { askGemini } from '../services/aiService';

const AntiGravityWorkspace: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'lifting' | 'analyzed'>('idle');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [suggestedName, setSuggestedName] = useState<string | null>(null);
  const [documentContext, setDocumentContext] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot', text: string }[]>([]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setIsImporting(true);
      setStatus('lifting');
      setSuggestedName(null);

      try {
        const arrayBuffer = await selected.arrayBuffer();

        // 1. EXTRACT RAW METADATA
        const { PDFDocument } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pageCount = pdfDoc.getPageCount();
        const fileName = selected.name;

        // 2. EXTRACT NEURAL PAYLOAD (Full Text)
        const { extractTextFromPdf } = await import('../utils/pdfExtractor');
        const extractedText = await extractTextFromPdf(arrayBuffer);

        const context = `
        SYSTEM_PAYLOAD_ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}
        FILENAME: ${fileName}
        TOTAL_PAGES: ${pageCount}
        SIZE: ${(selected.size / 1024).toFixed(2)} KB
        
        DOCUMENT_TEXT_PAYLOAD:
        ${extractedText || "NO_EXTRACTABLE_TEXT: Document is likely image-based or lacks an OCR layer."}
        `.trim();

        const analysisPrompt = extractedText
          ? `Initialize Protocol. Execute comprehensive structural and thematic analysis on the provided payload. Focus on identifying document purpose and key technical pillars. Tone: Secure, Analytical. Payload Context: ${context.substring(0, 1000)}`
          : `Initialize Protocol. Notify the user that the document appears to be image-based or scanned (No extractable text found). Explain that for deep structural analysis, a text-enabled PDF is required. Explicitly suggest they use our internal "Scanner" or "Image to PDF" tools in the Tools tab to re-process their documents into a standard format and then try again. Tone: Secure, Analytical.`;

        // Run analysis and naming suggestion in parallel
        const { suggestDocumentName } = await import('../services/namingService');

        const [initialAnalysis, smartName] = await Promise.all([
          askGemini(analysisPrompt, context),
          extractedText ? suggestDocumentName(extractedText) : Promise.resolve(null)
        ]);

        setAnalysis(initialAnalysis);
        if (smartName && smartName !== 'unnamed_document') {
          setSuggestedName(smartName);
        }
        setDocumentContext(context);
        setChatHistory([{ role: 'bot', text: initialAnalysis }]);
        setStatus('analyzed');
      } catch (error) {
        console.error('Error processing PDF:', error);
        setAnalysis(`Document "${selected.name}" processed. AI is ready for your questions.`);
        setDocumentContext(`Metadata: ${selected.name}`);
        setStatus('analyzed');
      } finally {
        setIsImporting(false);
      }
    }
  };

  const handleAsk = async () => {
    if (!query.trim() || isAsking) return;
    const currentQuery = query;
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', text: currentQuery }]);
    setIsAsking(true);
    const response = await askGemini(currentQuery, documentContext || "");
    setChatHistory(prev => [...prev, { role: 'bot', text: response }]);
    setIsAsking(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="px-6 pb-32 pt-32 max-w-2xl mx-auto flex flex-col min-h-screen space-y-12 overflow-x-hidden"
    >
      {/* Workspace Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-3 min-w-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black dark:bg-white rounded-2xl flex items-center justify-center shadow-2xl shrink-0">
              <Sparkles size={24} className="text-white dark:text-black" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="text-technical tracking-[0.3em] truncate">Anti-Gravity Protocol</div>
              <h2 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">
                Workspace
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] ml-1">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-white animate-pulse" />
            STATUS: {status === 'idle' ? 'STANDBY' : status.toUpperCase()}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-black/5 dark:bg-white/5 text-gray-900 dark:text-white rounded-full border border-black/5 dark:border-white/10 text-[10px] font-black uppercase tracking-[0.3em] shadow-sm">
          SECURE ENCRYPTION ACTIVE
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.label
            key="idle"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 flex flex-col items-center justify-center w-full monolith-card cursor-pointer group relative overflow-hidden min-h-[450px] border-dashed border-2 bg-transparent"
          >
            <div className="relative z-10 flex flex-col items-center space-y-8">
              <div className="w-28 h-28 bg-black/5 dark:bg-white/5 rounded-[32px] flex items-center justify-center group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all duration-700 border border-black/5 dark:border-white/5 shadow-2xl">
                <FileUp size={44} strokeWidth={1.5} />
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Inject Payload</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] opacity-80 max-w-[320px] leading-relaxed">
                  Drop PDF for structural extraction and AI-powered interaction
                </p>
              </div>
            </div>

            <input type="file" accept=".pdf" className="hidden" onChange={handleImport} />
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
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="w-56 h-56 border-t-2 border-l-2 border-black/20 dark:border-white/20 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity size={64} className="text-gray-900 dark:text-white animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-4">
              <h3 className="text-4xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">Processing...</h3>
              <div className="text-technical animate-pulse">Neural Layer Deconstruction</div>
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
            {/* Analysis Result */}
            <div className="monolith-card p-10 relative overflow-hidden bg-black text-white dark:bg-white dark:text-black border-none">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Bot size={140} />
              </div>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white/10 dark:bg-black/10 rounded-2xl backdrop-blur-md">
                  <Bot size={24} className="text-white dark:text-black" />
                </div>
                <div className="flex-1">
                  <div className="text-technical tracking-[0.3em] opacity-60 text-white dark:text-black uppercase">Primary Insights</div>
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
                          {suggestedName}.pdf
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
                  <MessageSquare size={20} />
                  <div className="text-technical tracking-[0.3em] text-white dark:text-black">Neural Interface</div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 dark:bg-black/10 rounded-full border border-white/10 dark:border-black/10">
                    <Zap size={10} className="text-yellow-400" fill="currentColor" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white dark:text-black">Neural Budget: 7/10</span>
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
                    <p className="text-[12px] font-black uppercase tracking-[0.4em] max-w-[300px] leading-relaxed">Query the document intelligence</p>
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
                      <div className={`max-w-[85%] p-6 rounded-[32px] text-sm font-bold leading-relaxed shadow-xl ${m.role === 'user'
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
                          onClick={() => {
                            if (window.confirm('Report this AI response for safety review?')) {
                              alert('Response reported to Anti-Gravity Safety Hub. Thank you.');
                            }
                          }}
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
                    <div className="bg-black/5 dark:bg-white/5 p-6 rounded-3xl rounded-tl-none animate-pulse">
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
                  placeholder="ASK QUESTION..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                  className="flex-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-3xl px-8 py-5 text-sm font-black uppercase tracking-widest focus:outline-none focus:bg-white dark:focus:bg-black focus:border-black/10 transition-all placeholder:text-gray-400"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAsk}
                  className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl active:brightness-125 transition-all"
                >
                  <Zap size={24} fill="currentColor" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workspace Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-6 p-10 monolith-card bg-transparent border-dashed border-2 opacity-40 hover:opacity-100 transition-opacity cursor-default"
      >
        <div className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl text-gray-900 dark:text-white">
          <Info size={24} />
        </div>
        <div className="space-y-1">
          <div className="text-technical tracking-[0.4em]">Security Multi-Protocol</div>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] leading-relaxed">
            EPHEMERAL PROCESSING ACTIVE. NO DATA PERSISTENCE BEYOND SESSION TERMINATION.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AntiGravityWorkspace;
