/**
 * IndexedDB Queue Service
 * Persistent queue storage that survives app reinstalls
 * Used for pending purchases that need verification retries
 */

interface QueueItem {
    id: string; // Unique identifier (transactionId)
    data: any;
    addedAt: number;
    retryCount: number;
    lastRetryAt?: number;
}

interface QueueDatabase {
    [storeName: string]: QueueItem[];
}

const DB_NAME = 'ag-queue-db';
const DB_VERSION = 1;

export class IndexedDBQueue {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    /**
     * Initialize IndexedDB connection
     */
    async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDBQueue: Failed to open database', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDBQueue: Database initialized');
                resolve();
            };

            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create object stores for each queue type
                const storeNames = ['pending-purchases', 'failed-syncs'];

                storeNames.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { keyPath: 'id' });
                        store.createIndex('addedAt', 'addedAt', { unique: false });
                        store.createIndex('retryCount', 'retryCount', { unique: false });
                        console.log(`IndexedDBQueue: Created store ${storeName}`);
                    }
                });
            };
        });

        return this.initPromise;
    }

    /**
     * Add item to queue
     */
    async add(storeName: string, id: string, data: any): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('IndexedDBQueue not initialized');

        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        const item: QueueItem = {
            id,
            data,
            addedAt: Date.now(),
            retryCount: 0
        };

        return new Promise((resolve, reject) => {
            const request = store.add(item);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                console.log(`IndexedDBQueue: Added to ${storeName}`, { id });
                resolve();
            };
        });
    }

    /**
     * Get all items from queue
     */
    async getAll(storeName: string): Promise<QueueItem[]> {
        await this.init();
        if (!this.db) throw new Error('IndexedDBQueue not initialized');

        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                resolve(request.result);
            };
        });
    }

    /**
     * Get item by ID
     */
    async getById(storeName: string, id: string): Promise<QueueItem | undefined> {
        await this.init();
        if (!this.db) throw new Error('IndexedDBQueue not initialized');

        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                resolve(request.result);
            };
        });
    }

    /**
     * Update retry count for an item
     */
    async incrementRetry(storeName: string, id: string): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('IndexedDBQueue not initialized');

        const item = await this.getById(storeName, id);
        if (!item) {
            throw new Error(`Item not found: ${id}`);
        }

        item.retryCount += 1;
        item.lastRetryAt = Date.now();

        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.put(item);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                console.log(`IndexedDBQueue: Incremented retry for ${id}`, { retryCount: item.retryCount });
                resolve();
            };
        });
    }

    /**
     * Remove item from queue
     */
    async remove(storeName: string, id: string): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('IndexedDBQueue not initialized');

        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                console.log(`IndexedDBQueue: Removed from ${storeName}`, { id });
                resolve();
            };
        });
    }

    /**
     * Remove items that exceed max retry count
     */
    async removeExceededRetries(storeName: string, maxRetries: number = 10): Promise<number> {
        await this.init();
        if (!this.db) throw new Error('IndexedDBQueue not initialized');

        const items = await this.getAll(storeName);
        let removed = 0;

        for (const item of items) {
            if (item.retryCount >= maxRetries) {
                await this.remove(storeName, item.id);
                console.warn(`IndexedDBQueue: Removed item after ${maxRetries} retries`, {
                    id: item.id,
                    storeName,
                    age: Date.now() - item.addedAt
                });
                removed++;
            }
        }

        return removed;
    }

    /**
     * Clear all items from a store
     */
    async clear(storeName: string): Promise<void> {
        await this.init();
        if (!this.db) throw new Error('IndexedDBQueue not initialized');

        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                console.log(`IndexedDBQueue: Cleared ${storeName}`);
                resolve();
            };
        });
    }

    /**
     * Get queue size
     */
    async size(storeName: string): Promise<number> {
        const items = await this.getAll(storeName);
        return items.length;
    }

    /**
     * Export entire queue (for debugging)
     */
    async exportQueue(storeName: string): Promise<any[]> {
        const items = await this.getAll(storeName);
        return items.map(item => ({
            ...item,
            ageMs: Date.now() - item.addedAt
        }));
    }
}

export const indexedDBQueue = new IndexedDBQueue();
