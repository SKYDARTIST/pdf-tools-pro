# Sign In Placement Strategy - NO UI CHANGES

**Constraint**: No UI changes to existing screens

**Solution**: Contextual Sign In Modal (appears only when needed)

---

## The Right Approach: Modal-Based Auth

Instead of adding a sign-in button to the UI, implement a **sign-in modal that appears contextually** when the user tries to use an AI feature.

### When Sign In Modal Should Appear

```
User Flow:
1. User clicks "Use AI Tool" (Workspace, Redact, Compare, etc.)
2. Check: Is user logged in?
   └─ NO → Show Google Sign In Modal
   └─ YES → Proceed with AI tool

3. User sees modal with Google Sign In button
4. After successful login:
   └─ Modal closes
   └─ Load user's subscription from Supabase
   └─ Proceed with AI tool

5. On subsequent AI tool uses:
   └─ User already logged in
   └─ No modal appears
   └─ Directly proceeds with tool
```

### Why This Approach Works

✅ **No UI changes** - No buttons added to existing screens
✅ **Contextual** - Users understand WHY they're signing in
✅ **Non-intrusive** - Modal only appears when necessary
✅ **Natural flow** - Sign in happens right before using AI
✅ **Better UX** - Reduces friction vs. "Sign in first" screens

---

## Implementation Instructions for Gemini

**Tell Gemini**:

> "Don't add any new Sign In buttons to the UI. Instead, implement a sign-in modal that appears ONLY when these conditions are met:
>
> 1. User clicks to use an AI-powered feature (Workspace, Smart Redact, Neural Diff, Briefing, Extractor, Compare, etc.)
> 2. Check if `getCurrentUser()` returns null (not logged in)
> 3. If not logged in, show a modal with:
>    - "Sign In to Use AI Features"
>    - Google Sign In button (from GoogleLogin component)
>    - Explanation: "Your AI credits and subscription sync across devices when you sign in"
> 4. After successful sign in, close modal and proceed with the AI feature
> 5. Load user subscription from Supabase via the API
> 6. Continue with the AI operation
>
> This is a CONTEXTUAL modal that appears when needed, not a UI change to existing screens."

---

## Implementation Checklist for Gemini

### Create `components/AuthModal.tsx`
```typescript
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <Modal>
      <h2>Sign In to Use AI Features</h2>
      <p>Your AI credits and subscription sync across devices when you sign in</p>
      <GoogleLogin
        onSuccess={async (credentialResponse) => {
          if (credentialResponse.credential) {
            const user = await signInWithGoogle(credentialResponse.credential);
            if (user) {
              onSuccess();
              onClose();
            }
          }
        }}
      />
      <button onClick={onClose}>Cancel</button>
    </Modal>
  );
};
```

### Add to AI Tool Screens
```typescript
// In any AI tool (Workspace, Redact, Compare, etc.)
const handleUseAIFeature = async () => {
  const user = await getCurrentUser();

  if (!user) {
    setAuthModalOpen(true);  // Show modal
    return;
  }

  // User is logged in, proceed
  await processAIFeature();
};

return (
  <>
    <button onClick={handleUseAIFeature}>Use AI Feature</button>

    <AuthModal
      isOpen={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      onSuccess={async () => {
        // Reload subscription after successful login
        const user = await getCurrentUser();
        const subscription = await fetchUserSubscription(user.google_uid);
        setSubscription(subscription);
        // Now process the AI feature
        await processAIFeature();
      }}
    />
  </>
);
```

### AI Tools That Need This Check
- ✅ Workspace (Anti-Gravity Workspace)
- ✅ Smart Redact
- ✅ Neural Diff (Compare)
- ✅ Table Extractor
- ✅ Data Extractor
- ✅ Reader (Briefing feature)
- ✅ Scanner (if has AI features)

---

## NO Changes To:
- ❌ Pricing screen
- ❌ Home screen
- ❌ Header
- ❌ Navigation
- ❌ Bottom nav
- ❌ Existing buttons or menus

---

## What This Achieves

| Before | After |
|--------|-------|
| Device-based auth | Google account-based auth |
| Credits visible but not synced | Credits synced to Supabase |
| Uninstall = reset credits | Uninstall = credits persisted |
| No login option | Sign in when using AI |
| Local-only data | Server-side source of truth |
| Cheating possible | Cheating prevented |

---

## User Experience Flow

```
User Opens App
  │
  ├─ NOT logged in?
  │  └─ Browse tools (free features work)
  │
  └─ Click "Use AI Feature"
     │
     ├─ NOT logged in?
     │  └─ Modal: "Sign In to Use AI"
     │  └─ User clicks Google button
     │  └─ Signs in with Google
     │  └─ Subscription loads from Supabase
     │  └─ Modal closes
     │  └─ AI feature proceeds
     │
     └─ Already logged in?
        └─ Directly proceed with AI feature
        └─ Credits deducted from Supabase
        └─ No interruption
```

---

## Gemini's Task Summary

✅ Modal appears ONLY when:
  - User tries AI feature AND
  - Not logged in

✅ No UI changes to:
  - Any existing screens
  - Navigation
  - Buttons (except inside modal)

✅ After login:
  - Modal closes
  - Subscription loaded
  - AI feature proceeds
  - Credits synced to server

---

## Testing Checklist

- [ ] Click AI tool while logged out → Modal appears
- [ ] Click Google Sign In → Modal closes after successful login
- [ ] Click AI tool while logged in → No modal, directly proceeds
- [ ] After login, uninstall/reinstall → Subscription persists
- [ ] Use AI → Credits deducted from Supabase
- [ ] No new buttons added to existing screens
- [ ] All non-AI features work without login
