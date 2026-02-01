import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { upgradeTier, SubscriptionTier, saveSubscription, getSubscription } from './subscriptionService';
import { syncUsageToServer, fetchUserUsage } from './usageService';
import { getDeviceId } from './deviceService';
import { secureFetch } from './apiService';
import AuthService from './authService';
import Config from './configService';
import TaskLimitManager from '@/utils/TaskLimitManager';
import { STORAGE_KEYS } from '@/utils/constants';

const LIFETIME_PRODUCT_ID = 'lifetime_pro_access';
const LIFETIME_PRODUCT_ID_ALT = 'pro_access_lifetime'; // Legacy variant


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
    private isTestMode = AuthService.isTestAccount();

    async initialize() {
        try {
            console.log('Anti-Gravity Billing: Initializing...');
            const supported = await NativePurchases.isBillingSupported();

            if (!supported.isBillingSupported) {
                console.warn('Anti-Gravity Billing: Not supported on this device');
                return false;
            }

            if (!this.transactionListener) {
                try {
                    this.transactionListener = await NativePurchases.addListener('transactionUpdated', (transaction: any) => {
                        console.log('Anti-Gravity Billing: 📲 transactionUpdated event received:', transaction?.productIdentifier);
                        if (transaction && transaction.transactionId) {
                            this.restoredPurchases.push(transaction);
                        }
                    });
                } catch (listenerError) {
                    console.warn('Anti-Gravity Billing: Failed to register listener:', listenerError);
                }
            }

            this.processPendingPurchases().catch(e => console.warn('Anti-Gravity Billing: Pending purchase recovery failed:', e));

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Anti-Gravity Billing: Init Error:', error);
            return false;
        }
    }

    async getProducts(): Promise<ProductInfo[]> {
        try {
            if (!this.isInitialized) {
                const ok = await this.initialize();
                if (!ok) return [];
            }

            console.log('Anti-Gravity Billing: Fetching Lifetime product');
            const inAppResult = await NativePurchases.getProducts({
                productIdentifiers: [LIFETIME_PRODUCT_ID],
                productType: PURCHASE_TYPE.INAPP
            });

            return inAppResult.products.map(p => ({
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

    // PRO_MONTHLY removed - no longer supported for new purchases
    async purchasePro(): Promise<boolean> {
        alert('Monthly subscriptions are no longer available. Please choose Lifetime Access.');
        return false;
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
                const purchaseToken = (result as any).purchaseToken || result.transactionId;

                await NativePurchases.acknowledgePurchase({ purchaseToken }).catch(() => { });
                await this.addToPendingQueue({ purchaseToken, productId: LIFETIME_PRODUCT_ID, transactionId: result.transactionId });

                const verifyResult = await this.verifyPurchaseOnServer(purchaseToken, LIFETIME_PRODUCT_ID, result.transactionId);

                if (verifyResult) {
                    await this.removeFromPendingQueue(result.transactionId);
                    TaskLimitManager.upgradeToPro();
                    upgradeTier(SubscriptionTier.LIFETIME, result.transactionId);
                    alert('Lifetime Access Unlocked!');
                    return true;
                } else {
                    alert('⚠️ Payment verification failed. Please contact support if you were charged.');
                    return false;
                }
            }
            return false;
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            if (/already\s*own|ITEM_ALREADY_OWNED/i.test(errorMessage)) {
                return this.restorePurchases(false);
            }
            alert('Purchase failed: ' + errorMessage);
            return false;
        }
    }

    async syncPurchasesWithState(): Promise<void> {
        try {
            console.log('Anti-Gravity Billing: Syncing tier state...');
            const existingUsage = await fetchUserUsage();
            if (existingUsage) {
                saveSubscription(existingUsage);
            }
            this.restorePurchases(true).catch(e => console.warn('Background restore failed:', e));
        } catch (error) {
            console.error('Anti-Gravity Billing: Sync Error:', error);
        }
    }

    async restorePurchases(silent = false): Promise<boolean> {
        try {
            if (!silent) console.log('Anti-Gravity Billing: Manual restore triggered...');

            this.restoredPurchases = [];
            await NativePurchases.restorePurchases();
            await new Promise(resolve => setTimeout(resolve, silent ? 2000 : 4000));

            let hasLifetime = false;
            for (const purchase of this.restoredPurchases) {
                const productId = purchase.productIdentifier || purchase.productId || purchase.sku;
                if (productId === LIFETIME_PRODUCT_ID || productId === LIFETIME_PRODUCT_ID_ALT) {
                    hasLifetime = true;
                    const transactionId = purchase.transactionId || purchase.orderId || 'restore_sync';
                    const verificationToken = purchase.purchaseToken || transactionId;

                    const isVerified = await this.verifyPurchaseOnServer(verificationToken, productId, transactionId);
                    if (isVerified) {
                        TaskLimitManager.upgradeToPro();
                        upgradeTier(SubscriptionTier.LIFETIME, transactionId);
                        if (!silent) alert('✅ Lifetime status restored!');
                    }
                }
            }

            if (!hasLifetime && !silent) {
                alert('ℹ️ No active Lifetime purchase found.');
            }
            return hasLifetime;
        } catch (error) {
            console.error('Anti-Gravity Billing: Restore Error:', error);
            if (!silent) alert('❌ Restore failed.');
            return false;
        }
    }

    private async verifyPurchaseOnServer(purchaseToken: string, productId: string, transactionId: string): Promise<boolean> {
        try {
            const response = await secureFetch(`${Config.VITE_AG_API_URL}/api/index`, {
                method: 'POST',
                body: JSON.stringify({
                    type: 'verify_purchase',
                    purchaseToken,
                    productId,
                    transactionId,
                    timestamp: Date.now()
                })
            });
            const data = await response.json();
            return data.success === true;
        } catch (error) {
            return false;
        }
    }

    private async addToPendingQueue(purchase: any): Promise<void> {
        const queue = JSON.parse(localStorage.getItem('ag_pending_purchases') || '[]');
        queue.push({ ...purchase, addedAt: Date.now() });
        localStorage.setItem('ag_pending_purchases', JSON.stringify(queue));
    }

    private async removeFromPendingQueue(transactionId: string): Promise<void> {
        const queue = JSON.parse(localStorage.getItem('ag_pending_purchases') || '[]');
        localStorage.setItem('ag_pending_purchases', JSON.stringify(queue.filter((p: any) => p.transactionId !== transactionId)));
    }

    private async processPendingPurchases(): Promise<void> {
        const queue = JSON.parse(localStorage.getItem('ag_pending_purchases') || '[]');
        if (queue.length === 0) return;

        for (const purchase of queue) {
            const verified = await this.verifyPurchaseOnServer(purchase.purchaseToken, purchase.productId, purchase.transactionId);
            if (verified) {
                TaskLimitManager.upgradeToPro();
                upgradeTier(SubscriptionTier.LIFETIME, purchase.transactionId);
                await this.removeFromPendingQueue(purchase.transactionId);
            }
        }
    }
}

export default new BillingService();
