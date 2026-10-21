export interface DomainAvailabilityResult {
  domain: string;
  available: boolean;
  price?: number;
  currency?: string;
  renewalPrice?: number;
  error?: string;
  status?: string;
}

export interface DomainRegistrationRequest {
  domain: string;
  years: number;
  contactId?: string;
  nameServers?: string[];
  autoRenew?: boolean;
  contact?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    companyName?: string;
    [key: string]: any;
  };
}

export interface DomainRegistrationResult {
  success: boolean;
  domain: string;
  registrationId?: string;
  status?: string;
  expiresAt?: string;
  error?: string;
  providerHttpStatus?: number;
  providerCode?: string;
  requestStartedAt?: string;
  responseReceivedAt?: string;
}

export interface DomainRenewalResult {
  success: boolean;
  domain: string;
  newExpiryDate?: string;
  transactionId?: string;
  error?: string;
}

export interface WhoisResult {
  domain: string;
  registrar?: string;
  createdAt?: string;
  createdDate?: string;
  updatedAt?: string;
  expiresAt?: string;
  expiryDate?: string;
  status?: string[] | string;
  nameServers?: string[];
  registrantName?: string;
  registrantEmail?: string;
  error?: string;
  raw?: string;
}

export interface TldPricingResult {
  tld: string;
  currency: string;
  registrationPrice: number;
  renewalPrice: number;
  transferPrice: number;
  restorePrice: number;
}

export interface BatchTldPricingItem {
  tld: string;
  supplierPriceUsd: number;
  currency: string;
  supplierRenewalPriceUsd?: number;
  supplierTransferPriceUsd?: number;
}

export interface DomainRenewalPriceResult {
  success: boolean;
  domain: string;
  tld: string;
  supplierPriceUsd: number;
  maxDuration: number;
  error?: string;
}

export interface DomainRenewalPriceBreakdown {
  success: boolean;
  domain: string;
  tld: string;
  supplierPriceUsd: number;
  markupPercent: number;
  markupAmountUsd: number;
  sellingPriceUsd: number;
  exchangeRate: number;
  sellingPriceBdt: number;
  isSandbox: boolean;
  discountPercent?: number;
}

export interface DomainTransferResult {
  success: boolean;
  domain: string;
  transferId?: string;
  status?: string;
  error?: string;
  providerHttpStatus?: number;
  providerCode?: string;
  requestStartedAt?: string;
  responseReceivedAt?: string;
}

export interface IDomainProvider {
  checkAvailability(domains: string[]): Promise<DomainAvailabilityResult[]>;
  getSuggestions(domain: string): Promise<string[]>;
  registerDomain(request: DomainRegistrationRequest): Promise<DomainRegistrationResult>;
  renewDomain(domain: string, years: number): Promise<DomainRenewalResult>;
  getWhois(domain: string): Promise<WhoisResult>;
  getTldPricing?(tld: string): Promise<TldPricingResult>;
  getBatchTldPricing?(tlds: string[]): Promise<{
    pricing: BatchTldPricingItem[];
    failed?: Array<{ tld: string; error: string }>;
  }>;
  getRenewalPrice?(domain: string): Promise<DomainRenewalPriceResult>;
  getRenewalPriceBreakdown?(domain: string): Promise<DomainRenewalPriceBreakdown>;
  transferDomain?(domain: string, authCode: string, years: number, contact?: DomainRegistrationRequest['contact'], contactId?: string): Promise<DomainTransferResult>;
  getTransferStatus?(domain: string): Promise<{ success: boolean; status?: string; transferId?: string; error?: string; rawData?: any }>;
  setNameservers?(domain: string, ns0?: string, ns1?: string): Promise<{ success: boolean; error?: string }>;
  getBalance?(): Promise<{ success: boolean; balance?: number; currency?: string; error?: string }>;
  testConnection?(): Promise<{ success: boolean; code: string; message: string; balance?: number; currency?: string; environment?: string; serverIp?: string }>;
}
