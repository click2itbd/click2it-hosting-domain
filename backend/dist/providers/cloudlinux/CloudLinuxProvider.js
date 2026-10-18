import { config } from '../../config/index.js';
export class CloudLinuxProviderError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'CloudLinuxProviderError';
    }
}
export class CloudLinuxProvider {
    apiUrl;
    apiToken;
    partnerLogin;
    secretKey;
    requestTimeout;
    constructor(apiUrl, apiToken, partnerLogin, secretKey, requestTimeout = 15000) {
        this.apiUrl = apiUrl || config.cloudlinux.apiUrl || '';
        this.apiToken = apiToken || config.cloudlinux.apiToken || '';
        this.partnerLogin = partnerLogin || config.cloudlinux.partnerLogin || '';
        this.secretKey = secretKey || config.cloudlinux.secretKey || '';
        this.requestTimeout = requestTimeout;
    }
    async addLicense(ip, type) {
        if (!this.apiUrl || !this.apiToken) {
            throw new CloudLinuxProviderError('not_configured', 'CloudLinux API is not configured.');
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
        try {
            const response = await fetch(`${this.apiUrl}/v2/ip-license/licenses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiToken}`,
                    'X-Partner-Login': this.partnerLogin,
                    'X-Secret-Key': this.secretKey,
                },
                body: JSON.stringify({ ip, type }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const rawText = await response.text();
            let data;
            try {
                data = JSON.parse(rawText);
            }
            catch (e) {
                throw new CloudLinuxProviderError('invalid_response', `Invalid CloudLinux response: ${rawText}`);
            }
            if (!response.ok || data?.status === 'ERROR') {
                const message = data?.message || `CloudLinux API error: ${response.statusText}`;
                throw new CloudLinuxProviderError('provider_error', message, { responseCode: data?.code });
            }
            return {
                success: true,
                licenseId: data?.data?.id || data?.id,
                message: data?.message || 'License added successfully',
            };
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new CloudLinuxProviderError('timeout', 'CloudLinux API request timed out');
            }
            if (error instanceof CloudLinuxProviderError) {
                throw error;
            }
            throw new CloudLinuxProviderError('network', error.message || 'Network error contacting CloudLinux');
        }
    }
    async testConnection() {
        if (!this.apiUrl || !this.apiToken) {
            return {
                success: false,
                code: 'NOT_CONFIGURED',
                message: 'CloudLinux integration is not configured on the server.',
            };
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
        try {
            const response = await fetch(`${this.apiUrl}/v2/ip-license/licenses`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiToken}`,
                    'X-Partner-Login': this.partnerLogin,
                    'X-Secret-Key': this.secretKey,
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
                throw new CloudLinuxProviderError('invalid_response', 'CloudLinux provider returned an invalid response.');
            }
            if (!response.ok || data?.status === 'ERROR') {
                const message = data?.message || `CloudLinux API error: ${response.statusText}`;
                throw new CloudLinuxProviderError('provider_error', message, { responseCode: data?.code, statusCode: response.status });
            }
            return {
                success: true,
                code: 'CLOUDLINUX_OK',
                message: 'CloudLinux connection successful.',
            };
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    code: 'TIMEOUT',
                    message: 'CloudLinux server connection timed out.',
                };
            }
            if (error instanceof CloudLinuxProviderError) {
                const code = error.code.toUpperCase();
                let message = error.message;
                if (code === 'INVALID_RESPONSE')
                    message = 'CloudLinux provider returned an invalid response.';
                if (code === 'PROVIDER_ERROR')
                    message = 'CloudLinux API error.';
                return {
                    success: false,
                    code,
                    message,
                };
            }
            return {
                success: false,
                code: 'NETWORK_ERROR',
                message: error.message || 'Network error contacting CloudLinux server',
            };
        }
    }
    async removeLicense(ip, type) {
        if (!this.apiUrl || !this.apiToken) {
            throw new CloudLinuxProviderError('not_configured', 'CloudLinux API is not configured.');
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
        try {
            const url = new URL(`${this.apiUrl}/v2/ip-license/licenses`);
            url.searchParams.set('ip', ip);
            url.searchParams.set('type', type.toString());
            const response = await fetch(url.toString(), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'X-Partner-Login': this.partnerLogin,
                    'X-Secret-Key': this.secretKey,
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
                throw new CloudLinuxProviderError('invalid_response', `Invalid CloudLinux response: ${rawText}`);
            }
            if (!response.ok || data?.status === 'ERROR') {
                const message = data?.message || `CloudLinux API error: ${response.statusText}`;
                throw new CloudLinuxProviderError('provider_error', message);
            }
            return {
                success: true,
                message: data?.message || 'License removed successfully',
            };
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new CloudLinuxProviderError('timeout', 'CloudLinux API request timed out');
            }
            if (error instanceof CloudLinuxProviderError) {
                throw error;
            }
            throw new CloudLinuxProviderError('network', error.message || 'Network error contacting CloudLinux');
        }
    }
}
let cloudLinuxProviderInstance = null;
export function getCloudLinuxProvider() {
    if (!cloudLinuxProviderInstance) {
        cloudLinuxProviderInstance = new CloudLinuxProvider();
    }
    return cloudLinuxProviderInstance;
}
