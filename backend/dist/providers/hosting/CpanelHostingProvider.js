export class ProviderError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'ProviderError';
    }
}
export class CpanelHostingProvider {
    apiUrl;
    apiKey;
    apiUsername;
    requestTimeout;
    constructor(apiKey, apiUrl, apiUsername, requestTimeout = 15000) {
        const key = apiKey || process.env.WHM_API_TOKEN || process.env.WHM_API_KEY || '';
        const url = apiUrl || process.env.WHM_URL || process.env.WHM_API_URL || '';
        const user = apiUsername || process.env.WHM_USERNAME || 'root';
        if (!key) {
            throw new Error('WHM API token is required. Set WHM_API_TOKEN in backend/.env');
        }
        if (!url) {
            throw new Error('WHM API URL is required. Set WHM_URL or WHM_API_URL in backend/.env. Expected format: https://your-whm-server.com:2087');
        }
        this.apiKey = key;
        this.apiUrl = url.replace(/\/$/, '');
        this.apiUsername = user.trim();
        this.requestTimeout = requestTimeout;
    }
    async whmRequest(action, params = {}, customTimeoutMs) {
        const url = new URL(`/json-api/${action}`, this.apiUrl + '/');
        url.searchParams.set('api.version', '1');
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
        const controller = new AbortController();
        const timeoutMs = customTimeoutMs || this.requestTimeout;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `whm ${this.apiUsername}:${this.apiKey}`,
                    'Accept': 'application/json',
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const rawText = await response.text();
            let data;
            try {
                data = JSON.parse(rawText);
            }
            catch (e) {
                throw new ProviderError('invalid_response', `Invalid WHM response: ${rawText}`);
            }
            if (!response.ok) {
                if (response.status === 401) {
                    throw new ProviderError('unauthorized', 'WHM authentication failed. Invalid API token or username.');
                }
                if (response.status === 403) {
                    throw new ProviderError('forbidden', 'WHM access denied. Check API token permissions.');
                }
                if (response.status === 404) {
                    throw new ProviderError('not_found', 'WHM endpoint not found. Verify WHM URL and API version.');
                }
                const message = data?.metadata?.result?.message || `WHM API error: ${response.statusText}`;
                throw new ProviderError('provider_error', message, { statusCode: response.status });
            }
            if (data?.metadata?.result?.message && data.metadata.result.message !== 'OK') {
                throw new ProviderError('provider_error', data.metadata.result.message, { result: data.metadata.result });
            }
            return data;
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new ProviderError('timeout', 'WHM server connection timed out. Please verify the server URL, port 2087, firewall, and API token.');
            }
            if (error instanceof ProviderError) {
                throw error;
            }
            if (error.message.includes('self-signed certificate') || error.message.includes('unable to verify the first certificate') || error.message.includes('CERT_HAS_EXPIRED')) {
                throw new ProviderError('tls_error', 'WHM server TLS/SSL certificate error. If this is a self-signed certificate, import it into the server trust store.');
            }
            if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
                throw new ProviderError('connection_refused', 'Cannot reach WHM server. Check URL and ensure the server is online.');
            }
            throw new ProviderError('network', error.message || 'Network error contacting WHM server');
        }
    }
    async testConnection() {
        try {
            const result = await this.whmRequest('listaccts');
            const accounts = result?.data?.acct || [];
            return {
                success: true,
                code: 'WHM_OK',
                message: `WHM connection successful. Found ${accounts.length} account(s).`,
            };
        }
        catch (error) {
            const msg = error?.message || '';
            if (error instanceof ProviderError) {
                return {
                    success: false,
                    code: error.code.toUpperCase(),
                    message: msg,
                };
            }
            return {
                success: false,
                code: 'WHM_UNKNOWN_ERROR',
                message: msg || 'WHM connection test failed',
            };
        }
    }
    async provisionAccount(request) {
        const { domain, contactEmail, billingCycle, planCode } = request;
        if (!domain || !contactEmail) {
            return {
                success: false,
                error: 'Domain and contact email are required for provisioning',
            };
        }
        const normalizedBillingCycle = this.normalizeBillingCycle(billingCycle);
        const username = this.generateUsername(domain);
        const password = this.generatePassword();
        try {
            const result = await this.whmRequest('createacct', {
                username,
                password,
                domain,
                plan: planCode || 'default',
                contactemail: contactEmail,
                billingcycle: normalizedBillingCycle,
            }, 60000);
            const isSuccess = result?.metadata?.result === 1 || result?.result?.[0]?.status === 1 || result?.status === 1;
            const reason = result?.metadata?.reason || result?.result?.[0]?.statusmsg || result?.statusmsg;
            if (!isSuccess) {
                return {
                    success: false,
                    error: reason || 'Account creation returned error from WHM',
                };
            }
            const accountData = result?.data || {};
            const hostname = new URL(this.apiUrl).hostname;
            return {
                success: true,
                providerAccountId: username,
                password,
                cPanelUrl: `https://${hostname}:2083`,
                nameservers: accountData.nameservers || ['ns1.click2itbd.com', 'ns2.click2itbd.com'],
                error: undefined,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to create hosting account',
            };
        }
    }
    async createLoginSession(providerAccountId) {
        if (!providerAccountId) {
            throw new ProviderError('validation_error', 'Provider account ID is required');
        }
        try {
            const result = await this.whmRequest('create_user_session', {
                'api.version': '1',
                user: providerAccountId,
                service: 'cpaneld'
            });
            const url = result?.data?.url || (result?.metadata && result.metadata.url) || (result?.data && result.data.cp_security_token ? `${this.apiUrl.split('/json-api')[0]}/login/?session=${result.data.session}&login=${result.data.cp_security_token}` : null);
            if (!url) {
                // If WHM returns success but url is nested
                if (result?.data && result.data.url)
                    return result.data.url;
                throw new Error('Failed to generate session URL from WHM');
            }
            return url;
        }
        catch (error) {
            throw new ProviderError('whm_api_error', error.message || 'Failed to create cPanel login session');
        }
    }
    async suspendAccount(providerAccountId) {
        if (!providerAccountId) {
            throw new ProviderError('validation_error', 'Provider account ID is required');
        }
        await this.verifyAccountExists(providerAccountId);
        await this.whmRequest('suspendacct', { user: providerAccountId });
    }
    async unsuspendAccount(providerAccountId) {
        if (!providerAccountId) {
            throw new ProviderError('validation_error', 'Provider account ID is required');
        }
        await this.verifyAccountExists(providerAccountId);
        await this.whmRequest('unsuspendacct', { user: providerAccountId });
    }
    async terminateAccount(providerAccountId) {
        if (!providerAccountId) {
            throw new ProviderError('validation_error', 'Provider account ID is required');
        }
        await this.verifyAccountExists(providerAccountId);
        await this.whmRequest('killacct', { user: providerAccountId, preserve_dns: '1' });
    }
    async getUsage(providerAccountId) {
        if (!providerAccountId) {
            throw new ProviderError('validation_error', 'Provider account ID is required');
        }
        const result = await this.whmRequest('accountsummary', { user: providerAccountId });
        const data = result?.data || {};
        const plan = data.plan || {};
        const diskUsage = data.disk_usage || {};
        return {
            providerAccountId,
            diskUsageMB: Math.round(diskUsage.used || 0),
            diskLimitMB: plan.disklimit ? this.parseLimit(plan.disklimit) : 10240,
            bandwidthUsageMB: Math.round(diskUsage.bandwidth || 0),
            bandwidthLimitMB: plan.bandwidth ? this.parseLimit(plan.bandwidth) : 102400,
            cpuUsagePercent: data.cpu_usage ? parseFloat(data.cpu_usage) : undefined,
            ramUsageMB: data.mem_usage ? Math.round(data.mem_usage) : undefined,
            lastUpdated: new Date().toISOString(),
        };
    }
    async changePlan(providerAccountId, newPlanCode) {
        if (!providerAccountId || !newPlanCode) {
            throw new ProviderError('validation_error', 'Provider account ID and new plan code are required');
        }
        await this.verifyAccountExists(providerAccountId);
        await this.whmRequest('changepackage', { user: providerAccountId, pkg: newPlanCode });
    }
    async verifyAccountExists(providerAccountId) {
        try {
            await this.whmRequest('accountsummary', { user: providerAccountId });
        }
        catch (error) {
            if (error instanceof ProviderError && error.code === 'not_found') {
                throw new ProviderError('account_not_found', `Hosting account '${providerAccountId}' does not exist on the server.`);
            }
            throw error;
        }
    }
    generateUsername(domain) {
        const cleanDomain = domain.replace(/[^a-z0-9]/gi, '').toLowerCase();
        const base = cleanDomain.substring(0, 5) || 'user';
        const rand = Math.floor(100 + Math.random() * 900);
        return `${base}${rand}`.substring(0, 8);
    }
    normalizeBillingCycle(billingCycle) {
        if (!billingCycle)
            return 'monthly';
        const cycle = billingCycle.toLowerCase();
        if (cycle === 'annually' || cycle === 'yearly')
            return 'yearly';
        if (cycle === 'quarterly')
            return 'quarterly';
        if (cycle === 'biennially')
            return 'biennially';
        return 'monthly';
    }
    generatePassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
        const length = 16;
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
    parseLimit(value) {
        if (!value)
            return 0;
        const num = parseFloat(value);
        if (value.toLowerCase().includes('gb'))
            return num * 1024;
        if (value.toLowerCase().includes('mb'))
            return num;
        return num;
    }
}
