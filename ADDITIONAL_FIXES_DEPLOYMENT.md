# Additional Fixes Deployment Guide

## Overview

Gemini identified 2 additional bugs we missed:
1. **CORS fix incomplete** - Only fixed `api/index.js`, not `api/_utils/auth.js`
2. **PDF Worker path broken** - Incorrect path for Capacitor Android

Both have been fixed locally and need deployment.

---

## Files Modified

1. **api/_utils/auth.js** (line 60)
   - Added `x-request-id` to CORS headers
   - Fixes subscription endpoint CORS errors

2. **src/screens/ReaderScreen.tsx** (lines 22-23, 73)
   - Fixed PDF worker path
   - Changed from `window.location.origin + '/pdf.worker.mjs'`
   - To: `'/pdf.worker.min.mjs'`

---

## Deployment Steps

### STEP 1: Verify Changes

```bash
cd /Users/cryptobulla/.gemini/antigravity/scratch/Projects/pdf-tools-pro

# Check auth.js has x-request-id
grep -n "x-request-id" api/_utils/auth.js
# Should show: line 60 with x-request-id

# Check ReaderScreen.tsx has correct worker path
grep -n "pdf.worker.min.mjs" src/screens/ReaderScreen.tsx
# Should show: lines 23 and 73
```

**✅ Report**: Both files show correct changes? (Yes/No)

---

### STEP 2: Git Commit

```bash
# Stage changes
git add api/_utils/auth.js
git add src/screens/ReaderScreen.tsx

# Review changes
git diff --staged

# Commit
git commit -m "Fix: Add x-request-id to subscription endpoint CORS + Fix PDF worker path

- Added x-request-id to auth.js CORS headers (fixes subscription API errors)
- Fixed PDF worker path for Capacitor Android compatibility
- Changes to ReaderScreen.tsx worker configuration

Fixes:
- CORS errors on /api/user/subscription endpoint
- PDF 404 errors in Neural Hub
- PDF viewer not loading on Android

Credits: Gemini identified these issues"
```

**✅ Report**: Commit created? Commit hash: ___________

---

### STEP 3: Push to Production

```bash
git push origin main
```

**✅ Report**:
- Push successful? (Yes/No)
- Vercel deployment triggered? (Yes/No)

---

### STEP 4: Wait for Deployment

Monitor Vercel dashboard:
- URL: https://vercel.com/
- Project: pdf-tools-pro
- Watch deployment status: Building → Ready

**Expected time**: 1-2 minutes

**✅ Report**:
- Deployment status: (Ready/Failed)
- Production URL: https://pdf-tools-pro-indol.vercel.app

---

### STEP 5: Rebuild Android App

**IMPORTANT**: Must rebuild with latest code!

```bash
# Ensure on latest
git pull origin main

# Rebuild
npm run build

# Sync to Android
nvm use 22
npx cap sync android

# Open Android Studio
npx cap open android
```

**In Android Studio**:
1. Build → Clean Project
2. Build → Rebuild Project
3. Build APK (Debug or Release)
4. Install on device

**✅ Report**:
- Build successful? (Yes/No)
- APK created? (Yes/No)
- Installed on device? (Yes/No)

---

### STEP 6: Test PDF Loading

**Test on Android device**:

1. Open app
2. Go to Neural Hub
3. Upload or select a PDF
4. Go to "View" tab

**Expected Result**:
- ✅ PDF loads and displays correctly
- ✅ No 404 errors in console
- ✅ Can zoom in/out
- ✅ Can navigate pages

**If using adb logcat**:
```bash
adb logcat | grep -i "pdf.worker"
```

Should NOT show:
- ❌ "404 Not Found"
- ❌ "Failed to load pdf.worker"

**✅ Report**:
- PDF loads? (Yes/No)
- PDF displays correctly? (Yes/No)
- Console errors? (None / List)

---

### STEP 7: Test Subscription Endpoint CORS

**Test on Android device**:

1. Open app
2. Make an AI request (any AI tool)
3. Check if it works

**Expected Result**:
- ✅ AI request succeeds
- ✅ No CORS errors in console
- ✅ Credits deducted correctly

**Using adb logcat**:
```bash
adb logcat | grep -i "cors"
```

Should NOT show:
- ❌ "blocked by CORS policy"
- ❌ "x-request-id is not allowed"

**✅ Report**:
- AI requests work? (Yes/No)
- CORS errors? (None / List)
- Credits work correctly? (Yes/No)

---

### STEP 8: Retest All Previous Issues

Now retest the 3 original issues from the PDF report:

#### Issue 1: Splash Screen Slow
**Test**: Open app, time how long on splash
**Expected**: <2 seconds (should be faster now)

**✅ Report**:
- Time on splash: ___ seconds
- Faster than before? (Yes/No)

#### Issue 2: Uninstall Recovery
**Requirements**:
- Must be logged in with Google
- Must test on SAME day
- Must use SAME Google account

**Test**:
1. Login with Google
2. Use 2 AI credits
3. Wait 10 seconds
4. Uninstall
5. Reinstall
6. Login with SAME account
7. Check usage

**Expected**: Shows 2/3 used (if same day)

**✅ Report**:
- Logged in with Google? (Yes/No)
- Google account: ___________
- Usage before: ___/3
- Usage after: ___/3
- Recovery successful? (Yes/No)

#### Issue 3: PDF Loading
**Test**: Already tested in Step 6

**✅ Report**: PDF loads correctly? (Yes/No)

---

## Summary Report Template

```
ADDITIONAL FIXES DEPLOYMENT REPORT

Date: ___________
Commit hash: ___________

Files Modified:
- api/_utils/auth.js (CORS fix)
- src/screens/ReaderScreen.tsx (PDF worker fix)

Deployment:
- Pushed to production: [YES/NO]
- Vercel deployed: [YES/NO]
- Android APK rebuilt: [YES/NO]

Test Results:
- PDF loading: [WORKING/BROKEN]
- CORS errors: [GONE/STILL PRESENT]
- Subscription endpoint: [WORKING/BROKEN]
- Splash screen speed: [IMPROVED/SAME/WORSE]
- Uninstall recovery: [WORKING/NOT TESTED/BROKEN]

Original Issues Status:
1. Splash screen slow: [FIXED/IMPROVED/NOT FIXED]
2. Credits reset on uninstall: [FIXED/NOT FIXED/NOT TESTED]
3. PDF not loading: [FIXED/NOT FIXED]

Overall Status: [ALL FIXED/PARTIAL/STILL BROKEN]

Notes:
_______________________________________
_______________________________________
```

---

## Expected Outcomes

After these fixes:
- ✅ PDF loads in Neural Hub (worker path correct)
- ✅ CORS errors eliminated (all endpoints fixed)
- ✅ Subscription endpoint works (auth.js updated)
- ✅ App faster (fewer failed requests)
- ✅ All AI tools functional

---

## Important Notes

1. **Must rebuild Android app** - The PDF worker fix is frontend code
2. **Must test on device** - Not localhost
3. **Must login with Google** - For uninstall recovery test
4. **Test on same day** - Daily limits reset at midnight

---

**Follow each step and report results!**
