
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Zap, RefreshCw, FileCheck, Loader2, Sparkles, Wand2, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPolisherProtocol, ScanFilters } from '../services/polisherService';

const ScannerScreen: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<ScanFilters | null>(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied", err);
      }
    }
    setupCamera();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    setAppliedFilters(null);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      // Simulate premium processing delay
      setTimeout(() => {
        setCapturedImage(dataUrl);
        setIsCapturing(false);
      }, 800);
    } else {
      setIsCapturing(false);
    }
  };

  const handleNeuralEnhance = async () => {
    if (!capturedImage) return;
    setIsPolishing(true);
    try {
      // Pass the captured base64 image to Gemini for analysis
      const filters = await getPolisherProtocol(undefined, capturedImage);
      setAppliedFilters(filters);
    } catch (err) {
      console.error("Enhancement failed", err);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleDownload = () => {
    if (!capturedImage) return;
    const link = document.createElement('a');
    link.href = capturedImage;
    link.download = `scan_${Date.now()}.jpg`;
    link.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      {/* Header */}
      <div className="p-8 pb-4 flex justify-between items-center bg-black/80 backdrop-blur-xl border-b border-white/10 z-50">
        <button onClick={() => navigate(-1)} className="p-2 text-white hover:bg-white/10 rounded-xl transition-colors">
          <X size={24} />
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-500 font-black text-[8px] tracking-[0.3em] uppercase">Private • Offline Acquisition</span>
          </div>
          <span className="text-white font-black text-xs tracking-widest uppercase opacity-40">Scanner_v4.0_PRO</span>
        </div>
        <button onClick={() => setFlash(!flash)} className={`p-2 transition-all ${flash ? 'text-white' : 'text-white/30'}`}>
          <Zap size={22} fill={flash ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Viewport */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Guide Overlay */}
            <div className="absolute inset-10 border-2 border-white/30 rounded-3xl pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm">
                  Align Document
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center p-6">
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                filter: appliedFilters
                  ? `brightness(${appliedFilters.brightness}%) contrast(${appliedFilters.contrast}%) grayscale(${appliedFilters.grayscale}%) saturate(${appliedFilters.grayscale > 50 ? 0 : 100}%)`
                  : 'none'
              }}
              src={capturedImage}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-all duration-700"
            />
            {appliedFilters && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-10 left-10 right-10 bg-emerald-500/90 backdrop-blur-md p-4 rounded-2xl flex items-center gap-4 text-white shadow-2xl"
              >
                <div className="p-2 bg-white/20 rounded-xl">
                  <Sparkles size={16} />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-black uppercase tracking-widest block">Neural Polish Applied</span>
                  <span className="text-[8px] font-black opacity-70 uppercase tracking-wider">{appliedFilters.reason}</span>
                </div>
                <button
                  onClick={() => setAppliedFilters(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}

            {isPolishing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
              >
                <Loader2 className="animate-spin text-white" size={32} />
                <span className="text-white font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Analyzing Lighting...</span>
              </motion.div>
            )}
          </div>
        )}

        <AnimatePresence>
          {isCapturing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center gap-4"
            >
              <Loader2 className="animate-spin text-violet-600" size={48} />
              <p className="text-slate-900 font-black text-xs uppercase tracking-widest">Enhancing Scan...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="p-12 bg-black/90 backdrop-blur-2xl flex items-center justify-around border-t border-white/10">
        {!capturedImage ? (
          <>
            <div className="w-12" />
            <button
              onClick={handleCapture}
              className="w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center group active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)]"
            >
              <div className="w-20 h-20 rounded-full bg-white group-hover:scale-90 transition-all flex items-center justify-center shadow-2xl">
                <div className="w-18 h-18 rounded-full border border-black/10" />
              </div>
            </button>
            <button className="text-white/40 hover:text-white transition-colors">
              <RefreshCw size={24} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setCapturedImage(null)}
              className="flex flex-col items-center gap-3 text-white/40 hover:text-white transition-all transform hover:-rotate-12"
            >
              <div className="p-4 bg-white/5 rounded-2xl">
                <RefreshCw size={20} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest">Reset Scan</span>
            </button>

            {!appliedFilters ? (
              <button
                onClick={handleNeuralEnhance}
                disabled={isPolishing}
                className="h-20 px-8 bg-violet-600 rounded-3xl flex items-center gap-4 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Wand2 size={20} className={isPolishing ? 'animate-spin' : ''} />
                <span className="font-black text-[10px] uppercase tracking-[0.3em]">Neural Enhance</span>
              </button>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={handleDownload}
                  className="h-20 px-6 bg-white/10 rounded-3xl flex flex-col items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
                >
                  <Download size={20} />
                  <span className="text-[7px] font-black uppercase tracking-[0.2em] mt-2">Quick JPEG</span>
                </button>

                <button
                  onClick={() => navigate('/image-to-pdf', { state: { capturedImage } })}
                  className="h-20 px-10 bg-white rounded-3xl flex flex-col items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <FileCheck size={20} />
                    <span className="font-black text-[10px] uppercase tracking-[0.3em]">Assemble PDF</span>
                  </div>
                  <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-40 mt-1">Handoff to Compile</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default ScannerScreen;
