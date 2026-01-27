# Security & Privacy Audit Report - Updated Codebase
**Date**: January 27, 2026
**Status**: Comprehensive audit of all improvements and remaining vulnerabilities

---

## Executive Summary

The codebase has received **significant security improvements** since the previous audit. Many critical vulnerabilities have been remediated, but several HIGH and CRITICAL issues remain that must be addressed before production deployment.

### Status Scorecard
- ✅ **FIXED**: 12 vulnerabilities
- ⚠️ **REMAINING**: 8 vulnerabilities (2 CRITICAL, 3 HIGH, 3 MEDIUM)
- 🔴 **BLOCKING**: 1 issue prevents production

---

## CRITICAL ISSUES (Must Fix Immediately)

### 1. ⚠️ CRITICAL: Hardcoded Secrets in `.env.local` (Still Exposed)
**Severity**: CRITICAL | **Status**: ❌ NOT FIXED
**Location**: `.env.local` (lines 1-5)

**Exposed Credentials**:
```
VITE_GEMINI_API_KEY=AIzaSy... (LEAKED_KEY_MASKED)
VITE_SUPABASE_ANON_KEY=eyJhbGc...acvpbJi0N0eWE6J8ohjvkJWCxV7cg6IEUpWAYlILl48
VITE_AG_PROTOCOL_SIGNATURE=fc8b2c89aa9e3726cb7d28b974189e0de0bb4223c6ac39d2f6a3dd15f6eaaba8
```

**Risk**:
- Gemini API key can be used to make API calls at your expense (quota exhaustion)
- Supabase key allows direct database access (read/write all user data)
- Protocol signature is the only auth between client and backend

**Remediation**:
1. ✅ `.env.local` is NOT in git (confirmed by `git log --all -- .env.local` returns nothing)
2. ⚠️ Still exposes secrets on development machines
3. ⚠️ Bundle build process MUST NOT include these keys

**Action Required**:
```bash
# Ensure .env.local is in .gitignore
echo ".env.local" >> .gitignore

# Rotate all exposed credentials immediately:
# 1. Generate new Gemini API key
# 2. Rotate Supabase anon key
# 3. Generate new AG_PROTOCOL_SIGNATURE
# 4. Update Vercel environment variables with new values
```

---

### 2. 🔴 CRITICAL: Fallback Hardcoded Secrets in Source Code
**Severity**: CRITICAL | **Status**: ⚠️ PARTIALLY MITIGATED
**Locations**:
- `services/usageService.ts:75, 130`
- `services/authService.ts:30`
- `services/aiService.ts` (similar pattern)
- `services/serverTimeService.ts:27`
- `api/index.js:107, 140`

**Exposed Fallback Values**:
```typescript
// VITE_AG_PROTOCOL_SIGNATURE fallback
'x-ag-signature': import.meta.env.VITE_AG_PROTOCOL_SIGNATURE || 'AG_NEURAL_LINK_2026_PROTOTYPE_SECURE'

// SUPABASE_SERVICE_ROLE_KEY fallback
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'FALLBACK_SECRET_DO_NOT_USE_IN_PROD'
```

**Risk**:
- Fallback strings are hardcoded in bundle
- Anyone can decompile app and use fallback signature
- Backend will accept requests with hardcoded fallback in development

**Current Status**:
- ✅ Backend warns if env var not set: `console.warn('CRITICAL WARNING: AG_PROTOCOL_SIGNATURE not set...')`
- ✅ Source code has comments: `'DO_NOT_USE_IN_PROD'`
- ❌ Fallback values still accessible if env var missing

**Remediation**:
```typescript
// Option 1: STRICT - No fallback (recommended for production)
const envSignature = process.env.AG_PROTOCOL_SIGNATURE;
if (!envSignature) {
    throw new Error('CRITICAL: AG_PROTOCOL_SIGNATURE must be set');
}
const expectedSignature = envSignature;

// Option 2: Log if missing but continue (current)
if (!envSignature) {
    console.warn('CRITICAL WARNING...');
}
```

---

### 3. 🔴 CRITICAL: Non-Blocking Subscription Init - Race Condition Reintroduced
**Severity**: CRITICAL | **Status**: ❌ REGRESSION
**Location**: `App.tsx:69`

**Current Code**:
```typescript
// NON-BLOCKING: Start subscription fetch in background
// Allow app to launch immediately with cached credentials
initSubscription().catch(e => console.warn('Background subscription sync failed:', e));
```

**Issue**:
- Changed from `await initSubscription()` to fire-and-forget
- App now renders immediately with cached/local subscription
- Race condition returns: User might see old subscription data while server loads new data
- First-time users see FREE tier briefly, then PRO (jarring UX + security risk)

