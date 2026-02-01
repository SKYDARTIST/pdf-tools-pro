# ReaderScreen AI Credit Check Fix Guide

## 🎯 OBJECTIVE
Fix 3 critical AI credit bypass vulnerabilities in ReaderScreen.tsx where users can use AI features without checking if they have credits first.

---

## ✅ TIER LIMITS VERIFICATION (ALREADY CORRECT)

Current implementation matches pricing page:

| Tier | PDF Operations/Day | AI Docs/Month | Status |
|------|-------------------|---------------|--------|
| **Free** | 5 | 3 | ✅ Correct |
| **Pro** | Unlimited | 50 | ✅ Correct |
| **Lifetime** | Unlimited | Unlimited | ✅ Correct |
| **AI Pack** | N/A | 100 credits (stackable) | ✅ Correct |

**Charging Logic:**
- ✅ PDF tools charge when USED (not when downloaded)
- ✅ AI tools charge when PROCESSED (not when shared)
- ✅ Daily tasks reset at midnight
- ✅ Monthly AI docs reset on calendar month boundary

**Everything above is working correctly - DO NOT CHANGE**

---

## 🚨 PROBLEM: Missing AI Credit Checks

**Location:** `src/screens/ReaderScreen.tsx`

**Issue:** 3 functions call AI without checking `canUseAI` first. This allows users to:
- Use AI features when out of credits
- Cost you Gemini API money
- Get free AI processing

**Functions with the issue:**
1. `generateChatSummary` (line ~122)
2. `handleAsk` (line ~146)
3. `generateMindMap` (line ~164)

**Function WITHOUT the issue (USE AS TEMPLATE):**
- `generateOutline` (line ~235) ✅ Correct

---

## 🔧 FIX INSTRUCTIONS

### STEP 1: Fix `generateChatSummary` Function

**Find this code** (around line 122):

```typescript
const generateChatSummary = async (forceText?: string) => {
    if (!file || isGeneratingSummary || chatHistory.length > 0) return;
    setIsGeneratingSummary(true);
    try {
        let extractedText = forceText;
        if (!extractedText) {
            const buffer = await file.arrayBuffer();
            extractedText = await extractTextFromPdf(buffer.slice(0), undefined, undefined, (p) => setLoadProgress(p));
        }
        const context = `FILENAME: ${file.name}\nCONTENT: ${extractedText || "[SCANNED]"}`;
        setDocumentContext(context);

        const prompt = `Analyze this document and summarize it. Respond in a professional tone.`;
        const response = await askGemini(prompt, context, 'chat');
        setChatHistory([{ role: 'bot', text: response }]);
        await recordAIUsage(AiOperationType.HEAVY);
    } catch (err) {
        console.error('Summary Error:', err);
    } finally {
        setIsGeneratingSummary(false);
        setLoadProgress(0);
    }
};
```

**Replace with:**

```typescript
const generateChatSummary = async (forceText?: string) => {
    if (!file || isGeneratingSummary || chatHistory.length > 0) return;

    // AI CREDIT CHECK - Add this block
    const aiCheck = canUseAI(AiOperationType.HEAVY);
    if (!aiCheck.allowed) {
        const sub = getSubscription();
        setAiLimitInfo({
            blockMode: aiCheck.blockMode,
            used: sub.aiDocsThisMonth,
            limit: sub.tier === SubscriptionTier.FREE ? 3 : 50
        });
        setShowAiLimit(true);
        return; // STOP - user has no credits
    }

    setIsGeneratingSummary(true);
    try {
        let extractedText = forceText;
        if (!extractedText) {
            const buffer = await file.arrayBuffer();
            extractedText = await extractTextFromPdf(buffer.slice(0), undefined, undefined, (p) => setLoadProgress(p));
        }
        const context = `FILENAME: ${file.name}\nCONTENT: ${extractedText || "[SCANNED]"}`;
        setDocumentContext(context);

        const prompt = `Analyze this document and summarize it. Respond in a professional tone.`;
        const response = await askGemini(prompt, context, 'chat');
        setChatHistory([{ role: 'bot', text: response }]);
        await recordAIUsage(AiOperationType.HEAVY);
    } catch (err) {
        console.error('Summary Error:', err);
    } finally {
        setIsGeneratingSummary(false);
        setLoadProgress(0);
    }
};
```

**Verification Command:**
```bash
grep -A 25 "const generateChatSummary" src/screens/ReaderScreen.tsx | grep "canUseAI"
```
**Expected output:** Should show the `canUseAI` check

---

### STEP 2: Fix `handleAsk` Function

**Find this code** (around line 146):

```typescript
const handleAsk = async () => {
    if (!chatQuery.trim() || isAsking || !documentContext) return;
    const currentQuery = chatQuery;
    setChatQuery('');
    setChatHistory(prev => [...prev, { role: 'user', text: currentQuery }]);
    setIsAsking(true);
    try {
        const response = await askGemini(currentQuery, documentContext, 'chat');
        setChatHistory(prev => [...prev, { role: 'bot', text: response }]);
        await recordAIUsage(AiOperationType.HEAVY);
    } catch (err) {
        console.error('Chat Error:', err);
    } finally {
        setIsAsking(false);
    }
};
```

**Replace with:**

