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

    // SAFETY: Parse localStorage with corruption protection
    private safeParsePurchaseQueue(key: string): any[] {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : [];
        } catch (e) {
            console.error(`Anti-Gravity Billing: Corrupted data in ${key}, clearing and resetting.`, e);
            localStorage.removeItem(key);
            return [];
        }
    }

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
                    console.log('Anti-Gravity Billing: Registering transactionUpdated listener...');
                    this.transactionListener = await NativePurchases.addListener('transactionUpdated', (transaction: any) => {
                        console.log('Anti-Gravity Billing: 📲 transactionUpdated event received:', {
                            productId: transaction?.productIdentifier,
                            transactionId: transaction?.transactionId,
                            status: transaction?.transactionState
                        });
                        if (transaction && transaction.transactionId) {
                            this.restoredPurchases.push(transaction);
                        } else {
                            console.warn('Anti-Gravity Billing: Received event with missing transactionId');
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

                // SECURITY: Before verification, ensure session is valid
                const status = AuthService.getSessionStatus();
                if (!status.isValid) {
                    const refreshed = await AuthService.initializeSession();
                    if (!refreshed.success) {
                        alert('Session expired during purchase. Your purchase is recorded locally and will sync once you log in again.');
                        return false;
                    }
                }

                const verifyResult = await this.verifyPurchaseOnServer(purchaseToken, LIFETIME_PRODUCT_ID, result.transactionId);

                if (verifyResult) {
                    await this.removeFromPendingQueue(result.transactionId);
                    TaskLimitManager.upgradeToPro();
                    upgradeTier(SubscriptionTier.LIFETIME, result.transactionId);
                    alert('Lifetime Access Unlocked!');
                    return true;
                } else {
                    const confirmSupport = window.confirm(
                        '⚠️ PAYMENT VERIFICATION DELAYED\n\n' +
                        'Google has processed your payment, but our server is having trouble confirming it right now. Your purchase is safe and recorded locally.\n\n' +
                        'Would you like to email support now to resolve this manually?'
                    );
                    if (confirmSupport) {
                        const deviceId = await getDeviceId();
                        const subject = encodeURIComponent('Purchase Verification Failed');
                        const body = encodeURIComponent(
                            `Transaction ID: ${result.transactionId}\nDevice ID: ${deviceId}\nProduct: ${LIFETIME_PRODUCT_ID}\nTime: ${new Date().toISOString()}`
                        );
                        window.location.href = `mailto:antigravitybybulla@gmail.com?subject=${subject}&body=${body}`;
                    }
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

            // SECURITY: Ensure session is valid before starting expensive restore flow
            const authStatus = AuthService.getSessionStatus();
            if (!authStatus.isValid) {
                console.warn('Anti-Gravity Billing: Session invalid during restore. Attempting refresh...');
                const refresh = await AuthService.initializeSession();
                if (!refresh.success) {
                    if (!silent) alert('Session expired. Please log in again to restore purchases.');
                    return false;
                }
            }

            this.restoredPurchases = [];
            await NativePurchases.restorePurchases();

            console.log('Anti-Gravity Billing: Waiting for restore events...');
            await new Promise(resolve => setTimeout(resolve, silent ? 2500 : 5000));

            // FALLBACK: If no transactions from events, query directly
            if (this.restoredPurchases.length === 0) {
                console.log('Anti-Gravity Billing: No transactions from events, querying directly via getPurchases...');
                try {
                    // Query INAPP purchases
                    const inAppPurchases = await NativePurchases.getPurchases({
                        productType: PURCHASE_TYPE.INAPP
                    });

                    // Query SUBSCRIPTION purchases  
                    const subsPurchases = await NativePurchases.getPurchases({
                        productType: PURCHASE_TYPE.SUBS
                    });

                    console.log('Anti-Gravity Billing: Direct query results:', {
                        inApp: inAppPurchases.purchases?.length || 0,
                        subs: subsPurchases.purchases?.length || 0
                    });

                    // Combine and process
                    const allPurchases = [
                        ...(inAppPurchases.purchases || []),
                        ...(subsPurchases.purchases || [])
                    ];

                    for (const purchase of allPurchases) {
                        this.restoredPurchases.push(purchase);
                    }
                } catch (queryError) {
                    console.error('Anti-Gravity Billing: Direct query failed:', queryError);
                }
            }

            let hasLifetime = false;
            let verificationErrors = 0;

            for (const purchase of this.restoredPurchases) {
                const productId = purchase.productIdentifier || purchase.productId || purchase.sku;
                if (productId === LIFETIME_PRODUCT_ID || productId === LIFETIME_PRODUCT_ID_ALT) {
                    const transactionId = purchase.transactionId || purchase.orderId || 'restore_sync';
                    const verificationToken = purchase.purchaseToken || transactionId;

                    const isVerified = await this.verifyPurchaseOnServer(verificationToken, productId, transactionId);
                    if (isVerified) {
                        hasLifetime = true;
                        TaskLimitManager.upgradeToPro();
                        upgradeTier(SubscriptionTier.LIFETIME, transactionId);
                        if (!silent) alert('✅ Lifetime status restored!');
                    } else {
                        verificationErrors++;
                    }
                }
            }

            if (!hasLifetime && !silent) {
                if (verificationErrors > 0) {
                    alert('⚠️ Verification failed for your previous purchase. Please check your internet connection or log in again.');
                } else {
                    alert('ℹ️ No active Lifetime purchase found.');
                }
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
        const queue = this.safeParsePurchaseQueue('ag_pending_purchases');
        queue.push({ ...purchase, addedAt: Date.now() });
        localStorage.setItem('ag_pending_purchases', JSON.stringify(queue));
    }

    private async removeFromPendingQueue(transactionId: string): Promise<void> {
        const queue = this.safeParsePurchaseQueue('ag_pending_purchases');
        localStorage.setItem('ag_pending_purchases', JSON.stringify(queue.filter((p: any) => p.transactionId !== transactionId)));
    }

    public getPendingQueue(): any[] {
        return this.safeParsePurchaseQueue('ag_pending_purchases');
    }

    private async processPendingPurchases(): Promise<void> {
        const queue = this.safeParsePurchaseQueue('ag_pending_purchases');
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
