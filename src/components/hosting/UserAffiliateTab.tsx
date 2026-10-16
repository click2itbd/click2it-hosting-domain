import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { DollarSign, Copy, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils';

export function UserAffiliateTab() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'affiliate_commissions'), where('affiliateId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setCommissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const affiliateLink = window.location.origin + '?ref=' + user?.uid;

  const copyLink = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    toast.success('Affiliate link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayout = async () => {
    const available = commissions.filter(c => c.status === 'available').reduce((sum, c) => sum + c.commissionAmount, 0);
    if (available < 1000) {
      toast.error('Minimum payout is ৳1000');
      return;
    }
    try {
      await addDoc(collection(db, 'payout_requests'), {
        userId: user?.uid,
        userEmail: user?.email,
        amount: available,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success('Payout request submitted!');
    } catch (error) {
      toast.error('Failed to submit payout request');
    }
  };

  const pendingEarn = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commissionAmount, 0);
  const availableEarn = commissions.filter(c => c.status === 'available').reduce((sum, c) => sum + c.commissionAmount, 0);
  const paidEarn = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commissionAmount, 0);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><TrendingUp size={24}/></div>
          <div><p className="text-sm text-gray-500">Available to Withdraw</p><h3 className="text-2xl font-bold text-gray-800">{formatCurrency(availableEarn)}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center"><AlertCircle size={24}/></div>
          <div><p className="text-sm text-gray-500">Pending (30 days lock)</p><h3 className="text-2xl font-bold text-gray-800">{formatCurrency(pendingEarn)}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center"><CheckCircle size={24}/></div>
          <div><p className="text-sm text-gray-500">Total Paid Out</p><h3 className="text-2xl font-bold text-gray-800">{formatCurrency(paidEarn)}</h3></div>
        </div>
      </div>

      {/* Link Generator */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Your Affiliate Link</h3>
        <p className="text-gray-500 text-sm mb-4">Share this link to earn 10% commission on all domain and hosting purchases.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" readOnly value={affiliateLink} className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 outline-none" />
          <button onClick={copyLink} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">
            {copied ? <CheckCircle size={18}/> : <Copy size={18}/>}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Request Payout */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800">Request Payout</h3>
          <p className="text-sm text-gray-500">Minimum payout amount is ৳1000.</p>
        </div>
        <button 
          onClick={handlePayout}
          disabled={availableEarn < 1000}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold transition-colors"
        >
          Withdraw {formatCurrency(availableEarn)}
        </button>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100"><h3 className="font-bold text-gray-800">Commission History</h3></div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {commissions.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">No commissions yet. Start sharing your link!</td></tr>
            ) : commissions.map(c => (
              <tr key={c.id}>
                <td className="px-6 py-4 text-sm">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-bold text-gray-800">{formatCurrency(c.commissionAmount)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${
                    c.status === 'available' ? 'bg-blue-100 text-blue-700' :
                    c.status === 'paid' ? 'bg-green-100 text-green-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
