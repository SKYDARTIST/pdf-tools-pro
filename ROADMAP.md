# Roadmap — Anti-Gravity

Planned features and improvements. Priority order reflects user impact vs. build cost.

---

## Priority 1 — High impact, doable now

**Image-based OCR**
Extract text from photos, scanned documents, and camera captures.
Implementation: Gemini Vision API via `aiService.ts`. UI entry point in ExtractTextScreen.
Source: tester feedback.

**Batch Processing**
Select multiple files for Merge, Watermark, or Redact in a single operation.
Currently each tool processes one file at a time — this is the top friction point in power-user workflows.

---

## Priority 2 — Medium effort

**Neural Search**
Semantic search across all locally stored PDFs without opening them.
Requires local embeddings or a Gemini-backed index. Privacy constraint: search index stays on-device.

**Form Field Detection**
Automatic detection and filling of government/medical form fields before signing.
Useful for the Sign tool — currently manual field placement.

---

## Priority 3 — Future / research

**Voice Commands**
"Summarize this document" via voice input. Accessibility play.
Dependency: stable Web Speech API support in Capacitor WebView.

**iOS / iPad port**
Capacitor supports iOS. Blocked on Apple Developer account ($99/year).

---

## Completed (shipped)

- Lifetime one-time purchase via Google Play Billing
- Gemini AI chat, summarize, extract, redact assist
- Play Integrity API for tamper detection
- JWT + CSRF session security
- IndexedDB purchase retry queue
- Google Sign-In + account-linked purchases
- Split, merge, rotate, sign, watermark, reorder, remove pages
- Image-to-PDF, PDF-to-images, text extraction
- NeuralDiff (document comparison)
- Admin dashboard (Nexus) for payment recovery

---

*Last updated: 2026-05-17*
