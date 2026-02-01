# 🔧 Complete Fix Guide - All Issues
**Project:** Anti-Gravity PDF Tools Pro
**Total Issues:** 12 (1 P0, 2 P1, 5 P2, 4 P3)
**Estimated Time:** 4-6 hours total

---

## 📋 EXECUTION ORDER

Fix issues in this order by priority:

```
P0 (Critical) → P1 (High) → P2 (Medium) → P3 (Low)
```

Report after completing EACH priority level.

---

## 🚨 P0 - CRITICAL (Fix First - 30 min)

### ISSUE #1: ReaderScreen AI Credit Bypasses

**Status:** ✅ Already has separate guide
**Guide:** `GEMINI_READER_CREDIT_FIX_GUIDE.md`
**Action:** Execute that guide first, then return here

**Verification:**
```bash
grep -c "canUseAI(AiOperationType.HEAVY)" src/screens/ReaderScreen.tsx
# Should output: 4
```

---

## 🔥 P1 - HIGH PRIORITY (Fix Second - 2 hours)

### ISSUE #2: Silent Sync Failures

**File:** `src/services/usageService.ts`
**Problem:** Network failures during sync are silent - users never know their data isn't synced
**Impact:** Users lose credits, usage data out of sync

#### STEP 2.1: Add Retry Queue Storage

**Location:** `src/services/usageService.ts` - Add after imports (line 11)

**Add this code:**
```typescript
// After line 11 (after imports)
const FAILED_SYNCS_KEY = 'ag_failed_syncs';

interface FailedSync {
    usage: UserSubscription;
    timestamp: number;
    attempts: number;
}
```

#### STEP 2.2: Modify syncUsageToServer Function

**Find:** `src/services/usageService.ts` line 58-120

**Replace the entire function with:**
```typescript
export const syncUsageToServer = async (usage: UserSubscription): Promise<void> => {
    try {
        const googleUser = await getCurrentUser();
        const deviceId = await getDeviceId();

        const apiEndpoint = googleUser ? API_ENDPOINTS.SUBSCRIPTION : API_ENDPOINTS.INDEX;
        const backendUrl = `${Config.VITE_AG_API_URL}${apiEndpoint}`;

        SecurityLogger.log('Anti-Gravity Billing: Syncing usage to server...', {
            user: googleUser ? googleUser.email : maskString(deviceId),
            aiPackCredits: usage.aiPackCredits,
            tier: usage.tier,
            timestamp: new Date().toISOString()
        });

        const secureUsage = {
            operationsToday: usage.operationsToday,
            lastOperationReset: usage.lastOperationReset,
        };

        const payload = googleUser ? secureUsage : { type: 'usage_sync', usage: secureUsage };

        const response = await secureFetch(backendUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const responseBody = await response.text();
            let errorDetails = {};
            try {
                errorDetails = JSON.parse(responseBody);
            } catch {
                errorDetails = { rawResponse: responseBody };
            }

            Logger.error('Billing', 'syncUsageToServer failed', {
                status: response.status,
                statusText: response.statusText,
                errorDetails,
                aiPackCredits: usage.aiPackCredits,
                tier: usage.tier,
            });

            // CHANGE: Add to retry queue instead of just logging
            addToRetryQueue(usage);
            notifyUserOfSyncFailure();
            return;
        }

        Logger.info('Billing', '✅ Usage synced successfully', {
            aiPackCredits: usage.aiPackCredits,
            tier: usage.tier,
        });

        // CHANGE: Clear from retry queue on success
        clearFromRetryQueue();

    } catch (error) {
        Logger.error('Billing', 'syncUsageToServer network error', {
            error: error instanceof Error ? error.message : String(error),
        });

        // CHANGE: Add to retry queue on network error
        addToRetryQueue(usage);
        notifyUserOfSyncFailure();
    }
};
```

#### STEP 2.3: Add Retry Queue Helper Functions

**Location:** `src/services/usageService.ts` - Add at end of file (before final export on line 121)

