# Approved Plan - Additional Instructions

Your implementation plan is **APPROVED** with the following additions:

---

## Additional Steps Required

### Before Starting Implementation:

#### 1. Verify All AI-Calling Screens

**Task**: Don't assume only `AntiGravityWorkspace.tsx` and `QuickToolsScreen.tsx` call AI functions.

**Action**:
```bash
# Search for ALL files calling AI functions
grep -r "askGemini\|recordAIUsage" src/screens/ --include="*.tsx"
grep -r "askGemini\|recordAIUsage" src/components/ --include="*.tsx"
```

**Report**: List ALL files that need modification, not just the two mentioned.

---

#### 2. Verify Backend Schema

**Task**: Confirm Supabase tables have the required columns.

**Check these tables**:
- `ag_user_usage` - Should have columns: `ai_pack_credits`, `ai_docs_this_month`, `ai_docs_this_week`
- `user_accounts` - Should have columns: `ai_pack_credits`, `tier`

**Action**:
1. Check `api/index.js` around line 1078-1099 to see what columns are updated
2. Verify the RPC function `increment_ai_credits()` exists
3. Confirm `syncUsageToServer()` in `usageService.ts` sends all required fields

**Report**: Confirm all fields are supported by backend.

---

#### 3. Add Test Case #5

Add this to the testing plan:

**Test 5: Refund Mechanism**
1. Note current credits
2. Temporarily modify code to throw error AFTER `recordAIUsage()` but BEFORE returning success
3. Verify `refundAICredit()` is called
4. Verify credits are restored

**Expected**: Credits refunded when operation fails after deduction
**Purpose**: Verify safety net works

---

## Implementation Order

Follow this order strictly:

### Phase 1: Backend Verification (Steps above)
✅ Verify all AI-calling screens
✅ Verify backend schema
✅ Add Test 5 to plan

### Phase 2: Error Standardization (Issue 2, Step 1)
✅ Modify `aiService.ts` first
✅ Ensure consistent `{success, data, error}` format
✅ Build test

**Why first?** This makes all subsequent changes easier.

### Phase 3: Credit Protection (Issue 2, Step 2)
✅ Update ALL screens to check `response.success`
✅ Only call `recordAIUsage()` on success
✅ Add error alerts
✅ Build test

### Phase 4: Sync-Before-Deduct (Issue 1)
✅ Modify `recordAIUsage()` in `subscriptionService.ts`
✅ Add double sync (before + after deduction)
✅ Add try-catch with retry queue
✅ Build test

### Phase 5: Safety Net (Issue 1 + 2)
✅ Add `refundAICredit()` function
✅ Implement in error paths (optional, as backup)
✅ Build test

### Phase 6: Full Testing
✅ Run all 5 tests (original 4 + new Test 5)
✅ Fix any issues found
✅ Final build test

---

## Critical Reminders

1. **Report after EACH phase** - Don't skip ahead
2. **Build after each phase** - Catch errors early
3. **Don't modify node_modules** - Only app source code
4. **Keep backup** - Before starting, copy current files:
   ```bash
   cp src/services/subscriptionService.ts src/services/subscriptionService.ts.backup
   cp src/services/aiService.ts src/services/aiService.ts.backup
   cp src/services/usageService.ts src/services/usageService.ts.backup
   ```

---

## Success Criteria (Updated)

All fixes complete when:
- ✅ Error format standardized to `{success, data, error}`
- ✅ Credits only deducted on `response.success === true`
- ✅ Sync happens BEFORE deduction
- ✅ Double sync ensures server always updated
- ✅ Refund mechanism exists as safety net
- ✅ All 5 tests pass
- ✅ No TypeScript errors
- ✅ ALL AI-calling screens updated (not just 2)

---

## Questions to Answer Before Starting

**Q1**: How many files call `askGemini()` or `recordAIUsage()`?
**Q2**: Does the backend accept `ai_pack_credits` field in sync payload?
**Q3**: Does `refundAICredit()` need to be exported from `subscriptionService.ts`?

Answer these first, then proceed with implementation.

---

**Ready to start? Begin with Phase 1.**
