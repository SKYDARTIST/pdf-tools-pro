
# 🚀 Global Deployment & Play Store Compliance Guide

This guide outlines the critical steps to move **Anti-Gravity PDF** from development to the Google Play Store.

## 1. API Key Security (The Backend Proxy)
To prevent your Gemini API Key from being stolen, you must move the AI logic to a server.

### Suggested Architecture:
- **Frontend**: Calls your deployed server endpoint (set via `VITE_BACKEND_URL`).
- **Backend (Node.js)**: Uses the resilient model fallback chain to ensure high uptime.

### Production Server Implementation:
We have already built a production-ready proxy in the `server/` directory. 
- **Hosting**: Deploy `server/index.js` to a platform like **Vercel**, **Railway**, or **Render**.
- **Environment**: Set `GEMINI_API_KEY` in your hosting provider's dashboard.
- **Resilience**: The server is pre-configured with a "Self-Healing" chain that tries **Gemini 2.0 Flash Lite**, **2.0 Flash**, and **1.5 Flash** automatically if one fails.

### Handling Scanned Documents:
- **Limitation**: The current extraction layer is optimized for digital PDFs.
- **Pro Response**: If the document is a scan, the AI detects the lack of text and politely informs the user why analysis is restricted. This maintains professionalism while keeping processing costs at zero for non-readable files.

---

## 2. Google Play AI Compliance
We have already implemented the following in the app:
- ✅ **Reporting Mechanism**: Users can flag AI responses in the Neural Hub.
- ✅ **Safety Filtering**: Using Gemini's built-in safety filters.
- ✅ **Privacy Transparency**: Clear "Safety Transparency" section in Security settings.

### Store Listing Requirements:
When uploading to the Play Console, you **must** disclose that your app uses Generative AI.
- **Section**: Web Content / Generative AI
- **Answer**: "Yes, this app generates content."
- **Safety Features**: Mention the "In-app reporting system" and "Third-party Safety Filtering" (Google Gemini).

---

## 3. Revenue Strategy (ASO)
The app is now optimized for the keyword: **"Anti-Gravity PDF: AI Editor & Scan"**.

- **Short Description (ASO Suggestion)**: 
  > Lightweight AI PDF Editor to Scan, Merge, and Chat with documents. Secure, fast, and professional.
- **Graphic Assets**:
  > Use the Black & White "Monolith" aesthetic for your screenshots. High contrast icons perform best for professional tool apps.

---

**Protocol Active. You are ready to launch.**
