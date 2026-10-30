import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, Globe, Cpu, Database, RefreshCw, CheckCircle2, XCircle, 
  AlertTriangle, Clock, ArrowRight, ShieldCheck, ExternalLink, Copy, Check,
  Info, Activity, Zap, HelpCircle, ChevronDown, Sparkles
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiGet } from '../../../services/apiClient';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../lib/utils';

export interface ServiceStatus {
  id: 'backend' | 'openprovider' | 'whm' | 'cloudlinux';
  name: string;
  connected: boolean;
  status: 'online' | 'error' | 'checking';
  latencyMs?: number;
  code?: string;
  message: string;
  serverTime?: string;
  details?: Record<string, any>;
  lastChecked?: string;
}

interface ConnectionOverviewResponse {
  success: boolean;
  timestamp: string;
  allConnected: boolean;
  connectedCount: number;
  totalCount: number;
  services: {
    backend: ServiceStatus;
    openprovider: ServiceStatus;
    whm: ServiceStatus;
    cloudlinux: ServiceStatus;
  };
}

const SERVICE_METADATA: Record<'backend' | 'openprovider' | 'whm' | 'cloudlinux', {
  title: string;
  category: string;
  subtitle: string;
  icon: any;
  accent: string;
  defaultMsg: string;
  isOptional?: boolean;
}> = {
  backend: {
    title: 'Backend API',
    category: 'Core Engine',
    subtitle: 'Node.js Express & Firestore Engine',
    icon: Database,
    accent: 'blue',
    defaultMsg: 'Core application services & session handling',
  },
  openprovider: {
    title: 'Openprovider',
    category: 'Domain Gateway',
    subtitle: 'Domain Registration & DNS API',
    icon: Globe,
    accent: 'emerald',
    defaultMsg: 'TLD availability, purchase & nameserver management',
  },
  whm: {
    title: 'WHM / cPanel',
    category: 'Server Provisioning',
    subtitle: 'Web Host Manager Server API',
    icon: Server,
    accent: 'violet',
    defaultMsg: 'Web hosting provisioning & cPanel quotas',
  },
  cloudlinux: {
    title: 'CloudLinux',
    category: 'OS Governor (Optional)',
    subtitle: 'LVE Manager & OS License Gateway',
    icon: Cpu,
    accent: 'amber',
    isOptional: true,
    defaultMsg: 'Resource limits & CloudLinux licensing',
  },
};

