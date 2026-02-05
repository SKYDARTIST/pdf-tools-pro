import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Shield, Zap, Info, ArrowLeft, Twitter, ExternalLink, Globe, User, LogOut, FileText, Bot, CreditCard, Activity, ChevronRight, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, GoogleUser } from '@/services/googleAuthService';

const AISettingsScreen: React.FC = () => {
  const [isAiEnabled, setIsAiEnabled] = useState(true);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-transparent pb-32 pt-32 max-w-2xl mx-auto px-6"
    >
      <div className="space-y-12">
        {/* Header Section */}
        <div className="space-y-3 text-center sm:text-left">
          <div className="text-technical">App Settings</div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">Security</h1>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed">Manage your privacy and AI assistant settings</p>
        </div>

        {/* AI Assistant Toggle Control */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="monolith-card p-10 space-y-10 border-none relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Sparkles size={120} />
          </div>

          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-6">
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl ${isAiEnabled ? 'bg-black dark:bg-white' : 'bg-black/5 dark:bg-white/5'}`}
              >
                <Sparkles size={28} className={isAiEnabled ? 'text-white dark:text-black' : 'text-gray-400'} />
              </motion.div>
              <div className="space-y-1">
                <h4 className="text-xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">AI Assistant</h4>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">Gemini AI Engine Integration</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsAiEnabled(!isAiEnabled)}
              className={`relative w-20 h-10 rounded-full transition-all duration-300 shadow-xl ${isAiEnabled ? 'bg-black dark:bg-white' : 'bg-gray-100 dark:bg-white/10'}`}
            >
              <motion.div
                animate={{ x: isAiEnabled ? 44 : 4 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`absolute top-1 w-8 h-8 rounded-full shadow-lg ${isAiEnabled ? 'bg-white dark:bg-black' : 'bg-white dark:bg-gray-400'}`}
              />
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-8 bg-black/5 dark:bg-white/5 rounded-3xl space-y-4 border border-black/5 dark:border-white/5"
          >
            <div className="flex items-center gap-3 text-gray-900 dark:text-white">
              <Info size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">How it works</span>
            </div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 leading-relaxed uppercase tracking-wider">
              The assistant reads your document text directly on your device.
              Information is only sent to our secure AI server when you ask a question.
              Turning this off will disable all AI features like chat and summaries.
            </p>
          </motion.div>
        </motion.div>

        {/* User Profile Section - Integrated Design */}
        <AnimatePresence>
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="monolith-card p-8 space-y-8 border-none"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-3xl border-2 border-emerald-500/20 overflow-hidden shrink-0">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-emerald-500/10 flex items-center justify-center">
                      <User size={24} className="text-emerald-500" />
                    </div>
                  )}
                </div>
                <div className="space-y-1 min-w-0">
                  <h4 className="text-xl font-black uppercase tracking-tighter text-gray-900 dark:text-white truncate">{user.name}</h4>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 truncate">{user.email}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-black/5 dark:border-white/5 flex flex-col gap-4">
                <div className="flex items-center gap-3 text-emerald-500">
                  <Shield size={14} />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">AI Connection Secure</span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="flex items-center gap-3 text-red-500/60 hover:text-red-500 transition-colors group"
                >
                  <LogOut size={16} className="group-hover:rotate-12 transition-transform" />
                  <span className="text-[11px] font-black uppercase tracking-[0.4em]">Disconnect Account</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Billing & Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="monolith-card p-8 space-y-6 border-none"
        >
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 flex items-center justify-center bg-[#00C896]/10 text-[#00C896] rounded-2xl">
              <CreditCard size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-black uppercase tracking-tighter text-gray-900 dark:text-white">Billing & Support</h4>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 font-mono">Transaction Recovery Center</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => navigate('/pricing')}
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-[#00C896]/10 transition-all group"
            >
              <div className="flex items-center gap-4">
                <Activity size={16} className="text-[#00C896]" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">Payment Issues?</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#00C896] opacity-0 group-hover:opacity-100 transition-opacity">Launch Recovery</span>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </button>

            <a
              href="mailto:antigravitybybulla@gmail.com?subject=Anti-Gravity Support Request"
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-[#00C896]/10 transition-all group"
            >
              <div className="flex items-center gap-4">
                <Mail size={16} className="text-[#00C896]" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">Contact Developer</span>
              </div>
              <ChevronRight size={14} className="text-gray-300" />
            </a>
          </div>
        </motion.div>

        {/* Legal Links Section */}
        <div className="monolith-card p-6 divide-y divide-black/5 dark:divide-white/5 border-none">
          <button
            onClick={() => navigate('/legal/privacy')}
            className="w-full flex items-center justify-between py-4 group text-left"
          >
            <div className="flex items-center gap-4">
              <Shield size={18} className="text-emerald-500" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">Privacy Policy</span>
            </div>
            <ExternalLink size={14} className="text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
          </button>

          <button
            onClick={() => navigate('/legal/terms')}
            className="w-full flex items-center justify-between py-4 group text-left"
          >
            <div className="flex items-center gap-4">
              <FileText size={18} className="text-blue-500" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">Terms of Service</span>
            </div>
            <ExternalLink size={14} className="text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
          </button>

          <button
            onClick={() => navigate('/legal/disclaimer')}
            className="w-full flex items-center justify-between py-4 group text-left"
          >
            <div className="flex items-center gap-4">
              <Bot size={18} className="text-purple-500" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">AI Disclaimer</span>
            </div>
            <ExternalLink size={14} className="text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-12 flex flex-col items-center space-y-4 opacity-20 hover:opacity-50 transition-opacity cursor-default"
        >
          <div className="w-8 h-[2px] bg-black/10 dark:bg-white/10 rounded-full" />
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] text-center text-gray-400 dark:text-gray-600 px-8 leading-relaxed uppercase font-black tracking-[0.3em]">
              Anti-Gravity Security System
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div >
  );
};

export default AISettingsScreen;
