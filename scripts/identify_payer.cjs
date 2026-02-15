
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// CONFIGURATION
const PACKAGE_NAME = 'com.cryptobulla.antigravity';
const PURCHASE_TOKEN = process.argv[2];
const PRODUCT_ID = process.argv[3] || 'lifetime_pro_access';

if (!PURCHASE_TOKEN) {
    console.error('Usage: node scripts/identify_payer.cjs <PURCHASE_TOKEN> [PRODUCT_ID]');
    process.exit(1);
}

async function identifyPayer() {
    console.log('🛰️ Identifying Payer from Google Play...');

    try {
        // 1. Get credentials from .env or JSON file
        const envPath = fs.existsSync(path.join(process.cwd(), '.env.local'))
            ? path.join(process.cwd(), '.env.local')
            : path.join(process.cwd(), '.env');

        if (!fs.existsSync(envPath)) {
            console.error('❌ Could not find .env or .env.local');
            return;
        }

        const envContent = fs.readFileSync(envPath, 'utf8');

        // Extract the JSON string from the .env file (handle double quotes and escaped chars)
        const match = envContent.match(/GOOGLE_SERVICE_ACCOUNT_JSON="({[\s\S]+?})"/);
        if (!match) {
            console.error('❌ Could not find GOOGLE_SERVICE_ACCOUNT_JSON in .env (tried double quotes)');
            return;
        }

        let jsonString = match[1];
        // Handle escaped double quotes inside the string
        jsonString = jsonString.replace(/\\"/g, '"').replace(/\\n/g, '\n');

        const credentials = JSON.parse(jsonString);

        // 2. Auth with Google
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/androidpublisher'],
        });

        const playApi = google.androidpublisher({ version: 'v3', auth });

        // 3. Fetch Purchase Details
        const res = await playApi.purchases.products.get({
            packageName: PACKAGE_NAME,
            productId: PRODUCT_ID,
            token: PURCHASE_TOKEN,
        });

        console.log('\n✅ FOUND ORDER DETAILS:');
        console.log('----------------------------');
        console.log(JSON.stringify(res.data, null, 2));
        console.log('----------------------------');

        const externalId = res.data.obfuscatedExternalAccountId;

        if (externalId) {
            console.log(`\n🏆 THE PAYER'S INTERNAL ID IS: ${externalId}`);
        } else {
            console.log('\n⚠️ Google did not return an External Account ID.');
        }

    } catch (err) {
        console.error('❌ Google Play API Error:', err.message);
    }
}

identifyPayer();