**Add this code:**
```typescript
// Add before line 121

const addToRetryQueue = (usage: UserSubscription): void => {
    try {
        const queue: FailedSync[] = JSON.parse(localStorage.getItem(FAILED_SYNCS_KEY) || '[]');

        // Check if already in queue
        const existing = queue.find(item => item.timestamp > Date.now() - 60000); // Last minute
        if (existing) {
            existing.attempts += 1;
        } else {
            queue.push({
                usage,
                timestamp: Date.now(),
                attempts: 1
            });
        }

        // Keep only last 10 failed syncs
        if (queue.length > 10) {
            queue.shift();
        }

        localStorage.setItem(FAILED_SYNCS_KEY, JSON.stringify(queue));
        console.warn('Anti-Gravity Sync: Added to retry queue');
    } catch (e) {
        console.error('Failed to add to retry queue:', e);
    }
};

const clearFromRetryQueue = (): void => {
    try {
        localStorage.removeItem(FAILED_SYNCS_KEY);
        console.log('Anti-Gravity Sync: Retry queue cleared');
    } catch (e) {
        console.error('Failed to clear retry queue:', e);
    }
};

const notifyUserOfSyncFailure = (): void => {
    window.dispatchEvent(new CustomEvent('sync-failed', {
        detail: { message: 'Changes will sync when online' }
    }));
};

export const retryFailedSyncs = async (): Promise<void> => {
    try {
        const queue: FailedSync[] = JSON.parse(localStorage.getItem(FAILED_SYNCS_KEY) || '[]');
        if (queue.length === 0) return;

        console.log(`Anti-Gravity Sync: Retrying ${queue.length} failed syncs...`);

        for (const item of queue) {
            // Skip if too old (7 days)
            if (Date.now() - item.timestamp > 7 * 24 * 60 * 60 * 1000) {
                console.warn('Skipping sync older than 7 days');
                continue;
            }

            // Skip if too many attempts
            if (item.attempts >= 5) {
                console.error('Max retry attempts exceeded');
                continue;
            }

            await syncUsageToServer(item.usage);
        }
    } catch (e) {
        console.error('Failed to retry syncs:', e);
    }
};
```

#### STEP 2.4: Add Retry Call on App Start

**File:** `src/App.tsx`
**Location:** Inside the `init()` function around line 86

**Find:**
```typescript
console.log('🚀 App: Starting background subscription sync...');
initSubscription().catch(e => console.warn('Non-critical subscription sync failed:', e));
```

**Add AFTER that:**
```typescript
// Add retry for failed syncs
import { retryFailedSyncs } from '@/services/usageService';

// Inside init() function, after initSubscription line
retryFailedSyncs().catch(e => console.warn('Retry failed syncs error:', e));
```

**Verification:**
```bash
grep -n "retryFailedSyncs" src/App.tsx
grep -n "addToRetryQueue" src/services/usageService.ts
grep -n "FAILED_SYNCS_KEY" src/services/usageService.ts
```

---

### ISSUE #3: Credits Not Appearing After Purchase

**File:** `src/services/billingService.ts`
**Problem:** If app crashes between payment and queue add, purchase is lost
**Impact:** User pays but doesn't get credits

#### STEP 3.1: Move Queue Add Earlier in purchaseAiPack

**File:** `src/services/billingService.ts`
**Location:** Function `purchaseAiPack` around line 405-444

**Find:**
```typescript
if (result.transactionId) {
    console.log('Anti-Gravity Billing: ✅ AI Pack purchase successful, acknowledging...');
    const purchaseToken = (result as any).purchaseToken || result.transactionId;

    // V6.0: Store in pending queue
    await this.addToPendingQueue({ purchaseToken, productId, transactionId: result.transactionId });

    const verifyResult = await this.verifyPurchaseOnServer(purchaseToken, productId, result.transactionId);
```

