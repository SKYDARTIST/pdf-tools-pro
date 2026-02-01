# PROMPT FOR GEMINI AI

Copy and paste this exact message to Gemini:

---

**TASK: Security Vulnerability Fix**

Please follow the step-by-step guide in `/Users/cryptobulla/BUILD/pdf-tools-pro/SECURITY_FIX_GUIDE.md`

**IMPORTANT RULES:**
1. Complete ONE step at a time
2. After EACH step, report your progress using the format specified in the guide
3. Wait for confirmation before proceeding to the next step
4. If you encounter ANY errors, stop and report them immediately
5. Do NOT skip steps or combine multiple steps

**START NOW with STEP 1**

Read the guide and begin with removing the client-side HMAC secret from `services/configService.ts`.

Report back after completing Step 1.

---

## Alternative Quick Start

If Gemini needs context, use this:

---

**CONTEXT:**
You are fixing 2 critical security vulnerabilities in an Android app:

1. **Exposed HMAC secret** in client-side code (allows attackers to forge signatures)
2. **Client-side request signing** (should be server-side only)

**YOUR MISSION:**
Follow the guide at `/Users/cryptobulla/BUILD/pdf-tools-pro/SECURITY_FIX_GUIDE.md`

Complete each step and report progress after each one.

**START WITH STEP 1 NOW.**

---
