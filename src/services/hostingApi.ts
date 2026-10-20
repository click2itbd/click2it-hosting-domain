export interface DomainAvailabilityResult {
  domain: string;
  available: boolean;
  price?: number;
  priceBdt?: number;
  originalPrice?: number;
  currency?: string;
  renewalPrice?: number;
  error?: string;
  status?: string;
}

export interface DomainSuggestionResult {
  suggestions: string[];
}

export interface DomainPricing {
  tld: string;
  registerPrice: number;
  renewPrice: number;
  transferPrice: number;
  currency: string;
  isActive: boolean;
}

import { resolveApiBaseUrl } from './apiClient';
import { auth } from '../firebase';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cleanBase = resolveApiBaseUrl();
  let cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (cleanBase.endsWith('/api') && cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.slice(4);
  }

  const url = `${cleanBase}${cleanPath}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (!headers['Authorization'] && typeof window !== 'undefined' && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // ignore
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  const abortListener = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', abortListener, { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const rawText = await response.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Non-JSON response (status ${response.status})`);
    }

    if (!response.ok) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
    if (options.signal) {
      options.signal.removeEventListener('abort', abortListener);
    }
  }
}

let domainPricingCache: { expiresAt: number; data: DomainPricing[] } | null = null;
let domainPricingRequest: Promise<DomainPricing[]> | null = null;

export const FALLBACK_TLD_PRICING: DomainPricing[] = [
  { tld: '.com', registerPrice: 1450, renewPrice: 1450, transferPrice: 1450, currency: 'BDT', isActive: true },
  { tld: '.net', registerPrice: 1650, renewPrice: 1650, transferPrice: 1650, currency: 'BDT', isActive: true },
  { tld: '.org', registerPrice: 1550, renewPrice: 1550, transferPrice: 1550, currency: 'BDT', isActive: true },
  { tld: '.xyz', registerPrice: 350, renewPrice: 1250, transferPrice: 1250, currency: 'BDT', isActive: true },
  { tld: '.bd', registerPrice: 1800, renewPrice: 1800, transferPrice: 1800, currency: 'BDT', isActive: true },
  { tld: '.info', registerPrice: 1250, renewPrice: 1850, transferPrice: 1850, currency: 'BDT', isActive: true },
  { tld: '.biz', registerPrice: 1350, renewPrice: 1750, transferPrice: 1750, currency: 'BDT', isActive: true },
  { tld: '.store', registerPrice: 450, renewPrice: 3200, transferPrice: 3200, currency: 'BDT', isActive: true },
  { tld: '.co', registerPrice: 2200, renewPrice: 2800, transferPrice: 2800, currency: 'BDT', isActive: true },
  { tld: '.io', registerPrice: 4800, renewPrice: 4800, transferPrice: 4800, currency: 'BDT', isActive: true },
  { tld: '.dev', registerPrice: 1950, renewPrice: 1950, transferPrice: 1950, currency: 'BDT', isActive: true },
  { tld: '.online', registerPrice: 450, renewPrice: 2600, transferPrice: 2600, currency: 'BDT', isActive: true },
  { tld: '.site', registerPrice: 450, renewPrice: 2500, transferPrice: 2500, currency: 'BDT', isActive: true },
  { tld: '.tech', registerPrice: 650, renewPrice: 3200, transferPrice: 3200, currency: 'BDT', isActive: true },
  { tld: '.app', registerPrice: 1950, renewPrice: 1950, transferPrice: 1950, currency: 'BDT', isActive: true },
  { tld: '.ai', registerPrice: 8500, renewPrice: 8500, transferPrice: 8500, currency: 'BDT', isActive: true },
  { tld: '.shop', registerPrice: 550, renewPrice: 3400, transferPrice: 3400, currency: 'BDT', isActive: true },
  { tld: '.me', registerPrice: 1450, renewPrice: 2200, transferPrice: 2200, currency: 'BDT', isActive: true },
  { tld: '.pro', registerPrice: 1200, renewPrice: 1800, transferPrice: 1800, currency: 'BDT', isActive: true },
  { tld: '.live', registerPrice: 650, renewPrice: 2800, transferPrice: 2800, currency: 'BDT', isActive: true },
  { tld: '.cloud', registerPrice: 1350, renewPrice: 2400, transferPrice: 2400, currency: 'BDT', isActive: true },
  { tld: '.digital', registerPrice: 950, renewPrice: 2700, transferPrice: 2700, currency: 'BDT', isActive: true },
  { tld: '.space', registerPrice: 450, renewPrice: 2500, transferPrice: 2500, currency: 'BDT', isActive: true },
  { tld: '.agency', registerPrice: 1850, renewPrice: 2900, transferPrice: 2900, currency: 'BDT', isActive: true },
  { tld: '.link', registerPrice: 750, renewPrice: 1850, transferPrice: 1850, currency: 'BDT', isActive: true },
];


