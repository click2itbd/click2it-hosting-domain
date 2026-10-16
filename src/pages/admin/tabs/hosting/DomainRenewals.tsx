import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, query, orderBy, getDocs, updateDoc, doc, where } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Loader2, Mail, Phone, Clock, CheckCircle, XCircle, Eye, RefreshCw, X } from 'lucide-react';
import { formatCurrency, cn } from '../../../../lib/utils';
import { getDomainRenewalPriceBreakdown } from '../../../../services/domainApi';
import { Pagination } from '../../../../components/common/Pagination';
import { apiPost } from '../../../../services/apiClient';

interface DomainRenewal {
  id: string;
  domain: string;
  tld: string;
  userId: string;
  type: string;
  documentNumber: string;
  renewalPriceBdt: number;
  renewalPeriod: number;
  totalBdt: number;
  status: string;
  paymentStatus: string;
  renewalStatus: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: string;
  transactionId?: string;
  createdAt: unknown;
  updatedAt: string;
}

function formatRenewalDate(value: unknown): string {
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (value && typeof value === 'object') {
    const timestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else {
      const seconds = timestamp.seconds ?? timestamp._seconds;
      date = typeof seconds === 'number' ? new Date(seconds * 1000) : new Date(Number.NaN);
    }
  } else if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value);
  } else {
    date = new Date(Number.NaN);
  }

  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

