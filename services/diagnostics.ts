/**
 * Session Validation Diagnostics
 * Run this to pinpoint where the token validation is failing
 */

import Config from './configService';
import AuthService from './authService';

export async function diagnoseSessionFailure() {
    console.log('🔍 Session Validation Diagnostics Started...\n');

    try {
        // Step 1: Perform handshake
        console.log('Step 1️⃣  Performing handshake...');
        const { token, success } = await AuthService.initializeSession();

        if (!success || !token) {
            console.error('❌ FAILURE: No sessionToken returned from handshake');
            return false;
        }

        console.log(`✅ Received token: ${token.substring(0, 20)}...`);

        // Step 2: Immediately use the token
        console.log('\nStep 2️⃣  Testing token immediately after handshake...');
        const subscriptionResponse = await fetch(
            `${Config.VITE_AG_API_URL}/api/user/subscription`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'x-ag-device-id': localStorage.getItem('device_id') || 'unknown'
                }
            }
        );

        console.log(`Subscription Status: ${subscriptionResponse.status}`);

        if (subscriptionResponse.status === 401) {
            console.error('❌ FAILURE: Token rejected immediately after handshake');
            console.error('This indicates a session persistence issue on the backend');

            const errorData = await subscriptionResponse.json().catch(() => ({}));
            console.log('Backend Error:', errorData);

            console.log('\n🛠️  Likely causes:');
            console.log('1. Session token not persisted to database during handshake');
            console.log('2. Database replication lag (read replica out of sync)');
            console.log('3. Token validation logic differs between endpoints');
            console.log('4. Signing secret mismatch (check AG_PROTOCOL_SIGNATURE)');

            return false;
        }

        const subData = await subscriptionResponse.json();
        console.log('✅ Subscription check passed:', subData);
        return true;

    } catch (error: any) {
        console.error('🚨 Network error during diagnosis:', error.message);
        return false;
    }
}

/**
 * Advanced: Check if the issue is database replication lag
 */
export async function diagnoseReplicationLag() {
    console.log('\n🔄 Testing for replication lag...\n');

    try {
        const { token } = await AuthService.initializeSession();

        if (!token) {
            console.error('No token for lag test');
            return null;
        }

        // Test multiple times with increasing delays
        const delays = [0, 100, 500, 1000, 2000, 5000];

        for (const delay of delays) {
            await new Promise(r => setTimeout(r, delay));

            const testResponse = await fetch(
                `${Config.VITE_AG_API_URL}/api/user/subscription`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'x-ag-device-id': localStorage.getItem('device_id') || 'unknown'
                    }
                }
            );

            const status = testResponse.status === 200 ? '✅' : '❌';
            console.log(`After ${delay}ms: ${status} (Status: ${testResponse.status})`);

            if (testResponse.status === 200) {
                if (delay > 0) {
                    console.log(`\n⚠️  Replication lag detected! Token valid after ${delay}ms delay`);
                } else {
                    console.log('\n✅ No replication lag detected. Token valid instantly.');
                }
                return delay;
            }
        }

        console.log('\n❌ Token never validated - not a replication lag issue');
        return null;

    } catch (error: any) {
        console.error('Replication lag test failed:', error.message);
        return null;
    }
}
