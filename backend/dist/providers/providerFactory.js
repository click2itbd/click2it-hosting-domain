import { OpenproviderDomainProvider } from './domain/OpenproviderDomainProvider.js';
import { CpanelHostingProvider } from './hosting/CpanelHostingProvider.js';
import { ResellerClubHostingProvider } from './hosting/ResellerClubHostingProvider.js';
export function getDomainProvider(config) {
    const domainApiKey = config?.domainApiKey || process.env.OPENPROVIDER_USERNAME || '';
    const openproviderPassword = config?.openproviderPassword || process.env.OPENPROVIDER_PASSWORD || '';
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
        : (process.env.OPENPROVIDER_SANDBOX_MODE === 'true');
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
            if (!hostingApiKey || !ResellerClubHostingProvider) {
                return {
                    provisionAccount: async () => ({ success: false, error: 'ResellerClub API key not configured.' }),
                    suspendAccount: async () => { throw new Error('ResellerClub API key not configured.'); },
                    unsuspendAccount: async () => { throw new Error('ResellerClub API key not configured.'); },
                    terminateAccount: async () => { throw new Error('ResellerClub API key not configured.'); },
                    getUsage: async () => { throw new Error('ResellerClub API key not configured.'); },
                    changePlan: async () => { throw new Error('ResellerClub API key not configured.'); }
                };
            }
            return new ResellerClubHostingProvider(hostingApiKey, hostingApiUrl);
        default:
            return {
                provisionAccount: async () => ({ success: false, error: `Unsupported hosting provider: ${hostingApiType}` }),
                suspendAccount: async () => { throw new Error(`Unsupported hosting provider: ${hostingApiType}`); },
                unsuspendAccount: async () => { throw new Error(`Unsupported hosting provider: ${hostingApiType}`); },
                terminateAccount: async () => { throw new Error(`Unsupported hosting provider: ${hostingApiType}`); },
                getUsage: async () => { throw new Error(`Unsupported hosting provider: ${hostingApiType}`); },
                changePlan: async () => { throw new Error(`Unsupported hosting provider: ${hostingApiType}`); }
            };
    }
}
