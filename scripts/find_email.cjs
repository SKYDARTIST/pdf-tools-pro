const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// MANUAL DOTENV PARSING
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = envContent.match(/SUPABASE_URL="(.+)"/)[1];
const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY="(.+)"/)[1];

console.log('🛰️ Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);
const UUID = '242be86e-51ed-4b67-85bc-bd94b8b52bf0';

async function lookup() {
    console.log(`🛰️ Searching for UUID: ${UUID}...`);

    try {
        // 1. Check user_accounts (id)
        const { data: userAccountsId, error: err1 } = await supabase
            .from('user_accounts')
            .select('email, name, google_uid')
            .eq('id', UUID)
            .maybeSingle();

        if (userAccountsId) {
            console.log('✅ Found in user_accounts (id):', JSON.stringify(userAccountsId));
            return;
        }

        // 2. Check user_accounts (google_uid)
        const { data: userAccountsGoogle, error: err2 } = await supabase
            .from('user_accounts')
            .select('email, name, google_uid')
            .eq('google_uid', UUID)
            .maybeSingle();

        if (userAccountsGoogle) {
            console.log('✅ Found in user_accounts (google_uid):', JSON.stringify(userAccountsGoogle));
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
                console.log('✅ Found linked user:', JSON.stringify(user));
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
                    console.log('✅ Found user via transaction:', JSON.stringify(user));
                    return;
                }
            }
            console.log('⚠️ Transaction found but no google_uid linked:', JSON.stringify(transactions));
        }

        console.log('❌ No user found for this UUID in production tables.');
    } catch (e) {
        console.error('❌ Fatal error during lookup:', e.message);
    }
}

lookup();
