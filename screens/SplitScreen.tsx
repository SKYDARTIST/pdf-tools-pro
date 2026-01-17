
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Scissors, FileText, Share2, Loader2, FileUp, Package } from 'lucide-react';
import { splitPdf } from '../services/pdfService';
import { downloadFile } from '../services/downloadService';
import { FileItem } from '../types';
import ToolGuide from '../components/ToolGuide';
import TaskLimitManager from '../utils/TaskLimitManager';
import UpgradeModal from '../components/UpgradeModal';
import FileHistoryManager from '../utils/FileHistoryManager';
import SuccessModal from '../components/SuccessModal';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';

const SplitScreen: React.FC = () => {
  const [file, setFile] = useState<FileItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [successData, setSuccessData] = useState<{ isOpen: boolean; fileName: string; originalSize: number; finalSize: number } | null>(null);
  const navigate = useNavigate();

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

    if (!TaskLimitManager.canUseTask()) {
      setShowUpgradeModal(true);
      return;
    }

    setIsProcessing(true);
    try {
      const results = await splitPdf(file.file);

      // Bundle all pages into a single ZIP file
      const zip = new JSZip();
      const baseName = file.name.replace('.pdf', '');

      for (let i = 0; i < results.length; i++) {
        const data = results[i];
        zip.file(`page_${i + 1}_${baseName}.pdf`, data);
      }

      // Generate ZIP and download as single file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      await downloadFile(zipBlob, `${baseName}_split_pages.zip`);

      // Increment task counter
      TaskLimitManager.incrementTask();

      // Add to history
      FileHistoryManager.addEntry({
        fileName: file.name,
        operation: 'split',
        originalSize: file.size,
        status: 'success'
      });

      // Clear file removed - deferred
      setSuccessData({
        isOpen: true,
        fileName: `${baseName}_split_pages.zip`,
        originalSize: file.size,
        finalSize: zipBlob.size
      });
    } catch (err) {
      alert('Error splitting PDF');

      FileHistoryManager.addEntry({
        fileName: `split_failed_${file.name}`,
        operation: 'split',
        status: 'error'
      });
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
                <h3 className="text-sm font-black uppercase tracking-tighter truncate">{file.name}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{(file.size / 1024 / 1024).toFixed(2)} MB FILE</p>
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

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="limit_reached"
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
