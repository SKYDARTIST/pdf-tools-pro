# 🔒 SECURITY FIX GUIDE FOR GEMINI AI

**Objective:** Fix 2 critical security vulnerabilities in the Anti-Gravity app
**Estimated Time:** 1-2 hours
**Difficulty:** Medium

---

## ⚠️ CRITICAL ISSUES TO FIX

1. **Issue #1:** HMAC secret exposed in client-side code
2. **Issue #2:** Client-side request signing (allows signature forgery)

---

## 📋 STEP-BY-STEP INSTRUCTIONS

### STEP 1: Remove Client-Side HMAC Secret

**File:** `services/configService.ts`

**Current Code (INSECURE):**
```typescript
export const Config: AppConfig = {
    VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL'),
    VITE_SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY'),
    VITE_AG_PROTOCOL_SIGNATURE: getEnvVar('VITE_AG_PROTOCOL_SIGNATURE'), // ❌ EXPOSED SECRET
    VITE_AG_API_URL: import.meta.env.PROD
        ? 'https://pdf-tools-pro-indol.vercel.app'
        : 'http://localhost:3000',
    IS_PRODUCTION: import.meta.env.PROD
};
```

**New Code (SECURE):**
```typescript
export const Config: AppConfig = {
    VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL'),
    VITE_SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY'),
    // REMOVED: VITE_AG_PROTOCOL_SIGNATURE (moved to server-side only)
    VITE_AG_API_URL: import.meta.env.PROD
        ? 'https://pdf-tools-pro-indol.vercel.app'
        : 'http://localhost:3000',
    IS_PRODUCTION: import.meta.env.PROD
};
```

**Also update the interface:**
```typescript
interface AppConfig {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    // REMOVED: VITE_AG_PROTOCOL_SIGNATURE: string;
    VITE_AG_API_URL: string;
    IS_PRODUCTION: boolean;
}
```

**Action:** Make these changes and report completion.

---

### STEP 2: Update authService.ts to Remove Signature Usage

**File:** `services/authService.ts`

**Current Code (Line 83):**
```typescript
const signature = Config.VITE_AG_PROTOCOL_SIGNATURE;
```

**New Code:**
```typescript
const signature = import.meta.env.VITE_AG_PROTOCOL_SIGNATURE || '';
```

**Explanation:** Session init still needs the signature, but we'll get it directly from environment (not from Config object).

**Action:** Make this change and report completion.

---

### STEP 3: Remove Client-Side HMAC Signing from Billing Service

**File:** `services/billingService.ts`

**Find the function `signRequest()` (around line 655-676)**

**Current Code (INSECURE):**
```typescript
private async signRequest(data: any): Promise<string> {
    const payload = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(payload);

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
```

**New Code (SECURE):**
```typescript
private async signRequest(data: any): Promise<string> {
    // CLIENT-SIDE SIGNING REMOVED FOR SECURITY
    // Server will validate request using its own secret
    // Return empty string - server will handle signature verification
    console.log('Anti-Gravity Billing: Request will be verified server-side');
    return '';
}
```

**Explanation:** We're removing client-side signing entirely. The server already has proper validation.

**Action:** Make this change and report completion.

---

### STEP 4: Update Purchase Verification Calls

**File:** `services/billingService.ts`

**Find the function `verifyPurchaseOnServer()` (around line 537-585)**

**Current Code (around line 546-553):**
```typescript
const signature = await this.signRequest({
    purchaseToken,
    productId,
    transactionId,
    deviceId,
    timestamp
});
```

**New Code:**
```typescript
// Generate signature using environment variable directly (server will verify)
const signature = import.meta.env.VITE_AG_PROTOCOL_SIGNATURE || '';
```

**Explanation:** We're using the env var directly instead of client-side signing. Server validates this.

**Action:** Make this change and report completion.

---

### STEP 5: Verify Server-Side Validation is Intact

