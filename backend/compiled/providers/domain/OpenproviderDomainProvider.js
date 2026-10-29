import { getPublicServerIp } from '../../services/ipService.js';
export class OpenproviderDomainProvider {
    baseUrl;
    username;
    passwordHash;
    token = null;
    tokenExpiry = 0;
    authRequest = null;
    tldPricingCache = new Map();
    // Openprovider Customer Handle to register domains (e.g. 'SR000000-EA')
    defaultHandle;
    // Circuit breaker state to avoid hanging when Openprovider API is unreachable
    static circuitOpenUntil = 0;
    static consecutiveFailures = 0;
    constructor(username, passwordHash, isSandbox = false, defaultHandle = '') {
        this.username = username;
        this.passwordHash = passwordHash;
        // Default to production Openprovider API or official sandbox API
        this.baseUrl = isSandbox
            ? (process.env.OPENPROVIDER_SANDBOX_URL || 'https://api.sandbox.openprovider.nl/v1beta')
            : (process.env.OPENPROVIDER_API_URL || 'https://api.openprovider.eu/v1');
        this.defaultHandle = defaultHandle || process.env.OPENPROVIDER_DEFAULT_HANDLE || '';
    }
    async fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
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
        }
        catch (err) {
            OpenproviderDomainProvider.consecutiveFailures++;
            const errMsg = String(err.message || '');
            const isConnectionError = err.code === 'UND_ERR_CONNECT_TIMEOUT' ||
                errMsg.includes('ECONNREFUSED') ||
                errMsg.includes('fetch failed') ||
                err.name === 'TypeError' ||
                err.name === 'AbortError';
            if (OpenproviderDomainProvider.consecutiveFailures >= 2 || isConnectionError) {
                OpenproviderDomainProvider.circuitOpenUntil = Date.now() + 60_000;
            }
            throw err;
        }
        finally {
            clearTimeout(timer);
        }
    }
    async authenticate() {
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
            let result = await response.json().catch(() => ({}));
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
                    const md5Result = await md5Response.json().catch(() => ({}));
                    if (md5Response.ok && (md5Result.code === undefined || md5Result.code === 0) && md5Result.data?.token) {
                        response = md5Response;
                        result = md5Result;
                        token = md5Result.data.token;
                    }
                }
                catch {
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
        }
        finally {
            if (this.authRequest === authRequest) {
                this.authRequest = null;
            }
        }
    }
    async fetchApi(endpoint, options = {}, isRetry = false) {
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
        const result = await response.json().catch(() => ({}));
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
            const error = new Error(desc);
            error.providerHttpStatus = response.status;
            error.providerCode = result.code === undefined ? undefined : String(result.code);
            error.responseReceivedAt = new Date().toISOString();
            throw error;
        }
        return result;
    }
    splitDomain(fullDomain) {
        const parts = fullDomain.split('.');
        const name = parts[0];
        const extension = parts.slice(1).join('.');
        return { name, extension };
    }
    async checkAvailability(domains) {
        if (!domains || !domains.length)
            return [];
        // Openprovider has a strict hard limit of max 15 domains per /domains/check request.
        // Chunking into batches of 10 ensures 100% reliability without tripping "The domains limit exceeded".
        const CHUNK_SIZE = 10;
        const chunks = [];
        for (let i = 0; i < domains.length; i += CHUNK_SIZE) {
            chunks.push(domains.slice(i, i + CHUNK_SIZE));
        }
        const chunkPromises = chunks.map(async (chunk) => {
            const chunkResults = [];
            const domainObjects = chunk.map(d => this.splitDomain(d));
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
                    chunkResults.push({
                        domain: fullDomain,
                        available: isAvailable,
                        status: item.status
                    });
                }
            }
            catch (error) {
                for (const d of chunk) {
                    chunkResults.push({ domain: d, available: false, error: error.message });
                }
            }
            return chunkResults;
        });
        const settled = await Promise.all(chunkPromises);
        return settled.flat();
    }
    async getTldPricing(tld) {
        try {
            const cleanTld = tld.trim().replace(/^\./, '').toLowerCase();
            if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/.test(cleanTld)) {
                throw new Error('Invalid TLD');
            }
            const cached = this.tldPricingCache.get(cleanTld);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.value;
            }
            const getOpPrice = async (operation) => {
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
            }
            else if (currency !== 'USD') {
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
        }
        catch (error) {
            throw new Error(`Failed to fetch pricing for ${tld.startsWith('.') ? tld : `.${tld}`}: ${error.message}`);
        }
    }
    async getBatchTldPricing(tlds) {
        const pricing = [];
        const failed = [];
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
            }
            catch (error) {
                failed.push({ tld, error: error.message || 'Failed to fetch TLD pricing' });
            }
        }
        return { pricing, failed };
    }
    async registerDomain(request) {
        const domainObj = this.splitDomain(request.domain);
        let ownerHandle = request.contactId && /^[A-Z0-9]+-[A-Z0-9]+$/i.test(request.contactId)
            ? request.contactId
            : '';
        let requestStartedAt;
        let responseReceivedAt;
        let providerHttpStatus;
        try {
            await this.authenticate();
            // 1. Prioritize creating or retrieving the CUSTOMER'S handle so the domain owner in Openprovider is the customer
            if (!ownerHandle && request.contact && (request.contact.email || request.contact.firstName)) {
                try {
                    ownerHandle = await this.getOrCreateCustomerHandle(request.contact);
                    console.info(`[Openprovider] Using customer handle ${ownerHandle} as domain owner for ${request.domain}`);
                }
                catch (e) {
                    console.warn('[Openprovider] Auto customer handle creation failed, falling back to default handle:', e.message);
                }
            }
            // 2. Fall back to defaultHandle (reseller handle) only if customer handle could not be determined
            if (!ownerHandle) {
                ownerHandle = this.defaultHandle;
            }
            // 3. Fall back to first available customer handle in the account if defaultHandle is empty
            if (!ownerHandle) {
                try {
                    const custRes = await this.fetchApi('/customers?limit=1');
                    const firstHandle = custRes?.data?.results?.[0]?.handle || custRes?.data?.[0]?.handle;
                    if (firstHandle) {
                        ownerHandle = firstHandle;
                    }
                }
                catch (e) {
                    console.warn('[Openprovider] Customer handle lookup failed:', e.message);
                }
            }
            if (!ownerHandle) {
                throw new Error('Set OPENPROVIDER_DEFAULT_HANDLE or provide a valid Openprovider contact handle before registering domains.');
            }
            requestStartedAt = new Date().toISOString();
            console.info('[Openprovider] Domain registration request started', {
                domain: request.domain,
                ownerHandle,
                operation: 'create',
                requestStartedAt,
            });
            const nameServers = request.nameServers?.filter(Boolean) || [];
            // Tech and Billing handle can be Click2IT's defaultHandle or the ownerHandle
            const techBillingHandle = this.defaultHandle || ownerHandle;
            const response = await this.fetchApi('/domains', {
                method: 'POST',
                body: JSON.stringify({
                    domain: domainObj,
                    period: request.years || 1,
                    owner_handle: ownerHandle, // <--- Customer Name & Contact!
                    admin_handle: ownerHandle, // <--- Customer Name & Contact!
                    tech_handle: techBillingHandle, // <--- Click2IT BD (technical reseller)
                    billing_handle: techBillingHandle, // <--- Click2IT BD (billing reseller)
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
        }
        catch (error) {
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
    async renewDomain(domain, years) {
        const cleanDomain = domain.trim().toLowerCase();
        const domainObj = this.splitDomain(cleanDomain);
        const renewYears = Number(years) > 0 ? Number(years) : 1;
        try {
            const query = new URLSearchParams({ full_name: cleanDomain });
            const domainResponse = await this.fetchApi(`/domains?${query.toString()}`);
            const domainRecord = domainResponse.data?.results?.find((item) => item.domain?.name === domainObj.name && item.domain?.extension === domainObj.extension);
            if (!domainRecord?.id) {
                throw new Error('Domain not found in your Openprovider account.');
            }
            const response = await this.fetchApi(`/domains/${domainRecord.id}/renew`, {
                method: 'POST',
                body: JSON.stringify({
                    domain: domainObj,
                    id: domainRecord.id,
                    period: renewYears
                })
            });
            if (!response.data?.status && response.code !== 0) {
                throw new Error(response.desc || 'Openprovider did not confirm the domain renewal.');
            }
            // Fetch refreshed domain details from Openprovider to obtain exact updated expiry
            let newExpiryDate;
            try {
                const updatedDetails = await this.fetchApi(`/domains/${domainRecord.id}`);
                const freshData = updatedDetails.data || {};
                const freshExpiry = freshData.renewal_date || freshData.expiration_date;
                if (freshExpiry) {
                    newExpiryDate = new Date(freshExpiry).toISOString();
                }
            }
            catch (fetchErr) {
                console.warn('[Openprovider] Could not fetch refreshed domain details after renewal:', fetchErr);
            }
            // Fallback calculation if Openprovider details call did not return a date
            if (!newExpiryDate) {
                const priorExpiry = domainRecord.renewal_date || domainRecord.expiration_date;
                if (priorExpiry) {
                    const d = new Date(priorExpiry);
                    d.setFullYear(d.getFullYear() + renewYears);
                    newExpiryDate = d.toISOString();
                }
                else {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() + renewYears);
                    newExpiryDate = d.toISOString();
                }
            }
            return {
                success: true,
                domain: cleanDomain,
                transactionId: String(domainRecord.id),
                newExpiryDate,
                expiresAt: newExpiryDate,
                status: response.data?.status || 'active',
            };
        }
        catch (error) {
            return {
                success: false,
                domain: cleanDomain,
                error: error.message
            };
        }
    }
    async transferDomain(domain, authCode, years, contact, contactId, nameServers) {
        const cleanDomain = domain.trim().toLowerCase();
        const domainObj = this.splitDomain(cleanDomain);
        const cleanAuthCode = (authCode || '').trim();
        let ownerHandle = contactId && /^[A-Z0-9]+-[A-Z0-9]+$/i.test(contactId) ? contactId : '';
        let requestStartedAt;
        let responseReceivedAt;
        let providerHttpStatus;
        let providerCode;
        try {
            await this.authenticate();
            // 1. Prioritize creating or retrieving the CUSTOMER'S handle so the domain owner in Openprovider is the customer
            if (!ownerHandle && contact && (contact.email || contact.firstName)) {
                try {
                    ownerHandle = await this.getOrCreateCustomerHandle(contact);
                    console.info(`[Openprovider] Using customer handle ${ownerHandle} as domain owner for transfer of ${cleanDomain}`);
                }
                catch (e) {
                    console.warn('[Openprovider] Auto customer handle creation failed for transfer, falling back to default handle:', e.message);
                }
            }
            // 2. Fall back to defaultHandle (reseller handle) only if customer handle could not be determined
            if (!ownerHandle) {
                ownerHandle = this.defaultHandle;
            }
            // 3. Fall back to first available customer handle in the account if defaultHandle is empty
            if (!ownerHandle) {
                try {
                    const custRes = await this.fetchApi('/customers?limit=1');
                    const firstHandle = custRes?.data?.results?.[0]?.handle || custRes?.data?.[0]?.handle;
                    if (firstHandle) {
                        ownerHandle = firstHandle;
                    }
                }
                catch (e) {
                    console.warn('[Openprovider] Customer handle lookup failed for transfer:', e.message);
                }
            }
            if (!ownerHandle) {
                throw new Error('Openprovider requires a Customer Handle (e.g. JD000000-EA). Please set Default Handle in Domain Registrars settings or create a customer profile in https://cp.openprovider.eu/.');
            }
            const techBillingHandle = this.defaultHandle || ownerHandle;
            const cleanNsList = (Array.isArray(nameServers) && nameServers.length > 0 ? nameServers : ['ns1.click2itbd.com', 'ns2.click2itbd.com']).map((ns) => typeof ns === 'string' ? ns.trim() : (ns?.name || '')).filter(Boolean);
            requestStartedAt = new Date().toISOString();
            console.info('[Openprovider] Domain transfer request started', {
                domain: cleanDomain,
                ownerHandle,
                operation: 'transfer',
                requestStartedAt,
            });
            const response = await this.fetchApi('/domains/transfer', {
                method: 'POST',
                body: JSON.stringify({
                    domain: domainObj,
                    auth_code: cleanAuthCode,
                    period: years || 1,
                    owner_handle: ownerHandle, // <--- Customer Name & Contact!
                    admin_handle: ownerHandle, // <--- Customer Name & Contact!
                    tech_handle: techBillingHandle, // <--- Click2IT BD (technical reseller)
                    billing_handle: techBillingHandle, // <--- Click2IT BD (billing reseller)
                    ...(cleanNsList.length > 0 ? { name_servers: cleanNsList.map((name) => ({ name })) } : { ns_group: 'dns-openprovider' })
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
        }
        catch (error) {
            let friendlyError = error.message;
            const codeStr = String(error.providerCode || '');
            if (codeStr === '380' || /authorization code is invalid/i.test(friendlyError)) {
                friendlyError = 'Invalid Auth/EPP Code: The authorization code was rejected by the registry. Please check with your current registrar and provide the exact updated code.';
            }
            else if (codeStr === '381' || /domain is locked|clientTransferProhibited|transferProhibited/i.test(friendlyError)) {
                friendlyError = 'Domain Locked: The domain is currently transfer-locked at the existing registrar. Please unlock the domain (disable Transfer/Registrar Lock) and retry.';
            }
            else if (codeStr === '382' || /60 day/i.test(friendlyError)) {
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
    async getSuggestions(domain) {
        try {
            const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
            const baseName = clean.split('.')[0];
            if (!baseName || baseName.length < 2)
                return [];
            const popularTlds = ['com', 'net', 'org', 'xyz', 'io', 'co', 'store', 'online', 'info'];
            const candidates = popularTlds.map(tld => `${baseName}.${tld}`).filter(d => d !== clean);
            const checks = await this.checkAvailability(candidates);
            return checks.filter(c => c.available).map(c => c.domain);
        }
        catch {
            return [];
        }
    }
    async getDomainId(domain) {
        const domainObj = this.splitDomain(domain);
        const search = await this.fetchApi(`/domains?name=${domainObj.name}&extension=${domainObj.extension}&limit=1`);
        const item = search.data?.results?.[0];
        if (!item?.id) {
            throw new Error(`Domain ${domain} not found in your Openprovider account.`);
        }
        return item.id;
    }
    async getDnsZone(domain) {
        await this.authenticate();
        try {
            const response = await this.fetchApi(`/dns/zones/${domain}?with_records=true`);
            return { success: true, data: response.data };
        }
        catch (error) {
            // If zone doesn't exist yet in Openprovider DNS manager, return clean empty record set
            if (String(error.message || '').includes('Zone specified is not found') || error.providerCode === '872') {
                return { success: true, data: { name: domain, records: [] }, isNewZone: true };
            }
            console.error('[Openprovider] getDnsZone error:', error);
            return { success: false, error: error.message };
        }
    }
    async updateDnsRecords(domain, records) {
        await this.authenticate();
        const domainObj = this.splitDomain(domain);
        try {
            try {
                await this.fetchApi(`/dns/zones/${domain}`, {
                    method: 'PUT',
                    body: JSON.stringify({ records })
                });
                return { success: true };
            }
            catch (putErr) {
                if (String(putErr.message || '').includes('Zone specified is not found') || putErr.providerCode === '872') {
                    await this.fetchApi('/dns/zones', {
                        method: 'POST',
                        body: JSON.stringify({
                            domain: domainObj,
                            type: 'master',
                            records
                        })
                    });
                    return { success: true };
                }
                throw putErr;
            }
        }
        catch (error) {
            console.error('[Openprovider] updateDnsRecords error:', error);
            return { success: false, error: error.message };
        }
    }
    async getDomainDetails(domain) {
        await this.authenticate();
        try {
            const id = await this.getDomainId(domain);
            const response = await this.fetchApi(`/domains/${id}?with_auth_code=true`);
            const data = response.data || {};
            return {
                success: true,
                data: {
                    ...data,
                    is_locked: data.is_locked !== undefined ? data.is_locked : true,
                    auth_code: data.auth_code || '',
                    is_whois_privacy_enabled: !!(data.is_private_whois_enabled ?? data.is_whois_privacy_enabled),
                }
            };
        }
        catch (error) {
            console.error('[Openprovider] getDomainDetails error:', error);
            return { success: false, error: error.message };
        }
    }
    async getTransferStatus(domain) {
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
        }
        catch (e) {
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
        }
        catch (trErr) {
            console.warn('[Openprovider] getTransferStatus query error:', trErr?.message);
        }
        return {
            success: false,
            error: 'Unable to retrieve transfer status from Openprovider.',
        };
    }
    async updateWhoisPrivacy(domain, isEnabled) {
        await this.authenticate();
        try {
            const id = await this.getDomainId(domain);
            await this.fetchApi(`/domains/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ is_private_whois_enabled: isEnabled })
            });
            return { success: true };
        }
        catch (error) {
            console.error('[Openprovider] updateWhoisPrivacy error:', error);
            return { success: false, error: error.message };
        }
    }
    async getOrCreateCustomerHandle(contact) {
        if (!contact || (!contact.email && !contact.firstName)) {
            return this.defaultHandle;
        }
        await this.authenticate();
        // 1. Check if a customer handle already exists in Openprovider for this email
        const email = String(contact.email || '').trim().toLowerCase();
        if (email) {
            try {
                const query = new URLSearchParams({ email_pattern: email, limit: '10' });
                const searchRes = await this.fetchApi(`/customers?${query.toString()}`);
                const results = searchRes?.data?.results || searchRes?.data || [];
                if (Array.isArray(results) && results.length > 0) {
                    const matched = results.find((c) => c &&
                        c.handle &&
                        c.handle !== this.defaultHandle &&
                        String(c.email || '').trim().toLowerCase() === email);
                    if (matched?.handle) {
                        console.info(`[Openprovider] Reusing existing customer handle for ${email}: ${matched.handle}`);
                        return matched.handle;
                    }
                }
            }
            catch (err) {
                console.warn(`[Openprovider] Customer lookup by email (${email}) failed, creating new handle:`, err.message);
            }
        }
        // 2. Create customer handle in Openprovider
        return this.createCustomerHandle(contact);
    }
    async createCustomerHandle(contact) {
        await this.authenticate();
        const firstName = String(contact.firstName || '').trim() || 'Customer';
        const lastName = String(contact.lastName || '').trim() || (firstName !== 'Customer' ? firstName : 'User');
        const email = String(contact.email || '').trim().toLowerCase();
        if (!email) {
            throw new Error('Customer email is required to create an Openprovider contact.');
        }
        const rawStreet = String(contact.address || contact.street || 'Main Road').trim();
        const numberMatch = rawStreet.match(/(?:house|flat|road|block|holding|#)?\s*(\d+[A-Za-z0-9\/-]*)/i);
        const houseNumber = String(contact.number || contact.houseNumber || (numberMatch ? numberMatch[1] : '1')).slice(0, 10);
        const streetName = rawStreet.slice(0, 100) || 'Main Street';
        const city = String(contact.city || 'Dhaka').trim() || 'Dhaka';
        const state = String(contact.state || city).trim() || city;
        const zipcode = String(contact.zipcode || contact.zip || contact.postcode || '1200').trim() || '1200';
        const country = String(contact.country || 'BD').trim().toUpperCase().slice(0, 2) || 'BD';
        // Parse phone digits (clean out +880 and non-digits)
        const rawPhone = String(contact.phoneNumber || contact.phone || '').replace(/\D/g, '');
        let countryCode = '880';
        let subscriberNumber = rawPhone;
        if (subscriberNumber.startsWith('880')) {
            countryCode = '880';
            subscriberNumber = subscriberNumber.slice(3).replace(/^0+/, '');
        }
        else if (subscriberNumber.startsWith('88')) {
            countryCode = '880';
            subscriberNumber = subscriberNumber.slice(2).replace(/^0+/, '');
        }
        else {
            subscriberNumber = subscriberNumber.replace(/^0+/, '');
        }
        if (!subscriberNumber || subscriberNumber.length < 5) {
            subscriberNumber = '1700000000';
        }
        const payload = {
            name: {
                first_name: firstName,
                last_name: lastName
            },
            address: {
                street: streetName,
                number: houseNumber,
                city: city,
                state: state,
                zipcode: zipcode,
                country: country
            },
            phone: {
                country_code: countryCode,
                area_code: '',
                subscriber_number: subscriberNumber
            },
            email: email
        };
        if (contact.companyName && String(contact.companyName).trim()) {
            payload.company_name = String(contact.companyName).trim();
        }
        try {
            const response = await this.fetchApi('/customers', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (!response.data?.handle) {
                throw new Error('Openprovider did not return a customer handle.');
            }
            console.info(`[Openprovider] Customer handle created successfully: ${response.data.handle} for ${firstName} ${lastName} (${email})`);
            return response.data.handle;
        }
        catch (error) {
            console.error('[Openprovider] createCustomerHandle error:', error);
            throw new Error(error.message || 'Failed to create customer handle in Openprovider');
        }
    }
    async updateDomainContacts(domain, handle) {
        await this.authenticate();
        try {
            const id = await this.getDomainId(domain);
            const techBillingHandle = this.defaultHandle || handle;
            await this.fetchApi(`/domains/${id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    owner_handle: handle,
                    admin_handle: handle,
                    tech_handle: techBillingHandle,
                    billing_handle: techBillingHandle
                })
            });
            return { success: true };
        }
        catch (error) {
            console.error('[Openprovider] updateDomainContacts error:', error);
            return { success: false, error: error.message };
        }
    }
    async updateDomainLock(domain, isLocked) {
        await this.authenticate();
        try {
            const id = await this.getDomainId(domain);
            await this.fetchApi(`/domains/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ is_locked: isLocked })
            });
            return { success: true };
        }
        catch (error) {
            console.error('[Openprovider] updateDomainLock error:', error);
            return { success: false, error: error.message };
        }
    }
    async getWhois(domain) {
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
        }
        catch (error) {
            return { domain: cleanDomain, error: error.message };
        }
    }
    async setNameservers(domain, ns0, ns1, ns2, ns3) {
        const domainObj = this.splitDomain(domain);
        try {
            const query = new URLSearchParams({ full_name: domain });
            const searchResponse = await this.fetchApi(`/domains?${query.toString()}`);
            const domainData = searchResponse.data?.results?.find((item) => item.domain?.name === domainObj.name && item.domain?.extension === domainObj.extension);
            if (!domainData || !domainData.id) {
                throw new Error('Domain not found in your Openprovider account.');
            }
            // Step 2: Prepare Nameservers array
            const nameServers = [];
            if (ns0)
                nameServers.push({ name: ns0 });
            if (ns1)
                nameServers.push({ name: ns1 });
            if (ns2)
                nameServers.push({ name: ns2 });
            if (ns3)
                nameServers.push({ name: ns3 });
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async testConnection() {
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
        }
        catch (error) {
            return { success: false, code: 'AUTH_FAILED', message: error.message, serverIp };
        }
    }
    async getBalance() {
        try {
            await this.authenticate();
            try {
                const response = await this.fetchApi('/resellers');
                const results = Array.isArray(response.data?.results) ? response.data.results : (Array.isArray(response.data) ? response.data : [response.data]);
                const data = results[0];
                if (data && data.balance !== undefined) {
                    return { success: true, balance: Number(data.balance), currency: data.currency || 'EUR' };
                }
            }
            catch { }
            try {
                const response = await this.fetchApi('/resellers/current');
                if (response?.data?.balance !== undefined) {
                    return { success: true, balance: Number(response.data.balance), currency: response.data.currency || 'EUR' };
                }
            }
            catch { }
            return { success: false, error: 'Openprovider did not return a reseller balance.' };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async getRenewalPrice(domain) {
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
        }
        catch (error) {
            return { success: false, error: error.message, domain: domain, tld: '', supplierPriceUsd: 0, maxDuration: 0 };
        }
    }
    async getRenewalPriceBreakdown(domain) {
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
        }
        catch (error) {
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
    async provisionSpamExperts(domain, email) {
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
        }
        catch (error) {
            console.error('[Openprovider] provisionSpamExperts error:', error);
            return { success: false, error: error.message };
        }
    }
    async getSpamExpertsLoginUrl(domain) {
        await this.authenticate();
        try {
            const response = await this.fetchApi(`/spam-expert/domains/${domain}/login-url`, {
                method: 'POST'
            });
            const url = response.data?.url || response.data?.login_url || response.data;
            return { success: true, url: typeof url === 'string' ? url : undefined };
        }
        catch (error) {
            console.error('[Openprovider] getSpamExpertsLoginUrl error:', error);
            return { success: false, error: error.message };
        }
    }
}
