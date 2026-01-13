import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Sparkles } from 'lucide-react';
import { upgradeTier, addAiPackCredits, SubscriptionTier } from '../services/subscriptionService';

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
        'Zero Watermarks'
      ],
      cta: 'Current Plan',
      disabled: true
    },
    {
      name: 'PRO',
      price: '$2.99',
      period: 'Lifetime',
      badge: 'LIMITED TIME OFFER',
      features: [
        'UNLIMITED PDF tasks',
        '10 AI docs/month',
        'Zero Watermarks Ever',
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
        'Advanced AI Reading',
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

      <div className="p-6 space-y-16 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-40 text-center"
        >
          <h1 className="text-5xl font-black text-black dark:text-white uppercase tracking-tighter leading-none mb-6">
            Choose Your Plan
          </h1>
          <p className="text-[9px] font-mono font-black uppercase tracking-[0.4em] text-gray-500">
            Get unlimited access to all tools
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
              className={`monolith-glass rounded-[40px] p-8 flex flex-col relative group transition-all duration-500 ${tier.popular ? 'bg-black/80 dark:bg-white text-white dark:text-black border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20' : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10'}`}
            >
              {tier.popular && (
                <div className="absolute -top-4 inset-x-0 flex justify-center items-center gap-1.5 px-4 pointer-events-none">
                  <div className="px-4 py-1.5 bg-emerald-500 text-white text-[8px] font-mono font-black uppercase tracking-[0.2em] rounded-full shadow-2xl shadow-emerald-500/30 border border-emerald-400/20">
                    {tier.badge || 'PRO AUTHORIZED'}
                  </div>
                  <div className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black text-[8px] font-mono font-black uppercase tracking-[0.2em] rounded-full shadow-2xl border border-white/10 animate-pulse">
                    70% OFF
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="mb-10">
                <h3 className={`text-[9px] font-mono font-black uppercase tracking-[0.3em] mb-4 ${tier.popular ? 'text-emerald-400' : 'text-gray-500'}`}>{tier.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-mono font-black tabular-nums tracking-tighter ${tier.popular ? 'text-white dark:text-black' : 'text-black dark:text-white'}`}>{tier.price}</span>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest opacity-40">{tier.period}</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-6 mb-12 flex-1">
                {tier.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-colors ${tier.popular ? 'bg-emerald-500/20 text-emerald-400' : 'bg-black/5 dark:bg-white/5 text-gray-400'}`}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span className={`text-[11px] font-mono font-bold uppercase tracking-tight ${tier.popular ? 'text-white/80 dark:text-black/80' : 'text-gray-500 dark:text-gray-400'}`}>{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <motion.button
                whileHover={{ scale: tier.disabled ? 1 : 1.02 }}
                whileTap={{ scale: tier.disabled ? 1 : 0.98 }}
                disabled={tier.disabled}
                onClick={() => {
                  if (tier.name === 'PRO') {
                    upgradeTier(SubscriptionTier.PRO);
                    alert('LIFETIME PRO AUTHORIZED. Neural Layer Unlocked.');
                    navigate('/ag-workspace');
                  } else if (tier.name === 'AI PACK') {
                    addAiPackCredits(100);
                    alert('100 NEURAL CREDITS INJECTED. AI Pack Activated.');
                    navigate('/ag-workspace');
                  }
                }}
                className={`w-full py-5 rounded-3xl font-mono font-black text-[10px] uppercase tracking-[0.2em] transition-all relative overflow-hidden shadow-lg ${tier.disabled
                  ? 'bg-black/5 dark:bg-white/5 text-gray-300 dark:text-gray-700 cursor-not-allowed'
                  : tier.popular
                    ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95'
                    : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90'
                  }`}
              >
                {tier.cta}
              </motion.button>
              {tier.name === 'AI PACK' && (
                <div className="mt-6 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                  <p className="text-[8px] font-mono font-bold text-emerald-500/60 uppercase tracking-widest leading-relaxed text-center">
                    Analyze 100 massive documents for just $4.99. No subscriptions, just great AI.
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Strategic Comparison (Trust & Value) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="monolith-glass rounded-[40px] p-6 sm:p-12 android-sm:p-5 space-y-12 sm:space-y-16 border-none bg-black text-white dark:bg-white dark:text-black shadow-2xl overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-12 opacity-5">
            <Zap size={160} />
          </div>

          <div className="space-y-4 relative z-10 text-center">
            <h4 className="text-4xl font-black uppercase tracking-tighter leading-none">THE SAVINGS ADVANTAGE</h4>
            <p className="text-[9px] font-mono font-black uppercase tracking-[0.3em] opacity-60">Anti-Gravity vs Others</p>
          </div>

          <div className="space-y-12 relative z-10">
            {/* Savings Catalyst Chart */}
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-white/10 dark:border-black/10 pb-4">
                <span className="text-[9px] font-mono font-black uppercase tracking-widest opacity-60">3-Year Projected Cost</span>
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-emerald-500">Savings: $717.01</span>
              </div>

              <div className="space-y-8 pt-4">
                {/* Standard Subscription */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-mono font-black uppercase tracking-widest opacity-40">Other Apps (Monthly Subscriptions)</span>
                    <span className="text-xl font-mono font-black tabular-nums tracking-tighter opacity-80">$720.00</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 dark:bg-black/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, ease: "easeOut", delay: 0.8 }}
                      className="h-full bg-red-500/40"
                    />
                  </div>
                </div>

                {/* Anti-Gravity Lifetime */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-mono font-black uppercase tracking-widest text-emerald-500">Anti-Gravity Lifetime</span>
                    <span className="text-xl font-mono font-black tabular-nums tracking-tighter text-emerald-500">$2.99</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 dark:bg-black/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "0.4%" }}
                      transition={{ duration: 1.5, delay: 1.2 }}
                      className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Combat Comparison Table */}
            <div className="pt-8 space-y-6">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest opacity-60 block border-b border-white/10 dark:border-black/10 pb-4">Feature Comparison</span>
              <div className="bg-white/5 dark:bg-black/5 rounded-3xl overflow-hidden border border-white/10 dark:border-black/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 dark:border-black/10">
                      <th className="p-6 android-sm:p-3 text-[8px] android-sm:text-[7px] font-mono font-black uppercase tracking-widest opacity-40">Feature</th>
                      <th className="p-6 android-sm:p-3 text-[8px] android-sm:text-[7px] font-mono font-black uppercase tracking-widest opacity-40">Other Apps</th>
                      <th className="p-6 android-sm:p-3 text-[8px] android-sm:text-[7px] font-mono font-black uppercase tracking-widest text-emerald-500">Anti-Gravity</th>
                    </tr>
                  </thead>
                  <tbody className="text-[9px] font-mono font-bold uppercase tracking-tight">
                    {[
                      { f: "Data Privacy", c: "Cloud Sync (Shared)", l: "Local Only (Isolated)" },
                      { f: "Login Barrier", c: "Mandatory", l: "Zero Required" },
                      { f: "Processing Speed", c: "Server Latency", l: "Instant Edge Power" },
                      { f: "Privacy Model", c: "Cloud Sync (Risk)", l: "Secure Edge Link" },
                      { f: "Cost Strategy", c: "$240/Year Sub", l: "$2.99 Lifetime" },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-white/5 dark:border-black/5 last:border-0 hover:bg-white/5 dark:hover:bg-black/5 transition-colors">
                        <td className="p-6 android-sm:p-3 opacity-40">{row.f}</td>
                        <td className="p-6 android-sm:p-3 text-red-500/60">{row.c}</td>
                        <td className="p-6 android-sm:p-3 text-emerald-500">{row.l}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="p-8 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 relative z-10 mt-8">
            <p className="text-[10px] font-black uppercase leading-relaxed tracking-wider opacity-90 text-center">
              We use secure, private AI technology.
              <span className="text-emerald-500"> YOUR DATA IS NEVER USED TO TRAIN AI.</span><br />
              Your documents are deleted automatically and never shared.
            </p>
          </div>

          {/* Transparency Audit */}
          <div className="pt-16 space-y-8 relative z-10 border-t border-white/10 dark:border-black/10 mt-16">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 dark:bg-black/5 flex items-center justify-center">
                <Sparkles size={20} className="text-emerald-500" />
              </div>
              <div className="space-y-1">
                <h5 className="text-[9px] font-mono font-black uppercase tracking-[0.3em]">Why is it only $2.99?</h5>
                <p className="text-[8px] font-mono font-bold uppercase tracking-widest opacity-40">Fair Pricing Forever</p>
              </div>
            </div>

            <p className="text-[11px] font-mono font-medium leading-relaxed opacity-70 text-white/70 dark:text-black/70">
              Unlike big corporations, <span className="text-white dark:text-black font-black">Anti-Gravity is Local-First.</span> We don't maintain massive server farms to process your basic PDF tasks—your device does the work. Since our maintenance costs are near zero, we don't need to trap you in a monthly subscription. You pay once for the software, and you own the utility forever.
              <br /><br />
              <span className="text-emerald-500 font-black italic">Fair Pricing. Infinite Trust. No Subscriptions.</span>
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
            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-300 dark:text-gray-700">100% Secure • Private Processing</span>
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500 opacity-30">Built By Cryptobulla</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PricingScreen;