**File:** `api/index.js`

**Check that lines 509-527 still have proper server-side validation:**

```javascript
// Line 509-527 (approximate)
const clientSignature = req.headers['x-ag-signature'];
const clientTimestamp = parseInt(req.headers['x-ag-timestamp']);
const now = Date.now();

const hmacSecret = process.env.AG_PROTOCOL_SIGNATURE;

if (!clientTimestamp || Math.abs(now - clientTimestamp) > 300000) {
    console.warn(`🛡️ Anti-Gravity Security: Expired request from ${maskDeviceId(deviceId)}`);
    return res.status(401).json({ error: 'REQUEST_EXPIRED' });
}

const bodyToSign = JSON.stringify({ purchaseToken, productId, transactionId, deviceId, timestamp });
const expectedSignature = crypto.createHmac('sha256', hmacSecret).update(bodyToSign).digest('hex');

if (clientSignature !== expectedSignature) {
    console.warn(`🛡️ Anti-Gravity Security: HMAC Mismatch for ${maskDeviceId(deviceId)}`);
    return res.status(401).json({ error: 'INVALID_SIGNATURE' });
}
```

**Action:** READ the file and CONFIRM this code is present. Report findings.

---

### STEP 6: Test Build

**Run these commands:**

```bash
cd /Users/cryptobulla/BUILD/pdf-tools-pro
npm run build
```

**Expected Result:** Build should succeed without errors

**Action:** Run build and report any errors. If errors occur, read the error messages and attempt to fix them.

---

### STEP 7: Search for Remaining References

**Search for any remaining usage of the removed secret:**

```bash
grep -r "VITE_AG_PROTOCOL_SIGNATURE" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" services/ components/ screens/
```

**Expected Result:** Should only find:
- `authService.ts` (using import.meta.env directly)
- `billingService.ts` (using import.meta.env directly)

**Action:** Run search and report all findings. If there are unexpected matches, investigate and fix.

---

### STEP 8: Verify Environment Variables are Set

**Check Vercel environment variables:**

The following must be set in Vercel (server-side only):
- `AG_PROTOCOL_SIGNATURE` (server-side)
- `VITE_AG_PROTOCOL_SIGNATURE` (client-side - for session_init only)

**Note:** These should be DIFFERENT values:
- `AG_PROTOCOL_SIGNATURE`: Server-only secret (strong, never exposed)
- `VITE_AG_PROTOCOL_SIGNATURE`: Client-visible (less critical, only for session handshake)

**Action:** Confirm these are different values. Report status.

---

## ✅ FINAL CHECKLIST

After completing all steps, verify:

- [ ] `configService.ts` no longer exports `VITE_AG_PROTOCOL_SIGNATURE`
- [ ] `billingService.ts` no longer signs requests client-side
- [ ] `authService.ts` uses `import.meta.env` directly
- [ ] Build completes successfully
- [ ] No unexpected references to removed config
- [ ] Server-side validation code is intact in `api/index.js`

---

## 📊 REPORTING FORMAT

After EACH step, report using this format:

```
STEP X: [COMPLETED/FAILED]
Changes Made:
- [List specific changes]
Files Modified:
- [List file paths]
Errors Encountered:
- [None / List errors]
Next Step Ready: [YES/NO]
```

---

## 🚨 IF YOU ENCOUNTER ERRORS

1. **Build errors:** Read the error message carefully, identify which file/line is causing it
2. **TypeScript errors:** Check if you need to update type definitions
3. **Import errors:** Make sure you haven't broken any import statements

Report the error verbatim and wait for guidance.

---

## 🎯 SUCCESS CRITERIA

When all steps are complete:
1. No HMAC secret in client bundle
2. Client doesn't sign its own requests
3. Server still validates all requests properly
4. Build succeeds without errors
5. App functions normally (test purchase flow)

---

**START WITH STEP 1 AND REPORT AFTER COMPLETION**
