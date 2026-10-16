import { getAdminDocument } from '../firebase/admin.js';

export interface DomainProviderConfig {
  domainApiType: 'openprovider';
  domainApiKey: string;
  openproviderPassword: string;
  openproviderSandbox: boolean;
  openproviderDefaultHandle?: string;
}

export async function getDomainProviderConfig(): Promise<DomainProviderConfig> {
  let storedConfig: Record<string, any> = {};
  let registrarConfig: Record<string, any> = {};
  try {
    const apiKeys = await getAdminDocument('settings', 'api_keys').catch(() => ({ exists: false, data: null }));
    const registrarSettings = await getAdminDocument('hosting_config', 'registrar_settings').catch(() => ({ exists: false, data: null }));
    
    storedConfig = apiKeys.data || {};
    registrarConfig = registrarSettings.data?.openprovider || {};
  } catch (error: any) {
    // Silent catch
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

  return {
    domainApiType: 'openprovider',
    domainApiKey,
    openproviderPassword,
    openproviderSandbox,
    openproviderDefaultHandle,
  };
}
