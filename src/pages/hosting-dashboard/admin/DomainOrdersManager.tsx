import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import { toast } from 'react-hot-toast';
import { RefreshCw, CheckCircle, RotateCcw, Search, Filter, AlertTriangle, Key, Copy, Send } from 'lucide-react';
import { apiPost } from '../../../services/apiClient';

interface DomainOrder {
  id: string;
  domain: string;
  tld?: string;
  userId: string;
  orderId?: string;
  type?: 'register' | 'renewal' | 'transfer';
  action?: 'register' | 'renewal' | 'transfer';
  authCode?: string;
  eppCode?: string;
  registrarOrderId?: string;
  registrationId?: string;
  providerStatus?: string;
  providerCode?: string;
  providerHttpStatus?: number;
  providerRequestStartedAt?: string;
  providerResponseReceivedAt?: string;
  fulfillmentError?: string;
  status: 'pending' | 'active' | 'registered' | 'failed' | 'expiring' | 'expired' | 'renewing' | 'manual_review';
  registeredAt?: string;
  expiresAt?: string;
  autoRenew?: boolean;
  nameservers?: string[];
  price?: number;
  createdAt: string;
  updatedAt: string;
}

export const DomainOrdersManager: React.FC = () => {
  const [orders, setOrders] = useState<DomainOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'domainOrders'), orderBy('createdAt', 'desc'), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as DomainOrder));
      setOrders(data);
      setLoading(false);
    }, (err) => {
      console.error('Error loading domain orders:', err);
      toast.error('Failed to load domain orders');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.domain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getExpiryStatus = (order: DomainOrder) => {
    if (!order.expiresAt) return null;
    const expiry = new Date(order.expiresAt);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    if (expiry < now) {
      return { label: 'Expired', className: 'bg-red-100 text-red-700' };
    } else if (expiry < thirtyDaysFromNow) {
      return { label: 'Expiring Soon', className: 'bg-yellow-100 text-yellow-700' };
    }
    return null;
  };

  const handleSubmitTransfer = async (order: DomainOrder) => {
    setActionLoading(order.id);
    const toastId = toast.loading(`Submitting transfer for ${order.domain} to Openprovider...`);
    try {
      const payload = {
        domainOrderId: order.id,
        orderId: order.orderId,
        domain: order.domain,
        authCode: order.authCode || order.eppCode,
        action: 'execute',
        isTransferSubmission: true,
      };

      let res: any;
      try {
        res = await apiPost<{ success: boolean; message?: string; error?: string; transferId?: string }>('/api/domains/admin/execute-transfer', payload);
      } catch (e1: any) {
        if (e1?.message?.includes('404')) {
          try {
            res = await apiPost<{ success: boolean; message?: string; error?: string; transferId?: string }>('/api/domains/transfer/execute', payload);
          } catch (e2: any) {
            res = await apiPost<{ success: boolean; message?: string; error?: string; transferId?: string }>('/api/domains/transfer', payload);
          }
        } else {
          throw e1;
        }
      }

      if (res?.success) {
        toast.success(res.message || 'Domain transfer successfully submitted to Openprovider!', { id: toastId, duration: 6000 });
      } else {
        toast.error(res?.error || res?.message || 'Transfer failed', { id: toastId, duration: 8000 });
      }
    } catch (error: any) {
      // If server returned 404, fallback to updating Firestore record
      if (error?.message?.includes('404')) {
        try {
          const now = new Date().toISOString();
          await updateDoc(doc(db, 'domainOrders', order.id), {
            status: 'pending_transfer',
            providerStatus: 'REQ',
            transferStatus: 'pending_transfer',
            transferSubmittedAt: now,
            updatedAt: now,
          });
          toast.success(`Transfer for ${order.domain} marked pending in database. Please restart cPanel Node backend.`, { id: toastId, duration: 8000 });
        } catch {
          toast.error(error?.message || 'Transfer failed', { id: toastId });
        }
      } else {
        toast.error(error?.message || 'Transfer failed', { id: toastId });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryRegistration = async (order: DomainOrder) => {
    setActionLoading(order.id);
    try {
      const res = await apiPost<{ success: boolean; message?: string; error?: string }>('/api/domains/register', {
        domain: order.domain,
        years: 1,
      });
      
      if (res.success) {
        toast.success('Domain registration successful');
      } else {
        toast.error(res.error || res.message || 'Registration failed');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Registration failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsCompleted = async (order: DomainOrder) => {
    setActionLoading(order.id);
    try {
      await updateDoc(doc(db, 'domainOrders', order.id), {
        status: 'registered',
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Marked as manually completed');
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRenew = async (order: DomainOrder) => {
    setActionLoading(order.id);
    try {
      const res = await apiPost<{ success: boolean; message?: string; error?: string }>('/api/domains/renew', {
        domain: order.domain,
        years: 1,
      });
      
      if (res.success) {
        toast.success('Domain renewal successful');
      } else {
        toast.error(res.error || res.message || 'Renewal failed');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Renewal failed');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      registered: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      expiring: 'bg-orange-100 text-orange-700',
      expired: 'bg-red-100 text-red-700',
      renewing: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  const getNeedsAttentionBadge = (order: DomainOrder) => {
    if (order.status !== 'pending') return null;
    if (order.registrationId && ['REQ', 'UNKNOWN'].includes((order.providerStatus || '').toUpperCase())) {
      return (
        <span className="px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-700">
          Awaiting Registrar
        </span>
      );
    }
    const updatedAt = order.updatedAt || order.createdAt;
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
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search domains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-[#7B61FF] focus:border-[#7B61FF]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#7B61FF] focus:border-[#7B61FF]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="registered">Registered</option>
              <option value="failed">Failed</option>
              <option value="expiring">Expiring</option>
              <option value="expired">Expired</option>
              <option value="renewing">Renewing</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#081621] text-white text-xs uppercase">
              <tr>
                <th className="px-6 py-4">Domain</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Registered Date</th>
                <th className="px-6 py-4">Expires</th>
                <th className="px-6 py-4">Auto-Renew</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => {
                const expiryStatus = getExpiryStatus(order);
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{order.domain}</span>
                          {order.type === 'transfer' && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                              Transfer
                            </span>
                          )}
                        </div>
                        {(order.authCode || order.eppCode) && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[11px] text-amber-800 font-semibold flex items-center gap-1">
                              <Key size={11} /> Auth/EPP:
                            </span>
                            <code className="text-[11px] bg-amber-50 px-1 py-0.5 rounded border border-amber-200 text-amber-950 font-mono font-bold select-all">
                              {order.authCode || order.eppCode}
                            </code>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(order.authCode || order.eppCode || '');
                                toast.success('Auth code copied!');
                              }}
                              className="p-0.5 text-amber-700 hover:text-amber-900"
                              title="Copy code"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        )}
                        {(order.registrationId || order.providerCode || order.providerHttpStatus || order.providerRequestStartedAt || order.fulfillmentError) && (
                          <span className="text-xs text-gray-500">
                            Openprovider {order.providerStatus || 'status not returned'}
                            {order.registrationId && ` · ID ${order.registrationId}`}
                            {(order.providerCode || order.providerHttpStatus) && ` · Code ${order.providerCode || '-'} / HTTP ${order.providerHttpStatus || '-'}`}
                          </span>
                        )}
                        {(order.providerRequestStartedAt || order.fulfillmentError) && (
                          <span className="text-xs text-gray-500">
                            Request sent {order.providerRequestStartedAt ? new Date(order.providerRequestStartedAt).toLocaleString() : 'not recorded'}
                            {order.providerResponseReceivedAt
                              ? ` · Response received ${new Date(order.providerResponseReceivedAt).toLocaleString()}`
                              : ' · No response recorded'}
                          </span>
                        )}
                        {order.fulfillmentError && (
                          <span className="text-xs text-amber-700">{order.fulfillmentError}</span>
                        )}
                        {expiryStatus && (
                          <span className={`text-xs px-2 py-0.5 rounded mt-1 w-fit ${expiryStatus.className}`}>
                            {expiryStatus.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.userId}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(order.status)}
                        {getNeedsAttentionBadge(order)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {order.registeredAt ? new Date(order.registeredAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {order.expiresAt ? new Date(order.expiresAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {order.autoRenew ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Yes</span>
                      ) : (
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {order.type === 'transfer' && (
                          <button
                            onClick={() => handleSubmitTransfer(order)}
                            disabled={actionLoading === order.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                            title="Submit Domain Transfer to Openprovider"
                          >
                            <Send size={13} className={actionLoading === order.id ? "animate-spin" : ""} />
                            {order.registrationId ? 'Resubmit Transfer' : 'Transfer'}
                          </button>
                        )}
                        {order.status === 'failed' && order.type !== 'transfer' && (
                          <button
                            onClick={() => handleRetryRegistration(order)}
                            disabled={actionLoading === order.id}
                            className="bg-gray-100 p-2 rounded-md text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                            title="Retry Registration"
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}
                        {(order.status === 'pending' || order.status === 'failed') && !(
                          order.status === 'pending' &&
                          order.registrationId &&
                          ['REQ', 'UNKNOWN'].includes((order.providerStatus || '').toUpperCase())
                        ) && (
                          <button
                            onClick={() => handleMarkAsCompleted(order)}
                            disabled={actionLoading === order.id}
                            className="bg-gray-100 p-2 rounded-md text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                            title="Mark as Manually Completed"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {(order.status === 'registered' || order.status === 'expiring' || order.status === 'expired') && (
                          <button
                            onClick={() => handleRenew(order)}
                            disabled={actionLoading === order.id}
                            className="bg-gray-100 p-2 rounded-md text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50"
                            title="Renew Now"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                    No domain orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
