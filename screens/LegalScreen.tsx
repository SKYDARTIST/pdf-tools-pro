
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
            "DATA WE COLLECT: We collect your Device ID (UUID) for basic limits and anonymized usage. If you sign in with Google, we also store your email to sync your credits across devices.",
            "DATA WE DON'T COLLECT: We do NOT track your behavior, collect analytics, or share your data with third parties. Your document content is never stored.",
            "STORAGE: Data is stored in Supabase with encryption at rest. Session tokens are cleared on logout, and debug logs auto-expire after 24 hours.",
            "GDPR RIGHTS: You have the right to download your data or delete your account permanently. These options are available in your data & privacy settings.",
            "UNSUBSCRIBE: You can manage your subscription and turn off auto-renewal at any time through the Google Play Store or App Store."
        ]
    },
    terms: {
        title: 'Terms of Service',
        icon: FileText,
        subtitle: 'Agreement',
        content: [
            "CONTENT UPLOAD: You agree not to upload illegal, harmful, or copyrighted content that you do not have permission to process.",
            "WARRANTY: We provide the Anti-Gravity service 'as-is' with no guarantees of 100% uptime or absolute accuracy of AI-generated output.",
            "SERVICE SUSPENSION: We reserve the right to suspend or terminate access for users who abuse the platform, spam the AI, or attempt unauthorized access.",
            "REFUND POLICY: If you are unsatisfied with a premium purchase, please contact us within 30 days of purchase for a full refund.",
            "API ACCESS: No unauthorized API access, scrapers, or bots are allowed. Any attempt to bypass our security protocols will result in a permanent ban."
        ]
    },
    disclaimer: {
        title: 'AI Disclaimer',
        icon: Bot,
        subtitle: 'AI Note',
        content: [
            "The Anti-Gravity AI is an advanced system. While very powerful, it can still make mistakes, common to all AI models.",
            "VERIFICATION REQUIRED: AI-generated summaries and checklists may occasionally contain mistakes. You should always double-check important financial, legal, or medical information.",
            "LIABILITY: We are not responsible for decisions made based on AI output. The app is a tool to assist you, not a replacement for your own judgment.",
            "SENSITIVITY: Very complex documents or low-quality scans may make the AI less accurate."
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