export default function DomainRenewals() {
  const [renewals, setRenewals] = useState<DomainRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRenewal, setSelectedRenewal] = useState<DomainRenewal | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    fetchRenewals();
  }, []);

  const fetchRenewals = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'domain_renewals'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DomainRenewal));
      setRenewals(data);
    } catch (error) {
      console.error('Error fetching renewals:', error);
      toast.error('Failed to load domain renewals');
    } finally {
      setLoading(false);
    }
  };

  const updateRenewalStatus = async (id: string, field: string, value: string) => {
    setStatusUpdating(true);
    try {
      await updateDoc(doc(db, 'domain_renewals', id), { 
        [field]: value,
        updatedAt: new Date().toISOString()
      });
      setRenewals(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
      if (selectedRenewal?.id === id) {
        setSelectedRenewal(prev => prev ? { ...prev, [field]: value } : null);
      }
      toast.success(`Renewal marked as ${value}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleApprovePayment = async (renewal: DomainRenewal) => {
    setStatusUpdating(true);
    let paymentApproved = false;
    try {
      await updateDoc(doc(db, 'domain_renewals', renewal.id), {
        paymentStatus: 'payment_received',
        paymentVerifiedAt: new Date().toISOString(),
        status: 'pending',
        updatedAt: new Date().toISOString(),
      });
      paymentApproved = true;

      const result = await apiPost<{ success: boolean; error?: string; message?: string; data?: { error?: string } }>(
        '/api/domains/fulfill',
        { orderId: renewal.id, orderType: 'renewal' },
      );
      if (!result.success) {
        throw new Error(result.error || result.data?.error || result.message || 'Domain renewal failed');
      }

      toast.success('Payment verified and domain renewal processed through the registrar');
      await fetchRenewals();
    } catch (error: any) {
      console.error('Domain renewal payment approval error:', error);
      toast.error(paymentApproved
        ? `Payment approved, but registrar renewal failed: ${error.message || 'Please review the renewal'}`
        : error.message || 'Failed to approve payment');
      if (paymentApproved) await fetchRenewals();
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleViewBreakdown = async (domain: string) => {
    setLoadingBreakdown(true);
    setBreakdown(null);
    try {
      const data = await getDomainRenewalPriceBreakdown(domain);
      setBreakdown(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load pricing breakdown');
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const handleFulfillRenewal = async (renewal: DomainRenewal) => {
    setStatusUpdating(true);
    try {
      const result = await apiPost<{ success: boolean; error?: string; message?: string }>(
        '/api/domains/fulfill',
        { orderId: renewal.id, orderType: 'renewal' },
      );
      if (!result.success) {
        throw new Error(result.error || result.message || 'Domain renewal failed');
      }
      toast.success('Domain renewed through the registrar');
      await fetchRenewals();
    } catch (error: any) {
      console.error('Domain renewal fulfillment error:', error);
      toast.error(error.message || 'Domain renewal failed');
    } finally {
      setStatusUpdating(false);
    }
  };

  const getStatusBadge = (status: string, type: 'payment' | 'renewal' | 'general') => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      pending_payment: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      pending_verification: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-700' },
      payment_received: { bg: 'bg-green-100', text: 'text-green-700' },
      renewed: { bg: 'bg-green-100', text: 'text-green-700' },
      failed: { bg: 'bg-red-100', text: 'text-red-700' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700' },
      active: { bg: 'bg-green-100', text: 'text-green-700' },
      suspended: { bg: 'bg-orange-100', text: 'text-orange-700' },
    };

    const style = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    return (
      <span className={cn("px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider", style.bg, style.text)}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Domain Renewals</h2>
        <button onClick={fetchRenewals} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Renewal</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {renewals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No domain renewals found.
                  </td>
                </tr>
              ) : renewals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(renewal => (
                <tr key={renewal.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{renewal.documentNumber || renewal.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{renewal.domain}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-gray-900">{renewal.customerName}</span>
                      <a href={`mailto:${renewal.customerEmail}`} className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                        <Mail size={10} /> {renewal.customerEmail}
                      </a>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone size={10} /> {renewal.customerPhone}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{renewal.renewalPeriod} Year{renewal.renewalPeriod > 1 ? 's' : ''}</td>
                  <td className="px-4 py-3 font-bold">৳{renewal.totalBdt?.toLocaleString()}</td>
                  <td className="px-4 py-3">{getStatusBadge(renewal.paymentStatus, 'payment')}</td>
                  <td className="px-4 py-3">{getStatusBadge(renewal.renewalStatus, 'renewal')}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatRenewalDate(renewal.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setSelectedRenewal(renewal)} 
                        title="View Details" 
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Eye size={16} />
                      </button>
                      {renewal.paymentStatus === 'pending_verification' && (
                        <button 
                          onClick={() => handleApprovePayment(renewal)} 
                          disabled={statusUpdating}
                          title="Approve payment and renew through registrar" 
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {renewal.renewalStatus === 'pending' && renewal.paymentStatus === 'payment_received' && (
                        <button 
                          onClick={() => handleFulfillRenewal(renewal)} 
                          disabled={statusUpdating}
                          title="Renew through registrar" 
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                        >
                          <RefreshCw size={16} />
                        </button>
                      )}
                      {(renewal.renewalStatus === 'pending' || renewal.renewalStatus === 'processing') && (
                        <button 
                          onClick={() => updateRenewalStatus(renewal.id, 'renewalStatus', 'failed')} 
                          title="Mark as Failed" 
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={renewals.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* Detail Modal */}
      {selectedRenewal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Renewal Details</h3>
              <button onClick={() => { setSelectedRenewal(null); setBreakdown(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Domain</p>
                  <p className="font-medium text-gray-900">{selectedRenewal.domain}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">TLD</p>
                  <p className="font-medium text-gray-900">{selectedRenewal.tld}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Period</p>
                  <p className="font-medium text-gray-900">{selectedRenewal.renewalPeriod} Year{selectedRenewal.renewalPeriod > 1 ? 's' : ''}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Amount</p>
                  <p className="font-medium text-gray-900">৳{selectedRenewal.totalBdt?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Customer</p>
                  <p className="font-medium text-gray-900">{selectedRenewal.customerName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Email</p>
                  <p className="font-medium text-gray-900">{selectedRenewal.customerEmail}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Phone</p>
                  <p className="font-medium text-gray-900">{selectedRenewal.customerPhone}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Payment Method</p>
                  <p className="font-medium text-gray-900 capitalize">{selectedRenewal.paymentMethod}</p>
                </div>
                {selectedRenewal.transactionId && (
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-gray-500 uppercase">Transaction ID</p>
                    <p className="font-mono text-sm text-gray-900">{selectedRenewal.transactionId}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Payment Status</p>
                  <div className="mt-1">{getStatusBadge(selectedRenewal.paymentStatus, 'payment')}</div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Renewal Status</p>
                  <div className="mt-1">{getStatusBadge(selectedRenewal.renewalStatus, 'renewal')}</div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <button
                  onClick={() => handleViewBreakdown(selectedRenewal.domain)}
                  disabled={loadingBreakdown}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingBreakdown ? <Loader2 className="animate-spin" size={14} /> : <Eye size={14} />}
                  {breakdown ? 'Refresh Pricing Breakdown' : 'View Pricing Breakdown'}
                </button>

                {breakdown && (
                  <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Internal Pricing Breakdown</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Supplier Price (USD)</span>
                      <span className="font-mono text-gray-900">${breakdown.supplierPriceUsd?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Markup ({breakdown.markupPercent}%)</span>
                      <span className="font-mono text-gray-900">+${breakdown.markupAmountUsd?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Selling Price (USD)</span>
                      <span className="font-mono text-gray-900">${breakdown.sellingPriceUsd?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Exchange Rate</span>
                      <span className="font-mono text-gray-900">{breakdown.exchangeRate} BDT</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between">
                      <span className="font-bold text-gray-900">Final Customer Price</span>
                      <span className="font-bold text-blue-600">৳{breakdown.sellingPriceBdt?.toLocaleString()}</span>
                    </div>
                    {breakdown.isSandbox && (
                      <p className="text-xs text-yellow-600 font-medium">Note: Sandbox mode active</p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Update Renewal Status</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRenewal.paymentStatus === 'payment_received' && selectedRenewal.renewalStatus === 'pending' && (
                    <button
                      onClick={() => handleFulfillRenewal(selectedRenewal)}
                      disabled={statusUpdating}
                      className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 disabled:opacity-50"
                    >
                      Renew through registrar
                    </button>
                  )}
                  <button
                    onClick={() => updateRenewalStatus(selectedRenewal.id, 'renewalStatus', 'failed')}
                    disabled={statusUpdating}
                    className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 disabled:opacity-50"
                  >
                    Mark Failed
                  </button>
                  <button
                    onClick={() => updateRenewalStatus(selectedRenewal.id, 'renewalStatus', 'cancelled')}
                    disabled={statusUpdating}
                    className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
