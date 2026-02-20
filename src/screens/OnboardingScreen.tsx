import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Zap, ChevronRight, Sparkles,
  GitMerge, Scissors, Image as ImageIcon, Eye, Shield
} from 'lucide-react';
import billingService from '@/services/billingService';

const PRICE_CACHE_KEY = 'ag_lifetime_price_cache';

const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const cachedPrice = localStorage.getItem(PRICE_CACHE_KEY);
  const [localPrice, setLocalPrice] = useState<string | null>(cachedPrice);

  useEffect(() => {
    // Fetch regional pricing
    billingService.getProducts().then(products => {
      const lifetime = products.find(p =>
        p.identifier === 'lifetime_pro_access' || p.identifier === 'pro_access_lifetime'
      );
      if (lifetime?.price) {
        setLocalPrice(lifetime.price);
        localStorage.setItem(PRICE_CACHE_KEY, lifetime.price);
      }
    }).catch(() => {/* keep cached or fallback price */});
  }, []);

  const handleComplete = () => {
    localStorage.setItem('ag_onboarding_shown', 'true');
    navigate('/'); // Go to Landing Page
  };

  const handleSkip = () => {
    localStorage.setItem('ag_onboarding_shown', 'true');
    navigate('/workspace'); // Skip to workspace
  };

  const slides = [
    {
      id: 'welcome',
      component: (
        <div className="flex flex-col items-center justify-center h-full space-y-12 px-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            className="w-32 h-32 rounded-[40px] bg-gradient-to-br from-black to-gray-800 dark:from-white dark:to-gray-200 flex items-center justify-center shadow-2xl"
          >
            <Zap size={64} className="text-white dark:text-black" fill="currentColor" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center space-y-4"
          >
            <h1 className="text-6xl font-black tracking-tighter uppercase text-gray-900 dark:text-white leading-none">
              Anti-Gravity
            </h1>
            <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-[0.3em]">
              All-in-One PDF Toolkit
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentSlide(1)}
            className="px-12 py-5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-full text-sm font-black uppercase tracking-widest shadow-2xl flex items-center gap-3"
          >
            Get Started
            <ChevronRight size={20} />
          </motion.button>
        </div>
      )
    },
    {
      id: 'free-tools',
      component: (
        <div className="flex flex-col items-center justify-center h-full space-y-12 px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-3"
          >
            <h2 className="text-4xl font-black tracking-tighter uppercase text-gray-900 dark:text-white">
              5 Free Tools
            </h2>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.3em]">
              No sign-in required
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-6 max-w-md">
            {[
              { icon: GitMerge, label: 'Merge PDFs', delay: 0.3 },
              { icon: Scissors, label: 'Split PDFs', delay: 0.4 },
              { icon: Zap, label: 'Scan Docs', delay: 0.5 },
              { icon: ImageIcon, label: 'Image→PDF', delay: 0.6 },
              { icon: Eye, label: 'PDF Viewer', delay: 0.7 }
            ].map((tool, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: tool.delay, type: "spring" }}
                className="flex flex-col items-center gap-3 p-6 rounded-3xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#00C896]/10 flex items-center justify-center">
                  <tool.icon size={24} className="text-[#00C896]" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tight text-center text-gray-900 dark:text-white">
                  {tool.label}
                </span>
              </motion.div>
            ))}
          </div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentSlide(2)}
            className="px-12 py-5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-full text-sm font-black uppercase tracking-widest shadow-2xl flex items-center gap-3"
          >
            Next
            <ChevronRight size={20} />
          </motion.button>
        </div>
      )
    },
    {
      id: 'pricing',
      component: (
        <div className="flex flex-col items-center justify-center h-full space-y-12 px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-3"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles size={32} className="text-[#00C896]" />
              <h2 className="text-4xl font-black tracking-tighter uppercase text-gray-900 dark:text-white">
                Pro & Neural
              </h2>
            </div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.3em]">
              Unlock advanced features
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="max-w-md w-full p-8 rounded-[40px] border-2 border-[#00C896]/30 bg-gradient-to-br from-[#00C896]/5 to-transparent"
          >
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="text-5xl font-black text-gray-900 dark:text-white">
                  {localPrice || '...'}
                </div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.3em]">
                  One-time payment • Lifetime access
                </p>
              </div>

              <div className="space-y-3">
                {[
                  'Sign & Watermark PDFs',
                  'AI Reader with Chat',
                  'Smart Document Compare',
                  'Extract & Redact Data',
                  '15+ More Pro Tools'
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#00C896]/20 flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 rounded-full bg-[#00C896]" />
                    </div>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="flex items-center gap-2 p-4 rounded-2xl bg-gray-100 dark:bg-white/5"
              >
                <Shield size={20} className="text-[#00C896]" />
                <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  All processing happens on your device • Zero uploads
                </p>
              </motion.div>
            </div>
          </motion.div>

          <div className="flex gap-4">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSkip}
              className="px-8 py-4 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white rounded-full text-sm font-black uppercase tracking-widest"
            >
              Skip
            </motion.button>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleComplete}
              className="px-12 py-4 bg-[#00C896] text-white rounded-full text-sm font-black uppercase tracking-widest shadow-2xl flex items-center gap-3"
            >
              See Pro
              <ChevronRight size={20} />
            </motion.button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00C896]/5 via-transparent to-transparent pointer-events-none" />

      {/* Content */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
            className="w-full h-full"
          >
            {slides[currentSlide].component}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentSlide
                ? 'w-8 bg-gray-900 dark:bg-white'
                : 'w-2 bg-gray-300 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default OnboardingScreen;
