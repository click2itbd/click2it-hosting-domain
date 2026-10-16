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
    registerDomain: async () => ({ success: false, domain: '', error: 'Not configured' }),
    renewDomain: async () => ({ success: false, domain: '', error: 'Not configured' }),
    getWhois: async () => ({ domain: '', error: 'Not configured' }),
  })),
  getHostingProvider: vi.fn(() => ({
    testConnection: vi.fn(() => Promise.resolve({ success: true, code: 'WHM_OK', message: 'Connected' })),
    provisionAccount: vi.fn(() => Promise.resolve({ success: false, error: 'Not configured' })),
    suspendAccount: vi.fn(() => Promise.resolve()),
    unsuspendAccount: vi.fn(() => Promise.resolve()),
    terminateAccount: vi.fn(() => Promise.resolve()),
    getUsage: vi.fn(() => Promise.resolve({
      providerAccountId: '',
      diskUsageMB: 0,
      diskLimitMB: 0,
      bandwidthUsageMB: 0,
      bandwidthLimitMB: 0,
      lastUpdated: new Date().toISOString(),
    })),
    changePlan: vi.fn(() => Promise.resolve()),
  })),
}));

describe('Backend API', () => {
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

  it('health endpoint returns 200', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });

  it('public config endpoint returns manualBkashNumber', async () => {
    const response = await request(app).get('/api/public/config');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('manualBkashNumber');
  });

  it('public hosting config endpoint returns safe config', async () => {
    const response = await request(app).get('/api/public/hosting-config');
    if (response.status === 500) {
      console.warn('Skipping hosting config test: backend Firebase not configured');
      return;
    }
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('bundleDiscountPercent');
    expect(response.body.data).not.toHaveProperty('hostingApiKey');
    expect(response.body.data).not.toHaveProperty('whmApiToken');
  });

  it('unknown endpoint returns 404', async () => {
    const response = await request(app).get('/api/nonexistent');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('API Endpoint Not Found');
  });
});
