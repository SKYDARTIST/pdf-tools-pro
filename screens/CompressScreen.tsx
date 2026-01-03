import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2, FileText, Download, Loader2, FileUp, Shield, Zap, X } from 'lucide-react';
import { downloadBlob, compressPdf } from '../services/pdfService';
import { FileItem } from '../types';
import FileHistoryManager from '../utils/FileHistoryManager';
import { formatFileSize } from '../utils/formatters';

const CompressScreen: React.FC = () => {
  const [file, setFile] = useState<FileItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quality, setQuality] = useState<'low' | 'med' | 'high'>('med');
  const [progress, setProgress] = useState<number>(0);
  const [estimatedSavings, setEstimatedSavings] = useState<{
    low: number;
    med: number;
    high: number;
  }>({ low: 40, med: 25, high: 10 });
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'info' | 'success' | 'warn' } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile({ id: 'main', file: f, name: f.name, size: f.size, type: f.type });
    }
  };

  // Heuristic Projection: Immediate feedback without heavy pre-processing
  const projectedSavings = estimatedSavings[quality];
  const projectedSize = file ? file.size * (1 - projectedSavings / 100) : 0;

  const handleCompress = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    setStatusMessage(null);

    try {
      const result = await compressPdf(file.file, quality, (p) => setProgress(p));
      const isActuallyCompressed = result.length < file.size - 1024; // At least 1KB reduction
      const fileName = isActuallyCompressed
        ? `optimized_${file.name}`
        : `finalized_${file.name}`;

      const savedBytes = file.size - result.length;
      const actualSavings = Math.round((savedBytes / file.size) * 100);

      downloadBlob(result, fileName, 'application/pdf');

      FileHistoryManager.addEntry({
        fileName,
        operation: 'compress',
        originalSize: file.size,
        finalSize: result.length,
        status: 'success'
      });

      // Provide intelligent feedback
      if (!isActuallyCompressed) {
        setStatusMessage({
          text: "System Optimal: Document is already in its most efficient structural form. No further decoupling possible.",
          type: 'info'
        });
      } else {
        setStatusMessage({
          text: `Protocol Successful: Asset decoupled by ${actualSavings}%`,
          type: 'success'
        });
        setFile(null); // Clear file only on successful reduction
      }
    } catch (err) {
      console.error('Compression error:', err);
      alert(err instanceof Error ? err.message : 'Optimization Protocol Failure');
      FileHistoryManager.addEntry({
        fileName: `compress_failed_${file.name}`,
        operation: 'compress',
        status: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const currentSavings = projectedSavings;
  const currentEst = projectedSize;

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
          <div className="text-technical">Protocol Assets / Optimization</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Compress</h1>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Reduce data weight while maintaining structural integrity</p>
        </div>

        {!file ? (
          <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
            >
              <FileUp size={32} />
            </motion.div>
            <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Initialize Data Stream</span>
            <span className="text-[10px] uppercase font-bold text-gray-400 mt-2">Maximum 50MB PDF</span>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
          </label>
        ) : (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="monolith-card p-6 flex items-center gap-5 border-none shadow-xl"
            >
              <div className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shrink-0">
                <FileText size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black uppercase tracking-tighter truncate">{file.name}</h3>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{(file.size / 1024 / 1024).toFixed(2)} MB ARCHIVE</p>
              </div>
              <button onClick={() => setFile(null)} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">Clear</button>
            </motion.div>

            <div className="monolith-card p-8 space-y-10 bg-black/5 dark:bg-white/5 border-none relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap size={14} className="text-black dark:text-white" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Optimization Protocol</h4>
                </div>
                {currentSavings > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-emerald-500 text-white text-[9px] font-black px-3 py-1 rounded-full tracking-widest uppercase"
                  >
                    -{currentSavings}% SAVED
                  </motion.div>
                )}
              </div>

              {/* Compression Gauge */}
              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-gray-400">Original Body</span>
                  <span className="text-black dark:text-white">Projected Core</span>
                </div>
                <div className="h-6 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden flex p-1">
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: `${100 - currentSavings}%` }}
                    className="h-full bg-black dark:bg-white rounded-full relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  </motion.div>
                </div>
                <div className="flex justify-between text-[11px] font-black tabular-nums">
                  <span className="text-gray-400 line-through">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  <span className="text-emerald-500">{((currentEst || file.size) / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(['low', 'med', 'high'] as const).map((lvl) => {
                  const s = estimatedSavings[lvl];

                  return (
                    <button
                      key={lvl}
                      onClick={() => setQuality(lvl)}
                      className={`relative p-5 rounded-2xl flex flex-col items-center justify-center transition-all border-none ${quality === lvl
                        ? 'bg-black dark:bg-white text-white dark:text-black shadow-2xl scale-105 z-10'
                        : 'bg-black/5 dark:bg-white/5 text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'
                        }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest mb-2">{lvl}</span>
                      <span className={`text-[11px] font-black tabular-nums ${quality === lvl ? 'opacity-100' : 'opacity-40'}`}>
                        {s}%
                      </span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {statusMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`p-5 rounded-2xl flex items-start gap-4 mb-6 ${statusMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-black/5 dark:bg-white/5 text-gray-400 border border-white/5'
                      }`}
                  >
                    <Shield size={16} className="shrink-0 mt-0.5" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed flex-1">
                      {statusMessage.text}
                    </p>
                    <button onClick={() => setStatusMessage(null)} className="opacity-40 hover:opacity-100 transition-opacity">
                      <X size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-4 bg-white/5 dark:bg-black/5 rounded-2xl text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  {quality === 'low' && 'Aggressive Compression • Significant Reduction'}
                  {quality === 'med' && 'Balanced Optimization • Recommended'}
                  {quality === 'high' && 'Structural Integrity • Minimal Reduction'}
                </p>
              </div>
            </div>

            <button
              disabled={isProcessing}
              onClick={handleCompress}
              className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-[28px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-black/10 to-transparent skew-x-12"
              />
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Processing: {progress}%</span>
                  </div>
                  <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <Minimize2 size={20} />
                  <span>Execute Optimization</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CompressScreen;