export const SystemConnectionStatus: React.FC<{
  className?: string;
  onNavigateTab?: (tabName: string) => void;
  currentTab?: string;
}> = ({ className, onNavigateTab, currentTab }) => {
  const { user, canAccessAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [testingService, setTestingService] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [copiedDiag, setCopiedDiag] = useState<boolean>(false);

  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>({
    backend: {
      id: 'backend',
      name: 'Backend API',
      connected: false,
      status: 'checking',
      message: 'Checking backend connectivity...',
    },
    openprovider: {
      id: 'openprovider',
      name: 'Openprovider',
      connected: false,
      status: 'checking',
      message: 'Checking Openprovider gateway...',
    },
    whm: {
      id: 'whm',
      name: 'WHM / cPanel',
      connected: false,
      status: 'checking',
      message: 'Checking WHM server connection...',
    },
    cloudlinux: {
      id: 'cloudlinux',
      name: 'CloudLinux',
      connected: false,
      status: 'checking',
      message: 'Checking CloudLinux licensing...',
    },
  });

  const fetchAllStatuses = useCallback(async (isManual = false) => {
    if (authLoading || !user || !canAccessAdmin) {
      setLoading(false);
      return;
    }
    if (isManual) setRefreshing(true);
    try {
      const token = await user.getIdToken();
      const res: any = await apiGet('/api/admin/connections-status', token);
      if (res && res.success && res.services) {
        setStatuses(res.services);
        setLastUpdated(new Date(res.timestamp || Date.now()));
        if (isManual) {
          if (res.allConnected) {
            toast.success('All systems & provisioning gateways operational!');
          } else {
            toast(`${res.connectedCount}/${res.totalCount} services connected`, {
              icon: 'ℹ️',
            });
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch connection status:', err);
      // Fallback: try basic health check to see if backend itself responds
      try {
        const start = Date.now();
        const healthRes = await fetch('/api/health');
        if (healthRes.ok) {
          setStatuses((prev) => ({
            ...prev,
            backend: {
              id: 'backend',
              name: 'Backend API',
              connected: true,
              status: 'online',
              latencyMs: Date.now() - start,
              message: 'Backend server reachable',
              lastChecked: new Date().toISOString(),
            },
          }));
        }
      } catch {
        setStatuses((prev) => ({
          ...prev,
          backend: {
            id: 'backend',
            name: 'Backend API',
            connected: false,
            status: 'error',
            message: 'Cannot reach backend server',
            lastChecked: new Date().toISOString(),
          },
        }));
      }
      if (isManual) {
        toast.error('Failed to refresh some service statuses');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, canAccessAdmin, authLoading]);

  const testSingleService = async (serviceId: 'backend' | 'openprovider' | 'whm' | 'cloudlinux') => {
    if (!user || !canAccessAdmin) return;
    setTestingService(serviceId);
    try {
      const token = await user.getIdToken();
      const res: any = await apiGet(`/api/admin/connections-status?service=${serviceId}`, token);
      if (res && res.success && res.service) {
        setStatuses((prev) => ({
          ...prev,
          [serviceId]: res.service,
        }));
        if (res.service.connected) {
          toast.success(`${SERVICE_METADATA[serviceId].title}: Connected (${res.service.latencyMs || 0}ms)`);
        } else {
          toast.error(`${SERVICE_METADATA[serviceId].title}: ${res.service.message || 'Connection failed'}`);
        }
      }
    } catch (err: any) {
      toast.error(`Error testing ${SERVICE_METADATA[serviceId].title}`);
    } finally {
      setTestingService(null);
    }
  };

  useEffect(() => {
    if (authLoading || !user || !canAccessAdmin) return;
    fetchAllStatuses(false);
    const interval = setInterval(() => {
      fetchAllStatuses(false);
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchAllStatuses, authLoading, user, canAccessAdmin]);

  const serviceKeys: Array<'backend' | 'openprovider' | 'whm' | 'cloudlinux'> = [
    'backend',
    'openprovider',
    'whm',
    'cloudlinux',
  ];

  const connectedCount = serviceKeys.filter((k) => statuses[k]?.connected).length;
  const allConnected = connectedCount === serviceKeys.length;
  const healthPercent = Math.round((connectedCount / serviceKeys.length) * 100);

  const handleCopyDiagnostics = () => {
    const report = {
      timestamp: new Date().toISOString(),
      user: user?.email,
      overallStatus: allConnected ? 'ALL_CONNECTED' : `${connectedCount}/${serviceKeys.length}_CONNECTED`,
      services: statuses,
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopiedDiag(true);
    toast.success('Connection diagnostics copied to clipboard');
    setTimeout(() => setCopiedDiag(false), 2500);
  };

  const scrollToSettings = () => {
    const el = document.getElementById('hosting-provider-settings');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={cn("bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-300", className)}>
      {/* Top Header Bar */}
      <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/40">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-md shadow-slate-200">
            <Activity size={20} className="text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">System &amp; Provider Connections</h2>
              
              {/* Dynamic Health Badge */}
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-all",
                loading ? "bg-slate-100 text-slate-600 border-slate-200" :
                allConnected 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : connectedCount >= 2 
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
              )}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  loading ? "bg-slate-400 animate-pulse" :
                  allConnected ? "bg-emerald-500 animate-pulse" :
                  connectedCount >= 2 ? "bg-amber-500 animate-pulse" : "bg-rose-500"
                )} />
                <span className="font-mono tabular-nums">
                  {loading ? 'Checking...' : `${connectedCount}/${serviceKeys.length} Services Online`}
                </span>
                
                {/* Mini Visual Progress bar */}
                <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      allConnected ? "bg-emerald-500" : connectedCount >= 2 ? "bg-amber-500" : "bg-rose-500"
                    )}
                    style={{ width: `${healthPercent}%` }}
                  />
                </div>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 font-medium mt-1">
              Real-time connectivity status for backend core, domain registrars, and hosting provisioning gateways.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {lastUpdated && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-100/70 px-2.5 py-1.5 rounded-xl border border-slate-200/50">
              <Clock size={12} className="text-slate-500" />
              <span className="font-mono tabular-nums">{lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowDiagnostics((prev) => !prev)}
            className={cn(
              "px-3.5 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5",
              showDiagnostics 
                ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                : "text-slate-700 bg-white hover:bg-slate-100 border-slate-200 shadow-2xs"
            )}
          >
            <Activity size={13} className={showDiagnostics ? "text-cyan-400" : "text-slate-500"} />
            <span>{showDiagnostics ? 'Hide Telemetry' : 'Diagnostics'}</span>
          </button>

          {/* Quick jump to config if on api-settings tab, or tab switcher if on dashboard */}
          {currentTab === 'api-settings' ? (
            <button
              type="button"
              onClick={scrollToSettings}
              className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <span>Configure WHM</span>
              <ChevronDown size={13} />
            </button>
          ) : onNavigateTab ? (
            <button
              type="button"
              onClick={() => onNavigateTab('api-settings')}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <span>API Settings</span>
              <ArrowRight size={13} />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => fetchAllStatuses(true)}
            disabled={refreshing || loading}
            title="Refresh all service connections"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-slate-200 active:scale-95"
          >
            <RefreshCw size={13} className={cn((refreshing || loading) && "animate-spin")} />
            <span>{refreshing ? 'Testing...' : 'Test All'}</span>
          </button>
        </div>
      </div>

      {/* Grid of 4 Provider Status Cards */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {serviceKeys.map((key) => {
          const meta = SERVICE_METADATA[key];
          const service = statuses[key];
          const isConnected = !!service?.connected;
          const isChecking = service?.status === 'checking' || testingService === key;
          const Icon = meta.icon;

          // Special logic for optional services like CloudLinux
          const isNotConfigured = !isConnected && (
            service?.code === 'NOT_CONFIGURED' || 
            service?.message?.toLowerCase().includes('not configured') ||
            (key === 'cloudlinux' && !isConnected)
          );

          // Latency color formatting
          const latency = service?.latencyMs;
          const latencyColor = 
            latency === undefined ? 'text-slate-400' :
            latency < 300 ? 'text-emerald-600 font-bold' :
            latency < 1500 ? 'text-indigo-600 font-bold' : 'text-amber-600 font-bold';

          return (
            <div
              key={key}
              className={cn(
                "relative rounded-2xl border p-4.5 flex flex-col justify-between transition-all duration-300 group",
                isConnected 
                  ? "bg-white border-slate-200/90 hover:border-emerald-300 hover:shadow-md" 
                  : isNotConfigured
                    ? "bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:shadow-sm"
                    : "bg-white border-rose-200 hover:border-rose-300 hover:shadow-md"
              )}
            >
              {/* Card Top: Icon, Category & Indicator Badge */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-xs",
                    isConnected 
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                      : isNotConfigured
                        ? "bg-slate-100 text-slate-600 border border-slate-200"
                        : "bg-rose-50 text-rose-600 border border-rose-100"
                  )}>
                    <Icon size={20} strokeWidth={2} />
                  </div>

                  {/* Status Indicator Pill */}
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold tracking-wide uppercase shadow-2xs",
                    isChecking
                      ? "bg-slate-100 text-slate-600 border border-slate-200"
                      : isConnected
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : isNotConfigured
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                  )}>
                    {isChecking ? (
                      <RefreshCw size={11} className="animate-spin text-slate-500" />
                    ) : isConnected ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                      </>
                    ) : isNotConfigured ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <Info size={12} className="text-slate-500 shrink-0" />
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <XCircle size={12} className="text-rose-600 shrink-0" />
                      </>
                    )}
                    <span className="font-mono text-[10px]">
                      {isChecking 
                        ? 'Checking' 
                        : isConnected 
                          ? 'Connected' 
                          : isNotConfigured 
                            ? 'Inactive' 
                            : 'Offline'}
                    </span>
                  </div>
                </div>

                {/* Service Title & Subtitle */}
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">{meta.title}</h3>
                  {meta.isOptional && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                      Optional
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium line-clamp-1">{meta.subtitle}</p>

                {/* Status Message Box */}
                <div className={cn(
                  "mt-3 p-2.5 rounded-xl border text-xs transition-colors",
                  isConnected 
                    ? "bg-slate-50/80 border-slate-100 text-slate-700 font-medium" 
                    : isNotConfigured
                      ? "bg-slate-100/60 border-slate-200 text-slate-500 font-medium"
                      : "bg-rose-50/70 border-rose-100 text-rose-700 font-medium"
                )}>
                  <p className="leading-relaxed line-clamp-2">
                    {key === 'whm' && !isConnected && service?.message === 'fetch failed' ? (
                      <span>WHM host unreachable (<code className="bg-rose-100 px-1 py-0.5 rounded text-[11px] text-rose-800">fetch failed</code>). Verify port 2087 &amp; server URL.</span>
                    ) : isNotConfigured && key === 'cloudlinux' ? (
                      <span>CloudLinux module is optional and not active on this node.</span>
                    ) : (
                      service?.message || meta.defaultMsg
                    )}
                  </p>
                </div>
              </div>

              {/* Card Footer: Latency & Individual Test Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">Latency:</span>
                  <span className={cn("font-mono tabular-nums text-xs", latencyColor)}>
                    {latency !== undefined ? `${latency} ms` : '—'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {key === 'whm' && !isConnected && currentTab === 'api-settings' && (
                    <button
                      type="button"
                      onClick={scrollToSettings}
                      className="px-2 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      Fix URL
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => testSingleService(key)}
                    disabled={isChecking}
                    className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                  >
                    <RefreshCw size={11} className={cn(isChecking && "animate-spin text-slate-600")} />
                    <span>{isChecking ? 'Testing' : 'Recheck'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Diagnostics & Technical Details Panel (Collapsible) */}
      {showDiagnostics && (
        <div className="px-6 pb-6 pt-3 border-t border-slate-100 bg-slate-50/60 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-600" />
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                System Diagnostics &amp; Gateway Telemetry
              </h4>
            </div>
            
            <button
              type="button"
              onClick={handleCopyDiagnostics}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs"
            >
              {copiedDiag ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiedDiag ? 'Copied Telemetry!' : 'Copy Telemetry JSON'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {serviceKeys.map((key) => {
              const service = statuses[key];
              const isConnected = !!service?.connected;
              return (
                <div key={key} className="p-3.5 bg-white border border-slate-200/90 rounded-2xl space-y-1.5 font-mono shadow-2xs">
                  <div className="flex items-center justify-between font-bold border-b border-slate-100 pb-1.5">
                    <span className="text-slate-900 text-xs">{service?.name || key.toUpperCase()}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-black",
                      isConnected ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    )}>
                      {service?.code || (isConnected ? 'OK' : 'FAIL')}
                    </span>
                  </div>
                  <div className="text-slate-500 flex justify-between text-[11px]">
                    <span>Status:</span>
                    <span className="font-bold text-slate-800 capitalize">{service?.status || 'unknown'}</span>
                  </div>
                  <div className="text-slate-500 flex justify-between text-[11px]">
                    <span>Latency:</span>
                    <span className="tabular-nums font-bold text-slate-800">{service?.latencyMs !== undefined ? `${service.latencyMs}ms` : '—'}</span>
                  </div>
                  {service?.details && Object.entries(service.details).map(([k, v]) => (
                    <div key={k} className="text-slate-500 flex justify-between text-[11px]">
                      <span className="capitalize">{k}:</span>
                      <span className="text-slate-800 truncate max-w-[140px] font-medium" title={String(v)}>
                        {String(v)}
                      </span>
                    </div>
                  ))}
                  <div className="text-slate-400 text-[10px] pt-1 border-t border-slate-100 flex items-center justify-between">
                    <span>Last Checked:</span>
                    <span>{service?.lastChecked ? new Date(service.lastChecked).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};