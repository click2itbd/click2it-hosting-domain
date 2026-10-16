import { getAdminDocument } from '../firebase/admin.js';

export interface PricingSettings {
  usdToBdtRate: number;
  markupPercent: number;
}

export async function getDomainPricingSettings(): Promise<PricingSettings> {
  const publicSettings = await getAdminDocument('settings', 'public_config');
  const privateSettings = await getAdminDocument('settings', 'api_keys');
  const settings = { ...(privateSettings.data || {}), ...(publicSettings.data || {}) };
  const usdToBdtRate = Number(settings.usdToBdtRate) || 123;
  const markupPercent = Number.isFinite(Number(settings.domainMarkupPercent)) ? Number(settings.domainMarkupPercent) : 15;

  return { usdToBdtRate, markupPercent };
}

export function calculateCustomerPriceBdt(supplierPriceUsd: number, settings: PricingSettings): number {
  const retailUsd = supplierPriceUsd * (1 + settings.markupPercent / 100);
  return Math.round(retailUsd * settings.usdToBdtRate);
}
