import { createClient } from '@supabase/supabase-js';

// Initialize Supabase (Service Role for Admin Access)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // 1. CORS & Security Headers
    const origin = req.headers.origin;
    const ALLOWED_ORIGINS = [
        'capacitor://localhost',
        'http://localhost',
        'https://localhost',
        'http://localhost:3000',
        'http://localhost:5173',
        'https://pdf-tools-pro.vercel.app',
        'https://pdf-tools-pro-indol.vercel.app'
    ];

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ag-device-id');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Authentication Strategy
    let googleUid = null;
    let deviceId = req.headers['x-ag-device-id'];

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        // If token length is small (e.g. < 50 chars), it's likely our raw Google ID (from client)
        // ideally we verify a JWT, but for Phase 1 we accept the UID if provided by valid client
        // In a real prod env, verify the JWT properly.
        if (token.length > 10) {
            googleUid = token; // Keeping it simple for the migration phase
        }
    }

    // Must have at least one identifier
    if (!googleUid && !deviceId) {
        return res.status(401).json({ error: 'Unauthorized: Missing User ID' });
    }

    console.log(`API: Processing request for ${googleUid ? 'Google User' : 'Device User'} (${googleUid || deviceId})`);

    // 3. GET Query
    if (req.method === 'GET') {
        let userData = null;

        // Priority 1: Check Google Account
        if (googleUid) {
            const { data, error } = await supabase
                .from('user_accounts')
                .select('*')
                .eq('google_uid', googleUid)
                .single();

            if (data) userData = data;
        }

        // Priority 2: Check Device ID (Fallback/Legacy)
        if (!userData && deviceId) {
            // We check the OLD table for legacy users
            const { data, error } = await supabase
                .from('ag_user_usage')
                .select('*')
                .eq('device_id', deviceId)
                .single();

            if (data) userData = data;
        }

        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Map database fields to frontend structure (CamelCase)
        return res.status(200).json({
            tier: userData.tier,
            operationsToday: userData.operations_today,
            aiDocsThisWeek: userData.ai_docs_weekly,
            aiDocsThisMonth: userData.ai_docs_monthly,
            aiPackCredits: userData.ai_pack_credits,
            lastOperationReset: userData.last_operation_reset,
            hasReceivedBonus: userData.has_received_bonus
        });
    }

    // 4. POST Update
    if (req.method === 'POST') {
        const updates = req.body;

        // Map frontend CamelCase to DB snake_case
        const dbUpdates = {
            tier: updates.tier,
            ai_pack_credits: updates.aiPackCredits,
            operations_today: updates.operationsToday,
            ai_docs_weekly: updates.aiDocsThisWeek,
            ai_docs_monthly: updates.aiDocsThisMonth,
            last_operation_reset: updates.lastOperationReset,
            last_ai_weekly_reset: updates.lastAiWeeklyReset,
            last_ai_monthly_reset: updates.lastAiMonthlyReset,
            has_received_bonus: updates.hasReceivedBonus,
            updated_at: new Date().toISOString()
        };

        let error = null;

        // Save to User Accounts if logged in
        if (googleUid) {
            const result = await supabase
                .from('user_accounts')
                .upsert({ ...dbUpdates, google_uid: googleUid }, { onConflict: 'google_uid' });
            error = result.error;
        }
        // Save to Device Storage (Legacy) if not logged in
        else if (deviceId) {
            const result = await supabase
                .from('ag_user_usage')
                .upsert({ ...dbUpdates, device_id: deviceId }, { onConflict: 'device_id' });
            error = result.error;
        }

        if (error) {
            console.error('API: DB Update Error', error);
            return res.status(500).json({ error: 'Failed to save data' });
        }

        return res.status(200).json({ success: true });
    }
}
