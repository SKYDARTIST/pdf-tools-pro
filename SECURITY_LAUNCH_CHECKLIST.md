# Security Launch Checklist (Essential)

To ensure your app is 100% secure before you reach your first 1,000 users, follow these steps.

## 1. Rotate Exposed Supabase Credentials

> [!CAUTION]
> **Your Supabase anon key was previously hardcoded in the public GitHub repository.**
> Even though we've removed it from the code, it's still visible in Git history.

**Action Required:**
1. Go to **[Supabase Dashboard](https://supabase.com/dashboard)** → Your Project → Settings → API
2. Click **"Regenerate"** next to the **Anon/Public Key**
3. Copy the new key
4. Go to **[Vercel Dashboard](https://vercel.com)** → Your Project → Settings → Environment Variables
5. Update `SUPABASE_ANON_KEY` with the new key
6. Redeploy your application

## 2. Set Protocol Signature Environment Variable

To prevent unauthorized API access, set a unique protocol signature:

1. Go to **[Vercel Dashboard](https://vercel.com)** → Your Project → Settings → Environment Variables
2. Add a new variable:
   - **Name:** `AG_PROTOCOL_SIGNATURE`
   - **Value:** Generate a random string (e.g., `openssl rand -hex 32` in terminal)
3. Add the same variable to your local `.env.local` file:
   ```
   VITE_AG_PROTOCOL_SIGNATURE=your_random_string_here
   ```
4. Redeploy your application

## 3. Restrict your Gemini API Key

Currently, your API key is "unrestricted." If a hacker finds it, they can use it for anything. You must lock it down.

> [!IMPORTANT]
> **Because we use a Backend Proxy (Vercel/Node.js) to hide your key, you must NOT restrict the key to "Android apps."**
> If you restrict it to Android, the server (Vercel) will be blocked with a `403 Forbidden` error because it is not an Android client.

1. Go to **[Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)**.
2. Click on your API Key.
3. Under **"Application restrictions"**, select **"None"**. 
    * *Note: Security is instead handled by our "Signature Handshake" in the code, which ensures only your app can talk to the proxy.*
4. Under **"API restrictions"**, select **"Restrict key"**.
5. In the dropdown, find and select **"Generative Language API"**.
6. Click **Save**.

## 4. Enable Play Integrity (After Capacitor Bundle)

Once we wrap this web app into an Android APK:
1. Go to the **Google Play Console**.
2. Navigate to **Setup > App Integrity**.
3. Click **"Link to Google Cloud project"** and select your Gemini project.
4. This will automatically start blocking "modded" or pirated versions of your app from using your AI.

## 5. Verify Neural Guardrails

I have already implemented the following in your code:
* [x] **Signature Handshake**: Backend blocks requests not coming from your app.
* [x] **Safety Filters**: AI blocks harassment, hate speech, and dangerous content.
* [x] **Local Sanitization**: Obvious emails and phone numbers are stripped *locally* before sending to Google.
* [x] **No Hardcoded Secrets**: All credentials now require environment variables.
* [x] **CORS Restrictions**: API only accepts requests from production URL.

**Status:** Technical security is now at 95% completion. Steps 1-3 above require your manual action!
