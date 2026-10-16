import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { RefreshCcw, Search, CheckCircle, XCircle, Truck, DollarSign, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface ReturnRequest {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productName: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'product_received' | 'refunded';
  createdAt: string;
  refundAmount: number;
}

export const EcommerceReturns: React.FC = () => {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'returns'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReturnRequest));
      setReturns(data);
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: ReturnRequest['status']) => {
    try {
      // In a real app, you might want to also update the main order status
      await updateDoc(doc(db, 'returns', id), { status: newStatus });
      setReturns(returns.map(r => r.id === id ? { ...r, status: newStatus } : r));
      toast.success(`Return status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update return status. Check permissions.');
    }
  };

  const filteredReturns = returns.filter(r => {
    const matchesSearch = 
      r.orderId.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerPhone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium border border-yellow-200">Pending Review</span>;
      case 'approved': return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium border border-blue-200">Return Approved</span>;
      case 'rejected': return <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium border border-red-200">Rejected</span>;
      case 'product_received': return <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium border border-purple-200">Product Received</span>;
      case 'refunded': return <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium border border-green-200">Refund Completed</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Return & Refund Management</h2>
        <p className="text-gray-500 text-sm mt-1">Manage customer return requests and issue refunds.</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Order ID, Customer Name, Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[150px]"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Return Approved</option>
          <option value="product_received">Product Received</option>
          <option value="refunded">Refund Completed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : filteredReturns.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {filteredReturns.map((req) => (
            <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
                
                {/* Info Section */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-lg text-gray-900">{req.orderId}</span>
                    {getStatusBadge(req.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Customer Details</p>
                      <p className="font-medium text-gray-900">{req.customerName}</p>
                      <p className="text-sm text-gray-600">{req.customerPhone}</p>
                      <p className="text-sm text-gray-600">{req.customerEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Product Details</p>
                      <p className="font-medium text-gray-900 line-clamp-1">{req.productName}</p>
                      <p className="text-sm text-gray-600">Refund Amount: <span className="font-bold text-orange-600">৳{req.refundAmount}</span></p>
                      <p className="text-xs text-gray-400 mt-1">Requested on: {new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1 font-medium">Reason for return:</p>
                    <p className="text-sm text-gray-800">{req.reason}</p>
                  </div>
                </div>
                
                {/* Actions Section */}
                <div className="w-full md:w-64 flex flex-col gap-2 shrink-0 md:border-l md:border-gray-100 md:pl-6">
                  <p className="text-sm font-medium text-gray-500 mb-1">Update Status</p>
                  
                  {req.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(req.id, 'approved')} className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                        <CheckCircle size={16} /> Approve Return
                      </button>
                      <button onClick={() => updateStatus(req.id, 'rejected')} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-700 border border-red-200 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                        <XCircle size={16} /> Reject Request
                      </button>
                    </>
                  )}
                  
                  {req.status === 'approved' && (
                    <button onClick={() => updateStatus(req.id, 'product_received')} className="w-full flex items-center justify-center gap-2 bg-purple-50 text-purple-700 border border-purple-200 py-2 px-3 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors">
                      <Truck size={16} /> Product Received
                    </button>
                  )}
                  
                  {req.status === 'product_received' && (
                    <button onClick={() => updateStatus(req.id, 'refunded')} className="w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 border border-green-200 py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
                      <DollarSign size={16} /> Process Refund
                    </button>
                  )}

                  <div className="pt-2 mt-2 border-t border-gray-100">
                    <Link to={`/admin/ecommerce`} className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600 py-1 text-sm font-medium transition-colors">
                      <ExternalLink size={14} /> View Original Order
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <RefreshCcw size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Return Requests</h3>
          <p className="text-gray-500 text-sm">There are no return requests matching your current filters.</p>
        </div>
      )}
    </div>
  );
};
