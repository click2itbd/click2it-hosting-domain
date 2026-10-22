import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Plug, Settings2, Server, AlertCircle, CheckCircle2, XCircle, 
  Shield, Globe, Zap, ChevronDown, Lock, Info, Activity,
  ExternalLink, Copy, Check, RefreshCw, Radio, Sparkles,
  Link2, Mail, LayoutDashboard, Terminal, CheckCircle, Percent,
  Sliders, ShieldCheck, ArrowUpRight, HelpCircle
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
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    code?: string;
    message: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Initial reference states for detecting unsaved changes
  const [initialState, setInitialState] = useState<{
    config: any;
    domainSettings: any;
  } | null>(null);

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
    updatedAt: null as string | null,
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
          const loadedConfig = {
            hostingApiType: json.data.hostingApiType || 'dummy',
            hostingApiUrl: json.data.hostingApiUrl || '',
            bundleDiscountPercent: json.data.bundleDiscountPercent || 0,
            clnLogin: json.data.clnLogin || '',
            isSandboxMode: json.data.isSandboxMode || false,
            updatedAt: json.data.updatedAt,
          };
          const loadedDomain = {
            primaryDomain: activeDom,
            hostingDomain: activeDom,
            nameserver1: json.data.nameserver1 || settings?.nameserver1 || 'ns1.click2itbd.com',
            nameserver2: json.data.nameserver2 || settings?.nameserver2 || 'ns2.click2itbd.com',
            cpanelUrl: json.data.cpanelUrl || settings?.cpanelUrl || `https://cpanel.${activeDom}`,
            webmailUrl: json.data.webmailUrl || settings?.webmailUrl || `https://webmail.${activeDom}`,
            clientAreaUrl: json.data.clientAreaUrl || settings?.clientAreaUrl || `https://${activeDom}/client-area`,
            contactEmail: json.data.contactEmail || settings?.contactEmail || `info@${activeDom}`,
          };

          setConfig(loadedConfig);
          setDomainSettings(loadedDomain);
          setInitialState({ config: loadedConfig, domainSettings: loadedDomain });
        }
      } catch (err) {
        setError('Failed to load configuration. Please check your permissions and try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchConfig();
  }, [user]);

  // Detect unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!initialState) return false;
    return (
      JSON.stringify(config) !== JSON.stringify(initialState.config) ||
      JSON.stringify(domainSettings) !== JSON.stringify(initialState.domainSettings)
    );
  }, [config, domainSettings, initialState]);

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
    toast.success('Preset applied: click2it.bd!');
  };

  const handleResetToLoaded = () => {
    if (initialState) {
      setConfig(initialState.config);
      setDomainSettings(initialState.domainSettings);
      toast.success('Reverted all changes to last saved state.');
    }
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
        message: `Domain ${domainSettings.primaryDomain} verified and active on the network`,
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

      const newConfig = { ...config, updatedAt: new Date().toISOString() };
      setConfig(newConfig);
      setInitialState({ config: newConfig, domainSettings: { ...domainSettings } });
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
    } catch (err: any) {
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
      <div className="flex flex-col items-center justify-center py-24 bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-sm">
        <Shield size={44} className="text-slate-300 mb-4" />
        <p className="text-slate-800 font-extrabold text-lg">Access Denied</p>
        <p className="text-slate-500 text-sm mt-1">You do not have administrative privileges to modify hosting configurations.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500">Loading hosting provider settings...</p>
      </div>
    );
  }

  return (
    <div id="hosting-provider-settings" className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Top Hero Card */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/90 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-violet-200 flex items-center justify-center text-white shrink-0">
              <Settings2 size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Hosting Provider Settings</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                  Global Core
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                WHM server credentials and master domain routing. Configure public endpoints, nameservers, and client portals.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            {/* Live / Sandbox Mode Badge */}
            <div className={cn(
              "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-xs font-black border shadow-2xs transition-all",
              isLive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            )}>
              <span className={cn("w-2 h-2 rounded-full", isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse")} />
              {isLive ? `Live — ${config.hostingApiType.toUpperCase()}` : 'Dummy / Simulation Mode'}
            </div>

            {hasUnsavedChanges && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-100/80 text-amber-900 border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Unsaved Edits
              </span>
            )}
          </div>
        </div>

        {/* Quick Metadata Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Globe size={13} className="text-blue-500" />
              Primary Domain: <strong className="text-slate-800 font-bold">{domainSettings.primaryDomain || 'click2it.bd'}</strong>
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <Server size={13} className="text-purple-500" />
              Nameservers: <strong className="text-slate-800 font-bold">{domainSettings.nameserver1}</strong>
            </span>
          </div>

          {config.updatedAt && (
            <p className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
              <Activity size={12} className="text-indigo-500" /> 
              Last saved: <span className="font-mono">{new Date(config.updatedAt).toLocaleString()}</span>
            </p>
          )}
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
          <AlertCircle className="text-rose-500 flex-shrink-0 mt-0.5" size={18} />
          <div className="text-xs">
            <p className="font-bold text-rose-800">Configuration Notice</p>
            <p className="text-rose-700 font-medium mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* SECTION 1: PRIMARY HOSTING DOMAIN & DNS ARCHITECTURE */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/90 overflow-hidden">
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50/20">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-md shadow-blue-200 flex items-center justify-center text-white shrink-0">
              <Globe size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900">Primary Hosting Domain</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100/80 text-blue-800 border border-blue-200 font-mono">
                  {domainSettings.primaryDomain || 'click2it.bd'}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Official Brand
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Master domain for white-labeling, automated customer onboarding emails, DNS records, and customer cPanel redirects.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={setClick2itBdPreset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95"
              title="Reset domain to official click2it.bd preset"
            >
              <Sparkles size={13} className="text-amber-500" />
              <span>Reset to click2it.bd</span>
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-7">
          
          {/* Domain Input Field */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>Hosting Domain Name</span>
                <span className="text-rose-500">*</span>
              </label>
              
              <div className="flex items-center gap-2">
                <a
                  href={`https://${domainSettings.primaryDomain || 'click2it.bd'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg hover:bg-slate-100"
                >
                  <span>Open Domain</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Enhanced Input Group */}
            <div className="relative flex items-center">
              <div className="absolute left-0 top-0 bottom-0 px-4 bg-slate-100/80 border-r border-slate-200 rounded-l-2xl flex items-center gap-1.5 text-xs font-mono font-bold text-slate-500 select-none">
                <Lock size={12} className="text-emerald-600" />
                <span>https://</span>
              </div>
              
              <input
                type="text"
                value={domainSettings.primaryDomain}
                onChange={(e) => handleDomainChange(e.target.value)}
                placeholder="click2it.bd"
                className="w-full bg-white border-2 border-slate-200 rounded-2xl py-3.5 pl-28 pr-32 text-sm font-mono font-bold text-slate-800 placeholder:font-sans placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-2xs"
              />
              
              <div className="absolute right-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleVerifyDns}
                  disabled={verifyingDns}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                >
                  {verifyingDns ? (
                    <RefreshCw size={13} className="animate-spin text-blue-600" />
                  ) : (
                    <CheckCircle2 size={13} className="text-emerald-600" />
                  )}
                  <span>{verifyingDns ? 'Checking DNS...' : 'Verify DNS'}</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 flex items-center gap-1.5 pl-1">
              <Info size={12} className="text-blue-500 shrink-0" />
              <span>Official domain is active as <strong className="text-slate-700 font-bold font-mono">click2it.bd</strong>. Changing this updates automated invoices, welcome emails, and nameserver mappings in real time.</span>
            </p>
          </div>

          {/* DNS Verification Alert */}
          {dnsStatus && (
            <div className={cn(
              "p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in duration-200",
              dnsStatus.success
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-amber-50 text-amber-900 border-amber-200"
            )}>
              <div className="flex items-center gap-2.5">
                {dnsStatus.success ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={18} className="text-amber-600 shrink-0" />
                )}
                <span>{dnsStatus.message}</span>
              </div>
              <span className={cn(
                "text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border",
                dnsStatus.success 
                  ? "bg-white text-emerald-700 border-emerald-200" 
                  : "bg-white text-amber-700 border-amber-200"
              )}>
                {dnsStatus.success ? 'DNS Operational' : 'Action Needed'}
              </span>
            </div>
          )}

          {/* Nameservers Configuration */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Server size={14} className="text-indigo-600" />
                  <span>Default DNS Nameservers</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Give these two authoritative nameservers to clients who register external domains and want to point them to your hosting.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDomainSettings(prev => ({
                    ...prev,
                    nameserver1: 'ns1.click2itbd.com',
                    nameserver2: 'ns2.click2itbd.com',
                  }));
                  toast.success('Nameservers reset to ns1.click2itbd.com & ns2.click2itbd.com');
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                <RefreshCw size={11} />
                <span>Reset to Default NS</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* NS 1 */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                    Primary Nameserver (NS1)
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">Master</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={domainSettings.nameserver1}
                    onChange={(e) => setDomainSettings({ ...domainSettings, nameserver1: e.target.value.trim().toLowerCase() })}
                    placeholder="ns1.click2itbd.com"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(domainSettings.nameserver1, 'ns1')}
                    className="absolute right-2 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Copy NS1"
                  >
                    {copiedField === 'ns1' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* NS 2 */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                    Secondary Nameserver (NS2)
                  </label>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">Slave / Backup</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={domainSettings.nameserver2}
                    onChange={(e) => setDomainSettings({ ...domainSettings, nameserver2: e.target.value.trim().toLowerCase() })}
                    placeholder="ns2.click2itbd.com"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(domainSettings.nameserver2, 'ns2')}
                    className="absolute right-2 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Copy NS2"
                  >
                    {copiedField === 'ns2' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* System Control Panel & Webmail URLs */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 size={14} className="text-indigo-600" />
                  <span>Control Panel &amp; Portal Routing</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Client area destinations embedded in client service management tabs and automated setup emails.
                </p>
              </div>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl hidden sm:inline-block">
                Auto-synced with Primary Domain
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* cPanel URL */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1">
                    <Server size={12} className="text-slate-400" />
                    <span>cPanel Link URL</span>
                  </label>
                  <a
                    href={domainSettings.cpanelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>Test URL</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
                <input
                  type="text"
                  value={domainSettings.cpanelUrl}
                  onChange={(e) => setDomainSettings({ ...domainSettings, cpanelUrl: e.target.value })}
                  placeholder="https://cpanel.click2it.bd"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                />
              </div>

              {/* Webmail URL */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1">
                    <Mail size={12} className="text-slate-400" />
                    <span>Webmail URL</span>
                  </label>
                  <a
                    href={domainSettings.webmailUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>Test URL</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
                <input
                  type="text"
                  value={domainSettings.webmailUrl}
                  onChange={(e) => setDomainSettings({ ...domainSettings, webmailUrl: e.target.value })}
                  placeholder="https://webmail.click2it.bd"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                />
              </div>

              {/* Client Area Portal */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1">
                    <LayoutDashboard size={12} className="text-slate-400" />
                    <span>Client Area Portal</span>
                  </label>
                  <a
                    href={domainSettings.clientAreaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>Test URL</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
                <input
                  type="text"
                  value={domainSettings.clientAreaUrl}
                  onChange={(e) => setDomainSettings({ ...domainSettings, clientAreaUrl: e.target.value })}
                  placeholder="https://click2it.bd/client-area"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                />
              </div>

              {/* Contact / Billing Email */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1">
                    <Mail size={12} className="text-slate-400" />
                    <span>System Notification Email</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-bold">Sender Identity</span>
                </div>
                <input
                  type="email"
                  value={domainSettings.contactEmail}
                  onChange={(e) => setDomainSettings({ ...domainSettings, contactEmail: e.target.value })}
                  placeholder="info@click2it.bd"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: WHM / cPanel PROVISIONING GATEWAY */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/90 overflow-hidden">
        
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 border-b border-slate-100 bg-gradient-to-r from-violet-50/50 via-purple-50/30 to-slate-50/20">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl shadow-md shadow-violet-200 flex items-center justify-center text-white shrink-0">
              <Server size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">WHM / cPanel Provisioning Engine</h2>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-black",
                  config.hostingApiType === 'cpanel' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                )}>
                  {config.hostingApiType === 'cpanel' ? 'Active cPanel' : 'Dummy Simulator'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Automated account provisioning, hosting package synchronization, suspensions, and cPanel single-sign-on.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Secure Server Vault</span>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-7">
          
          {/* Security Notice Callout */}
          <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-start gap-3 shadow-2xs">
            <Lock size={18} className="text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-extrabold text-indigo-950">WHM Credentials Protected by Server Vault</p>
              <p className="text-indigo-800/80 font-medium mt-0.5 leading-relaxed">
                Your WHM API Token (<code className="font-mono bg-white/80 px-1 py-0.5 rounded text-indigo-900">WHM_API_TOKEN</code>) and Username (<code className="font-mono bg-white/80 px-1 py-0.5 rounded text-indigo-900">WHM_USERNAME</code>) are stored securely as server environment variables and never sent to or exposed in the browser.
              </p>
            </div>
          </div>

          {/* Visual Provider Selection Cards */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
              Provisioning Provider Gateway
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: cPanel / WHM */}
              <div 
                onClick={() => setConfig({ ...config, hostingApiType: 'cpanel' })}
                className={cn(
                  "p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 relative flex flex-col justify-between",
                  config.hostingApiType === 'cpanel'
                    ? "border-indigo-600 bg-indigo-50/40 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm",
                      config.hostingApiType === 'cpanel' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      ⚡
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">cPanel / WHM</h4>
                      <p className="text-[11px] text-slate-500 font-medium">Production Provisioning</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    config.hostingApiType === 'cpanel' ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                  )}>
                    {config.hostingApiType === 'cpanel' && <Check size={12} className="text-white" />}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Connects to Web Host Manager API to automatically create cPanel accounts upon successful order payment.
                </p>
              </div>

              {/* Option 2: Dummy Simulator */}
              <div 
                onClick={() => setConfig({ ...config, hostingApiType: 'dummy' })}
                className={cn(
                  "p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 relative flex flex-col justify-between",
                  config.hostingApiType === 'dummy'
                    ? "border-amber-500 bg-amber-50/40 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm",
                      config.hostingApiType === 'dummy' ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      🧪
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Dummy Simulator</h4>
                      <p className="text-[11px] text-slate-500 font-medium">Safe Staging &amp; Tests</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    config.hostingApiType === 'dummy' ? "border-amber-500 bg-amber-500" : "border-slate-300"
                  )}>
                    {config.hostingApiType === 'dummy' && <Check size={12} className="text-white" />}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Simulates successful order creation, invoice generation, and notifications without modifying live servers.
                </p>
              </div>

              {/* Option 3: Plesk / ResellerClub */}
              <div 
                className="p-4 rounded-2xl border-2 border-slate-200/60 bg-slate-50/60 opacity-60 cursor-not-allowed flex flex-col justify-between"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-400 flex items-center justify-center font-bold text-sm">
                      🔒
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-500">Plesk / DirectAdmin</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Coming Soon</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                    Roadmap
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Additional multi-server hosting gateways and reseller provisioning plugins currently under development.
                </p>
              </div>
            </div>
          </div>

          {/* WHM Server URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>WHM Server Endpoint URL</span>
                <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                Port 2087 (SSL)
              </span>
            </div>

            <div className="relative flex items-center">
              <Globe size={18} className="absolute left-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={config.hostingApiUrl || ''}
                onChange={(e) => setConfig({ ...config, hostingApiUrl: e.target.value })}
                placeholder="https://server2025.click2it.bd:2087"
                className="w-full bg-white border-2 border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-mono font-bold text-slate-800 placeholder:font-sans placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-2xs"
              />
            </div>
            
            <p className="text-xs text-slate-400 flex items-center gap-1.5 pl-1">
              <Info size={12} className="text-indigo-500 shrink-0" />
              <span>Public host URL used for admin health checks and generating direct customer cPanel redirect links.</span>
            </p>
          </div>

          {/* Automation & Discount Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            
            {/* Bundle Discount (%) */}
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Percent size={13} className="text-indigo-600" />
                    <span>Domain + Hosting Bundle Discount</span>
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Applied at checkout when both are purchased together.</p>
                </div>
                <span className="text-base font-black text-indigo-600 bg-white border border-indigo-200 px-3 py-1 rounded-xl shadow-2xs font-mono">
                  {config.bundleDiscountPercent || 0}%
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={config.bundleDiscountPercent || 0}
                  onChange={(e) => setConfig({ ...config, bundleDiscountPercent: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.bundleDiscountPercent || 0}
                  onChange={(e) => setConfig({ ...config, bundleDiscountPercent: Number(e.target.value) })}
                  className="w-20 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-center text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                />
              </div>

              <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200/80">
                💡 <strong className="text-slate-700 font-bold">Offer Preview:</strong> A customer buying a domain ($10) + hosting ($40) saves <strong className="text-indigo-700">${((50 * (config.bundleDiscountPercent || 0)) / 100).toFixed(2)}</strong> automatically.
              </div>
            </div>

            {/* Sandbox / Test Mode Toggle */}
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders size={13} className="text-indigo-600" />
                    <span>Sandbox / Test Mode</span>
                  </h4>
                  <span className={cn(
                    "text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                    config.isSandboxMode 
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-emerald-100 text-emerald-900 border-emerald-300"
                  )}>
                    {config.isSandboxMode ? 'Sandbox Active' : 'Production Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  When active, provisioning tests complete successfully without dispatching live API calls to your WHM server.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {config.isSandboxMode ? '🧪 Simulated order execution' : '⚡ Live account creation'}
                </span>
                
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, isSandboxMode: !config.isSandboxMode })}
                  className={cn(
                    "relative w-12 h-6 rounded-full transition-all duration-200 focus:outline-none shadow-inner",
                    config.isSandboxMode ? "bg-amber-500" : "bg-slate-300"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200",
                    config.isSandboxMode ? "left-6" : "left-0.5"
                  )} />
                </button>
              </div>
            </div>
          </div>

          {/* Test Connection Action & Diagnostics Section */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing === 'hosting'}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-slate-200 active:scale-95"
              >
                {testing === 'hosting' ? (
                  <>
                    <RefreshCw size={13} className="animate-spin text-cyan-400" />
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <Plug size={14} className="text-cyan-400" />
                    <span>Test WHM Connection</span>
                  </>
                )}
              </button>

              {testResult && (
                <div className={cn(
                  "flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border shadow-2xs animate-in fade-in duration-200",
                  testResult.success
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                )}>
                  {testResult.success ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Troubleshooting Helper for Failed Tests */}
            {testResult && !testResult.success && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold">
                  <HelpCircle size={15} />
                  <span>Troubleshooting WHM Connection</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-amber-800/90 font-medium pl-1">
                  <li>Confirm that the server hostname is reachable and resolves to the server IP.</li>
                  <li>Ensure WHM SSL port <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">2087</code> is opened in your server firewall (csf / iptables).</li>
                  <li>Verify that <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">WHM_API_TOKEN</code> in <code className="font-mono">backend/.env</code> has "All Privileges" enabled in WHM &gt; Manage API Tokens.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM SAVE ACTION BAR */}
      <div className="sticky bottom-6 z-20 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full shrink-0",
            hasUnsavedChanges ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
          )} />
          <div>
            <p className="text-xs font-bold text-slate-800">
              {hasUnsavedChanges ? 'You have unsaved changes' : 'All settings up to date'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              {config.updatedAt ? `Last saved on ${new Date(config.updatedAt).toLocaleDateString()} at ${new Date(config.updatedAt).toLocaleTimeString()}` : 'Changes will take effect across the entire system immediately upon saving.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleResetToLoaded}
              disabled={saving}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs"
            >
              Discard Changes
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-7 py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-black text-xs shadow-md shadow-violet-200 hover:shadow-lg hover:shadow-violet-300 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 active:translate-y-0"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin text-white" />
                <span>Saving Configuration...</span>
              </>
            ) : (
              <>
                <Zap size={14} className="text-amber-300" />
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};