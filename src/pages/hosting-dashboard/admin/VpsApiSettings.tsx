import React, { useEffect, useState } from 'react';
import {
  Server,
  Loader2,
  Save,
  PlugZap,
  ShieldCheck,
  Eye,
  EyeOff,
  Key,
  Globe,
  Cpu,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiGet, apiPost } from '../../../services/apiClient';

type VpsProviderType = 'hetzner' | 'digitalocean' | 'vultr' | 'virtualizor' | 'contabo';

interface VpsPlanMapping {
  vps_starter: string;
  vps_standard: string;
  vps_pro: string;
  vps_ultra: string;
}

interface VpsApiForm {
  enabled: boolean;
  mode: 'live' | 'manual';
  provider: VpsProviderType;
  apiUrl: string;
  apiToken: string;
  apiSecret: string;
  defaultRegion: string;
  planMapping: VpsPlanMapping;
}

const PROVIDER_PRESETS: Record<
  VpsProviderType,
  {
    label: string;
    subtitle: string;
    defaultRegion: string;
    regionHint: string;
    needsUrl: boolean;
    needsSecret: boolean;
    tokenPortalUrl: string;
    planMapping: VpsPlanMapping;
  }
> = {
  hetzner: {
    label: 'Hetzner Cloud',
    subtitle: 'Best wholesale profit margin (~€4.5/mo) • 10s deployment',
    defaultRegion: 'sin',
    regionHint: 'sin (Singapore), fsn1 (Germany), hel1 (Finland), ash (USA)',
    needsUrl: false,
    needsSecret: false,
    tokenPortalUrl: 'https://console.hetzner.cloud/',
    planMapping: {
      vps_starter: 'cx22',
      vps_standard: 'cpx31',
      vps_pro: 'cpx41',
      vps_ultra: 'cpx51'
    }
  },
  digitalocean: {
    label: 'DigitalOcean',
    subtitle: 'Ultra-reliable Droplet API • Singapore & Bangalore zones',
    defaultRegion: 'sgp1',
    regionHint: 'sgp1 (Singapore), blr1 (Bangalore), fra1 (Frankfurt), nyc1 (USA)',
    needsUrl: false,
    needsSecret: false,
    tokenPortalUrl: 'https://cloud.digitalocean.com/account/api/tokens',
    planMapping: {
      vps_starter: 's-2vcpu-4gb',
      vps_standard: 's-4vcpu-8gb',
      vps_pro: 's-8vcpu-16gb',
      vps_ultra: 's-8vcpu-32gb-amd'
    }
  },
  vultr: {
    label: 'Vultr Cloud Compute',
    subtitle: 'Low latency in Asia (Singapore/Mumbai) + Windows Server support',
    defaultRegion: 'sgp',
    regionHint: 'sgp (Singapore), bom (Mumbai), del (Delhi), nrt (Tokyo)',
    needsUrl: false,
    needsSecret: false,
    tokenPortalUrl: 'https://my.vultr.com/settings/#settingsapi',
    planMapping: {
      vps_starter: 'vc2-2c-4gb',
      vps_standard: 'vc2-4c-8gb',
      vps_pro: 'vc2-6c-16gb',
      vps_ultra: 'vc2-8c-32gb'
    }
  },
  virtualizor: {
    label: 'Virtualizor (Self-Hosted Node)',
    subtitle: 'Connect your own BDIX or Bare-Metal Dedicated KVM Server',
    defaultRegion: 'bdix-dac1',
    regionHint: 'bdix-dac1 (Dhaka BDIX Node)',
    needsUrl: true,
    needsSecret: true,
    tokenPortalUrl: 'https://www.virtualizor.com/docs/admin-api/',
    planMapping: {
      vps_starter: '1',
      vps_standard: '2',
      vps_pro: '3',
      vps_ultra: '4'
    }
  },
  contabo: {
    label: 'Contabo Cloud',
    subtitle: 'High RAM & NVMe storage capacity at wholesale rates',
    defaultRegion: 'SIN',
    regionHint: 'SIN (Singapore), EU (Germany), US-central',
    needsUrl: false,
    needsSecret: true,
    tokenPortalUrl: 'https://my.contabo.com/api/details',
    planMapping: {
      vps_starter: 'V91',
      vps_standard: 'V94',
      vps_pro: 'V97',
      vps_ultra: 'V100'
    }
  }
};

const EMPTY_FORM: VpsApiForm = {
  enabled: false,
  mode: 'manual',
  provider: 'hetzner',
  apiUrl: '',
  apiToken: '',
  apiSecret: '',
  defaultRegion: 'sin',
  planMapping: PROVIDER_PRESETS.hetzner.planMapping
};

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white';
const labelCls = 'block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1';

