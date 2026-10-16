import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Loader2, Search, Medal, User } from 'lucide-react';

export const LoyaltyPointsReport: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const q = query(collection(db, 'customers'), where('loyaltyPoints', '>', 0), orderBy('loyaltyPoints', 'desc'), limit(500));
      const snap = await getDocs(q);
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.phone?.includes(search)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
            <Medal size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Loyalty Points Report</h2>
            <p className="text-sm text-slate-500">View customer loyalty points and balances.</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-bold border-b border-slate-200">Customer Name</th>
              <th className="p-4 font-bold border-b border-slate-200">Phone Number</th>
              <th className="p-4 font-bold border-b border-slate-200 text-right">Loyalty Points</th>
              <th className="p-4 font-bold border-b border-slate-200 text-right">Equivalent Value (Tk)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  No customers found with loyalty points.
                </td>
              </tr>
            ) : (
              filtered.map((c, idx) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <User size={16} />
                      </div>
                      <span className="font-bold text-slate-700">{c.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{c.phone || 'N/A'}</td>
                  <td className="p-4 text-right">
                    <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-bold">
                      {c.loyaltyPoints} PTS
                    </span>
                  </td>
                  <td className="p-4 text-right font-black text-slate-800">
                    ৳{(Math.floor((Number(c.loyaltyPoints) || 0) / 100) * 40).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
