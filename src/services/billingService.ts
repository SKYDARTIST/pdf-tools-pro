import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { upgradeTier, SubscriptionTier, saveSubscription } from './subscriptionService';
import { syncUsageToServer, fetchUserUsage } from './usageService';
import { getDeviceId } from './deviceService';
import { secureFetch } from './apiService';
import AuthService from './authService';
import Config from './configService';
import TaskLimitManager from '@/utils/TaskLimitManager';
import { STORAGE_KEYS } from '@/utils/constants';

const LIFETIME_PRODUCT_ID = 'lifetime_pro_access';
const LIFETIME_PRODUCT_ID_ALT = 'pro_access_lifetime'; // Legacy variant
export const PRO_MONTHLY_ID = 'monthly_pro_pass';
export const PRO_MONTHLY_PLAN_ID = 'monthly-standard';


export interface ProductInfo {
    identifier: string;
    description: string;
    title: string;
    price: string;
    currencyCode: string;
}

class BillingService {
    private isInitialized = false;
    private restoredPurchases: any[] = [];
    private transactionListener: any = null;
    private isTestMode = AuthService.isTestAccount(); // Automatically detect test accounts

    async initialize() {
        try {
            console.log('Anti-Gravity Billing: Initializing...');
            const supported = await NativePurchases.isBillingSupported();
            console.log('Anti-Gravity Billing: Support check:', supported);

            if (!supported.isBillingSupported) {
                console.warn('Anti-Gravity Billing: Not supported on this device');
                return false;
            }

            // CRITICAL: Set up listener for transaction updates
            // restorePurchases() doesn't return data - it triggers transactionUpdated events
            if (!this.transactionListener) {
                try {
                    console.log('Anti-Gravity Billing: Setting up transaction listener...');
                    this.transactionListener = await NativePurchases.addListener('transactionUpdated', (transaction: any) => {
                        console.log('Anti-Gravity Billing: 📲 transactionUpdated event received:', {
                            productIdentifier: transaction?.productIdentifier,
                            transactionId: transaction?.transactionId,
                            transactionDate: transaction?.transactionDate
                        });
                        if (transaction && transaction.transactionId) {
                            this.restoredPurchases.push(transaction);
                        }
                    });
                    console.log('Anti-Gravity Billing: Transaction listener registered');
                } catch (listenerError) {
                    console.warn('Anti-Gravity Billing: Failed to register listener:', listenerError);
                }
            }

            // SECURITY (V6.0): Process any pending purchases that didn't complete verification
            this.processPendingPurchases().catch(e => console.warn('Anti-Gravity Billing: Pending purchase recovery failed:', e));

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Anti-Gravity Billing: Init Error:', error);
            return false;
        }
    }

    // Force sync both storage keys to ensure they're consistent
    private forceSyncStorageKeys(): void {
        try {
            const isLocalPro = TaskLimitManager.isPro();
            const subscription = TaskLimitManager.getSubscriptionSync();
            const subTier = subscription?.tier || SubscriptionTier.FREE;
            const isSubPro = (subTier === SubscriptionTier.PRO || subTier === SubscriptionTier.PREMIUM || subTier === SubscriptionTier.LIFETIME);

            console.log('Anti-Gravity Billing: Unified sync check:', {
                isLocalPro,
                subTier,
                isSubPro
            });

            // 1. If Sub says Pro/Lifetime but Local doesn't, upgrade Local (The Source of Truth for daily tasks)
            if (isSubPro && !isLocalPro) {
                console.log('Anti-Gravity Billing: Syncing TaskLimitManager to PRO (from Sub state)');
                TaskLimitManager.upgradeToPro();
            }

            // 2. If Local says Pro but Sub is Free, upgrade Sub to PRO
            // (Note: If it was Lifetime, we'd only know after it syncs from server/Google Play)
            if (isLocalPro && subTier === SubscriptionTier.FREE) {
                console.log('Anti-Gravity Billing: Syncing subscription tier to PRO (from TaskLimit state)');
                upgradeTier(SubscriptionTier.PRO);
            }
        } catch (error) {
            console.error('Anti-Gravity Billing: Storage sync error:', error);
        }
    }

