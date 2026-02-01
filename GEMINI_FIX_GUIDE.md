# PDF Tools Pro - Bug Fix Guide for Gemini

## Overview
You need to fix 2 critical bugs in the PDF Tools Pro Android app:
1. **Credits reset when app is uninstalled**
2. **Credits deducted even when AI requests fail**

Follow each step carefully and **REPORT BACK** after completing each step.

---

## 🔴 ISSUE 1: Credits Reset on Uninstall

### Problem Explanation
- Credits are stored in `localStorage` (browser storage)
- When user uninstalls the app → `localStorage` is deleted → credits are lost
- Supabase backup exists but sync might be incomplete

### Solution Strategy
Change the sync order: **Always sync to server BEFORE deducting credits locally**

---

### STEP 1.1: Read the Current Code

**File to read**: `src/services/subscriptionService.ts`

**What to look for**: Find the `recordAIUsage()` function (around line 393-481)

**Task**: Read the file and identify these lines:
- Where credits are deducted: `subscription.aiPackCredits -= 1`
- Where it saves to localStorage: `saveSubscription(subscription)`
- Where it syncs to server: `syncUsageToServer(subscription)`

**✅ REPORT BACK**:
- Confirm you found the function
- Copy the current order of operations (deduct → save → sync)
- Note the line numbers

---

### STEP 1.2: Check Sync Function

**File to read**: `src/services/usageService.ts`

**What to look for**: Find `syncUsageToServer()` function (around line 66-133)

**Task**: Verify this function:
- Returns a Promise (can be awaited)
- Has error handling (try/catch)
- Actually sends data to Supabase

**✅ REPORT BACK**:
- Confirm the function signature: `async function syncUsageToServer(...)`
- Confirm it returns success/failure status
- If you see any obvious bugs in the sync logic, report them

---

### STEP 1.3: Modify recordAIUsage() Function

**File to edit**: `src/services/subscriptionService.ts`

**Current code** (around line 418-481):
```javascript
// Current (WRONG order):
subscription.aiPackCredits -= 1;  // Deduct first
saveSubscription(subscription);   // Save locally
syncUsageToServer(subscription).catch(err => ...);  // Sync in background (can fail)
```

**Change to**:
```javascript
// New (CORRECT order):
try {
  // 1. Sync CURRENT state to server first (before deducting)
  await syncUsageToServer(subscription);

  // 2. Then deduct credit
  subscription.aiPackCredits -= 1;

  // 3. Save locally
  saveSubscription(subscription);

  // 4. Sync UPDATED state to server
  await syncUsageToServer(subscription);

} catch (syncError) {
  console.error('Failed to sync before deducting credit:', syncError);

  // Still deduct locally but warn user
  subscription.aiPackCredits -= 1;
  saveSubscription(subscription);

  // Add to failed sync queue for retry
  addFailedSync(subscription);
}
```

**Important Notes**:
- Change line ~478 from `.catch(err => ...)` to `await` inside try/catch
- This ensures sync happens BEFORE deduction
- If sync fails, still allow offline mode but queue for retry

**✅ REPORT BACK**:
- Confirm you made the changes
- Show the modified code block (lines you changed)
- Note any TypeScript errors or warnings

---

### STEP 1.4: Test Step 1.3 Changes

**Manual Test**:
1. Build the app: `npm run build`
2. Check for compilation errors
3. If errors found, report them immediately

**✅ REPORT BACK**:
- Did it compile successfully? (Yes/No)
- Any TypeScript errors?
- Any warnings about async/await?

---

## 🔴 ISSUE 2: Credits Deducted on Failed Requests

### Problem Explanation
- Credits deducted immediately when user clicks button
- If network fails or server errors → credit is gone but no result given
- No refund mechanism exists

### Solution Strategy
**Only deduct credits AFTER successful API response**

---

### STEP 2.1: Identify Where Credits Are Deducted

**Files to search**:
- `src/screens/AntiGravityWorkspace.tsx`
- `src/screens/QuickToolsScreen.tsx`
- Any other screen that calls AI functions

**What to look for**:
- Calls to `recordAIUsage()`
- Calls to `askGemini()` or similar AI functions
- Check which happens first

**Search command**:
```bash
grep -n "recordAIUsage" src/screens/*.tsx
grep -n "askGemini" src/screens/*.tsx
```

**✅ REPORT BACK**:
- List all files that call `recordAIUsage()`
- For each file, report: does it call `recordAIUsage()` BEFORE or AFTER the AI API call?
- Copy the relevant code sections with line numbers

---

### STEP 2.2: Read AntiGravityWorkspace.tsx (Main Example)

**File to read**: `src/screens/AntiGravityWorkspace.tsx`

**What to look for**: Find the main AI request handler (around line 105-130)

