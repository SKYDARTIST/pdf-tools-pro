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

    // AUTHENTICATION
    const deviceId = req.headers['x-ag-device-id'];
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    const session = await verifySessionToken(token, supabase);

    if (!session || (session.uid !== deviceId && !session.is_auth)) {
        console.warn(`API SECURITY: Blocked unauthenticated subscription request from ${deviceId}`);
        return res.status(401).json({ error: 'INVALID_SESSION', details: 'Session expired or invalid. Please login again.' });
    }

    const googleUid = session?.is_auth ? session.uid : null;

    // GET Query: Return simplified tier info
    if (req.method === 'GET') {
        let userData = null;

        if (googleUid) {
            const { data } = await supabase
                .from('user_accounts')
                .select('*')
                .eq('google_uid', googleUid)
                .single();

            if (data) userData = data;
        }

        if (!userData && deviceId && !session.is_auth) {
            const { data } = await supabase
                .from('ag_user_usage')
                .select('*')
                .eq('device_id', deviceId)
                .single();

            if (data) userData = data;
        }

        if (!userData) {
            const newUser = {
                google_uid: googleUid,
                device_id: deviceId,
                tier: 'free',
                updated_at: new Date().toISOString()
            };
            return res.status(200).json(newUser);
        }

        return res.status(200).json({
            tier: userData?.tier || 'free',
            updated_at: userData?.updated_at || new Date().toISOString()
        });
    }

    // POST Update: Only update metadata, no counters
    if (req.method === 'POST') {
        const updates = req.body;

        const csrfHeader = req.headers['x-csrf-token'];
        const currentUid = session?.uid || deviceId;
        const csrfPayload = await verifySessionToken(csrfHeader, supabase);

        if (!csrfPayload || csrfPayload.uid !== currentUid) {
            console.warn(`API SECURITY: CSRF validation failed for subscription update from ${deviceId}`);
            return res.status(403).json({ error: 'CSRF_VALIDATION_FAILED' });
        }

        const dbUpdates = {
            updated_at: new Date().toISOString()
        };

        try {
            if (googleUid) {
                await supabase
                    .from('user_accounts')
                    .upsert({ ...dbUpdates, google_uid: googleUid }, { onConflict: 'google_uid' });
            } else if (deviceId) {
                await supabase
                    .from('ag_user_usage')
                    .upsert({ ...dbUpdates, device_id: deviceId }, { onConflict: 'device_id' });
            }

            return res.status(200).json({ success: true });
        } catch (fatalError) {
            return res.status(500).json({ error: 'Internal Server Error', details: fatalError.message });
        }
    }
}