**Replace with:**
```typescript
if (result.transactionId) {
    console.log('Anti-Gravity Billing: ✅ AI Pack purchase successful, acknowledging...');
    const purchaseToken = (result as any).purchaseToken || result.transactionId;

    // CRITICAL: Add to queue IMMEDIATELY - before verification
    // This ensures purchase is not lost if app crashes
    await this.addToPendingQueue({ purchaseToken, productId, transactionId: result.transactionId });
    console.log('Anti-Gravity Billing: 🛡️ Purchase queued for verification');

    const verifyResult = await this.verifyPurchaseOnServer(purchaseToken, productId, result.transactionId);
```

#### STEP 3.2: Do Same for purchasePro Function

**File:** `src/services/billingService.ts`
**Location:** Function `purchasePro` (search for it)

**Find the similar pattern and make the same change:**
```typescript
// Move addToPendingQueue BEFORE verifyPurchaseOnServer
// Add the same console.log about purchase queued
```

#### STEP 3.3: Do Same for purchaseLifetime Function

**File:** `src/services/billingService.ts`
**Location:** Function `purchaseLifetime` (search for it)

**Find the similar pattern and make the same change:**
```typescript
// Move addToPendingQueue BEFORE verifyPurchaseOnServer
// Add the same console.log about purchase queued
```

**Verification:**
```bash
# Check that addToPendingQueue comes before verifyPurchaseOnServer in all 3 functions
grep -A 10 "addToPendingQueue" src/services/billingService.ts | grep -B 2 "verifyPurchaseOnServer"
```

---

## ⚠️ P2 - MEDIUM PRIORITY (Fix Third - 1.5 hours)

### ISSUE #4: Memory Leaks from Event Listeners

**Files:** 11 files missing cleanup
**Problem:** Event listeners not removed, causing memory leaks
**Impact:** Performance degradation over time

#### Files to Fix:
1. `src/services/diagnostics.ts`
2. `src/services/downloadService.ts`
3. `src/services/authService.ts`
4. `src/components/ShareModal.tsx`
5. `src/screens/AntiGravityWorkspace.tsx`
6. `src/screens/MergeScreen.tsx`
7. `src/services/integrityService.ts`
8. `src/screens/GoogleAuthCallback.tsx`
9. `src/screens/ExtractTextScreen.tsx`
10. `src/screens/ScannerScreen.tsx`
11. `src/screens/DataExtractorScreen.tsx`

#### STEP 4.1: Fix Pattern (Apply to Each File)

For EACH file above, find all `addEventListener` calls and ensure there's a matching cleanup.

**Pattern to follow:**

**BEFORE (BAD):**
```typescript
useEffect(() => {
    window.addEventListener('some-event', handleEvent);
    // Missing cleanup!
}, []);
```

**AFTER (GOOD):**
```typescript
useEffect(() => {
    const handleEvent = () => { /* ... */ };
    window.addEventListener('some-event', handleEvent);

    // ADD CLEANUP
    return () => {
        window.removeEventListener('some-event', handleEvent);
    };
}, []);
```

#### STEP 4.2: Systematic Fix Process

For each of the 11 files:

1. Open the file
2. Search for `addEventListener`
3. For each occurrence:
   - Check if it's inside a `useEffect` or component
   - Ensure the handler function is defined (not inline)
   - Add cleanup in the return statement
4. Save file
5. Verify with grep

**Example for src/components/ShareModal.tsx:**

```bash
# Find addEventListener in file
grep -n "addEventListener" src/components/ShareModal.tsx

# After fixing, verify cleanup exists
grep -A 10 "addEventListener" src/components/ShareModal.tsx | grep "removeEventListener"
```

**Repeat for all 11 files**

**Verification (run after fixing all files):**
```bash
# Count should be equal or close
grep -r "addEventListener" src/ | wc -l
grep -r "removeEventListener" src/ | wc -l
```

---

### ISSUE #5: localStorage Corruption Handling

**File:** `src/services/subscriptionService.ts`
**Problem:** Corrupted data is wiped immediately without trying server recovery
**Impact:** User loses state, brief panic

#### STEP 5.1: Improve Error Handling in getSubscription

