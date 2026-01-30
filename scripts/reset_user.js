import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetUser(email) {
    console.log(`Searching for user with email: ${email}...`);

    // 1. Find user in user_accounts
    const { data: user, error: findError } = await supabase
        .from('user_accounts')
        .select('google_uid, email')
        .eq('email', email)
        .single();

    if (findError) {
        console.error('Error finding user:', findError.message);
        return;
    }

    const googleUid = user.google_uid;
    console.log(`Found user: ${email} (UID: ${googleUid})`);

    // 2. Reset user_accounts
    console.log('Resetting user_accounts tier to free...');
    const { error: updateAuthError } = await supabase
        .from('user_accounts')
        .update({
            tier: 'free',
            ai_pack_credits: 0,
            ai_docs_weekly: 0,
            ai_docs_monthly: 0,
            operations_today: 0
        })
        .eq('google_uid', googleUid);

    if (updateAuthError) {
        console.error('Error updating user_accounts:', updateAuthError.message);
    } else {
        console.log('✅ successfully reset user_accounts');
    }

    // 3. Reset ag_user_usage (device record) - optional but good for cleanliness
    // Since we don't have the device_id, we can't easily reset this unless we search for it
    // But resetting the user_accounts is enough for Google Login users as it syncs.

    console.log('Done.');
}

const targetEmail = process.argv[2] || 'cryptobulla369@gmail.com';
resetUser(targetEmail);
