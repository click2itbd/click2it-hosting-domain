import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApp } from '../src/app';
import request from 'supertest';

const mockDocRef = () => ({
  id: 'mock-hosting-id-' + Math.random().toString(36).slice(2),
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
  getHostingProvider: vi.fn(() => ({
    testConnection: vi.fn(() => Promise.resolve({ success: true, code: 'WHM_OK', message: 'Connected' })),
    provisionAccount: vi.fn(() => Promise.resolve({
      success: true,
      providerAccountId: 'testuser',
      cPanelUrl: 'https://test.com:2083',
      nameservers: ['ns1.test.com', 'ns2.test.com'],
    })),
    suspendAccount: vi.fn(() => Promise.resolve()),
    unsuspendAccount: vi.fn(() => Promise.resolve()),
    terminateAccount: vi.fn(() => Promise.resolve()),
    getUsage: vi.fn(() => Promise.resolve({
      providerAccountId: 'testuser',
      diskUsageMB: 500,
      diskLimitMB: 10240,
      bandwidthUsageMB: 5000,
      bandwidthLimitMB: 102400,
      lastUpdated: new Date().toISOString(),
    })),
    changePlan: vi.fn(() => Promise.resolve()),
  })),
}));

describe('Hosting Production Flow', () => {
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
    const response = await request(app).get('/api/hosting/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('test-connection returns success', async () => {
    const response = await request(app)
      .post('/api/hosting/test-connection')
      .send({});
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.code).toBe('WHM_OK');
  });

  it('provision creates hosting account', async () => {
    const authHeader = {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwic3ViIjoiYWRtaW4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiZXhwIjo5OTk5OTk5OTk5OTk5OTk5fQ.test',
    };

    const response = await request(app)
      .post('/api/hosting/provision')
      .set(authHeader)
      .send({
        domain: 'testdomain.com',
        contactEmail: 'test@example.com',
        billingCycle: 'monthly',
        planCode: 'basic',
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.providerAccountId).toBe('testuser');
    expect(response.body.data.cPanelUrl).toBeDefined();
  });

  it('suspend works', async () => {
    const authHeader = {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwic3ViIjoiYWRtaW4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiZXhwIjo5OTk5OTk5OTk5OTk5OTk5fQ.test',
    };

    const response = await request(app)
      .post('/api/hosting/suspend')
      .set(authHeader)
      .send({ providerAccountId: 'testuser' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('unsuspend works', async () => {
    const authHeader = {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwic3ViIjoiYWRtaW4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiZXhwIjo5OTk5OTk5OTk5OTk5OTk5fQ.test',
    };

    const response = await request(app)
      .post('/api/hosting/unsuspend')
      .set(authHeader)
      .send({ providerAccountId: 'testuser' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('terminate requires admin', async () => {
    const authHeader = {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwic3ViIjoiYWRtaW4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiZXhwIjo5OTk5OTk5OTk5OTk5OTk5fQ.test',
    };

    const response = await request(app)
      .post('/api/hosting/terminate')
      .set(authHeader)
      .send({ providerAccountId: 'testuser' });
    
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Admin authorization required for termination');
  });

  it('change-package works with valid package', async () => {
    const authHeader = {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwic3ViIjoiYWRtaW4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiZXhwIjo5OTk5OTk5OTk5OTk5OTk5fQ.test',
    };

    const response = await request(app)
      .post('/api/hosting/change-package')
      .set(authHeader)
      .send({ providerAccountId: 'testuser', newPlanCode: 'business' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('change-package rejects invalid package', async () => {
    const authHeader = {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwic3ViIjoiYWRtaW4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiZXhwIjo5OTk5OTk5OTk5OTk5OTk5fQ.test',
    };

    const response = await request(app)
      .post('/api/hosting/change-package')
      .set(authHeader)
      .send({ providerAccountId: 'testuser', newPlanCode: 'malicious_package' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid package');
  });

  it('unauthorized access returns 401', async () => {
    const response = await request(app)
      .post('/api/hosting/suspend')
      .send({ providerAccountId: 'testuser' });
    
    expect(response.status).toBe(401);
  });
});
