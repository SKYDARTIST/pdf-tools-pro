# Changelog

All notable changes to Anti-Gravity are documented here.
Format: `[version] — date — summary`

---

## [3.2.9] — 2026-03 — Build 51

- Bug fixes and security hardening
- Auth improvements — session reliability on cold start
- Tier escalation patch for usage_sync edge case
- Hardened Claude tooling hooks

## [3.2.7] — 2026-02 — Build 49

- Gemini model migration: 2.0/1.5 → 2.5 before March cutoff
- Stability fixes for large PDF handling

## [3.1.9] — 2025-12

- Fixed app crash on specific Android devices at startup
- Resolved API deduplication bug — billing and AI calls crossing boundaries caused v3.1.9 crash (post-mortem in journal.md)

## [3.1.7] — 2025-12

- Analytics tracking improvements
- Upgrade nudge flow refinements
- Workflow and UX improvements

## [3.1.1] — 2025-11 — Security & Account Protection

- Purchase Security: Google Sign-In required before Lifetime purchase — links purchase to account for recovery
- Auto-Reconciliation: intelligent handshake syncs device-level lifetime grants to Google account on sign-in
- Backend Guard: blocked anonymous/device-only purchase verification attempts

## [2.8.1] — 2025-10 — Critical Security & Stability Patch

- Fixed app crash on startup (specific Android devices)
- Google Play Integrity API for device attestation
- JWT-based authentication replacing previous session method
- Reduced startup race conditions

## [2.8.0] — 2025-10

- AI Power Pack credits purchase flow live
- Pro/Lifetime full-card UI for active members
- Standardized international pricing display (USD)
- Fixed state desync bug reverting Pro status in UI

## [2.7.0] — 2025-09 — Payments Live

- Google Play Billing live: one-time Lifetime Pro purchase
- Payment processing stability improvements

## [2.6.0] — 2025-09

- Google Play Billing integration
- Enhanced Sharing: receive PDFs/images from other apps via Android share sheet
- Local Gemini AI: on-device document intelligence
- 100% watermark-free output across all tools
- 20+ testers verified in closed testing

## [2.5.0] — 2025-08

- Split Tool: all pages now export as a single ZIP (previously one page at a time)
- Smart Redact UI streamlined
- Dark mode startup flash fixed
- General performance improvements
