import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { upgradeTier, SubscriptionTier, addAiPackCredits, isAiPackAlreadyConsumed } from './subscriptionService';
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
            const alreadyOwnsError =
                errorMessage.toLowerCase().includes('already own') ||
                errorMessage.toLowerCase().includes('purchased') ||
                error?.code === 'USER_CANCELLED' && errorMessage.includes('own');

            if (alreadyOwnsError) {
                console.log('Anti-Gravity Billing: ✅ Product already owned on Google Play - Direct activation');

                // User already owns it on Google Play (confirmed by the error)
                // Directly activate Pro locally since we've confirmed ownership
                try {
                    TaskLimitManager.upgradeToPro();
                    upgradeTier(SubscriptionTier.PRO, undefined, true);

                    // STRICT VERIFICATION: Ensure both storage systems agreed
                    const isProInLimit = TaskLimitManager.isPro();
                    const subscription = TaskLimitManager.getSubscriptionSync();
                    const isProInSub = subscription?.tier === SubscriptionTier.PRO || subscription?.tier === SubscriptionTier.PREMIUM || subscription?.tier === SubscriptionTier.LIFETIME;

                    if (!isProInLimit || !isProInSub) {
                        console.warn('Anti-Gravity Billing: ⚠️ Storage drift detected after "already owned" activation', {
                            isProInLimit,
                            isProInSub
                        });

                        // RETRY: Try one more forceful sync
                        if (isProInLimit && !isProInSub) {
                            upgradeTier(SubscriptionTier.PRO, undefined, true);
                        } else if (!isProInLimit) {
                            TaskLimitManager.upgradeToPro();
                        }
                    }

                    console.log('Anti-Gravity Billing: ✅ Pro directly activated after "already owned" detection:', {
                        tier: subscription?.tier,
                        aiPackCredits: subscription?.aiPackCredits
                    });

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
            console.log('Anti-Gravity Billing: AI Pack product ID:', AI_PACK_100_ID);

            const result = await NativePurchases.purchaseProduct({
                productIdentifier: AI_PACK_100_ID,
                productType: PURCHASE_TYPE.INAPP
            });

            console.log('Anti-Gravity Billing: Purchase result:', {
                hasTransactionId: !!result.transactionId,
                transactionId: result.transactionId,
                resultKeys: Object.keys(result)
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

            // Distinguish between different error types
            const errorMessage = error?.message || error?.toString?.() || String(error);
            const isPurchaseNotCompleted =
                errorMessage.toLowerCase().includes('purchase is not purchased') ||
                errorMessage.toLowerCase().includes('not purchased') ||
                errorMessage.toLowerCase().includes('user cancelled');

            if (isPurchaseNotCompleted) {
                console.log('Anti-Gravity Billing: ⚠️ AI Pack purchase incomplete or cancelled');
                alert('⚠️ Purchase was not completed. Please try again or check your Google Play account.');
                return false;
            }

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
            let existingCredits = 0;
            try {
                const { fetchUserUsage } = await import('./usageService');
                const existingUsage = await fetchUserUsage();
                if (existingUsage) {
                    existingCredits = existingUsage.aiPackCredits || 0;
                    console.log('Anti-Gravity Billing: ℹ️ Found existing Supabase data with', existingCredits, 'AI Pack credits');
                    // Restore existing data immediately - this includes any remaining credits from before
                    const { saveSubscription } = await import('./subscriptionService');
                    saveSubscription(existingUsage);
                }
            } catch (supabaseError) {
                console.warn('Anti-Gravity Billing: Could not fetch Supabase data:', supabaseError);
            }

            // Check if AI Pack was already fully consumed (and had 0 credits)
            const aiPackConsumed = isAiPackAlreadyConsumed();
            console.log('Anti-Gravity Billing: AI Pack consumed previously?', aiPackConsumed);

            // If they have existing credits from Supabase (even if just 1), they can keep it
            if (existingCredits > 0) {
                console.log('Anti-Gravity Billing: ✅ Restored', existingCredits, 'remaining AI Pack credits from Supabase');
                alert(`✅ Your account has ${existingCredits} remaining AI Pack credits!`);
                return true;
            }

            // If AI Pack was already fully consumed and used up, don't grant more
            if (aiPackConsumed) {
                console.warn('Anti-Gravity Billing: ⚠️ AI Pack was already consumed - cannot grant additional credits');
                alert('⚠️ Your AI Pack was already fully used. That purchase cannot be restored again.');
                return false;
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
            let hasAiPackRestore = false;

            for (const purchase of capturedPurchases) {
                const productId = purchase.productIdentifier || purchase.productId || purchase.sku;

                if (productId === PRO_PRODUCT_ID) {
                    hasProRestore = true;
                    console.log('Anti-Gravity Billing: ✅ Restoring Pro status from manual restore...');
                    TaskLimitManager.upgradeToPro();
                    upgradeTier(SubscriptionTier.PRO, purchase.transactionId, true);

                    // STRICT VERIFICATION: Ensure both storage systems agreed
                    const isProInLimit = TaskLimitManager.isPro();
                    const subscription = TaskLimitManager.getSubscriptionSync();
                    const isProInSub = subscription?.tier === SubscriptionTier.PRO || subscription?.tier === SubscriptionTier.PREMIUM || subscription?.tier === SubscriptionTier.LIFETIME;

                    if (!isProInLimit || !isProInSub) {
                        console.warn('Anti-Gravity Billing: ⚠️ Storage drift detected after manual restore', {
                            isProInLimit,
                            isProInSub
                        });

                        // RETRY: Try one more forceful sync
                        if (isProInLimit && !isProInSub) {
                            upgradeTier(SubscriptionTier.PRO, purchase.transactionId, true);
                        } else if (!isProInLimit) {
                            TaskLimitManager.upgradeToPro();
                        }
                    }
                    alert('✅ Pro status restored!');
                }

                if (productId === AI_PACK_100_ID) {
                    // CRITICAL: Only grant if NOT already consumed
                    if (!isAiPackAlreadyConsumed()) {
                        hasAiPackRestore = true;
                        console.log('Anti-Gravity Billing: ✅ Restoring 100 AI Pack credits from manual restore...');
                        addAiPackCredits(100);
                        alert('✅ 100 AI Pack credits restored!');
                    } else {
                        console.warn('Anti-Gravity Billing: AI Pack already marked as consumed - skipping new grant');
                        alert('⚠️ This AI Pack was already used up. That purchase cannot be restored again.');
                    }
                }
            }

            if (!hasProRestore && !hasAiPackRestore && capturedPurchases.length === 0) {
                console.log('Anti-Gravity Billing: ℹ️ No new purchases found to restore (no active purchases on Google Play)');
                alert('ℹ️ No active purchases found on Google Play.');
                return false;
            }

            return hasProRestore || hasAiPackRestore;
        } catch (error) {
            console.error('Anti-Gravity Billing: Restore Error:', error);
            alert('❌ Restore failed. Please try again.');
            return false;
        }
    }
}

export default new BillingService();
