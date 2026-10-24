import React, { useEffect, useState } from 'react';
import { CreditCard, Loader2, Save, PlugZap, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiGet, apiPost } from '../../../services/apiClient';

interface EpsForm {
  enabled: boolean;
  mode: 'sandbox' | 'live';
  userName: string;
  password: string;
  hashKey: string;
  storeId: string;
  merchantId: string;
  sandboxBaseUrl: string;
  liveBaseUrl: string;
  frontendUrl: string;
}

const EMPTY: EpsForm = {
  enabled: false,
  mode: 'sandbox',
  userName: '',
  password: '',
  hashKey: '',
  storeId: '',
  merchantId: '',
  sandboxBaseUrl: 'https://sandboxpgapi.eps.com.bd',
  liveBaseUrl: 'https://pgapi.eps.com.bd',
  frontendUrl: '',
};

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white';
const labelCls = 'block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1';

export function EpsPaymentSettings() {
  const [form, setForm] = useState<EpsForm>(EMPTY);
  const [hasPassword, setHasPassword] = useState(false);
  const [hasHashKey, setHasHashKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const apply = (d: any) => {
    setForm({ ...EMPTY, ...d, password: '', hashKey: '' });
    setHasPassword(Boolean(d.hasPassword));
    setHasHashKey(Boolean(d.hasHashKey));
  };

  useEffect(() => {
    apiGet<{ success: boolean; data: any }>('/api/payments/admin/eps-config')
      .then((r) => r.success && apply(r.data))
      .catch((e) => toast.error(e?.message || 'Failed to load EPS settings'))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof EpsForm>(k: K, v: EpsForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (form.enabled && (!form.userName || !form.storeId || (!form.password && !hasPassword) || (!form.hashKey && !hasHashKey))) {
      toast.error('Fill Username, Password, Hash Key and Store ID before enabling EPS.');
      return;
    }
    setSaving(true);
    try {
      const r = await apiPost<{ success: boolean; data: any }>('/api/payments/admin/eps-config', form);
      if (r.success) {
        apply(r.data);
        toast.success('EPS settings saved');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save EPS settings');
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Save first so the test uses the values currently in the form.
      await apiPost('/api/payments/admin/eps-config', form);
      const r = await apiPost<{ success: boolean; message: string }>('/api/payments/admin/eps-test', {});
      setTestResult(r);
      r.success ? toast.success('EPS connected') : toast.error(r.message);
    } catch (e: any) {
      const msg = e?.message || 'EPS connection test failed';
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading EPS payment settings…
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">EPS Payment Gateway</h2>
            <p className="text-xs text-slate-500">Card, bKash, Nagad, Rocket &amp; internet banking via Easy Payment System</p>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs font-bold text-slate-600">{form.enabled ? 'Enabled' : 'Disabled'}</span>
          <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} className="w-4 h-4 accent-blue-600" />
        </label>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex gap-2">
          {(['sandbox', 'live'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => set('mode', m)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border ${form.mode === m ? (m === 'live' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-amber-500 text-white border-amber-500') : 'bg-white text-slate-600 border-slate-200'}`}
            >
              {m === 'live' ? 'Live' : 'Sandbox (Test)'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>EPS Username</label>
            <input className={inputCls} value={form.userName} onChange={(e) => set('userName', e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className={labelCls}>Store ID</label>
            <input className={inputCls} value={form.storeId} onChange={(e) => set('storeId', e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className={labelCls}>Password {hasPassword && <span className="text-emerald-600 normal-case">(saved)</span>}</label>
            <input
              className={inputCls}
              type={showSecrets ? 'text' : 'password'}
              value={form.password}
              placeholder={hasPassword ? 'Leave blank to keep current' : ''}
              onChange={(e) => set('password', e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={labelCls}>Hash Key {hasHashKey && <span className="text-emerald-600 normal-case">(saved)</span>}</label>
            <input
              className={inputCls}
              type={showSecrets ? 'text' : 'password'}
              value={form.hashKey}
              placeholder={hasHashKey ? 'Leave blank to keep current' : ''}
              onChange={(e) => set('hashKey', e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={labelCls}>Merchant ID (optional)</label>
            <input className={inputCls} value={form.merchantId} onChange={(e) => set('merchantId', e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className={labelCls}>Website URL for payment return</label>
            <input className={inputCls} value={form.frontendUrl} placeholder="https://click2it.bd" onChange={(e) => set('frontendUrl', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Sandbox API URL</label>
            <input className={inputCls} value={form.sandboxBaseUrl} onChange={(e) => set('sandboxBaseUrl', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Live API URL</label>
            <input className={inputCls} value={form.liveBaseUrl} onChange={(e) => set('liveBaseUrl', e.target.value)} />
          </div>
        </div>

        <button type="button" onClick={() => setShowSecrets((s) => !s)} className="text-xs font-semibold text-slate-500 flex items-center gap-1">
          {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {showSecrets ? 'Hide' : 'Show'} secrets while typing
        </button>

        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> How it works
          </div>
          <p>Customers pick “Pay Online” at checkout and are redirected to EPS. On return, the server re-checks the payment with EPS, matches the amount, then auto-confirms the order and triggers domain / hosting fulfillment.</p>
          <p>Give EPS these return URLs if they ask: <code className="bg-white px-1 rounded">{(form.frontendUrl || 'https://click2it.bd').replace(/\/+$/, '')}/payment/eps-return</code></p>
          <p>Credentials are stored server-side only and are never shown again.</p>
        </div>

        {testResult && (
          <div className={`text-xs font-semibold rounded-lg px-3 py-2 ${testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {testResult.message}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save EPS Settings
          </button>
          <button
            type="button"
            onClick={test}
            disabled={testing}
            className="px-5 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-bold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-60"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />} Save &amp; Test Connection
          </button>
        </div>
      </div>
    </div>
  );
}
