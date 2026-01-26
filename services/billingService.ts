import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { upgradeTier, SubscriptionTier, addAiPackCredits } from './subscriptionService';
import TaskLimitManager from '../utils/TaskLimitManager';

export const PRO_PRODUCT_ID = 'pro_access_lifetime';
export const AI_PACK_100_ID = 'ai_pack_100';

export interface ProductInfo {
    identifier: string;
    description: string;
    title: string;
    price: string;
    currencyCode: string;
}

class BillingService {
    private isInitialized = false;

    async initialize() {
        try {
            console.log('Anti-Gravity Billing: Initializing...');
            const supported = await NativePurchases.isBillingSupported();
            console.log('Anti-Gravity Billing: Support check:', supported);

            if (!supported.isBillingSupported) {
                console.warn('Anti-Gravity Billing: Not supported on this device');
                return false;
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
            const limitData = TaskLimitManager.isPro();
            const subscription = TaskLimitManager.getSubscriptionSync();

            console.log('Anti-Gravity Billing: Storage sync check:', {
                limitManagerPro: limitData,
                subscriptionTier: subscription?.tier
            });

            // If one says Pro but the other doesn't, sync them
            if (limitData && subscription?.tier !== SubscriptionTier.PRO) {
                console.log('Anti-Gravity Billing: Syncing subscription tier to PRO');
                upgradeTier(SubscriptionTier.PRO);
            } else if (!limitData && (subscription?.tier === SubscriptionTier.PRO || subscription?.tier === SubscriptionTier.PREMIUM || subscription?.tier === SubscriptionTier.LIFETIME)) {
                console.log('Anti-Gravity Billing: Syncing TaskLimitManager to PRO');
                TaskLimitManager.upgradeToPro();
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
            const result = await NativePurchases.getProducts({
                productIdentifiers: [PRO_PRODUCT_ID, AI_PACK_100_ID],
                productType: PURCHASE_TYPE.INAPP
            });
            console.log('Anti-Gravity Billing: Fetch Result:', result);

            return result.products.map(p => ({
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

            console.log('Anti-Gravity Billing: Starting Pro purchase');
            const result = await NativePurchases.purchaseProduct({
                productIdentifier: PRO_PRODUCT_ID,
                productType: PURCHASE_TYPE.INAPP
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

                // Sync in correct order - TaskLimitManager first, then SubscriptionService
                TaskLimitManager.upgradeToPro();
                upgradeTier(SubscriptionTier.PRO, result.transactionId);

                // Verify both storages are synced
                const isProInLimit = TaskLimitManager.isPro();
                const subscription = TaskLimitManager.getSubscriptionSync();
                console.log('Anti-Gravity Billing: Post-purchase verification:', {
                    isProInLimit,
                    subscriptionTier: subscription?.tier,
                    aiPackCredits: subscription?.aiPackCredits
                });

                alert('Upgrade Successful! Pro features are now unlocked.');
                return true;
            }
            return false;
        } catch (error: any) {
            console.error('Anti-Gravity Billing: Pro Purchase Error:', error);
            alert('Purchase failed: ' + (error.message || 'Check your Google Play account.'));
            return false;
        }
    }

    async purchaseAiPack(): Promise<boolean> {
        try {
            if (!this.isInitialized) {
                const ok = await this.initialize();
                if (!ok) {
                    alert('Google Play Billing could not be initialized.');
                    return false;
                }
            }

            console.log('Anti-Gravity Billing: Starting AI Pack purchase');
            const result = await NativePurchases.purchaseProduct({
                productIdentifier: AI_PACK_100_ID,
                productType: PURCHASE_TYPE.INAPP
            });

            if (result.transactionId) {
                console.log('Anti-Gravity Billing: ✅ AI Pack purchase successful, acknowledging...');

                // CRITICAL: Acknowledge the purchase on Google Play
                try {
                    const purchaseToken = (result as any).purchaseToken || result.transactionId;
                    await NativePurchases.acknowledgePurchase({
                        purchaseToken: purchaseToken
                    });
                    console.log('Anti-Gravity Billing: ✅ Purchase acknowledged on Google Play');
                } catch (ackError) {
                    console.error('Anti-Gravity Billing: Acknowledgment error (non-fatal):', ackError);
                }

                addAiPackCredits(100);

                // Verify credits were added
                const subscription = TaskLimitManager.getSubscriptionSync();
                console.log('Anti-Gravity Billing: Post-purchase verification:', {
                    aiPackCredits: subscription?.aiPackCredits
                });

                alert('100 AI Credits Deployed Successfully!');
                return true;
            }
            return false;
        } catch (error: any) {
            console.error('Anti-Gravity Billing: AI Pack Purchase Error:', error);
            alert('Purchase failed: ' + (error.message || 'Check your Google Play account.'));
            return false;
        }
    }

    async syncPurchasesWithState(): Promise<void> {
        try {
            console.log('Anti-Gravity Billing: Syncing purchases with state...');

            // CRITICAL: Fetch existing usage from Supabase BEFORE syncing purchases
            // This ensures we restore the user's actual remaining credits, not reset them
            try {
                const { fetchUserUsage } = await import('./usageService');
                const existingUsage = await fetchUserUsage();
                if (existingUsage) {
                    console.log('Anti-Gravity Billing: ✅ Existing usage found in Supabase:', {
                        tier: existingUsage.tier,
                        aiPackCredits: existingUsage.aiPackCredits,
                        aiDocsWeek: existingUsage.aiDocsThisWeek,
                        aiDocsMonth: existingUsage.aiDocsThisMonth
                    });
                    // Restore the ACTUAL usage data from Supabase
                    const { saveSubscription } = await import('./subscriptionService');
                    saveSubscription(existingUsage);
                    console.log('Anti-Gravity Billing: ✅ Usage restored from Supabase');
                }
            } catch (supabaseError) {
                console.log('Anti-Gravity Billing: Supabase fetch skipped (offline or first install)');
            }

            // First, force sync storage keys to ensure consistency
            this.forceSyncStorageKeys();

            const result = await NativePurchases.restorePurchases() as any;

            // Enhanced logging to understand the response structure
            console.log('Anti-Gravity Billing: Full restore result:', JSON.stringify(result, null, 2));

            // Try multiple possible response structures
            let purchases: any[] = [];

            if (result?.purchases && Array.isArray(result.purchases)) {
                purchases = result.purchases;
            } else if (Array.isArray(result)) {
                purchases = result;
            } else if (result?.productIdentifiers && Array.isArray(result.productIdentifiers)) {
                // Some implementations return just product IDs
                purchases = result.productIdentifiers.map((id: string) => ({ productIdentifier: id }));
            } else if (result?.products && Array.isArray(result.products)) {
                purchases = result.products;
            } else if (result?.items && Array.isArray(result.items)) {
                purchases = result.items;
            }

            console.log('Anti-Gravity Billing: Processed purchases array:', JSON.stringify(purchases, null, 2));

            // Check if Pro is in the restored purchases
            const hasPro = purchases.some((p: any) =>
                p.productIdentifier === PRO_PRODUCT_ID ||
                p.productId === PRO_PRODUCT_ID ||
                p.sku === PRO_PRODUCT_ID ||
                p === PRO_PRODUCT_ID
            );

            if (hasPro) {
                console.log('Anti-Gravity Billing: ✅ Pro status detected - Upgrading...');
                TaskLimitManager.upgradeToPro();
                upgradeTier(SubscriptionTier.PRO);
                console.log('Anti-Gravity Billing: ✅ Pro upgrade complete');
                alert('✅ Pro status synced from Google Play!');
            } else {
                console.log('Anti-Gravity Billing: ❌ No Pro purchase found in Google Play');
                // Don't show alert during boot - only when manually triggered
            }

            // Check for unconsumed AI Packs
            const hasAiPack = purchases.some((p: any) =>
                p.productIdentifier === AI_PACK_100_ID ||
                p.productId === AI_PACK_100_ID ||
                p.sku === AI_PACK_100_ID ||
                p === AI_PACK_100_ID
            );

            if (hasAiPack) {
                console.log('Anti-Gravity Billing: ✅ AI Pack detected - Crediting 100...');
                addAiPackCredits(100);
                console.log('Anti-Gravity Billing: ✅ AI Pack credits added');
            }

            // Final sync check after processing
            this.forceSyncStorageKeys();
        } catch (error) {
            console.error('Anti-Gravity Billing: Sync Error:', error);
        }
    }

    async restorePurchases(): Promise<boolean> {
        try {
            console.log('Anti-Gravity Billing: Manual restore triggered...');
            await this.syncPurchasesWithState();
            return true;
        } catch (error) {
            console.error('Anti-Gravity Billing: Restore Error:', error);
            return false;
        }
    }
}

export default new BillingService();