    async getProducts(): Promise<ProductInfo[]> {
        try {
            if (!this.isInitialized) {
                const ok = await this.initialize();
                if (!ok) return [];
            }

            console.log('Anti-Gravity Billing: Fetching all products');
            const inAppResult = await NativePurchases.getProducts({
                productIdentifiers: [LIFETIME_PRODUCT_ID],
                productType: PURCHASE_TYPE.INAPP
            });

            const subsResult = await NativePurchases.getProducts({
                productIdentifiers: [PRO_MONTHLY_ID],
                productType: PURCHASE_TYPE.SUBS
            });

            console.log('Anti-Gravity Billing: Fetch Result:', { inAppResult, subsResult });

            const allProducts = [...inAppResult.products, ...subsResult.products];

            return allProducts.map(p => ({
                identifier: p.identifier,
                description: p.description,
                title: p.title,
                price: p.priceString,
                currencyCode: p.currencyCode
            }));
        } catch (error) {
            console.error('Anti-Gravity Billing: Product Error:', error);
            return [];
        }
    }

    async purchasePro(): Promise<boolean> {
        try {
            if (!this.isInitialized) {
                const ok = await this.initialize();
                if (!ok) {
                    alert('Google Play Billing could not be initialized.');
                    return false;
                }
            }

            console.log('Anti-Gravity Billing: Starting Pro subscription purchase');
            const result = await NativePurchases.purchaseProduct({
                productIdentifier: PRO_MONTHLY_ID,
                productType: PURCHASE_TYPE.SUBS,
                planIdentifier: PRO_MONTHLY_PLAN_ID
            });

            if (result.transactionId) {
                console.log('Anti-Gravity Billing: ✅ Pro purchase successful, acknowledging...');

                // CRITICAL: Acknowledge the purchase on Google Play using purchaseToken
                try {
                    const purchaseToken = (result as any).purchaseToken || result.transactionId;
                    await NativePurchases.acknowledgePurchase({
                        purchaseToken: purchaseToken
                    });
                    console.log('Anti-Gravity Billing: ✅ Purchase acknowledged on Google Play');
                } catch (ackError) {
                    console.error('Anti-Gravity Billing: Acknowledgment error (non-fatal):', ackError);
                }

                // SECURITY: Verify and Grant on SERVER SIDE (v2.9.0)
                const purchaseToken = (result as any).purchaseToken || result.transactionId;

                // CRITICAL: Add to queue IMMEDIATELY - before verification
                // This ensures purchase is not lost if app crashes
                await this.addToPendingQueue({ purchaseToken, productId: PRO_MONTHLY_ID, transactionId: result.transactionId });
                console.log('Anti-Gravity Billing: 🛡️ Purchase queued for verification');

                const verifyResult = await this.verifyPurchaseOnServer(purchaseToken, PRO_MONTHLY_ID, result.transactionId);

                if (verifyResult) {
                    console.log('Anti-Gravity Billing: ✅ Server verified and granted Pro status');
                    await this.removeFromPendingQueue(result.transactionId); // V6.0: Success!
                    // Sync in correct order - TaskLimitManager first, then SubscriptionService
                    TaskLimitManager.upgradeToPro();
                    upgradeTier(SubscriptionTier.PRO, result.transactionId);
                } else {
                    console.error('Anti-Gravity Billing: ❌ Server verification failed - Pro status NOT granted');
                    alert('⚠️ Payment verification failed. Please contact support if you were charged.');
                    return false;
                }

                // STRICT VERIFICATION: Ensure both storage systems agreed
                const isProInLimit = TaskLimitManager.isPro();
                const subscription = TaskLimitManager.getSubscriptionSync();
                const isProInSub = subscription?.tier === SubscriptionTier.PRO || subscription?.tier === SubscriptionTier.PREMIUM || subscription?.tier === SubscriptionTier.LIFETIME;

                if (!isProInLimit || !isProInSub) {
                    console.warn('Anti-Gravity Billing: ⚠️ Storage drift detected immediately after purchase', {
                        isProInLimit,
                        isProInSub
                    });

                    // RETRY: Try one more forceful sync
                    if (isProInLimit && !isProInSub) {
                        upgradeTier(SubscriptionTier.PRO, result.transactionId);
                    } else if (!isProInLimit) {
                        TaskLimitManager.upgradeToPro();
                    }
                }

                console.log('Anti-Gravity Billing: Post-purchase verification:', {
                    isProInLimit: TaskLimitManager.isPro(),
                    subscriptionTier: TaskLimitManager.getSubscriptionSync()?.tier,
                });

                alert('Upgrade Successful! Pro features are now unlocked.');
                return true;
            }
            return false;
        } catch (error: any) {
            // Handle "already owns this item" error from Google Play
            const errorMessage = error?.message || error?.toString?.() || String(error);
            console.log('Anti-Gravity Billing: Pro Purchase Error Debug:', { message: errorMessage, error });

            const alreadyOwnsRegex = /already\s*own|ITEM_ALREADY_OWNED|not\s*purchased/i;
            const alreadyOwnsError = alreadyOwnsRegex.test(errorMessage);

            if (alreadyOwnsError) {
                const deviceId = await getDeviceId();
                const googleUid = localStorage.getItem(STORAGE_KEYS.GOOGLE_UID);

                console.log('Anti-Gravity Billing: 🔍 Product already owned - attempting recovery:', {
                    productId: PRO_MONTHLY_ID,
                    currentAccount: googleUid,
                    deviceId: deviceId
                });

                // SECURITY: Fingerprint for log analysis
                const fingerprint = `${PRO_MONTHLY_ID}_${deviceId}_${googleUid}`;
                console.log('Anti-Gravity Billing: Purchase fingerprint:', fingerprint);

                try {
                    // SECURITY FIX #3: Get the actual purchase token from Google Play to prevent spoofing
                    const ownedPurchase = await this.getOwnedPurchase(PRO_MONTHLY_ID, PURCHASE_TYPE.SUBS);

                    if (!ownedPurchase) {
                        console.error('Anti-Gravity Billing: Could not retrieve purchase token for owned item');
                        alert('⚠️ Ownership verification failed. Please use "Restore Purchases".');
                        return false;
                    }

                    console.log('Anti-Gravity Billing: 🛡️ Verifying ownership with server...');
                    const verified = await this.verifyPurchaseOnServer(
                        ownedPurchase.purchaseToken,
                        PRO_MONTHLY_ID,
                        ownedPurchase.transactionId
                    );

                    if (verified) {
                        console.log('Anti-Gravity Billing: ✅ Ownership verified by server');
                        TaskLimitManager.upgradeToPro();
                        upgradeTier(SubscriptionTier.PRO, ownedPurchase.transactionId);
                        alert('✅ Pro status activated! Ownership verified.');
                        return true;
                    } else {
                        console.error('Anti-Gravity Billing: ❌ Server rejected ownership claim');
                        alert('⚠️ Ownership verification failed. Please contact support.');
                        return false;
                    }
                } catch (activationError) {
                    console.error('Anti-Gravity Billing: Failed to verify ownership:', activationError);
                    alert('⚠️ Could not verify ownership. Please try "Restore Purchases".');
                    return false;
                }
            }

            console.error('Anti-Gravity Billing: Pro Purchase Error:', error);
            alert('Purchase failed: ' + (error.message || 'Check your Google Play account.'));
            return false;
        }
    }

