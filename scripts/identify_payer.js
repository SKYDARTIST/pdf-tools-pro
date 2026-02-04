
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// CONFIGURATION
const PACKAGE_NAME = 'com.cryptobulla.antigravity';
const PURCHASE_TOKEN = 'gclpnkhmdelkmhpbphbkpkol.AO-J1Oztb1FUQaHzjA_-Qh8vJ6tgG3Oa-1iXt0b6IBweq03_GleaF4KTSS2YmD8FLlOyrCqnO3ANGJrskRRPLkXtATFgX7m8pzldQGk9FFuMv8JZ7S8ro0Q';
const PRODUCT_ID = 'lifetime_pro_access';

async function identifyPayer() {
    console.log('🛰️ Identifying Payer from Google Play...');

    try {
        // 1. Get credentials from .env or JSON file
        const envPath = path.join(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');

        // Extract the JSON string from the .env file
        const match = envContent.match(/GOOGLE_SERVICE_ACCOUNT_JSON='(.+)'/);
        if (!match) {
            console.error('❌ Could not find GOOGLE_SERVICE_ACCOUNT_JSON in .env');
            return;
        }

        const credentials = JSON.parse(match[1]);

        // 2. Auth with Google
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/androidpublisher'],
        });

        const playApi = google.androidpublisher({ version: 'v3', auth });

        // 3. Fetch Purchase Details
        // Lifetime is a "Product", not a "Subscription"
        const res = await playApi.purchases.products.get({
            packageName: PACKAGE_NAME,
            productId: PRODUCT_ID,
            token: PURCHASE_TOKEN,
        });

        console.log('\n✅ FOUND ORDER DETAILS:');
        console.log('----------------------------');
        console.log('JSON Data:', JSON.stringify(res.data, null, 2));
        console.log('----------------------------');

        const externalId = res.data.obfuscatedExternalAccountId;

        if (externalId) {
            console.log(`\n🏆 THE PAYER'S INTERNAL ID IS: ${externalId}`);
            console.log(`Search for this ID in your Supabase 'user_accounts' table.`);
        } else {
            console.log('\n⚠️ Google did not return an External Account ID.');
            console.log('This happens if the app didnt pass the "UserId" during the purchase call.');
            console.log('You will need to match by the "Order Date" (Feb 3, 14:57 UTC) in Supabase instead.');
        }

    } catch (err) {
        console.error('❌ Google Play API Error:', err.message);
    }
}

identifyPayer();
