import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Zap, Moon, Sun, User } from 'lucide-react';
import TaskCounter from './TaskCounter';
import { getCurrentUser, GoogleUser } from '@/services/googleAuthService';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const isHome = location.pathname === '/' || location.pathname === '/workspace';

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    // Detect Android WebView
    const ua = navigator.userAgent.toLowerCase();
    const isAndroidDevice = ua.includes('android') || ua.includes('wv');
    setIsAndroid(isAndroidDevice);

    // Add Android class for CSS-level optimizations
    if (isAndroidDevice) {
      document.documentElement.classList.add('is-android');
    }

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Auth Sync
  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    fetchUser();

    const handleAuthChange = () => fetchUser();
    window.addEventListener('neural-auth-success', handleAuthChange);
    return () => window.removeEventListener('neural-auth-success', handleAuthChange);
  }, []);

  return (
    <header
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      className="fixed left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-1.5rem)] max-w-2xl h-12 sm:h-14 monolith-glass rounded-full flex items-center justify-between px-2 sm:px-4 shadow-2xl"
    >
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {!isHome && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all"
          >
            <ArrowLeft size={16} className="text-gray-900 dark:text-white" />
          </motion.button>
        )}
        <div
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer shrink-0"
          onClick={() => navigate('/')}
        >
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-black dark:bg-white flex items-center justify-center shadow-lg shrink-0"
          >
            <Zap size={16} className="text-white dark:text-black" fill="currentColor" />
          </motion.div>
          <h1 className="text-[10px] sm:text-xs font-black tracking-tighter uppercase text-gray-900 dark:text-white">
            Anti-Gravity
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-1 min-w-0">
        <TaskCounter
          variant="header"
          onUpgradeClick={() => navigate('/pricing')}
        />

        <div className="w-[1px] h-5 bg-gray-900/10 dark:bg-white/10 mx-0.5 hidden xs:block" />

        {/* User Profile Avatar or Login Button */}
        <AnimatePresence mode="wait">
          {user ? (
            <motion.div
              key="profile"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={() => navigate('/ai-settings')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-emerald-500/30 overflow-hidden cursor-pointer shrink-0"
            >
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-emerald-500/10 flex items-center justify-center">
                  <User size={14} className="text-emerald-500" />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.button
              key="login"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/login')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-900/5 dark:bg-white/5 hover:bg-gray-900/10 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer shrink-0 transition-all"
              aria-label="Login"
            >
              <User size={14} className="text-gray-600 dark:text-gray-400" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Dark Mode Toggle */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.1 }}
          onClick={toggleDarkMode}
          className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all"
          aria-label="Toggle dark mode"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isDark ? 'dark' : 'light'}
              initial={isAndroid ? false : { rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={isAndroid ? { opacity: 0 } : { rotate: 90, opacity: 0, scale: 0.5 }}
              transition={{ duration: isAndroid ? 0 : 0.2, ease: "circOut" }}
            >
              {isDark ? (
                <Sun size={15} className="text-white" />
              ) : (
                <Moon size={15} className="text-gray-900" />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.button>

      </div>

    </header>
  );
};

export default Header;
