# Pre-Release Checklist

Run this before every AAB build. Check everything in order and report any issues found.

## 1. Version Numbers
- Read `android/app/build.gradle` — confirm `versionCode` and `versionName` are correctly bumped
- Read `package.json` — confirm `version` matches `versionName` in build.gradle
- If mismatch found, report it and do NOT proceed until fixed

## 2. Known Bug Checks
- Read `api/index.js` — confirm `@vercel/kv` is NOT imported anywhere in the file
- Read `api/index.js` — find the tier update logic and confirm the condition uses `session?.uid` (not `session?.is_auth && session?.uid`)
- Read `src/services/billingService.ts` — confirm `initPromise` and `productsFetchPromise` deduplication logic is present

## 3. Security Scan
- Search `src/` for any hardcoded strings that look like API keys (long random strings, anything starting with `AIza`, `sk-`, `Bearer`)
- Search `src/` for any direct calls to `generativelanguage.googleapis.com` or `api.anthropic.com` (must go through backend proxy only)
- Search `src/` for AI feature functions (look for `askGemini`, `generateChat`, `secureFetch`) — confirm each call site checks user tier or calls `canUseAI()` before making AI requests

## 4. Build Test
- Run: `npm run build`
- If build fails, report the errors. Do not proceed.
- If build succeeds, confirm it completed without warnings about missing files

## 5. Final Report
Report in this format:
- ✅ Version numbers: [status]
- ✅ Known bug checks: [status]
- ✅ Security scan: [status]
- ✅ Build: [status]
- **READY TO BUILD AAB** or **ISSUES FOUND: [list]**
