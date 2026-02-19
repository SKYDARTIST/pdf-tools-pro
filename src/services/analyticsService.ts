/**
 * Anti-Gravity Analytics Service
 * Lightweight event tracking — localStorage queue + Supabase sync.
 * 
 * Design:
 * - Events batch in localStorage under 'ag_analytics_queue'
 * - Flush to Supabase every 30 events or on manual flush()
 * - Fire-and-forget: if Supabase fails, events stay in queue
 * - No PII: no emails, no file names, no document content
 */

import { supabase } from './supabaseClient';
import { getDeviceId } from './deviceService';
import { Logger } from '@/utils/logger';

const QUEUE_KEY = 'ag_analytics_queue';
const FLUSH_THRESHOLD = 30;

interface AnalyticsEvent {
    event: string;
    data: Record<string, any>;
    timestamp: string;
}

const getQueue = (): AnalyticsEvent[] => {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
        return [];
    }
};

const saveQueue = (queue: AnalyticsEvent[]): void => {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
        // localStorage full — drop oldest events
        const trimmed = queue.slice(-10);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
    }
};

const flush = async (): Promise<void> => {
    const queue = getQueue();
    if (queue.length === 0) return;

    try {
        const deviceId = await getDeviceId();

        const rows = queue.map(e => ({
            device_id: deviceId,
            event: e.event,
            data: e.data,
            created_at: e.timestamp,
        }));

        const { error } = await supabase.from('ag_analytics').insert(rows);

        if (error) {
            Logger.warn('Analytics', 'Flush failed, keeping queue', { error: error.message });
            return;
        }

        // Clear queue only on success
        localStorage.removeItem(QUEUE_KEY);
        Logger.debug('Analytics', `Flushed ${rows.length} events to Supabase`);
    } catch (err) {
        Logger.warn('Analytics', 'Flush network error, will retry later');
    }
};

const track = (event: string, data: Record<string, any> = {}): void => {
    const entry: AnalyticsEvent = {
        event,
        data,
        timestamp: new Date().toISOString(),
    };

    const queue = getQueue();
    queue.push(entry);
    saveQueue(queue);

    Logger.debug('Analytics', `tracked: ${event}`, data);

    // Auto-flush when threshold reached
    if (queue.length >= FLUSH_THRESHOLD) {
        flush();
    }
};

export const Analytics = {
    track,
    flush,
};

export default Analytics;