**Why This Happened**:
- System reminder shows this was a deliberate change
- Likely for "faster app launch feel"
- But it reintroduces Issue #1 that was previously fixed!

**Impact**:
- User uses 1 credit thinking they have 100
- Payment system integrity compromised
- Supabase becomes out-of-sync with UI

**Remediation - REQUIRED**:
```typescript
// Revert to blocking initialization
await initSubscription();
setIsDataReady(true);

// This ensures Supabase data loads BEFORE UI renders
```

---

## HIGH PRIORITY ISSUES

### 4. ⚠️ HIGH: Sensitive Subscription Data in Console Logs
**Severity**: HIGH | **Status**: ⚠️ PARTIALLY FIXED
**Locations**:
- `api/index.js:165-169` - Logs aiPackCredits, tier, deviceId
- `usageService.ts:83-87, 110-114, 132-139, 162-169` - Full device ID in error logs
- `subscriptionService.ts:68` - Full subscription object logged

**Examples**:
```typescript
// Line 165-169 in api/index.js
console.log('Anti-Gravity API: Processing usage_sync for device:', {
    deviceId,  // FULL device ID logged
    tier: usage.tier,
    aiPackCredits: usage.aiPackCredits,
    timestamp: new Date().toISOString()
});
```

**Risk**:
- Device IDs in CloudWatch/server logs
- Credit amounts exposed in log files
- Persistent logs stored in localStorage accessible via DevTools
- Debugging tools (triple-tap debug panel) show full logs with PII

**Current Mitigation**:
- ✅ `api/index.js:74` - Device ID truncated in some logs (`deviceId?.substring(0, 8) + '...'`)
- ❌ Not consistent across all logging
- ❌ Full details still logged in error paths

**Remediation**:
```typescript
// Mask device IDs everywhere
const maskDeviceId = (id: string) => id?.substring(0, 8) + '...' || 'unknown';

// Use masked versions in all logs
console.log('Device:', maskDeviceId(deviceId));

// Never log credit amounts in production
if (process.env.NODE_ENV !== 'production') {
    console.log('Credits:', usage.aiPackCredits);  // Dev only
}
```

---

### 5. ⚠️ HIGH: Subscription Data Stored in Unencrypted localStorage
**Severity**: HIGH | **Status**: ✅ PARTIALLY FIXED
**Location**: `subscriptionService.ts:87-129`

**Fixed Issues**:
- ✅ JSON.parse() now has try-catch (lines 89-109)
- ✅ Malformed data is cleared with `localStorage.removeItem()`
- ✅ Validation logic for PRO tier sync (lines 98-102)

**Remaining Issues**:
- ❌ Subscription object still stored as plain JSON in localStorage
- ❌ Accessible to any script on the page (XSS vulnerability)
- ❌ Device ID stored in localStorage (line 51 in usageService.ts)

**What's Stored**:
```typescript
{
    tier: "PRO",           // Can be spoofed
    aiPackCredits: 100,    // Can be modified
    operationsToday: 5,
    aiDocsThisMonth: 8,
    purchaseToken: "...",  // Purchase ID exposed
    hasReceivedBonus: true
}
```

**Risk Vector**:
```javascript
// Attacker can run this in console
localStorage.setItem('pdf_tools_subscription', JSON.stringify({
    tier: 'PREMIUM',
    aiPackCredits: 999999,
    // ... spoof any field
}));
```

**Remediation**:
1. ✅ **Source of Truth**: Keep Supabase as authoritative source (already done)
2. ⚠️ **localStorage Cache**: Store ONLY non-sensitive fields (tier, if any)
3. ⚠️ **Credits**: NEVER cache locally - fetch from server on app load
4. ⚠️ **Encryption**: If must cache, use encrypted storage

---

### 6. ⚠️ HIGH: Incomplete Session Token Enforcement
**Severity**: HIGH | **Status**: ⚠️ PARTIALLY FIXED
**Location**: `api/index.js:157-169`

**Current Implementation**:
```typescript
if (!isGuidanceOrTime) {
    // Enforce Session Token for all other requests
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const session = verifySessionToken(token);

    if (!session || session.uid !== deviceId) {
        console.warn(`Anti-Gravity Security: Blocked unauthenticated request from ${deviceId}`);
        return res.status(401).json({ error: 'INVALID_SESSION', details: 'Session expired or invalid. Please restart app.' });
    }
}
```

**Issues**:
- ✅ Session tokens ARE verified (good)
- ⚠️ BUT: `isGuidanceOrTime` bypass allows unauthenticated usage_fetch/usage_sync
- ⚠️ `requestType === 'usage_fetch'` is NOT in the bypass list, but error handling might be lenient