**Location:** `src/services/subscriptionService.ts` line 143-178

**Find:**
```typescript
} catch (e) {
    console.error('Anti-Gravity Subscription: Malformed localStorage data, resetting.', e);
    localStorage.removeItem(STORAGE_KEY); // Clear corrupted data
    // Fall through to default behavior below
}
```

**Replace with:**
```typescript
} catch (e) {
    console.error('Anti-Gravity Subscription: Malformed localStorage data, attempting recovery...', e);

    // TRY TO RECOVER from server before wiping
    try {
        const serverData = await fetchUserUsage();
        if (serverData) {
            console.log('Anti-Gravity Subscription: ✅ Recovered from server');
            saveSubscription(serverData);
            return serverData;
        }
    } catch (recoveryError) {
        console.error('Anti-Gravity Subscription: Server recovery failed', recoveryError);
    }

    // Only wipe as last resort
    console.warn('Anti-Gravity Subscription: Resetting to default (no recovery possible)');
    localStorage.removeItem(STORAGE_KEY);
    // Fall through to default behavior below
}
```

**Note:** Since `getSubscription` is synchronous, we need to handle async recovery. Change function signature:

**Find:**
```typescript
export const getSubscription = (): UserSubscription => {
```

**Replace with:**
```typescript
export const getSubscription = (): UserSubscription => {
    // Keep synchronous for now, but add async recovery attempt in background
```

**Add this helper function at the end of file:**
```typescript
// Add before final export
export const recoverSubscriptionIfCorrupted = async (): Promise<void> => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
        JSON.parse(stored); // Test if valid
    } catch (e) {
        // Corrupted - try recovery
        console.error('Detected corrupted subscription data, recovering...');
        const serverData = await fetchUserUsage();
        if (serverData) {
            saveSubscription(serverData);
            window.dispatchEvent(new CustomEvent('subscription-recovered'));
        }
    }
};
```

**Call this from App.tsx init:**
```typescript
// In App.tsx init() function
import { recoverSubscriptionIfCorrupted } from '@/services/subscriptionService';

recoverSubscriptionIfCorrupted().catch(e => console.warn('Recovery check failed:', e));
```

**Verification:**
```bash
grep -n "recoverSubscriptionIfCorrupted" src/services/subscriptionService.ts
grep -n "recoverSubscriptionIfCorrupted" src/App.tsx
```

---

### ISSUE #6: Debug Panel in Production

**File:** `src/App.tsx`
**Problem:** Debug panel accessible in production, exposes sensitive data
**Impact:** Security risk, users can trigger nuclear reset

#### STEP 6.1: Conditional Import

**Location:** `src/App.tsx` line 48

**Find:**
```typescript
import DebugLogPanel from '@/components/DebugLogPanel';
```

**Replace with:**
```typescript
// Conditional import - only in development
const DebugLogPanel = !Config.IS_PRODUCTION
    ? lazy(() => import('@/components/DebugLogPanel'))
    : null;
```

#### STEP 6.2: Conditional Render

**Location:** `src/App.tsx` - Find where DebugLogPanel is rendered (search for `<DebugLogPanel`)

**Find:**
```typescript
{debugPanelOpen && (
    <DebugLogPanel
        isOpen={debugPanelOpen}
        onClose={() => setDebugPanelOpen(false)}
    />
)}
```

**Replace with:**
```typescript
{!Config.IS_PRODUCTION && debugPanelOpen && DebugLogPanel && (
    <Suspense fallback={<div>Loading...</div>}>
        <DebugLogPanel
            isOpen={debugPanelOpen}
            onClose={() => setDebugPanelOpen(false)}
        />
    </Suspense>
)}
```

**Verification:**
```bash
grep -n "IS_PRODUCTION.*DebugLogPanel" src/App.tsx
```

---

### ISSUE #7: Credit Reset UX Issue

**Problem:** No loading state during initial credit sync
**Impact:** User sees 0 credits briefly, panics

**File:** `src/App.tsx` or create new component

