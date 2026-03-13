
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Scissors, FileText, Share2, Loader2, FileUp, Package } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { downloadFile } from '@/services/downloadService';

pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/pdf.worker.v5.4.296.min.mjs';
import { FileItem } from '@/types';
import ToolGuide from '@/components/ToolGuide';
import FileHistoryManager from '@/utils/FileHistoryManager';
import SuccessModal from '@/components/SuccessModal';
import { useNavigate } from 'react-router-dom';
import { canUseTool, AiBlockMode } from '@/services/subscriptionService';
import AiLimitModal from '@/components/AiLimitModal';
import Analytics from '@/services/analyticsService';

const SplitScreen: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<FileItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockMode, setBlockMode] = useState<AiBlockMode>(AiBlockMode.NONE);

  // Track screen view
  useEffect(() => {
    Analytics.track('screen_view', { screen: 'split' });
  }, []);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [successData, setSuccessData] = useState<{ isOpen: boolean; fileName: string; originalSize: number; finalSize: number } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      try {
        // Read file data immediately to prevent Android permission expiration
        const arrayBuffer = await f.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: f.type });
        const freshFile = new File([blob], f.name, { type: f.type });

        setFile({
          id: 'main',
          file: freshFile,
          name: f.name,
          size: f.size,
          type: f.type
        });
      } catch (err) {
        console.error('Failed to read file:', f.name, err);
        alert('Failed to read file. Please try again.');
      }
    }
  };

  const handleSplit = async () => {
    if (!file) return;

    // Check task limit
    const check = canUseTool('split');
    if (!check.allowed) {
      setBlockMode(check.blockMode || AiBlockMode.BUY_PRO);
      setShowUpgradeModal(true);
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: 0 });
    try {
      const arrayBuffer = await file.file.arrayBuffer();
      const JSZip = (await import('jszip')).default;

      // Load PDF ONCE — not per page (old approach caused OOM on large docs)
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageCount = pdf.numPages;
      const baseName = file.name.replace(/\.pdf$/i, '');
      const paddingLen = String(pageCount).length;
      const zip = new JSZip();

      setProgress({ current: 0, total: pageCount });

      for (let i = 1; i <= pageCount; i++) {
        setProgress({ current: i, total: pageCount });

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (!ctx) {
          page.cleanup();
          canvas.width = 0;
          canvas.height = 0;
          continue;
        }

        await page.render({ canvasContext: ctx, viewport } as any).promise;
        page.cleanup(); // Release PDF.js internal page resources

        // Use Uint8Array instead of base64 — 33% less memory in JSZip
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
            'image/jpeg',
            0.85
          )
        );
        const uint8 = new Uint8Array(await blob.arrayBuffer());
        const pageNum = String(i).padStart(paddingLen, '0');
        zip.file(`page_${pageNum}_${baseName}.jpg`, uint8);

        canvas.width = 0;
        canvas.height = 0;

        // Yield to browser every 20 pages — prevents ANR crash on Android
        if (i % 20 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 4 } });
      await downloadFile(zipBlob, `${baseName}_split_pages.zip`);

      // Add to history
      FileHistoryManager.addEntry({
        fileName: file.name,
        operation: 'split',
        originalSize: file.size,
        status: 'success'
      });

      // Track successful split
      Analytics.track('tool_success', {
        tool: 'split',
        page_count: pageCount,
        original_size_mb: (file.size / 1024 / 1024).toFixed(2),
        final_size_mb: (zipBlob.size / 1024 / 1024).toFixed(2)
      });

      setSuccessData({
        isOpen: true,
        fileName: `${baseName}_split_pages.zip`,
        originalSize: file.size,
        finalSize: zipBlob.size
      });
    } catch (err) {
      console.error('Split/Zip Failure:', err);
      alert('Error splitting PDF: ' + (err instanceof Error ? err.message : 'Resource exhaustion'));

      // Track error
      Analytics.track('tool_error', {
        tool: 'split',
        error: err instanceof Error ? err.message : 'Unknown error'
      });

      FileHistoryManager.addEntry({
        fileName: `split_failed_${file.name}`,
        operation: 'split',
        status: 'error'
      });
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
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
          <div className="text-technical">Available Tools / Split PDF</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Split</h1>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-relaxed">Extract and save individual pages from your PDF as separate files</p>
        </div>

        <ToolGuide
          title="How to split your PDF"
          description="Break a large PDF into individual pages. Our tool will create a separate PDF for every page in your original file."
          steps={[
            "Upload the PDF you want to split.",
            "Our tool analyzes the number of pages in your file.",
            "Tap 'Split & Share' to start the process.",
            "Download and save the individual page files."
          ]}
          useCases={[
            "Page Extraction", "Document Splitting", "Separating Pages", "File Management"
          ]}
        />

        {!file ? (
          <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: -15 }}
              className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
            >
              <Scissors size={32} />
            </motion.div>
            <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Tap to upload PDF</span>
            <span className="text-[10px] uppercase font-bold text-gray-400 mt-2">Maximum 50MB PDF</span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
            />
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
                <h3 className="text-sm font-black uppercase tracking-tighter truncate">Active Document</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {isProcessing && progress.total > 0
                    ? `Rendering page ${progress.current} of ${progress.total}...`
                    : `${(file.size / 1024 / 1024).toFixed(2)} MB FILE`}
                </p>
                {isProcessing && progress.total > 0 && (
                  <div className="mt-3 w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="h-full bg-black dark:bg-white rounded-full"
                      animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                      transition={{ ease: 'linear' }}
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl"
              >
                Clear
              </button>
            </motion.div>

            <button
              disabled={isProcessing}
              onClick={handleSplit}
              className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-[28px] font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden group"
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
                  <Share2 size={18} strokeWidth={3} />
                  <span>Split & Share Documents</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

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
          }}
          operation="Page Extraction"
          fileName={successData.fileName}
          originalSize={successData.originalSize}
          finalSize={successData.finalSize}
          onViewFiles={() => {
            setSuccessData(null);
            setFile(null);
            navigate('/my-files');
          }}
        />
      )}
    </motion.div>
  );
};

export default SplitScreen;