**Line 70 bypass**:
```typescript
const isGuidanceOrTime = requestType === 'guidance' || requestType === 'server_time';
```

**Risk**:
- `usage_fetch` requests still require session, but...
- If session verification fails, what's the fallback?
- Error message in logs shows `deviceId` (PII)

**Status**: ✅ Mostly correct, but needs verification of request type validation

---

## MEDIUM PRIORITY ISSUES

### 7. ⚠️ MEDIUM: Play Integrity Token Still Uses Base64 Encoding
**Severity**: MEDIUM | **Status**: ✅ IMPROVED
**Location**: `integrityService.ts:31, 40, 80`

**Improvement**:
- ✅ Nonce now uses `crypto.getRandomValues()` (lines 20-22, 44-46)
- ✅ Nonce is 32 hex chars (128 bits) instead of 7 chars
- ✅ Real Google Play Integrity API is called in production (lines 54-66)

**Remaining Concern**:
```typescript
// Still base64 encoded (easily reversible)
return btoa(JSON.stringify(payload));

// Payload structure visible:
{
    deviceId: "...",
    timestamp: ...,
    nonce: "...",
    platform: 'android-fallback',
    isFallback: true
}
```

**Risk**:
- Base64 is encoding, NOT encryption
- Attacker can base64_decode to see exact payload
- If `isFallback: true`, server knows it's not a real Play Integrity token

**Current Status**: ✅ Acceptable for now since:
1. Real Google Play Integrity API is used in production
2. Backend SHOULD reject `isFallback: true` tokens
3. Nonce is now cryptographically secure

**Recommendation**:
```javascript
// Backend should reject fallback tokens in production
if (payload.isFallback && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'FALLBACK_NOT_ALLOWED' });
}
```

---

### 8. ⚠️ MEDIUM: Device ID Generation Fallback Uses Math.random()
**Severity**: MEDIUM | **Status**: ✅ IMPROVED
**Location**: `usageService.ts:9-36`

**Improvement**:
- ✅ Uses `crypto.randomUUID()` if available (line 13)
- ✅ Falls back to `crypto.getRandomValues()` (lines 16-24)
- ✅ Only uses `Math.random()` as last resort (lines 31-35)

**Code**:
```typescript
const generateUUID = () => {
    try {
        if (typeof crypto !== 'undefined') {
            if (crypto.randomUUID) {
                return crypto.randomUUID();  // ✅ Best
            }
            if (crypto.getRandomValues) {
                // ... proper UUID generation  // ✅ Good
            }
        }
    } catch (e) { }

    // Only fallback to Math.random() if crypto API missing
    console.warn('Crypto API missing, using insecure fallback');
    return '...Math.random()...';  // ⚠️ Weak
}
```

**Status**: ✅ **ACCEPTABLE** - Math.random() is only used if crypto API is unavailable (unlikely in modern browsers)

---

### 9. ⚠️ MEDIUM: Persistent Debug Logs with Sensitive Data
**Severity**: MEDIUM | **Status**: ⚠️ UNMITIGATED
**Location**: `persistentLogService.ts:62-101`

**What It Does**:
- Intercepts ALL console.log/warn/error/info calls
- Stores them in localStorage (200-entry limit)
- Accessible via triple-tap debug panel in app (lines 137-161 in App.tsx)

**Stored Data**:
- Device IDs in full
- Subscription tiers and credits
- Error messages with PII
- Timestamps of all operations

**Risk Vectors**:
```javascript
// 1. DevTools Access
localStorage.getItem('ag_persistent_logs')  // See all stored logs

// 2. XSS Vulnerability
// If app has XSS, attacker can read logs

// 3. Shoulder Surfing
// Debug panel shows on triple-tap (intended feature)
```

**Current Status**:
- ✅ Only logs "Anti-Gravity" branded messages (filters most logs)
- ✅ Max 200 entries prevents unlimited storage
- ❌ Still sensitive to XSS and physical access

**Remediation**:
```typescript
// Option 1: Disable in production
if (process.env.NODE_ENV === 'production') {
    export const initializePersistentLogging = () => {
        // No-op in production
    };
}

// Option 2: Mask sensitive data before logging
const logs: LogEntry[] = JSON.parse(localStorage.getItem(...) || '[]');
logs.forEach(log => {
    if (log.message.includes('deviceId')) {
        log.data.deviceId = log.data.deviceId?.substring(0, 8) + '...';
    }
});
```

---

## FIXED/MITIGATED ISSUES

