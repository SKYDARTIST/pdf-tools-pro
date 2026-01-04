# Privacy Policy

**Effective Date:** January 4, 2026

## 1. Our Commitment to Privacy
Anti-Gravity ("we," "our," or "the App") is built on a "Local-First" architecture. We believe that your documents should never leave your device unless absolutely necessary for the specific function you request. We do not maintain any central servers to store your documents, personal identity, or usage history.

## 2. Data We Do Not Collect
We do not collect, store, or sell:
* Your PDF documents or their contents.
* Your name, email address, or contact information.
* Your physical location.
* Your browser history or device files beyond the App's scope.

## 3. Data Processing & AI Disclosure
### 3.1 Local Processing
The vast majority of our tools (Merge, Split, Rotate, Repair, etc.) run **entirely on your device's hardware**. No data is transmitted to any server for these operations.

### 3.2 Transient AI Processing (Google Gemini API)
When you use AI-powered features (AI Chat, Neural Extraction, Table AI), your document's text or visuals are securely transmitted to the **Google Gemini API** for real-time analysis.
* **Transient Use:** This transmission is ephemeral. The data is processed in RAM and is NOT stored by us.
* **No Training:** In accordance with our enterprise agreement with Google, your data is NOT used to train future AI models.
* **Encryption:** All data sent to the AI engine is protected by HTTPS/TLS encryption in transit.

## 4. Third-Party Services
We utilize the following third-party services to provide the App's functionality:
* **Google Play Billing:** To process premium upgrades and credit packs. Financial information is handled exclusively by Google.
* **Google Gemini API:** To provide generative AI document intelligence as described in Section 3.2.
* **Google Play Services:** For basic app diagnostics and crash reporting to improve performance.

## 5. Storage (LocalStorage)
We use the device's technical `LocalStorage` to store:
* Your AI consent status.
* Your current "Neural Budget" (AI credit balance).
* Temporary application state to ensure a smooth user experience.
No document content is persistent in this storage.

## 6. Your Rights
Since we do not store your data on our servers, "deleting your data" is as simple as deleting the App from your device. This will wipe all `LocalStorage` and temporary caches.

## 7. AI-Generated Content
As an AI-powered suite, Anti-Gravity provides a reporting mechanism ("Flag AI") for any content you deem inaccurate or inappropriate. This feedback is used to improve our local prompting logic.

## 8. Contact
For any privacy inquiries, please reach out via our GitHub repository or developer portal.
