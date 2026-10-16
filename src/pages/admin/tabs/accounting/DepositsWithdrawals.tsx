import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { PaymentAccount, Transaction } from '../../../../types';
import { formatCurrency, cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Search,
  Download,
  Printer,
  Calendar,
  Building,
  DollarSign,
  Trash2,
  CheckCircle2,
  X,
  RefreshCw,
} from 'lucide-react';
import { Pagination } from '../../../../components/common/Pagination';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DepositsWithdrawalsProps {
  setSelectedLedgerEntity?: (v: { id: string; name: string; type: 'customer' | 'vendor' } | null) => void;
  setActiveTab?: (tab: string) => void;
}

type ActionType = 'transfer' | 'deposit' | 'withdrawal';

const DepositsWithdrawals: React.FC<DepositsWithdrawalsProps> = () => {
  const { hasPermission, isAdmin } = useAuth();
  const { settings } = useSettings();

  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('transfer');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fromAccountId: '',
    toAccountId: '',
    accountId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    entityName: '',
    reference: '',
    note: '',
  });

  // Table Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'transfer' | 'deposit' | 'withdrawal'>('all');
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accSnap, txSnap] = await Promise.all([
        getDocs(query(collection(db, 'payment_accounts'), orderBy('name'))),
        getDocs(query(collection(db, 'transactions'), orderBy('date', 'desc'))),
      ]);

      const accounts = accSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentAccount));
      setPaymentAccounts(accounts);
      
      const mappedTx = txSnap.docs.map(d => {
        const data = d.data();
        let type = data.type;
        if (data.category === 'Capital / Fund Deposit') type = 'deposit';
        if (data.category === 'Owner Withdrawal / Drawing') type = 'withdrawal';
        if (data.category === 'Fund Transfer') {
          type = data.type === 'expense' ? 'transfer_out' : 'transfer_in';
        }
        return { id: d.id, ...data, type } as Transaction;
      });
      setTransactions(mappedTx);

      if (accounts.length > 0 && !formData.fromAccountId) {
        setFormData(prev => ({
          ...prev,
          fromAccountId: accounts[0].id,
          toAccountId: accounts.length > 1 ? accounts[1].id : accounts[0].id,
          accountId: accounts[0].id,
        }));
      }
    } catch (err) {
      console.error('Error fetching deposits/withdrawals data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute live account balances
  const getAccountBalance = (accountId: string) => {
    const acc = paymentAccounts.find(a => a.id === accountId);
    if (!acc) return 0;
    const opening = Number(acc.openingBalance || 0);

    const accTx = transactions.filter(tx => {
      if (tx.paymentAccountId && tx.paymentAccountId === acc.id) return true;
      const pMethod = (tx.paymentMethod || '').toLowerCase();
      if (!pMethod) return false;
      const aType = (acc.type || '').toLowerCase();
      const aName = (acc.name || '').toLowerCase();
      return pMethod === aType || pMethod === aName || aName.includes(pMethod);
    });

    const inflow = accTx
      .filter(tx => ['sale', 'payment_received', 'money_receipt', 'income', 'purchase_return', 'deposit', 'transfer_in'].includes(tx.type))
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const outflow = accTx
      .filter(tx => ['purchase', 'payment_made', 'expense', 'salary', 'conveyance', 'sale_return', 'withdrawal', 'transfer_out'].includes(tx.type))
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    return opening + inflow - outflow;
  };

  // Submit Handler for Transfer / Deposit / Withdrawal
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      const createdAt = new Date().toISOString();
      const txDate = new Date(formData.date).toISOString();

      if (actionType === 'transfer') {
        if (formData.fromAccountId === formData.toAccountId) {
          toast.error('Source and Destination accounts must be different');
          setSubmitting(false);
          return;
        }

        const fromAcc = paymentAccounts.find(a => a.id === formData.fromAccountId);
        const toAcc = paymentAccounts.find(a => a.id === formData.toAccountId);

        const currentBal = getAccountBalance(formData.fromAccountId);
        if (formData.amount > currentBal) {
          const proceed = window.confirm(
            `Warning: Transfer amount (${formatCurrency(formData.amount, settings)}) exceeds the current balance (${formatCurrency(currentBal, settings)}) of ${fromAcc?.name}. Do you wish to continue?`
          );
          if (!proceed) {
            setSubmitting(false);
            return;
          }
        }

        const transferBatchId = `TRF-${Date.now()}`;

        // 1. Outflow record
        await addDoc(collection(db, 'transactions'), {
          date: txDate,
          amount: Number(formData.amount),
          type: 'expense',
          category: 'Fund Transfer',
          paymentAccountId: fromAcc?.id || '',
          paymentMethod: fromAcc?.type || fromAcc?.name || '',
          entityId: 'SYSTEM',
          entityName: 'Fund Transfer',
          description: `Transferred to ${toAcc?.name || 'Unknown'}${formData.note ? ` (${formData.note})` : ''}`,
          reference: formData.reference || transferBatchId,
          transferBatchId,
          createdAt,
        });

        // 2. Inflow record
        await addDoc(collection(db, 'transactions'), {
          date: txDate,
          amount: Number(formData.amount),
          type: 'money_receipt',
          category: 'Fund Transfer',
          paymentAccountId: toAcc?.id || '',
          paymentMethod: toAcc?.type || toAcc?.name || '',
          entityId: 'SYSTEM',
          entityName: 'Fund Transfer',
          description: `Transferred from ${fromAcc?.name || 'Unknown'}${formData.note ? ` (${formData.note})` : ''}`,
          reference: formData.reference || transferBatchId,
          transferBatchId,
          createdAt,
        });

        toast.success(`Successfully transferred ${formatCurrency(formData.amount, settings)} from ${fromAcc?.name} to ${toAcc?.name}`);
      } else if (actionType === 'deposit') {
        const acc = paymentAccounts.find(a => a.id === formData.accountId);
        await addDoc(collection(db, 'transactions'), {
          date: txDate,
          amount: Number(formData.amount),
          type: 'money_receipt',
          category: 'Capital / Fund Deposit',
          paymentAccountId: acc?.id || '',
          paymentMethod: acc?.type || acc?.name || '',
          entityId: 'SYSTEM',
          entityName: formData.entityName || 'Owner / Investor',
          description: `Deposit: ${formData.entityName || 'Capital Injection'}${formData.note ? ` (${formData.note})` : ''}`,
          reference: formData.reference || '',
          createdAt,
        });

        toast.success(`Capital deposit of ${formatCurrency(formData.amount, settings)} recorded in ${acc?.name}`);
      } else if (actionType === 'withdrawal') {
        const acc = paymentAccounts.find(a => a.id === formData.accountId);
        await addDoc(collection(db, 'transactions'), {
          date: txDate,
          amount: Number(formData.amount),
          type: 'expense',
          category: 'Owner Withdrawal / Drawing',
          paymentAccountId: acc?.id || '',
          paymentMethod: acc?.type || acc?.name || '',
          entityId: 'SYSTEM',
          entityName: formData.entityName || 'Owner / Partner',
          description: `Withdrawal: ${formData.entityName || 'Owner Drawings'}${formData.note ? ` (${formData.note})` : ''}`,
          reference: formData.reference || '',
          createdAt,
        });

        toast.success(`Withdrawal of ${formatCurrency(formData.amount, settings)} recorded from ${acc?.name}`);
      }

      setIsModalOpen(false);
      setFormData(prev => ({
        ...prev,
        amount: 0,
        entityName: '',
        reference: '',
        note: '',
      }));
      fetchData();
    } catch (err) {
      console.error('Error saving transaction:', err);
      toast.error('Failed to complete transaction');
    } finally {
      setSubmitting(false);
    }
  };

  // Void/Delete Transaction
  const handleDeleteTx = async (tx: Transaction) => {
    if (!window.confirm('Are you sure you want to delete/void this transaction?')) return;
    try {
      await deleteDoc(doc(db, 'transactions', tx.id));
      toast.success('Transaction voided successfully');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete transaction');
    }
  };

  // Filter transactions for table
  const relevantTransactions = transactions.filter(tx => {
    return ['transfer_in', 'transfer_out', 'deposit', 'withdrawal'].includes(tx.type);
  });

  const filteredTransactions = relevantTransactions.filter(tx => {
    const txDateStr = new Date(tx.date).toISOString().split('T')[0];
    const matchesDate = txDateStr >= startDate && txDateStr <= endDate;
    if (!matchesDate) return false;

    if (typeFilter !== 'all') {
      if (typeFilter === 'transfer' && !['transfer_in', 'transfer_out'].includes(tx.type)) return false;
      if (typeFilter === 'deposit' && tx.type !== 'deposit') return false;
      if (typeFilter === 'withdrawal' && tx.type !== 'withdrawal') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesDesc = (tx.description || '').toLowerCase().includes(q);
      const matchesEntity = (tx.entityName || '').toLowerCase().includes(q);
      const matchesRef = (tx.reference || '').toLowerCase().includes(q);
      const matchesType = (tx.type || '').toLowerCase().includes(q);
      if (!matchesDesc && !matchesEntity && !matchesRef && !matchesType) return false;
    }

    return true;
  });

  // Calculate Metrics
  const totalDeposits = relevantTransactions
    .filter(tx => tx.type === 'deposit')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const totalWithdrawals = relevantTransactions
    .filter(tx => tx.type === 'withdrawal')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const totalTransfers = relevantTransactions
    .filter(tx => tx.type === 'transfer_out')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  // Export to CSV
  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No records to export');
      return;
    }

    const headers = ['Date', 'Type', 'Account / Method', 'Party / Entity', 'Description', 'Reference', 'Amount (৳)'];
    const rows = filteredTransactions.map(tx => [
      new Date(tx.date).toLocaleDateString(),
      tx.type.replace('_', ' ').toUpperCase(),
      tx.paymentMethod || '-',
      `"${tx.entityName || ''}"`,
      `"${tx.description || ''}"`,
      tx.reference || '',
      tx.amount,
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Deposits_Withdrawals_${startDate}_to_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No records to export');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(settings?.siteName || 'Click2IT', 14, 18);
    doc.setFontSize(11);
    doc.text('Deposits, Withdrawals & Fund Transfer Journal', 14, 25);
    doc.setFontSize(9);
    doc.text(`Period: ${startDate} to ${endDate} | Total Records: ${filteredTransactions.length}`, 14, 31);

    const body = filteredTransactions.map(tx => [
      new Date(tx.date).toLocaleDateString(),
      tx.type.replace('_', ' ').toUpperCase(),
      tx.paymentMethod || '-',
      tx.entityName || '-',
      tx.description || '-',
      tx.reference || '-',
      formatCurrency(tx.amount, settings),
    ]);

    autoTable(doc, {
      startY: 36,
      head: [['Date', 'Type', 'Method', 'Party', 'Description', 'Ref', 'Amount']],
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [8, 22, 33] },
      styles: { fontSize: 7 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.text(`Total Deposits: ${formatCurrency(totalDeposits, settings)}`, 14, finalY);
    doc.text(`Total Withdrawals: ${formatCurrency(totalWithdrawals, settings)}`, 14, finalY + 5);
    doc.text(`Total Transferred: ${formatCurrency(totalTransfers, settings)}`, 14, finalY + 10);

    doc.save(`Deposits_Withdrawals_${startDate}_to_${endDate}.pdf`);
  };

  if (!hasPermission('manage_finances')) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden space-y-6">
      {/* Top Bar with Primary Actions */}
      <div className="p-6 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="text-[#EF4444]" /> Deposits, Withdrawals & Transfers
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Fund transfers between payment accounts, capital deposits, and owner drawings management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action Buttons */}
          <button
            onClick={() => { setActionType('transfer'); setIsModalOpen(true); }}
            className="bg-[#081621] hover:bg-[#EF4444] text-white px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowLeftRight size={14} /> Fund Transfer
          </button>
          <button
            onClick={() => { setActionType('deposit'); setIsModalOpen(true); }}
            className="bg-green-600 hover:bg-green-700 text-white px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowDownLeft size={14} /> Capital Deposit
          </button>
          <button
            onClick={() => { setActionType('withdrawal'); setIsModalOpen(true); }}
            className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <ArrowUpRight size={14} /> Owner Withdrawal
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50/70 border border-green-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Total Capital Deposits</span>
            <ArrowDownLeft size={16} className="text-green-600" />
          </div>
          <span className="text-xl font-black text-green-900 mt-1 block">
            {formatCurrency(totalDeposits, settings)}
          </span>
          <span className="text-[10px] text-green-600 mt-1 block">Injections & Partner Capital</span>
        </div>

        <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Total Withdrawals</span>
            <ArrowUpRight size={16} className="text-amber-600" />
          </div>
          <span className="text-xl font-black text-amber-900 mt-1 block">
            {formatCurrency(totalWithdrawals, settings)}
          </span>
          <span className="text-[10px] text-amber-600 mt-1 block">Owner Drawings & Profit Distribution</span>
        </div>

        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Total Internal Transfers</span>
            <ArrowLeftRight size={16} className="text-blue-600" />
          </div>
          <span className="text-xl font-black text-blue-900 mt-1 block">
            {formatCurrency(totalTransfers, settings)}
          </span>
          <span className="text-[10px] text-blue-600 mt-1 block">Bank ⇄ Cash Drawer ⇄ Mobile Banking</span>
        </div>
      </div>

      {/* Account Balances Quick Strip */}
      <div className="px-6">
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
            Current Account Available Balances
          </span>
          <div className="flex flex-wrap gap-2">
            {paymentAccounts.map(acc => {
              const bal = getAccountBalance(acc.id);
              return (
                <div key={acc.id} className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-xs">
                  <Building size={12} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-700">{acc.name}:</span>
                  <span className={cn("text-xs font-black", bal >= 0 ? "text-gray-900" : "text-red-600")}>
                    {formatCurrency(bal, settings)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Row: Dates, Type, Search */}
      <div className="px-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter Buttons */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                typeFilter === 'all' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              All
            </button>
            <button
              onClick={() => { setTypeFilter('transfer'); setCurrentPage(1); }}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                typeFilter === 'transfer' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Transfers
            </button>
            <button
              onClick={() => { setTypeFilter('deposit'); setCurrentPage(1); }}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                typeFilter === 'deposit' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Deposits
            </button>
            <button
              onClick={() => { setTypeFilter('withdrawal'); setCurrentPage(1); }}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                typeFilter === 'withdrawal' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Withdrawals
            </button>
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <label className="text-[10px] font-bold text-gray-500 uppercase">From</label>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="border-none bg-transparent text-xs font-bold text-gray-800 p-0 focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <label className="text-[10px] font-bold text-gray-500 uppercase">To</label>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="border-none bg-transparent text-xs font-bold text-gray-800 p-0 focus:ring-0"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-full md:w-60">
            <input
              type="text"
              placeholder="Search ref, account, note..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-100"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          </div>

          <button
            onClick={exportToCSV}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all"
            title="Export CSV"
          >
            <Download size={13} /> CSV
          </button>
          <button
            onClick={exportToPDF}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all"
            title="Export PDF"
          >
            <Printer size={13} /> PDF
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto border-t border-gray-100">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-200">
            <tr>
              <th className="px-6 py-3.5">Date</th>
              <th className="px-6 py-3.5">Type</th>
              <th className="px-6 py-3.5">Account / Method</th>
              <th className="px-6 py-3.5">Party / Reference</th>
              <th className="px-6 py-3.5">Description & Note</th>
              <th className="px-6 py-3.5 text-right">Amount (৳)</th>
              <th className="px-6 py-3.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading records...</td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                  No deposits, withdrawals, or transfer records found for the selected period.
                </td>
              </tr>
            ) : (
              filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((tx, idx) => (
                <tr key={tx.id || idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">
                    {new Date(tx.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      tx.type === 'deposit' || tx.type === 'transfer_in' ? "bg-green-100 text-green-800" :
                      tx.type === 'withdrawal' || tx.type === 'transfer_out' ? "bg-amber-100 text-amber-800" :
                      "bg-gray-100 text-gray-800"
                    )}>
                      {tx.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-bold text-gray-800 uppercase">
                    {tx.paymentMethod || '-'}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="font-bold text-gray-900 block">{tx.entityName || '-'}</span>
                    {tx.reference && <span className="text-[10px] font-mono text-gray-400">Ref: #{tx.reference}</span>}
                  </td>
                  <td className="px-6 py-3.5 font-medium text-gray-700">
                    {tx.description || '-'}
                  </td>
                  <td className={cn(
                    "px-6 py-3.5 text-right font-black text-sm",
                    tx.type === 'deposit' || tx.type === 'transfer_in' ? "text-green-600" : "text-amber-600"
                  )}>
                    {formatCurrency(tx.amount, settings)}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteTx(tx)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-all"
                        title="Void Transaction"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-6 pt-0">
        <Pagination
          currentPage={currentPage}
          totalItems={filteredTransactions.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* Modal Form for Transfer / Deposit / Withdrawal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 bg-[#081621] text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                {actionType === 'transfer' && <><ArrowLeftRight size={18} className="text-[#EF4444]" /> Transfer Funds Between Accounts</>}
                {actionType === 'deposit' && <><ArrowDownLeft size={18} className="text-green-400" /> Capital / Fund Deposit</>}
                {actionType === 'withdrawal' && <><ArrowUpRight size={18} className="text-amber-400" /> Owner Withdrawal / Drawing</>}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              {/* Transfer Mode: Source & Destination */}
              {actionType === 'transfer' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Transfer From (Source)</label>
                    <select
                      value={formData.fromAccountId}
                      onChange={e => setFormData({ ...formData, fromAccountId: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-2 font-medium"
                    >
                      {paymentAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(getAccountBalance(acc.id), settings)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Transfer To (Destination)</label>
                    <select
                      value={formData.toAccountId}
                      onChange={e => setFormData({ ...formData, toAccountId: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-2 font-medium"
                    >
                      {paymentAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(getAccountBalance(acc.id), settings)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Deposit / Withdrawal Mode: Single Account Selection */}
              {actionType !== 'transfer' && (
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    {actionType === 'deposit' ? 'Deposit Into Account' : 'Withdraw From Account'}
                  </label>
                  <select
                    value={formData.accountId}
                    onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2 font-medium"
                  >
                    {paymentAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type}) — Current Bal: {formatCurrency(getAccountBalance(acc.id), settings)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Amount (৳)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.amount || ''}
                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                    placeholder="e.g. 10000"
                    className="w-full border border-gray-200 rounded-lg p-2 text-base font-black text-gray-900 outline-none focus:ring-2 focus:ring-red-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              {/* Entity / Depositor / Withdrawer */}
              {actionType !== 'transfer' && (
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">
                    {actionType === 'deposit' ? 'Depositor / Investor Name' : 'Withdrawer / Owner Name'}
                  </label>
                  <input
                    type="text"
                    value={formData.entityName}
                    onChange={e => setFormData({ ...formData, entityName: e.target.value })}
                    placeholder="e.g. Owner Capital / Partner Name"
                    className="w-full border border-gray-200 rounded-lg p-2"
                  />
                </div>
              )}

              {/* Reference & Note */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Reference No / Slip #</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={e => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="e.g. Bank Slip #9482"
                    className="w-full border border-gray-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Note / Description</label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                    placeholder="e.g. Petty cash refill"
                    className="w-full border border-gray-200 rounded-lg p-2"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#EF4444] hover:bg-red-600 text-white font-bold py-2.5 rounded-lg transition-all shadow-sm"
                >
                  {submitting ? 'Processing...' : 'Confirm & Save Transaction'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepositsWithdrawals;
