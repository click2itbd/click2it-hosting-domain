import React, { useState, useEffect } from 'react';
import { Wallet, PlusCircle, History, Clock, ArrowDownLeft, ArrowUpRight, AlertCircle, X, Copy, Check, RefreshCw } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { toast } from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../utils/errorUtils';
import { Spinner } from '../pages/hosting-dashboard/components/SharedUI';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { collection, doc, getDoc, getDocs, setDoc, query, where, orderBy, limit } from 'firebase/firestore';

export function CustomerWalletTab() {
  const { user, effectiveUser, impersonatedCustomer } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedNumber, setCopiedNumber] = useState<boolean>(false);

  // Deposit Modal state
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositMethod, setDepositMethod] = useState<'manual_bkash' | 'nagad' | 'bank_transfer'>('manual_bkash');
  const [transactionId, setTransactionId] = useState<string>('');
  const [depositNotes, setDepositNotes] = useState<string>('');
  const [submittingDeposit, setSubmittingDeposit] = useState<boolean>(false);

  const targetUid = impersonatedCustomer?.uid || effectiveUser?.uid || auth.currentUser?.uid;

  const fetchWallet = async () => {
    setLoading(true);

    // If viewing as impersonated customer, fetch direct from Firestore for that customer
    if (impersonatedCustomer && targetUid) {
      try {
        const userDocSnap = await getDoc(doc(db, 'users', targetUid));
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setBalance(typeof userData?.balance === 'number' ? userData.balance : 0);
        }
        const txQ = query(collection(db, 'wallet_transactions'), where('userId', '==', targetUid), limit(50));
        const txSnap = await getDocs(txQ);
        const txList = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        txList.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setTransactions(txList);

        const depQ = query(collection(db, 'deposit_requests'), where('userId', '==', targetUid), limit(50));
        const depSnap = await getDocs(depQ);
        const depList = depSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        depList.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setDeposits(depList);
        setLoading(false);
        return;
      } catch (fErr) {
        console.warn('Direct impersonated customer wallet fetch error:', fErr);
      }
    }

    try {
      // 1. Try API
      const res = await apiClient.get('/api/customers/me/wallet');
      if (res.data?.success) {
        setBalance(typeof res.data.balance === 'number' ? res.data.balance : 0);
        setTransactions(res.data.transactions || []);
        setDeposits(res.data.deposits || []);
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn('API wallet fetch failed, attempting direct Firestore fallback:', err);
    }

    // 2. Direct Firestore fallback if user is authenticated
    if (targetUid) {
      try {
        const userDocSnap = await getDoc(doc(db, 'users', targetUid));
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setBalance(typeof userData?.balance === 'number' ? userData.balance : 0);
        }

        // Transactions
        try {
          const txQ = query(
            collection(db, 'wallet_transactions'),
            where('userId', '==', targetUid),
            orderBy('createdAt', 'desc'),
            limit(50)
          );
          const txSnap = await getDocs(txQ);
          setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.warn('Direct tx fallback query skipped orderBy:', e);
          const txQ = query(collection(db, 'wallet_transactions'), where('userId', '==', targetUid), limit(50));
          const txSnap = await getDocs(txQ);
          setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }

        // Deposit requests
        try {
          const depQ = query(
            collection(db, 'deposit_requests'),
            where('userId', '==', targetUid),
            orderBy('createdAt', 'desc'),
            limit(20)
          );
          const depSnap = await getDocs(depQ);
          setDeposits(depSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch {
          const depQ = query(collection(db, 'deposit_requests'), where('userId', '==', targetUid), limit(20));
          const depSnap = await getDocs(depQ);
          setDeposits(depSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (fErr) {
        console.error('Firestore wallet fallback failed:', fErr);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(true);
    toast.success(`Copied ${num} to clipboard!`);
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(depositAmount);
    if (!numAmt || numAmt <= 0) {
      toast.error('Please enter a valid deposit amount (min ৳100)');
      return;
    }

    if (!transactionId.trim() || transactionId.trim().length < 3) {
      toast.error('Please enter the payment Transaction ID (TrxID)');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error('Please log in to submit a deposit request.');
      return;
    }

    setSubmittingDeposit(true);
    let success = false;

    // 1. Try backend API endpoint
    try {
      const res = await apiClient.post('/api/customers/deposit-request', {
        amount: numAmt,
        paymentMethod: depositMethod,
        transactionId: transactionId.trim(),
        notes: depositNotes.trim()
      });

      if (res.data?.success) {
        success = true;
      }
    } catch (err: any) {
      console.warn('API deposit submission failed, falling back to direct Firestore write:', err);
    }

    // 2. Direct Firestore fallback
    if (!success) {
      try {
        const now = new Date().toISOString();
        const depRef = doc(collection(db, 'deposit_requests'));
        const depositData = {
          id: depRef.id,
          userId: currentUser.uid,
          customerEmail: currentUser.email || '',
          customerName: currentUser.displayName || currentUser.email || 'Customer',
          amount: numAmt,
          paymentMethod: depositMethod,
          transactionId: transactionId.trim(),
          notes: depositNotes.trim(),
          status: 'pending',
          createdAt: now,
          updatedAt: now
        };
        await setDoc(depRef, depositData);
        success = true;
      } catch (fErr: any) {
        console.error('Direct Firestore deposit write failed:', fErr);
        toast.error(getFriendlyErrorMessage(fErr, 'Failed to submit deposit request. Please try again.'));
        setSubmittingDeposit(false);
        return;
      }
    }

    if (success) {
      toast.success('Deposit request submitted! Funds will be credited after payment verification.');
      setShowDepositModal(false);
      setDepositAmount('');
      setTransactionId('');
      setDepositNotes('');
      fetchWallet();
    }
    setSubmittingDeposit(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Wallet Balance Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Wallet size={120} />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Wallet size={16} /> Client Account Wallet
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1 flex items-baseline gap-2">
              ৳{balance.toLocaleString()} <span className="text-sm font-medium text-slate-400">BDT</span>
              <button 
                onClick={fetchWallet} 
                title="Refresh Wallet Balance"
                className="text-slate-400 hover:text-white transition-colors ml-2 p-1.5 rounded-lg hover:bg-white/10"
              >
                <RefreshCw size={16} className={loading ? "animate-spin text-emerald-400" : ""} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 max-w-md">
              Use your prepaid balance for instant 1-click domain registration, domain renewals, and web hosting invoices.
            </p>
          </div>

          <button
            onClick={() => setShowDepositModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 flex items-center gap-2 text-xs uppercase tracking-wider"
          >
            <PlusCircle size={18} /> Top Up Wallet Funds
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Transaction History (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <History size={18} className="text-blue-600" /> Wallet Transactions
            </h3>
            <span className="text-xs text-slate-500 font-semibold">{transactions.length} Records</span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Spinner />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              No wallet transactions found. Top up your funds above to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Reason / Order</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-bold">
                        {tx.type === 'credit' ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <ArrowDownLeft size={14} /> Credit
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-1">
                            <ArrowUpRight size={14} /> Debit
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 max-w-[220px] truncate" title={tx.reason}>
                        {tx.reason || 'Account Balance Adjustment'}
                      </td>
                      <td className="py-3 px-4 text-right font-black">
                        <span className={tx.type === 'credit' ? "text-emerald-600" : "text-rose-600"}>
                          {tx.type === 'credit' ? '+' : '-'}৳{Number(tx.amount || 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Deposit Requests List (1 col) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Clock size={18} className="text-amber-500" /> Pending Top-Ups
            </h3>
            <span className="text-xs text-slate-500 font-semibold">{deposits.length} Records</span>
          </div>

          {deposits.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">
              No recent deposit requests.
            </div>
          ) : (
            <div className="space-y-3">
              {deposits.map(dep => (
                <div key={dep.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-blue-600">{dep.transactionId}</span>
                    <span className={
                      dep.status === 'approved' ? "text-emerald-600 bg-emerald-50 text-[10px] font-bold px-2 py-0.5 rounded" :
                      dep.status === 'rejected' ? "text-rose-600 bg-rose-50 text-[10px] font-bold px-2 py-0.5 rounded" :
                      "text-amber-600 bg-amber-50 text-[10px] font-bold px-2 py-0.5 rounded"
                    }>
                      {dep.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium uppercase">{dep.paymentMethod || 'bKash'}</span>
                    <span className="font-black text-slate-800">৳{Number(dep.amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* TOP UP FUNDS MODAL */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden p-6 space-y-5">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <PlusCircle size={20} className="text-emerald-600" /> Top Up Account Wallet
                </h3>
                <p className="text-xs text-slate-500 font-medium">Add funds via bKash, Nagad, or Bank Transfer</p>
              </div>
              <button
                onClick={() => setShowDepositModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* bKash instructions card */}
            <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-pink-900 flex justify-between items-center">
                <span>bKash Personal Number:</span>
                <button
                  type="button"
                  onClick={() => handleCopyNumber('01727666677')}
                  className="font-mono text-sm font-black text-pink-600 flex items-center gap-1.5 hover:text-pink-800 transition-colors"
                >
                  01727666677 {copiedNumber ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-[11px] text-pink-800 leading-relaxed">
                Send payment to the bKash personal number above using "Send Money" or "Make Payment". Enter the Transaction ID (TrxID) below.
              </p>
            </div>

            <form onSubmit={handleSubmitDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Deposit Amount (BDT)</label>
                <input
                  type="number"
                  min="100"
                  required
                  placeholder="e.g. 1500"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Method</label>
                <select
                  value={depositMethod}
                  onChange={(e: any) => setDepositMethod(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="manual_bkash">bKash Personal / Merchant</option>
                  <option value="nagad">Nagad Personal</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Transaction ID (TrxID)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BKS19283746"
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-blue-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notes / Sender Phone (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Sent from 01711223344"
                  value={depositNotes}
                  onChange={e => setDepositNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDeposit}
                  className="px-6 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-600 shadow-md transition-all flex items-center gap-2"
                >
                  {submittingDeposit ? <Spinner /> : <PlusCircle size={16} />} Submit Deposit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
