import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Check, Zap, Sparkles, Shield, Lock, Globe,
  Cpu, ZapOff, CreditCard, ChevronRight, Info,
  Star, ArrowRight, Activity
} from 'lucide-react';
import { getSubscription, upgradeTier, addAiPackCredits, SubscriptionTier } from '../services/subscriptionService';
import BillingService, { PRO_PRODUCT_ID, AI_PACK_100_ID } from '../services/billingService';

const PricingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [currentTier, setCurrentTier] = React.useState(getSubscription().tier);
  const [isLoading, setIsLoading] = React.useState(false);
  const [proPrice, setProPrice] = React.useState('$2.99');
  const [aiPackPrice, setAiPackPrice] = React.useState('$4.99');

  React.useEffect(() => {
    // Re-read subscription state on mount in case it changed during boot
    setCurrentTier(getSubscription().tier);
  }, []);

  React.useEffect(() => {
    // Listen for storage changes (in case another tab/window updated it)
    const handleStorageChange = () => {
      setCurrentTier(getSubscription().tier);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleProPurchase = async () => {
    setIsLoading(true);
    try {
      const success = await BillingService.purchasePro();
      if (success) {
        // Small delay to ensure localStorage is fully updated
        await new Promise(resolve => setTimeout(resolve, 100));
        setCurrentTier(getSubscription().tier);
        // Full reload to sync all components
        setTimeout(() => window.location.reload(), 200);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiPurchase = async () => {
    setIsLoading(true);
    try {
      const success = await BillingService.purchaseAiPack();
      if (success) {
        // Small delay to ensure localStorage is fully updated
        await new Promise(resolve => setTimeout(resolve, 100));
        setCurrentTier(getSubscription().tier);
        // Full reload to sync all components
        setTimeout(() => window.location.reload(), 200);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const tiers = [
    {
      id: SubscriptionTier.FREE,
      name: 'Lite Protocol',
      price: '$0',
      period: 'FOREVER',
      features: [
        { text: '3 Daily Tool Tasks', icon: Zap },
        { text: '1 AI Document / Week', icon: Cpu },
        { text: 'Zero Watermarks', icon: Shield }
      ],
      cta: currentTier === SubscriptionTier.FREE ? 'PROTOCOL ACTIVE' : 'DEPLOY LITE',
      disabled: currentTier === SubscriptionTier.FREE,
      recommended: false
    },
    {
      id: SubscriptionTier.PRO,
      name: 'Neural Pro',
      price: proPrice,
      period: 'LIFETIME',
      badge: 'MOST POPULAR',
      discount: '70% OFF',
      features: [
        { text: 'UNLIMITED PDF Tasks', icon: Zap },
        { text: '10 AI Docs / Month', icon: Cpu },
        { text: 'Zero Watermarks Ever', icon: Shield },
        { text: 'Lifetime Access/Updates', icon: Star },
        { text: 'All 14 Core Tools', icon: Globe }
      ],
      cta: currentTier === SubscriptionTier.PRO ? 'PLAN ACTIVE' : 'GET PRO ACCESS',
      disabled: currentTier === SubscriptionTier.PRO || isLoading,
      recommended: true
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-[200px] relative overflow-hidden">
      {/* Subtle Tech Grid Background */}
      <div className="absolute inset-0 opacity-[0.3] dark:opacity-[0.2] pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 0%, rgba(0, 200, 150, 0.05) 0%, transparent 40%),
            radial-gradient(var(--grid-dark) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 32px 32px'
        }}
      />

      <div className="pt-[160px] p-4 sm:p-6 space-y-[100px] relative z-[1] max-w-4xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-40 text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-px bg-[#00C896]/30" />
            <span className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-[#00C896]">Value Protocol</span>
            <div className="w-6 h-px bg-[#00C896]/30" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-[#000000] dark:text-white uppercase tracking-tighter leading-none px-4">
            Scale Your Intelligence
          </h1>
          <p className="text-[10px] sm:text-[11px] font-bold text-[#909090] dark:text-[#909090] uppercase tracking-[0.4em]">
            One-time payment • Infinite utility • Zero Subscriptions
          </p>
        </motion.div>

        {/* Primary Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {tiers.map((tier, index) => {
            const isActive = tier.id === currentTier;
            const isSuperseded = currentTier === SubscriptionTier.PRO && tier.id === SubscriptionTier.FREE;

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-[48px] p-8 sm:p-10 flex flex-col relative group border transition-all duration-500 
                  ${isActive ? 'scale-[1.02] border-[#00C896] shadow-[0_0_50px_rgba(0,200,150,0.2)]' : ''}
                  ${isSuperseded ? 'opacity-40 grayscale-[0.5]' : ''}
                  ${tier.recommended && !isActive
                    ? 'bg-white/80 dark:bg-black/40 backdrop-blur-3xl border-gray-200 dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_0_50px_rgba(0,200,150,0.1)]'
                    : 'bg-white/40 dark:bg-black/20 backdrop-blur-2xl border-gray-100 dark:border-white/5'
                  }`}
              >
                <div className="absolute inset-0 rounded-[48px] overflow-hidden pointer-events-none">
                  <div className={`absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent ${isActive ? 'dark:via-[#00C896]/50' : 'dark:via-white/10'}`} />
                </div>

                {(tier.recommended || isActive) && (
                  <div className="absolute -top-4 right-6 flex flex-col gap-2 items-end z-20">
                    <div className={`px-5 py-2 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl border border-white/10 flex items-center gap-2 ${isActive ? 'bg-[#00C896]' : 'bg-black dark:bg-[#00C896]'}`}>
                      {isActive ? <Check size={10} className="stroke-[4px]" /> : <Star size={10} className="fill-current" />}
                      {isActive ? 'ACTIVE PROTOCOL' : tier.badge}
                    </div>
                  </div>
                )}

                <div className="mb-12">
                  <h3 className={`text-[10px] font-mono font-black uppercase tracking-[0.4em] ${tier.recommended || isActive ? 'text-[#00C896]' : 'text-gray-400'}`}>
                    {tier.name}
                  </h3>
                  <div className="flex items-baseline gap-2.5 mt-2">
                    {isActive ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-4xl font-black text-[#00C896] tracking-tighter">
                          {tier.id === SubscriptionTier.PRO ? 'LIFETIME' : 'STANDARD'}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                          {tier.id === SubscriptionTier.PRO ? 'UTILITY UNLOCKED' : 'PROTOCOL ACTIVE'}
                        </span>
                      </div>
                    ) : (
                      <>
                        <span className="text-5xl font-black text-black dark:text-white">
                          {tier.price}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            {tier.period}
                          </span>
                          <span className="text-[7px] font-mono font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
                            NON-RECURRING
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-6 mb-12 flex-1">
                  {tier.features.map((feature, i) => (
                    <div key={i} className={`flex items-start gap-4 transition-opacity ${isSuperseded ? 'opacity-50' : ''}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isActive ? 'bg-[#00C896] text-white' : 'bg-[#00C896]/10 text-[#00C896]'}`}>
                        <feature.icon size={14} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-tight text-gray-900 dark:text-white/90">
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                <motion.button
                  disabled={tier.disabled}
                  onClick={() => tier.id === SubscriptionTier.PRO && handleProPurchase()}
                  className={`w-full py-5 rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] transition-all relative overflow-hidden ${tier.disabled
                    ? `bg-transparent border border-[#00C896]/30 ${isActive ? 'text-[#00C896]' : 'text-gray-400 cursor-not-allowed'}`
                    : 'bg-[#00C896] text-white shadow-xl hover:brightness-110 active:scale-95'
                    }`}
                >
                  {isLoading && tier.id === SubscriptionTier.PRO ? 'PROCESSING...' : tier.cta}
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        {/* Secure Trust Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-[48px] border border-gray-100 dark:border-white/5 bg-white/80 dark:bg-black/40 backdrop-blur-3xl p-8 sm:p-14 overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-black dark:text-white">
            <Shield size={160} />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
              <Shield size={24} className="text-[#00C896]" />
            </div>
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <h4 className="text-xs font-black uppercase tracking-widest text-black dark:text-white">PRIVACY MANIFESTO</h4>
              <p className="text-[13px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tight leading-relaxed">
                ANTI-GRAVITY PROCESSES ALL NEURAL COMPUTATIONS LOCALLY ON YOUR HARDWARE.<br />
                YOUR DATA IS NEVER USED TO TRAIN AI.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Strategic Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-[48px] p-6 sm:p-12 border border-black/5 dark:border-white/5 bg-black/5 dark:bg-black/20"
        >
          <div className="text-center mb-12">
            <h4 className="text-3xl font-black uppercase tracking-tighter">THE SAVINGS ADVANTAGE</h4>
          </div>
          <div className="bg-white/50 dark:bg-black/40 rounded-[32px] overflow-hidden border border-black/5 dark:border-white/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5">
                  <th className="p-6 text-[9px] font-black uppercase text-gray-500">FEATURE</th>
                  <th className="p-6 text-[9px] font-black uppercase text-red-500">OTHERS</th>
                  <th className="p-6 text-[9px] font-black uppercase text-[#00C896]">ANTI-GRAVITY</th>
                </tr>
              </thead>
              <tbody className="text-[10px] font-black uppercase">
                {[
                  { f: "Data Privacy", c: "Cloud (Risk)", l: "Isolated Disk" },
                  { f: "Pricing", c: "$240/Year", l: proPrice + " Life" },
                  { f: "Watermarks", c: "Paid Only", l: "Never" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-black/5 dark:border-white/5 last:border-0">
                    <td className="p-6 text-gray-500">{row.f}</td>
                    <td className="p-6 text-red-500/80">{row.c}</td>
                    <td className="p-6 text-[#00C896]">{row.l}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* AI Pack Add-on Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-[48px] p-[40px] border border-gray-100 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-3xl shadow-2xl max-w-2xl mx-auto relative overflow-hidden group"
        >
          <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-8">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Sparkles size={20} className="text-[#00C896]" />
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-black dark:text-white">AI POWER PACK</h3>
                </div>
                <p className="text-[9px] font-mono font-black uppercase tracking-[0.4em] text-[#00C896]">Pure Intelligence Add-on</p>
              </div>

              <div className="space-y-4">
                {[
                  '100 Neural Analysis Credits',
                  'Advanced OCR & Data Extraction',
                  'No Expiry • Use when needed',
                  'Stacks with Lifetime Pro'
                ].map((bullet, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#00C896]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white/80">{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full md:w-64 space-y-8 text-center md:text-right">
              <div className="flex flex-col items-center md:items-end">
                <span className="text-6xl font-black tabular-nums tracking-tighter text-black dark:text-white">
                  {aiPackPrice}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">One-Time Pack</span>
              </div>
              <motion.button
                disabled={isLoading}
                onClick={handleAiPurchase}
                className="w-full py-5 bg-[#00C896] text-white rounded-[32px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:brightness-110 disabled:opacity-50"
              >
                {isLoading ? 'DEPLOYING...' : 'BUY AI PACK'}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Mission Transparency */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="rounded-[40px] p-12 border border-gray-100 dark:border-white/5 bg-white/80 dark:bg-black/40 backdrop-blur-3xl space-y-12"
        >
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-[#00C896]/10 flex items-center justify-center">
              <Info size={24} className="text-[#00C896]" />
            </div>
            <h5 className="text-xl font-black uppercase tracking-widest text-black dark:text-white">Mission Transparency</h5>
          </div>
          <p className="text-[14px] font-bold text-gray-600 dark:text-gray-400 leading-relaxed uppercase tracking-wider">
            Anti-Gravity processes all neural computations locally on your hardware.
            We don't trap you in subscriptions because our maintenance costs are near-zero.
          </p>
        </motion.div>

        {/* Restore Purchases Fallback */}
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest opacity-40 text-center px-8">
            Already purchased but not seeing it? <br />Google Play might need a manual handshake.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={async () => {
                setIsLoading(true);
                try {
                  await BillingService.syncPurchasesWithState();

                  // Check if Pro was activated
                  const updatedSub = getSubscription();
                  if (updatedSub.tier === SubscriptionTier.PRO) {
                    alert('✅ Success! Pro status restored from Google Play.');
                    window.location.reload();
                  } else {
                    alert('⚠️ No purchases found in Google Play.\n\nIf you already purchased, your payment might not have been acknowledged by Google Play.\n\nUse the manual activation button below.');
                  }
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="px-8 py-3 rounded-full border border-gray-200 dark:border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-[#00C896] hover:border-[#00C896]/30 transition-all flex items-center gap-2"
            >
              <Activity size={12} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'SYNCING...' : 'RESTORE PURCHASES'}
            </button>

            {/* Manual Pro Activation - For purchases that weren't acknowledged */}
            <button
              onClick={() => {
                const confirm = window.confirm('⚠️ MANUAL PRO ACTIVATION\n\nThis will activate Pro features in your app.\n\n⚠️ IMPORTANT: Only use this if you have ACTUALLY PURCHASED Pro on Google Play.\n\nYour purchase receipt: If Google Play shows you already own "Neural Pro", then it\'s safe to activate.\n\nContinue?');
                if (confirm) {
                  try {
                    // Manually activate Pro in both storage systems
                    localStorage.setItem('pdf_tools_task_limit', JSON.stringify({
                      count: 0,
                      date: new Date().toISOString().split('T')[0],
                      isPro: true
                    }));

                    const sub = getSubscription();
                    sub.tier = SubscriptionTier.PRO;
                    sub.aiPackCredits = (sub.aiPackCredits || 0) + 100; // Add 100 credits
                    localStorage.setItem('pdf_tools_subscription', JSON.stringify(sub));

                    alert('✅ Pro features activated!\n\n🎉 You now have:\n• Unlimited PDF tasks\n• 10 AI docs per month\n• ' + ((sub.aiPackCredits || 0) + 100) + ' AI credits\n\nReloading app...');
                    window.location.reload();
                  } catch (error) {
                    alert(`Error: ${error}`);
                  }
                }
              }}
              className="px-8 py-3 rounded-full border-2 border-[#00C896]/50 text-[10px] font-black uppercase tracking-[0.3em] text-[#00C896] hover:bg-[#00C896]/10 transition-all"
            >
              ⚡ MANUAL PRO ACTIVATION
            </button>
            <p className="text-[8px] font-mono text-gray-400 text-center px-8 max-w-md">
              Use manual activation if Google Play shows you already own Pro but the app doesn't detect it. Future purchases will sync automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingScreen;
