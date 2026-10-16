import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApp } from '../src/app';
import request from 'supertest';

const mockDocRef = () => ({
  id: 'mock-doc-id-' + Math.random().toString(36).slice(2),
  get: vi.fn(() => Promise.resolve({ exists: false, data: () => null })),
  set: vi.fn(),
  update: vi.fn(),
});

const mockQuery = () => ({
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  get: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
});

const mockCollection = (collectionName: string) => ({
  doc: vi.fn(() => mockDocRef()),
  where: vi.fn().mockReturnValue(mockQuery()),
  orderBy: vi.fn().mockReturnValue(mockQuery()),
  add: vi.fn(),
});

vi.mock('../src/firebase/admin', () => {
  const actual = vi.importActual('../src/firebase/admin');
  return {
    ...actual,
    getAdminDb: vi.fn(() => ({
      collection: vi.fn((name: string) => mockCollection(name)),
    })),
    getAdminDocument: vi.fn(() => Promise.resolve({
      exists: false,
      data: null,
    })),
    setAdminDocument: vi.fn(),
    isUserAdmin: vi.fn(() => false),
  };
});

vi.mock('../src/providers/providerFactory', () => ({
  getDomainProvider: vi.fn(() => ({
    checkAvailability: async () => [],
    getSuggestions: async () => [],
    getTldPricing: async () => ({ tld: '.com', currency: 'USD', registrationPrice: 10, renewalPrice: 8, transferPrice: 12, restorePrice: 20 }),
    getBatchTldPricing: async () => ({ pricing: [] }),
    getRenewalPrice: async () => ({ success: true, domain: '', tld: '', supplierPriceUsd: 10, maxDuration: 10 }),
    getRenewalPriceBreakdown: async () => ({ success: true, domain: '', tld: '', sellingPriceBdt: 0, isSandbox: false }),
    registerDomain: async () => ({ success: true, domain: 'test.com', registrationId: 'REG123', expiresAt: '2027-01-01' }),
    renewDomain: async () => ({ success: true, domain: 'test.com', newExpiryDate: '2027-01-01' }),
    getWhois: async () => ({ domain: '', error: 'Not configured' }),
    transferDomain: async () => ({ success: true, domain: 'test.com', transferId: 'TRF123' }),
  })),
  getHostingProvider: vi.fn(() => ({
    testConnection: async () => ({ success: true, code: 'WHM_OK', message: 'Connected' }),
    provisionAccount: async () => ({ success: true, providerAccountId: 'testuser', cPanelUrl: 'https://test.com:2083', nameservers: ['ns1.test.com'] }),
    suspendAccount: async () => {},
    unsuspendAccount: async () => {},
    terminateAccount: async () => {},
    getUsage: async () => ({
      providerAccountId: '',
      diskUsageMB: 0,
      diskLimitMB: 0,
      bandwidthUsageMB: 0,
      bandwidthLimitMB: 0,
      lastUpdated: new Date().toISOString(),
    }),
    changePlan: async () => {},
  })),
}));

describe('Fulfillment Engine', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = '';
    process.env.EXPRESS_API_KEY = 'test-api-key';
    process.env.WHM_API_TOKEN = 'test-whm-token';
    process.env.WHM_API_URL = 'https://test-whm.com:2087';
    process.env.WHM_USERNAME = 'root';
    app = createApp();
  });

  it('retry fulfillment endpoint exists and requires admin', async () => {
    const response = await request(app)
      .post('/api/orders/admin/test-order/retry-fulfillment')
      .send({});
    
    expect(response.status).toBe(401);
  });
});