export function VpsApiSettings() {
  const [form, setForm] = useState<VpsApiForm>(EMPTY_FORM);
  const [hasApiToken, setHasApiToken] = useState(false);
  const [hasApiSecret, setHasApiSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const applyServerConfig = (d: any) => {
    const prov: VpsProviderType = d?.provider || 'hetzner';
    const preset = PROVIDER_PRESETS[prov] || PROVIDER_PRESETS.hetzner;
    setForm({
      enabled: Boolean(d?.enabled),
      mode: d?.mode === 'live' ? 'live' : 'manual',
      provider: prov,
      apiUrl: d?.apiUrl || '',
      apiToken: '',
      apiSecret: '',
      defaultRegion: d?.defaultRegion || preset.defaultRegion,
      planMapping: {
        vps_starter: d?.planMapping?.vps_starter || preset.planMapping.vps_starter,
        vps_standard: d?.planMapping?.vps_standard || preset.planMapping.vps_standard,
        vps_pro: d?.planMapping?.vps_pro || preset.planMapping.vps_pro,
        vps_ultra: d?.planMapping?.vps_ultra || preset.planMapping.vps_ultra
      }
    });
    setHasApiToken(Boolean(d?.hasApiToken));
    setHasApiSecret(Boolean(d?.hasApiSecret));
  };

  useEffect(() => {
    apiGet<{ success: boolean; config: any }>('/api/hosting/admin/vps-config')
      .then((r) => r.success && applyServerConfig(r.config))
      .catch((e) => toast.error(e?.message || 'Failed to load Cloud VPS API settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectProvider = (prov: VpsProviderType) => {
    const preset = PROVIDER_PRESETS[prov];
    setForm((prev) => ({
      ...prev,
      provider: prov,
      defaultRegion: preset.defaultRegion,
      planMapping: { ...preset.planMapping }
    }));
    setTestResult(null);
  };

  const handleSave = async () => {
    if (form.enabled && form.mode === 'live' && !form.apiToken && !hasApiToken) {
      toast.error('Please enter your VPS Provider API Token for Live Automated mode.');
      return;
    }
    setSaving(true);
    try {
      const r = await apiPost<{ success: boolean; message: string; config: any }>(
        '/api/hosting/admin/vps-config',
        form
      );
      if (r.success) {
        applyServerConfig(r.config);
        toast.success(r.message || 'Cloud VPS API settings saved!');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save Cloud VPS API settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      if (form.apiToken || form.apiSecret) {
        const saveRes = await apiPost<{ success: boolean; message: string; config: any }>(
          '/api/hosting/admin/vps-config',
          form
        );
        if (saveRes.success && saveRes.config) {
          applyServerConfig(saveRes.config);
        }
      }

      const payload: Record<string, any> = {
        provider: form.provider,
        defaultRegion: form.defaultRegion
      };
      if (form.apiUrl.trim()) payload.apiUrl = form.apiUrl.trim();
      if (form.apiToken.trim()) payload.apiToken = form.apiToken.trim();
      if (form.apiSecret.trim()) payload.apiSecret = form.apiSecret.trim();

      const r = await apiPost<{ success: boolean; message: string; latencyMs?: number }>(
        '/api/hosting/admin/vps-test',
        payload
      );
      setTestResult(r);
      r.success
        ? toast.success(r.message || 'VPS Provider connected!')
        : toast.error(r.message || 'VPS API connection failed');
    } catch (e: any) {
      const msg = e?.message || 'VPS API connection test failed';
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Loading Cloud VPS API settings...
      </div>
    );
  }

  const activePreset = PROVIDER_PRESETS[form.provider] || PROVIDER_PRESETS.hetzner;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-cyan-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Cloud VPS Automated Provisioning API
            </h3>
            <p className="text-xs text-slate-500">
              Automatically deploy KVM VPS instances, assign IPv4 &amp; email root/RDP credentials upon payment
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {form.enabled && form.mode === 'live' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" /> Auto-Provisioning Active ({activePreset.label})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Manual Admin Setup Mode
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Enable & Mode Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <div>
              <div className="text-sm font-semibold text-slate-800">
                Enable Automated VPS API Integration
              </div>
              <div className="text-xs text-slate-500">
                Connect wholesale cloud provider API for zero-touch server creation
              </div>
            </div>
          </label>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <label className={labelCls}>Fulfillment Mode</label>
            <select
              value={form.mode}
              onChange={(e) =>
                setForm((p) => ({ ...p, mode: e.target.value as 'live' | 'manual' }))
              }
              className={inputCls}
            >
              <option value="manual">Manual Setup (Admin allocates IP &amp; Password)</option>
              <option value="live">
                Live Automated (Instant VM creation via {activePreset.label} API)
              </option>
            </select>
          </div>
        </div>

        {/* Provider Selector Cards */}
        <div>
          <label className={labelCls}>Select Wholesale VPS Provider / Hypervisor Engine</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-1.5">
            {(Object.keys(PROVIDER_PRESETS) as VpsProviderType[]).map((provKey) => {
              const item = PROVIDER_PRESETS[provKey];
              const isSelected = form.provider === provKey;
              return (
                <button
                  key={provKey}
                  type="button"
                  onClick={() => handleSelectProvider(provKey)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold truncate">{item.label}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    )}
                  </div>
                  <p
                    className={`text-[10px] mt-1 line-clamp-2 leading-snug ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {item.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Credentials & Region */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activePreset.needsUrl && (
            <div className="md:col-span-2">
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  <Server className="w-3 h-3" /> Virtualizor Master Node URL
                </span>
              </label>
              <input
                type="text"
                value={form.apiUrl}
                onChange={(e) => setForm((p) => ({ ...p, apiUrl: e.target.value }))}
                placeholder="https://node.click2it.bd:4085"
                className={inputCls}
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Key className="w-3 h-3" /> {activePreset.label} API Token / Key
              </label>
              <div className="flex items-center gap-2">
                {hasApiToken && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    ✓ Token Stored
                  </span>
                )}
                <a
                  href={activePreset.tokenPortalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-semibold text-blue-600 hover:underline"
                >
                  Get API Token ↗
                </a>
              </div>
            </div>
            <div className="relative">
              <input
                type={showSecrets ? 'text' : 'password'}
                value={form.apiToken}
                onChange={(e) => setForm((p) => ({ ...p, apiToken: e.target.value }))}
                placeholder={
                  hasApiToken
                    ? '•••••••••••••••••••• (Leave blank to keep stored token)'
                    : `Paste your ${activePreset.label} Read/Write API Token`
                }
                className={`${inputCls} pr-9 font-mono`}
              />
              <button
                type="button"
                onClick={() => setShowSecrets((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {activePreset.needsSecret ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <Key className="w-3 h-3" /> API Password / Secret Key
                </label>
                {hasApiSecret && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    ✓ Secret Stored
                  </span>
                )}
              </div>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={form.apiSecret}
                onChange={(e) => setForm((p) => ({ ...p, apiSecret: e.target.value }))}
                placeholder={
                  hasApiSecret
                    ? '•••••••••••••••••••• (Leave blank to keep stored secret)'
                    : 'Enter API Pass / Secret'
                }
                className={`${inputCls} font-mono`}
              />
            </div>
          ) : (
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Default Datacenter Region Code
                </span>
              </label>
              <input
                type="text"
                value={form.defaultRegion}
                onChange={(e) => setForm((p) => ({ ...p, defaultRegion: e.target.value }))}
                placeholder={activePreset.defaultRegion}
                className={`${inputCls} font-mono`}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Examples: <span className="font-mono">{activePreset.regionHint}</span>
              </p>
            </div>
          )}
        </div>

        {/* Plan Size Mapping Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>Instance Plan Mapping ({activePreset.label} Server Type Codes)</span>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((p) => ({ ...p, planMapping: { ...activePreset.planMapping } }))
              }
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Reset Default Codes
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Cloud VPS 1 (2vCPU / 4GB)
              </label>
              <input
                type="text"
                value={form.planMapping.vps_starter}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    planMapping: { ...p.planMapping, vps_starter: e.target.value }
                  }))
                }
                className={`${inputCls} font-mono text-xs`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Cloud VPS 2 (4vCPU / 8GB)
              </label>
              <input
                type="text"
                value={form.planMapping.vps_standard}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    planMapping: { ...p.planMapping, vps_standard: e.target.value }
                  }))
                }
                className={`${inputCls} font-mono text-xs`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Cloud VPS 3 (8vCPU / 16GB)
              </label>
              <input
                type="text"
                value={form.planMapping.vps_pro}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    planMapping: { ...p.planMapping, vps_pro: e.target.value }
                  }))
                }
                className={`${inputCls} font-mono text-xs`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Cloud VPS Pro (16vCPU / 32GB)
              </label>
              <input
                type="text"
                value={form.planMapping.vps_ultra}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    planMapping: { ...p.planMapping, vps_ultra: e.target.value }
                  }))
                }
                className={`${inputCls} font-mono text-xs`}
              />
            </div>
          </div>
        </div>

        {/* Test Connection Result Banner */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium border flex items-center justify-between ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{testResult.message}</span>
            {testResult.latencyMs !== undefined && (
              <span className="font-mono text-[11px] opacity-75">{testResult.latencyMs}ms</span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PlugZap className="w-3.5 h-3.5 text-blue-600" />
            )}
            Test {activePreset.label} API
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save VPS API Settings
          </button>
        </div>
      </div>
    </div>
  );
}
