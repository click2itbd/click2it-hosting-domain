export type PlatformDomainMode = 'hosting' | 'ecommerce';

/**
 * Determines whether the current application is running in 'hosting' (click2it.bd)
 * or 'ecommerce' (click2itbd.com) context.
 */
export const getPlatformDomainMode = (): PlatformDomainMode => {
  if (typeof window === 'undefined') return 'hosting';
  const host = window.location.hostname.toLowerCase();

  // If domain is explicitly click2itbd.com (Store & PC Build)
  if (host === 'click2itbd.com' || host.endsWith('.click2itbd.com')) {
    return 'ecommerce';
  }

  // If domain is explicitly click2it.bd (Hosting & Domain)
  if (host === 'click2it.bd' || host.endsWith('.click2it.bd')) {
    return 'hosting';
  }

  // Local development / fallback checks based on current path
  const path = window.location.pathname.toLowerCase();
  if (path.startsWith('/admin/e-commerce') || path.startsWith('/shop') || path.startsWith('/pc-builder')) {
    return 'ecommerce';
  }

  // Default for click2it-hosting-domain repo is hosting (click2it.bd)
  return 'hosting';
};

export const getPlatform = () => {
  return getPlatformDomainMode();
};

/**
 * Checks whether an order is strictly hosting/domain-related vs ecommerce/store product.
 */
export const isHostingRelatedOrder = (data: any): boolean => {
  if (!data) return false;

  // 1. Explicit platform / type tags
  const p = (data.platform || data.source || data.serviceType || data.orderType || data.type || '').toLowerCase();
  if (p === 'hosting' || p === 'domain' || p === 'click2it.bd') return true;
  if (p === 'ecommerce' || p === 'store' || p === 'click2itbd.com') return false;

  // 2. Direct domain properties on order
  if (data.domain || data.tld || data.period || data.hostingPlan || data.providerStatus || data.cloudLinuxIp) {
    return true;
  }

  // 3. Exclude quote requests (e.g. #QUO-00022 are PC build or project quotes)
  const docNum = (data.documentNumber || '').toUpperCase();
  if (docNum.startsWith('QUO-')) {
    return false;
  }

  // 4. Line items analysis
  if (Array.isArray(data.items) && data.items.length > 0) {
    // If any item matches hosting, domain, vps, ssl, or license keywords
    const hasHostingItem = data.items.some((item: any) => {
      const type = (item.itemType || item.type || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      const name = (item.name || item.domain || '').toLowerCase();

      return (
        type === 'hosting' ||
        type === 'domain' ||
        type === 'ssl' ||
        type === 'vps' ||
        type === 'license' ||
        type === 'server' ||
        cat.includes('hosting') ||
        cat.includes('domain') ||
        cat.includes('vps') ||
        Boolean(item.domain) ||
        Boolean(item.tld) ||
        Boolean(item.termYears) ||
        name.includes('domain') ||
        name.includes('hosting') ||
        name.includes('cpanel') ||
        name.includes('vps') ||
        name.includes('cloudlinux') ||
        item.isDigital === true
      );
    });

    if (hasHostingItem) return true;

    // If items have store-specific fields (e.g. physical product SKU, physical stock)
    const hasStoreItem = data.items.some((item: any) => {
      return item.productId || item.sku || item.stock !== undefined;
    });
    if (hasStoreItem) return false;
  }

  return false;
};
