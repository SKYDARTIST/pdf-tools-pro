import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Check, Zap, Sparkles, Shield, Lock, Globe,
  Cpu, ZapOff, CreditCard, ChevronRight, Info,
  Star, ArrowRight, Activity
} from 'lucide-react';
import { getSubscription, upgradeTier, addAiPackCredits, SubscriptionTier } from '../services/subscriptionService';

const PricingScreen: React.FC = () => {
  const navigate = useNavigate();
  const sub = getSubscription();
  const currentTier = sub.tier;

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
      price: '$2.99',
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
      disabled: currentTier === SubscriptionTier.PRO,
      recommended: true
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-[200px] relative overflow-hidden">
      {/* Z-Index Architecture: Header (100), Cards (1), Chat FAB (50), Bottom Nav (90) */}
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
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-[48px] p-8 sm:p-10 flex flex-col relative group border transition-all duration-500 ${tier.recommended
                ? 'bg-white/80 dark:bg-black/40 backdrop-blur-3xl border-gray-200 dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_0_50px_rgba(0,200,150,0.1)]'
                : 'bg-white/40 dark:bg-black/20 backdrop-blur-2xl border-gray-100 dark:border-white/5'
                }`}
              style={{
                boxShadow: tier.recommended ? 'inset 0 1px 1px rgba(255,255,255,0.4), 0 0 50px rgba(0,200,150,0.02)' : 'inset 0 1px 1px rgba(255,255,255,0.2)'
              }}
            >
              {/* Internal Clipping Container for technical effects */}
              <div className="absolute inset-0 rounded-[48px] overflow-hidden pointer-events-none">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent" />
                <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-gray-100 dark:via-white/5 to-transparent" />
              </div>
              {/* Premium Badges - Better Positioning */}
              {tier.recommended && (
                <div className="absolute -top-4 right-6 flex flex-col gap-2 items-end z-20">
                  <div className="px-5 py-2 bg-black dark:bg-[#00C896] text-white dark:text-black text-[9px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl border border-white/10 flex items-center gap-2">
                    <Star size={10} className="fill-current" />
                    {tier.badge}
                  </div>
                  <div className="px-4 py-1.5 bg-[#00C896] dark:bg-white text-white dark:text-black text-[8px] font-black uppercase tracking-[0.15em] rounded-xl shadow-xl border border-white/10">
                    {tier.discount}
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-12">
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex justify-between items-center">
                    <h3 className={`text-[10px] font-mono font-black uppercase tracking-[0.4em] ${tier.recommended ? 'text-[#00C896] drop-shadow-[0_0_8px_rgba(0,200,150,0.4)]' : 'text-gray-400 dark:text-gray-500'}`}>
                      {tier.name}
                    </h3>
                  </div>
                  {tier.disabled && (
                    <div className="flex items-center self-start gap-1.5 px-3 py-1 bg-[#00C896]/10 text-[#00C896] rounded-full border border-[#00C896]/20">
                      <Activity size={10} />
                      <span className="text-[7px] font-black uppercase tracking-widest leading-none">ACTIVE</span>
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-5xl font-black tabular-nums tracking-tighter text-black dark:text-white dark:bg-clip-text dark:text-transparent dark:bg-gradient-to-b dark:from-white dark:to-gray-400">
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
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-6 mb-12 flex-1">
                {tier.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border transition-colors ${tier.recommended
                      ? 'bg-[#00C896]/10 border-[#00C896]/20 text-[#00C896]'
                      : 'bg-black/5 dark:bg-white/5 border-transparent dark:border-white/5 text-gray-400 dark:text-gray-500 group-hover:text-black dark:group-hover:text-white'
                      }`}>
                      <feature.icon size={14} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col pt-0.5">
                      <span className="text-[11px] font-black uppercase tracking-tight text-gray-900 dark:text-white/90 group-hover:text-black dark:group-hover:text-white transition-colors">
                        {feature.text}
                      </span>
                      <span className="text-[8px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        Verified Output
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: tier.disabled ? 1 : 1.02, elevation: 1 }}
                whileTap={{ scale: tier.disabled ? 1 : 0.98 }}
                disabled={tier.disabled}
                onClick={() => {
                  if (tier.id === SubscriptionTier.PRO) {
                    upgradeTier(SubscriptionTier.PRO);
                    alert('NEURAL PRO ACTIVATED: LIFETIME UTILITY UNLOCKED.');
                    window.location.reload();
                  }
                }}
                className={`w-full py-5 rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] transition-all relative overflow-hidden ${tier.disabled
                  ? 'bg-transparent text-[#00C896] border border-[#00C896]/30 cursor-not-allowed'
                  : tier.recommended
                    ? 'bg-[#00C896] text-white shadow-[0_10px_30px_rgba(0,200,150,0.2)] dark:shadow-[0_0_25px_rgba(0,200,150,0.4)] hover:brightness-110 active:scale-95'
                    : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-95'
                  }`}
              >
                {tier.cta}
                {!tier.disabled && <ArrowRight size={14} className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300" />}
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Secure Trust Banner - MOVED HIGHER */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-[48px] border border-gray-100 dark:border-white/5 bg-white/80 dark:bg-black/40 backdrop-blur-3xl p-8 sm:p-14 overflow-hidden relative shadow-[0_10px_40px_rgba(0,0,0,0.04)] dark:shadow-none"
        >
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] text-black dark:text-white">
            <Shield size={160} />
          </div>

          <div className="relative z-10 space-y-12">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-[#f8f8f8] dark:bg-[#1a1a1a] border border-[#e8e8e8] dark:border-white/5 flex items-center justify-center shadow-lg shrink-0">
                <Shield size={24} className="text-[#00C896] dark:shadow-[0_0_8px_rgba(0,200,150,0.3)]" />
              </div>
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-3">
                  <span className="px-2 py-0.5 bg-[#00C896] text-white text-[7px] font-black uppercase tracking-widest rounded-md dark:shadow-[0_0_8px_rgba(0,200,150,0.3)]">MIL-SPEC</span>
                  <h4 className="text-xs font-black uppercase tracking-widest text-black dark:text-white">PRIVACY MANIFESTO</h4>
                </div>
                <p className="text-[13px] font-bold text-[#333333] dark:text-[#b5b5b5] uppercase tracking-[0.1em] leading-relaxed max-w-xl">
                  ANTI-GRAVITY PROCESSES ALL NEURAL COMPUTATIONS LOCALLY ON YOUR HARDWARE.<br />
                  <span className="text-[#00C896] font-black underline decoration-[#00C896]/70 decoration-2 underline-offset-4">YOUR DATA IS NEVER USED TO TRAIN AI.</span><br />
                  COMPLETE ISOLATION. ZERO CLOUD LEAKAGE. PURE UTILITY.
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-4 pt-1">
                  <div className="flex items-center gap-1.5 opacity-60">
                    <Lock size={10} className="text-gray-900 dark:text-white" />
                    <span className="text-[7px] font-black uppercase tracking-widest text-gray-500 dark:text-[#909090]">ENCRYPTED</span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-60">
                    <Globe size={10} className="text-gray-900 dark:text-white" />
                    <span className="text-[7px] font-black uppercase tracking-widest text-gray-500 dark:text-[#909090]">OFFLINE FIRST</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Strategic Comparison Table - MOVED BEFORE AI PACK */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-[120px] rounded-[48px] p-6 sm:p-12 border border-gray-100 dark:border-white/5 bg-white/80 dark:bg-black/20 backdrop-blur-3xl shadow-[0_10px_40px_rgba(0,0,0,0.04)] dark:shadow-2xl max-w-4xl mx-auto space-y-16"
        >
          <div className="text-center space-y-4">
            <h4 className="text-3xl font-black uppercase tracking-tighter text-black dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">THE SAVINGS ADVANTAGE</h4>
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">Anti-Gravity Protocol vs Industry Standards</p>
          </div>

          <div className="space-y-16">
            {/* Comparison Table */}
            <div className="bg-black/5 dark:bg-black/40 backdrop-blur-3xl rounded-[32px] overflow-hidden border border-black/5 dark:border-white/5">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 gap-0">
                    <th className="p-3 sm:p-8 text-[7px] sm:text-[9px] font-mono font-black uppercase tracking-tight text-gray-500 dark:text-white/80">CORE PROTOCOL</th>
                    <th className="p-3 sm:p-8 text-[7px] sm:text-[9px] font-mono font-black uppercase tracking-tight text-[#ff5757]">OTHER APPS</th>
                    <th className="p-3 sm:p-8 text-[7px] sm:text-[9px] font-mono font-black uppercase tracking-tight text-[#00C896]">ANTI-GRAVITY</th>
                  </tr>
                </thead>
                <tbody className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tight text-gray-900 dark:text-white/90">
                  {[
                    { f: "Data Privacy", c: "Cloud (Leak Risk)", l: "Isolated Disk" },
                    { f: "Access Path", c: "Login Req", l: "Zero Barrier" },
                    { f: "Neural Speed", c: "Latency", l: "Instant Edge" },
                    { f: "Pricing Model", c: "$240/Year", l: "$2.99 Life" },
                    { f: "Watermarks", c: "Pay To Off", l: "Never" },
                  ].map((row, i) => (
                    <tr key={i} className={`border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-300 ${i % 2 === 0 ? 'bg-black/5 dark:bg-white/5' : ''}`}>
                      <td className="p-3 sm:p-8 text-gray-500 dark:text-gray-400 border-r border-black/5 dark:border-white/5">{row.f}</td>
                      <td className="p-3 sm:p-8 text-[#ff5757]/80 border-r border-black/5 dark:border-white/5">{row.c}</td>
                      <td className="p-3 sm:p-8 text-[#00C896] font-black">{row.l}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Savings Visualization */}
            <div className="space-y-10">
              <div className="flex justify-between items-end border-b border-black/10 dark:border-[rgba(255,255,255,0.1)] pb-4">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-gray-500 dark:text-[#909090]">3-Year Projected Cost Impact</span>
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#00C896]" />
                  <span className="text-[12px] font-mono font-black uppercase tracking-widest text-[#00C896]">LIFETIME SAVINGS: $717.01</span>
                </div>
              </div>

              <div className="rounded-[40px] border border-gray-100 dark:border-white/5 bg-white/80 dark:bg-black/40 backdrop-blur-3xl p-10 flex flex-col justify-center items-center gap-10 shadow-[0_10px_40px_rgba(0,0,0,0.04)] dark:shadow-none">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5252] shadow-[0_0_12px_rgba(255,82,82,0.4)]" />
                    <span className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-gray-400">Cloud Competitors</span>
                  </div>
                  <div className="w-48 sm:w-64 h-8 bg-black/5 dark:bg-black/40 rounded-full border-2 border-black/10 dark:border-white/10 overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '85%' }}
                      viewport={{ once: true }}
                      className="h-full bg-[#ff5252] shadow-[0_0_15px_rgba(255,82,82,0.2)]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-white dark:text-white">HIGH COST</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#00C896] shadow-[0_0_12px_rgba(0,212,170,0.4)]" />
                    <span className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-[#00C896]">Anti-Gravity OS</span>
                  </div>
                  <div className="w-48 sm:w-64 h-12 bg-black/5 dark:bg-black/40 rounded-full border-2 border-[#00C896]/30 overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '30%' }}
                      viewport={{ once: true }}
                      className="h-full bg-[#00C896] shadow-[0_0_20px_rgba(0,200,150,0.3)]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#00C896]">90% SAVINGS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* AI Pack Add-on Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-[48px] p-[40px] border border-gray-100 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-3xl shadow-[0_10px_40px_rgba(0,0,0,0.04)] dark:shadow-2xl max-w-2xl mx-auto relative overflow-hidden group"
        >
          <div className="absolute -top-10 -right-10 opacity-[0.03] text-black dark:text-white group-hover:opacity-[0.08] group-hover:-right-5 transition-all duration-700">
            <Cpu size={240} />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-8">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                    <Sparkles size={20} className="text-[#00C896] shadow-[0_0_12px_rgba(0,212,170,0.4)]" />
                  </div>
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
                  <div key={i} className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#00C896] shadow-[0_0_10px_rgba(0,200,150,0.5)]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white/80">{bullet}</span>
                    </div>
                    {i < 3 && <div className="h-px w-full bg-black/5 dark:bg-white/5" />}
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <p className="text-[11px] font-black text-gray-500 dark:text-white/60 uppercase tracking-[0.3em] italic">
                  "NO SUBSCRIPTIONS • PURE INTELLIGENCE"
                </p>
              </div>
            </div>

            <div className="w-full md:w-64 space-y-8 text-center md:text-right">
              <div className="flex flex-col items-center md:items-end">
                <span className="text-6xl font-black tabular-nums tracking-tighter text-black dark:text-white dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">$4.99</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mt-1">One-Time Pack</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  addAiPackCredits(100);
                  alert('100 AI CREDITS DEPLOYED.');
                  window.location.reload();
                }}
                className="w-full py-5 bg-[#00C896] text-white rounded-[32px] font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,200,150,0.4)] transition-all hover:brightness-110"
              >
                BUY AI PACK
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* FAQ / Transparency Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="rounded-[40px] p-12 mb-[60px] border border-gray-100 dark:border-white/5 bg-white/80 dark:bg-black/40 backdrop-blur-3xl shadow-[0_10px_40px_rgba(0,0,0,0.04)] dark:shadow-2xl max-w-4xl mx-auto space-y-12"
        >
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center shadow-lg">
              <Info size={28} className="text-[#00C896] shadow-[0_0_12px_rgba(0,200,150,0.4)]" />
            </div>
            <div className="space-y-1">
              <h5 className="text-xl font-black uppercase tracking-widest text-black dark:text-white">Mission Transparency</h5>
              <p className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Why is lifetime only $2.99?</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <p className="text-[14px] font-bold text-gray-600 dark:text-gray-400 leading-relaxed uppercase tracking-wider backdrop-blur-sm">
                Anti-Gravity is built on the philosophy of <span className="text-black dark:text-white font-black underline decoration-[#00C896]/70 decoration-4 underline-offset-4">Local-First utility.</span>
              </p>
              <p className="text-[14px] font-bold text-gray-600 dark:text-gray-400 leading-relaxed uppercase tracking-wider">
                We <span className="text-[#00C896] font-black underline decoration-[#00C896]/70 decoration-2 underline-offset-4 uppercase">don't maintain</span> massive server farms to process your basic PDF tasks—your device does the heavy lifting.
              </p>
            </div>
            <div className="space-y-6">
              <p className="text-[14px] font-bold text-gray-600 dark:text-gray-400 leading-relaxed uppercase tracking-wider">
                Since our ongoing maintenance costs are near-zero, we don't need to trap you in a subscription cycle.
              </p>
              <p className="text-[15px] font-black text-[#00C896] italic uppercase tracking-wider drop-shadow-[0_0_8px_rgba(0,200,150,0.3)]">
                Fair Pricing. Infinite Trust. Offline Ownership.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Footer Trace */}
        <div className="flex flex-col items-center pt-[100px] mb-[120px] space-y-8 opacity-60">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-[#707070] dark:text-[#808080]" />
              <span className="text-[9px] font-black uppercase tracking-[0.5em] text-[#707070] dark:text-[#808080]">SECURE GATEWAY</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-[#333333]" />
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-[#707070] dark:text-[#808080]" />
              <span className="text-[9px] font-black uppercase tracking-[0.5em] text-[#707070] dark:text-[#808080]">PRIVATE VAULT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingScreen;
