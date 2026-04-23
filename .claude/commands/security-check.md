# Security Audit

Run a full security audit of the Anti-Gravity codebase. Check every item below and report with file:line references.

## 1. API Key Exposure
- Search all files in `src/`, `api/`, and `server/` for hardcoded secrets: anything starting with `AIza`, `sk-`, `Bearer `, or any string over 30 random characters
- Check `src/` for any `.env` variable names being logged to console
- Confirm `api/index.js` and `server/index.js` do NOT expose secrets in error responses

## 2. AI Feature Auth Gates
- Find all functions in `src/` that call the AI backend (look for `secureFetch`, `askGemini`, `generateChat`)
- Confirm each one checks user tier or calls `canUseAI()` before making the request
- Report any AI function that a free user could call without restriction

## 3. Purchase Flow Integrity
- Read `api/index.js` — find the purchase verification endpoint
- Confirm it verifies with Google Play servers (not just trusting the client)
- Confirm `user_accounts` tier update uses `session?.uid` as the condition (not `is_auth`)
- Confirm `@vercel/kv` is not imported (known to cause 500 errors)
- **Search `api/index.js` for ALL code paths that write `tier` to `user_accounts` or `ag_user_usage`** — confirm each one validates the tier against actual Google Play purchase records, not just client-supplied values (the `usage_sync` endpoint is a known risk: it accepts a client-supplied `tier` value — confirm it does NOT write that value to `user_accounts` without Play verification)

## 4. Play Integrity
- Read `api/index.js` — confirm Play Integrity check is present on the purchase endpoint
- Confirm it's not silently failing open (check the error handling)

## 5. HMAC Signatures
- Find HMAC signing logic in `api/index.js`
- Confirm it's applied to purchase-related endpoints
- Confirm the secret is read from environment variables, not hardcoded

## 6. Report
List all findings with severity:
- 🔴 CRITICAL — fix before next release
- 🟡 MEDIUM — fix in next sprint
- 🟢 LOW — cosmetic/minor
- ✅ CLEAN — no issues found
