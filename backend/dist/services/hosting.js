import { ProviderError } from '../providers/hosting/CpanelHostingProvider.js';
import { config } from '../config/index.js';
import { getHostingProvider } from '../providers/providerFactory.js';
export async function getHostingSettings() {
    let hostingApiType = process.env.WHM_API_TYPE || config.secrets.whmApiType || 'cpanel';
    let hostingApiUrl = process.env.WHM_URL || process.env.WHM_API_URL || config.secrets.whmApiUrl || '';
    let hostingApiKey = process.env.WHM_API_TOKEN || process.env.WHM_API_KEY || config.secrets.whmApiToken || config.secrets.whmApiKey || '';
    let hostingApiUsername = (process.env.WHM_USERNAME || config.secrets.whmUsername || 'root').trim();
    if (!hostingApiKey || !hostingApiUrl) {
        try {
            const { getAdminDocument } = await import('../firebase/admin.js');
            const hostingDoc = await getAdminDocument('settings', 'hostingApiConfig');
            if (hostingDoc.exists && hostingDoc.data) {
                if (!hostingApiKey && hostingDoc.data.hostingApiKey)
                    hostingApiKey = hostingDoc.data.hostingApiKey;
                if (!hostingApiUrl && hostingDoc.data.hostingApiUrl)
                    hostingApiUrl = hostingDoc.data.hostingApiUrl;
                if (hostingDoc.data.hostingApiType)
                    hostingApiType = hostingDoc.data.hostingApiType;
                if (hostingDoc.data.hostingApiUsername)
                    hostingApiUsername = hostingDoc.data.hostingApiUsername;
            }
        }
        catch (e) {
            console.warn('Error reading hostingApiConfig in hosting.ts:', e);
        }
    }
    return {
        hostingApiType,
        hostingApiUrl,
        hostingApiKey,
        hostingApiUsername,
    };
}
export async function getHostingProviderWithSettings() {
    const settings = await getHostingSettings();
    const provider = getHostingProvider({
        hostingApiType: settings.hostingApiType,
        hostingApiKey: settings.hostingApiKey,
        hostingApiUrl: settings.hostingApiUrl,
        hostingApiUsername: settings.hostingApiUsername,
    });
    return { provider, settings };
}
export async function testHostingConnection() {
    const { provider } = await getHostingProviderWithSettings();
    if (typeof provider.testConnection !== 'function') {
        return {
            success: false,
            code: 'WHM_UNSUPPORTED',
            message: 'Connection test is not supported for the selected provider.',
        };
    }
    const result = await provider.testConnection();
    return {
        success: result.success,
        code: result.code || 'WHM_UNKNOWN_ERROR',
        message: result.message,
    };
}
export async function provisionHostingAccount(request) {
    const { provider } = await getHostingProviderWithSettings();
    const idempotencyKey = request.idempotencyKey || `${request.domain}-${request.planCode}-${request.billingCycle}`;
    return provider.provisionAccount(request).then(result => ({
        ...result,
        idempotencyKey,
    }));
}
export async function suspendHostingAccount(providerAccountId) {
    const { provider } = await getHostingProviderWithSettings();
    return provider.suspendAccount(providerAccountId);
}
export async function unsuspendHostingAccount(providerAccountId) {
    const { provider } = await getHostingProviderWithSettings();
    return provider.unsuspendAccount(providerAccountId);
}
export async function terminateHostingAccount(providerAccountId) {
    const { provider } = await getHostingProviderWithSettings();
    return provider.terminateAccount(providerAccountId);
}
export async function getHostingAccountUsage(providerAccountId) {
    const { provider } = await getHostingProviderWithSettings();
    return provider.getUsage(providerAccountId);
}
export async function changeHostingPlan(providerAccountId, newPlanCode) {
    const { provider } = await getHostingProviderWithSettings();
    return provider.changePlan(providerAccountId, newPlanCode);
}
export function classifyHostingError(error) {
    if (error instanceof ProviderError) {
        return {
            code: error.code,
            message: error.message,
        };
    }
    const msg = error?.message || '';
    if (msg.includes('Invalid authentication') || msg.includes('Access denied') || msg.includes('401')) {
        return { code: 'unauthorized', message: 'WHM authentication failed. Please check your API token.' };
    }
    if (msg.includes('403')) {
        return { code: 'forbidden', message: 'WHM access denied. Check API token permissions.' };
    }
    if (msg.includes('404') || /not found/i.test(msg)) {
        return { code: 'not_found', message: 'WHM endpoint not found. Verify WHM URL.' };
    }
    if (msg.includes('connection timed out') || msg.includes('ETIMEDOUT') || msg.includes('AbortError')) {
        return { code: 'timeout', message: 'WHM server did not respond within 15 seconds. Verify server URL, port 2087, and firewall.' };
    }
    if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        return { code: 'connection_refused', message: 'Cannot reach WHM server. Check URL and ensure the server is online.' };
    }
    if (msg.includes('self-signed certificate') || msg.includes('unable to verify the first certificate') || msg.includes('CERT_HAS_EXPIRED')) {
        return { code: 'tls_error', message: 'WHM server TLS/SSL certificate error. If this is a self-signed certificate, import it into the server trust store.' };
    }
    return {
        code: 'unknown_error',
        message: msg || 'Unknown WHM error',
    };
}
export async function createHostingLoginSession(providerAccountId) {
    const { provider } = await getHostingProviderWithSettings();
    if (!provider.createLoginSession) {
        throw new Error('This hosting provider does not support automated SSO login.');
    }
    return provider.createLoginSession(providerAccountId);
}
export async function triggerHostingAutoSSL(providerAccountId) {
    const { provider } = await getHostingProviderWithSettings();
    if (typeof provider.triggerAutoSSL === 'function') {
        return provider.triggerAutoSSL(providerAccountId);
    }
    return { success: false, message: 'AutoSSL trigger is not supported by current hosting provider' };
}
