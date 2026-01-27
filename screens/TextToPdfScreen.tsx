
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Type, Share2, Loader2, AlignLeft, Bold } from 'lucide-react';
import { createPdfFromText } from '../services/pdfService';
import { downloadFile } from '../services/downloadService';
import ToolGuide from '../components/ToolGuide';
import TaskLimitManager from '../utils/TaskLimitManager';
import { useAuthGate } from '../hooks/useAuthGate';
import { AuthModal } from '../components/AuthModal';
import UpgradeModal from '../components/UpgradeModal';
import FileHistoryManager from '../utils/FileHistoryManager';
import SuccessModal from '../components/SuccessModal';
import { useNavigate } from 'react-router-dom';

const TextToPdfScreen: React.FC = () => {
  const navigate = useNavigate();
  const { authModalOpen, setAuthModalOpen, requireAuth, handleAuthSuccess } = useAuthGate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [successData, setSuccessData] = useState<{ isOpen: boolean; fileName: string; originalSize: number; finalSize: number } | null>(null);

  const handleGenerate = async () => {
    if (!title || !content) return;

    requireAuth(async () => {
      if (!TaskLimitManager.canUseTask()) {
        setShowUpgradeModal(true);
        return;
      }

      setIsProcessing(true);
      try {
        const result = await createPdfFromText(title, content);
        const fileName = `${title.replace(/\s+/g, '_')}.pdf`;
        const blob = new Blob([result as any], { type: 'application/pdf' });
        await downloadFile(blob, fileName);

        // Show success modal
        setSuccessData({
          isOpen: true,
          fileName,
          originalSize: content.length,
          finalSize: result.length
        });

        // Increment task count
        TaskLimitManager.incrementTask();

        // Record in history
        FileHistoryManager.addEntry({
          fileName,
          operation: 'merge', // or create-pdf
          originalSize: content.length,
          finalSize: result.length,
          status: 'success'
        });

        // Clear deferred
      } catch (err) {
        alert('Error generating PDF');
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
          <div className="text-technical">Available Tools / Text to PDF</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Draft</h1>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">Create a clean, professional PDF document from your plain text</p>
        </div>

        <ToolGuide
          title="How to create a PDF from text"
          description="Easily convert your notes, memos, or any typed text into a high-quality PDF. Just enter a title and your content, and we'll handle the rest."
          steps={[
            "Enter a Title for your document.",
            "Type or paste your text into the box provided.",
            "We format your text into a clean PDF layout.",
            "Tap 'Create PDF' to save and share your new file."
          ]}
          useCases={[
            "Rapid Memo Generation", "Saving Notes", "Creating Checklists", "Formal Documents"
          ]}
        />

        <div className="space-y-8 flex-1 flex flex-col">
          <div className="monolith-card p-8 bg-black/5 dark:bg-white/5 border-none shadow-xl flex-1 flex flex-col space-y-6">
            <div className="flex items-center gap-4 border-b border-black/5 dark:border-white/5 pb-4">
              <Bold size={14} className="text-gray-400" />
              <AlignLeft size={14} className="text-gray-400" />
              <div className="w-[2px] h-4 bg-black/10 dark:bg-white/10" />
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Document Editor</span>
            </div>

            <input
              type="text"
              placeholder="Document Title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-2xl font-black text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700 bg-transparent focus:outline-none uppercase tracking-tighter"
            />

            <textarea
              placeholder="Type your text here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full flex-1 text-[13px] text-gray-600 dark:text-gray-300 placeholder:text-gray-300 dark:placeholder:text-gray-700 bg-transparent focus:outline-none resize-none leading-relaxed font-medium min-h-[300px] custom-scrollbar"
            />
          </div>

          <button
            disabled={!title || !content || isProcessing}
            onClick={handleGenerate}
            className={`w-full py-6 rounded-[28px] font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group shadow-2xl ${!title || !content || isProcessing
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
                <span>Create & Share PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

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
          operation="PDF Creation"
          fileName={successData.fileName}
          originalSize={successData.originalSize}
          finalSize={successData.finalSize}
          onViewFiles={() => {
            setSuccessData(null);
            setTitle('');
            setContent('');
            navigate('/my-files');
          }}
          onClose={() => {
            setSuccessData(null);
            setTitle('');
            setContent('');
          }}
        />
      )}
    </motion.div>
  );
};

export default TextToPdfScreen;
