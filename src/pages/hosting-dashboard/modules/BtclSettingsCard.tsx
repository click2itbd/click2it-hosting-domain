import React, { useEffect, useState } from 'react';
import { Globe, Save, Plug, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiGet, apiPost } from '../../../services/apiClient';

type Endpoint = { method: 'GET' | 'POST' | 'PUT'; path: string };

const ENDPOINT_LABELS: Record<string, string> = {
  check: 'Availability check',
  register: 'Register domain',
  renew: 'Renew domain',
  transfer: 'Transfer domain',
  nameservers: 'Update nameservers',
  whois: 'Whois / info',
  ping: 'Connection test (ping)',
};

const DEFAULTS = {
  enabled: false,
  baseUrl: '',
  authType: 'bearer',
  apiKey: '',
  username: '',
  password: '',
  apiKeyHeader: 'X-API-Key',
  hasApiKey: false,
  hasPassword: false,
  endpoints: {
    check: { method: 'POST', path: '/domains/check' },
    register: { method: 'POST', path: '/domains/register' },
    renew: { method: 'POST', path: '/domains/renew' },
    transfer: { method: 'POST', path: '/domains/transfer' },
    nameservers: { method: 'POST', path: '/domains/nameservers' },
    whois: { method: 'POST', path: '/domains/whois' },
    ping: { method: 'GET', path: '/ping' },
  } as Record<string, Endpoint>,
};

export function BtclSettingsCard() {
  const [form, setForm] = useState<any>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showEndpoints, setShowEndpoints] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await apiGet('/api/domains/btcl/settings');
        if (res?.success && res.data) {
          setForm((prev: any) => ({
            ...prev,
            ...res.data,
            apiKey: '',
            password: '',
            endpoints: { ...DEFAULTS.endpoints, ...(res.data.endpoints || {}) },
          }));
        }
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load BTCL settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (field: string, value: any) => setForm((p: any) => ({ ...p, [field]: value }));
  const setEndpoint = (key: string, field: keyof Endpoint, value: string) =>
    setForm((p: any) => ({ ...p, endpoints: { ...p.endpoints, [key]: { ...p.endpoints[key], [field]: value } } }));

  const save = async () => {
    setSaving(true);
    try {
      const res: any = await apiPost('/api/domains/btcl/settings', form);
      if (!res?.success) throw new Error(res?.error || 'Save failed');
      setForm((p: any) => ({ ...p, ...res.data, apiKey: '', password: '', endpoints: { ...DEFAULTS.endpoints, ...(res.data.endpoints || {}) } }));
      toast.success('BTCL settings saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save BTCL settings');
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const res: any = await apiPost('/api/domains/btcl/test', {});
      if (res?.success) toast.success(res.message || 'BTCL connection OK');
      else toast.error(res?.message || 'BTCL connection failed');
    } catch (e: any) {
      toast.error(e?.message || 'BTCL test failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return null;

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none';

  return (
    <div className={`border rounded-lg p-5 mb-6 ${form.enabled ? 'border-red-200 bg-red-50/20' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <Globe size={18} className="text-red-500" /> BTCL (.bd Registry) API
        </h4>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input type="checkbox" checked={!!form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
          Enabled
        </label>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        When enabled, all <b>.bd</b> domains (register / renew / transfer / nameservers) are processed via the BTCL API.
        When disabled, .bd domains keep using the manual admin workflow.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">API Base URL</label>
          <input className={inputCls} value={form.baseUrl} onChange={(e) => set('baseUrl', e.target.value)} placeholder="https://api.btcl.example/v1" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Authentication</label>
          <select className={inputCls} value={form.authType} onChange={(e) => set('authType', e.target.value)}>
            <option value="bearer">Bearer token</option>
            <option value="basic">Username + Password (Basic)</option>
            <option value="header">Custom API-key header</option>
          </select>
        </div>

        {form.authType === 'header' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Header name</label>
            <input className={inputCls} value={form.apiKeyHeader} onChange={(e) => set('apiKeyHeader', e.target.value)} />
          </div>
        )}

        {form.authType !== 'basic' ? (
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              API Key / Token {form.hasApiKey && <span className="text-green-600 font-normal">(saved - leave blank to keep)</span>}
            </label>
            <div className="relative">
              <input
                className={inputCls}
                type={showSecret ? 'text' : 'password'}
                value={form.apiKey}
                onChange={(e) => set('apiKey', e.target.value)}
                placeholder={form.hasApiKey ? '••••••••' : 'btcl_api_key'}
              />
              <button type="button" onClick={() => setShowSecret((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
              <input className={inputCls} value={form.username} onChange={(e) => set('username', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Password {form.hasPassword && <span className="text-green-600 font-normal">(saved - leave blank to keep)</span>}
              </label>
              <input className={inputCls} type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={form.hasPassword ? '••••••••' : ''} />
            </div>
          </>
        )}
      </div>

      <button type="button" onClick={() => setShowEndpoints((s) => !s)} className="mt-4 text-xs font-semibold text-red-600 hover:underline">
        {showEndpoints ? 'Hide' : 'Show'} endpoint mapping (advanced)
      </button>

      {showEndpoints && (
        <div className="mt-3 space-y-2">
          {Object.keys(ENDPOINT_LABELS).map((key) => (
            <div key={key} className="grid grid-cols-12 gap-2 items-center">
              <span className="col-span-3 text-xs text-slate-600">{ENDPOINT_LABELS[key]}</span>
              <select className={`${inputCls} col-span-2`} value={form.endpoints[key]?.method} onChange={(e) => setEndpoint(key, 'method', e.target.value)}>
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
              </select>
              <input className={`${inputCls} col-span-7`} value={form.endpoints[key]?.path || ''} onChange={(e) => setEndpoint(key, 'path', e.target.value)} />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 mt-5">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          <Save size={14} /> {saving ? 'Saving...' : 'Save BTCL Settings'}
        </button>
        <button onClick={test} disabled={testing || !form.baseUrl} className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold">
          <Plug size={14} /> {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>
    </div>
  );
}
