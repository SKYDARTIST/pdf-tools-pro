
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, FileText, Bot, ArrowLeft } from 'lucide-react';

const LEGAL_CONTENT = {
    privacy: {
        title: 'Privacy Policy',
        icon: Shield,
        subtitle: 'Privacy',
        content: [
            "ZERO-KNOWLEDGE: Anti-Gravity processes your document content locally. We never upload, store, or see your files. This is the core of our local-first intelligence.",
            "IDENTITY SYNC: If you sign in with Google, we securely store your email and profile info only to synchronize your subscription and credits across devices.",
            "DATA MINIMIZATION: we do NOT track your behavior, use analytics, or share data with third parties. We collect only what is necessary for security and limits.",
            "SOVEREIGNTY: Your data belongs to you. You can permanently delete your account or download your account metadata at any time from your settings.",
            "MANAGEMENT: Manage your subscription and find our full Privacy Manifesto and legal policy links in the app footer and settings."
        ]
    },
    terms: {
        title: 'Terms of Service',
        icon: FileText,
        subtitle: 'Agreement',
        content: [
            "ACCEPTABLE USE: You agree to use Anti-Gravity for legal purposes only and represent that you have the rights to process the documents you upload.",
            "SERVICE LIMITS: We provide AI-powered tools 'as-is'. While highly accurate, we do not guarantee 100% precision for every AI output or 100% platform uptime.",
            "BILLING: Premium status is granted upon successful payment. Refunds are available within 30 days via app store channels or by contacting the developer.",
            "IP RIGHTS: The Anti-Gravity brand and software are protected intellectual property. Reverse engineering or unauthorized API scraping is strictly prohibited.",
            "MODIFICATIONS: We reserve the right to update these terms. Continued use of the platform after updates constitutes acceptance of the new terms."
        ]
    },
    disclaimer: {
        title: 'AI Disclaimer',
        icon: Bot,
        subtitle: 'AI Note',
        content: [
            "NEURAL LIMITATIONS: Anti-Gravity AI is based on advanced large language models. While powerful, AI can occasionally generate incorrect or biased information.",
            "DOUBLE-CHECK: AI outputs should be verified, especially when used for critical medical, financial, or legal decisions. The app is an assistant, not a replacement for human judgment.",
            "ACCURACY: Document quality and complexity can affect AI performance. Low-quality scans or extremely dense legal text may decrease accuracy.",
            "LIABILITY: We are not responsible for decisions made based on AI output. Users should use the platform responsibly as part of their professional workflow."
        ]
    }
};

const LegalScreen: React.FC = () => {
    const { type } = useParams<{ type: string }>();
    const navigate = useNavigate();
    const doc = LEGAL_CONTENT[type as keyof typeof LEGAL_CONTENT] || LEGAL_CONTENT.privacy;

    return (
        <div className="min-h-screen bg-transparent pb-32 pt-32 max-w-2xl mx-auto px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-12"
            >
                {/* Back Link */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black dark:hover:text-white transition-all"
                >
                    <ArrowLeft size={14} />
                    Go Back
                </button>

                {/* Header */}
                <div className="space-y-4">
                    <div className="w-16 h-16 bg-black dark:bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                        <doc.icon size={32} className="text-white dark:text-black" />
                    </div>
                    <div className="space-y-1">
                        <div className="text-technical tracking-[0.3em]">{doc.subtitle}</div>
                        <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white uppercase leading-none">
                            {doc.title}
                        </h1>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-8">
                    {doc.content.map((paragraph, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="monolith-card p-8 border-none shadow-sm leading-relaxed text-sm font-bold text-gray-700 dark:text-gray-300"
                        >
                            {paragraph}
                        </motion.div>
                    ))}
                </div>

                {/* Footer Note */}
                <div className="pt-12 border-t border-black/5 dark:border-white/5 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">
                        Anti-Gravity Legal & Privacy
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default LegalScreen;
