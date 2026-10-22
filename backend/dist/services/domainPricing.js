import { getAdminDocument } from '../firebase/admin.js';
let cachedPricingSettings = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes in-memory cache
export function invalidateDomainPricingSettingsCache() {
    cachedPricingSettings = null;
}
export async function getDomainPricingSettings(forceFresh = false) {
    if (!forceFresh && cachedPricingSettings && Date.now() < cachedPricingSettings.expiresAt) {
        return cachedPricingSettings.data;
    }
    try {
        const publicSettings = await getAdminDocument('settings', 'public_config');
        const privateSettings = await getAdminDocument('settings', 'api_keys');
        const settings = { ...(privateSettings.data || {}), ...(publicSettings.data || {}) };
        const usdToBdtRate = Number(settings.usdToBdtRate) || 123;
        const markupPercent = Number.isFinite(Number(settings.domainMarkupPercent)) ? Number(settings.domainMarkupPercent) : 15;
        const data = { usdToBdtRate, markupPercent };
        cachedPricingSettings = { data, expiresAt: Date.now() + CACHE_TTL_MS };
        return data;
    }
    catch {
        if (cachedPricingSettings) {
            return cachedPricingSettings.data;
        }
        return { usdToBdtRate: 123, markupPercent: 15 };
    }
}
export function calculateCustomerPriceBdt(supplierPriceUsd, settings) {
    const retailUsd = supplierPriceUsd * (1 + settings.markupPercent / 100);
    return Math.round(retailUsd * settings.usdToBdtRate);
}
