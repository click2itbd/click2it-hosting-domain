import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApp } from '../src/app';
import request from 'supertest';

const createdOrders = new Map<string, any>();
let lastIdempotencyKey: string | undefined;
let lastOrderId: string | undefined;

const mockDocRef = () => {
  const id = lastOrderId || 'mock-doc-id-' + Math.random().toString(36).slice(2);
  return {
    id,
    get: vi.fn(() => Promise.resolve({ exists: false, data: () => null })),
    set: vi.fn((data: any) => {
      lastIdempotencyKey = data?.idempotencyKey;
      lastOrderId = id;
      if (lastIdempotencyKey) {
        createdOrders.set(lastIdempotencyKey, { ...data, orderId: id });
      }
    }),
    update: vi.fn(),
  };
};

const mockQuery = () => ({
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  get: vi.fn(() => {
    if (lastIdempotencyKey && createdOrders.has(lastIdempotencyKey)) {
      const order = createdOrders.get(lastIdempotencyKey);
      return Promise.resolve({
        empty: false,
        docs: [{ id: order.orderId, data: () => order }],
      });
    }
    return Promise.resolve({ empty: true, docs: [] });
  }),
});

const mockCollection = (collectionName: string) => ({
  doc: vi.fn(() => mockDocRef()),
  where: vi.fn().mockReturnValue(mockQuery()),
  orderBy: vi.fn().mockReturnValue(mockQuery()),
  add: vi.fn((data: any) => {
    const idempotencyKey = data.idempotencyKey;
    if (idempotencyKey) {
      createdOrders.set(idempotencyKey, { ...data, orderId: 'existing-order-' + Date.now() });
    }
  }),
});

vi.mock('../src/firebase/admin', () => {
  const actual = vi.importActual('../src/firebase/admin');
  return {
    ...actual,
    getAdminDb: vi.fn(() => ({
      collection: vi.fn((name: string) => mockCollection(name)),
    })),
    getAdminDocument: vi.fn((collection: string, docId: string) => Promise.resolve({
      exists: collection === 'settings' && docId === 'public_config',
      data: collection === 'settings' && docId === 'public_config'
        ? { usdToBdtRate: 120, domainMarkupPercent: 15 }
        : null,
    })),
    setAdminDocument: vi.fn(),
    isUserAdmin: vi.fn(() => false),
  };
});

vi.mock('../src/providers/providerFactory', () => ({
  getDomainProvider: vi.fn(() => ({
    checkAvailability: vi.fn(() => [
      { domain: 'testclick2itbd.com', available: true, price: 10, currency: 'USD', status: 'available' },
    ]),
    getSuggestions: vi.fn(() => ['testclick2itbd.net']),
    getTldPricing: vi.fn(() => ({
      tld: '.com',
      currency: 'USD',
      registrationPrice: 10,
      renewalPrice: 8,
      transferPrice: 12,
      restorePrice: 20,
    })),
    testConnection: vi.fn(() => ({
      success: true,
      code: '200',
      message: 'Provider connection verified',
    })),
    getBatchTldPricing: vi.fn(() => ({
      pricing: [
        { tld: '.com', supplierPriceUsd: 10, currency: 'USD' },
        { tld: '.net', supplierPriceUsd: 12, currency: 'USD' },
      ],
    })),
    getRenewalPrice: vi.fn(() => ({
      success: true,
      domain: 'testclick2itbd.com',
      tld: '.com',
      supplierPriceUsd: 10,
      maxDuration: 10,
    })),
    getRenewalPriceBreakdown: vi.fn(() => ({
      success: true,
      domain: 'testclick2itbd.com',
      tld: '.com',
      sellingPriceBdt: 1200,
      isSandbox: false,
    })),
    registerDomain: vi.fn(() => ({
      success: true,
      domain: 'testclick2itbd.com',
      registrationId: 'REG123',
      expiresAt: '2027-01-01',
    })),
    renewDomain: vi.fn(() => ({
      success: true,
      domain: 'testclick2itbd.com',
      newExpiryDate: '2027-01-01',
    })),
    transferDomain: vi.fn(() => ({
      success: true,
      domain: 'testclick2itbd.com',
      transferId: 'TRF123',
      status: 'success',
    })),
  })),
}));

