# Gemini: Distributed Rate Limiting Fix (Vercel KV)

**Issue**: P2 - Distributed Rate Limiting Failure (CVSS 6.2)
**Blocking**: NO (Phase 2, post-launch nice-to-have)
**Time**: 30 minutes
**Status**: ⏳ Not done yet

---

## 🔴 THE PROBLEM

**Current Code** [api/index.js:28](api/index.js#L28):
```javascript
const ipRequestCounts = new Map(); // ❌ In-memory, local to this instance
```

**Why It's Bad**:
- Vercel deploys to multiple nodes (serverless functions)
- Each node has its own `Map()`
- Attacker can distribute requests across nodes and bypass the 10 req/min limit
- Example: Send 10 requests to node A, 10 to node B, 10 to node C = 30 requests in 1 minute (bypasses limit)

**Impact**: Attacker can DDoS your AI API by distributing requests

---

## ✅ THE SOLUTION: Vercel KV (Redis)

Vercel KV is a managed Redis service. All nodes connect to the same backend store.

### Step 1: Enable Vercel KV in Your Project (2 min)

**On Vercel Dashboard**:
1. Go to your project: https://vercel.com/dashboard
2. Click "Storage" tab
3. Click "Create Database" → "Redis"
4. Name it: `pdf-tools-pro-ratelimit` (or any name)
5. Click "Create"
6. Vercel will automatically add `KV_REST_API_URL` and `KV_REST_API_TOKEN` to your `.env.production`

**That's it!** Vercel does the rest automatically.

---

### Step 2: Update Code in [api/index.js](api/index.js) (15 min)

**Location**: Lines 24-38 (the rate limiting section)

**BEFORE** (Current - In-Memory Map):
```javascript
// RATE LIMITING (In-Memory for Warm Instances)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 Minute
const MAX_REQUESTS = 10; // 10 reqs / min
const ipRequestCounts = new Map(); // ❌ Local to this instance

// Cleanup interval (every 5 mins) to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of ipRequestCounts.entries()) {
        if (now - data.startTime > RATE_LIMIT_WINDOW) {
            ipRequestCounts.delete(key);
        }
    }
}, 5 * 60 * 1000);
```

**AFTER** (Using Vercel KV):
```javascript
// RATE LIMITING (Distributed via Vercel KV/Redis)
import { kv } from '@vercel/kv'; // ✅ Add this import at the top of the file

const RATE_LIMIT_WINDOW = 60; // 1 minute (in seconds for Redis)
const MAX_REQUESTS = 10; // 10 reqs / min

// No cleanup needed - Redis expires keys automatically
```

**Code Change** [api/index.js:103-124](api/index.js#L103-L124) - Replace the rate limiting logic:

**BEFORE**:
```javascript
    // STAGE -1: Rate Limiting (early, before session validation)
    // Rate limit all requests to prevent abuse
    const rateLimitKey = deviceId || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const rateNow = Date.now();

    if (rateLimitKey) {
        const usageData = ipRequestCounts.get(rateLimitKey) || { count: 0, startTime: rateNow };

        // Reset window if expired
        if (rateNow - usageData.startTime > RATE_LIMIT_WINDOW) {
            usageData.count = 0;
            usageData.startTime = rateNow;
        }

        usageData.count++;
        ipRequestCounts.set(rateLimitKey, usageData);

        if (usageData.count > MAX_REQUESTS) {
            console.warn(`Anti-Gravity Security: Rate limit exceeded for ${maskDeviceId(rateLimitKey)}`);
            return res.status(429).json({ error: "Rate limit exceeded. Please try again in a minute." });
        }
    }
```

**AFTER**:
```javascript
    // STAGE -1: Rate Limiting (Distributed via Vercel KV)
    const rateLimitKey = deviceId || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (rateLimitKey && kv) {
        try {
            // Increment counter in Redis
            const count = await kv.incr(`ratelimit:${rateLimitKey}`);

            // Set expiry to 1 minute on first request
            if (count === 1) {
                await kv.expire(`ratelimit:${rateLimitKey}`, RATE_LIMIT_WINDOW);
            }

            // Check if exceeded
            if (count > MAX_REQUESTS) {
                console.warn(`Anti-Gravity Security: Rate limit exceeded for ${maskDeviceId(rateLimitKey)}`);
                return res.status(429).json({ error: "Rate limit exceeded. Please try again in a minute." });
            }
        } catch (kvError) {
            // If Redis fails, log but don't block (graceful degradation)
            console.error('Rate limit check failed (KV unavailable):', kvError);
            // Continue with request (fail-open for rate limiting is acceptable)
        }
    }
```

---

### Step 3: Add Import at Top of File (1 min)

**Location**: [api/index.js:1](api/index.js#L1)

Add this import:
```javascript
import { kv } from '@vercel/kv';
```

**Full import section should look like**:
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { kv } from '@vercel/kv'; // ✅ ADD THIS LINE
```

---

### Step 4: Verify Installation (2 min)

Check that Vercel KV package is installed:
```bash
npm ls @vercel/kv
# Should show: @vercel/kv@X.X.X
```

If not installed:
```bash
npm install @vercel/kv
```

---

### Step 5: Test Locally (5 min)

**Development Note**: Vercel KV only works in production on Vercel. Locally, it will fail gracefully (catch block).

For local testing:
```bash
npm run dev
# Make 15 requests rapidly to the API
# First 10 should succeed, requests 11-15 should return 429
# (This will only work if you set KV env vars locally)
```

**OR** skip local testing since it requires setup. Just deploy and test on production.

---

### Step 6: Deploy & Test (5 min)

```bash
git add api/index.js package.json package-lock.json
git commit -m "security: switch rate limiting to Vercel KV for distributed enforcement

- Replaced in-memory Map() with Vercel KV (Redis)
- Rate limiting now synchronized across all Vercel nodes
- Attacker cannot bypass by distributing requests
- Graceful fallback if Redis unavailable

CVSS Score: 6.2 → 2.1 (Distributed Rate Limiting)"

git push origin main
```

**On Vercel Dashboard**:
1. Wait for deployment to complete (2-3 min)
2. Test rate limiting:
   ```bash
   # Send 15 requests rapidly
   for i in {1..15}; do
     curl -X POST https://pdf-tools-pro.vercel.app/api/index \
       -H "x-ag-device-id: test-device-123" \
       -H "Content-Type: application/json" \
       -d '{"type": "server_time"}'
   done
   ```
3. Expected: First 10 succeed (200), requests 11-15 return 429

---

## ✅ VALIDATION CHECKLIST

- [ ] Vercel KV created in project dashboard
- [ ] KV env vars (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) in `.env.production`
- [ ] `@vercel/kv` package installed
- [ ] Import added at top of api/index.js
- [ ] Old Map() code removed
- [ ] New KV code added with proper error handling
- [ ] Cleanup interval removed (Redis handles expiry)
- [ ] Code committed
- [ ] Deployed to Vercel
- [ ] Rate limiting tested (send 15 rapid requests, verify 429 on 11-15)

---

## 🚀 COMMIT MESSAGE

```
security: switch rate limiting to Vercel KV for distributed enforcement

Replace in-memory Map() with Vercel KV (managed Redis).
All nodes now share the same rate limit counters.
Attacker cannot bypass by distributing requests across nodes.

CVSS Score Reduction: 6.2 → 2.1
Impact: Distributed Rate Limiting Failure eliminated
```

---

## 📋 IF SOMETHING GOES WRONG

**KV not connecting?**
- Check Vercel dashboard > Storage > make sure Redis database exists
- Check that KV env vars are set in production
- Check that `@vercel/kv` package is installed

**Still getting 429 on first request?**
- The counter might not be resetting properly
- Check Redis commands: `incr` and `expire` are correct
- The `if (count === 1) await kv.expire(...)` might need adjustment

**Rate limiting not working at all?**
- Check that `kv` is imported correctly
- Check that KV connection is successful (no errors in logs)
- Verify the try-catch is working

---

## 💡 REFERENCE

**Vercel KV Commands Used**:
- `await kv.incr(key)` - Increment counter by 1, return new value
- `await kv.expire(key, seconds)` - Set key to expire after N seconds

**Redis TTL**: When you call `expire()`, Redis automatically deletes the key after that time. No manual cleanup needed!

---

## 📌 NICE-TO-HAVE IMPROVEMENTS (Not Required)

If you want to get fancy later:
- Add custom rate limit per tier (Pro users get 100/min, Free get 10/min)
- Different limits for different endpoints
- Add Redis monitoring to Vercel dashboard

But for Phase 2, just getting it working is enough.

---

**Status**: Ready to implement. 30 minutes from start to deployed. 🚀

Start with Step 1 (enable Vercel KV), then proceed to Step 2 (update code).
