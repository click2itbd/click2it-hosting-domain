import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  LogIn, 
  Globe, 
  KeyRound, 
  Clock, 
  Laptop, 
  Smartphone,
  LogOut,
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  ExternalLink,
  ShieldAlert,
  Radio
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { apiGet, apiPost } from '../services/apiClient';
import { getOrCreateSessionId } from '../utils/sessionManager';
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
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const currentSessionId = getOrCreateSessionId();

  const fetchSessions = async () => {
    if (!user) return;
    setSessionsLoading(true);
    try {
      const res: any = await apiGet('/api/customers/sessions');
      if (res && res.success && Array.isArray(res.sessions)) {
        setSessions(res.sessions);
      } else {
        setSessions([]);
      }
    } catch (e) {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!sessionId) return;
    setRevoking(true);
    try {
      const res: any = await apiPost('/api/customers/sessions/revoke', { sessionId });
      if (res && res.success) {
        toast.success('Session terminated successfully.');
        fetchSessions();
        fetchLogs();
      } else {
        toast.error(res?.error || 'Failed to terminate session');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to terminate session');
    } finally {
      setRevoking(false);
    }
  };

  const handleRevokeAllOthers = async () => {
    if (!confirm('Are you sure you want to log out of all other devices? Any other computer or phone logged into your account will be immediately signed out.')) {
      return;
    }
    setRevoking(true);
    try {
      const res: any = await apiPost('/api/customers/sessions/revoke', {
        revokeAllOthers: true,
        currentSessionId,
      });
      if (res && res.success) {
        toast.success(res.message || 'Logged out of all other devices.');
        fetchSessions();
        fetchLogs();
      } else {
        toast.error(res?.error || 'Failed to revoke other sessions');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to revoke other sessions');
    } finally {
      setRevoking(false);
    }
  };

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
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchSessions();
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

      {/* Active Connected Sessions & Kill Switch */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
              <h3 className="font-bold text-slate-900 text-base">Active Sessions & Connected Devices</h3>
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                {sessions.length || 1} Device{sessions.length > 1 ? 's' : ''} Online
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Manage all browsers and devices currently signed in to your Click2IT account.
            </p>
          </div>

          <button
            onClick={handleRevokeAllOthers}
            disabled={revoking || sessions.length <= 1}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-40 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto"
            title="Terminate all other sessions immediately"
          >
            <ShieldAlert size={14} className="text-rose-600" />
            {revoking ? 'Terminating...' : 'Log out of all other devices (Kill Switch)'}
          </button>
        </div>

        {sessionsLoading ? (
          <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw size={18} className="animate-spin text-blue-600" />
            <span className="text-xs">Loading active devices...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-6">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white text-emerald-600 rounded-lg shadow-2xs border border-emerald-100">
                  <Laptop size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">Current Web Session</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      CURRENT DEVICE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Active right now • Strict TLS 1.3 encrypted</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((sess: any) => {
              const isCurrent = sess.id === currentSessionId;
              const isMobile = /android|iphone|ipad|ios|mobile/i.test(sess.device || sess.userAgent || '');
              return (
                <div key={sess.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className={`p-2.5 rounded-xl shrink-0 ${isCurrent ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {isMobile ? <Smartphone size={20} /> : <Laptop size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900">
                          {sess.device || (isMobile ? 'Mobile Device' : 'Desktop PC')}
                        </h4>
                        {isCurrent ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            THIS DEVICE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                            Remote Session
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="font-mono text-slate-600">IP: {sess.ipAddress || '127.0.0.1'}</span>
                        <span>•</span>
                        <span>
                          {isCurrent ? (
                            <strong className="text-emerald-600">Active Now</strong>
                          ) : (
                            `Last active: ${sess.lastActiveAt ? new Date(sess.lastActiveAt).toLocaleString() : 'Recently'}`
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(sess.id)}
                      disabled={revoking}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0"
                    >
                      <LogOut size={13} className="text-rose-600" />
                      Terminate Session
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
