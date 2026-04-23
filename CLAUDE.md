# Anti-Gravity: Private AI PDF — Claude Context

## Current Version
- Check `android/app/build.gradle` for current versionCode and versionName (do not rely on this file for version numbers — they change each release)
- Always bump BOTH versionCode and versionName together before every release

## Build Command
```bash
npm run build && npx cap sync android && cd android && ./gradlew bundleRelease
```
Then sign AAB in Android Studio → upload to Play Console.

## Project Structure
```
src/
  screens/       — All app screens (HomeScreen, PricingScreen, AdminDashboard etc.)
  services/      — Core logic (billingService, authService, analyticsService etc.)
  components/    — Reusable UI components
api/
  index.js       — Backend Node.js server (all API endpoints)
server/
  index.js       — Gemini AI proxy server (port 3001)
android/
  app/build.gradle — Version codes live here
```

## Key Files
- `src/services/billingService.ts` — Payments, CSRF fix, Google Play Billing
- `src/services/authService.ts` — Google OAuth, session management
- `src/screens/AdminDashboard.tsx` — Nexus admin panel, payment recovery
- `src/screens/HomeScreen.tsx` — Main screen, pricing banner
- `src/screens/PricingScreen.tsx` — Upgrade flow
- `api/index.js` — All backend endpoints including admin_force_sync_purchase

## Tech Stack
- Frontend: React + TypeScript + Tailwind
- Mobile wrapper: Capacitor (Android)
- Backend: Node.js + Express (api/index.js)
- Database: Supabase (PostgreSQL)
- Auth: Google OAuth + JWT + CSRF tokens
- Payments: Google Play Billing + Play Integrity API
- AI: Gemini API via secure Node.js proxy

## Critical Rules
- ALWAYS force `AuthService.initializeSession()` BEFORE purchase verification (CSRF sync)
- ALWAYS test on real device before building AAB — simulator hides native bridge issues
- ALWAYS commit after each feature, not at the end of session
- NEVER use `git add -A` — stage specific files only (risk of leaking secrets)
- Deduplicate any API that crosses boundaries (billing, AI calls) — learned from v3.1.9 crash

## Payment Sync Quick Fix
If user reports payment not syncing:
```sql
UPDATE user_accounts SET tier = 'lifetime' WHERE google_uid = 'USER_UID';
```
Run in Supabase SQL Editor. Then tell user to logout/login.

## Owner
Aakash (Cryptobulla) — AI-native developer, solo builder
Stack is React + Capacitor, not native Android.
