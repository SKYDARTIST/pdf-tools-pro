
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { PenTool, Share2, Loader2, FileUp, Eraser, CheckCircle2, Bookmark, Stamp as StampIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ToolGuide from '../components/ToolGuide';
import TaskLimitManager from '../utils/TaskLimitManager';
import UpgradeModal from '../components/UpgradeModal';
import FileHistoryManager from '../utils/FileHistoryManager';
import SuccessModal from '../components/SuccessModal';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { downloadFile } from '../services/downloadService';

const STAMPS = [
  { id: 'approved', label: 'APPROVED', color: '#10b981' },
  { id: 'confidential', label: 'CONFIDENTIAL', color: '#ef4444' },
  { id: 'urgent', label: 'URGENT', color: '#f59e0b' },
  { id: 'draft', label: 'DRAFT', color: '#6366f1' },
];

const SignScreen: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [successData, setSuccessData] = useState<{ isOpen: boolean; fileName: string; originalSize: number; finalSize: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsSigned(true);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setIsSigned(false);
    }
  };

  const handleFinish = async () => {
    if (!file || !canvasRef.current) return;

    if (!TaskLimitManager.canUseTask()) {
      setShowUpgradeModal(true);
      return;
    }

    setIsProcessing(true);
    try {
      // Get signature as image with white background
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Create a new canvas with white background
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Fill with white background
      tempCtx.fillStyle = 'white';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      // Draw the signature on top
      tempCtx.drawImage(canvas, 0, 0);

      // Convert to PNG
      const signatureDataUrl = tempCanvas.toDataURL('image/png');

      // Convert signature to blob
      const signatureBlob = await (await fetch(signatureDataUrl)).blob();

      // Load PDF and add signature
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // Embed signature image
      const signatureImage = await pdfDoc.embedPng(await signatureBlob.arrayBuffer());
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // Add signature to bottom right of first page (larger and more visible)
      const { width, height } = firstPage.getSize();
      const signatureWidth = 150; // Increased from 100 for better visibility
      const signatureHeight = (signatureImage.height / signatureImage.width) * signatureWidth;

      firstPage.drawImage(signatureImage, {
        x: width - signatureWidth - 30,
        y: 30,
        width: signatureWidth,
        height: signatureHeight,
        opacity: 1.0, // Fully opaque
      });

      // Add Stamp if selected
      if (selectedStamp) {
        const stamp = STAMPS.find(s => s.id === selectedStamp);
        if (stamp) {
          const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
          const fontSize = 40;
          const text = stamp.label;
          const textWidth = font.widthOfTextAtSize(text, fontSize);

          // Convert hex to rgb
          const r = parseInt(stamp.color.slice(1, 3), 16) / 255;
          const g = parseInt(stamp.color.slice(3, 5), 16) / 255;
          const b = parseInt(stamp.color.slice(5, 7), 16) / 255;

          firstPage.drawRectangle({
            x: 50,
            y: height - 100,
            width: textWidth + 40,
            height: 60,
            borderColor: rgb(r, g, b),
            borderWidth: 4,
            rotate: degrees(15),
          });

          firstPage.drawText(text, {
            x: 70,
            y: height - 85,
            size: fontSize,
            font: font,
            color: rgb(r, g, b),
            rotate: degrees(15),
          });
        }
      }

      // Save and download
      const pdfBytes = await pdfDoc.save();
      const fileName = `signed_${file.name}`;
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      await downloadFile(blob, fileName);

      // Increment task counter
      TaskLimitManager.incrementTask();

      // Add to history
      FileHistoryManager.addEntry({
        fileName,
        operation: 'sign',
        originalSize: file.size,
        finalSize: pdfBytes.length,
        status: 'success'
      });

      // Reset and navigate
      // Show success modal
      setSuccessData({
        isOpen: true,
        fileName,
        originalSize: file.size,
        finalSize: pdfBytes.length
      });

      setIsProcessing(false);
    } catch (error) {
      console.error('Error signing PDF:', error);
      alert('Error applying signature: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
          <div className="text-technical">Protocol Assets / Digital Authorization</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Sign</h1>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Apply unique biometric data markers to verify asset ownership</p>
        </div>

        <ToolGuide
          title="Identity Verification Protocol"
          description="Authenticate the carrier with a personal signature. Embed persistent biometric markers and status stamps."
          steps={[
            "Initialize the authorization by uploading a PDF carrier.",
            "Capture your biometric signature on the digital canvas.",
            "Apply Neural Stamps for additional status markers (DRAFT, URGENT, etc).",
            "Execute Authorization to embed the markers onto the document layer."
          ]}
          useCases={[
            "Contract Execution", "Approval Workflows", "Official Authentications", "Personal Validation"
          ]}
        />

        {!file ? (
          <label className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed border-black/10 dark:border-white/10 rounded-[40px] bg-black/5 dark:bg-white/5 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 15 }}
              className="w-20 h-20 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center shadow-2xl mb-6"
            >
              <PenTool size={32} />
            </motion.div>
            <span className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Initialize Authorization</span>
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
                <FileUp size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black uppercase tracking-tighter truncate">{file.name}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Awaiting Identity Input</p>
              </div>
              <button onClick={() => setFile(null)} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">Clear</button>
            </motion.div>

            <div className="monolith-card p-6 bg-black/5 dark:bg-white/5 border-none space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Eraser size={14} className="text-black dark:text-white" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Identity Capture</h4>
                </div>
                <button onClick={clearCanvas} className="text-[10px] font-black uppercase tracking-widest text-rose-500 px-3 py-1 bg-rose-500/10 rounded-lg">Reset</button>
              </div>
              <div className="bg-white/50 dark:bg-black/50 rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden touch-none relative h-48">
                <canvas
                  ref={canvasRef}
                  width={350}
                  height={192}
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseMove={draw}
                  onTouchStart={startDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                  className="w-full h-full cursor-crosshair invert dark:invert-0"
                />
                {!isSigned && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-black dark:text-white">Authorization Required</p>
                  </div>
                )}
              </div>
            </div>

            <div className="monolith-card p-6 bg-black/5 dark:bg-white/5 border-none space-y-6">
              <div className="flex items-center gap-3">
                <StampIcon size={14} className="text-black dark:text-white" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Neural Stamps Protocol</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {STAMPS.map((stamp) => (
                  <button
                    key={stamp.id}
                    onClick={() => setSelectedStamp(selectedStamp === stamp.id ? null : stamp.id)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${selectedStamp === stamp.id
                      ? 'bg-white dark:bg-white/10 border-black dark:border-white'
                      : 'bg-white/50 dark:bg-black/50 border-transparent hover:border-black/20 dark:hover:border-white/20'
                      }`}
                  >
                    <div className="text-[10px] font-black tracking-tighter" style={{ color: stamp.color }}>{stamp.label}</div>
                    <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Status Marker</div>
                    {selectedStamp === stamp.id && (
                      <div className="absolute top-1 right-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center gap-4 text-emerald-500">
              <CheckCircle2 size={18} />
              <p className="text-[9px] font-black uppercase tracking-[0.2em]">End-to-end encrypted identity capture active</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1"></div>

      <button
        disabled={!file || !isSigned || isProcessing}
        onClick={handleFinish}
        className={`w-full py-6 rounded-[28px] font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group shadow-2xl ${!file || !isSigned || isProcessing
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
            <span>Authorize & Share PDF</span>
          </>
        )}
      </button>

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
            clearCanvas();
          }}
          operation="Digital Signature"
          fileName={successData.fileName}
          originalSize={successData.originalSize}
          finalSize={successData.finalSize}
          onViewFiles={() => {
            setSuccessData(null);
            setFile(null);
            clearCanvas();
            navigate('/my-files');
          }}
        />
      )}
    </motion.div>
  );
};

export default SignScreen;
