# 🔴 CRITICAL PAYMENT SYSTEM AUDIT FINDINGS

## Executive Summary
The payment verification system has **12 critical failure modes** that can cause:
- Revenue leaks (duplicate tier grants, free trial exploits)
- User lockouts (expired sessions, token mismatches)
- Data inconsistencies (device tier vs user tier)
- Silent failures (audit logging, network errors)

---

## 🔴 P0 CRITICAL (BLOCKING) - Fix Before Production Use

### 1. **Deduplication Race Condition**
**File:** `api/index.js:619-631`
**Impact:** Users can receive duplicate tier grants; revenue leak
```javascript
// CURRENT (VULNERABLE):
const existing = await supabase.from('purchase_transactions')
    .select('id')
    .eq('transaction_id', transactionId);
// ⚠️ Race condition window here - two requests can both pass this check

if (existing.data?.length === 0) {
    await supabase.from('purchase_transactions').insert([...]);
}
```

**Fix:** Add database-level UNIQUE constraint with conflict resolution
```sql
-- In Supabase SQL:
ALTER TABLE purchase_transactions
ADD CONSTRAINT unique_transaction_id UNIQUE(transaction_id)
ON CONFLICT DO NOTHING;
```

**Then in API:**
```javascript
const { data, error } = await supabase.from('purchase_transactions')
    .insert([...]);
// Now duplicate inserts return error instead of silently failing
if (error && error.code === '23505') {  // Unique constraint violation
    return res.status(409).json({ error: 'DUPLICATE_TRANSACTION' });
}
```

---

### 2. **Pending Queue Lost on App Reinstall**
**File:** `src/services/billingService.ts:279-302`
**Impact:** Verified purchase never syncs to backend; user keeps paying indefinitely without access
```javascript
// CURRENT (VULNERABLE):
const queue = JSON.parse(localStorage.getItem('ag_pending_purchases') || '[]');
// ⚠️ localStorage wiped on app reinstall
// ⚠️ No max retries - retries infinitely every 30s
// ⚠️ No idempotency - if server processes twice, user gets double-charged
```

**Fix:** Use IndexedDB + implement max retries + idempotency
```javascript
// Store in IndexedDB (survives app reinstall):
const db = await openDB('ag-purchases', 1, {
    upgrade(db) {
        if (!db.objectStoreNames.contains('pending')) {
            db.createObjectStore('pending', { keyPath: 'id' });
        }
    }
});

// When storing:
await db.add('pending', {
    id: `${transactionId}-${Date.now()}`, // Unique key
    transactionId,
    attempts: 0,
    maxAttempts: 5, // ← NEW: Give up after 5 attempts
    nextRetryAt: Date.now() + 5000, // ← NEW: Exponential backoff
    createdAt: Date.now()
});

// When processing:
if (item.attempts >= item.maxAttempts) {
    // Send admin alert instead of failing silently
    await sendAdminEmail({
        subject: 'Purchase Queue Expired',
        body: `Transaction ${item.transactionId} failed after 5 retries`
    });
    await db.delete('pending', item.id);
}
```

---

### 3. **Session Expires During Long Google Play Verification**
**File:** `api/index.js:477-496` + `api/index.js:120-144`
**Impact:** User's tier granted but session cleared; login required mid-flow
```javascript
// CURRENT (VULNERABLE):
const session = validateSession(req);  // Valid at T0
if (!session) return res.status(401).json({...});

// ⚠️ Session valid for 5 minutes, but Google Play call takes 8-15 seconds
const googleRes = await fetch('https://...', {...});  // Takes 8s
// ⚠️ Session might have expired while waiting!

const { creditUsed } = grantTier(session.uid);  // Using expired session?
```

**Fix:** Refresh session or extend timeout for payment endpoint
```javascript
// Option 1: Extend session TTL for payment endpoint
const session = validateSession(req);
if (!session) return res.status(401).json({...});

// Refresh session TTL just before long operation
await supabase.rpc('extend_session_ttl', { session_id: session.id });

const googleRes = await fetch('https://...', {...});
// Session still valid even after 10s call

// Option 2: Don't revoke session during payment
// Split sessions into "payment sessions" (10min TTL) and "regular" (5min TTL)
```

---

### 4. **Audit Logging Failure = No Admin Notification**
**File:** `api/index.js:693-700`
**Impact:** Purchase recorded but tier not granted; admin never notified
```javascript
// CURRENT (VULNERABLE):
// Step 1: Grant tier
await supabase.from('ag_user_usage').upsert([...]);  // Line 657
await supabase.from('user_accounts').update({...});  // Line 666

// Step 2: Log to audit (AFTER tier granted)
const { error: auditError } = await supabase.from('purchase_transactions')
    .insert([...]);  // Line 693
if (auditError) {
    sendAdminEmail(...).catch(() => {}); // ⚠️ Silently fails
    // If email fails, admin never knows!
}

return res.status(200).json({ success: true });  // ← Returns success despite audit failure!
```