#### STEP 7.1: Add Loading State

**Location:** `src/App.tsx` around line 72

**Find:**
```typescript
const [isDataReady, setIsDataReady] = React.useState(false);
```

**Add after:**
```typescript
const [isSyncingCredits, setIsSyncingCredits] = React.useState(true);
```

#### STEP 7.2: Update Init Function

**Location:** `src/App.tsx` line 76-98

**Find:**
```typescript
initSubscription().catch(e => console.warn('Non-critical subscription sync failed:', e));
```

**Replace with:**
```typescript
initSubscription()
    .catch(e => console.warn('Non-critical subscription sync failed:', e))
    .finally(() => setIsSyncingCredits(false));
```

#### STEP 7.3: Show Loading Overlay (Optional but Recommended)

**Location:** Add to render section before main content

**Add:**
```typescript
{isSyncingCredits && (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-sm font-bold">Syncing your credits...</p>
        </div>
    </div>
)}
```

**Verification:**
```bash
grep -n "isSyncingCredits" src/App.tsx
```

---

### ISSUE #8: PDF Usage Not Syncing

**Same fix as ISSUE #2** - retry queue handles both AI and PDF usage

**Status:** ✅ Fixed by completing Issue #2

---

## 📝 P3 - LOW PRIORITY (Fix Last - 1 hour)

### ISSUE #9: Silent Auth Failures

**File:** `src/screens/GoogleAuthCallback.tsx`
**Problem:** Auth errors redirect without showing message
**Impact:** User confusion

#### STEP 9.1: Add Error Alert

**Location:** `src/screens/GoogleAuthCallback.tsx` line 85-90

**Find:**
```typescript
} catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Authentication failed';
    console.error('Auth callback error:', { message: errorMsg, timestamp: new Date().toISOString() });
    // Let's just redirect after 2s
    setTimeout(() => navigate('/workspace'), 2000);
}
```

**Replace with:**
```typescript
} catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Authentication failed';
    console.error('Auth callback error:', { message: errorMsg, timestamp: new Date().toISOString() });

    // SHOW ERROR to user
    alert(`Login failed: ${errorMsg}\n\nRedirecting to homepage...`);

    setTimeout(() => navigate('/workspace'), 2000);
}
```

**Verification:**
```bash
grep -n "alert.*Login failed" src/screens/GoogleAuthCallback.tsx
```

---

### ISSUE #10: Unnecessary Re-renders

**File:** `src/services/subscriptionService.ts`
**Problem:** subscription-updated event fires even when nothing changed
**Impact:** Performance - components re-render unnecessarily

#### STEP 10.1: Add Change Detection

**Location:** `src/services/subscriptionService.ts` line 195-202

**Find:**
```typescript
export const saveSubscription = (subscription: UserSubscription): void => {
    // PERSISTENCE: We save the full state (tier, credits) locally for instant hydration.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscription));

    // NOTIFY UI: Dispatch custom event for reactive components (UsageStats)
    window.dispatchEvent(new CustomEvent('subscription-updated'));
};
```

**Replace with:**
```typescript
export const saveSubscription = (subscription: UserSubscription): void => {
    const prev = localStorage.getItem(STORAGE_KEY);
    const next = JSON.stringify(subscription);

    // Only save and notify if actually changed
    if (prev !== next) {
        localStorage.setItem(STORAGE_KEY, next);
        window.dispatchEvent(new CustomEvent('subscription-updated'));
    }
};
```

**Verification:**
```bash
grep -A 5 "export const saveSubscription" src/services/subscriptionService.ts | grep "prev !== next"
```

---

### ISSUE #11: Time Manipulation Exploit

**Files:** `src/services/subscriptionService.ts`, `src/services/serverTimeService.ts`
**Problem:** Resets use device time, user can manipulate
**Impact:** Free users can reset limits by changing date

#### STEP 11.1: Check if Server Time Service Exists

**Run:**
```bash
cat src/services/serverTimeService.ts
```

