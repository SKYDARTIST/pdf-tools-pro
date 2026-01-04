
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, FileText, Bot, ArrowLeft } from 'lucide-react';

const LEGAL_CONTENT = {
    privacy: {
        title: 'Privacy Policy',
        icon: Shield,
        subtitle: 'Zero-Persistence Mandate',
        content: [
            "Anti-Gravity operates on a strict Zero-Data mandate. We do not maintain any database of your uploaded documents or PDF content.",
            "NEURAL PROCESSING: When you utilize the Workspace or AI tools, your document data is transmitted via secure HTTPS to the Google Gemini Neural Engine for real-time interpretation. This data is processed ephemerally and is not used for model training by Cryptobulla. By using these features, you consent to this data flow.",
            "LOCAL STORAGE: We utilize HTML5 Web Storage (localStorage) exclusively to store your subscription status, operation counters, and session preferences. This data remains on your device and is not synchronized to any cloud service.",
            "CONTENT REPORTING: In compliance with Google safety standards, users may flag AI-generated content for review. This triggers a localized reporting protocol to help us refine the neural filters.",
            "ENCRYPTION: All state transitions and data flows are protected by industry-standard SSL/TLS encryption protocols."
        ]
    },
    terms: {
        title: 'Terms of Service',
        icon: FileText,
        subtitle: 'Protocol Usage Agreement',
        content: [
            "By accessing the Anti-Gravity Protocol, you agree to utilize its neural assets for lawful document manipulation and personal productivity.",
            "PROTOTYPE STATUS: Anti-Gravity is provided 'as-is' under the Cryptobulla Experimental Lab architecture. We do not guarantee 100% uptime or error-free processing.",
            "ABUSE PREVENTION: We reserve the right to throttle or terminate access for users who attempt to bypass security layers, flood the API, or utilize the engine for malicious purposes.",
            "OWNERSHIP: You maintain 100% ownership of any data processed through our tools. Cryptobulla maintains ownership of the UI, design, and proprietary logic."
        ]
    },
    disclaimer: {
        title: 'AI Disclaimer',
        icon: Bot,
        subtitle: 'Neural Intelligence Warning',
        content: [
            "The Anti-Gravity AI is a high-performance neural interpretation engine. While highly advanced, it is subject to the limitations of Large Language Models (LLMs).",
            "VERIFICATION REQUIRED: AI-generated summaries, extracted tables, and naming suggestions may contain 'hallucinations' or inaccuracies. Users are strictly advised to verify all critical financial, legal, or medical data extracted via the Protocol.",
            "LIABILITY: Cryptobulla and the Anti-Gravity team are not responsible for decisions made based on AI output. The Protocol is a tool for augmentation, not a replacement for human oversight.",
            "FORMATTING SENSITIVITY: Complex PDF structures (layers, embedded fonts, or low-quality scans) may degrade AI accuracy."
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
                    Back to Protocol
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
                        ANTI-GRAVITY // LEGAL PROTOCOL SECURED
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default LegalScreen;