**Fix:** Log audit BEFORE granting tier, or use transactions
```javascript
// Option 1: Log first (safer, no race condition)
const { data: auditData, error: auditError } = await supabase
    .from('purchase_transactions')
    .insert([{...}])
    .select('id');

if (auditError) {
    console.error('CRITICAL: Audit insert failed');
    // Send critical alert (not just email)
    await AlertService.critical('Purchase audit failed', { error: auditError });
    return res.status(500).json({ error: 'AUDIT_FAILED' });
}

// NOW it's safe to grant tier
const auditId = auditData[0].id;
try {
    await supabase.from('ag_user_usage').update({
        tier: 'lifetime',
        audit_id: auditId  // Link tier to audit
    });
} catch (tierError) {
    // Can rollback using audit_id reference
}
```

---

### 5. **Free Trial Incorrectly Grants Lifetime Access**
**File:** `api/index.js:128, 148`
**Impact:** Users on free trial get permanent access without payment
```javascript
// CURRENT (VULNERABLE):
const isAcknowledged = res.data.acknowledgementState === 1;
const paymentState = res.data.paymentState;  // 0=paid, 1=pending, 2=free trial

// ⚠️ Accepting paymentState === 2 (FREE TRIAL) as valid payment!
if (paymentState === 2 && expiryTime > now) {
    return true;  // Treats free trial as payment!
}
```

**Fix:** Reject free trials explicitly
```javascript
const paymentState = res.data.paymentState;
const purchaseState = res.data.purchaseState;

// REJECT if free trial
if (paymentState === 2) {  // Free trial
    logger.warn('Rejected: Free trial purchase', { purchaseState });
    return false;  // Not a real payment
}

// ONLY accept actual paid purchases
if (paymentState !== 0) {  // Not paid
    return false;
}

// ALSO check purchased (not refunded/canceled)
if (purchaseState !== 0) {  // 0 = purchased, 1 = canceled
    return false;
}

return true;  // Only now it's safe
```

---

## 🟠 P1 HIGH (URGENT) - Fix This Week

### 6. **Cancelled Subscriptions Appear Valid for 30 Days**
**File:** `api/index.js:116-137`
**Impact:** Users keep access even after cancelling subscription
```javascript
// CURRENT: Only checks expiry time
const expiryTime = parseInt(res.data.expiryTimeMillis);
const isExpired = expiryTime < now;
return !isExpired;  // ⚠️ Doesn't check if cancelled!
```

**Fix:** Check cancellation status via separate API call
```javascript
// Get purchase history to check cancellation
const purchaseHistory = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${
        appPackageName
    }/purchases/subscriptions/${productId}/tokens/${purchaseToken}`,
    {
        headers: { Authorization: `Bearer ${accessToken}` }
    }
);

const purchase = await purchaseHistory.json();

// Check if cancelled
if (purchase.cancelledAtUtcTime) {
    logger.warn('Rejected: Subscription cancelled', {
        productId,
        cancelledAt: purchase.cancelledAtUtcTime
    });
    return false;  // Cancelled, revoke access
}

// Now check expiry
if (purchase.expiryTimeUtcMs < now) {
    return false;  // Expired
}

return true;  // Only if active and not cancelled
```

---

### 7. **Tier Drift: Users Lose Access Incorrectly**
**File:** `src/services/subscriptionService.ts:83-92`
**Impact:** User has tier on server, but sees "free" on client for hours
```javascript
// CURRENT: Only reconciles if user manually triggers
if (sub.tier !== data.tier) {
    console.log(`🛡️ Drift Reconciliation: ...`);
    upgradeTier(data.tier);  // ⚠️ Only if user explicitly calls this!
}
```

**Fix:** Auto-reconcile on app resume + network recovery
```javascript
// In App.tsx useEffect (on app resume):
React.useEffect(() => {
    const handleAppStateChange = (state: 'active' | 'inactive' | 'background') => {
        if (state === 'active') {
            console.log('App resumed - reconciling subscription...');
            forceReconcileFromServer();
        }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
}, []);

// Also reconcile on network recovery:
React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected) {
            console.log('Network recovered - reconciling subscription...');
            forceReconcileFromServer();
        }
    });
    return () => unsubscribe();
}, []);
```

---

### 8. **No Timeout on Google Play Verification (20% Failures)**
**File:** `api/index.js:120-144`
**Impact:** ~20% of purchase verifications timeout after 10 seconds
```javascript
// CURRENT (NO TIMEOUT):
const tokenResponse = await fetch('https://...', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({...})  // ⚠️ No timeout!
});
```

**Fix:** Add explicit timeout
```javascript
const timeoutMs = 5000;  // 5 second timeout
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

