# Proper Testing Guide - Credit Protection & CORS Fixes

## Overview

This guide ensures you test the deployed fixes correctly, not the old local build.

---

## 🔴 CRITICAL: Test on Production Build, NOT Localhost!

**Your console errors show you're testing on `localhost`** which has OLD code.

The fixes are deployed to: `https://pdf-tools-pro-indol.vercel.app`

---

## ✅ STEP 1: Build Android App with Latest Code

```bash
cd /Users/cryptobulla/.gemini/antigravity/scratch/Projects/pdf-tools-pro

# Ensure you're on latest commit
git pull origin main

# Verify latest commit
git log -1 --oneline
# Should show: 1c82f52 Fix CORS: Allow X-Request-ID header

# Rebuild with latest code
npm run build

# Sync to Android (with Node.js v22)
nvm use 22
npx cap sync android

# Open in Android Studio
npx cap open android
```

---

## ✅ STEP 2: Build Release APK

In Android Studio:
1. **Build** → **Generate Signed Bundle / APK**
2. Select **APK**
3. Choose your keystore (or create if first time)
4. Build type: **Release** or **Debug**
5. Wait for build to complete
6. Install APK on device:
   ```bash
   adb install app/build/outputs/apk/release/app-release.apk
   ```

---

## ✅ STEP 3: Test CORS Fix

### 3.1: Open App on Android Device

1. Install and open the app
2. Navigate to **Neural Hub**
3. Upload or select a PDF

**Expected Result**:
- ✅ PDF loads successfully
- ✅ No errors in console (if debugging)
- ✅ App is fast and responsive

**If PDF still fails**:
- Check you're using the APK built in Step 1-2
- NOT the old build from before deployment
- Check console (use `adb logcat`) for errors

---

### 3.2: Test AI Tools

1. Go to any AI feature (Ask AI, Summary, etc.)
2. Make a request

**Expected Result**:
- ✅ AI responds within 2-5 seconds
- ✅ No "BACKEND_ERROR" messages
- ✅ No "Failed to fetch" errors

---

## ✅ STEP 4: Test Uninstall Recovery (CRITICAL)

**⚠️ IMPORTANT**: You MUST be logged in with Google for recovery to work!

### 4.1: Setup (Do on SAME day)

1. **Open app on Android device**
2. **Login with Google** (if not already)
   - Tap profile icon
   - Select "Login with Google"
   - Complete auth flow
   - **VERIFY you see your Google email/avatar in app**

3. **Use 2 AI credits** (not all 3)
   - Make 2 AI requests (Ask AI, Summary, etc.)
   - Verify counter shows: "2/3 used" or similar
   - **IMPORTANT**: Remember this exact value!

4. **Wait 10 seconds**
   - This ensures sync completes
   - Look for console message: "Syncing usage to server..."
   - If using `adb logcat`, confirm sync success

5. **Note the values**:
   - Daily usage: ___/3
   - AI Pack credits (if any): ___
   - Current date: ___________

### 4.2: Uninstall

1. Uninstall app from device
2. **Wait 5 seconds**

### 4.3: Reinstall & Verify

1. Reinstall app (same APK from Step 2)
2. Open app
3. **Login with SAME Google account**
4. Check usage counter

**Expected Results**:

**If SAME day as test**:
- ✅ Counter shows: "2/3 used" (same as before)
- ✅ AI Pack credits restored (if any)
- ✅ Message: "Synchronized with Supabase"

**If NEXT day** (daily reset):
- ✅ Counter shows: "0/3 used" (fresh daily limit)
- ✅ AI Pack credits restored (if any)
- ✅ This is CORRECT behavior!

**If shows "0/3" AND it's the SAME day**:
- ❌ Recovery failed
- Possible reasons:
  - Not logged in with Google
  - Sync didn't complete before uninstall
  - Different Google account used
  - Testing on localhost build (old code)

---

## ✅ STEP 5: Test Credit Protection (No Deduction on Failure)

### 5.1: Test Network Failure

1. Note current credits (e.g., "1/3 used")
2. **Turn off WiFi and mobile data**
3. Try to make AI request
4. App should show error: "Network request failed" or similar

