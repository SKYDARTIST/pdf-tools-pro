<div align="center">
<img width="1200" height="475" alt="Anti-Gravity Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Anti-Gravity — Private AI PDF Toolkit

Live on the Play Store. 900+ installs. 5 countries. Built solo.

Anti-Gravity is a privacy-first PDF assistant for Android. Users upload a document and talk to it — the AI reads, summarizes, and answers questions. No subscription. No ads. No third-party data exposure. One-time purchase, lifetime access.

[Play Store](https://play.google.com/store/apps/details?id=com.cryptobulla.antigravity)

---

## Why it exists

Most AI document tools send your files to servers you don't control and charge monthly. Anti-Gravity was built on a different assumption: the user owns their document and their data. Every AI call goes through a signed server proxy — the API key never touches the client, and no document content is stored.

---

## Architecture

```
Android App (React + Capacitor)
    |
    | HMAC-signed requests
    v
Node.js Proxy Server (Express)
    |
    | Play Integrity API check (rejects sideloaded/tampered APKs)
    | JWT validation
    | Rate limiting
    v
Gemini API (document Q&A, summarization, extraction)
    |
Supabase (PostgreSQL) — user auth, session, usage tracking
```

The security layer exists because the Gemini API key lives only on the server. Every request from the app is HMAC-signed with a shared secret. The server validates the signature before forwarding anything to Gemini. Play Integrity API rejects requests from modified APKs before they reach the auth layer.

---

## Features

- Chat with any PDF — ask questions, get summaries, extract tables
- Structured data extraction: invoices and receipts to JSON/CSV
- Google OAuth with JWT session management (httpOnly cookies)
- Offline-capable document viewer
- Rate limiting per user per endpoint
- CSRF protection on all state-changing routes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS |
| Mobile | Capacitor 8 (Android) |
| Backend | Node.js 22, Express |
| AI | Gemini 2.5 Flash (via server-side proxy) |
| Auth | Google OAuth, JWT (httpOnly cookies) |
| Database | Supabase (PostgreSQL) |
| Security | HMAC request signing, Play Integrity API, rate limiting |

---

## Project Structure

```
pdf-tools-pro/
├── src/                # React frontend
│   ├── components/     # UI components
│   ├── screens/        # Route-level views
│   ├── services/       # API client, business logic
│   └── utils/          # Shared helpers
├── server/             # Node.js proxy — AI calls, auth, rate limiting
├── android/            # Native Android project (Capacitor-managed)
└── public/             # Static assets
```

---

## Local Development

**Prerequisites:** Node.js v22+, NPM v10+

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Environment — root .env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://localhost:3001

# Environment — server/.env
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JWT_SECRET=
HMAC_SECRET=

# Run frontend (port 3000)
npm run dev

# Run backend (port 3001)
cd server && node index.js
```

---

## Android Build

```bash
nvm use 22
npm run build
npx cap sync android
# Open android/ in Android Studio and build APK/AAB
```

---

## Lessons from shipping

Three things that weren't obvious until production:

**Billing failure diagnosis.** After launch, payment gateway reported success but no funds arrived. Traced it to a silent webhook failure — a schema migration I'd done late-night caused the transaction write to fail without throwing an error. Found it by diffing gateway logs against the database manually. No alert fired.

**Play Integrity blocking legitimate users.** The API rejects requests it considers untrusted — which includes some legitimate users on custom ROMs or rooted devices. Required a fallback path with degraded (but not blocked) access.

**Gemini hallucinating structured output.** Early versions of the extraction feature returned plausible-looking JSON with invented field values. Fixed by adding strict schema validation and returning the raw text alongside parsed output so users can verify.

---

Built by [Aakash Gajbhiye](https://aakashbuild.vercel.app) | [@AakashBuild](https://x.com/AakashBuild)
