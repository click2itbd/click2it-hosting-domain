import React, { useState, useEffect } from 'react';
import { CalendarPlus, Search, CheckCircle, XCircle, Clock, Trash2, Eye, MapPin, Phone, Mail, Link as LinkIcon, X, Database } from 'lucide-react';
import { db } from '../../firebase';
import { collection, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

export const EcommercePreBooks: React.FC = () => {
  const { confirm } = useConfirm();
  const [preBooks, setPreBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [seeding, setSeeding] = useState(false);

  
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'pre_bookings', id), { status });
      toast.success(`Status updated to ${status}`);
      if (selectedRequest && selectedRequest.id === id) {
        setSelectedRequest({ ...selectedRequest, status });
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ title: 'Confirmation', message: 'Are you sure you want to delete this pre-book request?', isDestructive: true })) return;
    try {
      await deleteDoc(doc(db, 'pre_bookings', id));
      toast.success('Request deleted');
      if (selectedRequest && selectedRequest.id === id) setSelectedRequest(null);
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const filteredData = preBooks.filter(req => {
    const matchesSearch = 
      req.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      req.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'approved': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle size={12}/> Approved</span>;
      case 'rejected': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><XCircle size={12}/> Rejected</span>;
      default: return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><Clock size={12}/> Pending</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarPlus className="text-blue-600" /> Pre-Book Requests
          </h2>
          <p className="text-gray-500 text-sm mt-1">Manage customer pre-booking orders.</p>
        </div>
        
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by customer name, product, or phone..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm">
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Product</th>
                <th className="p-4 font-semibold">Advance Info</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No requests found.</td></tr>
              ) : (
                filteredData.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm text-gray-500 whitespace-nowrap">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{req.customerName}</div>
                      <div className="text-xs text-gray-500">{req.phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900 max-w-xs truncate" title={req.productName}>{req.productName}</div>
                    </td>
                    <td className="p-4 text-sm">
                      <div className="text-gray-900 font-medium">Tk {Number(req.advanceAmount || 0).toLocaleString()}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[120px]">{req.transactionId || 'N/A'}</div>
                    </td>
                    <td className="p-4">{getStatusBadge(req.status)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedRequest(req)} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors" title="View Details"><Eye size={16} /></button>
                        <button onClick={() => handleUpdateStatus(req.id, 'approved')} className="p-1.5 text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors" title="Approve"><CheckCircle size={16} /></button>
                        <button onClick={() => handleDelete(req.id)} className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><CalendarPlus size={20} className="text-blue-600" /> Pre-Book Details</h3>
              <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row gap-6">
                {selectedRequest.imageUrl ? (
                  <div className="shrink-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Product Image</p>
                    <img src={selectedRequest.imageUrl} alt="Product" className="w-32 h-32 object-cover rounded-xl border border-gray-200 shadow-sm" />
                  </div>
                ) : (
                  <div className="shrink-0 w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                    <span className="text-gray-400 text-sm">No Image</span>
                  </div>
                )}
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Product Information</p>
                    <p className="font-medium text-gray-900 text-lg leading-tight">{selectedRequest.productName}</p>
                    {selectedRequest.productUrl && (
                      <a href={selectedRequest.productUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1">
                        <LinkIcon size={14} /> View Reference Link
                      </a>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer Information</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-700 font-medium"><Phone size={14} className="text-blue-500"/> {selectedRequest.phone}</div>
                      {selectedRequest.email && <div className="flex items-center gap-2 text-sm text-gray-700"><Mail size={14} className="text-gray-400"/> {selectedRequest.email}</div>}
                      <div className="flex items-start gap-2 text-sm text-gray-700"><MapPin size={14} className="text-gray-400 mt-0.5"/> <span className="flex-1">{selectedRequest.address}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                 <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Payment Information</p>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <p className="text-sm text-gray-500">Advance Amount</p>
                     <p className="font-bold text-gray-900 text-lg">Tk {Number(selectedRequest.advanceAmount || 0).toLocaleString()}</p>
                   </div>
                   <div>
                     <p className="text-sm text-gray-500">Transaction ID</p>
                     <p className="font-mono text-sm font-medium text-gray-900 bg-white px-2 py-1 rounded inline-block mt-1 border border-gray-200">{selectedRequest.transactionId || 'N/A'}</p>
                   </div>
                 </div>
              </div>

              {selectedRequest.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Additional Notes</p>
                  <p className="text-sm text-gray-700 bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">{selectedRequest.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 p-6 bg-gray-50 flex items-center justify-between rounded-b-2xl">
              <div>{getStatusBadge(selectedRequest.status)}</div>
              <div className="flex gap-3">
                {selectedRequest.status !== 'rejected' && (
                  <button onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')} className="px-4 py-2 text-red-600 bg-red-100 hover:bg-red-200 rounded-lg font-medium text-sm transition-colors">Reject Request</button>
                )}
                {selectedRequest.status !== 'approved' && (
                  <button onClick={() => handleUpdateStatus(selectedRequest.id, 'approved')} className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg font-medium text-sm transition-colors shadow-sm">Approve Request</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
