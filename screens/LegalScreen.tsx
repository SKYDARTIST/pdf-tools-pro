
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
            "Anti-Gravity operates on a strict Privacy-First model. We do not store your documents or PDF content.",
            "AI ASSISTANT: When you use the Workspace or AI tools, your document data is sent via secure connection to the Google Gemini AI for analysis. This data is processed temporarily and is not used to train AI models. By using these features, you agree to this.",
            "LOCAL STORAGE: We use your phone's storage only to save your subscription status and simple app settings. This data stays on your device and is never sent to the cloud.",
            "REPORTING: You can flag any AI-generated answer for review. This helps us improve the safety and accuracy of our AI helper.",
            "SECURITY: All data is protected by professional-grade encryption and never leaves your device unless analyzed by AI."
        ]
    },
    terms: {
        title: 'Terms of Service',
        icon: FileText,
        subtitle: 'Agreement',
        content: [
            "By using Anti-Gravity, you agree to use our tools for lawful purposes only.",
            "SERVICE STATUS: Anti-Gravity is provided 'as-is'. We do not guarantee 100% uptime or that everything will work perfectly at all times.",
            "ABUSE PREVENTION: We reserve the right to limit or stop access for users who try to hack the app, spam our AI, or use the tools for harmful activities.",
            "OWNERSHIP: You own 100% of any files or data processed through our tools. We own the design and code of the app."
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
