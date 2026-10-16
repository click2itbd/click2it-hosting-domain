import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Plug, Settings2, Server, AlertCircle, CheckCircle2, XCircle, 
  Shield, Globe, Zap, ChevronDown, Lock, Info, Activity
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getApiUrl } from '../../../services/apiClient';
import { cn } from '../../../lib/utils';

export const HostingApiSettings = () => {
  const { isAdmin, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const [config, setConfig] = useState({
    hostingApiType: 'dummy',
    hostingApiUrl: '',
    bundleDiscountPercent: 0,
    clnLogin: '',
    isSandboxMode: false,
    updatedAt: null,
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = await user?.getIdToken();
        const response = await fetch(getApiUrl('/api/admin/hosting-config'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const json = await response.json();
        if (json.success && json.data) {
          setConfig({
            hostingApiType: json.data.hostingApiType || 'dummy',
            hostingApiUrl: json.data.hostingApiUrl || '',
            bundleDiscountPercent: json.data.bundleDiscountPercent || 0,
            clnLogin: json.data.clnLogin || '',
            isSandboxMode: json.data.isSandboxMode || false,
            updatedAt: json.data.updatedAt,
          });
        }
      } catch (err) {
        setError('Failed to load configuration. Please check your permissions and try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchConfig();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(getApiUrl('/api/admin/hosting-config'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Failed to save settings');
      toast.success('Hosting settings saved successfully!');
    } catch (err) {
      const message = err?.message || 'Failed to save settings';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting('hosting');
    setError(null);
    setTestResult(null);
    if (!user) {
      setTestResult({ success: false, message: 'You must be logged in to test connection.' });
      setTesting(null);
      return;
    }
    try {
      const token = await user.getIdToken();
      const response = await fetch(getApiUrl('/api/admin/hosting/test-connection'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        setTestResult({ success: true, code: data.code, message: data.message || 'Connection successful' });
        toast.success(`Connection successful: ${data.message || 'Provider is reachable'}`);
      } else {
        setTestResult({ success: false, code: data.code, message: data.message || 'Connection failed' });
        toast.error(`Connection failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      const message = err?.message || 'Failed to test connection';
      setTestResult({ success: false, message });
      toast.error(message);
    } finally {
      setTesting(null);
    }
  };

  const isLive = config.hostingApiType && config.hostingApiType !== 'dummy';

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white/40 backdrop-blur-xl rounded-3xl border border-slate-200/60">
        <Shield size={40} className="text-slate-300 mb-4" />
        <p className="text-slate-500 font-bold">Access Denied</p>
        <p className="text-slate-400 text-sm mt-1">You do not have permission to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-200">
              <Settings2 size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Hosting Provider Settings</h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">WHM credentials are secured on the server. Configure display settings below.</p>
            </div>
          </div>
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold border self-start md:self-auto",
            isLive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          )}>
            <span className={cn("w-2 h-2 rounded-full animate-pulse", isLive ? "bg-emerald-500" : "bg-amber-500")} />
            {isLive ? `Live — ${config.hostingApiType}` : 'Dummy Mode (Safe Testing)'}
          </div>
        </div>

        {config.updatedAt && (
          <p className="mt-4 text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Activity size={12} /> Last saved: {new Date(config.updatedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="text-rose-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-rose-700 font-medium">{error}</p>
        </div>
      )}

      {/* WHM / cPanel Config Card */}
      <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
        
        {/* Card Header */}
        <div className="flex items-center gap-4 p-6 border-b border-slate-100">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md shadow-blue-200">
            <Server size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">WHM / cPanel Provider</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
              <Lock size={11} /> API keys &amp; passwords are stored securely as server environment variables
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Provider Select */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Provider</label>
            <div className="relative">
              <select
                value={config.hostingApiType || 'dummy'}
                onChange={(e) => setConfig({ ...config, hostingApiType: e.target.value })}
                className="w-full appearance-none bg-white border-2 border-slate-200 rounded-2xl px-4 py-3.5 pr-10 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm cursor-pointer"
              >
                <option value="dummy">🧪 Dummy (Safe Testing Mode)</option>
                <option value="cpanel">⚡ cPanel / WHM</option>
                <option value="resellerclub" disabled>🔒 ResellerClub Hosting (Coming Soon)</option>
                <option value="plesk" disabled>🔒 Plesk (Coming Soon)</option>
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* WHM Server URL */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">WHM Server URL</label>
            <div className="relative">
              <input
                type="text"
                value={config.hostingApiUrl || ''}
                onChange={(e) => setConfig({ ...config, hostingApiUrl: e.target.value })}
                placeholder="https://server2025.click2itbd.com:2087"
                className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3.5 pl-11 text-sm font-bold text-slate-700 placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
              />
              <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1 pl-1">
              <Info size={11} /> Non-sensitive. Used for display and cPanel account link generation only.
            </p>
          </div>

          {/* Bundle Discount */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Bundle Discount (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={config.bundleDiscountPercent || 0}
              onChange={(e) => setConfig({ ...config, bundleDiscountPercent: Number(e.target.value) })}
              placeholder="e.g. 10"
              className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
            />
            <p className="text-xs text-slate-400 pl-1">Discount applied when domain + hosting are purchased together.</p>
          </div>

          {/* Sandbox Mode Toggle */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div>
              <p className="text-sm font-black text-slate-700">Sandbox / Test Mode</p>
              <p className="text-xs text-slate-400 mt-0.5">No real accounts created. All actions are simulated.</p>
            </div>
            <button
              onClick={() => setConfig({ ...config, isSandboxMode: !config.isSandboxMode })}
              className={cn(
                "relative w-12 h-6 rounded-full transition-all duration-200 focus:outline-none shadow-inner",
                config.isSandboxMode ? "bg-amber-400" : "bg-slate-300"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200",
                config.isSandboxMode ? "left-6" : "left-0.5"
              )} />
            </button>
          </div>

          {/* Test Connection */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleTestConnection}
              disabled={testing === 'hosting'}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-all disabled:opacity-50 shadow-sm"
            >
              {testing === 'hosting' ? (
                <><div className="h-4 w-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> Testing...</>
              ) : (
                <><Plug size={16} /> Test Connection</>
              )}
            </button>

            {testResult && (
              <div className={cn(
                "flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl border",
                testResult.success
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              )}>
                {testResult.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                {testResult.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pb-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black text-base shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {saving ? (
            <><div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
          ) : (
            <><Zap size={18} /> Save Settings</>
          )}
        </button>
      </div>
    </div>
  );
};
