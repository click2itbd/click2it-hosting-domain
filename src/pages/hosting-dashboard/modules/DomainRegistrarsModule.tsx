import React, { useState, useEffect } from 'react';
import {
  Server, Settings, Globe, Plus, Trash2, Edit2, CheckCircle2, Eye, EyeOff, Save, Plug, Shield, RefreshCw,
  ExternalLink, Copy, Check, Info, AlertTriangle, Wallet
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { toast } from 'react-hot-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { BtclSettingsCard } from './BtclSettingsCard';
import { apiPost } from '../../../services/apiClient';

const REGISTRAR_DOC_PATH = ['hosting_config', 'registrar_settings'];

const defaultRegistrarState = {
  openprovider: { enabled: true, username: '', password: '', isSandbox: false, defaultHandle: '' },
};

export function DomainRegistrarsModule() {
  const [state, setState] = useState(defaultRegistrarState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState({ openprovider: false });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    balance?: number;
    currency?: string;
    environment?: string;
    serverIp?: string;
  } | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);
  const [detectedIp, setDetectedIp] = useState<string>('');

  const serverIp = testResult?.serverIp || detectedIp || 'Detecting IP...';

  useEffect(() => {
    loadSettings();
    fetchServerIp();
  }, []);

  const fetchServerIp = async () => {
    try {
      const res = await fetch('/api/domains/server-ip');
      if (res.ok) {
        const data = await res.json();
        if (data?.serverIp && data.serverIp !== 'Server IP') {
          setDetectedIp(data.serverIp);
        }
      }
    } catch {
      // Ignore background IP detection error
    }
  };

  const loadSettings = async () => {
    try {
      const docSnap = await getDoc(doc(db, REGISTRAR_DOC_PATH[0], REGISTRAR_DOC_PATH[1]));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setState(prev => ({
          ...prev,
          openprovider: { 
            ...prev.openprovider, 
            ...data.openprovider, 
            // Ensure default is production (isSandbox: false) for members
            isSandbox: data.openprovider?.isSandbox === true,
          }
        }));
      }
    } catch (error) {
      console.error('Error loading registrar settings:', error);
      toast.error('Failed to load registrar settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (registrar: string, field: string, value: any) => {
    setState(prev => ({
      ...prev,
      [registrar]: { ...prev[registrar], [field]: value }
    }));
  };

  const copyServerIp = () => {
    navigator.clipboard.writeText(serverIp);
    setCopiedIp(true);
    toast.success('Server IP copied to clipboard!');
    setTimeout(() => setCopiedIp(false), 2500);
  };

  const saveOne = async (registrar: string) => {
    setSaving(true);
    try {
      await setDoc(doc(db, REGISTRAR_DOC_PATH[0], REGISTRAR_DOC_PATH[1]), { [registrar]: state[registrar] }, { merge: true });
      toast.success(`${registrar.charAt(0).toUpperCase() + registrar.slice(1)} settings saved successfully`);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (registrar: string) => {
    setTesting(true);
    setTestResult(null);
    try {
      if (!state[registrar].username || !state[registrar].password) {
        toast.error('Please enter both username and password/token');
        setTesting(false);
        return;
      }

      const res: any = await apiPost('/api/admin/domain/test-connection', { 
        provider: registrar, 
        config: state[registrar] 
      });

      setTestResult(res);
      if (res.success) {
        toast.success(res.message || `Connected to Openprovider successfully!`);
      } else {
        toast.error(res.message || 'Authentication failed');
      }
    } catch (e: any) {
      const errRes = { success: false, message: e.message, serverIp };
      setTestResult(errRes);
      toast.error('Connection failed: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  const toggleShow = (registrar: string) => {
    setShowKeys(prev => ({ ...prev, [registrar]: !prev[registrar] }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="text-center py-12 text-slate-500">Loading registrar settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Globe size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Domain Registrars & API Integration</h2>
            <p className="text-slate-500 mt-1 text-sm max-w-2xl">
              Connect your official Openprovider membership (https://cp.openprovider.eu/) to handle domain availability searches, instant live registrations, renewals, DNS zone records, WHOIS, and SSL provisioning.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          
          {/* Openprovider API Section */}
          <div className="border-2 border-slate-100 rounded-2xl overflow-hidden transition-all focus-within:border-blue-200 focus-within:shadow-md">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Shield className="text-blue-600" size={20} />
                <div>
                  <h3 className="font-bold text-slate-700 text-lg">Openprovider (cp.openprovider.eu)</h3>
                  <span className="text-xs text-slate-500">Primary registrar for International TLDs (.com, .net, .org, .xyz, etc.)</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href="https://cp.openprovider.eu/"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <ExternalLink size={14} /> Open Member Portal (cp.openprovider.eu)
                </a>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.openprovider.enabled}
                    onChange={(e) => handleUpdate('openprovider', 'enabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-slate-600">Enabled</span>
                </label>
              </div>
            </div>
            
            <div className={cn("p-6 space-y-6 transition-opacity", !state.openprovider.enabled && "opacity-60 pointer-events-none")}>
              
              {/* Important IP Authorization Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <Info size={16} className="text-blue-600 shrink-0" />
                    Openprovider API Whitelist Requirement
                  </div>
                  <p className="text-xs text-blue-700 max-w-xl">
                    Openprovider requires the server IP to be whitelisted before API requests are permitted. In your <a href="https://cp.openprovider.eu/" target="_blank" rel="noreferrer" className="underline font-semibold">Openprovider Control Panel</a> under <strong>Account → Security → API IP Whitelist</strong>, add this server IP:
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-1.5 shrink-0 shadow-sm">
                  <code className="text-xs font-mono font-bold text-slate-800">{serverIp}</code>
                  <button
                    type="button"
                    onClick={copyServerIp}
                    title="Copy server IP"
                    className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                  >
                    {copiedIp ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Openprovider Username</span>
                    <span className="text-slate-400 font-normal">Account login</span>
                  </label>
                  <input
                    type="text"
                    value={state.openprovider.username}
                    onChange={(e) => handleUpdate('openprovider', 'username', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. JD000000-EA or your Openprovider username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Openprovider Password / API Token</span>
                    <span className="text-slate-400 font-normal">Password or MD5 hash</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys.openprovider ? "text" : "password"}
                      value={state.openprovider.password}
                      onChange={(e) => handleUpdate('openprovider', 'password', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Enter Openprovider password or API token"
                    />
                    <button type="button" onClick={() => toggleShow('openprovider')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showKeys.openprovider ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Default Contact Handle (Optional)</span>
                    <span className="text-slate-400 font-normal">Auto-detected if empty</span>
                  </label>
                  <input
                    type="text"
                    value={state.openprovider.defaultHandle || ''}
                    onChange={(e) => handleUpdate('openprovider', 'defaultHandle', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. SR000000-EA"
                  />
                </div>

                <div className="space-y-2 flex flex-col justify-end">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-700">Environment Mode</div>
                      <div className="text-xs text-slate-500">
                        {state.openprovider.isSandbox ? 'Testing on CTE Sandbox' : 'Live on cp.openprovider.eu (Production)'}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={state.openprovider.isSandbox}
                        onChange={(e) => handleUpdate('openprovider', 'isSandbox', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-slate-700">Use CTE Sandbox</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Test Connection Output Alert */}
              {testResult && (
                <div className={cn(
                  "p-4 rounded-xl border flex items-start gap-3 transition-all",
                  testResult.success 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-rose-50 border-rose-200 text-rose-800"
                )}>
                  {testResult.success ? (
                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 flex-1">
                    <div className="font-bold text-sm">
                      {testResult.success ? 'Openprovider Connected Successfully' : 'Openprovider Connection Test Failed'}
                    </div>
                    <p className="text-xs leading-relaxed">{testResult.message}</p>
                    {testResult.success && testResult.balance !== undefined && (
                      <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-emerald-900">
                        <Wallet size={14} /> Account Reseller Balance: {testResult.balance} {testResult.currency || 'EUR'}
                      </div>
                    )}
                    {!testResult.success && (
                      <div className="pt-2 text-xs text-rose-700">
                        If IP is rejected: Make sure to whitelist IP <code className="bg-rose-100 px-1.5 py-0.5 rounded font-mono font-bold">{serverIp}</code> at{' '}
                        <a href="https://cp.openprovider.eu/" target="_blank" rel="noreferrer" className="underline font-bold">
                          cp.openprovider.eu
                        </a>.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => saveOne('openprovider')}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70"
                >
                  <Save size={18} /> Save Openprovider Settings
                </button>
                <button
                  onClick={() => testConnection('openprovider')}
                  disabled={testing || saving}
                  className="flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold hover:border-slate-300 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-70"
                >
                  {testing ? <RefreshCw size={18} className="animate-spin" /> : <Plug size={18} />} Test Connection
                </button>
                <a
                  href="https://cp.openprovider.eu/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 ml-auto"
                >
                  <ExternalLink size={14} /> Openprovider Membership Portal (cp.openprovider.eu)
                </a>
              </div>
            </div>
          </div>

          {/* BTCL (.bd Registry) Settings */}
          <BtclSettingsCard />

        </div>
      </div>
    </div>
  );
}
