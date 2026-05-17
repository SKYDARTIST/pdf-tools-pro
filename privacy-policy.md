# Privacy Policy

**Effective Date:** May 18, 2026

## 1. Our Commitment to Privacy
Anti-Gravity ("we," "our," or "the App") is built on a "Local-First" architecture. Your PDFs and document contents are processed on your device and are **never uploaded to or stored on our servers**. We collect the minimum data required to provide account login, usage limits, and payment processing — and nothing more.

## 2. Data We Do Not Collect or Store
We do not collect, store, or sell:
* Your PDF documents or their contents.
* Your physical location.
* Your browser history or device files beyond the App's scope.
* Your contacts, calendar, photos, or any data outside files you explicitly select.

## 3. Data We Do Collect (Minimum Required)
To provide login, usage limits, and payment processing, we store the following on our backend (Supabase):

* **Google account profile:** When you sign in with Google, we store your Google account ID, email address, display name, and profile picture URL. This is required to associate your Lifetime Access with your account.
* **Subscription tier:** Whether your account is on the Free or Lifetime tier.
* **Usage counters:** Anonymous counts of AI operations you have used (e.g. "AI operations this week: 5"). We store counts, not the operations themselves.
* **Payment transactions:** Google Play transaction IDs and product IDs for purchases, used for verification and fraud prevention. We do not store credit card information — that is handled exclusively by Google Play.
* **Anonymous usage analytics:** Screen views and tool usage events, associated with a randomly generated device ID, used to understand which features are popular.

## 4. Data Processing & AI Disclosure
### 4.1 Local Processing
The majority of our tools (Merge, Split, Rotate, Repair, Compress, Image-to-PDF, etc.) run **entirely on your device's hardware**. No data is transmitted to any server for these operations.

### 4.2 Transient AI Processing (Google Gemini API)
When you use AI-powered features (AI Chat, Neural Extraction, Table AI, Mindmap, Outline), your document's text or visuals are transmitted to the **Google Gemini API** through our backend proxy for real-time analysis.

* **Transient Use:** Document content is processed in memory and is **not stored** on our servers or in our database. Only the operation count is recorded.
* **No Training:** In accordance with Google's API terms, your data is not used to train future AI models.
* **Encryption:** All data is protected by HTTPS/TLS encryption in transit.

## 5. Third-Party Services
We use the following third-party services:
* **Supabase (PostgreSQL hosting):** Stores the account, subscription, and usage data described in Section 3.
* **Vercel (backend hosting):** Hosts our API endpoints.
* **Google Play Billing:** Processes premium purchases. Financial information is handled exclusively by Google.
* **Google Sign-In:** Provides authentication. Subject to Google's privacy policy.
* **Google Gemini API:** Provides AI features as described in Section 4.2.
* **Google Play Integrity API:** Verifies that the app is running on a legitimate device.

## 6. Local Storage (On Your Device)
We use your device's local storage to keep:
* Your AI consent status.
* Your current "Neural Budget" (AI credit balance, mirrored from the backend).
* A cached session token for staying signed in.
* Temporary application state.

No document content is persistently stored on your device by the App.

## 7. Your Rights & Data Deletion
You can request deletion of your account data at any time by contacting us. Upon request, we will delete:
* Your Google profile data from `user_accounts`.
* Your subscription and usage records.
* Your analytics events.

Note that payment transaction records may be retained for legal and tax compliance.

Uninstalling the app removes all local storage and cached data from your device, but does not delete your server-side account. To delete the server-side account, contact us as above.

## 8. AI-Generated Content
Anti-Gravity provides a reporting mechanism ("Flag AI") for any AI-generated content you deem inaccurate or inappropriate. This feedback is used to improve prompting logic.

## 9. Contact
For privacy inquiries or data deletion requests, contact: **antigravitybybulla@gmail.com**
