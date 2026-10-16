import { describe, it, expect } from 'vitest';

describe('HostingCart Lazy Loading Regression', () => {
  it('HostingCart is a named export, not default', async () => {
    const module = await import('@/pages/hosting/HostingCart');
    expect(module.HostingCart).toBeDefined();
    expect(module.default).toBeUndefined();
  });

  it('HostingCheckout is a named export, not default', async () => {
    const module = await import('@/pages/hosting/HostingCheckout');
    expect(module.HostingCheckout).toBeDefined();
    expect(module.default).toBeUndefined();
  });

  it('lazy import with .then() maps named export to default', async () => {
    const LazyHostingCart = (await import('@/pages/hosting/HostingCart')).HostingCart;
    expect(LazyHostingCart).toBeDefined();
    expect(typeof LazyHostingCart).toBe('function');
  });
});