export async function checkDomainAvailability(domains: string[]): Promise<DomainAvailabilityResult[]> {
  const response = await apiRequest<{ success: boolean; data: DomainAvailabilityResult[]; error?: string }>('/api/domains/check', {
    method: 'POST',
    body: JSON.stringify({ domains }),
  });
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error(response.error || 'Openprovider domain availability is unavailable.');
  }
  return response.data;
}

export async function getDomainSuggestions(domain: string): Promise<string[]> {
  const response = await apiRequest<{ success: boolean; data: string[] }>('/api/domains/suggestions', {
    method: 'POST',
    body: JSON.stringify({ domain }),
  });
  return response.data || [];
}

export async function submitDomainOffer(data: {
  domain: string;
  amount: number;
  email: string;
  phone: string;
}): Promise<{ success: boolean; message?: string }> {
  const response = await apiRequest<{ success: boolean; message?: string; error?: string }>('/api/domains/offers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

export async function getDomainPricing(): Promise<DomainPricing[]> {
  if (domainPricingCache && domainPricingCache.expiresAt > Date.now()) {
    return [...domainPricingCache.data];
  }
  if (domainPricingRequest) {
    return domainPricingRequest.then(data => [...data]);
  }

  domainPricingRequest = (async () => {
    try {
      const response = await apiRequest<{ success: boolean; data: DomainPricing[]; error?: string }>('/api/domains/pricing');
      if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
        domainPricingCache = { expiresAt: Date.now() + 5 * 60_000, data: response.data };
        return response.data;
      }
    } catch (err) {
      console.warn('[DomainPricing] Failed to fetch live domain pricing:', err);
    }

    return FALLBACK_TLD_PRICING;
  })();

  try {
    return [...await domainPricingRequest];
  } finally {
    domainPricingRequest = null;
  }
}

export interface HostingUsageStats {
  providerAccountId: string;
  diskUsageMB: number;
  diskLimitMB: number;
  bandwidthUsageMB: number;
  bandwidthLimitMB: number;
  cpuUsagePercent?: number;
  ramUsageMB?: number;
  lastUpdated: string;
}

export async function getHostingUsage(providerAccountId: string): Promise<HostingUsageStats> {
  const res = await apiRequest<{ success: boolean; data: HostingUsageStats }>('/api/hosting/usage', {
    method: 'POST',
    body: JSON.stringify({ providerAccountId }),
  });
  if (!res.success) {
    throw new Error('Failed to get hosting usage');
  }
  return res.data;
}

export interface HostingPriceValidationResult {
  success: boolean;
  planId: string;
  billingCycle: string;
  licenseCostUsd: number;
  exchangeRate: number;
  markupPercent: number;
  calculatedMonthly: number;
  finalPrice: number;
  currency: string;
}

export async function validateHostingPrice(planId: string, billingCycle: string, licenseCostUsd: number): Promise<HostingPriceValidationResult> {
  const response = await apiRequest<{ success: boolean; data: HostingPriceValidationResult }>('/api/hosting/validate-price', {
    method: 'POST',
    body: JSON.stringify({ planId, billingCycle, licenseCostUsd }),
  });
  return response.data;
}

export async function testHostingConnection(): Promise<{ success: boolean; code: string; message: string }> {
  const response = await apiRequest<{ success: boolean; code: string; message: string }>('/api/hosting/test-connection', {
    method: 'POST',
  });
  return response;
}

export async function provisionHostingAccount(params: {
  domain: string;
  contactEmail: string;
  billingCycle: string;
  planCode?: string;
  idempotencyKey?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const response = await apiRequest<{ success: boolean; data?: any; error?: string }>('/api/hosting/provision', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return response;
}

export async function suspendHostingAccount(providerAccountId: string): Promise<{ success: boolean; error?: string }> {
  const response = await apiRequest<{ success: boolean; error?: string }>('/api/hosting/suspend', {
    method: 'POST',
    body: JSON.stringify({ providerAccountId }),
  });
  return response;
}

export async function unsuspendHostingAccount(providerAccountId: string): Promise<{ success: boolean; error?: string }> {
  const response = await apiRequest<{ success: boolean; error?: string }>('/api/hosting/unsuspend', {
    method: 'POST',
    body: JSON.stringify({ providerAccountId }),
  });
  return response;
}

export async function terminateHostingAccount(providerAccountId: string): Promise<{ success: boolean; error?: string }> {
  const response = await apiRequest<{ success: boolean; error?: string }>('/api/hosting/terminate', {
    method: 'POST',
    body: JSON.stringify({ providerAccountId }),
  });
  return response;
}

export async function changeHostingPlan(providerAccountId: string, newPlanCode: string): Promise<{ success: boolean; error?: string }> {
  const response = await apiRequest<{ success: boolean; error?: string }>('/api/hosting/change-package', {
    method: 'POST',
    body: JSON.stringify({ providerAccountId, newPlanCode }),
  });
  return response;
}
