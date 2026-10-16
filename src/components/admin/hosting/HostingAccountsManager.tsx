import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Search, Server, Eye, Power, RotateCcw, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { apiPost, apiGet } from '../../../services/apiClient';

interface HostingAccount {
  id: string;
  userId: string;
  orderId?: string;
  planId?: string;
  providerAccountId?: string;
  provider: string;
  status: 'pending' | 'provisioning' | 'active' | 'suspended' | 'terminated' | 'failed';
  serverIp?: string;
  controlPanelUsername?: string;
  controlPanelUrl?: string;
  diskUsageGb?: number;
  bandwidthUsageGb?: number;
  expiresAt?: string;
  autoRenew?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const HostingAccountsManager: React.FC = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<HostingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [usageModal, setUsageModal] = useState<HostingAccount | null>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  const getAuthToken = async (): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    return await user.getIdToken();
  };

  useEffect(() => {
    const q = query(collection(db, 'hostingAccounts'), orderBy('createdAt', 'desc'), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as HostingAccount));
      setAccounts(data);
      setLoading(false);
    }, (err) => {
      console.error('Error loading hosting accounts:', err);
      toast.error('Failed to load hosting accounts');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredAccounts = accounts.filter(account =>
    account.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.providerAccountId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.serverIp?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAction = async (account: HostingAccount, action: string) => {
    setActionLoading(account.id);
    try {
      const token = await getAuthToken();
      let endpoint = '';
      if (action === 'suspend') endpoint = '/api/hosting/suspend';
      if (action === 'unsuspend') endpoint = '/api/hosting/unsuspend';
      if (action === 'terminate') endpoint = '/api/hosting/terminate';

      const res = await apiPost<{ success: boolean; error?: string }>(endpoint, {
        providerAccountId: account.providerAccountId,
      }, token);
      
      if (res.success) {
        toast.success(`${action} successful`);
      } else {
        toast.error(res.error || `${action} failed`);
      }
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${action} account`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewUsage = async (account: HostingAccount) => {
    setUsageModal(account);
    setLoadingUsage(true);
    setUsageData(null);
    try {
      const token = await getAuthToken();
      const res = await apiPost<{ success: boolean; data: any; error?: string }>('/api/hosting/usage', {
        providerAccountId: account.providerAccountId,
      }, token);
      
      if (res.success && res.data) {
        setUsageData(res.data);
      } else {
        toast.error(res.error || 'Failed to fetch usage');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to fetch usage data');
    } finally {
      setLoadingUsage(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      provisioning: 'bg-blue-100 text-blue-700',
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-orange-100 text-orange-700',
      terminated: 'bg-red-100 text-red-700',
      failed: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  const getNeedsAttentionBadge = (account: HostingAccount) => {
    if (account.status !== 'pending' && account.status !== 'provisioning') return null;
    const updatedAt = account.updatedAt || account.createdAt;
    if (!updatedAt) return null;
    const diffMinutes = (Date.now() - new Date(updatedAt).getTime()) / 1000 / 60;
    if (diffMinutes > 15) {
      return (
        <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700">
          <AlertTriangle size={12} /> Needs Attention
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer ID, provider account ID, or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#7B61FF] focus:border-[#7B61FF]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#081621] text-white text-xs uppercase">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Server IP</th>
                <th className="px-6 py-4">Control Panel</th>
                <th className="px-6 py-4">Expires</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold">{account.userId}</span>
                      <span className="text-xs text-gray-500">{account.providerAccountId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{account.planId || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(account.status)}
                      {getNeedsAttentionBadge(account)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{account.serverIp || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {account.controlPanelUrl ? (
                      <a href={account.controlPanelUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {account.controlPanelUsername || 'Login'}
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {account.expiresAt ? new Date(account.expiresAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                      <button
                        onClick={() => handleViewUsage(account)}
                        className="bg-gray-100 p-2 rounded-md text-gray-600 hover:bg-gray-200 transition-colors"
                        title="View Usage"
                      >
                        <Eye size={16} />
                      </button>
                      {(account.status === 'active' || account.status === 'provisioning') && (
                        <button
                          onClick={() => handleAction(account, 'suspend')}
                          disabled={actionLoading === account.id}
                          className="bg-gray-100 p-2 rounded-md text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50"
                          title="Suspend"
                        >
                          <Power size={16} />
                        </button>
                      )}
                      {account.status === 'suspended' && (
                        <button
                          onClick={() => handleAction(account, 'unsuspend')}
                          disabled={actionLoading === account.id}
                          className="bg-gray-100 p-2 rounded-md text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                          title="Unsuspend"
                        >
                          <Power size={16} />
                        </button>
                      )}
                      {(account.status === 'active' || account.status === 'suspended' || account.status === 'failed') && (
                        <button
                          onClick={() => handleAction(account, 'terminate')}
                          disabled={actionLoading === account.id}
                          className="bg-gray-100 p-2 rounded-md text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Terminate"
                        >
                          <X size={16} />
                        </button>
                      )}
                      {account.status === 'failed' && (
                        <button
                          onClick={() => handleAction(account, 'provision')}
                          disabled={actionLoading === account.id}
                          className="bg-gray-100 p-2 rounded-md text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                          title="Retry Provisioning"
                        >
                          <RefreshCw size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                    No hosting accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Modal */}
      {usageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Usage Statistics</h2>
                <p className="text-sm text-gray-500 mt-1">{usageModal.providerAccountId}</p>
              </div>
              <button onClick={() => { setUsageModal(null); setUsageData(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingUsage ? (
                <div className="flex items-center justify-center h-32">
                  <div className="h-8 w-8 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : usageData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 uppercase mb-1">Disk Usage</div>
                      <div className="text-lg font-bold text-gray-900">
                        {usageData.diskUsageMB ? (usageData.diskUsageMB / 1024).toFixed(2) : 0} GB
                      </div>
                      <div className="text-xs text-gray-500">
                        of {usageData.diskLimitMB ? (usageData.diskLimitMB / 1024).toFixed(0) : 0} GB
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 uppercase mb-1">Bandwidth Usage</div>
                      <div className="text-lg font-bold text-gray-900">
                        {usageData.bandwidthUsageMB ? (usageData.bandwidthUsageMB / 1024).toFixed(2) : 0} GB
                      </div>
                      <div className="text-xs text-gray-500">
                        of {usageData.bandwidthLimitMB ? (usageData.bandwidthLimitMB / 1024).toFixed(0) : 0} GB
                      </div>
                    </div>
                  </div>
                  {usageData.cpuUsagePercent !== undefined && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 uppercase mb-1">CPU Usage</div>
                      <div className="text-lg font-bold text-gray-900">{usageData.cpuUsagePercent}%</div>
                    </div>
                  )}
                  {usageData.ramUsageMB !== undefined && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 uppercase mb-1">RAM Usage</div>
                      <div className="text-lg font-bold text-gray-900">{(usageData.ramUsageMB / 1024).toFixed(2)} GB</div>
                    </div>
                  )}
                  <div className="text-xs text-gray-400 text-right">
                    Last updated: {usageData.lastUpdated ? new Date(usageData.lastUpdated).toLocaleString() : '-'}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">No usage data available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
