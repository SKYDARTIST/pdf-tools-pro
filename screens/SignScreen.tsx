
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { PenTool, Download, Loader2, FileUp, Eraser, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SignScreen: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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
      const { PDFDocument } = await import('pdf-lib');
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

      // Save and download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `signed_${file.name}`;
      link.click();
      window.URL.revokeObjectURL(url);

      // Reset and navigate
      setTimeout(() => {
        setIsProcessing(false);
        setFile(null);
        clearCanvas();
        navigate('/');
      }, 500);
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
            <Download size={18} strokeWidth={3} />
            <span>Execute Authorization</span>
          </>
        )}
      </button>
    </motion.div>
  );
};

export default SignScreen;
