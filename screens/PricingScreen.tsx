import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Sparkles } from 'lucide-react';

const PricingScreen: React.FC = () => {
  const navigate = useNavigate();

  const tiers = [
    {
      name: 'FREE',
      price: '$0',
      period: 'Forever',
      features: [
        '3 PDF tasks/day',
        '1 AI doc/week',
        'Try before buy'
      ],
      cta: 'Current Plan',
      disabled: true
    },
    {
      name: 'PRO',
      price: '$2.99',
      period: 'Lifetime',
      badge: 'Main Revenue',
      features: [
        'UNLIMITED PDF tasks',
        '10 AI docs/month',
        'Lifetime access',
        'All PDF tools'
      ],
      cta: 'Get Pro',
      popular: true
    },
    {
      name: 'AI PACK',
      price: '$4.99',
      period: 'Add-On',
      badge: 'Power Users',
      features: [
        '100 AI documents',
        'Never expires',
        'Infinite BYOK Support',
        'Stacks with Pro'
      ],
      cta: 'Buy AI Pack',
      addon: true
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-32 relative overflow-hidden">
      {/* Neural Pulse Background */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <div className="p-6 space-y-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-12 text-center"
        >
          <h1 className="text-5xl font-black text-black dark:text-white uppercase tracking-tighter leading-none mb-4">
            Protocol Access
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">
            Select Your Authorization Level
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="flex flex-col gap-8 max-w-sm mx-auto">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 100, damping: 20 }}
              className={`monolith-card p-10 flex flex-col relative group ${tier.popular ? 'border-2 border-black dark:border-white shadow-2xl' : ''}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl">
                  MOST POPULAR
                </div>
              )}

              {/* Header */}
              <div className="mb-10">
                <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-4">{tier.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-black dark:text-white tabular-nums tracking-tighter">{tier.price}</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{tier.period}</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-6 mb-12 flex-1">
                {tier.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Check size={16} className="text-black dark:text-white" strokeWidth={3} />
                    </div>
                    <span className="text-[12px] font-black uppercase tracking-tight text-gray-700 dark:text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <motion.button
                whileHover={{ scale: tier.disabled ? 1 : 1.05 }}
                whileTap={{ scale: tier.disabled ? 1 : 0.95 }}
                disabled={tier.disabled}
                className={`w-full py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all relative overflow-hidden shadow-lg ${tier.disabled
                  ? 'bg-black/5 dark:bg-white/5 text-gray-300 dark:text-gray-700 cursor-not-allowed'
                  : tier.popular
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl hover:brightness-110 active:scale-95'
                    : 'bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
              >
                {tier.cta}
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Strategic Comparison (Trust & Value) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="monolith-card p-12 space-y-12 border-none bg-black text-white dark:bg-white dark:text-black shadow-2xl overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-12 opacity-5">
            <Zap size={160} />
          </div>

          <div className="space-y-4 relative z-10">
            <h4 className="text-3xl font-black uppercase tracking-tighter leading-none">The Efficiency Protocol</h4>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Value Comparison Index</p>
          </div>

          <div className="space-y-8 relative z-10">
            {/* Standard Subscription */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Traditional Subscription</span>
                <span className="text-xl font-black tabular-nums tracking-tighter">$240.00 / YEAR</span>
              </div>
              <div className="h-2 w-full bg-white/10 dark:bg-black/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5, delay: 0.8 }}
                  className="h-full bg-red-500"
                />
              </div>
            </div>

            {/* Anti-Gravity Lifetime */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Anti-Gravity Lifetime</span>
                <span className="text-xl font-black tabular-nums tracking-tighter text-emerald-500">$2.99 / ONCE</span>
              </div>
              <div className="h-2 w-full bg-white/10 dark:bg-black/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "1.25%" }}
                  transition={{ duration: 1.5, delay: 1 }}
                  className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="p-6 bg-white/5 dark:bg-black/5 rounded-[32px] border border-white/10 dark:border-black/10 flex flex-col items-center text-center space-y-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                <Check size={20} className="text-emerald-500" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest opacity-80">No Account Required</span>
            </div>
            <div className="p-6 bg-white/5 dark:bg-black/5 rounded-[32px] border border-white/10 dark:border-black/10 flex flex-col items-center text-center space-y-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <Check size={20} className="text-blue-500" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest opacity-80">Local-First Storage</span>
            </div>
          </div>

          <div className="p-8 bg-white/5 dark:bg-black/5 rounded-3xl border border-white/10 dark:border-black/10 relative z-10">
            <p className="text-[10px] font-black uppercase leading-relaxed tracking-wider opacity-80 text-center">
              Anti-Gravity tools run locally on your device hardware.
              Unlike Adobe, we never force you to store your private docs in our cloud.
              The $2.99 lifetime pass unlocks all 14 offline modules forever.
            </p>
          </div>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="max-w-sm mx-auto space-y-8"
        >
          <div className="flex flex-col items-center pt-8 border-t border-black/5 dark:border-white/5 space-y-4">
            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-300 dark:text-gray-700">Protocol Secure • 30 Day Guarantee</span>
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500 opacity-30">Built By Cryptobulla</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PricingScreen;
