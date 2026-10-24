import crypto from 'crypto';
import { getAdminDocument, setAdminDocument } from '../firebase/admin.js';

/**
 * EPS (Easy Payment System, Bangladesh) gateway client.
 *
 * Flow: GetToken -> InitializeEPS (redirect customer) -> customer returns -> server-side
 * status verification (never trust the browser redirect).
 *
 * Credentials live in the admin-only Firestore doc `settings/keys` under the `eps` field
 * and are never sent back to the browser (only masked flags are).
 */

export interface EpsConfig {
  enabled: boolean;
  mode: 'sandbox' | 'live';
  userName: string;
  password: string;
  hashKey: string;
  storeId: string;
  merchantId: string;
  sandboxBaseUrl: string;
  liveBaseUrl: string;
  frontendUrl: string;
}

const DEFAULTS: EpsConfig = {
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

export const EPS_SECRET_FIELDS = ['password', 'hashKey'] as const;
const EPS_ALL_FIELDS = Object.keys(DEFAULTS) as (keyof EpsConfig)[];

export async function getEpsConfig(): Promise<EpsConfig> {
  const res: any = await getAdminDocument('settings', 'keys').catch(() => ({ data: {} }));
  const stored = (res?.data?.eps || {}) as Partial<EpsConfig>;
  const cfg: EpsConfig = { ...DEFAULTS, ...stored };
  cfg.enabled = cfg.enabled === true;
  cfg.mode = cfg.mode === 'live' ? 'live' : 'sandbox';
  return cfg;
}

/** Save config. Empty / omitted secret fields keep their stored value. */
export async function saveEpsConfig(input: Record<string, any>): Promise<void> {
  const res: any = await getAdminDocument('settings', 'keys').catch(() => ({ data: {} }));
  const all = res?.data || {};
  const current = (all.eps || {}) as Record<string, any>;
  const next: Record<string, any> = { ...current };

  for (const key of EPS_ALL_FIELDS) {
    if (!(key in input)) continue;
    const value = input[key];
    if ((EPS_SECRET_FIELDS as readonly string[]).includes(key) && (value === '' || value == null)) continue;
    if (key === 'enabled') next[key] = value === true;
    else if (key === 'mode') next[key] = value === 'live' ? 'live' : 'sandbox';
    else next[key] = typeof value === 'string' ? value.trim() : value;
  }

  await setAdminDocument('settings', 'keys', { ...all, eps: next });
}

export function maskEpsConfig(cfg: EpsConfig) {
  const out: Record<string, any> = { ...cfg };
  for (const f of EPS_SECRET_FIELDS) out[f] = ''; 
  out.hasPassword = Boolean(cfg.password);
  out.hasHashKey = Boolean(cfg.hashKey);
  return out;
}

export function isEpsConfigured(cfg: EpsConfig): boolean {
  return Boolean(cfg.userName && cfg.password && cfg.hashKey && cfg.storeId);
}

function baseUrl(cfg: EpsConfig): string {
  return (cfg.mode === 'live' ? cfg.liveBaseUrl : cfg.sandboxBaseUrl).replace(/\/+$/, '');
}

/** x-hash = Base64( HMAC-SHA512( key = hashKey, data = value ) ) */
export function epsHash(hashKey: string, value: string): string {
  return crypto.createHmac('sha512', hashKey).update(value, 'utf8').digest('base64');
}

async function epsFetch(cfg: EpsConfig, method: 'GET' | 'POST', path: string, headers: Record<string, string>, body?: any) {
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
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    return { ok: response.ok, status: response.status, json, text };
  } finally {
    clearTimeout(timer);
  }
}

const pick = (obj: any, ...keys: string[]) => {
  if (!obj) return undefined;
  for (const k of keys) {
    const found = Object.keys(obj).find((x) => x.toLowerCase() === k.toLowerCase());
    if (found && obj[found] != null && obj[found] !== '') return obj[found];
  }
  return undefined;
};

let tokenCache: { token: string; exp: number; key: string } | null = null;

export async function getEpsToken(cfg: EpsConfig, force = false): Promise<string> {
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

export async function testEpsConnection(cfg: EpsConfig): Promise<{ success: boolean; message: string }> {
  if (!isEpsConfigured(cfg)) {
    return { success: false, message: 'Username, password, hash key and store ID are required.' };
  }
  try {
    await getEpsToken(cfg, true);
    return { success: true, message: `Connected to EPS (${cfg.mode}). Authentication token received.` };
  } catch (e: any) {
    return { success: false, message: e?.message || 'EPS connection failed' };
  }
}

export interface EpsInitInput {
  merchantTransactionId: string;
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  customerPostcode?: string;
  customerCountry?: string;
  productName: string;
  itemCount: number;
  ipAddress?: string;
  frontendUrl: string;
}

export async function initializeEpsPayment(cfg: EpsConfig, input: EpsInitInput): Promise<{ redirectUrl: string; transactionId?: string }> {
  const token = await getEpsToken(cfg);
  const ret = (result: string) =>
    `${input.frontendUrl.replace(/\/+$/, '')}/payment/eps-return?orderId=${encodeURIComponent(input.orderId)}&result=${result}`;

  const r = await epsFetch(
    cfg,
    'POST',
    '/v1/EPSEngine/InitializeEPS',
    { 'x-hash': epsHash(cfg.hashKey, input.merchantTransactionId), Authorization: `Bearer ${token}` },
    {
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
    }
  );

  const redirectUrl = pick(r.json, 'RedirectURL');
  if (!r.ok || !redirectUrl) {
    const msg = pick(r.json, 'ErrorMessage', 'message') || `HTTP ${r.status}`;
    throw new Error(`EPS initialization failed: ${msg}`);
  }
  return { redirectUrl, transactionId: pick(r.json, 'TransactionId') };
}

export interface EpsVerifyResult {
  paid: boolean;
  status: string;
  amount?: number;
  epsTransactionId?: string;
  raw: any;
}

export async function verifyEpsPayment(cfg: EpsConfig, merchantTransactionId: string): Promise<EpsVerifyResult> {
  const token = await getEpsToken(cfg);
  const r = await epsFetch(
    cfg,
    'GET',
    `/v1/EPSEngine/CheckMerchantTransactionStatus?merchantTransactionId=${encodeURIComponent(merchantTransactionId)}`,
    { 'x-hash': epsHash(cfg.hashKey, merchantTransactionId), Authorization: `Bearer ${token}` }
  );
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
