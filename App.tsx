import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import HomeScreen from './screens/HomeScreen';
import MergeScreen from './screens/MergeScreen';
import SplitScreen from './screens/SplitScreen';
import RemovePagesScreen from './screens/RemovePagesScreen';
import ImageToPdfScreen from './screens/ImageToPdfScreen';
import PricingScreen from './screens/PricingScreen';
import TextToPdfScreen from './screens/TextToPdfScreen';
import ScannerScreen from './screens/ScannerScreen';
import WatermarkScreen from './screens/WatermarkScreen';
import SignScreen from './screens/SignScreen';
import ViewScreen from './screens/ViewScreen';
import ExtractTextScreen from './screens/ExtractTextScreen';
import AISettingsScreen from './screens/AISettingsScreen';
import ReaderScreen from './screens/ReaderScreen';
import RotateScreen from './screens/RotateScreen';
import PageNumbersScreen from './screens/PageNumbersScreen';
import ExtractImagesScreen from './screens/ExtractImagesScreen';
import MetadataScreen from './screens/MetadataScreen';
import ToolsScreen from './screens/ToolsScreen';
import AntiGravityWorkspace from './screens/AntiGravityWorkspace';
import TableExtractorScreen from './screens/TableExtractorScreen';
import MyFilesScreen from './screens/MyFilesScreen';
import SmartRedactScreen from './screens/SmartRedactScreen';
import PrivacyManifestoScreen from './screens/PrivacyManifestoScreen';
import LandingPage from './screens/LandingPage';
import LegalScreen from './screens/LegalScreen';
import NeuralDiffScreen from './screens/NeuralDiffScreen';
import DataExtractorScreen from './screens/DataExtractorScreen';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import SystemBoot from './components/SystemBoot';
import AiPackNotification from './components/AiPackNotification';
import { getAiPackNotification, ackAiNotification, initSubscription } from './services/subscriptionService';

const App: React.FC = () => {
  const location = useLocation();
  const [isBooting, setIsBooting] = React.useState(!sessionStorage.getItem('boot_complete'));
  const [activeNotification, setActiveNotification] = React.useState<{ message: string; type: 'milestone' | 'warning' | 'exhausted' } | null>(null);

  // Sync with Supabase on mount
  React.useEffect(() => {
    initSubscription();
  }, []);

  // Global AI Notification Listener
  React.useEffect(() => {
    // Check on mount and on location change
    const checkNotification = () => {
      const notification = getAiPackNotification();
      if (notification) {
        setActiveNotification(notification);
      }
    };

    checkNotification();

    // Also poll occasionally or listen for storage events if needed
    const interval = setInterval(checkNotification, 2000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  React.useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
      document.documentElement.style.setProperty('--mouse-x', `${x}px`);
      document.documentElement.style.setProperty('--mouse-y', `${y}px`);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchstart', handleMove);
    window.addEventListener('touchmove', handleMove);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchstart', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, []);

  const isLandingPage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-transparent flex flex-col relative overflow-hidden max-w-md mx-auto shadow-2xl border-x border-slate-200 dark:border-[#1a1a1a]">
      {!isLandingPage && <Header />}
      <main className={`flex-1 ${isLandingPage ? '' : 'overflow-y-auto pb-20'} scroll-smooth bg-transparent`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Routes location={location}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/workspace" element={<HomeScreen />} />
              <Route path="/tools" element={<ToolsScreen />} />
              <Route path="/merge" element={<MergeScreen />} />
              <Route path="/split" element={<SplitScreen />} />
              <Route path="/remove-pages" element={<RemovePagesScreen />} />
              <Route path="/image-to-pdf" element={<ImageToPdfScreen />} />

              <Route path="/text-to-pdf" element={<TextToPdfScreen />} />
              <Route path="/scanner" element={<ScannerScreen />} />
              <Route path="/watermark" element={<WatermarkScreen />} />
              <Route path="/sign" element={<SignScreen />} />
              <Route path="/view" element={<ViewScreen />} />
              <Route path="/extract-text" element={<ExtractTextScreen />} />
              <Route path="/reader" element={<ReaderScreen />} />
              <Route path="/rotate" element={<RotateScreen />} />
              <Route path="/page-numbers" element={<PageNumbersScreen />} />
              <Route path="/extract-images" element={<ExtractImagesScreen />} />
              <Route path="/metadata" element={<MetadataScreen />} />
              <Route path="/ai-settings" element={<AISettingsScreen />} />
              <Route path="/ag-workspace" element={<AntiGravityWorkspace />} />
              <Route path="/table-extractor" element={<TableExtractorScreen />} />
              <Route path="/my-files" element={<MyFilesScreen />} />
              <Route path="/smart-redact" element={<SmartRedactScreen />} />
              <Route path="/manifesto" element={<PrivacyManifestoScreen />} />
              <Route path="/neural-diff" element={<NeuralDiffScreen />} />
              <Route path="/data-extractor" element={<DataExtractorScreen />} />
              <Route path="/pricing" element={<PricingScreen />} />
              <Route path="/legal/:type" element={<LegalScreen />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      {!isLandingPage && <BottomNav />}
      <AnimatePresence>
        {isBooting && (
          <SystemBoot
            onComplete={() => {
              setIsBooting(false);
              sessionStorage.setItem('boot_complete', 'true');
            }}
          />
        )}
      </AnimatePresence>

      <AiPackNotification
        message={activeNotification?.message || null}
        type={activeNotification?.type || null}
        onClose={() => {
          ackAiNotification();
          setActiveNotification(null);
        }}
      />
    </div>
  );
};

export default App;
