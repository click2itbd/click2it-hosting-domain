import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { Transaction, Customer, Vendor } from '../../../../types';
import { formatCurrency, cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import { Book, X, User, Download, Printer, Plus, ArrowLeft } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LedgerTabProps {
  selectedLedgerEntity?: { id: string; name: string; type: 'customer' | 'vendor' } | null;
  setSelectedLedgerEntity?: (v: { id: string; name: string; type: 'customer' | 'vendor' } | null) => void;
}

const LedgerTab: React.FC<LedgerTabProps> = ({
  selectedLedgerEntity,
  setSelectedLedgerEntity,
}) => {
  const { hasPermission } = useAuth();
  const { settings } = useSettings();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [generalLedgerFilterType, setGeneralLedgerFilterType] = useState<'daily' | 'monthly'>('daily');
  const [generalLedgerStartDate, setGeneralLedgerStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [generalLedgerEndDate, setGeneralLedgerEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showLedgerReportModal, setShowLedgerReportModal] = useState<boolean>(false);
  const [ledgerReportModalData, setLedgerReportModalData] = useState<any[]>([]);
  const [ledgerReportType, setLedgerReportType] = useState<'income' | 'expense' | null>(null);

  // Quick Payment Recording State
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const [entitySearchQuery, setEntitySearchQuery] = useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showEntityDropdown && searchInputRef.current) {
      // Use setTimeout to ensure the element is rendered before focusing
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [showEntityDropdown]);

  const fetchTransactions = async () => {
    try {
      const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load transactions');
    }
  };

  const fetchEntities = async () => {
    try {
      const [cSnap, vSnap] = await Promise.all([
        getDocs(query(collection(db, 'customers'), orderBy('name'))),
        getDocs(query(collection(db, 'vendors'), orderBy('name'))),
      ]);
      setCustomers(cSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
      setVendors(vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
    } catch (err) {
      console.error('Error loading ledger entities:', err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchEntities();
  }, []);

  // 1. General Ledger Calculations
  const getLedgerData = () => {
    const data: { [key: string]: { date: string; income: number; expense: number; balance: number; details: any[] } } = {};

    transactions.forEach(tx => {
      const txDateStr = new Date(tx.date).toISOString().split('T')[0];
      if (txDateStr >= generalLedgerStartDate && txDateStr <= generalLedgerEndDate) {
        const key = generalLedgerFilterType === 'monthly' ? txDateStr.substring(0, 7) : txDateStr;
        const displayDate =
          generalLedgerFilterType === 'monthly'
            ? new Date(tx.date).toLocaleString('default', { month: 'long', year: 'numeric' })
            : txDateStr;

        if (!data[key]) {
          data[key] = { date: displayDate, income: 0, expense: 0, balance: 0, details: [] };
        }

        const isIncome = ['sale', 'income', 'purchase_return'].includes(tx.type) || (tx.type === 'opening_balance' && tx.entityType === 'customer');
        const isExpense = ['purchase', 'expense', 'salary', 'conveyance', 'sale_return'].includes(tx.type) || (tx.type === 'opening_balance' && tx.entityType === 'vendor');
          
          if (isIncome) {
            data[key].income += tx.amount;
          }
          if (isExpense) {
            data[key].expense += tx.amount;
          }

        data[key].balance = data[key].income - data[key].expense;
        data[key].details.push(tx);
      }
    });

    return Object.keys(data)
      .sort((a, b) => b.localeCompare(a))
      .map(k => data[k]);
  };

  // 2. Entity Party Ledger Calculations
  const getEntityTransactions = () => {
    if (!selectedLedgerEntity) return [];
    return transactions.filter(t => {
      const matchesEntity = t.entityId === selectedLedgerEntity.id || t.entityName === selectedLedgerEntity.name;
      const tDate = new Date(t.date).toISOString().split('T')[0];
      const matchesDate = tDate >= generalLedgerStartDate && tDate <= generalLedgerEndDate;
      return matchesEntity && matchesDate;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const entityTxList = getEntityTransactions();
  const isCustomer = selectedLedgerEntity?.type === 'customer';

  // Calculate Running Balance
  let runningBal = 0;
  const entityLedgerRows = entityTxList.map(tx => {
    const isDebit = isCustomer ? ['sale', 'opening_balance'].includes(tx.type) : ['payment_made', 'purchase_return'].includes(tx.type);
    const isCredit = isCustomer ? ['payment_received', 'money_receipt', 'sale_return', 'return'].includes(tx.type) : ['purchase', 'opening_balance'].includes(tx.type);

    const debitAmt = isDebit ? tx.amount : 0;
    const creditAmt = isCredit ? tx.amount : 0;

    if (isCustomer) {
      runningBal += debitAmt - creditAmt;
    } else {
      runningBal += creditAmt - debitAmt;
    }

    return {
      ...tx,
      debit: debitAmt,
      credit: creditAmt,
      balance: runningBal,
    };
  });

  const totalDebit = entityLedgerRows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = entityLedgerRows.reduce((sum, r) => sum + r.credit, 0);
  const finalBalance = isCustomer ? totalDebit - totalCredit : totalCredit - totalDebit;

  // Handle Recording New Payment / Due Collection
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLedgerEntity || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      const type = selectedLedgerEntity.type === 'customer' ? 'payment_received' : 'payment_made';
      const newTx = {
        date: new Date(paymentDate).toISOString(),
        amount: Number(paymentAmount),
        type,
        paymentMethod,
        description: paymentDescription || `${selectedLedgerEntity.type === 'customer' ? 'Received from' : 'Paid to'} ${selectedLedgerEntity.name}`,
        entityId: selectedLedgerEntity.id,
        entityName: selectedLedgerEntity.name,
        entityType: selectedLedgerEntity.type,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'transactions'), newTx);
      toast.success('Payment recorded successfully!');
      setIsRecordingPayment(false);
      setPaymentAmount(0);
      setPaymentDescription('');
      fetchTransactions();
    } catch (err) {
      console.error(err);
      toast.error('Failed to record payment');
    }
  };

  // Export Entity Statement to CSV
  const exportEntityCSV = () => {
    if (!selectedLedgerEntity || entityLedgerRows.length === 0) {
      toast.error('No statement records to export');
      return;
    }
    const headers = ['Date', 'Type', 'Description', 'Method', 'Debit', 'Credit', 'Balance'];
    const rows = entityLedgerRows.map(r => [
      new Date(r.date).toLocaleDateString(),
      r.type,
      `"${r.description || ''}"`,
      r.paymentMethod || 'cash',
      r.debit,
      r.credit,
      r.balance,
    ]);
    const csv = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedLedgerEntity.name}_statement_${generalLedgerStartDate}_to_${generalLedgerEndDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export Entity Statement to PDF
  const exportEntityPDF = () => {
    if (!selectedLedgerEntity || entityLedgerRows.length === 0) {
      toast.error('No statement records to export');
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(settings?.siteName || 'Click2IT', 14, 18);
    doc.setFontSize(11);
    doc.text(`Account Statement: ${selectedLedgerEntity.name} (${selectedLedgerEntity.type.toUpperCase()})`, 14, 25);
    doc.setFontSize(9);
    doc.text(`Period: ${generalLedgerStartDate} to ${generalLedgerEndDate} | Generated: ${new Date().toLocaleDateString()}`, 14, 31);

    const body = entityLedgerRows.map(r => [
      new Date(r.date).toLocaleDateString(),
      r.type.replace('_', ' ').toUpperCase(),
      r.description || '-',
      r.paymentMethod || 'cash',
      r.debit > 0 ? formatCurrency(r.debit, settings) : '-',
      r.credit > 0 ? formatCurrency(r.credit, settings) : '-',
      formatCurrency(r.balance, settings),
    ]);

    autoTable(doc, {
      startY: 36,
      head: [['Date', 'Type', 'Description', 'Method', 'Debit', 'Credit', 'Balance']],
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [8, 22, 33] },
      styles: { fontSize: 8 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Total Debit: ${formatCurrency(totalDebit, settings)}`, 14, finalY);
    doc.text(`Total Credit: ${formatCurrency(totalCredit, settings)}`, 14, finalY + 6);
    doc.text(`Net Outstanding Balance: ${formatCurrency(finalBalance, settings)}`, 14, finalY + 12);

    doc.save(`${selectedLedgerEntity.name}_Statement.pdf`);
  };

  if (!hasPermission('manage_finances')) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden space-y-6">
      {/* ── Top Bar ── */}
      <div className="p-6 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {selectedLedgerEntity && (
            <button
              onClick={() => setSelectedLedgerEntity && setSelectedLedgerEntity(null)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-all"
              title="Back to General Ledger"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Book className="text-[#EF4444]" />
              {selectedLedgerEntity ? `${selectedLedgerEntity.name}'s Statement` : 'General Accounting Ledger'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {selectedLedgerEntity
                ? `Individual ${selectedLedgerEntity.type} party ledger with debits, credits, and running balance.`
                : 'Double-entry debit/credit journals, monthly aggregates, and party statements.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Party Picker Dropdown (Searchable) */}
          <div className="relative">
            <div 
              className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setShowEntityDropdown(!showEntityDropdown)}
            >
              <User size={14} className="text-gray-400" />
              <div className="text-xs font-bold text-gray-800 select-none whitespace-nowrap min-w-[150px]">
                {selectedLedgerEntity ? `${selectedLedgerEntity.name} (${selectedLedgerEntity.type})` : '-- All (General Ledger) --'}
              </div>
            </div>

            {showEntityDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowEntityDropdown(false)}
                ></div>
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 shadow-xl rounded-lg z-50 flex flex-col overflow-hidden" style={{ maxHeight: '400px' }}>
                  <div className="p-2 border-b border-gray-100 bg-gray-50">
                   <input
                     ref={searchInputRef}
                     type="text"
                     placeholder="Search party by name..."
                     className="w-full text-xs p-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#EF4444] bg-white text-gray-800"
                     value={entitySearchQuery}
                     onChange={e => setEntitySearchQuery(e.target.value)}
                   />
                </div>
                <div className="overflow-y-auto p-1 text-xs bg-white">
                  <div 
                    className="p-2 hover:bg-red-50 cursor-pointer font-bold text-gray-800 rounded mb-1 transition-colors"
                    onClick={() => {
                      if (setSelectedLedgerEntity) setSelectedLedgerEntity(null);
                      setShowEntityDropdown(false);
                      setEntitySearchQuery('');
                    }}
                  >
                    -- All (General Ledger) --
                  </div>
                  
                  {customers.filter(c => c.name.toLowerCase().includes(entitySearchQuery.toLowerCase())).length > 0 && (
                    <div className="font-black text-[10px] text-gray-400 uppercase mt-2 px-2 mb-1">Customers</div>
                  )}
                  {customers.filter(c => c.name.toLowerCase().includes(entitySearchQuery.toLowerCase())).map(c => (
                     <div 
                       key={`c-${c.id}`} 
                       className="p-2 hover:bg-gray-100 cursor-pointer rounded flex items-center gap-2 transition-colors"
                       onClick={() => {
                         if (setSelectedLedgerEntity) setSelectedLedgerEntity({ id: c.id, name: c.name, type: 'customer' });
                         setShowEntityDropdown(false);
                         setEntitySearchQuery('');
                       }}
                     >
                       <span>👤</span> <span className="font-medium text-gray-700">{c.name}</span>
                     </div>
                  ))}
                  
                  {vendors.filter(v => v.name.toLowerCase().includes(entitySearchQuery.toLowerCase())).length > 0 && (
                    <div className="font-black text-[10px] text-gray-400 uppercase mt-2 px-2 mb-1">Vendors / Suppliers</div>
                  )}
                  {vendors.filter(v => v.name.toLowerCase().includes(entitySearchQuery.toLowerCase())).map(v => (
                     <div 
                       key={`v-${v.id}`} 
                       className="p-2 hover:bg-gray-100 cursor-pointer rounded flex items-center gap-2 transition-colors"
                       onClick={() => {
                         if (setSelectedLedgerEntity) setSelectedLedgerEntity({ id: v.id, name: v.name, type: 'vendor' });
                         setShowEntityDropdown(false);
                         setEntitySearchQuery('');
                       }}
                     >
                       <span>🏢</span> <span className="font-medium text-gray-700">{v.name}</span>
                     </div>
                  ))}
                  
                  {(customers.filter(c => c.name.toLowerCase().includes(entitySearchQuery.toLowerCase())).length === 0 && 
                    vendors.filter(v => v.name.toLowerCase().includes(entitySearchQuery.toLowerCase())).length === 0) && (
                      <div className="p-3 text-center text-gray-400 italic font-medium">No matches found</div>
                  )}
                </div>
              </div>
              </>
            )}
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <label className="text-[10px] font-bold text-gray-500 uppercase">From</label>
            <input
              type="date"
              value={generalLedgerStartDate}
              onChange={e => setGeneralLedgerStartDate(e.target.value)}
              className="border-none bg-transparent text-xs font-bold text-gray-800 p-0 focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <label className="text-[10px] font-bold text-gray-500 uppercase">To</label>
            <input
              type="date"
              value={generalLedgerEndDate}
              onChange={e => setGeneralLedgerEndDate(e.target.value)}
              className="border-none bg-transparent text-xs font-bold text-gray-800 p-0 focus:ring-0"
            />
          </div>
        </div>
      </div>

      {/* ── VIEW 1: Individual Entity Party Ledger ── */}
      {selectedLedgerEntity ? (
        <div className="space-y-6">
          {/* Entity Summary Banner */}
          <div className="mx-6 p-4 rounded-xl bg-gradient-to-r from-[#081621] to-[#122b3f] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-300 border border-red-400/30">
                  {selectedLedgerEntity.type} Account
                </span>
                <span className="text-xs text-gray-300">ID: #{selectedLedgerEntity.id.slice(0, 8)}</span>
              </div>
              <h3 className="text-2xl font-black mt-1">{selectedLedgerEntity.name}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsRecordingPayment(true)}
                className="bg-[#EF4444] hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
              >
                <Plus size={14} /> {isCustomer ? 'Collect Due / Receive' : 'Make Payment'}
              </button>
              <button
                onClick={exportEntityCSV}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Download size={14} /> CSV
              </button>
              <button
                onClick={exportEntityPDF}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Printer size={14} /> PDF Statement
              </button>
            </div>
          </div>

          {/* KPI Cards for Entity */}
          <div className="px-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Total Billed (Debit)</span>
              <span className="text-xl font-black text-blue-900 mt-1 block">{formatCurrency(totalDebit, settings)}</span>
            </div>
            <div className="bg-green-50/70 border border-green-100 rounded-xl p-4">
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider block">Total Paid (Credit)</span>
              <span className="text-xl font-black text-green-900 mt-1 block">{formatCurrency(totalCredit, settings)}</span>
            </div>
            <div className={cn(
              "border rounded-xl p-4",
              finalBalance > 0 ? "bg-amber-50/70 border-amber-200" : "bg-emerald-50/70 border-emerald-200"
            )}>
              <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-600">
                {isCustomer ? 'Due Outstanding' : 'Payable Outstanding'}
              </span>
              <span className={cn(
                "text-xl font-black mt-1 block",
                finalBalance > 0 ? "text-amber-700" : "text-emerald-700"
              )}>
                {formatCurrency(finalBalance, settings)}
              </span>
            </div>
          </div>

          {/* Record Payment Form Modal */}
          {isRecordingPayment && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="p-5 bg-[#081621] text-white flex items-center justify-between">
                  <h3 className="font-bold text-base">
                    {isCustomer ? 'Receive Payment from Customer' : 'Make Payment to Supplier'}
                  </h3>
                  <button onClick={() => setIsRecordingPayment(false)} className="text-gray-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleSavePayment} className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Party</label>
                    <input
                      type="text"
                      disabled
                      value={`${selectedLedgerEntity.name} (${selectedLedgerEntity.type})`}
                      className="w-full bg-gray-100 border border-gray-200 rounded-lg p-2 font-bold text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Payment Amount (৳)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={paymentAmount || ''}
                      onChange={e => setPaymentAmount(Number(e.target.value))}
                      placeholder="e.g. 5000"
                      className="w-full border border-gray-200 rounded-lg p-2 text-base font-black text-gray-900 focus:ring-2 focus:ring-red-100 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 uppercase mb-1">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg p-2 font-medium"
                      >
                        <option value="cash">Cash</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="bkash">bKash</option>
                        <option value="nagad">Nagad</option>
                        <option value="card">Card / POS</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 uppercase mb-1">Date</label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={e => setPaymentDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg p-2 font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Note / Reference</label>
                    <input
                      type="text"
                      value={paymentDescription}
                      onChange={e => setPaymentDescription(e.target.value)}
                      placeholder="e.g. Money receipt #MR-001 / Advance"
                      className="w-full border border-gray-200 rounded-lg p-2"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-[#EF4444] hover:bg-red-600 text-white font-bold py-2.5 rounded-lg transition-all"
                    >
                      Confirm & Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRecordingPayment(false)}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Statement Table */}
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Transaction Type</th>
                  <th className="px-6 py-3.5">Description / Ref</th>
                  <th className="px-6 py-3.5">Method</th>
                  <th className="px-6 py-3.5 text-right">Debit (৳)</th>
                  <th className="px-6 py-3.5 text-right">Credit (৳)</th>
                  <th className="px-6 py-3.5 text-right">Running Balance (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entityLedgerRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                      No transaction records found for this {selectedLedgerEntity.type} in the selected date range.
                    </td>
                  </tr>
                ) : (
                  entityLedgerRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3.5 text-gray-500">{new Date(row.date).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                          {row.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-gray-800">{row.description || '-'}</td>
                      <td className="px-6 py-3.5 text-gray-500 uppercase text-[10px]">{row.paymentMethod || 'cash'}</td>
                      <td className="px-6 py-3.5 text-right font-medium text-blue-600">
                        {row.debit > 0 ? formatCurrency(row.debit, settings) : '-'}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium text-green-600">
                        {row.credit > 0 ? formatCurrency(row.credit, settings) : '-'}
                      </td>
                      <td className={cn(
                        "px-6 py-3.5 text-right font-bold",
                        row.balance > 0 ? "text-amber-600" : "text-gray-900"
                      )}>
                        {formatCurrency(row.balance, settings)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {entityLedgerRows.length > 0 && (
                <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right uppercase text-[10px] text-gray-500 tracking-wider">Total</td>
                    <td className="px-6 py-4 text-right text-blue-700">{formatCurrency(totalDebit, settings)}</td>
                    <td className="px-6 py-4 text-right text-green-700">{formatCurrency(totalCredit, settings)}</td>
                    <td className="px-6 py-4 text-right text-red-600 text-sm">{formatCurrency(finalBalance, settings)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        /* ── VIEW 2: General Ledger (Daily / Monthly) ── */
        <div className="space-y-6">
          {/* Daily/Monthly Filter Switches */}
          <div className="px-6 flex items-center justify-between">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setGeneralLedgerFilterType('daily')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                  generalLedgerFilterType === 'daily' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Daily View
              </button>
              <button
                onClick={() => setGeneralLedgerFilterType('monthly')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                  generalLedgerFilterType === 'monthly' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Monthly Summary
              </button>
            </div>
          </div>

          {/* Income / Expense Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6">
            <button
              onClick={() => {
                const allDetails = getLedgerData().flatMap(item => item.details);
                setLedgerReportModalData(
                  allDetails.filter(tx => ['sale', 'income', 'purchase_return', 'opening_balance'].includes(tx.type))
                );
                setLedgerReportType('income');
                setShowLedgerReportModal(true);
              }}
              className="bg-green-50/60 border border-green-100 p-4 rounded-xl flex flex-col hover:shadow-md transition-shadow text-left"
            >
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Total Income (Credit)</span>
              <span className="text-2xl font-black text-green-700">
                {formatCurrency(getLedgerData().reduce((sum, item) => sum + item.income, 0), settings)}
              </span>
              <span className="text-[10px] text-green-600 mt-1">Click to view credit breakdown</span>
            </button>

            <button
              onClick={() => {
                const allDetails = getLedgerData().flatMap(item => item.details);
                setLedgerReportModalData(
                  allDetails.filter(tx => !['sale', 'payment_received', 'money_receipt', 'income', 'purchase_return'].includes(tx.type))
                );
                setLedgerReportType('expense');
                setShowLedgerReportModal(true);
              }}
              className="bg-red-50/60 border border-red-100 p-4 rounded-xl flex flex-col hover:shadow-md transition-shadow text-left"
            >
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Total Expenditure (Debit)</span>
              <span className="text-2xl font-black text-red-700">
                {formatCurrency(getLedgerData().reduce((sum, item) => sum + item.expense, 0), settings)}
              </span>
              <span className="text-[10px] text-red-600 mt-1">Click to view debit breakdown</span>
            </button>

            <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-xl flex flex-col">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Net Balance</span>
              <span className="text-2xl font-black text-blue-700">
                {formatCurrency(getLedgerData().reduce((sum, item) => sum + item.balance, 0), settings)}
              </span>
              <span className="text-[10px] text-blue-600 mt-1">Surplus / Deficit</span>
            </div>
          </div>

          {/* General Ledger Table */}
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5">Date / Period</th>
                  <th className="px-6 py-3.5 text-right">Income (Credit)</th>
                  <th className="px-6 py-3.5 text-right">Expenditure (Debit)</th>
                  <th className="px-6 py-3.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {getLedgerData().map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-gray-800">{row.date}</td>
                    <td className="px-6 py-3.5 text-right font-medium text-green-600">{formatCurrency(row.income, settings)}</td>
                    <td className="px-6 py-3.5 text-right font-medium text-red-600">{formatCurrency(row.expense, settings)}</td>
                    <td className={cn("px-6 py-3.5 text-right font-bold", row.balance >= 0 ? "text-blue-600" : "text-red-600")}>
                      {formatCurrency(row.balance, settings)}
                    </td>
                  </tr>
                ))}
                {getLedgerData().length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">No ledger records found for the selected period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Drill-down Modal */}
          {showLedgerReportModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#081621] text-white">
                  <h2 className="text-lg font-bold capitalize">{ledgerReportType} Breakdown Details</h2>
                  <button onClick={() => setShowLedgerReportModal(false)} className="text-gray-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <div className="overflow-y-auto p-6 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-bold">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ledgerReportModalData.map((tx, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-gray-500">{new Date(tx.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{tx.description || '-'}</td>
                          <td className="px-4 py-3 capitalize">{tx.type.replace('_', ' ')}</td>
                          <td className="px-4 py-3 uppercase text-[10px]">{tx.paymentMethod || 'cash'}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(tx.amount, settings)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-gray-100 flex justify-end">
                  <button onClick={() => setShowLedgerReportModal(false)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md font-bold text-xs">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LedgerTab;
