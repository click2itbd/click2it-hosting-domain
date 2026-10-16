import React, { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, addDoc, doc, updateDoc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../../../context/SettingsContext';
import { formatCurrency } from '../../../../lib/utils';
import { Search, CreditCard, X, Check, Trash2 } from 'lucide-react';
import { generatePDF } from '../../../../lib/pdf';
import { Customer, Transaction, PaymentAccount } from '../../../../types';

import { where } from 'firebase/firestore';
import { useAuth } from '../../../../context/AuthContext';
import { logAudit } from '../../../../lib/audit';

export default function CustomerDueList() {
  const { profile, user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string, name: string, due: number } | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<{ id: string, name: string } | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState<number | ''>('');
  const [editDate, setEditDate] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Opening Balance state
  const [showOpeningBalForm, setShowOpeningBalForm] = useState(false);
  const [obAmount, setObAmount] = useState<number | ''>('');
  const [obDate, setObDate] = useState('2026-01-01');
  const [obDescription, setObDescription] = useState('Previous outstanding balance');
  const [obSubmitting, setObSubmitting] = useState(false);

  const { settings } = useSettings();

  
  const handleViewInvoice = async (documentNumber: string) => {
    try {
      const q = query(collection(db, 'orders'), where('documentNumber', '==', documentNumber));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const order = { id: snap.docs[0].id, ...snap.docs[0].data() };
        generatePDF(order as any, 'invoice', settings);
        return;
      }

      // Check by direct order ID
      const orderDocSnap = await getDoc(doc(db, 'orders', documentNumber));
      if (orderDocSnap.exists()) {
        const order = { id: orderDocSnap.id, ...orderDocSnap.data() };
        generatePDF(order as any, 'invoice', settings);
        return;
      }

      toast.error('Invoice not found');
    } catch (e) {
      console.error('Failed to view invoice:', e);
      toast.error('Failed to view invoice');
    }
  };
  const fetchData = async () => {
    try {
      setLoading(true);
      const [custSnap, txSnap, accSnap, ordSnap] = await Promise.all([
        getDocs(collection(db, 'customers')),
        getDocs(query(collection(db, 'transactions'), orderBy('date', 'desc'))),
        getDocs(collection(db, 'payment_accounts')),
        getDocs(collection(db, 'orders'))
      ]);

      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));

      const existingOrderIds = new Set(ordSnap.docs.map(d => d.id));
      const existingDocNumbers = new Set(ordSnap.docs.map(d => d.data().documentNumber).filter(Boolean));

      // Auto-detect and prune orphan transactions from previously deleted orders
      const orphanTxRefs: any[] = [];
      const validTxList: Transaction[] = [];

      txSnap.docs.forEach(d => {
        const t = { id: d.id, ...d.data() } as Transaction;
        
        // Sale transaction without an active order
        const isOrphanSale = t.type === 'sale' && (
          (t.referenceId && !existingOrderIds.has(t.referenceId) && (!t.documentNumber || !existingDocNumbers.has(t.documentNumber))) ||
          (!t.referenceId && t.documentNumber && !existingDocNumbers.has(t.documentNumber))
        );

        // Payment specifically linked to an order that no longer exists
        const isOrphanOrderPayment = t.type === 'payment_received' && 
          t.referenceId && !t.referenceId.startsWith('REC-') && 
          !existingOrderIds.has(t.referenceId) && 
          (!t.documentNumber || !existingDocNumbers.has(t.documentNumber));

        if (isOrphanSale || isOrphanOrderPayment) {
          orphanTxRefs.push(d.ref);
        } else {
          validTxList.push(t);
        }
      });

      if (orphanTxRefs.length > 0) {
        Promise.all(orphanTxRefs.map(ref => deleteDoc(ref))).catch(e => console.error('Error cleaning orphan transactions:', e));
      }

      setTransactions(validTxList);
      
      const allAccs = accSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentAccount));
      setPaymentAccounts(allAccs);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate dues
  // A positive balance indicates the customer owes us money (Due)
  const calculateDues = () => {
    const balances: Record<string, number> = {};
    
    transactions.forEach(t => {
      const isCustomerTx = t.entityType === 'customer' || (!t.entityType && (t.type === 'sale_return' || t.type === 'return'));
      if (isCustomerTx && t.entityId) {
        if (!balances[t.entityId]) balances[t.entityId] = 0;
        
        if (t.type === 'sale' || t.type === 'opening_balance') {
          balances[t.entityId] += Number(t.amount);
        } else if (t.type === 'payment_received' || t.type === 'return' || t.type === 'sale_return' || t.type === 'money_receipt') {
          balances[t.entityId] -= Number(t.amount);
        }
      }
    });

    const dueList = customers
      .map(c => ({
        ...c,
        due: balances[c.id] || 0
      }))
      .filter(c => showAll ? true : c.due > 0)
      .sort((a, b) => b.due - a.due);

    return dueList;
  };

  const dueCustomers = calculateDues().filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  const totalOverallDue = dueCustomers.reduce((acc, curr) => acc + curr.due, 0);

  
  const handleDeleteTransaction = async (txId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this transaction? This will alter the ledger balance.")) return;
    try {
      await deleteDoc(doc(db, 'transactions', txId));
      await logAudit(
        'DELETE',
        'Payment',
        `Deleted transaction #${txId.slice(0, 8)} from ledger for customer "${historyCustomer?.name || 'Customer'}"`,
        profile?.displayName || user?.displayName || user?.email || 'Admin',
        { entityId: txId }
      );
      toast.success('Transaction deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const handleAddOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyCustomer || !obAmount || Number(obAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      setObSubmitting(true);
      await addDoc(collection(db, 'transactions'), {
        type: 'opening_balance',
        entityId: historyCustomer.id,
        entityName: historyCustomer.name,
        entityType: 'customer',
        amount: Number(obAmount),
        date: new Date(obDate).toISOString(),
        description: obDescription || 'Previous outstanding balance',
        paymentMethod: 'n/a',
        createdAt: new Date().toISOString(),
      });
      await logAudit(
        'CREATE',
        'Payment',
        `Added opening balance of ৳${obAmount} for customer "${historyCustomer.name}"`,
        profile?.displayName || user?.displayName || user?.email || 'Admin',
        { entityId: historyCustomer.id }
      );
      toast.success('Opening balance added');
      setShowOpeningBalForm(false);
      setObAmount('');
      setObDescription('Previous outstanding balance');
      fetchData();
    } catch (error) {
      console.error('Error adding opening balance:', error);
      toast.error('Failed to add opening balance');
    } finally {
      setObSubmitting(false);
    }
  };

  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTx || !editAmount) return;
    try {
      await updateDoc(doc(db, 'transactions', editTx.id), {
        amount: Number(editAmount),
        date: new Date(editDate).toISOString(),
      });
      toast.success('Transaction updated');
      setEditTx(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update transaction');
    }
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!paymentAccountId) {
      toast.error('Select a payment account');
      return;
    }

    try {
      setSubmitting(true);
      const acc = paymentAccounts.find(a => a.id === paymentAccountId);
      
      const txData = {
        type: 'payment_received',
        amount: Number(paymentAmount),
        date: new Date().toISOString(),
        description: paymentNotes || 'Received customer due payment',
        entityId: selectedCustomer.id,
        entityName: selectedCustomer.name,
        entityType: 'customer',
        paymentAccountId: paymentAccountId,
        paymentMethod: acc?.type || 'cash',
        createdAt: new Date().toISOString(),
        previousDue: selectedCustomer.due,
        currentBalance: selectedCustomer.due - Number(paymentAmount)
      };

      const txRef = await addDoc(collection(db, 'transactions'), txData);
      
      // Generate PDF receipt immediately
      const savedTx = { id: txRef.id, referenceId: `REC-${Date.now().toString().slice(-6)}`, ...txData, _autoPrint: true };
      try {
        generatePDF(savedTx as any, 'receipt', settings);
      } catch (err) {
        console.error('Failed to generate receipt PDF', err);
      }

      await logAudit(
        'CREATE',
        'Payment',
        `Received customer due payment of ৳${paymentAmount} from "${selectedCustomer.name}" (${acc?.type || 'cash'})`,
        profile?.displayName || user?.displayName || user?.email || 'Admin',
        {
          entityId: selectedCustomer.id,
          newState: {
            amount: Number(paymentAmount),
            previousDue: selectedCustomer.due,
            newDue: selectedCustomer.due - Number(paymentAmount)
          }
        }
      );

      // Automatically sync payment to customer's unpaid invoice orders
      try {
        let remPay = Number(paymentAmount);
        const ordSnap = await getDocs(query(
          collection(db, 'orders'),
          where('customerId', '==', selectedCustomer.id),
          where('type', '==', 'invoice')
        ));
        const unpaidOrders = ordSnap.docs
          .map(d => ({ id: d.id, ...d.data() as any }))
          .filter(o => o.paymentStatus !== 'paid' && ((Number(o.total) || 0) > (Number(o.paidAmount) || 0)))
          .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

        for (const ord of unpaidOrders) {
          if (remPay <= 0) break;
          const dueOnOrder = (Number(ord.total) || 0) - (Number(ord.paidAmount) || 0);
          const payAmt = Math.min(remPay, dueOnOrder);
          const updatedPaid = (Number(ord.paidAmount) || 0) + payAmt;
          const updatedStatus = updatedPaid >= (Number(ord.total) || 0) ? 'paid' : 'partial';
          await updateDoc(doc(db, 'orders', ord.id), {
            paidAmount: updatedPaid,
            paymentStatus: updatedStatus
          });
          remPay -= payAmt;
        }
      } catch (err) {
        console.warn('Failed to sync order payment status:', err);
      }

      toast.success('Payment received successfully & Receipt generated');
      setSelectedCustomer(null);
      setPaymentAmount('');
      setPaymentAccountId('');
      setPaymentNotes('');
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="text-blue-600" /> Customer Due List
            </h2>
            <p className="text-sm text-gray-500 mt-1">Manage and collect outstanding payments from customers</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-100 flex flex-col items-end">
              <span className="text-xs font-bold uppercase">Total Due</span>
              <span className="text-lg font-black">{formatCurrency(totalOverallDue, settings)}</span>
            </div>
            <label className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={showAll}
                onChange={e => setShowAll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-600 font-medium">Show All</span>
            </label>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4 text-right">Due Amount</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                      Loading due list...
                    </div>
                  </td>
                </tr>
              ) : dueCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    <Check className="mx-auto text-green-500 mb-2" size={24} />
                    No pending dues found.
                  </td>
                </tr>
              ) : (
                dueCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4">{customer.phone || 'N/A'}</td>
                    <td className="px-6 py-4 text-right font-black text-red-600">
                      {formatCurrency(customer.due, settings)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setHistoryCustomer({ id: customer.id, name: customer.name })}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                          History
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCustomer({ id: customer.id, name: customer.name, due: customer.due });
                            setPaymentAmount(customer.due);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                          Receive Payment
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">Receive Due Payment</h3>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleReceivePayment} className="p-6 overflow-y-auto space-y-4">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-lg border border-blue-100 mb-2">
                <div className="text-xs font-bold uppercase text-blue-600 mb-1">Customer</div>
                <div className="font-black text-lg">{selectedCustomer.name}</div>
                <div className="text-sm mt-1 flex justify-between">
                  <span>Current Due:</span>
                  <span className="font-bold text-red-600">{formatCurrency(selectedCustomer.due, settings)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Payment Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={selectedCustomer.due}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg p-3 font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Receive In Account
                </label>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  required
                >
                  <option value="">-- Select Account --</option>
                  {paymentAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Notes / Reference (Optional)
                </label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g., Paid via Bkash / Cash memo #..."
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || !paymentAmount || !paymentAccountId}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? 'Processing...' : 'Confirm Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyCustomer && (() => {
        // Reverse so oldest is first for running balance calculation
        let runningBalance = 0;
        let totalDebit = 0;
        let totalCredit = 0;
        
        const allEntityTx = [...transactions]
          .filter(t => t.entityId === historyCustomer.id)
          .reverse()
          .map(t => {
            const isDebit = t.type === 'sale' || t.type === 'opening_balance';
            const isCredit = t.type === 'payment_received' || t.type === 'deposit' || t.type === 'return' || t.type === 'sale_return' || t.type === 'money_receipt';
            const amt = Number(t.amount) || 0;
            return { ...t, isDebit, isCredit, amt };
          });

        let openingBalance = 0;
        
        const filteredTx = allEntityTx.filter(t => {
            if (fromDate && new Date(t.date) < new Date(fromDate)) {
                if (t.isDebit) openingBalance += t.amt;
                if (t.isCredit) openingBalance -= t.amt;
                return false;
            }
            if (toDate && new Date(t.date) > new Date(toDate + 'T23:59:59')) {
                return false;
            }
            return true;
        });

        runningBalance = openingBalance;
        
        const customerTx = filteredTx.map(t => {
            if (t.isDebit) {
                runningBalance += t.amt;
                totalDebit += t.amt;
            }
            if (t.isCredit) {
                runningBalance -= t.amt;
                totalCredit += t.amt;
            }
            return { ...t, runningBalance };
        });

        const closingBalance = runningBalance;

        return (

          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

              {/* ── Modal Header ── */}
              <div className="bg-[#081621] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-xl font-black tracking-tight">{historyCustomer.name}</h2>
                  <span className="inline-block mt-1 text-[11px] font-semibold bg-white/10 text-blue-200 px-2.5 py-0.5 rounded-full tracking-wide">Customer Account</span>
                </div>
                <button
                  onClick={() => setHistoryCustomer(null)}
                  className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* ── Filter + Action Bar ── */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex flex-wrap items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">From Date</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                  <span className="text-gray-300 mt-4">—</span>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">To Date</label>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                  {(fromDate || toDate) && (
                    <button
                      onClick={() => { setFromDate(''); setToDate(''); }}
                      className="mt-4 text-xs text-gray-400 hover:text-red-500 transition-colors"
                      title="Clear filters"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setShowOpeningBalForm(v => !v); setObAmount(''); setObDescription('Previous outstanding balance'); }}
                  className="flex-shrink-0 mt-0 inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg transition-colors shadow-sm"
                >
                  + Opening Balance
                </button>
              </div>

              {/* ── Summary Cards ── */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-gray-200 border-b border-gray-200 flex-shrink-0">
                <div className="bg-white px-4 py-3 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total Debit</span>
                  <span className="text-base font-black text-red-600">{formatCurrency(totalDebit, settings)}</span>
                </div>
                <div className="bg-white px-4 py-3 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Total Credit</span>
                  <span className="text-base font-black text-green-600">{formatCurrency(totalCredit, settings)}</span>
                </div>
                <div className="bg-white px-4 py-3 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Opening Bal.</span>
                  <span className="text-base font-black text-gray-600">{formatCurrency(openingBalance, settings)}</span>
                </div>
                <div className="bg-white px-4 py-3 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Closing Bal.</span>
                  <span className="text-base font-black text-violet-600">{formatCurrency(closingBalance, settings)}</span>
                </div>
                <div className={`px-4 py-3 flex flex-col gap-0.5 ${runningBalance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Net Due</span>
                  <span className={`text-base font-black ${runningBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(Math.max(0, runningBalance), settings)}</span>
                </div>
              </div>

              {/* ── Opening Balance Form (inline panel) ── */}
              {showOpeningBalForm && (
                <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-4 flex-shrink-0">
                  <p className="text-xs font-bold text-indigo-600 uppercase mb-3 tracking-wide">Add Opening Balance</p>
                  <form onSubmit={handleAddOpeningBalance} className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Amount</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={obAmount}
                        onChange={e => setObAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="0.00"
                        className="border border-indigo-200 rounded-lg p-2 w-36 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Date</label>
                      <input
                        type="date"
                        value={obDate}
                        onChange={e => setObDate(e.target.value)}
                        className="border border-indigo-200 rounded-lg p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                        required
                      />
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Description</label>
                      <input
                        type="text"
                        value={obDescription}
                        onChange={e => setObDescription(e.target.value)}
                        className="border border-indigo-200 rounded-lg p-2 w-full text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={obSubmitting || !obAmount}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                      >
                        {obSubmitting ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowOpeningBalForm(false)}
                        className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── Transaction Table ── */}
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Date</th>
                      <th className="px-5 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Description</th>
                      <th className="px-5 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide text-right">Debit</th>
                      <th className="px-5 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide text-right">Credit</th>
                      <th className="px-5 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerTx.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-gray-400 italic text-sm">No transactions found for the selected period.</td>
                      </tr>
                    ) : (
                      [...customerTx].reverse().map((t, idx) => (
                        <tr key={t.id} className={`border-b border-gray-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/40`}>
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                            <div className="font-medium text-gray-700 text-xs">{new Date(t.date).toLocaleDateString()}</div>
                            <div className="text-[11px] text-gray-400">{new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </td>
                          <td className="px-5 py-3 text-gray-800 font-medium">
                            {t.description}
                            {t.type === 'opening_balance' && (
                              <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 font-bold">OPENING BAL</span>
                            )}
                            {t.documentNumber && (
                              <span
                                onClick={(e) => { e.stopPropagation(); handleViewInvoice(t.documentNumber); }}
                                className="ml-2 cursor-pointer hover:bg-blue-100 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 font-semibold"
                              >
                                #{t.documentNumber}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-semibold text-red-600 text-sm">
                            {t.isDebit ? formatCurrency(t.amt, settings) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-semibold text-green-600 text-sm">
                            {t.isCredit ? formatCurrency(t.amt, settings) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className={`font-mono font-bold text-sm ${t.runningBalance > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                                {formatCurrency(Math.max(0, t.runningBalance), settings)}
                              </span>
                              {(t.type === 'payment_received' || t.type === 'payment_made' || t.type === 'opening_balance' || t.type === 'sale') && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => { setEditTx(t); setEditAmount(t.amt); setEditDate(t.date.slice(0, 16)); }}
                                    className="text-[11px] bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-medium transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTransaction(t.id)}
                                    className="text-[11px] bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded text-red-500 font-medium transition-colors"
                                  >
                                    Del
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Footer ── */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-end gap-3 flex-shrink-0">
                <button
                  onClick={() => {
                    const msg = `Dear ${historyCustomer.name}, your current due is ${formatCurrency(closingBalance, settings)}. Please clear the due as soon as possible.`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
                >
                  📲 WhatsApp
                </button>
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return;
                    const html = `
                      <html>
                        <head>
                          <title>Ledger - ${historyCustomer.name}</title>
                          <style>
                            body { font-family: sans-serif; padding: 20px; color: #333; }
                            h1 { font-size: 20px; margin-bottom: 5px; }
                            .summary { display: flex; gap: 20px; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                            .summary div { font-size: 14px; }
                            table { width: 100%; border-collapse: collapse; font-size: 12px; }
                            th, td { padding: 8px; border-bottom: 1px solid #eee; text-align: left; }
                            th { background-color: #f9fafb; font-weight: bold; }
                            .text-right { text-align: right; }
                            .text-red { color: #dc2626; }
                            .text-green { color: #16a34a; }
                            .text-blue { color: #2563eb; }
                            .text-gray { color: #6b7280; }
                          </style>
                        </head>
                        <body>
                          <h1>Ledger History: ${historyCustomer.name}</h1>
                          <div class="summary">
                            <div><strong>Total Debit:</strong> <span class="text-red">${formatCurrency(totalDebit, settings)}</span></div>
                            <div><strong>Total Credit:</strong> <span class="text-green">${formatCurrency(totalCredit, settings)}</span></div>
                            <div><strong>Opening Balance:</strong> ${formatCurrency(openingBalance, settings)}</div>
                            <div><strong>Closing Balance:</strong> ${formatCurrency(closingBalance, settings)}</div>
                            <div><strong>Net Due:</strong> <span class="text-blue">${formatCurrency(Math.max(0, runningBalance), settings)}</span></div>
                          </div>
                          <table>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th class="text-right">Debit</th>
                                <th class="text-right">Credit</th>
                                <th class="text-right">Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${[...customerTx].reverse().map(t => `
                                <tr>
                                  <td>${new Date(t.date).toLocaleDateString()} ${new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                  <td>${t.description} ${t.documentNumber ? `(#${t.documentNumber})` : ''}</td>
                                  <td class="text-right text-red">${t.isDebit ? formatCurrency(t.amt, settings) : '-'}</td>
                                  <td class="text-right text-green">${t.isCredit ? formatCurrency(t.amt, settings) : '-'}</td>
                                  <td class="text-right font-bold text-blue">${formatCurrency(Math.max(0, t.runningBalance), settings)}</td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>
                          <div style="margin-top: 30px; font-size: 10px; text-align: center; color: #888;">
                            Generated on ${new Date().toLocaleString()}
                          </div>
                          <script>
                            window.onload = function() { window.print(); window.close(); }
                          </script>
                        </body>
                      </html>
                    `;
                    printWindow.document.write(html);
                    printWindow.document.close();
                  }}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
                >
                  🖨 Print Ledger
                </button>
                <button
                  onClick={() => setHistoryCustomer(null)}
                  className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Edit Tx Modal */}
      {editTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">Edit Payment</h3>
              <button onClick={() => setEditTx(null)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount</label>
                <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border border-gray-200 rounded-lg p-3" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                <input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full border border-gray-200 rounded-lg p-3" required />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold">Update Payment</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
