import { ProviderError } from './DomainProviderError.js';
export const DEFAULT_BTCL_CONFIG = {
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
export function isBdDomain(domain) {
    return /\.bd$/i.test((domain || '').trim());
}
export class BtclDomainProvider {
    cfg;
    constructor(cfg) {
        this.cfg = {
            ...DEFAULT_BTCL_CONFIG,
            ...cfg,
            endpoints: { ...DEFAULT_BTCL_CONFIG.endpoints, ...(cfg.endpoints || {}) },
        };
    }
    buildHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
        if (this.cfg.authType === 'bearer' && this.cfg.apiKey) {
            headers.Authorization = `Bearer ${this.cfg.apiKey}`;
        }
        else if (this.cfg.authType === 'basic') {
            const token = Buffer.from(`${this.cfg.username || ''}:${this.cfg.password || ''}`).toString('base64');
            headers.Authorization = `Basic ${token}`;
        }
        else if (this.cfg.authType === 'header' && this.cfg.apiKey) {
            headers[this.cfg.apiKeyHeader || 'X-API-Key'] = this.cfg.apiKey;
        }
        return headers;
    }
    async request(endpoint, payload = {}) {
        if (!this.cfg.baseUrl) {
            throw new ProviderError('not_configured', 'BTCL API base URL is not configured');
        }
        const base = this.cfg.baseUrl.replace(/\/+$/, '');
        const path = endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`;
        const url = new URL(`${base}${path}`);
        const isGet = endpoint.method === 'GET';
        if (isGet) {
            for (const [k, v] of Object.entries(payload))
                url.searchParams.set(k, String(v));
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
            let data;
            try {
                data = rawText ? JSON.parse(rawText) : {};
            }
            catch {
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
        }
        catch (error) {
            if (error instanceof ProviderError)
                throw error;
            if (error?.name === 'AbortError')
                throw new ProviderError('timeout', 'BTCL API request timed out');
            throw new ProviderError('network', error?.message || 'Network error contacting BTCL');
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    async checkAvailability(domains) {
        const list = Array.isArray(domains) ? domains : [domains];
        const results = [];
        for (const domain of list) {
            try {
                const data = await this.request(this.cfg.endpoints.check, { domain });
                results.push(this.mapAvailability(domain, data));
            }
            catch (error) {
                results.push({ domain, available: false, error: error?.message || 'BTCL availability check failed' });
            }
        }
        return results;
    }
    async getSuggestions(_domain) {
        return [];
    }
    async registerDomain(req) {
        try {
            const data = await this.request(this.cfg.endpoints.register, {
                domain: req.domain,
                years: req.years,
                nameservers: req.nameServers || [],
                contactId: req.contactId,
                autoRenew: !!req.autoRenew,
            });
            return this.mapRegistration(req.domain, data);
        }
        catch (error) {
            return { success: false, domain: req.domain, error: error?.message || 'BTCL registration failed' };
        }
    }
    async renewDomain(domain, years) {
        try {
            const data = await this.request(this.cfg.endpoints.renew, { domain, years });
            return {
                success: true,
                domain,
                newExpiryDate: data?.expiresAt || data?.expiry_date || data?.data?.expiresAt,
                transactionId: data?.transactionId || data?.transaction_id || data?.data?.transactionId,
            };
        }
        catch (error) {
            return { success: false, domain, error: error?.message || 'BTCL renewal failed' };
        }
    }
    async transferDomain(domain, authCode, years) {
        try {
            const data = await this.request(this.cfg.endpoints.transfer, { domain, authCode, years });
            return {
                success: true,
                domain,
                transferId: data?.transferId || data?.transfer_id || data?.data?.transferId,
                status: data?.status || data?.data?.status || 'pending',
            };
        }
        catch (error) {
            return { success: false, domain, error: error?.message || 'BTCL transfer failed' };
        }
    }
    async setNameservers(domain, ns0, ns1) {
        try {
            await this.request(this.cfg.endpoints.nameservers, {
                domain,
                nameservers: [ns0, ns1].filter(Boolean),
            });
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error?.message || 'BTCL nameserver update failed' };
        }
    }
    async getWhois(domain) {
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
        }
        catch (error) {
            return { domain, error: error?.message || 'BTCL whois failed' };
        }
    }
    async testConnection() {
        try {
            await this.request(this.cfg.endpoints.ping, {});
            return { success: true, code: 'ok', message: 'BTCL API connection successful' };
        }
        catch (error) {
            return {
                success: false,
                code: error instanceof ProviderError ? error.code : 'error',
                message: error?.message || 'BTCL API connection failed',
            };
        }
    }
    // ---- Response mapping (adjust here once the final BTCL contract is known) ----
    mapAvailability(domain, data) {
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
    mapRegistration(domain, data) {
        const d = data?.data || data;
        return {
            success: true,
            domain,
            registrationId: d?.registrationId || d?.registration_id || d?.id,
            expiresAt: d?.expiresAt || d?.expiry_date,
        };
    }
}
