
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, FileUp, Download, Loader2, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { downloadBlob, repairPdf } from '../services/pdfService';
import FileHistoryManager from '../utils/FileHistoryManager';
import SuccessModal from '../components/SuccessModal';
import { useNavigate } from 'react-router-dom';

const RepairScreen: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [repaired, setRepaired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    fileName: string;
    originalSize: number;
    finalSize: number;
  } | null>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setRepaired(false);
      setError(null);
    }
  };

  const handleRepair = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const repairedBytes = await repairPdf(file);
      const fileName = `repaired_${file.name}`;
      downloadBlob(repairedBytes, fileName, 'application/pdf');

      // Record in history
      FileHistoryManager.addEntry({
        fileName,
        operation: 'repair',
        originalSize: file.size,
        finalSize: repairedBytes.length,
        status: 'success'
      });

      // Prepare success data for modal
      setSuccessData({
        fileName,
        originalSize: file.size,
        finalSize: repairedBytes.length
      });

      setRepaired(true);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("Restoration Failed:", err);
      setError("System Handshake Failed: The internal data of this PDF is too fragmented to recover in a browser environment.");

      FileHistoryManager.addEntry({
        fileName: `repair_failed_${file.name}`,
        operation: 'repair',
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
          <div className="text-technical">Protocol Assets / System Integrity</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Repair</h1>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Restore internal cross-reference integrity and optimize structure</p>
        </div>

        <div className="flex-1 space-y-6">
          {!file ? (
            <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 15 }}
                className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
              >
                <Wrench size={32} />
              </motion.div>
              <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Initialize Recovery</span>
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
                  <Wrench size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black uppercase tracking-tighter truncate">{file.name}</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Awaiting Deep Scan</p>
                </div>
                <button onClick={() => setFile(null)} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">Clear</button>
              </motion.div>

              <div className="monolith-card p-6 bg-black/5 dark:bg-white/5 border-none space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={16} className="text-black dark:text-white" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Deep Scan Engine</h4>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed font-bold uppercase tracking-tight">
                  Protocol: Strip legacy metadata, reconstruct broken XREF tables, and normalize linearized structure for high-speed transmission.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {repaired && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center gap-4 text-emerald-500">
            <CheckCircle2 size={18} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Data Integrity Restored. Optimized carrier ready.</p>
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center gap-4 text-rose-500">
            <X size={18} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        disabled={!file || isProcessing}
        onClick={handleRepair}
        className={`w-full py-6 rounded-[28px] font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group shadow-2xl ${!file || isProcessing
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
            <Download size={20} />
            <span>Execute Restoration</span>
          </>
        )}
      </button>

      {/* Success Modal */}
      {successData && (
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          operation="Repair Assets"
          fileName={successData.fileName}
          originalSize={successData.originalSize}
          finalSize={successData.finalSize}
          onViewFiles={() => {
            setShowSuccessModal(false);
            navigate('/my-files');
          }}
        />
      )}
    </motion.div>
  );
};

export default RepairScreen;
