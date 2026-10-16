// @ts-nocheck
/**
 * Domain API Service
 * Calls backend Express API for domain operations.
 * Never exposes Openprovider API key, wholesale prices, exchange rate, or markup to frontend.
 */

import { resolveApiBaseUrl } from './apiClient';

type CacheEntry<T> = { value: T; expires: number };
const pricingCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = pricingCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    pricingCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache<T>(key: string, value: T): void {
  pricingCache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

const inFlightRequests = new Map<string, Promise<any>>();

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
    ...(options.headers || {}),
  };

  if (!headers['Authorization'] && typeof window !== 'undefined' && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // ignore
    }
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
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
  } catch (error: any) {
    throw error;
  }
}

export interface DomainAvailabilityResponse {
  domain: string;
  available: boolean;
  price?: number;
  priceBdt?: number;
  currency?: string;
  renewalPrice?: number;
  error?: string;
  status?: string;
}

export interface TldPricingResponse {
  tld: string;
  currency: string;
  registrationPrice: number;
  renewalPrice: number;
  transferPrice: number;
  restorePrice: number;
}

export const getTldPricing = async (tld: string): Promise<TldPricingResponse> => {
  const cleanTld = String(tld || '').replace(/^\./, '').toLowerCase();

  const response = await apiRequest<{ success: boolean; data: TldPricingResponse }>('/api/domains/tld-pricing', {
    method: 'POST',
    body: JSON.stringify({ tld: cleanTld }),
  });
  
  if (response.success && response.data) {
    return response.data;
  }

  throw new Error(`Pricing for .${cleanTld} is currently unavailable.`);
};

export interface BatchTldPricingItem {
  tld: string;
  customerPriceBdt: number;
  currency: string;
}

export interface BatchTldPricingResponse {
  pricing: BatchTldPricingItem[];
  failed?: Array<{ tld: string; error: string }>;
}

export interface BatchTldPricingApiResponse {
  success: boolean;
  data?: BatchTldPricingResponse;
  error?: string;
  failed?: Array<{ tld: string; error: string }>;
}

export const getBatchTldPricing = async (tlds: string[]): Promise<BatchTldPricingResponse> => {
  try {
    const response = await apiRequest<BatchTldPricingApiResponse>('/api/domains/tld-pricing-batch', {
      method: 'POST',
      body: JSON.stringify({ tlds }),
    });
    
    if (response.success && response.data?.pricing?.length > 0) {
      return response.data;
    } else {
      throw new Error(response.error || 'Failed to fetch batch TLD pricing');
    }
  } catch (error: any) {
    console.error('Domain batch TLD pricing error:', error?.code || error?.message || error);
    throw new Error(error.message || 'Domain pricing is temporarily unavailable. Please try again shortly.');
  }
};

export const searchDomain = async (domain: string): Promise<DomainAvailabilityResponse> => {
  try {
    const response = await apiRequest<{ success: boolean; data: DomainAvailabilityResponse[] }>('/api/domains/check', {
      method: 'POST',
      body: JSON.stringify({ domains: [domain] }),
    });
    
    const data = response.data?.[0];
    if (!data) {
      throw new Error('Domain search failed, please try again.');
    }
    
    return data;
  } catch (error) {
    console.error('Domain search error:', error);
    throw new Error('Domain search failed, please try again.');
  }
};

export interface DomainRenewalPriceResponse {
  domain: string;
  tld: string;
  renewalPriceBdt: number;
  maxDuration: number;
  discountPercent?: number;
}

export const getDomainRenewalPrice = async (domain: string): Promise<DomainRenewalPriceResponse> => {
  try {
    const response = await apiRequest<{ success: boolean; data: DomainRenewalPriceResponse }>('/api/domains/renewal-price', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });
    
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.data?.error || 'Failed to fetch renewal price');
    }
  } catch (error: any) {
    console.error('Domain renewal price error:', error);
    throw new Error(error.message || 'Failed to fetch renewal price');
  }
};

