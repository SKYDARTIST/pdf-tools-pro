import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { upgradeTier, SubscriptionTier, saveSubscription, getSubscription } from './subscriptionService';
import { syncUsageToServer, fetchUserUsage } from './usageService';
import { getDeviceId } from './deviceService';
import { secureFetch } from './apiService';
import AuthService from './authService';
import Config from './configService';
import TaskLimitManager from '@/utils/TaskLimitManager';
import { STORAGE_KEYS } from '@/utils/constants';
import { indexedDBQueue } from './indexedDBQueue';

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
    private readonly PENDING_PURCHASES_STORE = 'pending-purchases';
    private readonly MAX_RETRIES = 10;

    async initialize() {
        try {
            console.log('Anti-Gravity Billing: 🔧 Initializing...', {
                timestamp: new Date().toISOString()
            });
            const supported = await NativePurchases.isBillingSupported();

            if (!supported.isBillingSupported) {
                console.warn('Anti-Gravity Billing: ⚠️ Not supported on this device');
                return false;
            }

            if (!this.transactionListener) {
                try {
                    console.log('Anti-Gravity Billing: 📡 Registering transactionUpdated listener...');
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

            // CRITICAL: Process pending purchases immediately
            // This ensures any failed purchases from previous sessions are recovered
            await this.processPendingPurchases().catch(e => {
                console.warn('Anti-Gravity Billing: ⚠️ Pending purchase recovery failed:', e);
            });

            // Start background retry service for continuous recovery
            this.startPendingPurchaseRetryService().catch(e => {
                console.warn('Anti-Gravity Billing: Failed to start retry service:', e);
            });

            this.isInitialized = true;
            console.log('Anti-Gravity Billing: ✅ Initialization complete');
            return true;
        } catch (error) {
            console.error('Anti-Gravity Billing: ❌ Init Error:', error);
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

            console.log('Anti-Gravity Billing: 🛒 Starting Lifetime purchase flow', {
                timestamp: new Date().toISOString()
            });

            const result = await NativePurchases.purchaseProduct({
                productIdentifier: LIFETIME_PRODUCT_ID,
                productType: PURCHASE_TYPE.INAPP
            });

            if (result.transactionId) {
                const purchaseToken = (result as any).purchaseToken || result.transactionId;

                console.log('Anti-Gravity Billing: 📦 Google Play returned transaction', {
                    transactionId: result.transactionId,
                    hasToken: !!purchaseToken
                });

                await NativePurchases.acknowledgePurchase({ purchaseToken }).catch((err) => {
                    console.warn('Anti-Gravity Billing: Failed to acknowledge purchase locally:', err.message);
                });

                // Add to pending queue IMMEDIATELY (before verification attempt)
                // This ensures we have recovery even if verification fails
                await this.addToPendingQueue({ purchaseToken, productId: LIFETIME_PRODUCT_ID, transactionId: result.transactionId });
                console.log('Anti-Gravity Billing: ✅ Added to pending recovery queue', { transactionId: result.transactionId });

                // SECURITY: Before verification, ensure session is valid with timeout
                const status = AuthService.getSessionStatus();
                if (!status.isValid) {
                    console.warn('Anti-Gravity Billing: Session invalid, attempting refresh...');

                    // Refresh session with timeout
                    const refreshPromise = AuthService.initializeSession();
                    const timeoutPromise = new Promise<{ success: boolean }>((_, reject) =>
                        setTimeout(() => reject(new Error('Session refresh timeout')), 5000)
                    );

                    try {
                        const refreshed = await Promise.race([refreshPromise, timeoutPromise]);
                        if (!refreshed.success) {
                            console.warn('Anti-Gravity Billing: Session refresh failed');
                            alert('⚠️ Your payment is processing. Please check your account in a moment.\n\nIf you don\'t see Lifetime access within 5 minutes, please restart the app.');
                            return false;
                        }
                    } catch (refreshError: any) {
                        console.error('Anti-Gravity Billing: Session refresh timed out:', refreshError.message);
                        alert('⚠️ Your payment is processing. Please check your account in a moment.\n\nIf you don\'t see Lifetime access within 5 minutes, please restart the app.');
                        return false;
                    }
                }

                // Attempt verification with full error context
                console.log('Anti-Gravity Billing: 🔐 Attempting server verification...', { transactionId: result.transactionId });
                const verifyResult = await this.verifyPurchaseOnServer(purchaseToken, LIFETIME_PRODUCT_ID, result.transactionId);

                if (verifyResult) {
                    console.log('Anti-Gravity Billing: ✅ Verification succeeded! Granting access...', { transactionId: result.transactionId });
                    await this.removeFromPendingQueue(result.transactionId);
                    TaskLimitManager.upgradeToPro();
                    upgradeTier(SubscriptionTier.LIFETIME, result.transactionId);
                    alert('🎉 Lifetime Access Unlocked!');
                    return true;
                } else {
                    // Verification failed, but payment went through
                    // Purchase is still in pending queue for automatic retry
                    const queueLength = (await this.getPendingQueue()).length;
                    console.error('Anti-Gravity Billing: ❌ Verification failed, but purchase is queued for retry', {
                        transactionId: result.transactionId,
                        queueLength
                    });

                    const confirmSupport = window.confirm(
                        '⚠️ PAYMENT VERIFICATION DELAYED\n\n' +
                        'Google has processed your payment, but our server is having trouble confirming it right now.\n\n' +
                        '✅ Your purchase is SAFE - recorded locally and will automatically verify when connection improves.\n\n' +
                        'Would you like to email support for immediate manual verification?'
                    );
                    if (confirmSupport) {
                        const deviceId = await getDeviceId();
                        const subject = encodeURIComponent('Purchase Verification Failed - Needs Manual Review');
                        const body = encodeURIComponent(
                            `🚨 URGENT: Purchase verification failed on our end\n\n` +
                            `Transaction ID: ${result.transactionId}\n` +
                            `Device ID: ${deviceId}\n` +
                            `Product: Lifetime Pro Access\n` +
                            `Purchase Token: ${purchaseToken}\n` +
                            `Timestamp: ${new Date().toISOString()}\n\n` +
                            `Please verify this purchase on Google Play and grant Lifetime access.`
                        );
                        window.location.href = `mailto:antigravitybybulla@gmail.com?subject=${subject}&body=${body}`;
                    }
                    return false;
                }
            }
            return false;
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            console.error('Anti-Gravity Billing: ❌ Purchase exception:', {
                message: errorMessage,
                code: error?.code,
                timestamp: new Date().toISOString()
            });

            if (/already\s*own|ITEM_ALREADY_OWNED/i.test(errorMessage)) {
                console.log('Anti-Gravity Billing: User already owns this product, restoring...');
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
            if (!silent) {
                console.log('Anti-Gravity Billing: 🔍 Manual restore triggered...');
            }

            // SECURITY: Ensure session is valid before starting expensive restore flow
            const authStatus = AuthService.getSessionStatus();
            if (!authStatus.isValid) {
                console.warn('Anti-Gravity Billing: Session invalid during restore. Attempting refresh with timeout...');

                const refreshPromise = AuthService.initializeSession();
                const timeoutPromise = new Promise<{ success: boolean }>((_, reject) =>
                    setTimeout(() => reject(new Error('Restore session refresh timeout')), 5000)
                );

                try {
                    const refresh = await Promise.race([refreshPromise, timeoutPromise]);
                    if (!refresh.success) {
                        console.error('Anti-Gravity Billing: Session refresh failed during restore');
                        if (!silent) alert('Session expired. Please log in again to restore purchases.');
                        return false;
                    }
                } catch (refreshError: any) {
                    console.error('Anti-Gravity Billing: Session refresh timed out during restore:', refreshError.message);
                    if (!silent) alert('Session timeout. Please try again.');
                    return false;
                }
            }

            this.restoredPurchases = [];
            console.log('Anti-Gravity Billing: 📲 Calling NativePurchases.restorePurchases()...');
            await NativePurchases.restorePurchases();

            const waitTime = silent ? 2500 : 5000;
            console.log(`Anti-Gravity Billing: ⏳ Waiting ${waitTime}ms for restore events...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));

            // FALLBACK: If no transactions from events, query directly
            if (this.restoredPurchases.length === 0) {
                console.log('Anti-Gravity Billing: 📊 No transactions from events, querying directly via getPurchases...');
                try {
                    // Query INAPP purchases
                    const inAppPurchases = await NativePurchases.getPurchases({
                        productType: PURCHASE_TYPE.INAPP
                    });

                    // Query SUBSCRIPTION purchases
                    const subsPurchases = await NativePurchases.getPurchases({
                        productType: PURCHASE_TYPE.SUBS
                    });

                    console.log('Anti-Gravity Billing: 📈 Direct query results:', {
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
                    console.error('Anti-Gravity Billing: ❌ Direct query failed:', queryError);
                }
            }

            console.log(`Anti-Gravity Billing: 📦 Found ${this.restoredPurchases.length} restored purchase(s)`);

            let hasLifetime = false;
            let verificationErrors = 0;

            for (const purchase of this.restoredPurchases) {
                const productId = purchase.productIdentifier || purchase.productId || purchase.sku;
                if (productId === LIFETIME_PRODUCT_ID || productId === LIFETIME_PRODUCT_ID_ALT) {
                    const transactionId = purchase.transactionId || purchase.orderId || 'restore_sync';
                    const verificationToken = purchase.purchaseToken || transactionId;

                    console.log('Anti-Gravity Billing: 🔐 Verifying restored purchase...', { productId, transactionId });

                    const isVerified = await this.verifyPurchaseOnServer(verificationToken, productId, transactionId);
                    if (isVerified) {
                        hasLifetime = true;
                        console.log('Anti-Gravity Billing: ✅ Restored purchase verified!', { transactionId });
                        TaskLimitManager.upgradeToPro();
                        upgradeTier(SubscriptionTier.LIFETIME, transactionId);
                        if (!silent) alert('✅ Lifetime status restored!');
                    } else {
                        console.error('Anti-Gravity Billing: ❌ Verification failed for restored purchase', { transactionId });
                        verificationErrors++;
                    }
                }
            }

            if (!hasLifetime && !silent) {
                if (verificationErrors > 0) {
                    alert('⚠️ Verification failed for your previous purchase.\n\nPlease check:\n1. Internet connection\n2. You\'re logged in with the same Google account\n3. Try again in a moment');
                } else {
                    alert('ℹ️ No active Lifetime purchase found on this device.');
                }
            }

            return hasLifetime;
        } catch (error: any) {
            console.error('Anti-Gravity Billing: ❌ Restore Error:', {
                message: error.message,
                timestamp: new Date().toISOString()
            });
            if (!silent) alert('❌ Restore failed. Please try again.');
            return false;
        }
    }

    private async verifyPurchaseOnServer(purchaseToken: string, productId: string, transactionId: string): Promise<boolean> {
        const verificationStartTime = Date.now();
        const VERIFICATION_TIMEOUT = 30000; // 30 seconds for entire verification flow

        const performVerification = async (): Promise<boolean> => {
            console.log('Anti-Gravity Billing: 🔐 Verifying purchase on server...', {
                transactionId,
                productId,
                timestamp: new Date().toISOString()
            });

            // CRITICAL: Ensure session is valid with timeout protection
            const sessionStatus = AuthService.getSessionStatus();
            if (!sessionStatus.isValid) {
                console.warn('Anti-Gravity Billing: Session invalid, attempting refresh with timeout...');

                // Refresh session with 5-second timeout
                const refreshPromise = AuthService.initializeSession();
                const timeoutPromise = new Promise<{ success: boolean }>((_, reject) =>
                    setTimeout(() => reject(new Error('Session refresh timeout after 5s')), 5000)
                );

                try {
                    const result = await Promise.race([refreshPromise, timeoutPromise]);
                    if (!result.success) {
                        console.error('Anti-Gravity Billing: ❌ Session refresh failed');
                        return false;
                    }
                    console.log('Anti-Gravity Billing: ✅ Session refreshed successfully');
                } catch (refreshError: any) {
                    console.error('Anti-Gravity Billing: ❌ Session refresh failed:', refreshError.message);
                    return false;
                }
            }

            // secureFetch automatically includes CSRF token and x-ag-timestamp
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

            console.log('Anti-Gravity Billing: 📥 Server response:', {
                status: response.status,
                statusText: response.statusText
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Anti-Gravity Billing: ❌ Purchase verification failed', {
                    status: response.status,
                    error: errorData.error,
                    details: errorData.details,
                    transactionId
                });
                return false;
            }

            const data = await response.json();

            if (data.success === true) {
                console.log('Anti-Gravity Billing: ✅ Purchase verified successfully', {
                    tier: data.tier,
                    transactionId,
                    duration: Date.now() - verificationStartTime
                });
                return true;
            } else {
                console.error('Anti-Gravity Billing: ❌ Server returned success=false', {
                    error: data.error,
                    details: data.details,
                    transactionId
                });
                return false;
            }
        };

        try {
            // Wrap entire verification in timeout
            const timeoutPromise = new Promise<boolean>((_, reject) =>
                setTimeout(
                    () => reject(new Error(`Verification timeout after ${VERIFICATION_TIMEOUT / 1000}s`)),
                    VERIFICATION_TIMEOUT
                )
            );

            const result = await Promise.race([performVerification(), timeoutPromise]);
            return result;
        } catch (error: any) {
            const duration = Date.now() - verificationStartTime;
            const isTimeout = error.message.includes('timeout');

            console.error('Anti-Gravity Billing: ❌ Verification request failed', {
                error: error.message,
                isTimeout,
                duration,
                transactionId,
                timestamp: new Date().toISOString()
            });

            if (isTimeout) {
                console.warn('Anti-Gravity Billing: ⏱️ Verification timed out - will retry from queue', {
                    transactionId,
                    duration
                });
            }

            return false;
        }
    }

    private async addToPendingQueue(purchase: any): Promise<void> {
        try {
            await indexedDBQueue.add(this.PENDING_PURCHASES_STORE, purchase.transactionId, purchase);
        } catch (error: any) {
            console.error('Anti-Gravity Billing: Failed to add to IndexedDB queue, falling back to localStorage', error);
            // Fallback to localStorage if IndexedDB fails
            const queue = this.safeParsePurchaseQueueFallback();
            queue.push({ ...purchase, addedAt: Date.now() });
            localStorage.setItem('ag_pending_purchases', JSON.stringify(queue));
        }
    }

    private async removeFromPendingQueue(transactionId: string): Promise<void> {
        try {
            await indexedDBQueue.remove(this.PENDING_PURCHASES_STORE, transactionId);
        } catch (error: any) {
            console.error('Anti-Gravity Billing: Failed to remove from IndexedDB queue, falling back to localStorage', error);
            // Fallback to localStorage if IndexedDB fails
            const queue = this.safeParsePurchaseQueueFallback();
            localStorage.setItem('ag_pending_purchases', JSON.stringify(queue.filter((p: any) => p.transactionId !== transactionId)));
        }
    }

    public async getPendingQueue(): Promise<any[]> {
        try {
            const items = await indexedDBQueue.getAll(this.PENDING_PURCHASES_STORE);
            return items.map(item => item.data);
        } catch (error: any) {
            console.error('Anti-Gravity Billing: Failed to get queue from IndexedDB, falling back to localStorage', error);
            // Fallback to localStorage if IndexedDB fails
            return this.safeParsePurchaseQueueFallback();
        }
    }

    // SAFETY: Fallback localStorage parsing with corruption protection
    private safeParsePurchaseQueueFallback(): any[] {
        try {
            const value = localStorage.getItem('ag_pending_purchases');
            return value ? JSON.parse(value) : [];
        } catch (e) {
            console.error('Anti-Gravity Billing: Corrupted data in ag_pending_purchases, clearing and resetting.', e);
            localStorage.removeItem('ag_pending_purchases');
            return [];
        }
    }

    private async processPendingPurchases(): Promise<void> {
        const queue = await this.getPendingQueue();
        if (queue.length === 0) {
            console.log('Anti-Gravity Billing: No pending purchases to process');
            return;
        }

        console.log('Anti-Gravity Billing: 🔄 Processing pending purchases', {
            count: queue.length,
            timestamp: new Date().toISOString()
        });

        for (const purchase of queue) {
            console.log('Anti-Gravity Billing: 🔐 Verifying pending purchase', {
                transactionId: purchase.transactionId,
                age: Date.now() - (purchase.addedAt || 0)
            });

            try {
                const verified = await this.verifyPurchaseOnServer(
                    purchase.purchaseToken,
                    purchase.productId,
                    purchase.transactionId
                );

                if (verified) {
                    console.log('Anti-Gravity Billing: ✅ Pending purchase verified! Granting access...', {
                        transactionId: purchase.transactionId
                    });
                    TaskLimitManager.upgradeToPro();
                    upgradeTier(SubscriptionTier.LIFETIME, purchase.transactionId);
                    await this.removeFromPendingQueue(purchase.transactionId);
                } else {
                    console.warn('Anti-Gravity Billing: ⏳ Pending purchase still failing, will retry later', {
                        transactionId: purchase.transactionId,
                        age: Date.now() - (purchase.addedAt || 0)
                    });
                    // Track retry count for this purchase
                    try {
                        await indexedDBQueue.incrementRetry(this.PENDING_PURCHASES_STORE, purchase.transactionId);
                    } catch (e) {
                        console.warn('Anti-Gravity Billing: Could not increment retry count:', e);
                    }
                }
            } catch (error: any) {
                console.error('Anti-Gravity Billing: ❌ Error processing pending purchase', {
                    transactionId: purchase.transactionId,
                    error: error.message
                });
                // Track retry count
                try {
                    await indexedDBQueue.incrementRetry(this.PENDING_PURCHASES_STORE, purchase.transactionId);
                } catch (e) {
                    console.warn('Anti-Gravity Billing: Could not increment retry count:', e);
                }
            }
        }

        // Remove items that have exceeded max retries
        try {
            const removed = await indexedDBQueue.removeExceededRetries(this.PENDING_PURCHASES_STORE, this.MAX_RETRIES);
            if (removed > 0) {
                console.warn('Anti-Gravity Billing: Removed purchases that exceeded max retries', { removed });
            }
        } catch (e) {
            console.error('Anti-Gravity Billing: Failed to clean up expired retries:', e);
        }
    }

    /**
     * Start background service to retry pending purchases periodically
     * Call this on app initialization
     */
    async startPendingPurchaseRetryService(): Promise<void> {
        console.log('Anti-Gravity Billing: 🚀 Starting pending purchase retry service');

        // Immediate attempt on startup
        await this.processPendingPurchases();

        // Retry every 30 seconds while app is active
        setInterval(async () => {
            const queue = await this.getPendingQueue();
            if (queue.length > 0) {
                console.log('Anti-Gravity Billing: ⏰ Background retry check', { pendingCount: queue.length });
                await this.processPendingPurchases();
            }
        }, 30000); // Every 30 seconds

        // Also retry when app comes to foreground (if using Capacitor)
        try {
            const { App } = await import('@capacitor/app');
            App.addListener('appStateChange', async (state) => {
                if (state.isActive) {
                    const queue = await this.getPendingQueue();
                    if (queue.length > 0) {
                        console.log('Anti-Gravity Billing: 📱 App came to foreground, retrying pending purchases');
                        await this.processPendingPurchases();
                    }
                }
            });
        } catch (e) {
            console.log('Anti-Gravity Billing: Capacitor App module not available (running on web)');
        }
    }
}

export default new BillingService();
