import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../api/index.js', import.meta.url), 'utf8');
const secret = 'synthetic-signing-secret';
const receipt = 'synthetic-private-receipt';
const baseTime = Date.UTC(2026, 10, 24, 17, 30);

async function setup({ account = 'synthetic-user', purchaseState, auditCode, clock = { now: baseTime } } = {}) {
    const calls = { play: 0, email: [], logs: [], grants: 0 };
    const authenticate = purpose => {
        const json = JSON.stringify({ uid: account, is_auth: true, exp: clock.now + 60000, purpose });
        return Buffer.from(json).toString('base64') + '.' + crypto.createHmac('sha256', secret).update(json).digest('hex');
    };
    const db = { from: () => ({
        select() { return this; }, eq() { return this; }, gt() { return this; },
        async maybeSingle() { return { data: { user_uid: account } }; },
        async insert() { return { error: auditCode ? { code: auditCode, message: receipt } : null }; },
        async upsert() { calls.grants++; return {}; },
        update() { return this; }
    }) };
    const imports = {
        crypto: { default: crypto },
        resend: { Resend: class {} },
        '@google/generative-ai': { GoogleGenerativeAI: class {} },
        '@supabase/supabase-js': { createClient: () => db },
        googleapis: { google: { auth: { GoogleAuth: class {} }, androidpublisher: () => ({
            purchases: { products: { async get({ token }) {
                calls.play++;
                if (purchaseState === undefined) throw Object.assign(new Error(token), { response: { status: 400 } });
                return { data: { purchaseState, acknowledgementState: 1 } };
            } } }
        }) } }
    };
    const context = vm.createContext({
        Buffer, Date: class extends Date { static now() { return clock.now; } },
        setTimeout: (...args) => setTimeout(...args).unref(),
        console: Object.fromEntries(['log', 'warn', 'error'].map(level => [level, (...args) => calls.logs.push(args)])),
        process: { env: { NODE_ENV: 'production', AG_PROTOCOL_SIGNATURE: secret, GOOGLE_SERVICE_ACCOUNT_JSON: '{}',
            SUPABASE_URL: 'https://database.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic', RESEND_API_KEY: 'synthetic' } },
        async fetch(url, opts) {
            assert.equal(url, 'https://api.resend.com/emails');
            calls.email.push({ key: opts.headers['Idempotency-Key'], body: JSON.parse(opts.body) });
            return { ok: true };
        }
    });
    const mod = new vm.SourceTextModule(source, { context, importModuleDynamically: async name => {
        assert.equal(name, 'node:crypto');
        return import(name);
    } });
    await mod.link(name => {
        const values = imports[name];
        return new vm.SyntheticModule(Object.keys(values), function () {
            for (const [key, value] of Object.entries(values)) this.setExport(key, value);
        }, { context });
    });
    await mod.evaluate();
    return { calls, async verify(token = receipt) {
        const req = { method: 'POST', headers: { authorization: 'Bearer ' + authenticate(), 'x-csrf-token': authenticate('csrf'),
            'x-ag-device-id': 'synthetic-device', 'x-ag-timestamp': String(clock.now), origin: 'capacitor://localhost' },
        body: { type: 'verify_purchase', productId: 'lifetime_pro_access', purchaseToken: token, transactionId: token } };
        const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
        await mod.namespace.default(req, res);
        return res;
    } };
}

test('repeat failures and bursts of different tokens produce one redacted alert and still verify each request', async () => {
    const f = await setup();
    const results = await Promise.all([f.verify(), f.verify(), f.verify('other-private-receipt')]);
    assert.ok(results.every(r => r.code === 402 && r.body.error === 'PURCHASE_NOT_VALID'));
    assert.equal(f.calls.play, 3);
    assert.equal(f.calls.grants, 0);
    assert.equal(f.calls.email.length, 1);
    assert.match(f.calls.email[0].body.html, /Payment status is unknown/);
    assert.doesNotMatch(JSON.stringify([f.calls.email, f.calls.logs]), /synthetic-private-receipt|other-private-receipt/);
});

test('fresh Vercel instances use the same Resend key and body for the same account and hour', async () => {
    const a = await setup(), b = await setup(), c = await setup({ account: 'other-account' });
    await a.verify(); await b.verify('other-private-receipt'); await c.verify();
    assert.deepEqual(a.calls.email[0], b.calls.email[0]);
    assert.notEqual(a.calls.email[0].key, c.calls.email[0].key);
});

test('pending, successful, duplicate and audit-error paths preserve status and do not leak the receipt', async () => {
    for (const [opts, status, grants, emails] of [
        [{ purchaseState: 2 }, 202, 0, 1],
        [{ purchaseState: 0 }, 200, 1, 1],
        [{ purchaseState: 0, auditCode: '23505' }, 409, 0, 0],
        [{ purchaseState: 0, auditCode: 'XX000' }, 500, 0, 1]
    ]) {
        const f = await setup(opts);
        assert.equal((await f.verify()).code, status);
        assert.equal(f.calls.grants, grants);
        assert.equal(f.calls.email.length, emails);
        assert.doesNotMatch(JSON.stringify([f.calls.email, f.calls.logs]), /synthetic-private-receipt/);
    }
});