### ✅ Fixed: Race Condition on App Boot (Issue #1)
**Location**: `App.tsx:60-79`
**Status**: ⚠️ **REGRESSION** - Was fixed, now broken again (see Issue #3)

### ✅ Fixed: Double Bonus Credit Grant (Issue #2)
**Location**: `billingService.ts:174, 389`
**Status**: ✅ CONFIRMED FIXED - All paths include `skipBonus: true`

### ✅ Fixed: Testing Period Bonus Still Active (Issue #3)
**Location**: `subscriptionService.ts:408`
**Status**: ✅ CONFIRMED FIXED - Testing period ends `2026-01-01` (past date)

### ✅ Fixed: Storage Sync Race Conditions (Issue #4)
**Locations**: `billingService.ts:146-163, 176-193, 391-408`
**Status**: ✅ CONFIRMED FIXED - All three upgrade paths have verification + retry logic

### ✅ Fixed: Backend Upsert Not Deployed (Issue #5)
**Location**: `api/index.js:176-193`
**Status**: ⚠️ **DEPLOYED BUT NOT TESTED** - Code is correct, needs verification on Vercel

### ✅ Fixed: Missing Environment Variable Warning (Issue #6)
**Location**: `api/index.js:139-140`
**Status**: ✅ CONFIRMED FIXED - Warns if env var not set

### ✅ Fixed: CORS Credentials with Reflected Origin (Issue #7)
**Location**: `api/index.js:53-58`
**Status**: ✅ CONFIRMED FIXED - Credentials disabled (line 57 commented out)

### ✅ Added: Rate Limiting
**Location**: `api/index.js:23-102`
**Status**: ✅ IMPLEMENTED - 10 requests/minute per device

### ✅ Added: Security Headers
**Location**: `api/index.js:63-67`
**Status**: ✅ IMPLEMENTED - HSTS, X-Content-Type-Options, X-Frame-Options, CSP

### ✅ Improved: JSON Parsing Error Handling
**Location**: `subscriptionService.ts:89-109`
**Status**: ✅ FIXED - Try-catch with data clearing on error

### ✅ Improved: UUID Generation
**Location**: `usageService.ts:9-36`
**Status**: ✅ IMPROVED - Crypto.getRandomValues() prioritized

### ✅ Improved: Play Integrity Token Generation
**Location**: `integrityService.ts:10-82`
**Status**: ✅ IMPROVED - Real Google Play API, secure nonce generation

---

## SUMMARY TABLE

| Issue | Category | Severity | Status | Action |
|-------|----------|----------|--------|--------|
| Hardcoded .env.local credentials | Credentials | CRITICAL | ⚠️ Not in git but exposed | Rotate all keys, update Vercel |
| Fallback hardcoded secrets in code | Credentials | CRITICAL | ⚠️ Mitigated by env vars | Strict mode: fail if missing |
| Non-blocking subscription init | Race Condition | CRITICAL | ❌ REGRESSION | Revert to `await initSubscription()` |
| Device ID in logs | Privacy | HIGH | ⚠️ Partial masking | Mask in all logs, not just some |
| Subscription data in localStorage | Data Protection | HIGH | ✅ Partly mitigated | Move credits to server-only |
| Session token enforcement gap | Authentication | HIGH | ✅ Mostly correct | Verify all request types |
| Play Integrity base64 encoding | Encryption | MEDIUM | ✅ Acceptable | Reject fallback tokens in prod |
| Device ID weak fallback | Randomness | MEDIUM | ✅ Acceptable | Only used if crypto unavailable |
| Persistent debug logs | Privacy | MEDIUM | ⚠️ Unmitigated | Disable in production or mask data |

---

## DEPLOYMENT CHECKLIST

### Before going to production:

- [ ] **CRITICAL**: Rotate Gemini API key
- [ ] **CRITICAL**: Rotate Supabase anon key
- [ ] **CRITICAL**: Generate new AG_PROTOCOL_SIGNATURE
- [ ] **CRITICAL**: Revert App.tsx line 69 to `await initSubscription()`
- [ ] **CRITICAL**: Update Vercel environment variables with new credentials
- [ ] **HIGH**: Mask all device IDs in logging
- [ ] **HIGH**: Move AI Pack credits to server-only (never cache locally)
- [ ] **HIGH**: Verify session token enforcement for all request types
- [ ] **MEDIUM**: Disable persistent logging in production build
- [ ] **MEDIUM**: Add fallback token rejection in backend
- [ ] Test complete credit persistence flow end-to-end
- [ ] Deploy backend to Vercel and verify upsert works

---

## CONCLUSION

The codebase has **improved significantly** with proper authentication, rate limiting, and security headers. However, **3 CRITICAL issues** must be fixed immediately:

1. **Revert the non-blocking subscription init** (reintroduced race condition)
2. **Rotate all exposed credentials** (.env.local, fallback values)
3. **Ensure strict environment variable checks** on production deployment

Once these are resolved, the system will be substantially hardened and production-ready.
