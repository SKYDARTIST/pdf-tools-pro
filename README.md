<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Anti-Gravity PDF: AI Toolset

A bank-grade, privacy-first PDF toolkit powered by Gemini AI and Capacitor.

## 🚀 Key Features
- **Neural Data Extraction**: Convert invoices, receipts, and tables to JSON/CSV.
- **Privacy First**: Secure local processing with server-side validation.
- **Multi-Platform**: Seamless sync across Web, Android, and iOS via Supabase.
- **Enterprise Security**: HMAC signatures, CSRF protection, and PII masking.

## 🛠️ Tech Stack
- **Frontend**: React 19, Vite 7, Tailwind CSS (Build-time)
- **Mobile**: Capacitor 8 (Latest)
- **AI**: Google Generative AI (Gemini 2.0-Flash-Lite)
- **Backend**: Node.js 22, Express
- **Session/Auth**: Supabase + Google OAuth

## 📦 Project Structure
```text
pdf-tools-pro/
├── src/                # Frontend Source
│   ├── components/     # UI Components
│   ├── screens/        # Page Views
│   ├── services/       # API & Business Logic
│   ├── utils/          # Helpers & Processing
│   └── assets/         # Static Assets
├── server/             # Security Proxy & AI Kernel
├── android/            # Native Android Project
├── public/             # Static Public Assets
└── capacitor.config.ts # Cross-platform Config
```

## ⚙️ Development Setup

**Prerequisites:**
- **Node.js**: v22.x.x (Required for Capacitor 8)
- **NPM**: v10+

1. **Install Dependencies**:
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

2. **Environment Configuration**:
   Create a `.env` in the root and `server/.env`:
   ```bash
   GEMINI_API_KEY=your_key_here
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

3. **Run Locally**:
   ```bash
   # Terminal 1: Frontend (Port 3000)
   npm run dev

   # Terminal 2: Backend (Port 3001)
   cd server && node index.js
   ```

## 📱 Mobile (Android)
To sync changes to the Android app:
```bash
nvm use 22
npm run build
npx cap sync android
```

---
*Built with ❤️ by cryptobulla*