    async purchaseLifetime(): Promise<boolean> {
        try {
            if (!this.isInitialized) {
                const ok = await this.initialize();
                if (!ok) {
                    alert('Google Play Billing could not be initialized.');
                    return false;
                }
            }

            console.log('Anti-Gravity Billing: Starting Lifetime purchase');
            const result = await NativePurchases.purchaseProduct({
                productIdentifier: LIFETIME_PRODUCT_ID,
                productType: PURCHASE_TYPE.INAPP
            });

            if (result.transactionId) {
                console.log('Anti-Gravity Billing: ✅ Lifetime purchase successful, acknowledging...');

                try {
                    const purchaseToken = (result as any).purchaseToken || result.transactionId;
                    await NativePurchases.acknowledgePurchase({
                        purchaseToken: purchaseToken
                    });
                } catch (ackError) {
                    console.error('Anti-Gravity Billing: Acknowledgment error (non-fatal):', ackError);
                }

                // SECURITY: Verify on SERVER SIDE
                const purchaseToken = (result as any).purchaseToken || result.transactionId;

                // CRITICAL: Add to queue IMMEDIATELY - before verification
                // This ensures purchase is not lost if app crashes
                await this.addToPendingQueue({ purchaseToken, productId: LIFETIME_PRODUCT_ID, transactionId: result.transactionId });
                console.log('Anti-Gravity Billing: 🛡️ Purchase queued for verification');

                const verifyResult = await this.verifyPurchaseOnServer(purchaseToken, LIFETIME_PRODUCT_ID, result.transactionId);

                if (verifyResult) {
                    console.log('Anti-Gravity Billing: ✅ Server verified status');
                    await this.removeFromPendingQueue(result.transactionId); // V6.0: Success!
                    TaskLimitManager.upgradeToPro();
                    upgradeTier(SubscriptionTier.LIFETIME, result.transactionId);
                    alert('Lifetime Access Unlocked!');
                    return true;
                } else {
                    console.error('Anti-Gravity Billing: ❌ Server verification failed');
                    alert('⚠️ Payment verification failed. Please contact support if you were charged.');
                    return false;
                }
            }
            return false;
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            console.log('Anti-Gravity Billing: Lifetime Purchase Error Debug:', { message: errorMessage, error });

            const alreadyOwnsRegex = /already\s*own|ITEM_ALREADY_OWNED|not\s*purchased/i;
            if (alreadyOwnsRegex.test(errorMessage)) {
                const deviceId = await getDeviceId();
                const googleUid = localStorage.getItem(STORAGE_KEYS.GOOGLE_UID);

                console.log('Anti-Gravity Billing: 🔍 Lifetime already owned - attempting recovery:', {
                    productId: LIFETIME_PRODUCT_ID,
                    currentAccount: googleUid,
                    deviceId: deviceId
                });

                // SECURITY: Fingerprint for log analysis
                const fingerprint = `${LIFETIME_PRODUCT_ID}_${deviceId}_${googleUid}`;
                console.log('Anti-Gravity Billing: Purchase fingerprint:', fingerprint);

                try {
                    const ownedPurchase = await this.getOwnedPurchase(LIFETIME_PRODUCT_ID, PURCHASE_TYPE.INAPP);

                    if (!ownedPurchase) {
                        // Try alternate product ID
                        const ownedPurchaseAlt = await this.getOwnedPurchase(LIFETIME_PRODUCT_ID_ALT, PURCHASE_TYPE.INAPP);
                        if (!ownedPurchaseAlt) {
                            alert('⚠️ Could not verify ownership. Please use "Restore Purchases".');
                            return false;
                        }

                        const verified = await this.verifyPurchaseOnServer(
                            ownedPurchaseAlt.purchaseToken,
                            LIFETIME_PRODUCT_ID_ALT,
                            ownedPurchaseAlt.transactionId
                        );

                        if (verified) {
                            TaskLimitManager.upgradeToPro();
                            upgradeTier(SubscriptionTier.LIFETIME, ownedPurchaseAlt.transactionId);
                            alert('✅ Lifetime status activated!');
                            return true;
                        }
                    } else {
                        const verified = await this.verifyPurchaseOnServer(
                            ownedPurchase.purchaseToken,
                            LIFETIME_PRODUCT_ID,
                            ownedPurchase.transactionId
                        );

                        if (verified) {
                            TaskLimitManager.upgradeToPro();
                            upgradeTier(SubscriptionTier.LIFETIME, ownedPurchase.transactionId);
                            alert('✅ Lifetime status activated!');
                            return true;
                        }
                    }

                    alert('⚠️ Ownership verification failed. Please contact support.');
                    return false;
                } catch (verifyError) {
                    console.error('Lifetime ownership verification failed:', verifyError);
                    alert('⚠️ Could not verify ownership. Please try "Restore Purchases".');
                    return false;
                }
            }
            alert('Purchase failed: ' + errorMessage);
            return false;
        }
    }






