import { getAdminDb } from '../firebase/admin.js';
import { getDomainProvider } from '../providers/providerFactory.js';
import { BtclDomainProvider, DEFAULT_BTCL_CONFIG, isBdDomain, } from '../providers/domain/BtclDomainProvider.js';
// NOTE: deliberately NOT under `settings/` - firestore.rules makes settings/* publicly readable.
// `private_config` has no client rule => default deny; only the backend Admin SDK can access it.
const COLLECTION = 'private_config';
const DOC_ID = 'btcl_config';
/** Reads BTCL config via Admin SDK (never exposed to the browser - see firestore.rules). */
export async function getBtclConfig() {
    try {
        const snap = await getAdminDb().collection(COLLECTION).doc(DOC_ID).get();
        if (!snap.exists)
            return { ...DEFAULT_BTCL_CONFIG };
        const data = snap.data();
        return {
            ...DEFAULT_BTCL_CONFIG,
            ...data,
            endpoints: { ...DEFAULT_BTCL_CONFIG.endpoints, ...(data.endpoints || {}) },
        };
    }
    catch (e) {
        console.warn('[BTCL] Failed to read btcl_config:', e);
        return { ...DEFAULT_BTCL_CONFIG };
    }
}
export async function saveBtclConfig(incoming) {
    const current = await getBtclConfig();
    const merged = {
        ...current,
        ...incoming,
        // Keep existing secrets when the UI sends a masked / empty value
        apiKey: incoming.apiKey ? incoming.apiKey : current.apiKey,
        password: incoming.password ? incoming.password : current.password,
        endpoints: { ...current.endpoints, ...(incoming.endpoints || {}) },
    };
    await getAdminDb().collection(COLLECTION).doc(DOC_ID).set({ ...merged, updatedAt: new Date().toISOString() });
}
/** Secrets replaced with booleans so they can safely be sent to the admin UI. */
export function maskBtclConfig(cfg) {
    const { apiKey, password, ...rest } = cfg;
    return { ...rest, hasApiKey: !!apiKey, hasPassword: !!password };
}
export async function isBtclEnabled() {
    const cfg = await getBtclConfig();
    return !!(cfg.enabled && cfg.baseUrl);
}
/**
 * Picks the right registrar for a domain: `.bd` -> BTCL (when enabled and
 * configured), everything else -> the default provider (Openprovider).
 * Returns `viaBtcl` so callers can tell whether the BTCL API handled it.
 */
export async function resolveDomainProvider(domain, defaultConfig) {
    if (isBdDomain(domain)) {
        const cfg = await getBtclConfig();
        if (cfg.enabled && cfg.baseUrl) {
            return { provider: new BtclDomainProvider(cfg), viaBtcl: true };
        }
    }
    return { provider: getDomainProvider(defaultConfig), viaBtcl: false };
}
