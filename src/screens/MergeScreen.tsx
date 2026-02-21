
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, FileText, Share2, Loader2, ChevronUp, ChevronDown, Shield } from 'lucide-react';
import { mergePdfs } from '@/services/pdfService';
import { downloadFile } from '@/services/downloadService';
import { useNavigate } from 'react-router-dom';
import { canUseTool, AiBlockMode } from '@/services/subscriptionService';
import AiLimitModal from '@/components/AiLimitModal';
import SuccessModal from '@/components/SuccessModal';
import ProgressIndicator from '@/components/ProgressIndicator';
import { FileItem } from '@/types';
import FileHistoryManager from '@/utils/FileHistoryManager';
import ToolGuide from '@/components/ToolGuide';

const MergeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockMode, setBlockMode] = useState<AiBlockMode>(AiBlockMode.NONE);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    fileName: string;
    originalSize: number;
    finalSize: number;
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);

      // Read file data immediately to prevent Android permission expiration
      const newFiles = await Promise.all(
        filesArray.map(async (file: File) => {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: file.type });
            const freshFile = new File([blob], file.name, { type: file.type });

            return {
              id: Math.random().toString(36).substr(2, 9),
              file: freshFile,
              name: file.name,
              size: file.size,
              type: file.type
            };
          } catch (err) {
            console.error('Failed to read file:', file.name, err);
            return null;
          }
        })
      );

      const validFiles = newFiles.filter((f): f is FileItem => f !== null);
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
    setFiles(newFiles);
  };

  const handleMerge = async () => {
    if (files.length < 2) return;

    // Check task limit
    const check = canUseTool('merge');
    if (!check.allowed) {
      setBlockMode(check.blockMode || AiBlockMode.BUY_PRO);
      setShowUpgradeModal(true);
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('Preparing files...');

    try {
      // Simulate progress steps
      setProgress(20);
      setCurrentStep('Loading PDFs...');

      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(40);
      setCurrentStep('Merging pages...');

      const result = await mergePdfs(files.map(f => f.file));

      setProgress(80);
      setCurrentStep('Finalizing document...');

      const fileName = `merged_${Date.now()}.pdf`;

      // Calculate total size of input files
      const originalSize = files.reduce((acc, f) => acc + f.size, 0);

      setProgress(100);
      setCurrentStep('Complete!');

      // Download the file (works on web and mobile)
      const blob = new Blob([new Uint8Array(result)], { type: 'application/pdf' });
      await downloadFile(blob, fileName, () => {
        // Show success modal after download completes
        setSuccessData({
          fileName,
          originalSize,
          finalSize: result.length
        });
        setShowSuccessModal(true);
      });

      // Add to file history
      FileHistoryManager.addEntry({
        fileName,
        operation: 'merge',
        originalSize,
        finalSize: result.length,
        status: 'success'
      });

      // Clear files deferred
    } catch (err) {
      alert('Error merging PDFs: ' + (err instanceof Error ? err.message : 'Unknown error'));

      // Add error to history
      FileHistoryManager.addEntry({
        fileName: `merge_failed_${Date.now()}.pdf`,
        operation: 'merge',
        status: 'error'
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setCurrentStep('');
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
          <div className="text-technical">Sequence & Merge Management</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Merge</h1>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Arrange and unify multiple PDFs into a single document</p>
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full neural-glow">
              <Shield size={10} className="text-emerald-500" fill="currentColor" />
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Elite: No Watermarks</span>
            </div>
          </div>
        </div>

        <ToolGuide
          title="Merge Order Guide"
          description="Unified storage for multiple documents. Sequence and merge multiple PDFs into a single, stabilized document."
          steps={[
            "Add the PDF files you want to merge.",
            "Arrange the order using the up/down arrows.",
            "Double-check your preferred document order.",
            "Tap 'Merge & Share' to create your unified PDF."
          ]}
          useCases={[
            "Report Assembly", "Document Archiving", "Binder Collaboration", "Sequential Batching"
          ]}
        />

        <div className="flex-1 space-y-4">
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 90 }}
              className="w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-2xl flex items-center justify-center shadow-2xl mb-4"
            >
              <Plus size={24} />
            </motion.div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-900 dark:text-white">Add PDFs to Merge</span>
            <input type="file" multiple accept=".pdf" className="hidden" onChange={handleFileChange} />
          </label>

          <div className="space-y-3">
            {files.map((item, index) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="monolith-card p-4 flex items-center gap-4 border-none shadow-lg group relative overflow-hidden"
              >
                <div className="flex flex-col gap-1 z-10">
                  <button
                    onClick={() => moveFile(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-gray-300 dark:text-gray-700 hover:text-black dark:hover:text-white disabled:opacity-0 transition-colors"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveFile(index, 'down')}
                    disabled={index === files.length - 1}
                    className="p-1.5 text-gray-300 dark:text-gray-700 hover:text-black dark:hover:text-white disabled:opacity-0 transition-colors"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                <div className="w-12 h-12 bg-black/5 dark:bg-white/5 text-black dark:text-white rounded-xl flex items-center justify-center shrink-0 z-10 font-black text-[10px]">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0 z-10">
                  <p className="text-[11px] font-black uppercase tracking-tight truncate text-gray-900 dark:text-white">{item.name || `Document ${index + 1}`}</p>
                  <p className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{(item.size / 1024 / 1024).toFixed(2)} MB ARCHIVE</p>
                </div>

                <button
                  onClick={() => removeFile(item.id)}
                  className="p-3 text-gray-300 hover:text-rose-500 transition-colors z-10"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        <button
          disabled={files.length < 2 || isProcessing}
          onClick={handleMerge}
          className={`w-full py-6 rounded-[28px] font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group shadow-2xl ${files.length < 2 || isProcessing
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
              <Share2 size={18} strokeWidth={3} />
              <span>Merge & Share PDF</span>
            </>
          )}
        </button>

        {/* Progress Indicator */}
        {isProcessing && progress > 0 && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-[32px] p-8 border border-slate-200 dark:border-[#2a2a2a]">
              <ProgressIndicator
                progress={progress}
                currentStep={currentStep}
                estimatedTime={progress < 80 ? 2 : 1}
              />
            </div>
          </div>
        )}

        {/* Success Modal */}
        {successData && (
          <SuccessModal
            isOpen={showSuccessModal}
            onClose={() => {
              setShowSuccessModal(false);
              setFiles([]);
            }}
            operation="PDF Merge"
            fileName={successData.fileName}
            originalSize={successData.originalSize}
            finalSize={successData.finalSize}
            onViewFiles={() => {
              setShowSuccessModal(false);
              setFiles([]);
              navigate('/my-files');
            }}
          />
        )}

        {/* Upgrade Modal */}
        <AiLimitModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          blockMode={blockMode}
        />
      </div>
    </motion.div>
  );
};

export default MergeScreen;