**Expected**:
- ✅ Error message shown
- ✅ Credits UNCHANGED (still "1/3 used")
- ✅ No credit deducted

5. Turn network back on
6. Verify credits still unchanged

### 5.2: Test Server Error (Rate Limit)

1. Note current credits
2. Make 6+ AI requests rapidly (trigger rate limit)
3. Last request should fail with: "AI_RATE_LIMIT" or "429" error

**Expected**:
- ✅ First 5 requests succeed (credits deducted)
- ✅ 6th request fails with rate limit error
- ✅ NO credit deducted for 6th request
- ✅ Credits only deducted for successful requests

---

## ✅ STEP 6: Verify Sync-Before-Deduct

**This is hard to test directly, but verify it's happening:**

### Check Console Logs (via adb logcat)

```bash
adb logcat | grep "Syncing usage"
```

**Expected output** when making AI request:
```
Anti-Gravity Billing: Syncing usage to server... (BEFORE deduction)
AI Usage: Pre-deduction Sync Failed: ... (or success)
AI Usage: HEAVY operation - AI Pack Credit consumed. X remaining.
```

**Order should be**:
1. Sync current state to server
2. Deduct credit locally
3. Sync updated state to server

---

## 🧪 Test Results Report Template

After completing all tests, fill this out:

```
TESTING REPORT - Credit Protection & CORS Fixes

Build Information:
- Commit hash: 1c82f52
- Build date: ___________
- APK type: [Debug / Release]
- Tested on: [Device model]
- Android version: ___________

Test 1: CORS Fix (PDF Loading):
- PDF loads in Neural Hub: [YES / NO]
- App fast/responsive: [YES / NO]
- AI tools work: [YES / NO]
- Console errors: [NONE / List errors]

Test 2: Uninstall Recovery:
- Logged in with Google: [YES / NO]
- Google account: ___________@gmail.com
- Usage before uninstall: ___/3 used
- Date of test: ___________
- Usage after reinstall: ___/3 used
- Recovery successful: [YES / NO / NOT APPLICABLE - NEW DAY]

Test 3: Credit Protection (Network Failure):
- Credits before: ___/3
- Turned off network: [YES]
- Error shown: [YES / NO]
- Credits after: ___/3
- Credits unchanged: [YES / NO]

Test 4: Credit Protection (Rate Limit):
- Made 6+ rapid requests: [YES]
- First 5 succeeded: [YES / NO]
- 6th request failed: [YES / NO]
- Credits for failed request: [DEDUCTED / NOT DEDUCTED]

Test 5: Sync-Before-Deduct:
- Checked logs: [YES / NO]
- Sync message appeared: [YES / NO]
- Order correct (sync → deduct → sync): [YES / NO]

Overall Status: [ALL PASS / PARTIAL / FAILED]

Issues Found:
___________________________________________
___________________________________________
```

---

## 🆘 Common Mistakes

### Mistake 1: Testing on localhost
**Problem**: localhost uses old code without fixes
**Solution**: Build APK from latest code and test on device

### Mistake 2: Not logged in with Google
**Problem**: Recovery only works for authenticated users
**Solution**: Login with Google before uninstall test

### Mistake 3: Testing on different day
**Problem**: Daily limit resets at midnight (correct behavior)
**Solution**: Do uninstall/reinstall test within same day

### Mistake 4: Not waiting for sync
**Problem**: Uninstalling immediately after usage
**Solution**: Wait 10 seconds after using credits before uninstalling

### Mistake 5: Using different Google account
**Problem**: Reinstalling and logging in with different account
**Solution**: Use EXACT same Google account

---

## ✅ Success Criteria

All fixes working when:
- ✅ PDF loads in Neural Hub (no CORS errors)
- ✅ AI tools respond quickly
- ✅ App is fast and responsive
- ✅ Credits recover after uninstall (SAME day, SAME account)
- ✅ Credits NOT deducted on network failure
- ✅ Credits NOT deducted on rate limit errors
- ✅ Logout smooth (no black screen)
- ✅ Pull to refresh instant

---

**Follow this guide exactly to get accurate test results!**
