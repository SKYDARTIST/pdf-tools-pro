
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Type, Image as ImageIcon, Share2, Loader2, Settings2, Shield } from 'lucide-react';
import { addWatermark } from '../services/pdfService';
import { downloadFile } from '../services/downloadService';
import { FileItem } from '../types';
import ToolGuide from '../components/ToolGuide';
import TaskLimitManager from '../utils/TaskLimitManager';
import UpgradeModal from '../components/UpgradeModal';
import FileHistoryManager from '../utils/FileHistoryManager';
import SuccessModal from '../components/SuccessModal';
import { useNavigate } from 'react-router-dom';
import { useAuthGate } from '../hooks/useAuthGate';
import { AuthModal } from '../components/AuthModal';

const WatermarkScreen: React.FC = () => {
  const navigate = useNavigate();
  const { authModalOpen, setAuthModalOpen, requireAuth, handleAuthSuccess } = useAuthGate();
  const [file, setFile] = useState<FileItem | null>(null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [successData, setSuccessData] = useState<{ isOpen: boolean; fileName: string; originalSize: number; finalSize: number } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      try {
        // Read file data immediately to prevent Android permission expiration
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

  const handleApply = async () => {
    if (!file || !text.trim()) return;

    requireAuth(async () => {
      if (!TaskLimitManager.canUseTask()) {
        setShowUpgradeModal(true);
        return;
      }

      setIsProcessing(true);
      try {
        const result = await addWatermark(file.file, text);
        const blob = new Blob([result as any], { type: 'application/pdf' });
        await downloadFile(blob, `stamped_${file.name}`);

        // Increment task counter
        TaskLimitManager.incrementTask();

        // Add to history
        FileHistoryManager.addEntry({
          fileName: file.name,
          operation: 'watermark',
          originalSize: file.size,
          status: 'success'
        });

        // Show success modal
        setSuccessData({
          isOpen: true,
          fileName: `stamped_${file.name}`,
          originalSize: file.size,
          finalSize: result.length
        });

        // Clear file deferred
      } catch (err) {
        alert('Error applying watermark');

        FileHistoryManager.addEntry({
          fileName: `watermark_failed_${file.name}`,
          operation: 'watermark',
          status: 'error'
        });
      } finally {
        setIsProcessing(false);
      }
    });
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
          <div className="text-technical">Secure Watermarking</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Watermark</h1>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Embed permanent marks to protect your document ownership</p>
          <div className="pt-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">No Watermarks: Pro Clean Output</span>
          </div>
        </div>

        <ToolGuide
          title="Ownership Signature Guide"
          description="Overlay proof-of-ownership on the document. Embed permanent watermarks to verify your document's authenticity."
          steps={[
            "Upload the PDF you want to watermark.",
            "Type your text (e.g., CONFIDENTIAL, DRAFT).",
            "Select a quick template for faster labeling.",
            "Tap 'Apply Watermark' to secure your file."
          ]}
          useCases={[
            "Brand Protection", "Status Labeling", "Intellectual Property Safeguarding", "Document Classification"
          ]}
        />

        {!file ? (
          <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 10 }}
              className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
            >
              <ImageIcon size={32} />
            </motion.div>
            <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Upload PDF for Watermarking</span>
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mt-2">Maximum 50MB PDF</span>
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
                <Settings2 size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black uppercase tracking-tighter truncate">{file.name}</h3>
                <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Awaiting Marker Input</p>
              </div>
              <button onClick={() => setFile(null)} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">Clear</button>
            </motion.div>

            <div className="monolith-card p-8 bg-black/5 dark:bg-white/5 border-none space-y-6">
              <div className="flex items-center gap-3">
                <Type size={14} className="text-black dark:text-white" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Marker Definition</h4>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="IDENTIFIER..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full h-16 px-6 bg-white dark:bg-black border-none rounded-2xl text-[11px] focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all font-black uppercase tracking-widest text-gray-900 dark:text-white shadow-inner"
                />

                <div className="flex gap-2">
                  {['DRAFT', 'CONFIDENTIAL', 'SAMPLE'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => setText(tag)}
                      className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${text === tag
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10'
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1"></div>

      <button
        disabled={!file || !text || isProcessing}
        onClick={handleApply}
        className={`w-full py-6 rounded-[28px] font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group shadow-2xl ${!file || !text || isProcessing
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
            <span>Apply Watermark & Share</span>
          </>
        )}
      </button>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="limit_reached"
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
      {successData && (
        <SuccessModal
          isOpen={successData.isOpen}
          onClose={() => {
            setSuccessData(null);
            setFile(null);
          }}
          operation="Brand Layer Synthesis"
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

export default WatermarkScreen;
