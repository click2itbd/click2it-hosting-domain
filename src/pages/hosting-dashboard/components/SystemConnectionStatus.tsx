import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, Globe, Cpu, Database, RefreshCw, CheckCircle2, XCircle, 
  AlertTriangle, Clock, ArrowRight, ShieldCheck, ExternalLink, Copy, Check
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

const SERVICE_METADATA = {
  backend: {
    title: 'Backend API',
    subtitle: 'Node.js Express & Firestore Engine',
    icon: Database,
    docsUrl: '/api/health',
    defaultMsg: 'Core application services & session handling',
  },
  openprovider: {
    title: 'Openprovider',
    subtitle: 'Domain Registration & DNS API',
    icon: Globe,
    docsUrl: 'https://cp.openprovider.eu/',
    defaultMsg: 'TLD availability, purchase & nameserver management',
  },
  whm: {
    title: 'WHM / cPanel',
    subtitle: 'Web Host Manager Server API',
    icon: Server,
    docsUrl: 'https://server2025.click2itbd.com:2087',
    defaultMsg: 'Web hosting provisioning & cPanel quotas',
  },
  cloudlinux: {
    title: 'CloudLinux',
    subtitle: 'LVE Manager & OS License Gateway',
    icon: Cpu,
    docsUrl: 'https://cln.cloudlinux.com/',
    defaultMsg: 'Resource limits & CloudLinux licensing',
  },
};

