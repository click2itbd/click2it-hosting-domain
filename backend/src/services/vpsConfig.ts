import { getAdminDocument, setAdminDocument } from '../firebase/admin.js';
import { VpsProvider, VpsProviderType } from '../providers/vps/VpsProvider.js';

export interface VpsPlanMapping {
  vps_starter: string;
  vps_standard: string;
  vps_pro: string;
  vps_ultra: string;
}

export interface VpsConfig {
  enabled: boolean;
  mode: 'live' | 'manual';
  provider: VpsProviderType;
  apiUrl: string;
  apiToken: string;
  apiSecret: string;
  defaultRegion: string;
  planMapping: VpsPlanMapping;
}

const DEFAULT_PLAN_MAPPINGS: Record<VpsProviderType, VpsPlanMapping> = {
  hetzner: {
    vps_starter: 'cx22',
    vps_standard: 'cpx31',
    vps_pro: 'cpx41',
    vps_ultra: 'cpx51',
  },
  digitalocean: {
    vps_starter: 's-2vcpu-4gb',
    vps_standard: 's-4vcpu-8gb',
    vps_pro: 's-8vcpu-16gb',
    vps_ultra: 's-8vcpu-32gb-amd',
  },
  vultr: {
    vps_starter: 'vc2-2c-4gb',
    vps_standard: 'vc2-4c-8gb',
    vps_pro: 'vc2-6c-16gb',
    vps_ultra: 'vc2-8c-32gb',
  },
  virtualizor: {
    vps_starter: '1',
    vps_standard: '2',
    vps_pro: '3',
    vps_ultra: '4',
  },
  contabo: {
    vps_starter: 'V91',
    vps_standard: 'V94',
    vps_pro: 'V97',
    vps_ultra: 'V100',
  },
};

const DEFAULTS: VpsConfig = {
  enabled: false,
  mode: 'manual',
  provider: 'hetzner',
  apiUrl: '',
  apiToken: '',
  apiSecret: '',
  defaultRegion: 'sin',
  planMapping: DEFAULT_PLAN_MAPPINGS.hetzner,
};

export const VPS_SECRET_FIELDS = ['apiToken', 'apiSecret'] as const;

export async function getVpsConfig(): Promise<VpsConfig> {
  const res: any = await getAdminDocument('settings', 'keys').catch(() => ({ data: {} }));
  const stored = (res?.data?.vps || {}) as Partial<VpsConfig>;
  const provider: VpsProviderType =
    stored.provider && ['hetzner', 'digitalocean', 'vultr', 'virtualizor', 'contabo'].includes(stored.provider)
      ? stored.provider
      : (process.env.VPS_PROVIDER as VpsProviderType) || DEFAULTS.provider;

  const defaultMap = DEFAULT_PLAN_MAPPINGS[provider] || DEFAULT_PLAN_MAPPINGS.hetzner;

  const cfg: VpsConfig = {
    ...DEFAULTS,
    provider,
    apiUrl: stored.apiUrl ?? process.env.VPS_API_URL ?? DEFAULTS.apiUrl,
    apiToken: stored.apiToken ?? process.env.VPS_API_TOKEN ?? DEFAULTS.apiToken,
    apiSecret: stored.apiSecret ?? process.env.VPS_API_SECRET ?? DEFAULTS.apiSecret,
    defaultRegion: stored.defaultRegion ?? process.env.VPS_DEFAULT_REGION ?? DEFAULTS.defaultRegion,
    enabled: stored.enabled !== undefined ? Boolean(stored.enabled) : process.env.VPS_ENABLED === 'true',
    mode: stored.mode === 'live' ? 'live' : 'manual',
    planMapping: {
      vps_starter: stored.planMapping?.vps_starter || defaultMap.vps_starter,
      vps_standard: stored.planMapping?.vps_standard || defaultMap.vps_standard,
      vps_pro: stored.planMapping?.vps_pro || defaultMap.vps_pro,
      vps_ultra: stored.planMapping?.vps_ultra || defaultMap.vps_ultra,
    },
  };

  return cfg;
}

export async function saveVpsConfig(input: Record<string, any>): Promise<void> {
  const res: any = await getAdminDocument('settings', 'keys').catch(() => ({ data: {} }));
  const all = res?.data || {};
  const current = (all.vps || {}) as Record<string, any>;
  const next: Record<string, any> = { ...current };

  if ('enabled' in input) next.enabled = Boolean(input.enabled);
  if ('mode' in input) next.mode = input.mode === 'live' ? 'live' : 'manual';
  if (
    'provider' in input &&
    ['hetzner', 'digitalocean', 'vultr', 'virtualizor', 'contabo'].includes(input.provider)
  ) {
    next.provider = input.provider;
  }
  if (typeof input.apiUrl === 'string') next.apiUrl = input.apiUrl.trim();
  if (typeof input.defaultRegion === 'string') next.defaultRegion = input.defaultRegion.trim();

  if (typeof input.apiToken === 'string' && input.apiToken.trim().length > 0) {
    next.apiToken = input.apiToken.trim();
  }
  if (typeof input.apiSecret === 'string' && input.apiSecret.trim().length > 0) {
    next.apiSecret = input.apiSecret.trim();
  }

  if (input.planMapping && typeof input.planMapping === 'object') {
    next.planMapping = {
      ...(current.planMapping || {}),
      ...input.planMapping,
    };
  }

  await setAdminDocument('settings', 'keys', {
    ...all,
    vps: next,
    updatedAt: new Date().toISOString(),
  });
}

export function maskVpsConfig(cfg: VpsConfig) {
  return {
    enabled: cfg.enabled,
    mode: cfg.mode,
    provider: cfg.provider,
    apiUrl: cfg.apiUrl,
    defaultRegion: cfg.defaultRegion,
    planMapping: cfg.planMapping,
    hasApiToken: Boolean(cfg.apiToken && cfg.apiToken.length > 0),
    hasApiSecret: Boolean(cfg.apiSecret && cfg.apiSecret.length > 0),
  };
}

export async function getVpsProviderWithSettings(override?: Partial<VpsConfig>) {
  const cfg = await getVpsConfig();
  const cleanOverride: Record<string, any> = {};
  if (override) {
    for (const [k, v] of Object.entries(override)) {
      if (typeof v === 'string' && v.trim().length === 0) continue;
      cleanOverride[k] = v;
    }
  }
  const active: VpsConfig = { ...cfg, ...cleanOverride };
  const providerInstance = new VpsProvider(
    active.provider,
    active.apiToken,
    active.apiSecret,
    active.apiUrl,
    active.defaultRegion
  );
  return { provider: providerInstance, config: active };
}