**If it has `getServerTime()` function, proceed. Otherwise skip this fix.**

#### STEP 11.2: Use Server Time for Resets

**Location:** `src/services/subscriptionService.ts` line 208-217

**Find:**
```typescript
// Reset daily counter if needed
const lastReset = new Date(subscription.lastOperationReset);
const now = new Date();
if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth()) {
    subscription.operationsToday = 0;
    subscription.lastOperationReset = now.toISOString();
    saveSubscription(subscription);
}
```

**Replace with:**
```typescript
// Reset daily counter if needed (using server time to prevent manipulation)
const lastReset = new Date(subscription.lastOperationReset);
const now = new Date(); // TODO: Replace with server time when available
// const now = await getServerTime(); // Requires making function async

if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth()) {
    subscription.operationsToday = 0;
    subscription.lastOperationReset = now.toISOString();
    saveSubscription(subscription);
}
```

**Note:** Full fix requires making `canPerformOperation` async. For now, add TODO comment.

**Verification:**
```bash
grep -n "TODO.*server time" src/services/subscriptionService.ts
```

---

### ISSUE #12: Client ID Hardcoded

**Files:** `src/screens/LoginScreen.tsx`, `src/screens/GoogleAuthCallback.tsx`
**Problem:** OAuth client ID hardcoded in source
**Impact:** Harder to manage multiple environments

#### STEP 12.1: Add to Config Service

**Location:** `src/services/configService.ts` line 30-39

**Find:**
```typescript
export const Config: AppConfig = {
    VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL'),
    VITE_SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY'),
    VITE_AG_PROTOCOL_SIGNATURE: getEnvVar('VITE_AG_PROTOCOL_SIGNATURE'),
    VITE_AG_API_URL: import.meta.env.PROD
        ? 'https://pdf-tools-pro-indol.vercel.app'
        : 'http://localhost:3000',
    VITE_ADMIN_UIDS: (import.meta.env.VITE_ADMIN_UIDS || '').split(',').filter(Boolean),
    IS_PRODUCTION: import.meta.env.PROD
};
```

**Replace with:**
```typescript
export const Config: AppConfig = {
    VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL'),
    VITE_SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY'),
    VITE_AG_PROTOCOL_SIGNATURE: getEnvVar('VITE_AG_PROTOCOL_SIGNATURE'),
    VITE_AG_API_URL: import.meta.env.PROD
        ? 'https://pdf-tools-pro-indol.vercel.app'
        : 'http://localhost:3000',
    VITE_ADMIN_UIDS: (import.meta.env.VITE_ADMIN_UIDS || '').split(',').filter(Boolean),
    IS_PRODUCTION: import.meta.env.PROD,
    GOOGLE_OAUTH_CLIENT_ID: getEnvVar(
        'VITE_GOOGLE_OAUTH_CLIENT_ID',
        '577377406590-9jl373159h9a2bgr3i6fbngv18ndjf75.apps.googleusercontent.com'
    )
};
```

**Update interface:**
```typescript
interface AppConfig {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    VITE_AG_PROTOCOL_SIGNATURE: string;
    VITE_AG_API_URL: string;
    VITE_ADMIN_UIDS: string[];
    IS_PRODUCTION: boolean;
    GOOGLE_OAUTH_CLIENT_ID: string; // ADD THIS
}
```

#### STEP 12.2: Use Config in LoginScreen

**Location:** `src/screens/LoginScreen.tsx` line 30

**Find:**
```typescript
const clientId = '577377406590-9jl373159h9a2bgr3i6fbngv18ndjf75.apps.googleusercontent.com';
```

**Replace with:**
```typescript
import Config from '@/services/configService';

const clientId = Config.GOOGLE_OAUTH_CLIENT_ID;
```

#### STEP 12.3: Use Config in GoogleAuthCallback

**Location:** `src/screens/GoogleAuthCallback.tsx` line 51

**Find:**
```typescript
client_id: '577377406590-9jl373159h9a2bgr3i6fbngv18ndjf75.apps.googleusercontent.com',
```