describe('Domain Production Flow', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    createdOrders.clear();
    lastIdempotencyKey = undefined;
    lastOrderId = undefined;
    process.env.NODE_ENV = 'test';
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = '';
    process.env.EXPRESS_API_KEY = 'test-api-key';
    app = createApp();
  });

  it('health endpoint returns 200', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
  });

  it('search returns available domains', async () => {
    const response = await request(app)
      .post('/api/domains/check')
      .send({ domains: ['testclick2itbd.com'] });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data[0].currency).toBe('BDT');
    expect(response.body.data[0].price).toBeGreaterThan(0);
    expect(response.body.data[0].priceBdt).toBe(response.body.data[0].price);
    expect(response.body.data[0].renewalPrice).toBeGreaterThan(0);
  });

  it('does not return catalog fallback prices when the provider quote is invalid', async () => {
    const { getDomainProvider } = await import('../src/providers/providerFactory');
    const provider = getDomainProvider();
    vi.mocked(getDomainProvider).mockReturnValueOnce({
      ...provider,
      checkAvailability: vi.fn(() => Promise.resolve([
        { domain: 'testclick2itbd.com', available: true, price: 100, currency: 'BDT' },
      ])),
      getTldPricing: vi.fn(() => Promise.resolve({
        tld: '.com',
        currency: 'EUR',
        registrationPrice: 10,
        renewalPrice: 12,
        transferPrice: 10,
        restorePrice: 0,
      })),
    });

    const response = await request(app)
      .post('/api/domains/check')
      .send({ domains: ['testclick2itbd.com'] });

    expect(response.status).toBe(200);
    expect(response.body.data[0].price).toBeUndefined();
    expect(response.body.data[0].renewalPrice).toBeUndefined();
    expect(response.body.data[0].error).toContain('valid registration and renewal price');
  });

  it('tests provider credentials through the provider connection method', async () => {
    const response = await request(app)
      .post('/api/domains/test-connection')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Provider connection verified');
  });

  it('tld pricing returns customer BDT price only, no wholesale/exchange/markup', async () => {
    const response = await request(app)
      .post('/api/domains/tld-pricing')
      .send({ tld: 'com' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.currency).toBe('BDT');
    expect(response.body.data.registrationPrice).toBeGreaterThan(0);
    expect(response.body.data).not.toHaveProperty('supplierPriceUsd');
    expect(response.body.data).not.toHaveProperty('exchangeRate');
    expect(response.body.data).not.toHaveProperty('markupPercent');
  });

  it('batch pricing returns customer BDT prices only', async () => {
    const response = await request(app)
      .post('/api/domains/tld-pricing-batch')
      .send({ tlds: ['com', 'net'] });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.pricing)).toBe(true);
    response.body.data.pricing.forEach((item: any) => {
      expect(item.currency).toBe('BDT');
      expect(item.customerPriceBdt).toBeGreaterThan(0);
      expect(item).not.toHaveProperty('supplierPriceUsd');
    });
  });

  it('creates renewal orders with the server-calculated wholesale price for the full term', async () => {
    const response = await request(app)
      .post('/api/domains/renewal-order')
      .send({
        domain: 'testclick2itbd.com',
        renewalPeriod: 2,
        customerName: 'Test User',
        customerEmail: 'test@example.com',
        customerPhone: '01700000000',
        paymentMethod: 'bkash',
        totalBdt: 1,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.order.totalBdt).toBe(2760);
    expect(response.body.order.supplierPriceUsd).toBe(20);
  });

  it('registration creates pending_payment order with idempotency', async () => {
    const authHeader = {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwic3ViIjoiYWRtaW4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiZXhwIjo5OTk5OTk5OTk5OTk5OTk5fQ.test',
      'X-Idempotency-Key': 'test-domain-com-1',
    };

    const response = await request(app)
      .post('/api/domains/register')
      .set(authHeader)
      .send({
        domain: 'testclick2itbd.com',
        years: 1,
        contactId: 'test-user',
        nameServers: ['ns1.test.com'],
        autoRenew: true,
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.orderId).toBeDefined();
    expect(response.body.data.status).toBe('pending_payment');
    expect(response.body.data.customerPriceBdt).toBeGreaterThan(0);
    expect(response.body.data.idempotencyKey).toBe('test-domain-com-1');
  });

  it('duplicate registration returns existing order', async () => {
    const firstResponse = await request(app)
      .post('/api/domains/register')
      .set('X-Idempotency-Key', 'test-domain-com-1')
      .send({
        domain: 'testclick2itbd.com',
        years: 1,
        contactId: 'test-user',
      });

    expect(firstResponse.status).toBe(200);

    const authHeader = {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwic3ViIjoiYWRtaW4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiZXhwIjo5OTk5OTk5OTk5OTk5OTk5fQ.test',
      'X-Idempotency-Key': 'test-domain-com-1',
    };

    const response = await request(app)
      .post('/api/domains/register')
      .set(authHeader)
      .send({
        domain: 'testclick2itbd.com',
        years: 1,
        contactId: 'test-user',
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Duplicate request detected');
    expect(response.body.data.orderId).toBeDefined();
  });

  it('transfer creates pending_payment order with idempotency', async () => {
    const authHeader = {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwic3ViIjoiYWRtaW4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiZXhwIjo5OTk5OTk5OTk5OTk5OTk5fQ.test',
      'X-Idempotency-Key': 'test-domain-com-1',
    };

    const response = await request(app)
      .post('/api/domains/transfer')
      .set(authHeader)
      .send({
        domain: 'testclick2itbd.com',
        authCode: 'test-auth-code',
        years: 1,
        customerName: 'Test User',
        customerEmail: 'test@example.com',
        customerPhone: '01700000000',
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.orderId).toBeDefined();
    expect(response.body.order.status).toBe('pending_payment');
    expect(response.body.order.idempotencyKey).toBe('test-domain-com-1');
  });

  it('transfer eligibility check works', async () => {
    const response = await request(app)
      .post('/api/domains/transfer/check-eligibility')
      .send({ domain: 'testclick2itbd.com' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('eligible');
    expect(response.body.data).toHaveProperty('reason');
    expect(response.body.data.domain).toBe('testclick2itbd.com');
  });

  it('unauthorized access to admin endpoints returns 401', async () => {
    const response = await request(app)
      .post('/api/domains/fulfill')
      .send({ orderId: 'test', orderType: 'registration' });
    
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Missing or invalid authorization token');
  });

  it('unknown endpoint returns 404', async () => {
    const response = await request(app).get('/api/nonexistent');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('API Endpoint Not Found');
  });
});
