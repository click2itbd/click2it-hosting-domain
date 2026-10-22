import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  LogIn, 
  Globe, 
  KeyRound, 
  Clock, 
  Laptop, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  ExternalLink 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { apiGet, apiPost } from '../services/apiClient';
import toast from 'react-hot-toast';

export interface SecurityLogItem {
  id: string;
  userId: string;
  action: 'LOGIN' | 'NAMESERVER_CHANGE' | 'PASSWORD_RESET_REQUEST' | 'PASSWORD_CHANGE' | 'PROFILE_UPDATE' | 'SSO_LOGIN' | string;
  details: string;
  ipAddress?: string;
  device?: string;
  userAgent?: string;
  timestamp: string;
  metadata?: any;
}

export const SecurityAuditLogsTab: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SecurityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReset, setSendingReset] = useState(false);

  const fetchLogs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res: any = await apiGet('/api/customers/security-logs');
      if (res && res.success && Array.isArray(res.logs)) {
        setLogs(res.logs);
      } else {
        setLogs([]);
      }
    } catch (err: any) {
      console.warn('Failed to load security logs:', err);
      // Fallback local empty state
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      // Record audit log
      await apiPost('/api/customers/security-logs/record', {
        action: 'PASSWORD_RESET_REQUEST',
        details: `Password reset link requested for account email: ${user.email}`,
      }).catch(() => {});

      toast.success(`Password reset link sent to ${user.email}! Check your inbox.`);
      fetchLogs();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send reset link');
    } finally {
      setSendingReset(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <LogIn size={12} className="text-blue-600" /> Account Login
          </span>
        );
      case 'NAMESERVER_CHANGE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Globe size={12} className="text-indigo-600" /> Nameserver Update
          </span>
        );
      case 'PASSWORD_RESET_REQUEST':
      case 'PASSWORD_CHANGE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <KeyRound size={12} className="text-amber-600" /> Password Event
          </span>
        );
      case 'SSO_LOGIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ExternalLink size={12} className="text-emerald-600" /> cPanel SSO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Shield size={12} className="text-slate-500" /> Activity
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <Shield size={16} /> Security Center
            </div>
            <h2 className="text-2xl font-black text-white">Security & Audit Trail</h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Track real-time logins, IP addresses, devices, nameserver changes, and account security events. Click2IT protects your services with continuous audit logging.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handlePasswordReset}
              disabled={sendingReset}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2"
            >
              <KeyRound size={14} />
              {sendingReset ? 'Sending...' : 'Change Password'}
            </button>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Security Recommendation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Encrypted Sessions</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              All web sessions and cPanel SSO tokens use strict TLS 1.3 encryption.
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3.5">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <Globe size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">DNS & NS Auditing</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Every DNS or nameserver switch is signed and tracked by IP address.
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Recognize Unknown IP?</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              If you see unfamiliar device or IP activity, immediately reset your password.
            </p>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-slate-500" />
            <h3 className="font-bold text-slate-900 text-base">Activity History</h3>
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-semibold">
              {logs.length} logged events
            </span>
          </div>
          <span className="text-xs text-slate-400">Past 30 days</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-blue-600" />
            <p className="text-sm">Loading security audit trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Shield size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No security events recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Events such as logins, nameserver updates, and password changes will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-3.5">Event</th>
                  <th className="px-6 py-3.5">Details</th>
                  <th className="px-6 py-3.5">IP Address</th>
                  <th className="px-6 py-3.5">Device & Browser</th>
                  <th className="px-6 py-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => {
                  const dateObj = new Date(log.timestamp || log.metadata?.timestamp || Date.now());
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-6 py-4 text-slate-800 font-medium max-w-xs sm:max-w-md">
                        {log.details || 'Standard security action completed.'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200/60">
                          {log.ipAddress || '127.0.0.1'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Laptop size={13} className="text-slate-400" />
                          <span>{log.device || 'Web Browser'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-right whitespace-nowrap">
                        <div>{dateObj.toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">{dateObj.toLocaleTimeString()}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
