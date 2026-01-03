
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileSearch, FileUp, Copy, Check, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - using local file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const ExtractTextScreen: React.FC = () => {
  const [text, setText] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{ chars: number; pages: number } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsProcessing(true);

      try {
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Load PDF document
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        // Extract text from all pages
        let fullText = '';
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n\n';
        }

        // Clean up text
        const cleanedText = fullText
          .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
          .replace(/\n\s*\n/g, '\n\n')  // Remove extra blank lines
          .trim();

        setText(cleanedText);
        setStats({
          chars: cleanedText.length,
          pages: numPages
        });
      } catch (err) {
        alert('Error extracting text: ' + (err instanceof Error ? err.message : 'Unknown error'));
        setText('Failed to extract text from PDF. The file may be image-based or corrupted.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const copyToClipboard = () => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
          <div className="text-technical">Protocol Assets / Lexical Extraction</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Extract</h1>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Identify and reconstruct readable data streams for lexical reuse</p>
        </div>

        {!text && !isProcessing ? (
          <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
            <motion.div
              whileHover={{ scale: 1.1, y: -5 }}
              className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
            >
              <FileSearch size={32} />
            </motion.div>
            <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Initialize Extraction</span>
            <span className="text-[10px] uppercase font-bold text-gray-400 mt-2">Lexical Scan Mode</span>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
          </label>
        ) : isProcessing ? (
          <div className="h-80 flex flex-col items-center justify-center gap-6 monolith-card bg-black/5 dark:bg-white/5 border-none shadow-xl">
            <div className="relative">
              <Loader2 className="animate-spin text-black dark:text-white" size={48} strokeWidth={3} />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-black/5 dark:bg-white/5 rounded-full filter blur-xl"
              />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse">Syncing Lexical Data...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-end px-2">
              <div className="space-y-1">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Extracted Buffer</h4>
                {stats && (
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                    {stats.chars.toLocaleString()} BYTES • {stats.pages} SEGMENTS
                  </p>
                )}
              </div>
              <button
                onClick={copyToClipboard}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-2xl ${copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-black dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95'
                  }`}
              >
                {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={3} />}
                {copied ? 'BUFFER_COPIED' : 'Sync to Clipboard'}
              </button>
            </div>

            <div className="monolith-card p-8 bg-black/5 dark:bg-white/5 border-none shadow-xl min-h-[400px] max-h-[500px] overflow-y-auto custom-scrollbar">
              <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                {text}
              </p>
            </div>

            <button
              onClick={() => { setText(null); setStats(null); }}
              className="w-full py-4 text-[9px] font-black text-gray-400 hover:text-gray-900 dark:hover:text-white uppercase tracking-[0.5em] transition-colors"
            >
              [ Re-Initialize Extraction ]
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ExtractTextScreen;
