import { OpenproviderDomainProvider } from './domain/OpenproviderDomainProvider.js';
import { CustomDomainProvider } from './domain/CustomDomainProvider.js';
import { CpanelHostingProvider } from './hosting/CpanelHostingProvider.js';
import { ResellerClubHostingProvider } from './hosting/ResellerClubHostingProvider.js';
export function getDomainProvider(config) {
    const driverType = config?.driver || config?.provider || 'openprovider';
    if (driverType !== 'openprovider' && driverType !== 'default') {
        const customConfig = {
            name: config?.name || driverType.toUpperCase(),
            driver: driverType,
            username: config?.username || config?.domainApiKey || '',
            apiKey: config?.apiKey || config?.password || config?.openproviderPassword || '',
            baseUrl: config?.baseUrl || '',
            isSandbox: config?.isSandbox === true
        };
        return new CustomDomainProvider(customConfig);
    }
    const domainApiKey = config?.domainApiKey || config?.username || process.env.OPENPROVIDER_USERNAME || '';
    const openproviderPassword = config?.openproviderPassword || config?.password || process.env.OPENPROVIDER_PASSWORD || '';
    const defaultHandle = config?.openproviderDefaultHandle || process.env.OPENPROVIDER_DEFAULT_HANDLE || '';
    if (!domainApiKey || !openproviderPassword) {
        return {
            checkAvailability: async () => { throw new Error('Openprovider credentials are not configured. Set them in Domain Registrars or backend environment.'); },
            getSuggestions: async () => { throw new Error('Openprovider credentials are not configured.'); },
            registerDomain: async () => ({ success: false, domain: '', error: 'Openprovider credentials are not configured.' }),
            renewDomain: async () => ({ success: false, domain: '', error: 'Openprovider credentials are not configured.' }),
            getWhois: async () => ({ domain: '', error: 'Openprovider credentials are not configured.' })
        };
    }
    const isSandbox = config?.openproviderSandbox !== undefined
        ? config.openproviderSandbox
        : (config?.isSandbox !== undefined ? config.isSandbox : process.env.OPENPROVIDER_SANDBOX_MODE === 'true');
    return new OpenproviderDomainProvider(domainApiKey, openproviderPassword, isSandbox, defaultHandle);
}
export function getHostingProvider(config) {
    const hostingApiType = config?.hostingApiType || process.env.WHM_API_TYPE || 'cpanel';
    const hostingApiKey = config?.hostingApiKey || process.env.WHM_API_TOKEN || process.env.WHM_API_KEY || '';
    const hostingApiUrl = config?.hostingApiUrl || process.env.WHM_URL || process.env.WHM_API_URL || '';
    const hostingApiUsername = (config?.hostingApiUsername || process.env.WHM_USERNAME || 'root').trim();
    if (hostingApiType === 'dummy' || !hostingApiType) {
        return {
            provisionAccount: async () => ({ success: false, error: 'Hosting provider not configured. Please configure WHM_API_TYPE, WHM_API_URL, and WHM_API_TOKEN environment variables.' }),
            suspendAccount: async () => { throw new Error('Hosting provider not configured.'); },
            unsuspendAccount: async () => { throw new Error('Hosting provider not configured.'); },
            terminateAccount: async () => { throw new Error('Hosting provider not configured.'); },
            getUsage: async () => { throw new Error('Hosting provider not configured.'); },
            changePlan: async () => { throw new Error('Hosting provider not configured.'); }
        };
    }
    switch (hostingApiType) {
        case 'cpanel':
            if (!hostingApiKey) {
                return {
                    provisionAccount: async () => ({ success: false, error: 'cPanel API key not configured.' }),
                    suspendAccount: async () => { throw new Error('cPanel API key not configured.'); },
                    unsuspendAccount: async () => { throw new Error('cPanel API key not configured.'); },
                    terminateAccount: async () => { throw new Error('cPanel API key not configured.'); },
                    getUsage: async () => { throw new Error('cPanel API key not configured.'); },
                    changePlan: async () => { throw new Error('cPanel API key not configured.'); }
                };
            }
            return new CpanelHostingProvider(hostingApiKey, hostingApiUrl, hostingApiUsername);
        case 'resellerclub':
            return new ResellerClubHostingProvider(hostingApiUrl, hostingApiKey);
        default:
            throw new Error(`Unsupported hosting API type: ${hostingApiType}`);
    }
}
