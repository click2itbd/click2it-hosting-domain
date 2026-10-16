import {
  IDomainProvider,
  DomainAvailabilityResult,
  DomainRegistrationRequest,
  DomainRegistrationResult,
  DomainRenewalResult,
  DomainTransferResult,
  WhoisResult,
} from './IDomainProvider.js';
import { ProviderError } from './DomainProviderError.js';

/**
 * BTCL (.bd registry) domain provider.
 *
 * The exact BTCL API contract (URLs, auth scheme, payload/response shape) is
 * deployment specific, so everything that depends on it is driven by
 * `BtclConfig` (stored in Firestore `settings/btcl_config`, editable from the
 * admin panel) and isolated in the `map*` methods at the bottom of this class.
 * When BTCL provides final API documentation, only those config values / map
 * methods need adjusting - no other code has to change.
 */
export type BtclAuthType = 'bearer' | 'basic' | 'header';

export interface BtclEndpoint {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
}

export interface BtclConfig {
  enabled: boolean;
  baseUrl: string;
  authType: BtclAuthType;
  apiKey?: string;
  username?: string;
  password?: string;
  /** Header name used when authType === 'header' (default: X-API-Key) */
  apiKeyHeader?: string;
  timeoutMs?: number;
  endpoints: {
    check: BtclEndpoint;
    register: BtclEndpoint;
    renew: BtclEndpoint;
    transfer: BtclEndpoint;
    nameservers: BtclEndpoint;
    whois: BtclEndpoint;
    ping: BtclEndpoint;
  };
}

export const DEFAULT_BTCL_CONFIG: BtclConfig = {
  enabled: false,
  baseUrl: '',
  authType: 'bearer',
  apiKey: '',
  username: '',
  password: '',
  apiKeyHeader: 'X-API-Key',
  timeoutMs: 20000,
  endpoints: {
    check: { method: 'POST', path: '/domains/check' },
    register: { method: 'POST', path: '/domains/register' },
    renew: { method: 'POST', path: '/domains/renew' },
    transfer: { method: 'POST', path: '/domains/transfer' },
    nameservers: { method: 'POST', path: '/domains/nameservers' },
    whois: { method: 'POST', path: '/domains/whois' },
    ping: { method: 'GET', path: '/ping' },
  },
};

export function isBdDomain(domain: string): boolean {
  return /\.bd$/i.test((domain || '').trim());
}

export class BtclDomainProvider implements IDomainProvider {
  private cfg: BtclConfig;

