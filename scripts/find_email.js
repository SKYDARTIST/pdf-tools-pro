import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const UUID = '242be86e-51ed-4b67-85bc-bd94b8b52bf0';

async function lookup() {
    console.log(`🛰️ Searching for UUID: ${UUID}...`);

    // 1. Check user_accounts (id)
    const { data: userAccountsId, error: err1 } = await supabase
        .from('user_accounts')
        .select('email, name, google_uid')
        .eq('id', UUID)
        .maybeSingle();

    if (userAccountsId) {
        console.log('✅ Found in user_accounts (id):', userAccountsId);
        return;
    }

    // 2. Check user_accounts (google_uid)
    const { data: userAccountsGoogle, error: err2 } = await supabase
        .from('user_accounts')
        .select('email, name, google_uid')
        .eq('google_uid', UUID)
        .maybeSingle();

    if (userAccountsGoogle) {
        console.log('✅ Found in user_accounts (google_uid):', userAccountsGoogle);
        return;
    }

    // 3. Check sessions (session_token or user_uid)
    const { data: sessions, error: err3 } = await supabase
        .from('sessions')
        .select('user_uid')
        .or(`session_token.eq.${UUID},user_uid.eq.${UUID}`)
        .limit(1);

    if (sessions && sessions.length > 0) {
        const uid = sessions[0].user_uid;
        console.log(`🔍 Found link in sessions. Linked UID: ${uid}. Fetching email...`);
        const { data: user } = await supabase
            .from('user_accounts')
            .select('email, name')
            .eq('google_uid', uid)
            .maybeSingle();
        if (user) {
            console.log('✅ Found linked user:', user);
            return;
        }
    }

    // 4. Check purchase_transactions (transaction_id)
    const { data: transactions, error: err4 } = await supabase
        .from('purchase_transactions')
        .select('google_uid, device_id')
        .eq('transaction_id', UUID)
        .maybeSingle();

    if (transactions) {
        console.log('🔍 Found in purchase_transactions. Fetching user info...');
        if (transactions.google_uid) {
            const { data: user } = await supabase
                .from('user_accounts')
                .select('email, name')
                .eq('google_uid', transactions.google_uid)
                .maybeSingle();
            if (user) {
                console.log('✅ Found user via transaction:', user);
                return;
            }
        }
        console.log('⚠️ Transaction found but no google_uid linked:', transactions);
    }

    console.log('❌ No user found for this UUID in production tables.');
}

lookup();
