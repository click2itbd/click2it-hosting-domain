import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { MessageSquare, CheckCircle, Trash2, Mail, Phone, Search, Reply } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

export const EcommerceInquiries: React.FC = () => {
  const { confirm } = useConfirm();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInquiries(data);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      toast.error('Failed to fetch inquiries');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'inquiries', id), { status: newStatus });
      setInquiries(inquiries.map(i => i.id === id ? { ...i, status: newStatus } : i));
      toast.success(`Inquiry marked as ${newStatus}!`);
    } catch (error) {
      console.error('Error updating inquiry:', error);
      toast.error('Failed to update status');
    }
  };

  const deleteInquiry = async (id: string) => {
    if (!await confirm({ title: 'Confirmation', message: 'Are you sure you want to delete this inquiry?', isDestructive: true })) return;
    try {
      await deleteDoc(doc(db, 'inquiries', id));
      setInquiries(inquiries.filter(i => i.id !== id));
      toast.success('Inquiry deleted');
    } catch (error) {
      console.error('Error deleting inquiry:', error);
      toast.error('Failed to delete inquiry');
    }
  };

  const filteredInquiries = inquiries.filter(i => {
    const matchesSearch = 
      (i.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
      (i.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (i.subject?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (i.message?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Customer Inquiries</h2>
        <p className="text-gray-500 text-sm mt-1">Manage messages from the Contact Us page.</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search messages, names, emails..."
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
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-12 flex items-center justify-center text-gray-500">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
            Loading inquiries...
          </div>
        ) : filteredInquiries.length > 0 ? (
          filteredInquiries.map((inquiry) => (
            <div key={inquiry.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="border-b border-gray-100 bg-gray-50/50 p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      {inquiry.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{inquiry.name}</h3>
                      <div className="text-xs text-gray-500">{new Date(inquiry.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                    inquiry.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {inquiry.status || 'pending'}
                  </span>
                </div>
                
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  <a href={`mailto:${inquiry.email}`} className="flex items-center gap-1.5 text-blue-600 hover:underline">
                    <Mail size={14} /> {inquiry.email}
                  </a>
                  {inquiry.phone && (
                    <a href={`tel:${inquiry.phone}`} className="flex items-center gap-1.5 text-blue-600 hover:underline">
                      <Phone size={14} /> {inquiry.phone}
                    </a>
                  )}
                </div>
              </div>
              
              <div className="p-4">
                {inquiry.subject && (
                  <h4 className="font-bold text-gray-800 mb-2">{inquiry.subject}</h4>
                )}
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{inquiry.message}</p>
                
                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-2">
                  {inquiry.status !== 'resolved' && (
                    <button 
                      onClick={() => updateStatus(inquiry.id, 'resolved')} 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      <CheckCircle size={16} /> Mark Resolved
                    </button>
                  )}
                  <a 
                    href={`mailto:${inquiry.email}?subject=RE: ${inquiry.subject || 'Your Inquiry'}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Reply size={16} /> Reply via Email
                  </a>
                  <button 
                    onClick={() => deleteInquiry(inquiry.id)} 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors ml-auto"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center bg-white rounded-xl border border-gray-100">
            <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Inquiries Found</h3>
            <p className="text-gray-500 text-sm">There are no customer inquiries matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};
