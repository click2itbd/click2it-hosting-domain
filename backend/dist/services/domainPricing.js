import { getAdminDocument } from '../firebase/admin.js';
export async function getDomainPricingSettings() {
    const publicSettings = await getAdminDocument('settings', 'public_config');
    const privateSettings = await getAdminDocument('settings', 'api_keys');
    const settings = { ...(privateSettings.data || {}), ...(publicSettings.data || {}) };
    const usdToBdtRate = Number(settings.usdToBdtRate) || 123;
    const markupPercent = Number.isFinite(Number(settings.domainMarkupPercent)) ? Number(settings.domainMarkupPercent) : 15;
    return { usdToBdtRate, markupPercent };
}
export function calculateCustomerPriceBdt(supplierPriceUsd, settings) {
    const retailUsd = supplierPriceUsd * (1 + settings.markupPercent / 100);
    return Math.round(retailUsd * settings.usdToBdtRate);
}
