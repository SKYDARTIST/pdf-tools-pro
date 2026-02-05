import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Check, Zap, Sparkles, Shield, Lock, Globe,
  Cpu, ZapOff, CreditCard, ChevronRight, Info,
  Star, ArrowRight, Activity, Mail, Twitter, ChevronDown
} from 'lucide-react';
import { getSubscription, upgradeTier, SubscriptionTier } from '@/services/subscriptionService';
import BillingService from '@/services/billingService';

const PricingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [currentTier, setCurrentTier] = React.useState(getSubscription().tier);
  const [isLoading, setIsLoading] = React.useState(false);
  const [lifetimePrice, setLifetimePrice] = React.useState('...');
  const [expandedFaq, setExpandedFaq] = React.useState<string | null>(null);


  React.useEffect(() => {
    const fetchPrices = async () => {
      try {
        const products = await BillingService.getProducts();
        const life = products.find(p =>
          p.identifier === 'lifetime_pro_access' ||
          p.identifier === 'pro_access_lifetime' ||
          p.identifier.includes('lifetime')
        );

        if (life) {
          setLifetimePrice(life.price);
        }
      } catch (err) {
        console.warn('Failed to fetch localized prices:', err);
      }
    };
    fetchPrices();
  }, []);

  React.useEffect(() => {
    setCurrentTier(getSubscription().tier);
  }, []);

  React.useEffect(() => {
    // Listen for subscription-updated CustomEvent (fired by saveSubscription)
    // Note: 'storage' event only fires in OTHER tabs, not the current one
    const handleSubscriptionChange = () => {
      setCurrentTier(getSubscription().tier);
    };
    window.addEventListener('subscription-updated', handleSubscriptionChange);
    window.addEventListener('storage', handleSubscriptionChange);
    return () => {
      window.removeEventListener('subscription-updated', handleSubscriptionChange);
      window.removeEventListener('storage', handleSubscriptionChange);
    };
  }, []);

  const handleLifetimePurchase = async () => {
    setIsLoading(true);
    try {
      const success = await BillingService.purchaseLifetime();
      if (success) handleSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    setCurrentTier(getSubscription().tier);
    setTimeout(() => window.location.reload(), 200);
  };

  const tiers = [
    {
      id: SubscriptionTier.FREE,
      name: 'Lite (Free)',
      price: '$0',
      period: 'FOREVER',
      features: [
        { text: 'Unlimited PDF Operations', icon: Zap },
        { text: 'Basic Secure Storage', icon: Shield },
        { text: 'Interactive Viewing', icon: Activity }
      ],
      cta: (currentTier === SubscriptionTier.FREE || !currentTier) ? 'CURRENT PLAN' : 'ACTIVE',
      disabled: true,
      recommended: false
    },
    {
      id: SubscriptionTier.LIFETIME,
      name: 'Lifetime Founder Access',
      price: lifetimePrice,
      period: 'ONE-TIME PAYMENT',
      badge: 'FOUNDER PACK',
      features: [
        { text: 'Unlimited Premium AI Tools Forever', icon: Sparkles },
        { text: 'Lifetime Updates & Features', icon: Zap },
        { text: 'Priority Email Support', icon: Shield },
        { text: 'Zero Subscriptions, Ever', icon: Cpu }
      ],
      cta: currentTier === SubscriptionTier.LIFETIME ? 'PLAN ACTIVE' : 'CLAIM FOUNDER PACK',
      disabled: currentTier === SubscriptionTier.LIFETIME || isLoading,
      recommended: true
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-[200px] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.3] dark:opacity-[0.2] pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 0%, rgba(0, 200, 150, 0.05) 0%, transparent 40%),
            radial-gradient(var(--grid-dark) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 32px 32px'
        }}
      />

      <div className="pt-[140px] p-4 sm:p-6 space-y-[40px] relative z-[1] max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-2xl"
        >
          <div className="rounded-2xl bg-gradient-to-r from-[#00C896]/10 via-[#00C896]/5 to-[#00C896]/10 border border-[#00C896]/20 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#00C896]">FLASH OFFER:</span>
              <span className="text-[11px] font-black uppercase tracking-tight text-black dark:text-white">Founder Lifetime Access at 83% OFF</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">• Only for the first 500 early adopters</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-px bg-[#00C896]/30" />
            <span className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-[#00C896]">Pricing Plans</span>
            <div className="w-6 h-px bg-[#00C896]/30" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-[#000000] dark:text-white uppercase tracking-tighter leading-none px-4">
            One-Time Access
          </h1>
          <p className="text-[10px] sm:text-[11px] font-bold text-[#909090] dark:text-[#909090] uppercase tracking-[0.4em]">
            Zero Subscriptions • Perpetual Access • Local Privacy
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {tiers.map((tier, index) => {
            const isActive = tier.id === currentTier || (tier.id === SubscriptionTier.FREE && !currentTier);

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-[48px] p-8 sm:p-10 flex flex-col relative group border transition-all duration-500 
                  ${isActive ? 'scale-[1.02] border-[#00C896] shadow-[0_0_50px_rgba(0,200,150,0.2)]' : ''}
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
                      {isActive ? 'PROTOCOL ACTIVE' : tier.badge}
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
                          {tier.id === SubscriptionTier.LIFETIME ? 'LIFETIME' : 'LITE ACTIVE'}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                          {tier.id === SubscriptionTier.LIFETIME ? 'PRO FEATURES UNLOCKED' : 'FREE VERSION'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {tier.id === SubscriptionTier.LIFETIME && (
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-gray-400 line-through decoration-2">
                              $29.99
                            </span>
                            <span className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-[#00C896]/10 text-[#00C896] animate-pulse">
                              83% OFF
                            </span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-black text-black dark:text-white">
                            {tier.price}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            {tier.period}
                          </span>
                        </div>
                        {tier.id === SubscriptionTier.LIFETIME && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-wider text-[#00C896]">
                              First 500 users • Limited spots remaining
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6 mb-12 flex-1">
                  {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-4">
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
                  onClick={() => {
                    if (tier.id === SubscriptionTier.LIFETIME) handleLifetimePurchase();
                  }}
                  className={`w-full py-5 rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] transition-all relative overflow-hidden ${tier.disabled
                    ? `bg-transparent border border-[#00C896]/30 ${isActive ? 'text-[#00C896]' : 'text-gray-400 cursor-not-allowed'}`
                    : 'bg-[#00C896] text-white shadow-xl hover:brightness-110 active:scale-95'
                    }`}
                >
                  {isLoading && tier.id === SubscriptionTier.LIFETIME ? 'CONNECTING SECURELY...' : tier.cta}
                </motion.button>

                {/* Lifetime-specific Support Notice */}
                {tier.id === SubscriptionTier.LIFETIME && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 p-4 rounded-2xl bg-[#00C896]/5 border border-[#00C896]/10 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#00C896]">LIFETIME PRIORITY HANDSHAKE</span>
                    </div>
                    <p className="text-[8px] font-black uppercase tracking-widest leading-relaxed text-gray-500 dark:text-gray-400">
                      IF BADGE DOESN'T APPEAR INSTANTLY, PLEASE WAIT 2-5 MINS. FOR IMMEDIATE ASSISTANCE, EMAIL <a href="mailto:antigravitybybulla@gmail.com?subject=Anti-Gravity Lifetime Support" className="text-gray-900 dark:text-white underline decoration-[#00C896]/30 hover:decoration-[#00C896] transition-all">ANTIGRAVITYBYBULLA@GMAIL.COM</a> WITH DETAILS. EXCLUSIVE **24/7 PRIORITY SUPPORT** FOR LIFETIME USERS ONLY.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-[48px] border border-gray-100 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-3xl p-8 sm:p-12 space-y-8 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-black dark:text-white group-hover:scale-110 transition-transform duration-700">
            <Activity size={160} />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-[#00C896]">Support & Help</span>
              <h4 className="text-2xl font-black uppercase tracking-tighter">Already a Lifetime Buyer?</h4>
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest max-w-md">
                If your badge hasn't appeared, use the tools below to sync your status or contact me directly.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
              <button
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const { forceReconcileFromServer } = await import('@/services/subscriptionService');
                    await forceReconcileFromServer();
                    const updatedSub = getSubscription();
                    alert(`RECONCILIATION COMPLETE: Your current tier is now verified as [${updatedSub.tier.toUpperCase()}].`);
                    setCurrentTier(updatedSub.tier);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="flex-1 px-8 py-4 rounded-3xl bg-[#00C896]/10 border border-[#00C896]/30 text-[10px] font-black uppercase tracking-[0.3em] text-[#00C896] hover:bg-[#00C896]/20 transition-all flex items-center justify-center gap-2"
              >
                <Activity size={14} className={isLoading ? 'animate-spin' : ''} />
                {isLoading ? 'SYNCING...' : 'SYNC MY PURCHASE'}
              </button>

              <button
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    const restored = await BillingService.restorePurchases();
                    const { forceReconcileFromServer } = await import('@/services/subscriptionService');
                    const updatedSub = await forceReconcileFromServer();

                    if (restored) {
                      alert(`SUCCESS: Purchase restored. Your status is now [${updatedSub.tier.toUpperCase()}].`);
                      setCurrentTier(updatedSub.tier);
                    } else {
                      alert('NOTICE: No active purchases found in Google Play metadata.\n\nIf you already purchased, ensure you are signed in to the correct Google Play account.');
                    }
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="flex-1 px-8 py-4 rounded-3xl border border-gray-200 dark:border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-[#00C896] hover:border-[#00C896]/30 transition-all flex items-center justify-center gap-2"
              >
                <Activity size={14} className={isLoading ? 'animate-spin' : ''} />
                {isLoading ? 'CHECKING...' : 'CHECK STORE STATUS'}
              </button>
            </div>

            <div className="w-full h-px bg-black/5 dark:bg-white/5" />

            <div className="flex flex-col items-center gap-4">
              <span className="text-[9px] font-mono font-black uppercase tracking-[0.4em] text-gray-400">Direct Support Access</span>
              <div className="flex gap-6">
                <a
                  href="mailto:antigravitybybulla@gmail.com?subject=Anti-Gravity Purchase Issue"
                  className="flex items-center gap-3 text-gray-500 hover:text-[#00C896] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Mail size={18} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Email Support</span>
                </a>
                <a
                  href="https://x.com/cryptobullaaa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-500 hover:text-[#00C896] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Twitter size={18} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Message on X</span>
                </a>
              </div>
              <p className="text-[9px] font-bold text-[#00C896]/60 uppercase tracking-widest">
                Typical response time: Within 24 hours
              </p>
            </div>
          </div>
        </motion.div>


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
                  { f: "Pricing", c: "Yearly Subscription", l: `${lifetimePrice} One-Time` },
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
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-black dark:text-white">PURE INTELLIGENCE</h3>
                </div>
                <p className="text-[9px] font-mono font-black uppercase tracking-[0.4em] text-[#00C896]">On-Device Neural Engine</p>
              </div>

              <div className="space-y-4">
                {[
                  'Advanced OCR & Data Extraction',
                  'Smart Context Awareness',
                  'Privacy-First Local Processing',
                  'Zero Cloud Latency'
                ].map((bullet, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#00C896]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white/80">{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full md:w-64 space-y-6 text-center md:text-right">
              <div className="flex flex-col items-center md:items-end gap-2">
                <Cpu size={48} className="text-[#00C896] opacity-80" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">Powered by<br />Anti-Gravity Neural Core</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
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
            We've simplified our model: Start for free with base tools, or secure permanent access with our Lifetime Protocol.
          </p>
        </motion.div>


        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-[48px] p-8 sm:p-12 border border-gray-100 dark:border-white/5 bg-white/80 dark:bg-black/40 backdrop-blur-3xl space-y-6"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#00C896]/10 flex items-center justify-center">
              <CreditCard size={24} className="text-[#00C896]" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-black dark:text-white">Payment FAQ</h3>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'secure',
                q: 'Is My Payment Secure?',
                a: 'Yes! All payments are processed through Google Play, which uses bank-level encryption. Your card details are never shared with us.'
              },
              {
                id: 'methods',
                q: 'What Payment Methods Do You Accept?',
                a: 'We accept all payment methods supported by Google Play Billing: Credit cards, debit cards, Google Play balance, and regional payment methods.'
              },
              {
                id: 'failed',
                q: 'What If My Payment Fails?',
                a: 'Failed payments are automatically queued for retry every 30 seconds. If you\'ve already been charged by Google, your purchase will be verified automatically. Check "Restore Purchases" on the pricing page.'
              },
              {
                id: 'refund',
                q: 'Can I Get A Refund?',
                a: 'Google Play allows refunds within 48 hours of purchase. After that, we can manually process refund requests. Email support@antigravity.app with your transaction ID.'
              },
              {
                id: 'restore',
                q: 'How Do I Restore My Purchase?',
                a: 'Click "Restore Purchases" on the pricing page. Make sure you\'re signed in with the same Google Play account that made the purchase. Your status will update instantly.'
              },
              {
                id: 'trial',
                q: 'Is There A Trial Period?',
                a: 'No, but the Free tier gives you unlimited access to all PDF tools forever. Upgrade to Lifetime Protocol to unlock AI features.'
              },
              {
                id: 'support',
                q: 'Still Having Issues?',
                a: <>Email <a href="mailto:antigravitybybulla@gmail.com?subject=Anti-Gravity Support Request" className="underline decoration-[#00C896]/30 text-[#00C896]">antigravitybybulla@gmail.com</a> with your Device ID (in Settings) and transaction ID. We typically respond within 24 hours.</>
              }
            ].map((item) => (
              <div key={item.id} className="border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)}
                  className="w-full p-6 flex items-center justify-between hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
                >
                  <span className="text-[12px] font-black uppercase tracking-tight text-black dark:text-white text-left">
                    {item.q}
                  </span>
                  <motion.div
                    animate={{ rotate: expandedFaq === item.id ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={18} className="text-[#00C896] shrink-0 ml-4" />
                  </motion.div>
                </button>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: expandedFaq === item.id ? 'auto' : 0, opacity: expandedFaq === item.id ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-t border-gray-200 dark:border-white/10"
                >
                  <p className="p-6 text-[11px] font-bold text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.a}
                  </p>
                </motion.div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div >
  );
};

export default PricingScreen;
