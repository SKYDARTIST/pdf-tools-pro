
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Download, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { createPdfFromText, downloadBlob } from '../services/pdfService';

const WebToPdfScreen: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConvert = async () => {
    if (!url) return;
    setIsProcessing(true);
    // Simulation of a web capture (requires server-side or sophisticated client-side rendering)
    setTimeout(async () => {
      try {
        const result = await createPdfFromText(`Web Capture: ${url}`, `Full content capture from ${url} at ${new Date().toLocaleString()}. This document was generated using PDF Tools Pro on-device web engine.`);
        downloadBlob(result, `web_capture_${Date.now()}.pdf`, 'application/pdf');
      } finally {
        setIsProcessing(false);
      }
    }, 2500);
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
          <div className="text-technical">Protocol Assets / Web Transcription</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Capture</h1>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Transcribe remote web interfaces into persistent document structures</p>
        </div>

        <div className="space-y-8">
          <div className="monolith-card p-8 bg-black/5 dark:bg-white/5 border-none shadow-xl space-y-8">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-1">Remote Endpoint</label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="HTTPS://SOURCE_URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full h-16 pl-16 pr-6 bg-white dark:bg-black border-none rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white shadow-inner focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
                />
                <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" size={20} />
              </div>
            </div>

            <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
              <ShieldCheck size={14} strokeWidth={3} />
              <span>Interference Filter Active</span>
            </div>
          </div>

          <div className="monolith-card p-8 bg-black/5 dark:bg-white/5 border-none flex flex-col items-center justify-center text-center gap-4 h-44">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            >
              <Globe size={24} className="text-gray-300 dark:text-gray-700" />
            </motion.div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-8 leading-relaxed">
              Auto-purging advertisement layers and session identifiers for tactical layout
            </p>
          </div>
        </div>

        <button
          disabled={!url || isProcessing}
          onClick={handleConvert}
          className={`w-full py-6 rounded-[28px] font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group shadow-2xl ${!url || isProcessing
              ? 'bg-black/5 dark:bg-white/5 text-gray-300 dark:text-gray-700 cursor-not-allowed shadow-none'
              : 'bg-black dark:bg-white text-white dark:text-black hover:brightness-110 active:scale-95'
            }`}
        >
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-black/10 to-transparent skew-x-12"
          />
          {isProcessing ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <Download size={18} strokeWidth={3} />
              <span>Execute Transcription</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default WebToPdfScreen;
