import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Activity, ShieldCheck, Cpu } from 'lucide-react';

export interface LogEntry {
    id: string;
    type: 'status' | 'success' | 'warning' | 'error';
    message: string;
    source: string;
}

const SystemLog: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Simulation for demonstration / Global event listener in real use
    useEffect(() => {
        const addInitialLogs = () => {
            const initialLogs: LogEntry[] = [
                { id: '1', type: 'status', message: 'NEURAL_LINK_ESTABLISHED', source: 'KERNEL' },
                { id: '2', type: 'success', message: 'ENCRYPTION_ACTIVE_REV_4', source: 'SEC_MOD' },
            ];
            setLogs(initialLogs);
        };

        addInitialLogs();

        // Listen for custom "system-log" events
        const handleLog = (e: any) => {
            const newLog = e.detail;
            setLogs(prev => [newLog, ...prev].slice(0, 3));
        };

        window.addEventListener('system-log', handleLog);
        return () => window.removeEventListener('system-log', handleLog);
    }, []);

    return (
        <div className="fixed bottom-24 right-4 z-[60] flex flex-col items-end gap-1.5 pointer-events-none select-none">
            <AnimatePresence>
                {logs.map((log) => (
                    <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 0.4, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 10, scale: 0.95 }}
                        whileHover={{ opacity: 0.8 }}
                        className="monolith-glass px-3 py-1.5 flex items-center gap-2.5 rounded-xl border-none shadow-sm min-w-[140px]"
                    >
                        <div className={`w-1 h-1 rounded-full ${log.type === 'success' ? 'bg-green-500' :
                            log.type === 'error' ? 'bg-red-500' :
                                'bg-blue-500'
                            } opacity-50`} />
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black tracking-widest text-gray-400 dark:text-gray-600 uppercase leading-none">{log.source}</span>
                            <span className="text-[8px] font-bold tracking-tight text-gray-500 dark:text-gray-400 uppercase truncate max-w-[120px]">
                                {log.message}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default SystemLog;
