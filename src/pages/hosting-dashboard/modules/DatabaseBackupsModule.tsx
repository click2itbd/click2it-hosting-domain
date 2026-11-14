import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  Clock, 
  HardDrive, 
  ShieldCheck, 
  AlertCircle,
  Copy,
  Check,
  FileJson
} from 'lucide-react';
import { apiGet, apiPost, getApiUrl } from '../../../services/apiClient';
import toast from 'react-hot-toast';

export const DatabaseBackupsModule: React.FC = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedCron, setCopiedCron] = useState(false);

  const cronCommand = `0 0 * * * curl -s "https://click2it.bd/api/cron/backup/daily?key=click2it_cron_secret" >/dev/null 2>&1`;

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res: any = await apiGet('/api/admin/backups');
      if (res && res.success && Array.isArray(res.backups)) {
        setBackups(res.backups);
      } else {
        setBackups([]);
      }
    } catch (e: any) {
      console.warn('Failed to load backups:', e);
      setBackups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const res: any = await apiPost('/api/admin/backups/create', {});
      if (res && res.success) {
        toast.success('Database backup snapshot generated successfully!');
        fetchBackups();
      } else {
        toast.error(res?.error || 'Failed to create backup');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (snapshotId: string) => {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const downloadUrl = getApiUrl(`/api/admin/backups/${snapshotId}/download`);
      
      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${snapshotId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Backup snapshot downloaded successfully!');
    } catch (err: any) {
      toast.error('Failed to download backup file');
    }
  };

  const handleCopyCron = () => {
    navigator.clipboard?.writeText(cronCommand);
    setCopiedCron(true);
    toast.success('cPanel Cron command copied to clipboard!');
    setTimeout(() => setCopiedCron(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={16} /> Disaster Recovery & Data Vault
            </div>
            <h2 className="text-2xl font-black text-white">Automated Database Backups</h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Automated off-site disaster recovery snapshots. Every day at midnight, a complete encrypted snapshot of all customers, orders, hosting packages, and settings is preserved.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 shrink-0"
            >
              {creating ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              {creating ? 'Generating Snapshot...' : 'Create Backup Snapshot Now'}
            </button>
            <button
              onClick={fetchBackups}
              disabled={loading}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10 shrink-0"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* cPanel Cron Setup Info */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
              <Clock size={16} /> Automated Daily Midnight Cron (cPanel)
            </div>
            <p className="text-xs text-slate-500">
              Run this scheduled task in cPanel &gt; Cron Jobs once every 24 hours at 00:00 AM to automate daily snapshots.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-xs text-slate-700 max-w-xl overflow-x-auto">
            <span className="truncate">{cronCommand}</span>
            <button
              onClick={handleCopyCron}
              className="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-indigo-600 transition-colors shrink-0"
              title="Copy Command"
            >
              {copiedCron ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Backups List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Saved Backup Snapshots</h3>
            <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full font-bold">
              {backups.length} Available
            </span>
          </div>
          <span className="text-xs text-slate-400">Stores up to 30 recent snapshots</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-indigo-600" />
            <p className="text-sm">Loading backup catalog...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Database size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">No backup snapshots generated yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Click &quot;Create Backup Snapshot Now&quot; above to generate your first full system snapshot.
            </p>
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow"
            >
              <Plus size={14} /> Generate First Backup
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {backups.map((b: any) => (
              <div key={b.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shrink-0">
                    <FileJson size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 font-mono">{b.id}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {b.status === 'completed' ? 'READY' : b.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span>Trigger: <strong>{b.triggeredBy || 'System'}</strong></span>
                      <span>•</span>
                      <span>{b.totalDocuments || 0} Documents</span>
                      <span>•</span>
                      <span>{b.fileSizeKb || 0} KB</span>
                      <span>•</span>
                      <span>{new Date(b.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(b.id)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 self-start sm:self-auto shrink-0 shadow-xs"
                >
                  <Download size={13} />
                  Download JSON
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
