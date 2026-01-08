import { supabase } from './supabase';
import { UserSubscription, SubscriptionTier } from './subscriptionService';

const DEVICE_ID_KEY = 'ag_device_id';

// Get or generate a unique ID for this device/browser
export const getDeviceId = (): string => {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
};

export const fetchUserUsage = async (): Promise<UserSubscription | null> => {
    const deviceId = getDeviceId();

    // Attempt to find existing usage record
    const { data, error } = await supabase
        .from('ag_user_usage')
        .select('*')
        .eq('device_id', deviceId)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching usage from Supabase:', error);
        return null;
    }

    if (data) {
        return {
            tier: data.tier as SubscriptionTier,
            operationsToday: data.operations_today,
            aiDocsThisWeek: data.ai_docs_weekly,
            aiDocsThisMonth: data.ai_docs_monthly,
            aiPackCredits: data.ai_pack_credits,
            lastOperationReset: data.last_reset_daily,
            lastAiWeeklyReset: data.last_reset_weekly,
            lastAiMonthlyReset: data.last_reset_monthly,
        };
    }

    // If no record exists, create one for this device
    const initialUsage = {
        device_id: deviceId,
        tier: SubscriptionTier.FREE,
        operations_today: 0,
        ai_docs_weekly: 0,
        ai_docs_monthly: 0,
        ai_pack_credits: 0,
    };

    const { data: newData, error: createError } = await supabase
        .from('ag_user_usage')
        .insert([initialUsage])
        .select()
        .single();

    if (createError) {
        console.error('Error creating usage record:', createError);
        return null;
    }

    return {
        tier: newData.tier as SubscriptionTier,
        operationsToday: newData.operations_today,
        aiDocsThisWeek: newData.ai_docs_weekly,
        aiDocsThisMonth: newData.ai_docs_monthly,
        aiPackCredits: newData.ai_pack_credits,
        lastOperationReset: newData.last_reset_daily,
        lastAiWeeklyReset: newData.last_reset_weekly,
        lastAiMonthlyReset: newData.last_reset_monthly,
    };
};

export const syncUsageToServer = async (usage: UserSubscription): Promise<void> => {
    const deviceId = getDeviceId();

    const { error } = await supabase
        .from('ag_user_usage')
        .update({
            tier: usage.tier,
            operations_today: usage.operationsToday,
            ai_docs_weekly: usage.aiDocsThisWeek,
            ai_docs_monthly: usage.aiDocsThisMonth,
            ai_pack_credits: usage.aiPackCredits,
            last_reset_daily: usage.lastOperationReset,
            last_reset_weekly: usage.lastAiWeeklyReset,
            last_reset_monthly: usage.lastAiMonthlyReset,
        })
        .eq('device_id', deviceId);

    if (error) {
        console.error('Error syncing usage to Supabase:', error);
    }
};
