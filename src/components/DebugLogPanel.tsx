import React, { useState, useEffect } from 'react';
import { X, Copy, Trash2, RefreshCcw } from 'lucide-react';
import { getLogs, clearLogs, getLogsAsText } from '@/services/persistentLogService';
import TaskLimitManager from '@/utils/TaskLimitManager';

interface DebugLogPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const DebugLogPanel: React.FC<DebugLogPanelProps> = ({ isOpen, onClose }) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLogs(getLogs());
        }
    }, [isOpen]);

    const handleCopyLogs = () => {
        const logsText = getLogsAsText();
        navigator.clipboard.writeText(logsText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClearLogs = () => {
        if (confirm('Clear all logs?')) {
            clearLogs();
            setLogs([]);
        }
    };

    const handleResetTiers = () => {
        if (confirm('⚠️ NUCLEAR RESET: This will clear all local Pro/Lifetime status and log you out. Proceed?')) {
            TaskLimitManager.resetToFree();
            localStorage.removeItem('google_user');
            localStorage.removeItem('access_token');
            localStorage.removeItem('google_uid');
            localStorage.removeItem('session_token');
            localStorage.removeItem('pdf_tools_subscription');
            localStorage.removeItem('ag_csrf_token');
            window.location.reload();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end">
            <div className="w-full max-h-[80vh] bg-gray-900 border-t border-gray-700 flex flex-col rounded-t-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h3 className="text-white font-bold text-lg">Debug Logs</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopyLogs}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-300 hover:text-white"
                            title="Copy logs to clipboard"
                        >
                            <Copy size={18} />
                        </button>
                        <button
                            onClick={handleClearLogs}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-300 hover:text-white"
                            title="Clear logs"
                        >
                            <Trash2 size={18} />
                        </button>
                        <button
                            onClick={handleResetTiers}
                            className="p-2 hover:bg-red-900/40 rounded-lg transition-colors text-red-400 hover:text-red-300"
                            title="Reset to Free (Testing)"
                        >
                            <RefreshCcw size={18} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-300 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Logs Container */}
                <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2">
                    {logs.length === 0 ? (
                        <div className="text-gray-500 text-center py-8">
                            No logs yet. Perform an action to capture logs.
                        </div>
                    ) : (
                        logs.map((log, idx) => (
                            <div key={idx} className={`
                                p-2 rounded text-xs
                                ${log.level === 'error' ? 'bg-red-900/30 text-red-200' : ''}
                                ${log.level === 'warn' ? 'bg-yellow-900/30 text-yellow-200' : ''}
                                ${log.level === 'log' ? 'bg-gray-800 text-gray-100' : ''}
                                ${log.level === 'info' ? 'bg-blue-900/30 text-blue-200' : ''}
                            `}>
                                <div className="text-gray-400">[{new Date(log.timestamp).toLocaleTimeString()}] {log.level.toUpperCase()}</div>
                                <div className="text-gray-100">{log.message}</div>
                                {log.data && (
                                    <div className="text-gray-400 mt-1 ml-2 max-h-24 overflow-y-auto">
                                        <pre>{JSON.stringify(log.data, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-900/50 text-sm text-gray-400">
                    {copied && <span className="text-green-400">✅ Copied to clipboard!</span>}
                    {!copied && <span>{logs.length} log entries</span>}
                </div>
            </div>
        </div>
    );
};

export default DebugLogPanel;
