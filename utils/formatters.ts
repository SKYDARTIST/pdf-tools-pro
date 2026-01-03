// Format bytes to human-readable file size
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Format timestamp to relative time
export const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
};

// Get operation display name
export const getOperationName = (operation: string): string => {
    const names: Record<string, string> = {
        'merge': 'Merged',
        'split': 'Split',
        'compress': 'Compressed',
        'sign': 'Signed',
        'watermark': 'Watermarked',
        'image-to-pdf': 'Converted',
        'extract-text': 'Extracted',
        'repair': 'Repaired',
    };
    return names[operation] || operation;
};

// Get operation color
export const getOperationColor = (operation: string): string => {
    const colors: Record<string, string> = {
        'merge': 'bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/20',
        'split': 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20',
        'compress': 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        'sign': 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        'watermark': 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/20',
        'image-to-pdf': 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20',
        'extract-text': 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        'repair': 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/20',
    };
    return colors[operation] || 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/20';
};