  constructor(cfg: Partial<BtclConfig>) {
    this.cfg = {
      ...DEFAULT_BTCL_CONFIG,
      ...cfg,
      endpoints: { ...DEFAULT_BTCL_CONFIG.endpoints, ...(cfg.endpoints || {}) },
    };
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.cfg.authType === 'bearer' && this.cfg.apiKey) {
      headers.Authorization = `Bearer ${this.cfg.apiKey}`;
    } else if (this.cfg.authType === 'basic') {
      const token = Buffer.from(`${this.cfg.username || ''}:${this.cfg.password || ''}`).toString('base64');
      headers.Authorization = `Basic ${token}`;
    } else if (this.cfg.authType === 'header' && this.cfg.apiKey) {
      headers[this.cfg.apiKeyHeader || 'X-API-Key'] = this.cfg.apiKey;
    }
    return headers;
  }

  private async request(endpoint: BtclEndpoint, payload: Record<string, any> = {}): Promise<any> {
    if (!this.cfg.baseUrl) {
      throw new ProviderError('not_configured', 'BTCL API base URL is not configured');
    }

    const base = this.cfg.baseUrl.replace(/\/+$/, '');
    const path = endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`;
    const url = new URL(`${base}${path}`);
    const isGet = endpoint.method === 'GET';
    if (isGet) {
      for (const [k, v] of Object.entries(payload)) url.searchParams.set(k, String(v));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.cfg.timeoutMs || 20000);

    try {
      const response = await fetch(url.toString(), {
        method: endpoint.method,
        headers: this.buildHeaders(),
        body: isGet ? undefined : JSON.stringify(payload),
        signal: controller.signal,
      });

      const rawText = await response.text();
      let data: any;
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new ProviderError('invalid_response', `Invalid BTCL response (${response.status}): ${rawText.slice(0, 200)}`);
      }

      if (!response.ok) {
        const message = data?.message || data?.error || `BTCL API error: ${response.status} ${response.statusText}`;
        throw new ProviderError('provider_error', message, { status: response.status });
      }
      if (data?.success === false || data?.status === 'error') {
        throw new ProviderError('provider_error', data?.message || data?.error || 'BTCL API returned an error');
      }
      return data;
    } catch (error: any) {
      if (error instanceof ProviderError) throw error;
      if (error?.name === 'AbortError') throw new ProviderError('timeout', 'BTCL API request timed out');
      throw new ProviderError('network', error?.message || 'Network error contacting BTCL');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async checkAvailability(domains: string[] | string): Promise<DomainAvailabilityResult[]> {
    const list = Array.isArray(domains) ? domains : [domains];
    const results: DomainAvailabilityResult[] = [];
    for (const domain of list) {
      try {
        const data = await this.request(this.cfg.endpoints.check, { domain });
        results.push(this.mapAvailability(domain, data));
      } catch (error: any) {
        results.push({ domain, available: false, error: error?.message || 'BTCL availability check failed' });
      }
    }
    return results;
  }

  async getSuggestions(_domain: string): Promise<string[]> {
    return [];
  }

  async registerDomain(req: DomainRegistrationRequest): Promise<DomainRegistrationResult> {
    try {
      const data = await this.request(this.cfg.endpoints.register, {
        domain: req.domain,
        years: req.years,
        nameservers: req.nameServers || [],
        contactId: req.contactId,
        autoRenew: !!req.autoRenew,
      });
      return this.mapRegistration(req.domain, data);
    } catch (error: any) {
      return { success: false, domain: req.domain, error: error?.message || 'BTCL registration failed' };
    }
  }

  async renewDomain(domain: string, years: number): Promise<DomainRenewalResult> {
    try {
      const data = await this.request(this.cfg.endpoints.renew, { domain, years });
      return {
        success: true,
        domain,
        newExpiryDate: data?.expiresAt || data?.expiry_date || data?.data?.expiresAt,
        transactionId: data?.transactionId || data?.transaction_id || data?.data?.transactionId,
      };
    } catch (error: any) {
      return { success: false, domain, error: error?.message || 'BTCL renewal failed' };
    }
  }

  async transferDomain(domain: string, authCode: string, years: number): Promise<DomainTransferResult> {
    try {
      const data = await this.request(this.cfg.endpoints.transfer, { domain, authCode, years });
      return {
        success: true,
        domain,
        transferId: data?.transferId || data?.transfer_id || data?.data?.transferId,
        status: data?.status || data?.data?.status || 'pending',
      };
    } catch (error: any) {
      return { success: false, domain, error: error?.message || 'BTCL transfer failed' };
    }
  }

  async setNameservers(domain: string, ns0?: string, ns1?: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.request(this.cfg.endpoints.nameservers, {
        domain,
        nameservers: [ns0, ns1].filter(Boolean),
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'BTCL nameserver update failed' };
    }
  }

  async getWhois(domain: string): Promise<WhoisResult> {
    try {
      const data = await this.request(this.cfg.endpoints.whois, { domain });
      const d = data?.data || data;
      return {
        domain,
        registrar: d?.registrar || 'BTCL',
        createdAt: d?.createdAt || d?.created_at,
        expiresAt: d?.expiresAt || d?.expiry_date,
        status: d?.status ? (Array.isArray(d.status) ? d.status : [String(d.status)]) : undefined,
        nameServers: d?.nameServers || d?.nameservers,
        registrantName: d?.registrantName,
        registrantEmail: d?.registrantEmail,
      };
    } catch (error: any) {
      return { domain, error: error?.message || 'BTCL whois failed' };
    }
  }

  async testConnection(): Promise<{ success: boolean; code: string; message: string }> {
    try {
      await this.request(this.cfg.endpoints.ping, {});
      return { success: true, code: 'ok', message: 'BTCL API connection successful' };
    } catch (error: any) {
      return {
        success: false,
        code: error instanceof ProviderError ? error.code : 'error',
        message: error?.message || 'BTCL API connection failed',
      };
    }
  }

  // ---- Response mapping (adjust here once the final BTCL contract is known) ----

  private mapAvailability(domain: string, data: any): DomainAvailabilityResult {
    const d = data?.data || data;
    const available = d?.available ?? d?.isAvailable ?? d?.is_available ?? false;
    return {
      domain,
      available: available === true || available === 'true' || available === 1,
      price: d?.price != null ? Number(d.price) : undefined,
      renewalPrice: d?.renewalPrice != null ? Number(d.renewalPrice) : undefined,
      currency: d?.currency || 'BDT',
      status: d?.status,
    };
  }

  private mapRegistration(domain: string, data: any): DomainRegistrationResult {
    const d = data?.data || data;
    return {
      success: true,
      domain,
      registrationId: d?.registrationId || d?.registration_id || d?.id,
      expiresAt: d?.expiresAt || d?.expiry_date,
    };
  }
}
