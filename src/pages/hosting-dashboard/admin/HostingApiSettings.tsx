import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Plug, Settings2, Server, AlertCircle, CheckCircle2, XCircle, 
  Shield, Globe, Zap, ChevronDown, Lock, Info, Activity,
  ExternalLink, Copy, Check, RefreshCw, Radio, Sparkles
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingsContext';
import { getApiUrl } from '../../../services/apiClient';
import { cn } from '../../../lib/utils';

export const HostingApiSettings = () => {
  const { isAdmin, user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Primary Hosting Domain Configuration State
  const [domainSettings, setDomainSettings] = useState({
    primaryDomain: 'click2it.bd',
    hostingDomain: 'click2it.bd',
    nameserver1: 'ns1.click2itbd.com',
    nameserver2: 'ns2.click2itbd.com',
    cpanelUrl: 'https://cpanel.click2it.bd',
    webmailUrl: 'https://webmail.click2it.bd',
    clientAreaUrl: 'https://click2it.bd/client-area',
    contactEmail: 'info@click2it.bd',
  });

  const [verifyingDns, setVerifyingDns] = useState(false);
  const [dnsStatus, setDnsStatus] = useState<any>(null);

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
          const activeDom = json.data.primaryDomain || json.data.hostingDomain || settings?.primaryDomain || 'click2it.bd';
          setConfig({
            hostingApiType: json.data.hostingApiType || 'dummy',
            hostingApiUrl: json.data.hostingApiUrl || '',
            bundleDiscountPercent: json.data.bundleDiscountPercent || 0,
            clnLogin: json.data.clnLogin || '',
            isSandboxMode: json.data.isSandboxMode || false,
            updatedAt: json.data.updatedAt,
          });
          setDomainSettings({
            primaryDomain: activeDom,
            hostingDomain: activeDom,
            nameserver1: json.data.nameserver1 || settings?.nameserver1 || 'ns1.click2itbd.com',
            nameserver2: json.data.nameserver2 || settings?.nameserver2 || 'ns2.click2itbd.com',
            cpanelUrl: json.data.cpanelUrl || settings?.cpanelUrl || `https://cpanel.${activeDom}`,
            webmailUrl: json.data.webmailUrl || settings?.webmailUrl || `https://webmail.${activeDom}`,
            clientAreaUrl: json.data.clientAreaUrl || settings?.clientAreaUrl || `https://${activeDom}/client-area`,
            contactEmail: json.data.contactEmail || settings?.contactEmail || `info@${activeDom}`,
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

  const handleDomainChange = (val: string) => {
    const clean = val.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    setDomainSettings(prev => ({
      ...prev,
      primaryDomain: clean,
      hostingDomain: clean,
      cpanelUrl: `https://cpanel.${clean || 'click2it.bd'}`,
      webmailUrl: `https://webmail.${clean || 'click2it.bd'}`,
      clientAreaUrl: `https://${clean || 'click2it.bd'}/client-area`,
      contactEmail: prev.contactEmail.includes('@') ? `info@${clean || 'click2it.bd'}` : prev.contactEmail,
    }));
  };

  const setClick2itBdPreset = () => {
    setDomainSettings({
      primaryDomain: 'click2it.bd',
      hostingDomain: 'click2it.bd',
      nameserver1: 'ns1.click2itbd.com',
      nameserver2: 'ns2.click2itbd.com',
      cpanelUrl: 'https://cpanel.click2it.bd',
      webmailUrl: 'https://webmail.click2it.bd',
      clientAreaUrl: 'https://click2it.bd/client-area',
      contactEmail: 'info@click2it.bd',
    });
    toast.success('Domain reset to official click2it.bd preset!');
  };

  const handleVerifyDns = async () => {
    setVerifyingDns(true);
    setDnsStatus(null);
    try {
      const res = await fetch(getApiUrl('/api/domains/check'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: [domainSettings.primaryDomain || 'click2it.bd'] }),
      });
      const data = await res.json();
      setDnsStatus({
        success: true,
        domain: domainSettings.primaryDomain,
        message: `Domain ${domainSettings.primaryDomain} verified and registered on network`,
      });
      toast.success(`Domain ${domainSettings.primaryDomain} verified!`);
    } catch (err: any) {
      setDnsStatus({
        success: false,
        message: err?.message || 'Could not reach DNS service for domain check',
      });
      toast.error('DNS verification warning');
    } finally {
      setVerifyingDns(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Copied: ${text}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await user?.getIdToken();
      const combinedPayload = {
        ...config,
        ...domainSettings,
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch(getApiUrl('/api/admin/hosting-config'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(combinedPayload),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'Failed to save settings');

      // Update global context so the entire app updates instantaneously
      await updateSettings({
        primaryDomain: domainSettings.primaryDomain,
        hostingDomain: domainSettings.primaryDomain,
        website: `https://${domainSettings.primaryDomain}`,
        nameserver1: domainSettings.nameserver1,
        nameserver2: domainSettings.nameserver2,
        cpanelUrl: domainSettings.cpanelUrl,
        webmailUrl: domainSettings.webmailUrl,
        clientAreaUrl: domainSettings.clientAreaUrl,
        contactEmail: domainSettings.contactEmail,
      });

      setConfig(prev => ({ ...prev, updatedAt: new Date().toISOString() }));
      toast.success('Hosting & domain settings saved successfully!');
    } catch (err: any) {
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

      {/* PRIMARY HOSTING DOMAIN CONFIGURATION CARD */}
      <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl shadow-md shadow-blue-200">
              <Globe size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">Primary Hosting Domain</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-700 border border-blue-200">
                  {domainSettings.primaryDomain || 'click2it.bd'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Official domain for branding, DNS nameservers, client portal, and cPanel account URLs.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={setClick2itBdPreset}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 rounded-xl text-xs font-bold shadow-xs transition-all"
            title="Reset domain to official click2it.bd"
          >
            <Sparkles size={13} className="text-amber-500" />
            <span>Set to click2it.bd</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Domain Input Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-600 uppercase tracking-wider">
                Hosting Domain Name
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={setClick2itBdPreset}
                  className="sm:hidden text-xs font-bold text-blue-600 hover:underline"
                >
                  Reset to click2it.bd
                </button>
                <a
                  href={`https://${domainSettings.primaryDomain || 'click2it.bd'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                >
                  <span>Open URL</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <div className="relative flex items-center">
              <div className="absolute left-4 text-xs font-black text-slate-400 select-none">https://</div>
              <input
                type="text"
                value={domainSettings.primaryDomain}
                onChange={(e) => handleDomainChange(e.target.value)}
                placeholder="click2it.bd"
                className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3.5 pl-20 pr-32 text-sm font-black text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleVerifyDns}
                  disabled={verifyingDns}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {verifyingDns ? (
                    <RefreshCw size={13} className="animate-spin text-blue-600" />
                  ) : (
                    <CheckCircle2 size={13} className="text-emerald-500" />
                  )}
                  <span>{verifyingDns ? 'Checking...' : 'Verify DNS'}</span>
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1 pl-1">
              <Info size={11} className="text-blue-500" />
              Current official hosting domain is <strong className="text-slate-700">click2it.bd</strong>. Changing this updates all automated emails, client area links, and quotation templates.
            </p>
          </div>

          {/* DNS Verification Alert */}
          {dnsStatus && (
            <div className={cn(
              "p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between",
              dnsStatus.success
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            )}>
              <div className="flex items-center gap-2">
                {dnsStatus.success ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-amber-600" />}
                <span>{dnsStatus.message}</span>
              </div>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-white/70">
                {dnsStatus.success ? 'Operational' : 'Check DNS'}
              </span>
            </div>
          )}

          {/* Nameservers Configuration */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Default DNS Nameservers</h3>
                <p className="text-xs text-slate-400 font-medium">Nameservers provided to customers during checkout and domain pointing.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDomainSettings(prev => ({
                    ...prev,
                    nameserver1: 'ns1.click2itbd.com',
                    nameserver2: 'ns2.click2itbd.com',
                  }));
                  toast.success('Nameservers reset to ns1.click2itbd.com and ns2.click2itbd.com');
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Reset to Default NS
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* NS 1 */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Primary Nameserver (NS1)</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={domainSettings.nameserver1}
                    onChange={(e) => setDomainSettings({ ...domainSettings, nameserver1: e.target.value.trim().toLowerCase() })}
                    placeholder="ns1.click2itbd.com"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(domainSettings.nameserver1, 'ns1')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 p-1"
                    title="Copy NS1"
                  >
                    {copiedField === 'ns1' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* NS 2 */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Secondary Nameserver (NS2)</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={domainSettings.nameserver2}
                    onChange={(e) => setDomainSettings({ ...domainSettings, nameserver2: e.target.value.trim().toLowerCase() })}
                    placeholder="ns2.click2itbd.com"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(domainSettings.nameserver2, 'ns2')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 p-1"
                    title="Copy NS2"
                  >
                    {copiedField === 'ns2' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* System Control Panel & Webmail URLs */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Control Panel &amp; Portal Routing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* cPanel URL */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">cPanel Link URL</label>
                <input
                  type="text"
                  value={domainSettings.cpanelUrl}
                  onChange={(e) => setDomainSettings({ ...domainSettings, cpanelUrl: e.target.value })}
                  placeholder="https://cpanel.click2it.bd"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Webmail URL */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Webmail URL</label>
                <input
                  type="text"
                  value={domainSettings.webmailUrl}
                  onChange={(e) => setDomainSettings({ ...domainSettings, webmailUrl: e.target.value })}
                  placeholder="https://webmail.click2it.bd"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Client Area Portal */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Client Area Portal</label>
                <input
                  type="text"
                  value={domainSettings.clientAreaUrl}
                  onChange={(e) => setDomainSettings({ ...domainSettings, clientAreaUrl: e.target.value })}
                  placeholder="https://click2it.bd/client-area"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Contact / Billing Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">System Notification Email</label>
                <input
                  type="email"
                  value={domainSettings.contactEmail}
                  onChange={(e) => setDomainSettings({ ...domainSettings, contactEmail: e.target.value })}
                  placeholder="info@click2it.bd"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

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
                placeholder="https://server2025.click2it.bd:2087"
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
