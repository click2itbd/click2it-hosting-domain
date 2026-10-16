import { 
  IDomainProvider, 
  DomainAvailabilityResult, 
  DomainRegistrationRequest, 
  DomainRegistrationResult, 
  DomainRenewalResult, 
  WhoisResult,
  TldPricingResult,
  BatchTldPricingItem,
  DomainTransferResult
} from './IDomainProvider.js';
import { getPublicServerIp } from '../../services/ipService.js';

export class OpenproviderDomainProvider implements IDomainProvider {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly passwordHash: string;
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private authRequest: Promise<string> | null = null;
  private readonly tldPricingCache = new Map<string, { value: TldPricingResult; expiresAt: number }>();

  // Openprovider Customer Handle to register domains (e.g. 'SR000000-EA')
  private defaultHandle: string;

  // Circuit breaker state to avoid hanging when Openprovider API is unreachable
  private static circuitOpenUntil: number = 0;
  private static consecutiveFailures: number = 0;

  constructor(username: string, passwordHash: string, isSandbox: boolean = false, defaultHandle: string = '') {
    this.username = username;
    this.passwordHash = passwordHash;
    // Default to production Openprovider API (for cp.openprovider.eu members)
    this.baseUrl = isSandbox ? 'https://api.cte.openprovider.eu/v1' : 'https://api.openprovider.eu/v1';
    this.defaultHandle = defaultHandle || process.env.OPENPROVIDER_DEFAULT_HANDLE || '';
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 12000): Promise<Response> {
    if (OpenproviderDomainProvider.circuitOpenUntil > Date.now()) {
      throw new Error('Openprovider API is temporarily unreachable (circuit breaker active).');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      OpenproviderDomainProvider.consecutiveFailures = 0;
      return response;
    } catch (err: any) {
      OpenproviderDomainProvider.consecutiveFailures++;
      const isConnectionError = err.code === 'UND_ERR_CONNECT_TIMEOUT' || String(err.message || '').includes('ECONNREFUSED');
      if (OpenproviderDomainProvider.consecutiveFailures >= 3 || isConnectionError) {
        OpenproviderDomainProvider.circuitOpenUntil = Date.now() + 30_000;
        console.warn(`[Openprovider] Circuit breaker tripped for 30s due to connection failure: ${err.message}`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async authenticate(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    if (this.authRequest) {
      return this.authRequest;
    }

    if (!this.username || !this.passwordHash) {
      throw new Error('Openprovider credentials are not configured. Please enter your Username and Password/Hash in Domain Registrars settings.');
    }

    const authRequest = (async () => {
      // 1. First attempt with provided password string
      let response = await this.fetchWithTimeout(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.username,
          password: this.passwordHash
        })
      }, 15000);

      let result: any = await response.json().catch(() => ({}));
      let token = result.data?.token;

      // 2. If login failed with plain text and password isn't already 32-char hex, try MD5 hash
      if ((!response.ok || (result.code !== undefined && result.code !== 0) || !token) && this.passwordHash.length !== 32) {
        try {
          const crypto = await import('node:crypto');
          const md5Password = crypto.createHash('md5').update(this.passwordHash).digest('hex');
          const md5Response = await this.fetchWithTimeout(`${this.baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: this.username,
              password: md5Password
            })
          }, 15000);

          const md5Result: any = await md5Response.json().catch(() => ({}));
          if (md5Response.ok && (md5Result.code === undefined || md5Result.code === 0) && md5Result.data?.token) {
            response = md5Response;
            result = md5Result;
            token = md5Result.data.token;
          }
        } catch {
          // ignore MD5 attempt error and fall through to main error handling
        }
      }

      if (!response.ok || (result.code !== undefined && result.code !== 0) || typeof token !== 'string' || !token) {
        const desc = result.desc || 'Authentication failed';
        if (/ip/i.test(desc) || /not allowed|whitelist|unauthorized|access denied/i.test(desc)) {
          const serverIp = await getPublicServerIp();
          throw new Error(`Openprovider IP Not Authorized: Please whitelist server IP (${serverIp}) in your Openprovider Control Panel at https://cp.openprovider.eu/ (Account -> Contact persons / Security / API settings). Details: ${desc}`);
        }
        throw new Error(`Openprovider Auth Failed: ${desc}`);
      }

      this.token = token;
      this.tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
      return token;
    })();
    this.authRequest = authRequest;

    try {
      return await authRequest;
    } finally {
      if (this.authRequest === authRequest) {
        this.authRequest = null;
      }
    }
  }

  public async fetchApi(endpoint: string, options: RequestInit = {}, isRetry: boolean = false): Promise<any> {
    const token = await this.authenticate();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    const response = await this.fetchWithTimeout(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    }, 15000);

    const result: any = await response.json().catch(() => ({}));
    if (result && typeof result === 'object') {
      Object.defineProperty(result, '_providerHttpStatus', { value: response.status });
    }

    if (response.status === 401 && !isRetry) {
      // Invalidate expired/rejected token and retry once
      this.token = null;
      this.tokenExpiry = 0;
      return this.fetchApi(endpoint, options, true);
    }

    if (!response.ok || (result.code !== undefined && result.code !== 0)) {
      const desc = result.desc || `Openprovider API Error: ${response.status}`;
      if (/ip/i.test(desc) || /not allowed|whitelist|access denied/i.test(desc)) {
        const serverIp = await getPublicServerIp();
        throw new Error(`Openprovider IP Not Authorized: Please whitelist server IP (${serverIp}) in your Openprovider Control Panel at https://cp.openprovider.eu/ (Account -> Contact persons / Security / API settings)`);
      }
      const error: any = new Error(desc);
      error.providerHttpStatus = response.status;
      error.providerCode = result.code === undefined ? undefined : String(result.code);
      error.responseReceivedAt = new Date().toISOString();
      throw error;
    }
    return result;
  }

  private splitDomain(fullDomain: string) {
    const parts = fullDomain.split('.');
    const name = parts[0];
    const extension = parts.slice(1).join('.');
    return { name, extension };
  }

  async checkAvailability(domains: string[]): Promise<DomainAvailabilityResult[]> {
    const results: DomainAvailabilityResult[] = [];
    const domainObjects = domains.map(d => this.splitDomain(d));

    try {
      const response = await this.fetchApi('/domains/check', {
        method: 'POST',
        body: JSON.stringify({ domains: domainObjects })
      });

      const availabilityItems = Array.isArray(response.data)
        ? response.data
        : response.data?.results;
      if (!Array.isArray(availabilityItems)) {
        throw new Error('Openprovider returned an invalid domain availability response.');
      }

      for (const item of availabilityItems) {
        const fullDomain = typeof item.domain === 'string'
          ? item.domain
          : `${item.domain?.name || ''}.${item.domain?.extension || ''}`;
        if (fullDomain === '.') {
          throw new Error('Openprovider returned a domain availability result without a domain name.');
        }
        const status = String(item.status || '').toLowerCase();
        const isAvailable = status === 'free' || status === 'available';
        
        results.push({
          domain: fullDomain,
          available: isAvailable,
          status: item.status
        });
      }
    } catch (error: any) {
      for (const d of domains) {
        results.push({ domain: d, available: false, error: error.message });
      }
    }
    return results;
  }

  async getTldPricing(tld: string): Promise<TldPricingResult> {
    try {
      const cleanTld = tld.trim().replace(/^\./, '').toLowerCase();
      if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/.test(cleanTld)) {
        throw new Error('Invalid TLD');
      }
      const cached = this.tldPricingCache.get(cleanTld);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }

      const getOpPrice = async (operation: string) => {
        const randomDomainString = `test-pricing-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const query = new URLSearchParams({
          'domain.name': randomDomainString,
          'domain.extension': cleanTld,
          operation,
        });
        const res = await this.fetchApi(`/domains/prices?${query.toString()}`);
        const price = Number(res.data?.price?.reseller?.price);
        const currency = res.data?.price?.reseller?.currency;
        if (!Number.isFinite(price) || price <= 0 || !currency) {
          throw new Error(`Openprovider returned no ${operation} price for .${cleanTld}`);
        }
        return { price, currency: String(currency).toUpperCase() };
      };

      const [regPrice, renewPrice, transferPrice, restorePrice] = await Promise.all([
        getOpPrice('create'),
        getOpPrice('renew'),
        getOpPrice('transfer'),
        getOpPrice('restore')
      ]);
      
      const currency = regPrice.currency;
      let regPriceUsd = regPrice.price;
      let renewPriceUsd = renewPrice.price;
      let transferPriceUsd = transferPrice.price;
      let restorePriceUsd = restorePrice.price;

      if (currency === 'EUR') {
        const eurToUsd = 1.08;
        regPriceUsd = Math.round((regPrice.price * eurToUsd) * 100) / 100;
        renewPriceUsd = Math.round((renewPrice.price * eurToUsd) * 100) / 100;
        transferPriceUsd = Math.round((transferPrice.price * eurToUsd) * 100) / 100;
        restorePriceUsd = Math.round((restorePrice.price * eurToUsd) * 100) / 100;
      } else if (currency !== 'USD') {
        throw new Error(`Unsupported Openprovider reseller currency (${currency}) for .${cleanTld}`);
      }

      const pricing = {
        tld: `.${cleanTld}`,
        currency: 'USD',
        registrationPrice: regPriceUsd,
        renewalPrice: renewPriceUsd,
        transferPrice: transferPriceUsd,
        restorePrice: restorePriceUsd,
      };
      this.tldPricingCache.set(cleanTld, { value: pricing, expiresAt: Date.now() + 60 * 60 * 1000 });
      return pricing;
    } catch (error: any) {
      throw new Error(`Failed to fetch pricing for ${tld.startsWith('.') ? tld : `.${tld}`}: ${error.message}`);
    }
  }

  async getBatchTldPricing(tlds: string[]): Promise<{
    pricing: BatchTldPricingItem[];
    failed: Array<{ tld: string; error: string }>;
  }> {
    const pricing: BatchTldPricingItem[] = [];
    const failed: Array<{ tld: string; error: string }> = [];
    for (const tld of tlds) {
      try {
        const tldPrice = await this.getTldPricing(tld);
        pricing.push({
          tld: tldPrice.tld,
          supplierPriceUsd: tldPrice.registrationPrice,
          currency: tldPrice.currency,
          supplierRenewalPriceUsd: tldPrice.renewalPrice,
          supplierTransferPriceUsd: tldPrice.transferPrice,
        });
      } catch (error: any) {
        failed.push({ tld, error: error.message || 'Failed to fetch TLD pricing' });
      }
    }
    return { pricing, failed };
  }

  async registerDomain(request: DomainRegistrationRequest): Promise<DomainRegistrationResult> {
    const domainObj = this.splitDomain(request.domain);
    const contactHandle = request.contactId && /^[A-Z0-9]+-[A-Z0-9]+$/i.test(request.contactId)
      ? request.contactId
      : '';
    let handle = contactHandle || this.defaultHandle;

    let requestStartedAt: string | undefined;
    let responseReceivedAt: string | undefined;
    let providerHttpStatus: number | undefined;
    try {
      const hasContact = Boolean(request.contact && (request.contact.email || request.contact.firstName || request.contact.lastName));
      if (!handle && !hasContact) {
        throw new Error('Set OPENPROVIDER_DEFAULT_HANDLE or provide a valid Openprovider contact handle before registering domains.');
      }

      await this.authenticate();

      if (!handle) {
        if (hasContact && request.contact) {
          try {
            handle = await this.createCustomerHandle(request.contact);
          } catch (e: any) {
            console.warn('[Openprovider] Auto customer handle creation failed:', e.message);
          }
        }
      }

      if (!handle) {
        try {
          const custRes = await this.fetchApi('/customers?limit=1');
          const firstHandle = custRes?.data?.results?.[0]?.handle || custRes?.data?.[0]?.handle;
          if (firstHandle) {
            handle = firstHandle;
          }
        } catch (e: any) {
          console.warn('[Openprovider] Customer handle lookup failed:', e.message);
        }
      }

      if (!handle) {
        throw new Error('Set OPENPROVIDER_DEFAULT_HANDLE or provide a valid Openprovider contact handle before registering domains.');
      }
      requestStartedAt = new Date().toISOString();
      console.info('[Openprovider] Domain registration request started', {
        domain: request.domain,
        operation: 'create',
        requestStartedAt,
      });
      const nameServers = request.nameServers?.filter(Boolean) || [];
      const response = await this.fetchApi('/domains', {
        method: 'POST',
        body: JSON.stringify({
          domain: domainObj,
          period: request.years || 1,
          owner_handle: handle,
          admin_handle: handle,
          tech_handle: handle,
          billing_handle: handle,
          ...(nameServers.length > 0
            ? { name_servers: nameServers.map(name => ({ name })) }
            : { ns_group: 'dns-openprovider' }),
          autorenew: request.autoRenew ? 'on' : 'off'
        })
      });
      providerHttpStatus = response._providerHttpStatus;
      responseReceivedAt = new Date().toISOString();
      if (!response.data?.id) {
        throw new Error('Openprovider did not return a domain registration ID.');
      }

      const responseStatus = typeof response.data.status === 'string'
        ? response.data.status.toUpperCase()
        : '';
      const status = responseStatus === 'ACT' || responseStatus === 'REQ' ? responseStatus : 'UNKNOWN';
      const registrationId = String(response.data.id);
      console.info('[Openprovider] Domain registration response received', {
        domain: request.domain,
        operation: 'create',
        providerHttpStatus,
        providerCode: String(response.code ?? '0'),
        registrationId,
        status,
        responseReceivedAt,
      });
      return {
        success: true,
        domain: request.domain,
        registrationId,
        status,
        providerHttpStatus,
        providerCode: String(response.code ?? '0'),
        requestStartedAt,
        responseReceivedAt,
        ...(status !== 'ACT' && status !== 'REQ'
          ? { error: `Openprovider accepted the request but returned an unrecognized status: ${status}.` }
          : {}),
      };
    } catch (error: any) {
      console.error('[Openprovider] Domain registration failed', {
        domain: request.domain,
        operation: 'create',
        requestStartedAt: requestStartedAt || null,
        providerHttpStatus: error.providerHttpStatus || providerHttpStatus,
        providerCode: error.providerCode,
        responseReceivedAt: error.responseReceivedAt || responseReceivedAt,
        error: error.message,
      });
      return {
        success: false,
        domain: request.domain,
        error: error.message,
        providerHttpStatus: error.providerHttpStatus || providerHttpStatus,
        providerCode: error.providerCode,
        requestStartedAt,
        responseReceivedAt: error.responseReceivedAt || responseReceivedAt,
      };
    }
  }

  async renewDomain(domain: string, years: number): Promise<DomainRenewalResult> {
    const domainObj = this.splitDomain(domain);

    try {
      const query = new URLSearchParams({ full_name: domain });
      const domainResponse = await this.fetchApi(`/domains?${query.toString()}`);
      const domainRecord = domainResponse.data?.results?.find((item: any) =>
        item.domain?.name === domainObj.name && item.domain?.extension === domainObj.extension
      );
      if (!domainRecord?.id) {
        throw new Error('Domain not found in your Openprovider account.');
      }

      const response = await this.fetchApi(`/domains/${domainRecord.id}/renew`, {
        method: 'POST',
        body: JSON.stringify({
          domain: domainObj,
          id: domainRecord.id,
          period: years
        })
      });
      if (!response.data?.status) {
        throw new Error('Openprovider did not confirm the domain renewal.');
      }

      return {
        success: true,
        domain: domain,
        transactionId: String(domainRecord.id),
      };
    } catch (error: any) {
      return {
        success: false,
        domain: domain,
        error: error.message
      };
    }
  }

  async transferDomain(domain: string, authCode: string, years: number): Promise<DomainTransferResult> {
    const cleanDomain = domain.trim().toLowerCase();
    const domainObj = this.splitDomain(cleanDomain);
    const cleanAuthCode = (authCode || '').trim();
    let handle = this.defaultHandle;

    let requestStartedAt: string | undefined;
    let responseReceivedAt: string | undefined;
    let providerHttpStatus: number | undefined;
    let providerCode: string | undefined;
    try {
      await this.authenticate();

      if (!handle) {
        try {
          const custRes = await this.fetchApi('/customers?limit=1');
          const firstHandle = custRes?.data?.results?.[0]?.handle || custRes?.data?.[0]?.handle;
          if (firstHandle) {
            handle = firstHandle;
          }
        } catch (e: any) {
          console.warn('[Openprovider] Customer handle lookup failed for transfer:', e.message);
        }
      }

      if (!handle) {
        throw new Error('Openprovider requires a Customer Handle (e.g. JD000000-EA). Please set Default Handle in Domain Registrars settings or create a customer profile in https://cp.openprovider.eu/.');
      }
      requestStartedAt = new Date().toISOString();
      console.info('[Openprovider] Domain transfer request started', {
        domain: cleanDomain,
        operation: 'transfer',
        requestStartedAt,
      });
      const response = await this.fetchApi('/domains/transfer', {
        method: 'POST',
        body: JSON.stringify({
          domain: domainObj,
          auth_code: cleanAuthCode,
          period: years || 1,
          owner_handle: handle,
          admin_handle: handle,
          tech_handle: handle,
          billing_handle: handle
        })
      });
      providerHttpStatus = response._providerHttpStatus;
      providerCode = String(response.code ?? '0');
      responseReceivedAt = new Date().toISOString();
      if (!response.data?.id) {
        throw new Error('Openprovider did not return a domain transfer ID.');
      }

      const rawStatus = typeof response.data.status === 'string'
        ? response.data.status.toUpperCase()
        : '';
      const status = rawStatus === 'ACT' || rawStatus === 'REQ' ? rawStatus : 'UNKNOWN';
      const transferId = String(response.data.id);
      console.info('[Openprovider] Domain transfer response received', {
        domain: cleanDomain,
        operation: 'transfer',
        providerHttpStatus,
        providerCode,
        transferId,
        status,
        responseReceivedAt,
      });
      return {
        success: true,
        domain: cleanDomain,
        transferId,
        status,
        providerHttpStatus,
        providerCode,
        requestStartedAt,
        responseReceivedAt,
      };
    } catch (error: any) {
      let friendlyError = error.message;
      const codeStr = String(error.providerCode || '');
      if (codeStr === '380' || /authorization code is invalid/i.test(friendlyError)) {
        friendlyError = 'Invalid Auth/EPP Code: The authorization code was rejected by the registry. Please check with your current registrar and provide the exact updated code.';
      } else if (codeStr === '381' || /domain is locked|clientTransferProhibited|transferProhibited/i.test(friendlyError)) {
        friendlyError = 'Domain Locked: The domain is currently transfer-locked at the existing registrar. Please unlock the domain (disable Transfer/Registrar Lock) and retry.';
      } else if (codeStr === '382' || /60 day/i.test(friendlyError)) {
        friendlyError = '60-Day Lock: The domain cannot be transferred within 60 days of registration or previous transfer (ICANN 60-day rule).';
      }

      console.error('[Openprovider] Domain transfer failed', {
        domain: cleanDomain,
        operation: 'transfer',
        requestStartedAt: requestStartedAt || null,
        providerHttpStatus: error.providerHttpStatus || providerHttpStatus,
        providerCode: error.providerCode || providerCode,
        responseReceivedAt: error.responseReceivedAt || responseReceivedAt,
        error: friendlyError,
      });
      return {
        success: false,
        domain: cleanDomain,
        error: friendlyError,
        providerHttpStatus: error.providerHttpStatus || providerHttpStatus,
        providerCode: error.providerCode || providerCode,
        requestStartedAt,
        responseReceivedAt: error.responseReceivedAt || responseReceivedAt,
      };
    }
  }

  async getSuggestions(domain: string): Promise<string[]> {
    try {
      const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
      const baseName = clean.split('.')[0];
      if (!baseName || baseName.length < 2) return [];
      const popularTlds = ['com', 'net', 'org', 'xyz', 'io', 'co', 'store', 'online', 'info'];
      const candidates = popularTlds.map(tld => `${baseName}.${tld}`).filter(d => d !== clean);
      const checks = await this.checkAvailability(candidates);
      return checks.filter(c => c.available).map(c => c.domain);
    } catch {
      return [];
    }
  }



  async getDnsZone(domain: string): Promise<any> {
    await this.authenticate();
    try {
      const response = await this.fetchApi(`/dns/zones/${domain}?with_records=true`);
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('[Openprovider] getDnsZone error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateDnsRecords(domain: string, records: any[]): Promise<{ success: boolean; error?: string }> {
    await this.authenticate();
    try {
      await this.fetchApi(`/dns/zones/${domain}`, {
        method: 'PUT',
        body: JSON.stringify({ records })
      });
      return { success: true };
    } catch (error: any) {
      console.error('[Openprovider] updateDnsRecords error:', error);
      return { success: false, error: error.message };
    }
  }

  async getDomainDetails(domain: string): Promise<any> {
    const domainObj = this.splitDomain(domain);
    await this.authenticate();
    try {
      const response = await this.fetchApi(`/domains/${domainObj.name}/${domainObj.extension}?with_auth_code=true`);
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('[Openprovider] getDomainDetails error:', error);
      return { success: false, error: error.message };
    }
  }

  async getTransferStatus(domain: string): Promise<{ success: boolean; status?: string; transferId?: string; error?: string; rawData?: any }> {
    const cleanDomain = domain.trim().toLowerCase();
    const domainObj = this.splitDomain(cleanDomain);
    await this.authenticate();
    try {
      const domRes = await this.fetchApi(`/domains/${domainObj.name}/${domainObj.extension}`);
      if (domRes?.data?.status) {
        const raw = String(domRes.data.status).toUpperCase();
        return {
          success: true,
          status: raw,
          transferId: domRes.data.id ? String(domRes.data.id) : undefined,
          rawData: domRes.data,
        };
      }
    } catch (e: any) {
      // Ignore and fallback to transfers query
    }

    try {
      const trRes = await this.fetchApi(`/transfers?domain=${domainObj.name}&extension=${domainObj.extension}&limit=1`);
      const item = trRes?.data?.results?.[0] || trRes?.data?.[0];
      if (item) {
        return {
          success: true,
          status: String(item.status || 'REQ').toUpperCase(),
          transferId: item.id ? String(item.id) : undefined,
          rawData: item,
        };
      }
    } catch (trErr: any) {
      console.warn('[Openprovider] getTransferStatus query error:', trErr?.message);
    }

    return {
      success: false,
      error: 'Unable to retrieve transfer status from Openprovider.',
    };
  }

  
  async updateWhoisPrivacy(domain: string, isEnabled: boolean): Promise<{ success: boolean; error?: string }> {
    const domainObj = this.splitDomain(domain);
    await this.authenticate();
    try {
      await this.fetchApi(`/domains/${domainObj.name}/${domainObj.extension}`, {
        method: 'PUT',
        body: JSON.stringify({ is_whois_privacy_enabled: isEnabled })
      });
      return { success: true };
    } catch (error: any) {
      console.error('[Openprovider] updateWhoisPrivacy error:', error);
      return { success: false, error: error.message };
    }
  }

  
  async createCustomerHandle(contact: any): Promise<string> {
    await this.authenticate();
    try {
      const response = await this.fetchApi('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: {
            first_name: contact.firstName,
            last_name: contact.lastName
          },
          company_name: contact.companyName || '',
          address: {
            street: contact.address,
            city: contact.city,
            state: contact.state || contact.city,
            zipcode: contact.zipcode,
            country: contact.country || 'BD'
          },
          phone: {
            country_code: contact.phoneCountryCode || '+880',
            area_code: '',
            subscriber_number: (() => {
              const raw = String(contact.phoneNumber || '').replace(/\D/g, '');
              if (raw.startsWith('880')) return raw.slice(3).replace(/^0+/, '');
              if (raw.startsWith('88')) return raw.slice(2).replace(/^0+/, '');
              return raw.replace(/^0+/, '');
            })()
          },
          email: contact.email
        })
      });
      return response.data.handle;
    } catch (error: any) {
      console.error('[Openprovider] createCustomerHandle error:', error);
      throw new Error(error.message || 'Failed to create customer handle');
    }
  }

  async updateDomainContacts(domain: string, handle: string): Promise<{ success: boolean; error?: string }> {
    const domainObj = this.splitDomain(domain);
    await this.authenticate();
    try {
      await this.fetchApi(`/domains/${domainObj.name}/${domainObj.extension}`, {
        method: 'PUT',
        body: JSON.stringify({
          owner_handle: handle,
          admin_handle: handle,
          tech_handle: handle,
          billing_handle: handle
        })
      });
      return { success: true };
    } catch (error: any) {
      console.error('[Openprovider] updateDomainContacts error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateDomainLock(domain: string, isLocked: boolean): Promise<{ success: boolean; error?: string }> {
    const domainObj = this.splitDomain(domain);
    await this.authenticate();
    try {
      await this.fetchApi(`/domains/${domainObj.name}/${domainObj.extension}`, {
        method: 'PUT',
        body: JSON.stringify({ is_locked: isLocked })
      });
      return { success: true };
    } catch (error: any) {
      console.error('[Openprovider] updateDomainLock error:', error);
      return { success: false, error: error.message };
    }
  }

  async getWhois(domain: string): Promise<WhoisResult> {
    const cleanDomain = domain.trim().toLowerCase();
    const domainObj = this.splitDomain(cleanDomain);
    try {
      await this.authenticate();
      const res = await this.fetchApi(`/domains/whois?domain.name=${domainObj.name}&domain.extension=${domainObj.extension}`);
      const rawWhois = res.data?.whois || res.data?.raw || JSON.stringify(res.data, null, 2);
      return {
        domain: cleanDomain,
        raw: rawWhois,
        registrar: res.data?.registrar || 'Openprovider',
        createdDate: res.data?.created_date,
        expiryDate: res.data?.expiration_date,
        status: res.data?.status,
        nameServers: res.data?.name_servers,
      };
    } catch (error: any) {
      return { domain: cleanDomain, error: error.message };
    }
  }

  async setNameservers(domain: string, ns0?: string, ns1?: string, ns2?: string, ns3?: string): Promise<{ success: boolean; error?: string }> {
    const domainObj = this.splitDomain(domain);
    
    try {
      const query = new URLSearchParams({ full_name: domain });
      const searchResponse = await this.fetchApi(`/domains?${query.toString()}`);
      const domainData = searchResponse.data?.results?.find((item: any) =>
        item.domain?.name === domainObj.name && item.domain?.extension === domainObj.extension
      );
      
      if (!domainData || !domainData.id) {
        throw new Error('Domain not found in your Openprovider account.');
      }
      
      // Step 2: Prepare Nameservers array
      const nameServers = [];
      if (ns0) nameServers.push({ name: ns0 });
      if (ns1) nameServers.push({ name: ns1 });
      if (ns2) nameServers.push({ name: ns2 });
      if (ns3) nameServers.push({ name: ns3 });
      
      if (nameServers.length === 0) {
        throw new Error('At least one nameserver is required.');
      }

      // Step 3: Update Domain Nameservers
      await this.fetchApi(`/domains/${domainData.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          domain: domainObj,
          name_servers: nameServers
        })
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async testConnection(): Promise<{ success: boolean; code: string; message: string; balance?: number; currency?: string; environment?: string; serverIp?: string }> {
    const serverIp = await getPublicServerIp();
    try {
      await this.authenticate();
      const isSandbox = this.baseUrl.includes('cte');
      const balanceRes = await this.getBalance();
      return {
        success: true,
        code: '200',
        message: `Successfully connected to Openprovider ${isSandbox ? 'CTE Sandbox' : 'Production (cp.openprovider.eu)'}.`,
        environment: isSandbox ? 'sandbox' : 'production',
        balance: balanceRes.success ? balanceRes.balance : undefined,
        currency: balanceRes.success ? balanceRes.currency : undefined,
        serverIp,
      };
    } catch (error: any) {
      return { success: false, code: 'AUTH_FAILED', message: error.message, serverIp };
    }
  }

  async getBalance(): Promise<{ success: boolean; balance?: number; currency?: string; error?: string }> {
    try {
      await this.authenticate();
      try {
        const response = await this.fetchApi('/resellers');
        const results = Array.isArray(response.data?.results) ? response.data.results : (Array.isArray(response.data) ? response.data : [response.data]);
        const data = results[0];
        if (data && data.balance !== undefined) {
          return { success: true, balance: Number(data.balance), currency: data.currency || 'EUR' };
        }
      } catch {}

      try {
        const response = await this.fetchApi('/resellers/current');
        if (response?.data?.balance !== undefined) {
          return { success: true, balance: Number(response.data.balance), currency: response.data.currency || 'EUR' };
        }
      } catch {}

      return { success: false, error: 'Openprovider did not return a reseller balance.' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getRenewalPrice(domain: string) {
    try {
      const parts = domain.split('.');
      const tld = parts.slice(1).join('.');
      const tldPrice = await this.getTldPricing(tld);
      
      return {
        success: true,
        domain: domain,
        tld: tld,
        supplierPriceUsd: tldPrice.renewalPrice,
        maxDuration: 10
      };
    } catch (error: any) {
      return { success: false, error: error.message, domain: domain, tld: '', supplierPriceUsd: 0, maxDuration: 0 };
    }
  }

  async getRenewalPriceBreakdown(domain: string) {
    try {
      const parts = domain.split('.');
      const tld = parts.slice(1).join('.');
      const tldPrice = await this.getTldPricing(tld);
      
      const supplierCost = tldPrice.renewalPrice || tldPrice.registrationPrice || 0;
      return {
        success: true,
        domain: domain,
        tld: tld,
        supplierPriceUsd: supplierCost,
        markupPercent: 0,
        markupAmountUsd: 0,
        sellingPriceUsd: 0,
        sellingPriceBdt: 0,
        exchangeRate: 0,
        isSandbox: this.baseUrl.includes('cte')
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message, 
        domain: domain, 
        tld: '', 
        supplierPriceUsd: 0, 
        markupPercent: 0, 
        markupAmountUsd: 0, 
        sellingPriceUsd: 0, 
        sellingPriceBdt: 0, 
        exchangeRate: 0,
        isSandbox: this.baseUrl.includes('cte')
      };
    }
  }

  async provisionSpamExperts(domain: string, email: string): Promise<{ success: boolean; data?: any; error?: string }> {
    await this.authenticate();
    try {
      const response = await this.fetchApi('/spam-expert/domains', {
        method: 'POST',
        body: JSON.stringify({
          domain_name: domain,
          email: email
        })
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('[Openprovider] provisionSpamExperts error:', error);
      return { success: false, error: error.message };
    }
  }

  async getSpamExpertsLoginUrl(domain: string): Promise<{ success: boolean; url?: string; error?: string }> {
    await this.authenticate();
    try {
      const response = await this.fetchApi(`/spam-expert/domains/${domain}/login-url`, {
        method: 'POST'
      });
      const url = response.data?.url || response.data?.login_url || response.data;
      return { success: true, url: typeof url === 'string' ? url : undefined };
    } catch (error: any) {
      console.error('[Openprovider] getSpamExpertsLoginUrl error:', error);
      return { success: false, error: error.message };
    }
  }

}