```typescript
const handleAsk = async () => {
    if (!chatQuery.trim() || isAsking || !documentContext) return;

    // AI CREDIT CHECK - Add this block
    const aiCheck = canUseAI(AiOperationType.HEAVY);
    if (!aiCheck.allowed) {
        const sub = getSubscription();
        setAiLimitInfo({
            blockMode: aiCheck.blockMode,
            used: sub.aiDocsThisMonth,
            limit: sub.tier === SubscriptionTier.FREE ? 3 : 50
        });
        setShowAiLimit(true);
        return; // STOP - user has no credits
    }

    const currentQuery = chatQuery;
    setChatQuery('');
    setChatHistory(prev => [...prev, { role: 'user', text: currentQuery }]);
    setIsAsking(true);
    try {
        const response = await askGemini(currentQuery, documentContext, 'chat');
        setChatHistory(prev => [...prev, { role: 'bot', text: response }]);
        await recordAIUsage(AiOperationType.HEAVY);
    } catch (err) {
        console.error('Chat Error:', err);
    } finally {
        setIsAsking(false);
    }
};
```

**Verification Command:**
```bash
grep -A 20 "const handleAsk" src/screens/ReaderScreen.tsx | grep "canUseAI"
```
**Expected output:** Should show the `canUseAI` check

---

### STEP 3: Fix `generateMindMap` Function

**Find this code** (around line 164):

```typescript
const generateMindMap = async (settings?: { range: string; focus: string }) => {
    if (!file || isGeneratingMindMap) return;

    if (!hasConsent) { setShowConsent(true); return; }
    if (activeHubMode === 3 && !settings) { setActiveHubMode(0); return; }
    if (!settings && !mindMapData) { setShowMindMapSettings(true); return; }

    setActiveHubMode(3);

    if (mindMapData && !settings) return;
    setShowMindMapSettings(false);
    setIsGeneratingMindMap(true);
    try {
        // ... rest of function
```

**Replace with:**

```typescript
const generateMindMap = async (settings?: { range: string; focus: string }) => {
    if (!file || isGeneratingMindMap) return;

    if (!hasConsent) { setShowConsent(true); return; }
    if (activeHubMode === 3 && !settings) { setActiveHubMode(0); return; }
    if (!settings && !mindMapData) { setShowMindMapSettings(true); return; }

    // AI CREDIT CHECK - Add this block
    const aiCheck = canUseAI(AiOperationType.HEAVY);
    if (!aiCheck.allowed) {
        const sub = getSubscription();
        setAiLimitInfo({
            blockMode: aiCheck.blockMode,
            used: sub.aiDocsThisMonth,
            limit: sub.tier === SubscriptionTier.FREE ? 3 : 50
        });
        setShowAiLimit(true);
        return; // STOP - user has no credits
    }

    setActiveHubMode(3);

    if (mindMapData && !settings) return;
    setShowMindMapSettings(false);
    setIsGeneratingMindMap(true);
    try {
        // ... rest of function (NO CHANGES BELOW THIS LINE)
```

**Verification Command:**
```bash
grep -A 30 "const generateMindMap" src/screens/ReaderScreen.tsx | grep "canUseAI"
```
**Expected output:** Should show the `canUseAI` check

---

## ✅ FINAL VERIFICATION

After making all 3 changes, run these commands:

### 1. Count AI credit checks in ReaderScreen
```bash
grep -c "canUseAI(AiOperationType.HEAVY)" src/screens/ReaderScreen.tsx
```
**Expected:** `4` (was 1 before, now should be 4)

### 2. Verify all 4 functions have the check
```bash
grep -B 5 "canUseAI(AiOperationType.HEAVY)" src/screens/ReaderScreen.tsx | grep "const generate\|const handle"
```
**Expected output should show:**
- `const generateChatSummary`
- `const handleAsk`
- `const generateMindMap`
- `const generateOutline`

### 3. Build the project
```bash
npm run build
```
**Expected:** No TypeScript errors

### 4. Test in browser (Manual)
- Open app as FREE user with 0 AI credits
- Try to use Chat Summary → Should show "AI Limit" modal
- Try to use Ask Question → Should show "AI Limit" modal
- Try to use Mind Map → Should show "AI Limit" modal
- Try to use Outline → Should show "AI Limit" modal

---

## 📋 REPORT FORMAT

After completing the fixes, report back with:

```
STEP 1: generateChatSummary
✅ AI credit check added
✅ Verification passed: grep shows canUseAI

STEP 2: handleAsk
✅ AI credit check added
✅ Verification passed: grep shows canUseAI

STEP 3: generateMindMap
✅ AI credit check added
✅ Verification passed: grep shows canUseAI

FINAL VERIFICATION:
✅ Count check: 4 occurrences of canUseAI(AiOperationType.HEAVY)
✅ Build successful: No errors
✅ All 4 functions protected

COMPLETED: All ReaderScreen AI credit bypasses fixed
```

---

## ⚠️ IMPORTANT REMINDERS

1. **DO NOT change any other files** - only `src/screens/ReaderScreen.tsx`
2. **DO NOT modify pricing limits** - they are already correct
3. **DO NOT change the recordAIUsage calls** - they stay where they are
4. **DO NOT touch generateOutline** - it's already correct
5. **ONLY add the canUseAI check** - nothing else

The pattern is simple:
```
Check credits → If no credits STOP → If has credits → Call AI → Record usage
```

---

## 🎯 GOAL

After this fix, users CANNOT use AI features in ReaderScreen without credits. The check happens BEFORE the AI API is called, preventing free usage and protecting your Gemini API costs.
