import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Share2, Loader2, RotateCcw, Layers } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { reorderPdfPages } from '@/services/pdfService';
import { downloadFile } from '@/services/downloadService';
import { FileItem } from '@/types';
import ToolGuide from '@/components/ToolGuide';
import FileHistoryManager from '@/utils/FileHistoryManager';
import SuccessModal from '@/components/SuccessModal';
import { useNavigate } from 'react-router-dom';
import { canUseTool, AiBlockMode } from '@/services/subscriptionService';
import AiLimitModal from '@/components/AiLimitModal';

pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/pdf.worker.v5.4.296.min.mjs';

interface PageItem {
  originalIndex: number; // 0-based original page index
  thumbnail: string;     // data URL
}

const ReorderPagesScreen: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<FileItem | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isLoadingThumbs, setIsLoadingThumbs] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockMode, setBlockMode] = useState<AiBlockMode>(AiBlockMode.NONE);
  const [successData, setSuccessData] = useState<{ isOpen: boolean; fileName: string; originalSize: number; finalSize: number } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const f = e.target.files[0];

    setIsLoadingThumbs(true);
    setPages([]);

    try {
      const arrayBuffer = await f.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: f.type });
      const freshFile = new File([blob], f.name, { type: f.type });
      setFile({ id: 'main', file: freshFile, name: f.name, size: f.size, type: f.type });

      // Render thumbnails
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const rendered: PageItem[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.25 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport } as any).promise;
          rendered.push({ originalIndex: i - 1, thumbnail: canvas.toDataURL('image/jpeg', 0.7) });
        }
        canvas.width = 0;
        canvas.height = 0;
      }

      setPages(rendered);
    } catch (err) {
      console.error('Failed to load PDF:', err);
      alert('Could not load PDF. Please ensure it is not password protected.');
      setFile(null);
    } finally {
      setIsLoadingThumbs(false);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setPages(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index === pages.length - 1) return;
    setPages(prev => {
      const next = [...prev];
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
      return next;
    });
  };

  const resetOrder = () => {
    setPages(prev => [...prev].sort((a, b) => a.originalIndex - b.originalIndex));
  };

  const isReordered = pages.some((p, i) => p.originalIndex !== i);

  const handleApply = async () => {
    if (!file || pages.length === 0) return;

    const check = canUseTool('reorder-pages');
    if (!check.allowed) {
      setBlockMode(check.blockMode || AiBlockMode.BUY_PRO);
      setShowUpgradeModal(true);
      return;
    }

    setIsProcessing(true);
    try {
      const pageOrder = pages.map(p => p.originalIndex); // 0-based indices in new order
      const result = await reorderPdfPages(file.file, pageOrder);
      const outputName = `reordered_${file.name}`;
      const blob = new Blob([result], { type: 'application/pdf' });
      await downloadFile(blob, outputName);

      FileHistoryManager.addEntry({
        fileName: file.name,
        operation: 'split',
        originalSize: file.size,
        finalSize: result.length,
        status: 'success'
      });

      setSuccessData({
        isOpen: true,
        fileName: outputName,
        originalSize: file.size,
        finalSize: result.length,
      });
    } catch (err) {
      console.error('Reorder error:', err);
      alert('Failed to reorder pages. Please try again.');
      FileHistoryManager.addEntry({ fileName: file?.name || '', operation: 'split', status: 'error' });
    } finally {
      setIsProcessing(false);
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
        {/* Header */}
        <div className="space-y-3">
          <div className="text-technical">Page Protocol</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Reorder Pages</h1>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Rearrange PDF pages in any order — runs locally, never uploaded</p>
          <div className="pt-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">100% Private: Processed On-Device</span>
          </div>
        </div>

        <ToolGuide
          title="Reorder Guide"
          description="Upload your PDF and use the arrows to move pages up or down into any order you need."
          steps={[
            'Upload the PDF to reorder.',
            'Use ▲ ▼ arrows to move pages to the right position.',
            "Tap 'Apply & Download' to save the new order.",
          ]}
          useCases={['Fix Scanned Page Order', 'Rearrange Report Sections', 'Move Cover Page', 'Sort Mixed Documents']}
        />

        {/* File Upload */}
        {!file && !isLoadingThumbs && (
          <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 10 }}
              className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
            >
              <Layers size={32} />
            </motion.div>
            <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Upload PDF to Reorder</span>
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mt-2">Maximum 50MB PDF</span>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
          </label>
        )}

        {/* Loading thumbnails */}
        {isLoadingThumbs && (
          <div className="flex flex-col items-center justify-center h-60 gap-4">
            <Loader2 className="animate-spin text-black dark:text-white" size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Loading page previews...</p>
          </div>
        )}

        {/* Page list */}
        {pages.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {pages.length} Pages — {isReordered ? 'Order Changed' : 'Original Order'}
              </span>
              <div className="flex gap-2">
                {isReordered && (
                  <button
                    onClick={resetOrder}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-xl transition-all"
                  >
                    <RotateCcw size={11} />
                    Reset
                  </button>
                )}
                <button
                  onClick={() => { setFile(null); setPages([]); }}
                  className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 rounded-xl"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {pages.map((page, index) => (
                <motion.div
                  key={`${page.originalIndex}-${index}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="monolith-card p-3 flex items-center gap-4 border-none shadow-md"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-16 bg-black/5 dark:bg-white/5 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={page.thumbnail}
                      alt={`Page ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Page info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase tracking-tighter text-gray-900 dark:text-white">
                      Page {index + 1}
                    </p>
                    {page.originalIndex !== index && (
                      <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">
                        Was page {page.originalIndex + 1}
                      </p>
                    )}
                  </div>

                  {/* Arrow buttons */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        index === 0
                          ? 'text-gray-200 dark:text-gray-700 cursor-not-allowed'
                          : 'bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black active:scale-90'
                      }`}
                    >
                      <ArrowUp size={16} strokeWidth={3} />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === pages.length - 1}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        index === pages.length - 1
                          ? 'text-gray-200 dark:text-gray-700 cursor-not-allowed'
                          : 'bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black active:scale-90'
                      }`}
                    >
                      <ArrowDown size={16} strokeWidth={3} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 h-8" />

      <button
        disabled={pages.length === 0 || isProcessing || !isReordered}
        onClick={handleApply}
        className={`w-full py-6 rounded-[28px] font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group shadow-2xl mt-8 ${
          pages.length === 0 || isProcessing || !isReordered
            ? 'bg-black/5 dark:bg-white/5 text-gray-300 dark:text-gray-700 cursor-not-allowed shadow-none'
            : 'bg-black dark:bg-white text-white dark:text-black hover:brightness-110 active:scale-95'
        }`}
      >
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear', repeatDelay: 1 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-black/10 to-transparent skew-x-12"
        />
        {isProcessing ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <>
            <Share2 size={18} strokeWidth={3} />
            <span>{isReordered ? 'Apply Order & Download' : 'Move Pages to Enable'}</span>
          </>
        )}
      </button>

      <AiLimitModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        blockMode={blockMode}
      />

      {successData && (
        <SuccessModal
          isOpen={successData.isOpen}
          onClose={() => {
            setSuccessData(null);
            setFile(null);
            setPages([]);
          }}
          operation="Pages Reordered"
          fileName={successData.fileName}
          originalSize={successData.originalSize}
          finalSize={successData.finalSize}
          onViewFiles={() => {
            setSuccessData(null);
            setFile(null);
            setPages([]);
            navigate('/my-files');
          }}
        />
      )}
    </motion.div>
  );
};

export default ReorderPagesScreen;
