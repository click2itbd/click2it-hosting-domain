import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, query, orderBy, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Loader2, Mail, Phone, CheckCircle, XCircle, Trash2, Search, Briefcase, Globe, AlertCircle } from 'lucide-react';
import { cn, formatCurrency } from '../../../../lib/utils';
import { Pagination } from '../../../../components/common/Pagination';

interface DomainOffer {
  id: string;
  domain: string;
  amount: number;
  email: string;
  phone: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export default function DomainOffers() {
  const [offers, setOffers] = useState<DomainOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const q = query(collection(db, 'domain_offers'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DomainOffer));
      setOffers(data);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('Failed to load domain offers');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'domain_offers', id), { status: newStatus });
      setOffers(prev => prev.map(o => o.id === id ? { ...o, status: newStatus as any } : o));
      toast.success(`Offer marked as ${newStatus}`);
      if (newStatus === "accepted") {
        toast.success("Automated payment link and invoice sent to user email!", { icon: '📧' });
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const deleteOffer = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;
    try {
      await deleteDoc(doc(db, 'domain_offers', id));
      setOffers(prev => prev.filter(o => o.id !== id));
      toast.success('Offer deleted');
    } catch (error) {
      toast.error('Failed to delete offer');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'accepted': return <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-black uppercase tracking-wider border border-emerald-100 shadow-sm flex items-center gap-1.5 w-fit"><CheckCircle size={12}/> Accepted</span>;
      case 'rejected': return <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-black uppercase tracking-wider border border-rose-100 shadow-sm flex items-center gap-1.5 w-fit"><XCircle size={12}/> Rejected</span>;
      default: return <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-black uppercase tracking-wider border border-amber-100 shadow-sm flex items-center gap-1.5 w-fit"><AlertCircle size={12}/> Pending</span>;
    }
  };

  const filteredOffers = offers.filter(o => 
    o.domain.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="grid grid-cols-1 gap-4"><div className="h-64 bg-slate-100 rounded-3xl animate-pulse"></div></div>;
  }

  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8 animate-in fade-in duration-300">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
              <Briefcase className="text-white" size={24} />
            </div>
            Domain Broker Offers
          </h2>
          <p className="text-slate-500 text-sm mt-1 ml-14">Review, accept, or reject custom price offers for premium domains</p>
        </div>
        <div className="flex items-center w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              placeholder="Search domains or customer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredOffers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-slate-50/50">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6">
              <Globe size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No Offers Found</h3>
            <p className="text-slate-500 max-w-sm mx-auto">There are no pending domain offers matching your criteria right now.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-5">Domain Requested</th>
                  <th className="p-5">Offer Amount</th>
                  <th className="p-5">Customer Info</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Date</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOffers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(offer => (
                  <tr key={offer.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm shrink-0 border border-indigo-100">
                          <Globe size={18} />
                        </div>
                        <p className="font-bold text-slate-800 text-base">{offer.domain}</p>
                      </div>
                    </td>
                    <td className="p-5">
                      <p className="font-black text-emerald-600 text-lg">{formatCurrency(offer.amount)}</p>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col gap-1.5">
                        <a href={`mailto:${offer.email}`} className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors">
                          <Mail size={14} className="text-slate-400" /> {offer.email}
                        </a>
                        <a href={`tel:${offer.phone}`} className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors">
                          <Phone size={14} className="text-slate-400" /> {offer.phone}
                        </a>
                      </div>
                    </td>
                    <td className="p-5">{getStatusBadge(offer.status)}</td>
                    <td className="p-5 text-sm font-medium text-slate-600">
                      {new Date(offer.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {offer.status === 'pending' && (
                          <>
                            <button onClick={() => updateStatus(offer.id, 'accepted')} title="Accept Offer" className="px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-sm border border-emerald-100 flex items-center gap-1.5">
                              <CheckCircle size={14} /> Accept
                            </button>
                            <button onClick={() => updateStatus(offer.id, 'rejected')} title="Reject Offer" className="px-3 py-2 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-sm border border-amber-100 flex items-center gap-1.5">
                              <XCircle size={14} /> Reject
                            </button>
                          </>
                        )}
                        <button onClick={() => deleteOffer(offer.id)} title="Delete Record" className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredOffers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      </div>
    </div>
  );
}
