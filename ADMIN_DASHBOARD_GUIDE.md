# 🛡️ Admin Command Center - User Manual

The Command Center is your private interface for managing payments, tracking revenue, and resolving customer issues directly from the app.

---

## 🔐 Security & Access

**Strict Access**: The dashboard is exclusively locked to your Google Account.
**Access URL**: `/admin/payments`

### How to enter:
1.  **Login**: Ensure you are logged into your admin account in the app.
2.  **Navigation**: Go to `https://[your-app-url]/admin/payments` in your mobile or desktop browser.
3.  **Authentication**: The server will verify your Google UID. If it matches the `ADMIN_UIDS` in your environment config, access is granted.

---

## 📊 Modules & Features

### 1. Intelligence Summary
At the top, you'll see three key metrics:
- 💰 **Estimated Revenue**: Total sum of successful transactions logged in the database.
- 👥 **Total Protocols**: Total number of registered users.
- ⚠️ **System Deflections**: Number of failed payment attempts that might need manual review.

### 2. Transaction Stream
A real-time list of all payment attempts:
- **Identity**: Shows User Name, Email, and Masked Device ID.
- **Transaction**: Shows the Google Play Order ID and the Product Name.
- **Status**: 
    - ✅ `success`: Payment verified and access granted automatically.
    - ❌ `failed`: Verification failed (e.g., mismatched token or network error).
    - ⏳ `pending`: Awaiting server confirmation.
- **Action Buttons**: 
    - ⚡ **GRANT**: Instantly upgrades the user to 'Lifetime' status. Use this if a customer provides proof of purchase but the system failed to verify it automatically.
    - 🔗 **External Link**: Opens the specific order in your Google Play Console for detailed verification.

### 3. Filters & Search
- **Search**: Find transactions by Order ID, Email, or Device ID.
- **Status Filter**: Isolate failed transactions to quickly find customers who need help.

---

## 🛠️ Operational Guide

### When to use the MANUALLY GRANT button:
1.  A customer contacts you via the **Payment Intelligence Hub** or email.
2.  They provide a screenshot of their Google Play Receipt.
3.  You find their transaction in the Command Center (it will likely be marked as `failed`).
4.  Verify the Order ID matches their receipt.
5.  Click ⚡ **GRANT**. The user will instantly have Lifetime Pro access the next time they open the app.

### Resolving "Manual Upgrade" requests:
If a user is NOT in the list (rarely happens if they couldn't even start the purchase):
1.  Ask for their **Device ID** (found in the app's Support section).
2.  I can assist you with a one-time SQL script to add them, or you can use the Command Center if they appear after a retry.

---

## 🛰️ Technical Backbone
- **Database**: Extends `public.purchase_transactions` with status and revenue metadata.
- **API**: Private routes in `api/index.js` protected by `Hmac-Sha256` protocol signatures.
- **UI**: High-performance React component with Framer Motion animations.

*Confidentiality Notice: This dashboard contains sensitive customer data. Do not share screenshots of this dashboard in public forums.*
