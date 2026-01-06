// File History Manager - Centralized file history with localStorage persistence

export interface FileHistoryEntry {
    id: string;
    fileName: string;
    operation: 'merge' | 'split' | 'compress' | 'sign' | 'watermark' | 'image-to-pdf' | 'extract-text' | 'repair' | 'metadata';
    originalSize?: number;
    finalSize?: number;
    timestamp: number;
    status: 'success' | 'error';
    thumbnail?: string;
    neuralSignature?: string; // Phase 5: AI-generated searchable metadata
}

const STORAGE_KEY = 'pdf-tools-history';
const MAX_ENTRIES = 100;

class FileHistoryManager {
    private static instance: FileHistoryManager;

    private constructor() { }

    static getInstance(): FileHistoryManager {
        if (!FileHistoryManager.instance) {
            FileHistoryManager.instance = new FileHistoryManager();
        }
        return FileHistoryManager.instance;
    }

    // Get all history entries
    getHistory(): FileHistoryEntry[] {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading history:', error);
            return [];
        }
    }

    // Add new entry
    addEntry(entry: Omit<FileHistoryEntry, 'id' | 'timestamp'>): void {
        try {
            const history = this.getHistory();
            const newEntry: FileHistoryEntry = {
                ...entry,
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
            };

            // Add to beginning of array
            history.unshift(newEntry);

            // Keep only last MAX_ENTRIES
            const trimmedHistory = history.slice(0, MAX_ENTRIES);

            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
        } catch (error) {
            console.error('Error adding history entry:', error);
        }
    }

    // Delete entry by ID
    deleteEntry(id: string): void {
        try {
            const history = this.getHistory();
            const filtered = history.filter(entry => entry.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        } catch (error) {
            console.error('Error deleting history entry:', error);
        }
    }

    // Clear all history
    clearHistory(): void {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing history:', error);
        }
    }

    // Search history
    searchHistory(query: string): FileHistoryEntry[] {
        const history = this.getHistory();
        const lowerQuery = query.toLowerCase();
        return history.filter(entry =>
            entry.fileName.toLowerCase().includes(lowerQuery) ||
            (entry.neuralSignature && entry.neuralSignature.toLowerCase().includes(lowerQuery))
        );
    }

    // Filter by operation
    filterByOperation(operation: FileHistoryEntry['operation']): FileHistoryEntry[] {
        const history = this.getHistory();
        return history.filter(entry => entry.operation === operation);
    }

    // Get recent entries (last N)
    getRecent(count: number = 5): FileHistoryEntry[] {
        const history = this.getHistory();
        return history.slice(0, count);
    }

    // Get stats
    getStats() {
        const history = this.getHistory();
        const totalFiles = history.length;
        const successCount = history.filter(e => e.status === 'success').length;
        const errorCount = history.filter(e => e.status === 'error').length;

        const totalSaved = history.reduce((acc, entry) => {
            if (entry.originalSize && entry.finalSize) {
                return acc + (entry.originalSize - entry.finalSize);
            }
            return acc;
        }, 0);

        return {
            totalFiles,
            successCount,
            errorCount,
            totalSaved,
        };
    }
}

export default FileHistoryManager.getInstance();