**Expected to find**:
```javascript
// Line ~105-117: Make API call
const response = await askGemini(prompt);

// Line ~126: THEN deduct credit
await recordAIUsage();
```

**✅ REPORT BACK**:
- Confirm the current order: API call → deduct credit
- Copy the exact function name that handles AI requests
- Note the line numbers

---

### STEP 2.3: Add Success Check Before Deducting

**File to edit**: `src/screens/AntiGravityWorkspace.tsx`

**Current code** (around line 105-130):
```javascript
const response = await askGemini(prompt);
// ... some code ...
await recordAIUsage();  // Deducts credit regardless of response
```

**Change to**:
```javascript
const response = await askGemini(prompt);

// NEW: Check if request was successful
if (!response || response.error) {
  // API failed - DON'T deduct credit
  console.error('AI request failed, credit NOT deducted:', response?.error);

  // Show error to user but don't deduct
  Alert.alert(
    'Request Failed',
    'Your AI credit was not used. Please try again.',
    [{text: 'OK'}]
  );

  return; // Exit early
}

// Only deduct if successful
await recordAIUsage();
```

**Important**:
- Add this check BEFORE `recordAIUsage()` is called
- Check what `askGemini()` returns on error (might be `null`, `{error: ...}`, or throws exception)
- Adjust the condition based on actual error response format

**✅ REPORT BACK**:
- What does `askGemini()` return on success vs error? (check its implementation in `src/services/aiService.ts`)
- Show the modified code
- Did you add the success check before ALL calls to `recordAIUsage()`?

---

### STEP 2.4: Check AI Service Error Handling

**File to read**: `src/services/aiService.ts`

**What to look for**: Find the `askGemini()` or main AI request function (around line 25-72)

**Task**: Understand how errors are returned
- Does it throw exceptions?
- Does it return `{success: false, error: ...}`?
- Does it return `null` on error?

**Expected to find** (around line 71):
```javascript
return `BACKEND_ERROR: ${details} (Access via secure edge protocol failed)`;
```

**✅ REPORT BACK**:
- What is the function signature of the main AI request function?
- How does it indicate errors? (exception, return value, or both)
- Copy the error handling code (the catch block)

---

### STEP 2.5: Standardize Error Responses

**File to edit**: `src/services/aiService.ts`

**Goal**: Make sure all error cases return a consistent format

**Current code** might have mixed return types:
- Sometimes throws Error
- Sometimes returns string with "BACKEND_ERROR:"
- Sometimes returns undefined

**Change to consistent format**:
```javascript
// At the top of the file, define error response type
interface AIResponse {
  success: boolean;
  data?: string;
  error?: string;
}

// In the main function (e.g., askGemini), change ALL return statements:

// Success case:
return {
  success: true,
  data: responseText
};

// Error cases:
catch (error) {
  console.error('AI request failed:', error);
  return {
    success: false,
    error: `Network request failed: ${error.message}`
  };
}

// Timeout case:
if (response.status === 429) {
  return {
    success: false,
    error: 'AI_RATE_LIMIT: Synapse cooling in progress...'
  };
}

// Server error case:
return {
  success: false,
  error: `BACKEND_ERROR: ${details} (Access via secure edge protocol failed)`
};
```

**✅ REPORT BACK**:
- Confirm you changed ALL return statements to use the `{success, data, error}` format
- List how many return statements you modified
- Show before/after for one example

---

### STEP 2.6: Update All Callers to Check Success

**Files to edit**: All screens that call AI functions
- `src/screens/AntiGravityWorkspace.tsx`
- `src/screens/QuickToolsScreen.tsx`
- Any others found in Step 2.1

**Pattern to apply**:
```javascript
// OLD:
const response = await askGemini(prompt);
await recordAIUsage(); // Always deducts

// NEW:
const response = await askGemini(prompt);

if (response.success) {
  // Only deduct on success
  await recordAIUsage();

  // Use the result
  processResult(response.data);
} else {
  // Show error without deducting
  Alert.alert('Request Failed', response.error || 'Unknown error');
}
```

**✅ REPORT BACK**:
- How many files did you modify?
- List each file and line numbers changed
- Confirm `recordAIUsage()` is now only called when `response.success === true`

---

### STEP 2.7: Add Refund Mechanism (Safety Net)

**File to edit**: `src/services/subscriptionService.ts`

**Add new function** (after `recordAIUsage()`):
```javascript
/**
 * Refunds an AI credit if request failed after deduction
 * Use this as a safety net if credit was deducted but operation failed
 */
export async function refundAICredit(): Promise<void> {
  const subscription = getSubscription();

  console.log('🔄 Refunding AI credit due to failed operation');

  // Add credit back
  if (subscription.aiPackCredits !== undefined) {
    subscription.aiPackCredits += 1;
  }

  // Save locally
  saveSubscription(subscription);

  // Sync to server
  try {
    await syncUsageToServer(subscription);
  } catch (error) {
    console.error('Failed to sync refund to server:', error);
    addFailedSync(subscription);
  }
}
```

