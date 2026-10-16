import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  order: {
    paymentStatus: 'verified',
    status: 'pending',
    customerEmail: '',
    items: [{ itemType: 'domain' }],
  } as Record<string, any>,
  domainOrder: {
    domain: 'example.com',
    orderId: 'order-1',
    status: 'pending',
    type: 'registration',
    years: 1,
  } as Record<string, any>,
  registerDomain: vi.fn(),
  transferDomain: vi.fn(),
  transferAuthCode: 'test-epp-code',
  authCodeDelete: vi.fn(),
  domainUpdate: vi.fn(),
  orderUpdate: vi.fn(),
}));

vi.mock('../src/firebase/admin', () => ({
  getAdminDb: () => ({
    collection: (name: string) => {
      if (name === 'orders') {
        return {
          doc: () => ({
            get: async () => ({ exists: true, data: () => ({ ...state.order }) }),
            update: async (patch: Record<string, unknown>) => {
              Object.assign(state.order, patch);
              state.orderUpdate(patch);
            },
          }),
        };
      }
      if (name === 'domainOrders') {
        return {
          where: () => ({
            get: async () => ({
              docs: [{
                id: 'domain-order-1',
                data: () => ({ ...state.domainOrder }),
              }],
            }),
          }),
          doc: () => ({
            update: async (patch: Record<string, unknown>) => {
              Object.assign(state.domainOrder, patch);
              state.domainUpdate(patch);
            },
          }),
        };
      }
      if (name === 'hostingAccounts') {
        return { where: () => ({ get: async () => ({ docs: [] }) }) };
      }
      if (name === 'transferAuthCodes') {
        return {
          doc: () => ({
            get: async () => ({
              exists: Boolean(state.transferAuthCode),
              data: () => ({ authCode: state.transferAuthCode }),
            }),
            delete: async () => {
              state.authCodeDelete();
              state.transferAuthCode = '';
            },
          }),
        };
      }
      return { add: vi.fn() };
    },
  }),
  getAdminDocument: async () => ({ exists: false, data: null }),
}));

vi.mock('../src/providers/domainProviderConfig', () => ({
  getDomainProviderConfig: async () => ({
    domainApiType: 'openprovider',
    domainApiKey: 'test-user',
    openproviderPassword: 'test-password',
    openproviderSandbox: true,
  }),
}));

vi.mock('../src/services/btclConfig', () => ({
  resolveDomainProvider: async () => ({
    viaBtcl: false,
    provider: {
      registerDomain: state.registerDomain,
      transferDomain: state.transferDomain,
    },
  }),
}));

vi.mock('../src/services/email', () => ({ sendEmail: vi.fn() }));

import { fulfillOrder } from '../src/services/fulfillment';

describe('Openprovider pending fulfillment', () => {
  beforeEach(() => {
    state.order = {
      paymentStatus: 'verified',
      status: 'pending',
      customerEmail: '',
      items: [{ itemType: 'domain' }],
    };
    state.domainOrder = {
      domain: 'example.com',
      orderId: 'order-1',
      status: 'pending',
      type: 'registration',
      years: 1,
    };
    state.registerDomain.mockReset().mockResolvedValue({
      success: true,
      domain: 'example.com',
      registrationId: 'op-reg-123',
      status: 'REQ',
      providerHttpStatus: 202,
      providerCode: '0',
      requestStartedAt: '2026-01-01T00:00:00.000Z',
      responseReceivedAt: '2026-01-01T00:00:01.000Z',
    });
    state.transferDomain.mockReset().mockResolvedValue({
      success: true,
      domain: 'example.com',
      transferId: 'op-transfer-123',
      status: 'REQ',
      providerHttpStatus: 202,
      providerCode: '0',
      requestStartedAt: '2026-01-01T00:00:00.000Z',
      responseReceivedAt: '2026-01-01T00:00:01.000Z',
    });
    state.transferAuthCode = 'test-epp-code';
    state.authCodeDelete.mockReset();
    state.domainUpdate.mockReset();
    state.orderUpdate.mockReset();
  });

  it('keeps REQ pending, persists registrar evidence, and does not submit it again on retry', async () => {
    const firstResult = await fulfillOrder('order-1', 'admin-1');

    expect(firstResult).toMatchObject({ success: false, status: 'pending' });
    expect(state.order.status).toBe('fulfillment_pending');
    expect(state.domainOrder).toMatchObject({
      status: 'pending',
      registrationId: 'op-reg-123',
      providerStatus: 'REQ',
      providerHttpStatus: 202,
      providerCode: '0',
      providerRequestStartedAt: '2026-01-01T00:00:00.000Z',
      providerResponseReceivedAt: '2026-01-01T00:00:01.000Z',
    });

    const retryResult = await fulfillOrder('order-1', 'admin-1');

    expect(retryResult).toMatchObject({ success: false, status: 'pending' });
    expect(state.registerDomain).toHaveBeenCalledTimes(1);
  });

  it('loads transfer EPP code from protected storage, tracks pending transfer, and deletes the consumed code', async () => {
    state.domainOrder = {
      domain: 'example.com',
      orderId: 'order-1',
      status: 'pending',
      type: 'transfer',
      years: 1,
    };

    const firstResult = await fulfillOrder('order-1', 'admin-1');

    expect(firstResult).toMatchObject({ success: false, status: 'pending' });
    expect(state.transferDomain).toHaveBeenCalledWith('example.com', 'test-epp-code', 1);
    expect(state.domainOrder).toMatchObject({
      status: 'pending',
      registrationId: 'op-transfer-123',
      transferId: 'op-transfer-123',
      providerStatus: 'REQ',
    });
    expect(state.authCodeDelete).toHaveBeenCalledOnce();
    expect(state.transferAuthCode).toBe('');

    const retryResult = await fulfillOrder('order-1', 'admin-1');

    expect(retryResult).toMatchObject({ success: false, status: 'pending' });
    expect(state.transferDomain).toHaveBeenCalledOnce();
  });

  it('does not resubmit a transfer when its API outcome is indeterminate', async () => {
    state.domainOrder = {
      domain: 'example.com',
      orderId: 'order-1',
      status: 'pending',
      type: 'transfer',
      years: 1,
    };
    state.transferDomain.mockResolvedValueOnce({
      success: false,
      domain: 'example.com',
      requestStartedAt: '2026-01-01T00:00:00.000Z',
    });

    const firstResult = await fulfillOrder('order-1', 'admin-1');

    expect(firstResult.status).toBe('manual_review');
    expect(state.domainOrder.transferSubmissionIndeterminate).toBe(true);

    const retryResult = await fulfillOrder('order-1', 'admin-1');

    expect(retryResult.status).toBe('manual_review');
    expect(state.transferDomain).toHaveBeenCalledOnce();
  });
});