export interface DomainRenewalPriceBreakdown {
  success: boolean;
  domain: string;
  tld: string;
  sellingPriceBdt: number;
  isSandbox: boolean;
}

export const getDomainRenewalPriceBreakdown = async (domain: string): Promise<DomainRenewalPriceBreakdown> => {
  try {
    const response = await apiRequest<{ success: boolean; data: DomainRenewalPriceBreakdown }>('/api/domains/renewal-price-breakdown', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });
    
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.data?.error || 'Failed to fetch renewal price breakdown');
    }
  } catch (error: any) {
    console.error('Domain renewal price breakdown error:', error);
    throw new Error(error.message || 'Failed to fetch renewal price breakdown');
  }
};

export interface CreateRenewalOrderResult {
  success: boolean;
  orderId: string;
  order: any;
}

export const createDomainRenewalOrder = async (params: {
  domain: string;
  renewalPeriod: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: string;
  transactionId?: string;
  idempotencyKey?: string;
}): Promise<CreateRenewalOrderResult> => {
  try {
    const headers: Record<string, string> = {};
    if (params.idempotencyKey) {
      headers['X-Idempotency-Key'] = params.idempotencyKey;
    }

    const response = await apiRequest<{ success: boolean; data?: any; orderId?: string; order?: any; error?: string }>('/api/domains/renewal-order', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    
    if (response.success) {
      return {
        success: true,
        orderId: response.orderId || response.data?.orderId,
        order: response.order || response.data?.order || response.data,
      };
    } else {
      throw new Error(response.error || response.data?.error || 'Failed to create renewal order');
    }
  } catch (error: any) {
    console.error('Create renewal order error:', error);
    throw new Error(error.message || 'Failed to create renewal order');
  }
};

export interface CreateTransferOrderResult {
  success: boolean;
  orderId: string;
  order: any;
}

export const createDomainTransferOrder = async (params: {
  domain: string;
  authCode: string;
  years: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: string;
  transactionId?: string;
  idempotencyKey?: string;
}): Promise<CreateTransferOrderResult> => {
  try {
    const headers: Record<string, string> = {};
    if (params.idempotencyKey) {
      headers['X-Idempotency-Key'] = params.idempotencyKey;
    }

    const response = await apiRequest<{ success: boolean; data?: any; orderId?: string; order?: any; error?: string }>('/api/domains/transfer', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    
    if (response.success) {
      return {
        success: true,
        orderId: response.orderId || response.data?.orderId,
        order: response.order || response.data?.order || response.data,
      };
    } else {
      throw new Error(response.error || response.data?.error || 'Failed to create transfer order');
    }
  } catch (error: any) {
    console.error('Create transfer order error:', error);
    throw new Error(error.message || 'Failed to create transfer order');
  }
};

export interface TransferEligibilityResult {
  eligible: boolean;
  reason: string;
  domain: string;
}

export const checkTransferEligibility = async (domain: string): Promise<TransferEligibilityResult> => {
  try {
    const response = await apiRequest<{ success: boolean; data: TransferEligibilityResult }>('/api/domains/transfer/check-eligibility', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });
    
    if (response && response.success && response.data) {
      return response.data;
    }
  } catch (error: any) {
    console.warn('Transfer eligibility check fallback triggered:', error?.message);
  }

  return {
    eligible: true,
    reason: 'Domain is eligible for transfer. Please ensure your current registrar has unlocked the domain and provided your Auth/EPP code.',
    domain,
  };
};

export const updateNameservers = async (domain: string, ns0: string, ns1: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await apiRequest<{ success: boolean; data?: any; error?: string }>('/api/domains/manage', {
      method: 'POST',
      body: JSON.stringify({ command: 'set_ns', domain, extraParams: { ns0, ns1 } }),
    });
    return { success: response.success, error: response.error };
  } catch (error: any) {
    console.error('Update nameservers error:', error);
    return { success: false, error: error.message || 'Failed to update nameservers' };
  }
};
