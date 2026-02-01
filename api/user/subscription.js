import { createClient } from '@supabase/supabase-js';
import { verifySessionToken, setSecurityHeaders } from '../_utils/auth.js';

// Initialize Supabase (Service Role for Admin Access)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    const ALLOWED_ORIGINS = [
        'capacitor://localhost',
        'http://localhost',
        'https://localhost',
        'http://localhost:3000',
        'http://localhost:5173',
        'https://pdf-tools-pro.vercel.app',
        'https://pdf-tools-pro-indol.vercel.app'
    ];

    setSecurityHeaders(res, req.headers.origin, ALLOWED_ORIGINS);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Authentication Strategy (v2.8.0 Unified)
    const deviceId = req.headers['x-ag-device-id'];
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    const session = await verifySessionToken(token, supabase);
    // FORCE LEGACY BYPASS OFF FOR PRODUCTION
    const legacyEnabled = false;

    // Must have a valid session matching the device (or be a verified Google user)
    if (!session || (session.uid !== deviceId && !session.is_auth)) {
        if (!legacyEnabled) {
            console.warn(`API SECURITY: Blocked unauthenticated subscription request from ${deviceId}`);
            return res.status(401).json({ error: 'INVALID_SESSION', details: 'Session expired or invalid. Please login again.' });
        }
        console.warn('API SECURITY: Legacy bypass active for', deviceId);
    }

    // Extract verified Google UID from session if present
    const googleUid = session?.is_auth ? session.uid : null;

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
        // SECURITY: Only allow deviceID lookup if we are NOT authenticated via Google (Issue #3)
        if (!userData && deviceId && !session.is_auth) {
            const { data, error } = await supabase
                .from('ag_user_usage')
                .select('*')
                .eq('device_id', deviceId)
                .single();

            if (data) userData = data;
        }

        if (!userData) {
            // AUTO-CREATE record if it doesn't exist (Global FREE Logic)
            const newUser = {
                google_uid: googleUid,
                device_id: deviceId,
                tier: 'free',
                operations_today: 0,
                ai_docs_weekly: 0,
                ai_docs_monthly: 0,
                last_operation_reset: new Date().toISOString(),
                last_ai_weekly_reset: new Date().toISOString(),
                last_ai_monthly_reset: new Date().toISOString(),
                has_received_bonus: true,
                trial_start_date: new Date().toISOString()
            };

            return res.status(200).json(newUser);
        }

        return res.status(200).json({
            tier: userData?.tier || 'free', // USE ACTUAL TIER
            operations_today: userData?.operations_today || 0,
            ai_docs_weekly: userData?.ai_docs_weekly || 0,
            ai_docs_monthly: userData?.ai_docs_monthly || 0,
            last_reset_daily: userData?.last_operation_reset || new Date().toISOString(),
            last_reset_weekly: userData?.last_ai_weekly_reset || new Date().toISOString(),
            last_reset_monthly: userData?.last_ai_monthly_reset || new Date().toISOString(),
            has_received_bonus: true,
            trial_start_date: userData?.trial_start_date || new Date().toISOString()
        });
    }

    // 4. POST Update
    if (req.method === 'POST') {
        const updates = req.body;

        if (!updates) {
            return res.status(400).json({ error: 'Missing request body' });
        }

        // SECURITY: CSRF Protection (Defense-in-Depth)
        const csrfHeader = req.headers['x-csrf-token'];
        const currentUid = session?.uid || deviceId;
        // CSRF verification using the same database-backed logic
        const csrfPayload = await verifySessionToken(csrfHeader, supabase);

        if (!csrfPayload || csrfPayload.uid !== currentUid) {
            console.warn(`API SECURITY: CSRF validation failed for subscription update from ${deviceId}`);
            return res.status(403).json({ error: 'CSRF_VALIDATION_FAILED' });
        }

        // SECURITY: CRITICAL VULNERABILITY FIX (P0) - Tier Injection Prevention
        // trusts NO client-provided state for billing or AI quota fields.
        const dbUpdates = {
            operations_today: updates.operationsToday,
            last_operation_reset: updates.lastOperationReset,
            updated_at: new Date().toISOString()
        };

        let result;

        try {
            if (googleUid) {
                result = await supabase
                    .from('user_accounts')
                    .upsert({ ...dbUpdates, google_uid: googleUid }, { onConflict: 'google_uid' });
            }
            else if (deviceId) {
                // Bridge old column names for ag_user_usage
                const legacyUpdates = {
                    ...dbUpdates,
                    device_id: deviceId,
                    last_reset_daily: updates.lastOperationReset,
                    last_reset_weekly: updates.lastAiWeeklyReset,
                    last_reset_monthly: updates.lastAiMonthlyReset
                };
                delete legacyUpdates.last_operation_reset;
                delete legacyUpdates.last_ai_weekly_reset;
                delete legacyUpdates.last_ai_monthly_reset;

                result = await supabase
                    .from('ag_user_usage')
                    .upsert(legacyUpdates, { onConflict: 'device_id' });
            }

            if (result?.error) {
                console.error('API: DB Update Error', result.error);
                return res.status(500).json({
                    error: 'Failed to save data',
                    details: result.error.message,
                    hint: 'Ensure your database schema is updated using supabase_google_auth.sql'
                });
            }

            return res.status(200).json({ success: true });
        } catch (fatalError) {
            console.error('API: Fatal Update Error', fatalError);
            return res.status(500).json({ error: 'Internal Server Error', details: fatalError.message });
        }
    }
}