**Usage** (in screens):
```javascript
try {
  await recordAIUsage(); // Pre-deduct (if using this pattern)

  const response = await askGemini(prompt);

  if (!response.success) {
    // Refund the credit
    await refundAICredit();
    throw new Error(response.error);
  }

} catch (error) {
  // Error already handled with refund
  Alert.alert('Request failed', error.message);
}
```

**Note**: This is a safety net. Ideally, use the pattern from Step 2.6 (check success BEFORE deducting).

**✅ REPORT BACK**:
- Did you add the `refundAICredit()` function?
- Show the code
- Did you export it so screens can use it?

---

### STEP 2.8: Test Step 2 Changes

**Build Test**:
```bash
npm run build
```

**✅ REPORT BACK**:
- Did it compile? (Yes/No)
- Any TypeScript errors about `response.success` or `response.error`?
- Any missing imports?

---

## 🧪 FINAL TESTING CHECKLIST

After completing all steps, test these scenarios:

### Test 1: Credit Deduction on Success
1. Open app, note current AI credits
2. Make successful AI request
3. **Expected**: Credit deducted by 1, server updated

**✅ REPORT**: Did credit deduct correctly?

---

### Test 2: No Deduction on Network Failure
1. Turn off WiFi/mobile data
2. Try to make AI request
3. **Expected**: Error message shown, credit NOT deducted

**✅ REPORT**: Was credit preserved?

---

### Test 3: No Deduction on Server Error
1. Temporarily break the API endpoint (if possible)
2. Try to make AI request
3. **Expected**: Error message shown, credit NOT deducted

**✅ REPORT**: Was credit preserved?

---

### Test 4: Uninstall/Reinstall Recovery
1. Note current credits (e.g., 50 AI credits)
2. Make sure device is online and last sync succeeded
3. Uninstall app completely
4. Reinstall app
5. Login with same Google account
6. **Expected**: Credits restored from Supabase

**✅ REPORT**: Were credits recovered? If not, what value showed?

---

## 🔍 DEBUGGING TIPS

### If credits not recovered after reinstall:
1. Check browser console for errors during `fetchUserUsage()`
2. Verify Supabase connection in Network tab
3. Check if user ID matches before/after reinstall
4. Look at `ag_user_usage` table in Supabase dashboard

### If credits deducted despite error:
1. Add `console.log('Credit deduction:', response)` before `recordAIUsage()`
2. Check if `response.success` is properly set
3. Verify error response format from API

### If sync fails:
1. Check `ag_failed_syncs` in localStorage
2. Check `syncUsageToServer()` error logs
3. Verify Supabase credentials and permissions

---

## 📊 SUCCESS CRITERIA

All fixes are successful when:

✅ Credits sync to server BEFORE local deduction
✅ Credits only deducted when AI request succeeds
✅ Failed requests show error without deducting credits
✅ Uninstall → Reinstall recovers credits from server
✅ No TypeScript compilation errors
✅ All 4 test scenarios pass

---

## 🆘 IF YOU GET STUCK

**Report this information**:
1. Which step you're on
2. Exact error message (copy full text)
3. File and line number where error occurs
4. Code snippet showing what you tried
5. Screenshot if helpful

**Common issues**:
- **"Cannot find name 'syncUsageToServer'"** → Check import at top of file
- **"Property 'success' does not exist"** → Make sure Step 2.5 is complete
- **"async function in non-async context"** → Add `async` to parent function
- **"Unhandled promise rejection"** → Add try/catch or .catch()

---

## 📝 FINAL REPORT FORMAT

After completing ALL steps, provide a summary:

```
ISSUE 1 - Credits Reset Fix:
- Modified file: src/services/subscriptionService.ts
- Changes: Added await for sync before deduction
- Test result: [PASS/FAIL]
- Notes: [any issues encountered]

ISSUE 2 - Failed Request Credit Loss:
- Modified files:
  - src/services/aiService.ts (standardized errors)
  - src/screens/AntiGravityWorkspace.tsx (added success check)
  - [list others]
- Changes: Only deduct on response.success === true
- Test results:
  - Network failure test: [PASS/FAIL]
  - Server error test: [PASS/FAIL]
- Notes: [any issues encountered]

OVERALL STATUS: [COMPLETE/PARTIAL/BLOCKED]
COMPILATION: [SUCCESS/ERRORS]
ALL TESTS PASSED: [YES/NO]
```

---

**Good luck! Follow each step carefully and report after every step.**
