# Gemini - Complete Remaining 2 Issues

## Overview
You have 2 remaining issues to fix. Both are straightforward.

**Estimated Time:** 15 minutes
**Priority:** P2 (Medium) + P3 (Low)

---

## Issue #5: localStorage Corruption Recovery (P2 - MEDIUM)

### Problem
If localStorage data gets corrupted (invalid JSON), the app crashes when trying to read subscription data.

### File to Edit
`src/services/subscriptionService.ts`

### What to Do

1. Find the `loadSubscription()` function (around line 100-120)
2. Wrap the `JSON.parse()` call in a try-catch block
3. If parsing fails, return a default FREE tier subscription instead of crashing

### Code to Add

Find this pattern:
```typescript
export const loadSubscription = (): UserSubscription => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
        return createDefaultSubscription();
    }
    return JSON.parse(data);  // ← This can crash if data is corrupted
};
```

Replace with:
```typescript
export const loadSubscription = (): UserSubscription => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
        return createDefaultSubscription();
    }

    try {
        const parsed = JSON.parse(data);
        return parsed;
    } catch (error) {
        console.error('Anti-Gravity: Corrupted subscription data detected, resetting to default', error);
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEY);
        // Return fresh default subscription
        return createDefaultSubscription();
    }
};
```

### Verification
Run this command to verify the fix:
```bash
grep -A 10 "loadSubscription" src/services/subscriptionService.ts | grep -c "try.*catch"
```
Expected output: `1` (or higher)

---

## Issue #12: Client ID Hardcoding (P3 - LOW)

### Problem
GoogleAuthCallback.tsx has a hardcoded Google OAuth client ID instead of using the centralized Config service.

### File to Edit
`src/screens/GoogleAuthCallback.tsx`

### What to Do

1. Import Config at the top of the file (should already be there)
2. Find line 51 where the client_id is hardcoded
3. Replace the hardcoded string with `Config.GOOGLE_OAUTH_CLIENT_ID`

### Code Change

**Line 51 - Current (WRONG):**
```typescript
client_id: '577377406590-9jl373159h9a2bgr3i6fbngv18ndjf75.apps.googleusercontent.com',
```

**Line 51 - Fixed (CORRECT):**
```typescript
client_id: Config.GOOGLE_OAUTH_CLIENT_ID,
```

### Make Sure Config is Imported

Check the top of the file has this import (around line 1-10):
```typescript
import Config from '@/services/configService';
```

If it's not there, add it.

### Verification
Run this command to verify the fix:
```bash
grep -n "Config.GOOGLE_OAUTH_CLIENT_ID" src/screens/GoogleAuthCallback.tsx
```
Expected output: Should show line 51 (or nearby) with `Config.GOOGLE_OAUTH_CLIENT_ID`

Also verify the hardcoded client ID is gone:
```bash
grep -c "577377406590-9jl373159h9a2bgr3i6fbngv18ndjf75" src/screens/GoogleAuthCallback.tsx
```
Expected output: `0` (none found)

---

## Final Verification

After completing both fixes, run this verification script:

```bash
#!/bin/bash
echo "=== FINAL VERIFICATION ==="
echo ""
echo "Issue #5: localStorage Corruption Recovery"
grep -A 10 "loadSubscription" src/services/subscriptionService.ts | grep -c "try.*catch"
echo ""
echo "Issue #12: Client ID (should show Config usage)"
grep -n "Config.GOOGLE_OAUTH_CLIENT_ID" src/screens/GoogleAuthCallback.tsx
echo ""
echo "Issue #12: Hardcoded ID (should be 0)"
grep -c "577377406590-9jl373159h9a2bgr3i6fbngv18ndjf75" src/screens/GoogleAuthCallback.tsx
echo ""
echo "=== DONE ==="
```

Expected results:
- Issue #5: Shows `1` or higher
- Issue #12 Config usage: Shows line number (around 51)
- Issue #12 Hardcoded: Shows `0`

---

## Summary

1. **Issue #5**: Add try-catch around JSON.parse in loadSubscription()
2. **Issue #12**: Replace hardcoded client_id with Config.GOOGLE_OAUTH_CLIENT_ID

Both fixes are simple one-liners that improve code maintainability and prevent crashes.

**IMPORTANT:** Do NOT make any other changes. Only fix these 2 specific issues.