    async syncPurchasesWithState(): Promise<void> {
        try {
            console.log('Anti-Gravity Billing: Syncing purchases with state...');

            // CRITICAL: Fetch existing usage from Supabase BEFORE syncing purchases
            // This ensures we restore the user's actual remaining credits, not reset them
            try {
                const existingUsage = await fetchUserUsage();
                if (existingUsage) {
                    console.log('Anti-Gravity Billing: ✅ Existing usage found in Supabase:', {
                        tier: existingUsage.tier,
                        aiDocsWeek: existingUsage.aiDocsThisWeek,
                        aiDocsMonth: existingUsage.aiDocsThisMonth
                    });
                    // Restore the ACTUAL usage data from Supabase
                    saveSubscription(existingUsage);
                    console.log('Anti-Gravity Billing: ✅ Usage restored from Supabase');
                } else {
                    console.log('Anti-Gravity Billing: ⚠️ No usage data found in Supabase (expected on first install)');
                }
            } catch (supabaseError) {
                // Distinguish between different failure types
                if (supabaseError instanceof TypeError && supabaseError.message.includes('fetch')) {
                    // Network error - offline or connectivity issue (expected, don't block)
                    console.log('Anti-Gravity Billing: ⚠️ Network error during Supabase restore (offline or bad connection):',
                        supabaseError instanceof Error ? supabaseError.message : String(supabaseError));
                } else {
                    // Other error - unexpected
                    console.error('Anti-Gravity Billing: ⚠️ Unexpected error during Supabase restore:', {
                        error: supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
                        type: supabaseError instanceof Error ? supabaseError.constructor.name : typeof supabaseError
                    });
                }
            }

            // First, force sync storage keys to ensure consistency
            this.forceSyncStorageKeys();

            // SILENT BACKGROUND RESTORE: Try to sync with Google Play automatically at boot.
            // This fix addresses the issue where Pro status is lost after app restart.
            console.log('Anti-Gravity Billing: 🚀 Initiating background purchase restore...');
            this.restorePurchases(true).catch(e => console.warn('Background restore failed:', e));

            // Final sync check after processing
            this.forceSyncStorageKeys();
        } catch (error) {
            console.error('Anti-Gravity Billing: Sync Error:', error);
            console.error('Anti-Gravity Billing: Sync Error Type:', error instanceof Error ? error.constructor.name : typeof error);
            console.error('Anti-Gravity Billing: Sync Error Message:', error instanceof Error ? error.message : String(error));
        }
    }

