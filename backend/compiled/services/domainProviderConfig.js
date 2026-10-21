import { getAdminDocument } from '../firebase/admin.js';
export async function getDomainProviderConfig() {
    let storedConfig = {};
    let registrarConfig = {};
    let customRegistrars = [];
    try {
        const apiKeys = await getAdminDocument('settings', 'api_keys').catch(() => ({ exists: false, data: null }));
        const registrarSettings = await getAdminDocument('hosting_config', 'registrar_settings').catch(() => ({ exists: false, data: null }));
        const customDoc = await getAdminDocument('hosting_config', 'custom_registrars').catch(() => ({ exists: false, data: null }));
        storedConfig = apiKeys.data || {};
        registrarConfig = registrarSettings.data?.openprovider || {};
        customRegistrars = Array.isArray(customDoc.data?.items) ? customDoc.data.items : [];
    }
    catch (error) {
        // Silent catch
    }
    // Check if there is an active primary custom registrar (e.g. ResellerClub, Namecheap, ConnectReseller)
    const activePrimaryCustom = customRegistrars.find((r) => r.enabled && (r.isPrimary || r.enabled));
    if (activePrimaryCustom && activePrimaryCustom.driver && activePrimaryCustom.driver !== 'openprovider') {
        return {
            domainApiType: activePrimaryCustom.driver,
            driver: activePrimaryCustom.driver,
            name: activePrimaryCustom.name,
            domainApiKey: activePrimaryCustom.username || '',
            username: activePrimaryCustom.username || '',
            openproviderPassword: activePrimaryCustom.apiKey || '',
            apiKey: activePrimaryCustom.apiKey || '',
            baseUrl: activePrimaryCustom.baseUrl || '',
            isSandbox: activePrimaryCustom.isSandbox === true,
            openproviderSandbox: activePrimaryCustom.isSandbox === true,
        };
    }
    const domainApiKey = process.env.OPENPROVIDER_USERNAME
        || registrarConfig.username
        || storedConfig.openproviderUsername
        || '';
    const openproviderPassword = process.env.OPENPROVIDER_PASSWORD
        || registrarConfig.password
        || storedConfig.openproviderPassword
        || '';
    const openproviderSandbox = process.env.OPENPROVIDER_SANDBOX_MODE !== undefined
        ? process.env.OPENPROVIDER_SANDBOX_MODE === 'true'
        : (registrarConfig.isSandbox === true);
    const openproviderDefaultHandle = process.env.OPENPROVIDER_DEFAULT_HANDLE
        || registrarConfig.defaultHandle
        || storedConfig.openproviderDefaultHandle
        || '';
    if (!domainApiKey || !openproviderPassword) {
        console.warn('[DomainProviderConfig] Openprovider username or password missing from both environment variables and database config.');
    }
    return {
        domainApiType: 'openprovider',
        driver: 'openprovider',
        domainApiKey,
        openproviderPassword,
        openproviderSandbox,
        openproviderDefaultHandle,
    };
}
