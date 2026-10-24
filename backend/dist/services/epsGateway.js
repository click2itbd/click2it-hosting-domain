import crypto from 'crypto';
import { getAdminDocument, setAdminDocument } from '../firebase/admin.js';
const DEFAULTS = {
    enabled: false,
    mode: 'sandbox',
    userName: '',
    password: '',
    hashKey: '',
    storeId: '',
    merchantId: '',
    sandboxBaseUrl: 'https://sandboxpgapi.eps.com.bd',
    liveBaseUrl: 'https://pgapi.eps.com.bd',
    frontendUrl: '',
};
export const EPS_SECRET_FIELDS = ['password', 'hashKey'];
const EPS_ALL_FIELDS = Object.keys(DEFAULTS);
export async function getEpsConfig() {
    const res = await getAdminDocument('settings', 'keys').catch(() => ({ data: {} }));
    const stored = (res?.data?.eps || {});
    const cfg = { ...DEFAULTS, ...stored };
    cfg.enabled = cfg.enabled === true;
    cfg.mode = cfg.mode === 'live' ? 'live' : 'sandbox';
    return cfg;
}
/** Save config. Empty / omitted secret fields keep their stored value. */
export async function saveEpsConfig(input) {
    const res = await getAdminDocument('settings', 'keys').catch(() => ({ data: {} }));
    const all = res?.data || {};
    const current = (all.eps || {});
    const next = { ...current };
    for (const key of EPS_ALL_FIELDS) {
        if (!(key in input))
            continue;
        const value = input[key];
        if (EPS_SECRET_FIELDS.includes(key) && (value === '' || value == null))
            continue;
        if (key === 'enabled')
            next[key] = value === true;
        else if (key === 'mode')
            next[key] = value === 'live' ? 'live' : 'sandbox';
        else
            next[key] = typeof value === 'string' ? value.trim() : value;
    }
    await setAdminDocument('settings', 'keys', { ...all, eps: next });
}
export function maskEpsConfig(cfg) {
    const out = { ...cfg };
    for (const f of EPS_SECRET_FIELDS)
        out[f] = '';
    out.hasPassword = Boolean(cfg.password);
    out.hasHashKey = Boolean(cfg.hashKey);
    return out;
}
export function isEpsConfigured(cfg) {
    return Boolean(cfg.userName && cfg.password && cfg.hashKey && cfg.storeId);
}
function baseUrl(cfg) {
    return (cfg.mode === 'live' ? cfg.liveBaseUrl : cfg.sandboxBaseUrl).replace(/\/+$/, '');
}
/** x-hash = Base64( HMAC-SHA512( key = hashKey, data = value ) ) */
export function epsHash(hashKey, value) {
    return crypto.createHmac('sha512', hashKey).update(value, 'utf8').digest('base64');
}
async function epsFetch(cfg, method, path, headers, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch(`${baseUrl(cfg)}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });
        const text = await response.text();
        let json = null;
        try {
            json = text ? JSON.parse(text) : null;
        }
        catch { /* non-JSON */ }
        return { ok: response.ok, status: response.status, json, text };
    }
    finally {
        clearTimeout(timer);
    }
}
const pick = (obj, ...keys) => {
    if (!obj)
        return undefined;
    for (const k of keys) {
        const found = Object.keys(obj).find((x) => x.toLowerCase() === k.toLowerCase());
        if (found && obj[found] != null && obj[found] !== '')
            return obj[found];
    }
    return undefined;
};
let tokenCache = null;
export async function getEpsToken(cfg, force = false) {
    const cacheKey = `${cfg.mode}:${cfg.userName}`;
    if (!force && tokenCache && tokenCache.key === cacheKey && tokenCache.exp > Date.now() + 30_000) {
        return tokenCache.token;
    }
    const r = await epsFetch(cfg, 'POST', '/v1/Auth/GetToken', { 'x-hash': epsHash(cfg.hashKey, cfg.userName) }, {
        userName: cfg.userName,
        password: cfg.password,
    });
    const token = pick(r.json, 'token');
    if (!r.ok || !token) {
        const msg = pick(r.json, 'errorMessage', 'message') || `HTTP ${r.status}`;
        throw new Error(`EPS authentication failed: ${msg}`);
    }
    const expRaw = pick(r.json, 'expireDate');
    const exp = expRaw ? new Date(expRaw).getTime() : Date.now() + 10 * 60_000;
    tokenCache = { token, exp: Number.isFinite(exp) ? exp : Date.now() + 10 * 60_000, key: cacheKey };
    return token;
}
export async function testEpsConnection(cfg) {
    if (!isEpsConfigured(cfg)) {
        return { success: false, message: 'Username, password, hash key and store ID are required.' };
    }
    try {
        await getEpsToken(cfg, true);
        return { success: true, message: `Connected to EPS (${cfg.mode}). Authentication token received.` };
    }
    catch (e) {
        return { success: false, message: e?.message || 'EPS connection failed' };
    }
}
export async function initializeEpsPayment(cfg, input) {
    const token = await getEpsToken(cfg);
    const ret = (result) => `${input.frontendUrl.replace(/\/+$/, '')}/payment/eps-return?orderId=${encodeURIComponent(input.orderId)}&result=${result}`;
    const r = await epsFetch(cfg, 'POST', '/v1/EPSEngine/InitializeEPS', { 'x-hash': epsHash(cfg.hashKey, input.merchantTransactionId), Authorization: `Bearer ${token}` }, {
        storeId: cfg.storeId,
        merchantTransactionId: input.merchantTransactionId,
        CustomerOrderId: input.orderId,
        transactionTypeId: 1,
        financialEntityId: 0,
        transitionStatusId: 0,
        totalAmount: Number(input.amount.toFixed(2)),
        ipAddress: input.ipAddress || '127.0.0.1',
        version: '1',
        successUrl: ret('success'),
        failUrl: ret('failed'),
        cancelUrl: ret('cancelled'),
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        CustomerAddress: input.customerAddress || 'Dhaka',
        CustomerAddress2: '',
        CustomerCity: input.customerCity || 'Dhaka',
        CustomerState: input.customerState || 'Dhaka',
        CustomerPostcode: input.customerPostcode || '1200',
        CustomerCountry: input.customerCountry || 'BD',
        CustomerPhone: input.customerPhone,
        ShipmentName: input.customerName,
        ShipmentAddress: input.customerAddress || 'Dhaka',
        ShipmentAddress2: '',
        ShipmentCity: input.customerCity || 'Dhaka',
        ShipmentState: input.customerState || 'Dhaka',
        ShipmentPostcode: input.customerPostcode || '1200',
        ShipmentCountry: input.customerCountry || 'BD',
        ValueA: input.orderId,
        ValueB: '',
        ValueC: '',
        ValueD: '',
        ShippingMethod: 'NO',
        NoOfItem: String(input.itemCount || 1),
        ProductName: input.productName.slice(0, 100),
        ProductProfile: 'general',
        ProductCategory: 'Service',
    });
    const redirectUrl = pick(r.json, 'RedirectURL');
    if (!r.ok || !redirectUrl) {
        const msg = pick(r.json, 'ErrorMessage', 'message') || `HTTP ${r.status}`;
        throw new Error(`EPS initialization failed: ${msg}`);
    }
    return { redirectUrl, transactionId: pick(r.json, 'TransactionId') };
}
export async function verifyEpsPayment(cfg, merchantTransactionId) {
    const token = await getEpsToken(cfg);
    const r = await epsFetch(cfg, 'GET', `/v1/EPSEngine/CheckMerchantTransactionStatus?merchantTransactionId=${encodeURIComponent(merchantTransactionId)}`, { 'x-hash': epsHash(cfg.hashKey, merchantTransactionId), Authorization: `Bearer ${token}` });
    if (!r.ok) {
        throw new Error(`EPS verification failed: ${pick(r.json, 'ErrorMessage', 'message') || `HTTP ${r.status}`}`);
    }
    const status = String(pick(r.json, 'Status') || '').trim();
    const amountRaw = pick(r.json, 'TotalAmount', 'Amount');
    return {
        paid: status.toLowerCase() === 'success',
        status: status || 'Unknown',
        amount: amountRaw !== undefined ? Number(amountRaw) : undefined,
        epsTransactionId: pick(r.json, 'EPSTransactionId', 'TransactionId'),
        raw: r.json,
    };
}