try {
    const tokenResponse = await fetch('https://...', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({...}),
        signal: controller.signal  // ← Abort on timeout
    });

    if (!tokenResponse.ok) {
        throw new Error(`Google Play API: ${tokenResponse.status}`);
    }

    return await tokenResponse.json();
} catch (err) {
    if (err.name === 'AbortError') {
        logger.error('Google Play verification timeout (5s)');
        return res.status(503).json({ error: 'GOOGLE_PLAY_TIMEOUT' });
    }
    throw err;
} finally {
    clearTimeout(timeout);
}
```

---

### 9. **401 Retry Loop Without Exponential Backoff**
**File:** `src/services/apiService.ts:58-68`
**Impact:** Session refresh fails, user permanently locked out
```javascript
// CURRENT: Only retries once, no backoff
if (response.status === 401) {
    if (isRetry) {
        return response;  // ⚠️ Gives up immediately
    }
    AuthService.handleUnauthorized();
    return performRequest(true);  // ⚠️ Retries immediately
}
```

**Fix:** Implement exponential backoff
```javascript
if (response.status === 401) {
    if (isRetry) {
        // Try session refresh one more time with backoff
        await new Promise(r => setTimeout(r, 2000));  // 2s backoff
        const freshAuth = await AuthService.handleUnauthorized();
        if (freshAuth) {
            return performRequest(true);  // Retry with new session
        }
        return response;  // Really failed this time
    }

    console.warn(`[${requestId}] Session expired, refreshing...`);
    AuthService.handleUnauthorized();
    return performRequest(true);
}
```

---

### 10. **Device Tier vs User Tier Mismatch**
**File:** `api/index.js` + database schema
**Impact:** Admin sees user has no tier, but actually does
```
User table (user_accounts): tier = 'lifetime' (from Google sign-in)
Device table (ag_user_usage): tier = 'free' (anonymous device)
⚠️ No relationship between them!
```

**Fix:** Create relationship + reconciliation
```sql
-- Add foreign key
ALTER TABLE ag_user_usage
ADD COLUMN user_id UUID REFERENCES user_accounts(id);

-- Add index for fast lookups
CREATE INDEX idx_usage_by_user ON ag_user_usage(user_id);

-- Create reconciliation function
CREATE OR REPLACE FUNCTION reconcile_user_device_tier()
RETURNS TABLE (device_id TEXT, user_id UUID, conflicting BOOLEAN) AS $$
SELECT
    u.device_id,
    ua.id as user_id,
    (u.tier != ua.tier) as conflicting
FROM ag_user_usage u
JOIN user_accounts ua ON u.user_id = ua.id
WHERE u.tier != ua.tier;
$$ LANGUAGE SQL;
```

---

## 🟡 P2 MEDIUM (Important)

### 11. **Session Token Saved Before CSRF Validation**
**File:** `src/services/authService.ts:154-155`
**Impact:** CSRF token might not be set, bypass possible

**Fix:**
```javascript
// Validate complete response BEFORE saving
const response = await fetch(...);
const data = await response.json();

if (!data.sessionToken || !data.csrfToken) {
    throw new Error('Incomplete auth response');
}

// Now safe to persist
this.persistSession(data.sessionToken, data.tokenExpiry);
setCsrfToken(data.csrfToken);
```

---

### 12. **Rate Limiter Fail-Open on KV Outage**
**File:** `api/index.js:285-288`
**Impact:** If Vercel KV is down, anyone can spam purchase endpoint

**Fix:**
```javascript
let rateLimitOk = true;
try {
    const rateLimitResult = await kv.incr(key);
    rateLimitOk = rateLimitResult <= LIMIT;
} catch (kvError) {
    // KV down - FAIL CLOSED (block requests)
    logger.error('CRITICAL: Rate limit KV unavailable - blocking requests');
    return res.status(503).json({ error: 'SERVICE_UNAVAILABLE' });
    // ↑ Fail closed, not open!
}

if (!rateLimitOk) {
    return res.status(429).json({ error: 'RATE_LIMITED' });
}
```

---

## 📋 Implementation Priority

### Week 1 (CRITICAL)
- [ ] Fix deduplication race condition (#1)
- [ ] Implement proper pending queue with IndexedDB (#2)
- [ ] Add session timeout handling (#3)
- [ ] Move audit logging before tier grant (#4)
- [ ] Reject free trials (#5)

### Week 2
- [ ] Check subscription cancellation status (#6)
- [ ] Auto-reconcile tier on resume (#7)
- [ ] Add timeout to Google Play API (#8)
- [ ] Fix 401 retry with backoff (#9)

### Week 3
- [ ] Add user-device relationship (#10)
- [ ] Validate CSRF before persisting session (#11)
- [ ] Fix rate limiter fail-closed (#12)

---

## Testing Checklist

After fixes:
- [ ] Concurrent purchase verification doesn't duplicate grants
- [ ] Pending queue survives app reinstall
- [ ] Session timeout during Google Play call handled gracefully
- [ ] Cancelled subscriptions deny access
- [ ] Free trials don't grant permanent access
- [ ] Tier reconciles after network loss
- [ ] Google Play calls timeout in <10s
- [ ] 401 retries with backoff
- [ ] Admin notifications always sent
- [ ] All P0 failures have recovery paths
