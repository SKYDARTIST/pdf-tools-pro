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
        'Try before buy'
      ],
      cta: 'Current Plan',
      disabled: true
    },
    {
      name: 'PRO',
      price: '$2.99',
      period: 'Lifetime',
      badge: 'PHASE 1: EARLY ACCESS',
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
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  <div className="px-5 py-1.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl whitespace-nowrap">
                    {tier.badge || 'MOST POPULAR'}
                  </div>
                  <div className="px-4 py-1.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl animate-pulse">
                    70% OFF
                  </div>
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
                className={`w-full py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all relative overflow-hidden shadow-lg ${tier.disabled
                  ? 'bg-black/5 dark:bg-white/5 text-gray-300 dark:text-gray-700 cursor-not-allowed'
                  : tier.popular
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl hover:brightness-110 active:scale-95'
                    : 'bg-black/5 dark:bg-white/5 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
              >
                {tier.cta}
              </motion.button>
              {tier.name === 'AI PACK' && (
                <div className="mt-4 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                  <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-relaxed text-center">
                    HARD USER LOGIC: 100 Massive PDFs (50pg+ each) analyzed for ~$1.50 in base cost. Your $4.99 pack is high-efficiency.
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
          className="monolith-card p-12 space-y-16 border-none bg-black text-white dark:bg-white dark:text-black shadow-2xl overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-12 opacity-5">
            <Zap size={160} />
          </div>

          <div className="space-y-4 relative z-10 text-center">
            <h4 className="text-4xl font-black uppercase tracking-tighter leading-none">THE EDGE ADVANTAGE</h4>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Anti-Gravity vs "Cloud Giants"</p>
          </div>

          <div className="space-y-12 relative z-10">
            {/* Savings Catalyst Chart */}
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-white/10 dark:border-black/10 pb-4">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">3-Year Projected Cost</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Savings: $717.01</span>
              </div>

              <div className="space-y-8 pt-4">
                {/* Standard Subscription */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Standard Subscription (Avg $20/mo)</span>
                    <span className="text-xl font-black tabular-nums tracking-tighter opacity-80">$720.00</span>
                  </div>
                  <div className="h-3 w-full bg-white/5 dark:bg-black/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, ease: "easeOut", delay: 0.8 }}
                      className="h-full bg-gradient-to-r from-red-900 to-red-500"
                    />
                  </div>
                </div>

                {/* Anti-Gravity Lifetime */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Anti-Gravity Lifetime</span>
                    <span className="text-xl font-black tabular-nums tracking-tighter text-emerald-500">$2.99</span>
                  </div>
                  <div className="h-3 w-full bg-white/5 dark:bg-black/5 rounded-full overflow-hidden">
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
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block border-b border-white/10 dark:border-black/10 pb-4">Protocol Combat Checklist</span>
              <div className="bg-white/5 dark:bg-black/5 rounded-3xl overflow-hidden border border-white/10 dark:border-black/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 dark:border-black/10">
                      <th className="p-6 text-[9px] font-black uppercase tracking-widest opacity-40">Feature</th>
                      <th className="p-6 text-[9px] font-black uppercase tracking-widest opacity-40">Cloud Giants</th>
                      <th className="p-6 text-[9px] font-black uppercase tracking-widest text-emerald-500">Anti-Gravity</th>
                    </tr>
                  </thead>
                  <tbody className="text-[10px] font-bold uppercase tracking-tight">
                    {[
                      { f: "Data Privacy", c: "Cloud Sync (Shared)", l: "Local Only (Isolated)" },
                      { f: "Login Barrier", c: "Mandatory", l: "Zero Required" },
                      { f: "Processing Speed", c: "Server Latency", l: "Instant Edge Power" },
                      { f: "Offline Work", c: "Laggy / Impossible", l: "100% Airplane Mode" },
                      { f: "Cost Strategy", c: "$240/Year Sub", l: "$2.99 Lifetime" },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-white/5 dark:border-black/5 last:border-0 hover:bg-white/5 dark:hover:bg-black/5 transition-colors">
                        <td className="p-6 opacity-40">{row.f}</td>
                        <td className="p-6 text-red-500/60">{row.c}</td>
                        <td className="p-6 text-emerald-500">{row.l}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="p-8 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 relative z-10 mt-8">
            <p className="text-[10px] font-black uppercase leading-relaxed tracking-wider opacity-90 text-center">
              Our AI implementation uses Enterprise-grade isolation.
              <span className="text-emerald-500"> NO DATA IS EVER USED TO TRAIN MODELS.</span><br />
              Your documents remain 100% ephemeral and disconnected from the global training swarm.
            </p>
          </div>

          {/* Transparency Audit */}
          <div className="pt-16 space-y-8 relative z-10 border-t border-white/10 dark:border-black/10 mt-16">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 dark:bg-black/5 flex items-center justify-center">
                <Sparkles size={20} className="text-emerald-500" />
              </div>
              <div className="space-y-1">
                <h5 className="text-[10px] font-black uppercase tracking-[0.3em]">Transparency Audit: Why $2.99?</h5>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Zero Maintenance Philosophy</p>
              </div>
            </div>

            <p className="text-[11px] font-medium leading-relaxed opacity-70">
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
            <span className="text-[9px] font-black uppercase tracking-[0.5em] text-gray-300 dark:text-gray-700">Protocol Secure • 30 Day Guarantee</span>
            <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500 opacity-30">Built By Cryptobulla</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PricingScreen;