    async restorePurchases(silent = false): Promise<boolean> {
        try {
            if (!silent) console.log('Anti-Gravity Billing: Manual restore triggered by user...');
            else console.log('Anti-Gravity Billing: Background restore running...');

            // CRITICAL: First, check Supabase for existing data (source of truth for remaining credits)
            try {
                const existingUsage = await fetchUserUsage();
                if (existingUsage) {
                    // Restore existing data immediately - this includes any remaining credits from before
                    saveSubscription(existingUsage);
                }
            } catch (supabaseError) {
                console.warn('Anti-Gravity Billing: Could not fetch Supabase data:', supabaseError);
            }



            // Now call native restore for new purchases (not already used)
            this.restoredPurchases = [];
            console.log('Anti-Gravity Billing: Calling native restorePurchases() for new purchases...');
            await NativePurchases.restorePurchases();

            // Wait for events with timeout (Issue #6 Fix: increased timeout)
            console.log('Anti-Gravity Billing: Waiting for transactionUpdated events...');
            await new Promise(resolve => setTimeout(resolve, silent ? 3000 : 5000));

            const capturedPurchases = this.restoredPurchases;
            console.log(`Anti-Gravity Billing: Manual restore captured ${capturedPurchases.length} purchases`);

            // Process each captured purchase
            let hasProRestore = false;


            for (const purchase of capturedPurchases) {
                const productId = purchase.productIdentifier || purchase.productId || purchase.sku;

                if (productId === PRO_MONTHLY_ID || productId === LIFETIME_PRODUCT_ID) {
                    hasProRestore = true;

                    console.log('Anti-Gravity Billing: ✅ Restoring Status from manual restore...', { productId });

                    const tier = productId === LIFETIME_PRODUCT_ID ? SubscriptionTier.LIFETIME : SubscriptionTier.PRO;

                    // SECURITY: Must verify on server to update the backend tier
                    // Native restore events provide 'transactionId' and 'transactionReceipt' (on iOS) or 'purchaseToken'
                    const transactionId = purchase.transactionId || purchase.orderId || 'restore_sync';
                    const verificationToken = purchase.purchaseToken || transactionId;

                    console.log('Anti-Gravity Billing: 🛡️ Triggering server-side verification for restored item...');
                    const isVerified = await this.verifyPurchaseOnServer(verificationToken, productId, transactionId);

                    if (isVerified) {
                        console.log('Anti-Gravity Billing: 🛡️ Server verification successful for restored item');
                        TaskLimitManager.upgradeToPro();
                        upgradeTier(tier, transactionId, true);
                        if (!silent) alert(`✅ ${tier === SubscriptionTier.LIFETIME ? 'Lifetime' : 'Pro'} status restored!`);
                    } else {
                        console.error('Anti-Gravity Billing: ❌ Server verification failed for restored item');
                        // SECURITY (Audit High #4): DO NOT upgrade locally if server verification fails
                    }
                }
            }

            if (!hasProRestore && capturedPurchases.length === 0) {
                console.log('Anti-Gravity Billing: ℹ️ No new purchases found to restore (no active purchases on Google Play)');
                if (!silent) alert('ℹ️ No active purchases found on Google Play.');
                return false;
            }

            return hasProRestore;
        } catch (error) {
            console.error('Anti-Gravity Billing: Restore Error:', error);
            alert('❌ Restore failed. Please try again.');
            return false;
        }
    }

