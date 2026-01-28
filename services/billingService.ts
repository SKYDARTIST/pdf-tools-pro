import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { upgradeTier, SubscriptionTier, saveSubscription } from './subscriptionService';
import { syncUsageToServer, fetchUserUsage } from './usageService';
import { getDeviceId } from './deviceService';
import { getCsrfToken } from './csrfService';
import AuthService from './authService';
import Config from './configService';
import TaskLimitManager from '../utils/TaskLimitManager';

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
                const verifyResult = await this.verifyPurchaseOnServer(purchaseToken, PRO_MONTHLY_ID, result.transactionId);

                if (verifyResult) {
                    console.log('Anti-Gravity Billing: ✅ Server verified and granted Pro status');
                } else {
                    console.warn('Anti-Gravity Billing: ⚠️ Server verification failed - Pro status might not stick on other devices');
                    // We still allow local upgrade for UX (Optimistic UI), but server is source of truth
                }

                // Sync in correct order - TaskLimitManager first, then SubscriptionService
                TaskLimitManager.upgradeToPro();
                upgradeTier(SubscriptionTier.PRO, result.transactionId);

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

            const alreadyOwnsRegex = /already\s*own|ITEM_ALREADY_OWNED|purchased/i;
            const alreadyOwnsError = alreadyOwnsRegex.test(errorMessage);

            if (alreadyOwnsError) {
                console.log('Anti-Gravity Billing: ✅ Product already owned on Google Play - Triggering server sync');

                // User already owns it on Google Play (confirmed by the error)
                // Directly activate Pro locally since we've confirmed ownership
                try {
                    console.log('Anti-Gravity Billing: 🛡️ Triggering server-side verification for already owned Pro...');
                    // For already owned items, we don't have a new transactionId, so we use 'already_owned'
                    await this.verifyPurchaseOnServer('already_owned', PRO_MONTHLY_ID, 'already_owned');

                    TaskLimitManager.upgradeToPro();
                    upgradeTier(SubscriptionTier.PRO, undefined, true);

                    alert('✅ Pro status activated! You already own this product on Google Play.');
                    return true;
                } catch (activationError) {
                    console.error('Anti-Gravity Billing: Failed to activate Pro after "already owned":', activationError);
                    alert('⚠️ You already own Pro on Google Play, but activation failed. Try "Restore Purchases" on the pricing page.');
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
                try {
                    const purchaseToken = (result as any).purchaseToken || result.transactionId;
                    const verifyResult = await this.verifyPurchaseOnServer(purchaseToken, LIFETIME_PRODUCT_ID, result.transactionId);

                    if (verifyResult) {
                        console.log('Anti-Gravity Billing: ✅ Server verified status');
                    }
                } catch (verifyError) {
                    console.error('Server verification failed:', verifyError);
                }

                TaskLimitManager.upgradeToPro();
                upgradeTier(SubscriptionTier.LIFETIME, result.transactionId);
                alert('Lifetime Access Unlocked!');
                return true;
            }
            return false;
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            console.log('Anti-Gravity Billing: Lifetime Purchase Error Debug:', { message: errorMessage, error });

            const alreadyOwnsRegex = /already\s*own|ITEM_ALREADY_OWNED|purchased/i;
            if (alreadyOwnsRegex.test(errorMessage)) {
                console.log('Anti-Gravity Billing: ✅ Lifetime already owned - Triggering server sync');
                // Try both IDs for server sync safety
                await this.verifyPurchaseOnServer('already_owned', LIFETIME_PRODUCT_ID, 'already_owned');
                await this.verifyPurchaseOnServer('already_owned', LIFETIME_PRODUCT_ID_ALT, 'already_owned');

                upgradeTier(SubscriptionTier.LIFETIME, undefined, true);
                alert('✅ Lifetime status activated! You already own this.');
                return true;
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
                        aiPackCredits: existingUsage.aiPackCredits,
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

            // LIMITATION: Boot-time restore via listeners has fundamental timing issues
            // The @capgo/native-purchases plugin doesn't fire transactionUpdated events during boot
            // Tested extensively with waits up to 35+ seconds - events never fire during boot
            // Manual restore (user clicking "Restore Purchases" button) works perfectly
            // This is a known plugin lifecycle limitation
            console.warn('Anti-Gravity Billing: ⚠️ Skipping boot-time purchase restore (plugin limitation)');
            console.warn('Anti-Gravity Billing: ℹ️ Users with existing purchases should tap "Restore Purchases" on the pricing screen');
            console.log('Anti-Gravity Billing: Proceeding with Free tier - restore available manually on demand');

            // Final sync check after processing
            this.forceSyncStorageKeys();
        } catch (error) {
            console.error('Anti-Gravity Billing: Sync Error:', error);
            console.error('Anti-Gravity Billing: Sync Error Type:', error instanceof Error ? error.constructor.name : typeof error);
            console.error('Anti-Gravity Billing: Sync Error Message:', error instanceof Error ? error.message : String(error));
        }
    }

    async restorePurchases(): Promise<boolean> {
        try {
            console.log('Anti-Gravity Billing: Manual restore triggered by user...');

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

            // Wait for listener events (up to 3 seconds for manual restore)
            console.log('Anti-Gravity Billing: Waiting for transactionUpdated events...');
            await new Promise(resolve => setTimeout(resolve, 3000));

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
                        alert(`✅ ${tier === SubscriptionTier.LIFETIME ? 'Lifetime' : 'Pro'} status restored!`);
                    } else {
                        console.error('Anti-Gravity Billing: ❌ Server verification failed for restored item');
                        // We still allow local upgrade for better UX, but it may be overwritten later
                        TaskLimitManager.upgradeToPro();
                        upgradeTier(tier, transactionId, true);
                    }
                }


            }

            if (!hasProRestore && capturedPurchases.length === 0) {
                console.log('Anti-Gravity Billing: ℹ️ No new purchases found to restore (no active purchases on Google Play)');
                alert('ℹ️ No active purchases found on Google Play.');
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
            const deviceId = await getDeviceId();
            const csrfToken = getCsrfToken();
            const authHeader = await AuthService.getAuthHeader();

            console.log('Anti-Gravity Billing: Verifying purchase on server...', { productId, transactionId });

            const response = await fetch(`${Config.VITE_AG_API_URL}/api/index`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                    'x-ag-signature': Config.VITE_AG_PROTOCOL_SIGNATURE,
                    'x-ag-device-id': deviceId,
                    'x-csrf-token': csrfToken || ''
                },
                body: JSON.stringify({
                    type: 'verify_purchase',
                    purchaseToken,
                    productId,
                    transactionId
                })
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
}

export default new BillingService();