**Replace with:**
```typescript
import Config from '@/services/configService';

client_id: Config.GOOGLE_OAUTH_CLIENT_ID,
```

**Verification:**
```bash
grep -n "GOOGLE_OAUTH_CLIENT_ID" src/services/configService.ts
grep -n "Config.GOOGLE_OAUTH_CLIENT_ID" src/screens/LoginScreen.tsx
grep -n "Config.GOOGLE_OAUTH_CLIENT_ID" src/screens/GoogleAuthCallback.tsx
```

---

## ✅ FINAL VERIFICATION

After completing ALL fixes, run these verification commands:

### Build Test
```bash
npm run build
```
**Expected:** No TypeScript errors

### Grep Verifications
```bash
# Issue #1: ReaderScreen
grep -c "canUseAI(AiOperationType.HEAVY)" src/screens/ReaderScreen.tsx
# Expected: 4

# Issue #2: Retry queue
grep -c "FAILED_SYNCS_KEY" src/services/usageService.ts
# Expected: 5+

# Issue #3: Queue before verify
grep -B 2 "verifyPurchaseOnServer" src/services/billingService.ts | grep -c "addToPendingQueue"
# Expected: 3 (for 3 purchase functions)

# Issue #4: Event listeners (should be close)
echo "addEventListener: $(grep -r 'addEventListener' src/ | wc -l)"
echo "removeEventListener: $(grep -r 'removeEventListener' src/ | wc -l)"

# Issue #6: Debug panel conditional
grep -c "IS_PRODUCTION.*DebugLogPanel" src/App.tsx
# Expected: 2+

# Issue #10: Change detection
grep -c "prev !== next" src/services/subscriptionService.ts
# Expected: 1

# Issue #12: Config usage
grep -c "Config.GOOGLE_OAUTH_CLIENT_ID" src/screens/LoginScreen.tsx
# Expected: 1
```

---

## 📋 REPORT FORMAT

After completing each priority level, report using this format:

```markdown
## P0 (Critical) - COMPLETE
✅ Issue #1: ReaderScreen AI Credit Bypasses
   - All 4 functions now have canUseAI checks
   - Build successful
   - Verification passed

## P1 (High) - COMPLETE
✅ Issue #2: Silent Sync Failures
   - Retry queue implemented
   - Offline notifications added
   - Verified with grep

✅ Issue #3: Credits Not Appearing
   - Queue moved before verification in all 3 functions
   - Verified with grep

## P2 (Medium) - COMPLETE
✅ Issue #4: Memory Leaks
   - Fixed 11 files
   - addEventListener count: X
   - removeEventListener count: Y

✅ Issue #5: localStorage Corruption
   - Recovery function added
   - Verified

✅ Issue #6: Debug Panel
   - Conditional import added
   - Production build verified

✅ Issue #7: Credit Reset UX
   - Loading state added
   - Tested

## P3 (Low) - COMPLETE
✅ Issue #9: Silent Auth Failures
   - Error alert added

✅ Issue #10: Unnecessary Re-renders
   - Change detection added

✅ Issue #11: Time Manipulation
   - TODO comment added (async refactor needed)

✅ Issue #12: Client ID
   - Moved to Config
   - All files updated

## FINAL BUILD
✅ npm run build: SUCCESS
✅ All verifications passed
```

---

## ⚠️ IMPORTANT NOTES

1. **DO NOT skip issues** - Fix in order P0 → P1 → P2 → P3
2. **Verify after each issue** using the provided grep commands
3. **Test build after each priority level** with `npm run build`
4. **Report progress** after completing each priority level
5. **If any issue fails**, stop and report the error immediately

---

## 🎯 SUCCESS CRITERIA

All 12 issues must show:
- ✅ Code changes complete
- ✅ Verification commands pass
- ✅ Build succeeds with no errors
- ✅ No new TypeScript errors introduced

**Estimated Total Time:** 4-6 hours
**Complexity:** Medium (mostly straightforward fixes)