    // SECURITY: Server-Side Verification Helper
    private async verifyPurchaseOnServer(purchaseToken: string, productId: string, transactionId: string): Promise<boolean> {
        try {
            const timestamp = Date.now();
            const deviceId = await getDeviceId();

            console.log('Anti-Gravity Billing: Verifying purchase on server...', { productId, transactionId, timestamp });

            // Sign the request with device-specific data and timestamp to prevent replay (v4.0)
            const signature = await this.signRequest({
                purchaseToken,
                productId,
                transactionId,
                deviceId,
                timestamp
            });

            const response = await secureFetch(`${Config.VITE_AG_API_URL}/api/index`, {
                method: 'POST',
                body: JSON.stringify({
                    type: 'verify_purchase',
                    purchaseToken,
                    productId,
                    transactionId,
                    timestamp // Include in body for verification
                }),
                headers: {
                    'x-ag-signature-signature': signature, // Custom header for dynamic signature
                    'x-ag-timestamp': timestamp.toString()
                }
            });

            if (!response.ok) {
                console.error('Anti-Gravity Billing: Verification endpoint returned error:', response.status);
                return false;
            }

            const data = await response.json();
            return data.success === true;
        } catch (error) {
            console.error('Anti-Gravity Billing: Verification network error:', error);
            return false;
        }
    }

