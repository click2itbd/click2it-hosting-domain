import React, { useEffect, useState } from 'react';
import { Shield, Loader2, Save, PlugZap, ShieldCheck, Eye, EyeOff, Key, User, Server } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiGet, apiPost } from '../../../services/apiClient';

interface CloudLinuxForm {
  enabled: boolean;
  mode: 'live' | 'manual';
  apiUrl: string;
  partnerLogin: string;
  apiToken: string;
  secretKey: string;
}

const EMPTY: CloudLinuxForm = {
  enabled: false,
  mode: 'manual',
  apiUrl: 'https://cln.cloudlinux.com/cln/api',
  partnerLogin: '',
  apiToken: '',
  secretKey: '',
};

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white';
const labelCls = 'block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1';

export function CloudLinuxApiSettings() {
  const [form, setForm] = useState<CloudLinuxForm>(EMPTY);
  const [hasApiToken, setHasApiToken] = useState(false);
  const [hasSecretKey, setHasSecretKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const apply = (d: any) => {
    setForm({
      ...EMPTY,
      ...d,
      apiToken: '',
      secretKey: '',
    });
    setHasApiToken(Boolean(d.hasApiToken));
    setHasSecretKey(Boolean(d.hasSecretKey));
  };

  useEffect(() => {
    apiGet<{ success: boolean; config: any }>('/api/hosting/admin/cloudlinux-config')
      .then((r) => r.success && apply(r.config))
      .catch((e) => toast.error(e?.message || 'Failed to load CloudLinux settings'))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof CloudLinuxForm>(k: K, v: CloudLinuxForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (form.enabled && form.mode === 'live' && (!form.partnerLogin || (!form.apiToken && !hasApiToken))) {
      toast.error('Partner Login and API Token are required for Live Automated mode.');
      return;
    }
    setSaving(true);
    try {
      const r = await apiPost<{ success: boolean; message: string; config: any }>('/api/hosting/admin/cloudlinux-config', form);
      if (r.success) {
        apply(r.config);
        toast.success(r.message || 'CloudLinux settings saved');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save CloudLinux settings');
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await apiPost('/api/hosting/admin/cloudlinux-config', form);
      const r = await apiPost<{ success: boolean; message: string }>('/api/hosting/admin/cloudlinux-test', {});
      setTestResult(r);
      r.success ? toast.success(r.message || 'CloudLinux connected') : toast.error(r.message || 'Connection failed');
    } catch (e: any) {
      const msg = e?.message || 'CloudLinux connection test failed';
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Loading CloudLinux settings...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">CloudLinux License Provider API</h3>
            <p className="text-xs text-slate-500">Sell & automate CloudLinux OS licenses (Solo, Admin, Shared Pro) by Server IP</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {form.enabled ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" /> License Sales Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              Disabled
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => set('enabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <div>
              <div className="text-sm font-semibold text-slate-800">Enable CloudLinux License Sales</div>
              <div className="text-xs text-slate-500">Accept and fulfill CloudLinux OS license orders on website</div>
            </div>
          </label>

          <div>
            <label className={labelCls}>Fulfillment Mode</label>
            <select
              value={form.mode}
              onChange={(e) => set('mode', e.target.value as any)}
              className={inputCls}
            >
              <option value="manual">Manual Fulfillment (Admin assigns IP from vendor)</option>
              <option value="live">Live Automated (Instant issue via CLN Partner API)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              {form.mode === 'manual'
                ? 'Orders are accepted and notify admin with customer Server IP. You can fulfill via any wholesale console.'
                : 'Instantly connects to CloudLinux CLN API to bind license to customer Server IP upon payment.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>CloudLinux API Base URL</label>
            <input
              type="text"
              value={form.apiUrl}
              onChange={(e) => set('apiUrl', e.target.value)}
              placeholder="https://cln.cloudlinux.com/cln/api"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Partner Login / Username</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={form.partnerLogin}
                onChange={(e) => set('partnerLogin', e.target.value)}
                placeholder="your-partner-login-email"
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>
                API Token (Bearer Token)
                {hasApiToken && (
                  <span className="ml-2 normal-case font-normal text-emerald-600 text-[11px]">(stored on server)</span>
                )}
              </label>
              <button
                type="button"
                onClick={() => setShowSecrets((p) => !p)}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showSecrets ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type={showSecrets ? 'text' : 'password'}
                value={form.apiToken}
                onChange={(e) => set('apiToken', e.target.value)}
                placeholder={hasApiToken ? '••••••••  (leave blank to keep current)' : 'CLN Bearer API Token'}
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>
              Secret Key (Optional / If provided by partner)
              {hasSecretKey && (
                <span className="ml-2 normal-case font-normal text-emerald-600 text-[11px]">(stored on server)</span>
              )}
            </label>
            <input
              type={showSecrets ? 'text' : 'password'}
              value={form.secretKey}
              onChange={(e) => set('secretKey', e.target.value)}
              placeholder={hasSecretKey ? '••••••••  (leave blank to keep current)' : 'Optional secret key'}
              className={inputCls}
            />
          </div>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {testResult.success ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <Shield className="w-4 h-4 shrink-0" />}
            <div>
              <div className="font-semibold">{testResult.success ? 'Connection Successful' : 'Connection Failed'}</div>
              <div className="opacity-90">{testResult.message}</div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            All API secrets are secured server-side in encrypted Firestore configuration.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={test}
              disabled={testing || saving}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlugZap className="w-3.5 h-3.5" />}
              Test CLN Connection
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || testing}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save CloudLinux Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default CloudLinuxApiSettings;
