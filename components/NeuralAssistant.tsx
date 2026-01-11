import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Sparkles, Zap, ChevronDown, ListChecks, Rocket, ShieldAlert } from 'lucide-react';
import { askGemini } from '../services/aiService';
import { canUseAI, recordAIUsage } from '../services/subscriptionService';
import { useNavigate } from 'react-router-dom';

const TOOL_MAPPING: Record<string, { name: string; path: string }> = {
    'MERGE': { name: 'Merge Tool', path: '/merge' },
    'SPLIT': { name: 'Split Tool', path: '/split' },
    'AUDIT': { name: 'Neural Audit', path: '/reader?protocol=audit' },
    'EXTRACT': { name: 'Intelligence Extractor', path: '/data-extractor' },
    'REDACT': { name: 'Neural Redact', path: '/smart-redact' },
    'SCAN': { name: 'Scanner', path: '/scanner' },
    'SIGN': { name: 'Sign Tool', path: '/sign' },
    'WATERMARK': { name: 'Watermark Tool', path: '/watermark' },
    'WORKSPACE': { name: 'AI Workspace', path: '/ag-workspace' },
    'DIFF': { name: 'Neural Diff', path: '/neural-diff' }
};

const NeuralAssistant: React.FC = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'bot' | 'user', text: string, action?: { name: string; path: string } }[]>([
        { role: 'bot', text: 'Anti-Gravity Neural Assistant online. The Protocol is ready for synchronization. How can I assist your document manipulation today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Listen for External Synapse Triggers (e.g. from Tools screen)
    useEffect(() => {
        const handleSync = (e: any) => {
            const { query, guidance } = e.detail || {};
            if (query) {
                setIsOpen(true);
                handleSend(query);
            }
        };

        window.addEventListener('neural-assistant-sync', handleSync);
        return () => window.removeEventListener('neural-assistant-sync', handleSync);
    }, []);

    const quickChips = [
        { label: 'Find Savings in PDFs 💰', query: 'How can I find savings or risks in my documents using Neural Audit?' },
        { label: 'Hide Private Info 🛡️', query: 'How do I automatically redact PII from my files?' },
        { label: 'Extract Data 📊', query: 'How do I convert a scanned invoice into structured data?' },
        { label: 'Merge Payloads 📑', query: 'What is the best way to combine multiple PDF files?' }
    ];

    const handleSend = async (customQuery?: string) => {
        const query = customQuery || input;
        if (!query.trim() || isLoading) return;

        // ALL ASSISTANT INTERACTIONS ARE FREE (Protocol Transparency)
        const type = 'guidance';
        const check = canUseAI(type);
        if (!check.allowed) {
            setMessages(prev => [...prev, { role: 'bot', text: `Authorization Failed: ${check.reason}` }]);
            return;
        }

        const userMsg = query;
        if (!customQuery) setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        const systemPrompt = `
        You are the "Anti-Gravity Protocol Assistant". You are cold, efficient, helping users navigate the 15+ local PDF tools.
        
        IDENTITY: Professional, high-tech, and brief. Use terms like "Protocol", "Payload", "Neural", "Synapse", "Archive".
        
        FREE GUIDANCE: Explicitly inform users that questions about how the app works are ALWAYS FREE and do not consume their AI budget. This build trust and encourages exploration.
        
        ZERO-CLOUD ANCHOR: The Anti-Gravity Protocol is strictly local. We do not trust the cloud with sensitive payloads. All processing is ephemeral.
        
        KNOWLEDGE BASE:
        1. Workspace (/ag-workspace): Chat with PDFs, summarize.
        2. Neural Audit (/reader?protocol=audit): Risk and savings analysis.
        3. Intelligence Extractor (/data-extractor): Vision OCR for data.
        4. Neural Redact (/smart-redact): Auto PII detection.
        5. Neural Diff (/neural-diff): Semantic comparison.
        6. Core Ops: Merge (/merge), Split (/split), Rotate (/rotate), Sign (/sign), Watermark (/watermark), Scanner (/scanner), Image to PDF (/image-to-pdf).
        
        ACTION TRIGGER: If you suggest a specific tool, you MUST include the signal "ACTION_REQUIRED: [TOOL_KEY]" at the end of your message.
        TOOL_KEYS: MERGE, SPLIT, AUDIT, EXTRACT, REDACT, SCAN, SIGN, WATERMARK, WORKSPACE, DIFF.
        `.trim();

        try {
            const response = await askGemini(userMsg, systemPrompt, 'guidance');

            // Parse for actions
            let cleanText = response;
            let action: { name: string; path: string } | undefined;

            const actionMatch = response.match(/ACTION_REQUIRED:\s*(\w+)/);
            if (actionMatch && actionMatch[1]) {
                const key = actionMatch[1].toUpperCase();
                if (TOOL_MAPPING[key]) {
                    action = TOOL_MAPPING[key];
                    cleanText = response.replace(/ACTION_REQUIRED:\s*\w+/, '').trim();
                }
            }

            setMessages(prev => [...prev, { role: 'bot', text: cleanText, action }]);
            await recordAIUsage(type);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'bot', text: "Logic Interruption. Signal lost. Please retry synchronization." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-24 right-6 z-50 pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="pointer-events-auto bg-white/95 dark:bg-black/95 backdrop-blur-2xl rounded-[32px] w-[380px] max-w-[calc(100vw-48px)] h-[500px] sm:h-[600px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] border border-black/5 dark:border-white/10 flex flex-col overflow-hidden mb-4"
                    >
                        {/* Header */}
                        <div className="p-6 bg-black text-white dark:bg-white dark:text-black flex items-center justify-between shadow-2xl relative overflow-hidden shrink-0">
                            <motion.div
                                animate={{ opacity: [0.1, 0.2, 0.1] }}
                                transition={{ repeat: Infinity, duration: 4 }}
                                className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20"
                            />
                            <div className="flex items-center gap-3 relative z-10">
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ repeat: Infinity, duration: 3 }}
                                    className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30"
                                >
                                    <Sparkles size={16} className="text-emerald-500" />
                                </motion.div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Protocol Assistant</div>
                                    <div className="text-sm font-black uppercase tracking-tighter">Neural Link Active</div>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="hover:opacity-70 transition-opacity relative z-10">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
                            {messages.map((m, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className="flex flex-col gap-3 max-w-[85%]">
                                        <div className={`p-5 rounded-[24px] text-xs font-bold leading-relaxed shadow-sm ${m.role === 'user'
                                            ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-none'
                                            : 'bg-black/5 dark:bg-white/5 text-gray-900 dark:text-white rounded-tl-none border border-black/5 dark:border-white/10'
                                            }`}>
                                            {m.role === 'bot' && <div className="text-[8px] font-black uppercase tracking-widest opacity-30 mb-2 flex items-center gap-2"><Bot size={10} /> INCOMING TRANSMISSION</div>}
                                            {m.text}
                                        </div>

                                        {m.action && (
                                            <motion.button
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => navigate(m.action!.path)}
                                                className="flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20"
                                            >
                                                <Rocket size={12} />
                                                Launch {m.action.name}
                                            </motion.button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-black/5 dark:bg-white/5 p-5 rounded-2xl rounded-tl-none animate-pulse flex flex-col gap-3">
                                        <div className="text-[8px] font-black uppercase tracking-widest opacity-30">Decrypting...</div>
                                        <div className="flex gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Chips */}
                        <div className="px-6 py-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                            {quickChips.map((chip) => (
                                <button
                                    key={chip.label}
                                    onClick={() => handleSend(chip.query)}
                                    className="px-4 py-2 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/10 transition-all whitespace-nowrap"
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-6 border-t border-black/5 dark:border-white/10 bg-black/2 dark:bg-white/2 shrink-0">
                            <div className="relative flex items-center gap-3 bg-black/5 dark:bg-white/5 rounded-2xl px-5 py-4 border border-black/5 dark:border-white/10">
                                <input
                                    type="text"
                                    placeholder="ASK ABOUT PROTOCOLS..."
                                    className="flex-1 bg-transparent border-none text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={isLoading}
                                    className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-30"
                                >
                                    <Zap size={16} fill="currentColor" />
                                </button>
                            </div>
                            <div className="mt-4 flex items-center justify-center gap-2 opacity-20">
                                <ShieldAlert size={10} />
                                <span className="text-[8px] font-black uppercase tracking-widest">Local Ephemeral Link Active</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button with Breathing Pulse */}
            <motion.button
                initial={false}
                animate={{
                    scale: [1, 1.05, 1],
                    boxShadow: [
                        "0 16px 32px -12px rgba(0,0,0,0.5)",
                        "0 16px 48px -12px rgba(16, 185, 129, 0.3)",
                        "0 16px 32px -12px rgba(0,0,0,0.5)"
                    ]
                }}
                transition={{
                    repeat: Infinity,
                    duration: 4,
                    ease: "easeInOut"
                }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="pointer-events-auto w-16 h-16 bg-black dark:bg-white text-white dark:text-black rounded-3xl flex items-center justify-center relative overflow-hidden group border border-white/10 dark:border-black/10 z-50 shadow-2xl"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                {isOpen ? <ChevronDown size={28} /> : <MessageSquare size={28} />}

                {!isOpen && (
                    <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-black shadow-lg shadow-emerald-500/50"
                    />
                )}
            </motion.button>
        </div>
    );
};

export default NeuralAssistant;