    /**
     * SECURITY FIX #3: Helper to get owned purchase data from Google Play
     * This prevents client-side spoofing by retrieving real tokens for verification
     */
    private async getOwnedPurchase(productId: string, productType: PURCHASE_TYPE): Promise<{ purchaseToken: string; transactionId: string } | null> {
        try {
            console.log(`Anti-Gravity Billing: Querying owned purchases for ${productId}...`);
            const purchases = productType === PURCHASE_TYPE.SUBS
                ? await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.SUBS })
                : await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });

            const matchingPurchase = purchases.purchases?.find((p: any) =>
                p.productId === productId || p.productIdentifier === productId
            );

            if (matchingPurchase) {
                return {
                    purchaseToken: matchingPurchase.purchaseToken || matchingPurchase.transactionId,
                    transactionId: matchingPurchase.orderId || matchingPurchase.transactionId
                };
            }
            return null;
        } catch (error) {
            console.error('Anti-Gravity Billing: Failed to query owned purchases:', error);
            return null;
        }
    }

    /**
     * EXPERT TOOL: Debug purchase state
     * Dumps all Google Play and Local state to console for troubleshooting
     */
    async debugPurchaseState(): Promise<void> {
        console.log('=== ANTI-GRAVITY PURCHASE DEBUG REPORT ===');
        try {
            const inAppPurchases = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
            const subPurchases = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.SUBS });

            console.log('📲 Google Play (In-App):', JSON.stringify(inAppPurchases, null, 2));
            console.log('📲 Google Play (Subs):', JSON.stringify(subPurchases, null, 2));

            // Check local state
            const subscription = TaskLimitManager.getSubscriptionSync();
            console.log('💾 Local Storage State:', {
                tier: subscription?.tier,
                isPro: TaskLimitManager.isPro()
            });

            // Check server state
            const serverUsage = await fetchUserUsage();
            console.log('☁️ Supabase Server State:', serverUsage);

            console.log('🔧 App Config:', {
                apiUrl: Config.VITE_AG_API_URL,
                isTestMode: this.isTestMode
            });

        } catch (error) {
            console.error('❌ Debug Report Failed:', error);
        }
        console.log('=== END DEBUG REPORT ===');
    }

    /**
     * REQUEST SIGNING (V4.0)
     * Generates a SHA-256 hash of the request payload to ensure integrity
     */
    private async signRequest(data: any): Promise<string> {
        const payload = JSON.stringify(data);
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(payload);

        // SECURE HMAC SIGNING (V5.0)
        // Use the same secret key from VITE_AG_PROTOCOL_SIGNATURE (conceptually our HMAC secret)
        const secret = Config.VITE_AG_PROTOCOL_SIGNATURE || "REPLACE_WITH_SECURE_HMAC_SECRET";
        const keyData = encoder.encode(secret);

        const key = await crypto.subtle.importKey(
            "raw",
            keyData,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const signatureBuffer = await crypto.subtle.sign("HMAC", key, dataBuffer);
        const hashArray = Array.from(new Uint8Array(signatureBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // SECURITY (V6.0): Pending Purchase Queue Management
    // Prevents revenue loss if app crashes between Google Payment and Server Verification

    private async addToPendingQueue(purchase: any): Promise<void> {
        try {
            const queue = JSON.parse(localStorage.getItem('ag_pending_purchases') || '[]');
            // Avoid duplicates
            if (!queue.find((p: any) => p.transactionId === purchase.transactionId)) {
                queue.push({
                    ...purchase,
                    addedAt: Date.now(),
                    retryCount: 0,
                    maxRetries: 5  // Limit to 5 attempts
                });
                localStorage.setItem('ag_pending_purchases', JSON.stringify(queue));
                console.log('Anti-Gravity Security: Added purchase to pending queue:', purchase.transactionId);
            }
        } catch (e) {
            console.error('Failed to update pending queue:', e);
        }
    }

    private async removeFromPendingQueue(transactionId: string): Promise<void> {
        try {
            const queue = JSON.parse(localStorage.getItem('ag_pending_purchases') || '[]');
            const newQueue = queue.filter((p: any) => p.transactionId !== transactionId);
            localStorage.setItem('ag_pending_purchases', JSON.stringify(newQueue));
            console.log('Anti-Gravity Security: Cleared verified purchase from queue:', transactionId);
        } catch (e) {
            console.error('Failed to clear pending queue:', e);
        }
    }

    private async processPendingPurchases(): Promise<void> {
        const queue = JSON.parse(localStorage.getItem('ag_pending_purchases') || '[]');
        if (queue.length === 0) return;

        console.log(`Anti-Gravity Security: 🔍 Hub-link found ${queue.length} pending purchases. Attempting recovery...`);

        const now = Date.now();
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        const updatedQueue = [];

        for (const purchase of queue) {
            // Remove expired items (older than 7 days)
            if (now - purchase.addedAt > SEVEN_DAYS) {
                console.log('Anti-Gravity Security: ⏰ Removing expired pending purchase:', purchase.transactionId);
                continue;
            }

            // Remove items that exceeded retry limit
            if (purchase.retryCount >= purchase.maxRetries) {
                console.error('Anti-Gravity Security: ❌ Max retries exceeded for:', purchase.transactionId, '- Manual support needed');
                continue;
            }

            try {
                const verified = await this.verifyPurchaseOnServer(purchase.purchaseToken, purchase.productId, purchase.transactionId);
                if (verified) {
                    console.log('Anti-Gravity Security: ✅ Recovered pending purchase:', purchase.transactionId);
                    TaskLimitManager.upgradeToPro();
                    const tier = (purchase.productId.includes('lifetime') || purchase.productId.includes('pass'))
                        ? SubscriptionTier.LIFETIME : SubscriptionTier.PRO;
                    upgradeTier(tier, purchase.transactionId, true);
                    // Don't add back to queue - successfully processed
                } else {
                    // Verification failed - increment retry count and keep in queue
                    purchase.retryCount = (purchase.retryCount || 0) + 1;
                    updatedQueue.push(purchase);
                    console.warn(`Anti-Gravity Security: Retry ${purchase.retryCount}/${purchase.maxRetries} for:`, purchase.transactionId);
                }
            } catch (e) {
                // Network error - increment retry count and keep in queue
                purchase.retryCount = (purchase.retryCount || 0) + 1;
                updatedQueue.push(purchase);
                console.warn('Anti-Gravity Security: Failed to process pending purchase recovery:', purchase.transactionId);
            }
        }

        // Save updated queue
        localStorage.setItem('ag_pending_purchases', JSON.stringify(updatedQueue));
    }
}

export default new BillingService();
