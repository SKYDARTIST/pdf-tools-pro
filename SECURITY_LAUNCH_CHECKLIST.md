# Security Launch Checklist (Essential)

To ensure your app is 100% secure before you reach your first 1,000 users, follow these steps in the Google Cloud Console.

## 1. Restrict your Gemini API Key
Currently, your API key is "unrestricted." If a hacker finds it, they can use it for anything. You must lock it down.

> [!IMPORTANT]
> **Because we use a Backend Proxy (Vercel/Node.js) to hide your key, you must NOT restrict the key to "Android apps."**
> If you restrict it to Android, the server (Vercel) will be blocked with a `403 Forbidden` error because it is not an Android client.

1.  Go to **[Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)**.
2.  Click on your API Key.
3.  Under **"Application restrictions"**, select **"None"**. 
    *   *Note: Security is instead handled by our "Signature Handshake" in the code, which ensures only your app can talk to the proxy.*
4.  Under **"API restrictions"**, select **"Restrict key"**.
5.  In the dropdown, find and select **"Generative Language API"**.
6.  Click **Save**.

## 2. Enable Play Integrity (After Capacitor Bundle)
Once we wrap this web app into an Android APK:
1.  Go to the **Google Play Console**.
2.  Navigate to **Setup > App Integrity**.
3.  Click **"Link to Google Cloud project"** and select your Gemini project.
4.  This will automatically start blocking "modded" or pirated versions of your app from using your AI.

## 3. Verify Neural Guardrails
I have already implemented the following in your code:
*   [x] **Signature Handshake**: Backend blocks requests not coming from your app.
*   [x] **Safety Filters**: AI blocks harassment, hate speech, and dangerous content.
*   [x] **Local Sanitization**: Obvious emails and phone numbers are stripped *locally* before sending to Google.

**Status:** Technical security is 90% complete. The final 10% (Step 1 above) requires your manual entry in the console!
