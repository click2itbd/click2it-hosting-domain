export type SiteContext = 'ecommerce' | 'pc-build' | 'hosting';

const STORAGE_KEY = 'lastSiteContext';
let memoryContext: SiteContext | null = null;

export function getSiteContext(): SiteContext {
  return 'hosting';
}

export function setSiteContext(ctx: SiteContext): void {
  memoryContext = ctx;
}

export function useSiteContext(): SiteContext {
  return getSiteContext();
}
