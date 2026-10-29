import { getAdminDocument, setAdminDocument } from '../firebase/admin.js';
import { CloudLinuxProvider } from '../providers/cloudlinux/CloudLinuxProvider.js';
const DEFAULTS = {
    enabled: false,
    mode: 'manual',
    apiUrl: 'https://cln.cloudlinux.com/cln/api',
    partnerLogin: '',
    apiToken: '',
    secretKey: '',
};
export const CLOUDLINUX_SECRET_FIELDS = ['apiToken', 'secretKey'];
const ALL_FIELDS = Object.keys(DEFAULTS);
export async function getCloudLinuxConfig() {
    const res = await getAdminDocument('settings', 'keys').catch(() => ({ data: {} }));
    const stored = (res?.data?.cloudlinux || {});
    const cfg = {
        ...DEFAULTS,
        apiUrl: process.env.CLOUDLINUX_API_URL || DEFAULTS.apiUrl,
        partnerLogin: process.env.CLOUDLINUX_PARTNER_LOGIN || DEFAULTS.partnerLogin,
        apiToken: process.env.CLOUDLINUX_API_TOKEN || DEFAULTS.apiToken,
        secretKey: process.env.CLOUDLINUX_SECRET_KEY || DEFAULTS.secretKey,
        enabled: process.env.CLOUDLINUX_ENABLED === 'true',
        ...stored,
    };
    cfg.enabled = cfg.enabled === true;
    cfg.mode = cfg.mode === 'live' ? 'live' : 'manual';
    if (!cfg.apiUrl)
        cfg.apiUrl = DEFAULTS.apiUrl;
    return cfg;
}
export async function saveCloudLinuxConfig(input) {
    const res = await getAdminDocument('settings', 'keys').catch(() => ({ data: {} }));
    const all = res?.data || {};
    const current = (all.cloudlinux || {});
    const next = { ...current };
    for (const key of ALL_FIELDS) {
        if (!(key in input))
            continue;
        const val = input[key];
        if (CLOUDLINUX_SECRET_FIELDS.includes(key)) {
            if (typeof val === 'string' && val.trim().length > 0) {
                next[key] = val.trim();
            }
        }
        else if (key === 'enabled') {
            next[key] = Boolean(val);
        }
        else if (key === 'mode') {
            next[key] = val === 'live' ? 'live' : 'manual';
        }
        else if (typeof val === 'string') {
            next[key] = val.trim();
        }
    }
    await setAdminDocument('settings', 'keys', {
        ...all,
        cloudlinux: next,
        updatedAt: new Date().toISOString(),
    });
}
export function maskCloudLinuxConfig(cfg) {
    return {
        enabled: cfg.enabled,
        mode: cfg.mode,
        apiUrl: cfg.apiUrl,
        partnerLogin: cfg.partnerLogin,
        hasApiToken: Boolean(cfg.apiToken && cfg.apiToken.length > 0),
        hasSecretKey: Boolean(cfg.secretKey && cfg.secretKey.length > 0),
    };
}
export async function getCloudLinuxProviderWithSettings(override) {
    const cfg = await getCloudLinuxConfig();
    const cleanOverride = {};
    if (override) {
        for (const [k, v] of Object.entries(override)) {
            if (typeof v === 'string' && v.trim().length === 0)
                continue;
            cleanOverride[k] = v;
        }
    }
    const active = { ...cfg, ...cleanOverride };
    return new CloudLinuxProvider(active.apiUrl, active.apiToken, active.partnerLogin, active.secretKey);
}
export function resolveCloudLinuxType(planSlugOrId) {
    const s = String(planSlugOrId || '').toLowerCase();
    if (s.includes('solo'))
        return 16;
    if (s.includes('admin'))
        return 17;
    return 1; // Default Shared Pro / Shared
}
