import React, { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';


// Critical screens - loaded immediately
import LandingPage from '@/screens/LandingPage';
import HomeScreen from '@/screens/HomeScreen';

// Lazy loaded tool screens
const MergeScreen = lazy(() => import('@/screens/MergeScreen'));
const SplitScreen = lazy(() => import('@/screens/SplitScreen'));
const RemovePagesScreen = lazy(() => import('@/screens/RemovePagesScreen'));
const ImageToPdfScreen = lazy(() => import('@/screens/ImageToPdfScreen'));
const PricingScreen = lazy(() => import('@/screens/PricingScreen'));
const TextToPdfScreen = lazy(() => import('@/screens/TextToPdfScreen'));
const ScannerScreen = lazy(() => import('@/screens/ScannerScreen'));
const WatermarkScreen = lazy(() => import('@/screens/WatermarkScreen'));
const SignScreen = lazy(() => import('@/screens/SignScreen'));
const PdfToImagesScreen = lazy(() => import('@/screens/PdfToImagesScreen'));
const ReorderPagesScreen = lazy(() => import('@/screens/ReorderPagesScreen'));
const ViewScreen = lazy(() => import('@/screens/ViewScreen'));
const ExtractTextScreen = lazy(() => import('@/screens/ExtractTextScreen'));
const AISettingsScreen = lazy(() => import('@/screens/AISettingsScreen'));
const ReaderScreen = lazy(() => import('@/screens/ReaderScreen'));
const RotateScreen = lazy(() => import('@/screens/RotateScreen'));
const PageNumbersScreen = lazy(() => import('@/screens/PageNumbersScreen'));
const ExtractImagesScreen = lazy(() => import('@/screens/ExtractImagesScreen'));
const ToolsScreen = lazy(() => import('@/screens/ToolsScreen'));
const AntiGravityWorkspace = lazy(() => import('@/screens/AntiGravityWorkspace'));
const TableExtractorScreen = lazy(() => import('@/screens/TableExtractorScreen'));
const MyFilesScreen = lazy(() => import('@/screens/MyFilesScreen'));
const SmartRedactScreen = lazy(() => import('@/screens/SmartRedactScreen'));
const PrivacyManifestoScreen = lazy(() => import('@/screens/PrivacyManifestoScreen'));
const LegalScreen = lazy(() => import('@/screens/LegalScreen'));
const NeuralDiffScreen = lazy(() => import('@/screens/NeuralDiffScreen'));
const DataExtractorScreen = lazy(() => import('@/screens/DataExtractorScreen'));
const ProtocolGuideScreen = lazy(() => import('@/screens/ProtocolGuideScreen'));
const GoogleAuthCallback = lazy(() => import('@/screens/GoogleAuthCallback'));
const LoginScreen = lazy(() => import('@/screens/LoginScreen'));
const AdminDashboard = lazy(() => import('@/screens/AdminDashboard'));
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import SystemBoot from '@/components/SystemBoot';

import NeuralAssistant from '@/components/NeuralAssistant';
import PullToRefresh from '@/components/PullToRefresh';
import { initSubscription } from '@/services/subscriptionService';
import { initServerTime } from '@/services/serverTimeService';
// Add retry for failed syncs
import { retryFailedSyncs } from '@/services/usageService';
import BillingService from '@/services/billingService';
const DebugLogPanel = lazy(() => import('@/components/DebugLogPanel'));
import Config from '@/services/configService';
import { initializePersistentLogging } from '@/utils/logger';
import { Filesystem } from '@capacitor/filesystem';
import { useNavigate } from 'react-router-dom';

import ProtectedRoute from '@/components/ProtectedRoute';
import { getCurrentUser } from '@/services/googleAuthService';
import { App as CapApp } from '@capacitor/app';
import Analytics from '@/services/analyticsService';

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isBooting, setIsBooting] = React.useState(!sessionStorage.getItem('boot_complete'));

  const [debugPanelOpen, setDebugPanelOpen] = React.useState(false);

  // Auto-flush analytics when app goes to background
  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        Analytics.flush();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // SECURITY & ROUTING: Catch mobile deep links with OAuth credentials
  // On web, HashRouter handles auth-callback route naturally
  React.useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    const currentLoc = window.location;

    if (!isNative) return; // Skip on web - HashRouter handles it

    // Check if we have OAuth credentials in the URL (from deep link)
    const hasToken = currentLoc.hash.includes('access_token=') || currentLoc.hash.includes('id_token=');
    const hasCode = currentLoc.search.includes('code=');

    // MOBILE ONLY: Normalize deep link to HashRouter path
    if ((hasToken || hasCode) && !currentLoc.hash.startsWith('#/auth-callback')) {
      console.log('📱 App: Normalizing mobile OAuth deep link...');
      navigate('/auth-callback' + currentLoc.search + currentLoc.hash.replace(/^#/, ''), { replace: true });
    }
  }, [navigate]);

  const [isDataReady, setIsDataReady] = React.useState(false);
  const [bootAnimFinished, setBootAnimFinished] = React.useState(false);

  // Sync with Supabase and fetch server time on mount
  React.useEffect(() => {
    const init = async () => {
      try {
        // Initialize logging and server time in parallel
        initializePersistentLogging();
        initServerTime();

        // BLOCKING (with timeout): Start subscription fetch to prevent tier flash
        console.log('🚀 App: Starting subscription sync...');
        await initSubscription().catch(e => console.warn('Non-critical subscription sync failed:', e));

        // Background retry failed syncs
        retryFailedSyncs().catch(e => console.warn('Retry failed syncs error:', e));

        console.log('🚀 App: Initialization complete (Optimized)');
      } catch (e) {
        console.error('🚀 App: Initialization error:', e);
      } finally {
        // Render UI immediately
        setIsDataReady(true);
      }
    };

    init();
  }, []);

  // Coordinated Boot Sequence: Wait for BOTH Data + Animation
  React.useEffect(() => {
    if (isDataReady && (bootAnimFinished || !isBooting)) {
      // Only run this logic once when everything is ready
      if (isBooting) {
        setIsBooting(false);
        sessionStorage.setItem('boot_complete', 'true');

        // Trigger post-boot actions
        console.log('🚀 App: Boot sequence finished - triggering purchase restore...');
        BillingService.syncPurchasesWithState().catch(error => {
          console.error('🚀 App: Deferred purchase restore error:', error);
        });

        // Phase 4 Check
        import('@/services/subscriptionService').then(({ checkPostPurchaseStatus }) => {
          checkPostPurchaseStatus();
        });
      }
    }
  }, [isDataReady, bootAnimFinished, isBooting]);

  // Mobile Compatibility: Handle Custom Scheme Deep Links
  React.useEffect(() => {
    const handleUrl = (url: string) => {
      if (url.includes('com.cryptobulla.antigravity')) {
        // WHITELIST VALIDATION: Prevent unauthorized navigation via deep links
        const WHITELIST_ROUTES = [
          'workspace', 'tools', 'merge', 'split', 'remove-pages',
          'image-to-pdf', 'text-to-pdf', 'scanner', 'watermark',
          'sign', 'view', 'extract-text', 'reader', 'rotate',
          'page-numbers', 'extract-images', 'ai-settings',
          'ag-workspace', 'table-extractor', 'my-files',
          'smart-redact', 'neural-diff', 'data-extractor',
          'pdf-to-images', 'reorder-pages', 'auth-callback'
        ];

        // SPLIT STRATEGY: Handle both 'com.cryptobulla.antigravity:/' and 'com.cryptobulla.antigravity://'
        let slug = '';
        if (url.includes('com.cryptobulla.antigravity://')) {
          slug = url.split('com.cryptobulla.antigravity://').pop() || '';
        } else {
          slug = url.split('com.cryptobulla.antigravity:/').pop() || '';
        }

        if (slug) {
          const target = slug.startsWith('/') ? slug.substring(1) : slug;
          const cleanSlug = target.split(/[?#]/)[0]; // Remove query/hash for validation

          if (WHITELIST_ROUTES.includes(cleanSlug)) {
            console.log('🔗 Deep Link Verified:', cleanSlug);
            navigate('/' + target, { replace: true });
          } else {
            console.warn('🛡️ Security: Blocked unauthorized deep link:', cleanSlug);
          }
        }
      }
    };

    // Capacitor App Plugin Listener (Industry Standard)
    CapApp.addListener('appUrlOpen', (data: any) => {
      handleUrl(data.url);
    });

    // Fallback for some environments
    const handleAppUrl = (e: any) => handleUrl(e.detail?.url || e.url);
    window.addEventListener('appUrlOpen', handleAppUrl);

    if (Capacitor.isNativePlatform()) {
      const meta = document.createElement('meta');
      meta.name = 'google-signin-disable-fedcm';
      meta.content = 'true';
      document.head.appendChild(meta);
    }
    return () => {
      window.removeEventListener('appUrlOpen', handleAppUrl);
    };
  }, [navigate]);

  // P1 FIX: Auto-reconcile subscription tier when app comes to foreground
  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return; // Skip on web

    const handleAppStateChange = (state: any) => {
      if (state.isActive) {
        console.log('🔄 App: Resumed from background, reconciling subscription tier...');

        // Dynamically import to avoid circular dependencies
        import('@/services/subscriptionService')
          .then(({ reconcileSubscriptionDrift }) => {
            reconcileSubscriptionDrift()
              .catch(error => {
                console.warn('🔄 App: Subscription reconciliation failed:', error);
              });
          })
          .catch(error => {
            console.error('🔄 App: Failed to import subscription service:', error);
          });
      }
    };

    const listenerPromise = CapApp.addListener('appStateChange', handleAppStateChange);
    return () => {
      listenerPromise.then(handle => handle.remove());
    };
  }, []);





  // PERFORMANCE: Throttled mouse/touch tracking to prevent excessive reflows
  React.useEffect(() => {
    let lastUpdate = 0;
    const throttleMs = 16; // Max 60fps (1000ms / 60fps = 16.67ms)

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const now = Date.now();
      if (now - lastUpdate < throttleMs) return; // Skip if too soon
      lastUpdate = now;

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

  // 5-tap to open debug logs (prevents accidental triggers)
  const tapCountRef = React.useRef(0);
  React.useEffect(() => {
    let tapTimeout: NodeJS.Timeout;

    const handleTap = () => {
      tapCountRef.current += 1;
      clearTimeout(tapTimeout);

      if (tapCountRef.current === 5) {
        // SECURITY: Only allow admins to open the debug panel
        getCurrentUser().then(user => {
          if (user && Config.VITE_ADMIN_UIDS.includes(user.google_uid)) {
            setDebugPanelOpen(true);
          } else if (!import.meta.env.PROD) {
            // In development, allow it anyway for convenience
            setDebugPanelOpen(true);
          }
        });
        tapCountRef.current = 0;
      }

      tapTimeout = setTimeout(() => {
        tapCountRef.current = 0;
      }, 1000);
    };

    window.addEventListener('click', handleTap);
    return () => {
      window.removeEventListener('click', handleTap);
      clearTimeout(tapTimeout);
    };
  }, []);

  // Neural Direct-Share Listener
  React.useEffect(() => {
    const handleSharedFile = async (e: any) => {
      const { path, type } = e.detail;
      try {
        const fileData = await Filesystem.readFile({
          path: path
        });

        // Convert to Blob/File for compatibility with existing tools
        const blob = await (await fetch(`data:${type};base64,${fileData.data}`)).blob();
        const file = new File([blob], path.split('/').pop() || 'shared_asset', { type });

        if (type.includes('pdf')) {
          navigate('/reader', { state: { sharedFile: file } });
        } else if (type.includes('image')) {
          navigate('/scanner', { state: { sharedFile: file } });
        }
      } catch (err) {
        console.error('Neural Share Error:', err);
      }
    };

    window.addEventListener('neuralSharedFile', handleSharedFile);
    return () => window.removeEventListener('neuralSharedFile', handleSharedFile);
  }, [navigate]);

  const handleGlobalRefresh = async () => {
    // Artificial delay for neural synchronization feel
    await new Promise(resolve => setTimeout(resolve, 800));
    window.location.reload();
  };

  const isLandingPage = location.pathname === '/';

  // SAFETY: If data is not ready and not booting (e.g. refresh), show empty or loader
  // This prevents the "flash of free tier" on refresh
  if (!isDataReady && !isBooting) {
    return <div className="min-h-screen bg-black" />; // Or a spinner
  }

  // Provider removed: Google Login now handled via manual OAuth redirect in AuthModal
  return (

    <div className="min-h-screen bg-transparent flex flex-col relative overflow-hidden">
      {!isLandingPage && <Header />}
      <main className={`flex-1 ${isLandingPage ? '' : 'overflow-y-auto pb-20'} scroll-smooth bg-transparent`}>
        <PullToRefresh onRefresh={handleGlobalRefresh}>
          <AnimatePresence>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1, ease: "linear" }}
            >
              <Suspense fallback={null}>
                <Routes location={location}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginScreen />} />
                  {/* Free tools — no login required */}
                  <Route path="/workspace" element={<HomeScreen />} />
                  <Route path="/tools" element={<ToolsScreen />} />
                  <Route path="/merge" element={<MergeScreen />} />
                  <Route path="/split" element={<SplitScreen />} />
                  <Route path="/image-to-pdf" element={<ImageToPdfScreen />} />
                  <Route path="/scanner" element={<ScannerScreen />} />
                  <Route path="/view" element={<ViewScreen />} />
                  <Route path="/my-files" element={<MyFilesScreen />} />

                  {/* AI & Pro tools — sign in required */}
                  <Route path="/reader" element={<ProtectedRoute><ReaderScreen /></ProtectedRoute>} />
                  <Route path="/remove-pages" element={<ProtectedRoute><RemovePagesScreen /></ProtectedRoute>} />
                  <Route path="/text-to-pdf" element={<ProtectedRoute><TextToPdfScreen /></ProtectedRoute>} />
                  <Route path="/watermark" element={<ProtectedRoute><WatermarkScreen /></ProtectedRoute>} />
                  <Route path="/sign" element={<ProtectedRoute><SignScreen /></ProtectedRoute>} />
                  <Route path="/pdf-to-images" element={<ProtectedRoute><PdfToImagesScreen /></ProtectedRoute>} />
                  <Route path="/reorder-pages" element={<ProtectedRoute><ReorderPagesScreen /></ProtectedRoute>} />
                  <Route path="/extract-text" element={<ProtectedRoute><ExtractTextScreen /></ProtectedRoute>} />
                  <Route path="/rotate" element={<ProtectedRoute><RotateScreen /></ProtectedRoute>} />
                  <Route path="/page-numbers" element={<ProtectedRoute><PageNumbersScreen /></ProtectedRoute>} />
                  <Route path="/extract-images" element={<ProtectedRoute><ExtractImagesScreen /></ProtectedRoute>} />
                  <Route path="/ai-settings" element={<ProtectedRoute><AISettingsScreen /></ProtectedRoute>} />
                  <Route path="/ag-workspace" element={<AntiGravityWorkspace />} />
                  <Route path="/table-extractor" element={<ProtectedRoute><TableExtractorScreen /></ProtectedRoute>} />
                  <Route path="/smart-redact" element={<ProtectedRoute><SmartRedactScreen /></ProtectedRoute>} />
                  <Route path="/manifesto" element={<PrivacyManifestoScreen />} />
                  <Route path="/neural-diff" element={<ProtectedRoute><NeuralDiffScreen /></ProtectedRoute>} />
                  <Route path="/data-extractor" element={<ProtectedRoute><DataExtractorScreen /></ProtectedRoute>} />
                  <Route path="/pricing" element={<PricingScreen />} />
                  <Route path="/legal/:type" element={<LegalScreen />} />
                  <Route path="/protocol-guide" element={<ProtocolGuideScreen />} />
                  <Route path="/auth-callback" element={<GoogleAuthCallback />} />
                  <Route path="/admin/payments" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </PullToRefresh>
      </main>
      {!isLandingPage && <BottomNav />}
      <AnimatePresence>
        {isBooting && (
          <SystemBoot
            onComplete={() => {
              // Mark animation as done, but let the useEffect above handle the actual dismissal
              // based on isDataReady
              setBootAnimFinished(true);
            }}
          />
        )}
      </AnimatePresence>


      {!isLandingPage && <NeuralAssistant />}
      <DebugLogPanel isOpen={debugPanelOpen} onClose={() => setDebugPanelOpen(false)} />
    </div>

  );
};

export default App;
