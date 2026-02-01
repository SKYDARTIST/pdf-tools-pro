# 🚀 START HERE - Fix Instructions for Gemini

## What You Need to Fix

Your PDF Tools Pro Android app has **2 critical bugs**:

1. **Credits disappear when user uninstalls the app**
2. **Credits are deducted even when AI requests fail**

---

## 📋 Files You'll Receive

1. **GEMINI_FIX_GUIDE.md** ← Main guide with detailed steps
2. **PROGRESS_TRACKER.md** ← Checklist to track your progress
3. **START_HERE.md** ← This file

---

## 🎯 How to Use This Guide

### Step 1: Read the Main Guide
Open `GEMINI_FIX_GUIDE.md` and read the "Overview" section to understand both issues.

### Step 2: Follow Steps in Order
- Start with **ISSUE 1** (Steps 1.1 through 1.4)
- Then do **ISSUE 2** (Steps 2.1 through 2.8)
- **Do NOT skip steps** - each builds on the previous

### Step 3: Report After Each Step
After completing each step, you MUST report:
- ✅ What you did
- 📝 What you found
- ⚠️ Any errors or issues
- 📍 File names and line numbers

### Step 4: Track Progress
Use `PROGRESS_TRACKER.md` to check off completed steps.

### Step 5: Test Everything
After all code changes, run the 4 final tests in the guide.

---

## ⚡ Quick Summary

### Issue 1 Fix (4 steps)
**Goal**: Make credits sync to server BEFORE deducting locally

**Files to modify**:
- `src/services/subscriptionService.ts` (main fix)

**Key change**:
```javascript
// Before deducting, sync to server first
await syncUsageToServer(subscription);
subscription.aiPackCredits -= 1;
```

---

### Issue 2 Fix (8 steps)
**Goal**: Only deduct credits when AI request succeeds

**Files to modify**:
- `src/services/aiService.ts` (standardize error format)
- `src/screens/AntiGravityWorkspace.tsx` (add success check)
- `src/screens/QuickToolsScreen.tsx` (if exists)
- Any other screens calling AI functions

**Key change**:
```javascript
const response = await askGemini(prompt);

// NEW: Check success first
if (response.success) {
  await recordAIUsage(); // Only deduct on success
} else {
  Alert.alert('Failed', response.error); // Show error, no deduction
}
```

---

## 🔴 IMPORTANT RULES

1. **Report after EVERY step** - Don't batch multiple steps
2. **Don't skip steps** - Even if you think you know the answer
3. **Copy actual code** - Show what you changed with line numbers
4. **Test compilation** - After major changes, run `npm run build`
5. **Ask if stuck** - Provide error message, file, and line number

---

## 📊 Success Criteria

You're done when:
- ✅ All steps in both issues completed
- ✅ Code compiles without errors
- ✅ All 4 final tests pass
- ✅ Final report submitted

---

## 🆘 If You See Errors

**Don't panic!** Just report:
1. Which step you're on (e.g., "Step 2.5")
2. Full error message (copy/paste)
3. File and line number
4. What you were trying to do

Common fixes are in the "DEBUGGING TIPS" section of the main guide.

---

## 📞 Ready to Start?

1. Open `GEMINI_FIX_GUIDE.md`
2. Start with "STEP 1.1"
3. Report back when done

**Good luck!** 🚀

---

## 📁 Project Location

All files are in:
```
/Users/cryptobulla/.gemini/antigravity/scratch/Projects/pdf-tools-pro/
```

Main source files are in `/src/` directory.
