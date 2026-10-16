import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdminDocument } from '../src/firebase/admin';
import { getDomainProviderConfig } from '../src/services/domainProviderConfig';

vi.mock('../src/firebase/admin', () => ({
  getAdminDocument: vi.fn(),
}));

describe('getDomainProviderConfig', () => {
  beforeEach(() => {
    vi.stubEnv('OPENPROVIDER_USERNAME', '');
    vi.stubEnv('OPENPROVIDER_PASSWORD', '');
    vi.mocked(getAdminDocument).mockResolvedValue({ exists: false, data: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('selects Openprovider credentials from the environment', async () => {
    vi.stubEnv('OPENPROVIDER_USERNAME', 'openprovider-user');
    vi.stubEnv('OPENPROVIDER_PASSWORD', 'openprovider-password');
    vi.stubEnv('OPENPROVIDER_SANDBOX_MODE', 'false');

    await expect(getDomainProviderConfig()).resolves.toMatchObject({
      domainApiType: 'openprovider',
      domainApiKey: 'openprovider-user',
      openproviderPassword: 'openprovider-password',
      openproviderSandbox: false,
    });
  });

  it('uses Openprovider credentials saved in the registrar settings', async () => {
    delete process.env.OPENPROVIDER_SANDBOX_MODE;
    vi.mocked(getAdminDocument).mockImplementation(async (collection, docId) => ({
      exists: collection === 'hosting_config' && docId === 'registrar_settings',
      data: collection === 'hosting_config' && docId === 'registrar_settings'
        ? { openprovider: { username: 'stored-user', password: 'stored-password', isSandbox: true } }
        : null,
    }));

    await expect(getDomainProviderConfig()).resolves.toMatchObject({
      domainApiType: 'openprovider',
      domainApiKey: 'stored-user',
      openproviderPassword: 'stored-password',
      openproviderSandbox: true,
    });
  });
});