export const SystemConnectionStatus: React.FC<{
  className?: string;
  onNavigateTab?: (tabName: string) => void;
}> = ({ className, onNavigateTab }) => {
  const { user } = useAuth();
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
    if (isManual) setRefreshing(true);
    try {
      const res: any = await apiGet('/api/admin/connections-status');
      if (res && res.success && res.services) {
        setStatuses(res.services);
        setLastUpdated(new Date(res.timestamp || Date.now()));
        if (isManual) {
          if (res.allConnected) {
            toast.success('All services operational and connected!');
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
  }, []);

  const testSingleService = async (serviceId: 'backend' | 'openprovider' | 'whm' | 'cloudlinux') => {
    setTestingService(serviceId);
    try {
      const res: any = await apiGet(`/api/admin/connections-status?service=${serviceId}`);
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
    fetchAllStatuses(false);
    // Periodic poll every 45 seconds for fresh status
    const interval = setInterval(() => {
      fetchAllStatuses(false);
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchAllStatuses]);

  const serviceKeys: Array<'backend' | 'openprovider' | 'whm' | 'cloudlinux'> = [
    'backend',
    'openprovider',
    'whm',
    'cloudlinux',
  ];

  const connectedCount = serviceKeys.filter((k) => statuses[k]?.connected).length;
  const allConnected = connectedCount === serviceKeys.length;

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

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden", className)}>
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <Server size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">System &amp; Provider Connections</h2>
              {/* Overall Status Badge */}
              <div className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold",
                loading ? "bg-slate-100 text-slate-600" :
                allConnected 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" 
                  : "bg-amber-50 text-amber-700 border border-amber-200/60"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  loading ? "bg-slate-400" :
                  allConnected ? "bg-emerald-500" : "bg-amber-500"
                )} />
                <span className="font-mono tabular-nums">
                  {loading ? 'Checking...' : `${connectedCount}/${serviceKeys.length} Services Online`}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time connectivity status for backend core and provisioning gateways
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-slate-400 font-medium hidden sm:inline-flex items-center gap-1 mr-1">
              <Clock size={12} />
              <span className="font-mono tabular-nums">{lastUpdated.toLocaleTimeString()}</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowDiagnostics((prev) => !prev)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors"
          >
            {showDiagnostics ? 'Hide Details' : 'Diagnostics'}
          </button>

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('api-settings')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>API Settings</span>
              <ArrowRight size={12} />
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchAllStatuses(true)}
            disabled={refreshing || loading}
            title="Refresh all service connections"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
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

          return (
            <div
              key={key}
              className={cn(
                "relative rounded-xl border p-4.5 flex flex-col justify-between transition-all duration-200",
                isConnected 
                  ? "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm" 
                  : "bg-white border-rose-200/90 shadow-xs"
              )}
            >
              {/* Card Top: Icon & Indicator Badge */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    isConnected 
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                      : "bg-rose-50 text-rose-600 border border-rose-100"
                  )}>
                    <Icon size={20} strokeWidth={1.75} />
                  </div>

                  {/* Explicit Green/Red Indicator Pill with WCAG Text */}
                  <div className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide uppercase",
                    isChecking
                      ? "bg-slate-100 text-slate-600 border border-slate-200"
                      : isConnected
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                  )}>
                    {isChecking ? (
                      <RefreshCw size={11} className="animate-spin text-slate-500" />
                    ) : isConnected ? (
                      <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle size={12} className="text-rose-600 shrink-0" />
                    )}
                    <span className="font-sans">
                      {isChecking ? 'Checking' : isConnected ? 'Connected' : 'Offline'}
                    </span>
                  </div>
                </div>

                {/* Service Title & Subtitle */}
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">{meta.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{meta.subtitle}</p>

                {/* Status Message */}
                <div className="mt-3 py-2 px-2.5 rounded-lg bg-slate-50/80 border border-slate-100 text-xs">
                  <p className={cn(
                    "leading-relaxed font-medium line-clamp-2",
                    isConnected ? "text-slate-700" : "text-rose-700"
                  )}>
                    {service?.message || meta.defaultMsg}
                  </p>
                </div>
              </div>

              {/* Card Footer: Latency & Individual Test Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-500">
                  <span className="text-[11px] text-slate-400 font-medium">Latency:</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-700">
                    {service?.latencyMs !== undefined ? `${service.latencyMs} ms` : '—'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => testSingleService(key)}
                  disabled={isChecking}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-all disabled:opacity-50 flex items-center gap-1"
                >
                  <RefreshCw size={10} className={cn(isChecking && "animate-spin")} />
                  <span>{isChecking ? 'Testing' : 'Recheck'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Diagnostics & Technical Details Panel (Collapsible) */}
      {showDiagnostics && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/40 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Diagnostic &amp; Endpoint Telemetry
            </h4>
            <button
              type="button"
              onClick={handleCopyDiagnostics}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            >
              {copiedDiag ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copiedDiag ? 'Copied!' : 'Copy Telemetry'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {serviceKeys.map((key) => {
              const service = statuses[key];
              const isConnected = !!service?.connected;
              return (
                <div key={key} className="p-3 bg-white border border-slate-200 rounded-lg space-y-1 font-mono">
                  <div className="flex items-center justify-between text-slate-900 font-bold border-b border-slate-100 pb-1">
                    <span>{service?.name || key.toUpperCase()}</span>
                    <span className={isConnected ? "text-emerald-600" : "text-rose-600"}>
                      {service?.code || (isConnected ? 'OK' : 'FAIL')}
                    </span>
                  </div>
                  <div className="text-slate-500 flex justify-between">
                    <span>Status:</span>
                    <span className="font-semibold text-slate-700">{service?.status || 'unknown'}</span>
                  </div>
                  <div className="text-slate-500 flex justify-between">
                    <span>Latency:</span>
                    <span className="tabular-nums">{service?.latencyMs || 0}ms</span>
                  </div>
                  {service?.details && Object.entries(service.details).map(([k, v]) => (
                    <div key={k} className="text-slate-500 flex justify-between">
                      <span className="capitalize">{k}:</span>
                      <span className="text-slate-700 truncate max-w-[200px]" title={String(v)}>
                        {String(v)}
                      </span>
                    </div>
                  ))}
                  <div className="text-slate-400 text-[11px] pt-1">
                    Checked: {service?.lastChecked ? new Date(service.lastChecked).toLocaleTimeString() : 'N/A'}
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
