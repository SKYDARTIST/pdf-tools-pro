
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Zap, RefreshCw, FileCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ScannerScreen: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

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
    setIsCapturing(true);
    // Simulate smart cropping and processing
    setTimeout(() => {
      setCapturedImage("https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=1000&auto=format&fit=crop");
      setIsCapturing(false);
    }, 1200);
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
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={capturedImage}
            className="w-full h-full object-contain p-6"
          />
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
            <button
              onClick={() => navigate('/image-to-pdf')}
              className="h-20 px-10 bg-white rounded-3xl flex flex-col items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
              <div className="flex items-center gap-4">
                <FileCheck size={20} />
                <span className="font-black text-[10px] uppercase tracking-[0.3em]">Save to Local Device</span>
              </div>
              <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-40 mt-1">Zero Cloud Upload Required</span>
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default ScannerScreen;
