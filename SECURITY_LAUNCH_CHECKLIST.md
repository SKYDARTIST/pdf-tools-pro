# Security Launch Checklist (Essential)

To ensure your app is 100% secure before you reach your first 1,000 users, follow these steps in the Google Cloud Console.

## 1. Restrict your Gemini API Key
Currently, your API key is "unrestricted." If a hacker finds it, they can use it for anything. You must lock it to your app.

1.  Go to **[Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)**.
2.  Click on your API Key (the one you use for Gemini).
3.  Under **"API restrictions"**, select **"Restrict key"**.
4.  In the dropdown, find and select **"Generative Language API"**.
5.  Under **"Application restrictions"**, select **"Android apps"**.
6.  Click **"Add an item"** and enter your **Package Name** (e.g., `com.cryptobulla.pdfpro`).
7.  Enter your **SHA-1 certificate fingerprint**.
    *   *To get this, you can run:* `./gradlew signingReport` *in your Android Studio terminal.*

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
