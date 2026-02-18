import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileImage, Loader2, Share2, Image as ImageIcon } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { downloadFile } from '@/services/downloadService';
import { FileItem } from '@/types';
import ToolGuide from '@/components/ToolGuide';
import FileHistoryManager from '@/utils/FileHistoryManager';
import SuccessModal from '@/components/SuccessModal';
import { useNavigate } from 'react-router-dom';
import { canUseTool, AiBlockMode } from '@/services/subscriptionService';
import AiLimitModal from '@/components/AiLimitModal';

pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/pdf.worker.v5.4.296.min.mjs';

type Format = 'jpg' | 'png';

const PdfToImagesScreen: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<FileItem | null>(null);
  const [format, setFormat] = useState<Format>('jpg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockMode, setBlockMode] = useState<AiBlockMode>(AiBlockMode.NONE);
  const [successData, setSuccessData] = useState<{ isOpen: boolean; fileName: string; originalSize: number; finalSize: number } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      try {
        const arrayBuffer = await f.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: f.type });
        const freshFile = new File([blob], f.name, { type: f.type });
        setFile({ id: 'main', file: freshFile, name: f.name, size: f.size, type: f.type });
      } catch (err) {
        console.error('Failed to read file:', f.name, err);
        alert('Failed to read file. Please try again.');
      }
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    const check = canUseTool('pdf-to-images');
    if (!check.allowed) {
      setBlockMode(check.blockMode || AiBlockMode.BUY_PRO);
      setShowUpgradeModal(true);
      return;
    }

    setIsProcessing(true);
    setProgress({ current: 0, total: 0 });

    try {
      const arrayBuffer = await file.file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      setProgress({ current: 0, total: totalPages });

      const zip = new JSZip();
      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      const quality = format === 'jpg' ? 0.92 : undefined;
      const ext = format === 'jpg' ? 'jpg' : 'png';

      for (let i = 1; i <= totalPages; i++) {
        setProgress({ current: i, total: totalPages });

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (!ctx) continue;

        await page.render({ canvasContext: ctx, viewport } as any).promise;

        const base64 = format === 'jpg'
          ? canvas.toDataURL(mimeType, quality).split(',')[1]
          : canvas.toDataURL(mimeType).split(',')[1];

        const pageNum = String(i).padStart(totalPages > 9 ? 2 : 1, '0');
        zip.file(`page_${pageNum}.${ext}`, base64, { base64: true });

        // Free canvas memory immediately
        canvas.width = 0;
        canvas.height = 0;
      }

      const baseName = file.name.replace(/\.pdf$/i, '');
      const outputName = `${baseName}_images.zip`;

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      await downloadFile(zipBlob, outputName);

      FileHistoryManager.addEntry({
        fileName: file.name,
        operation: 'split',
        originalSize: file.size,
        finalSize: zipBlob.size,
        status: 'success'
      });

      setSuccessData({
        isOpen: true,
        fileName: outputName,
        originalSize: file.size,
        finalSize: zipBlob.size,
      });
    } catch (err) {
      console.error('PDF to Images error:', err);
      alert('Failed to convert PDF. The file may be corrupted or password-protected.');
      FileHistoryManager.addEntry({
        fileName: file.name,
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
        {/* Header */}
        <div className="space-y-3">
          <div className="text-technical">Export Protocol</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">PDF to Images</h1>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Convert every page to high-quality JPG or PNG — runs locally, never uploaded</p>
          <div className="pt-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">100% Private: Processed On-Device</span>
          </div>
        </div>

        {/* Format Toggle */}
        <div className="flex gap-2 p-1 bg-black/5 dark:bg-white/5 rounded-2xl">
          {(['jpg', 'png'] as Format[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                format === f
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon size={14} />
              {f === 'jpg' ? 'JPG — Smaller Size' : 'PNG — Lossless'}
            </button>
          ))}
        </div>

        <ToolGuide
          title="Export Guide"
          description="Render every page of your PDF as a separate image file. All pages are bundled into a single ZIP for easy download."
          steps={[
            'Upload the PDF to convert.',
            'Choose JPG (smaller) or PNG (lossless quality).',
            "Tap 'Convert & Download' — pages export as a ZIP.",
          ]}
          useCases={['Sharing PDF Pages as Photos', 'Extracting Slides', 'Creating Thumbnails', 'Social Media Assets']}
        />

        {/* File Upload */}
        {!file ? (
          <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 10 }}
              className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
            >
              <FileImage size={32} />
            </motion.div>
            <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Upload PDF to Convert</span>
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mt-2">Maximum 50MB PDF</span>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
          </label>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="monolith-card p-6 flex items-center gap-5 border-none shadow-xl"
          >
            <div className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shrink-0">
              <FileImage size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black uppercase tracking-tighter truncate">{file.name}</h3>
              <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                {isProcessing && progress.total > 0
                  ? `Rendering page ${progress.current} of ${progress.total}...`
                  : `Ready to export as ${format.toUpperCase()}`}
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
            {!isProcessing && (
              <button
                onClick={() => setFile(null)}
                className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl"
              >
                Clear
              </button>
            )}
          </motion.div>
        )}
      </div>

      <div className="flex-1 h-8" />

      <button
        disabled={!file || isProcessing}
        onClick={handleConvert}
        className={`w-full py-6 rounded-[28px] font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group shadow-2xl mt-8 ${
          !file || isProcessing
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
            <span>Convert & Download ZIP</span>
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
          }}
          operation="PDF Exported as Images"
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

export default PdfToImagesScreen;
