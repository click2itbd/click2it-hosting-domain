import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { PaymentAccount, Transaction } from '../../../../types';
import { formatCurrency, cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import {
  CreditCard,
  Search,
  Download,
  Printer,
  Calendar,
  Building,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { Pagination } from '../../../../components/common/Pagination';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AccountStatementProps {
  setSelectedLedgerEntity?: (v: { id: string; name: string; type: 'customer' | 'vendor' } | null) => void;
  setActiveTab?: (tab: string) => void;
}

const AccountStatement: React.FC<AccountStatementProps> = ({
  setSelectedLedgerEntity,
  setActiveTab,
}) => {
  const { hasPermission } = useAuth();
  const { settings } = useSettings();

  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Date filters
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
        getDocs(query(collection(db, 'transactions'), orderBy('date', 'asc'))),
      ]);

      const accounts = accSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentAccount));
      setPaymentAccounts(accounts);
      if (accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0].id);
      }

      setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    } catch (err) {
      console.error('Error loading account statement data:', err);
      toast.error('Failed to load accounts statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedAccount = paymentAccounts.find(a => a.id === selectedAccountId);

  // Determine if a transaction belongs to this payment account
  const isAccountTx = (tx: Transaction, acc: PaymentAccount) => {
    if (!acc) return false;
    if (tx.paymentAccountId && tx.paymentAccountId === acc.id) return true;
    
    const pMethod = (tx.paymentMethod || '').toLowerCase();
    if (!pMethod) return false; // Fixed empty string matching everything
    
    const accType = (acc.type || '').toLowerCase();
    const accName = (acc.name || '').toLowerCase();

    if (pMethod === accType || pMethod === accName || accName.includes(pMethod) || (accType && pMethod.includes(accType))) {
      return true;
    }
    return false;
  };

  // 1. Calculate Opening Balance prior to startDate
  const initialBaseBalance = selectedAccount ? Number(selectedAccount.openingBalance || 0) : 0;

  const priorTransactions = transactions.filter(tx => {
    if (!selectedAccount) return false;
    if (!isAccountTx(tx, selectedAccount)) return false;
    const txDateStr = new Date(tx.date).toISOString().split('T')[0];
    return txDateStr < startDate;
  });

  const priorInflow = priorTransactions
    .filter(tx => ['sale', 'payment_received', 'money_receipt', 'income', 'purchase_return', 'deposit', 'transfer_in'].includes(tx.type))
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const priorOutflow = priorTransactions
    .filter(tx => ['purchase', 'payment_made', 'expense', 'salary', 'conveyance', 'sale_return', 'withdrawal', 'transfer_out'].includes(tx.type))
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const calculatedOpeningBalance = initialBaseBalance + priorInflow - priorOutflow;

  // 2. Filter Transactions in Date Range
  const periodTransactions = transactions.filter(tx => {
    if (!selectedAccount) return false;
    if (!isAccountTx(tx, selectedAccount)) return false;
    const txDateStr = new Date(tx.date).toISOString().split('T')[0];
    return txDateStr >= startDate && txDateStr <= endDate;
  });

  // Search Filter
  const filteredPeriodTx = periodTransactions.filter(tx => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (tx.description || '').toLowerCase().includes(q) ||
      (tx.entityName || '').toLowerCase().includes(q) ||
      (tx.type || '').toLowerCase().includes(q) ||
      (tx.category || '').toLowerCase().includes(q)
    );
  });

  // 3. Compute running balances
  let running = calculatedOpeningBalance;
  const statementRows = filteredPeriodTx.map(tx => {
    const isCredit = ['sale', 'payment_received', 'money_receipt', 'income', 'purchase_return', 'deposit'].includes(tx.type);
    const debitAmt = !isCredit ? tx.amount : 0;
    const creditAmt = isCredit ? tx.amount : 0;
    running += creditAmt - debitAmt;

    return {
      ...tx,
      debit: debitAmt,
      credit: creditAmt,
      balance: running,
    };
  });

  const totalPeriodInflow = statementRows.reduce((sum, r) => sum + r.credit, 0);
  const totalPeriodOutflow = statementRows.reduce((sum, r) => sum + r.debit, 0);
  const closingBalance = calculatedOpeningBalance + totalPeriodInflow - totalPeriodOutflow;

  // Export to CSV
  const exportToCSV = () => {
    if (!selectedAccount) return;
    const headers = ['Date', 'Type', 'Entity / Party', 'Description', 'Debit (Payment ৳)', 'Credit (Receipt ৳)', 'Running Balance (৳)'];
    const rows = [
      [startDate, 'OPENING BALANCE', '-', 'Balance Forward', '', '', calculatedOpeningBalance],
      ...statementRows.map(r => [
        new Date(r.date).toLocaleDateString(),
        r.type,
        `"${r.entityName || ''}"`,
        `"${r.description || ''}"`,
        r.debit || '',
        r.credit || '',
        r.balance,
      ]),
      [endDate, 'CLOSING BALANCE', '-', 'Ending Balance', '', '', closingBalance],
    ];

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedAccount.name}_statement_${startDate}_to_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!selectedAccount) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(settings?.siteName || 'Click2IT', 14, 18);
    doc.setFontSize(11);
    doc.text(`Account Statement: ${selectedAccount.name} (${selectedAccount.type.toUpperCase()})`, 14, 25);
    doc.setFontSize(9);
    doc.text(`Statement Period: ${startDate} to ${endDate} | Generated: ${new Date().toLocaleDateString()}`, 14, 31);

    const body = [
      [startDate, 'OPENING BALANCE', '-', 'Balance Forward', '-', '-', formatCurrency(calculatedOpeningBalance, settings)],
      ...statementRows.map(r => [
        new Date(r.date).toLocaleDateString(),
        r.type.replace('_', ' ').toUpperCase(),
        r.entityName || '-',
        r.description || '-',
        r.debit > 0 ? formatCurrency(r.debit, settings) : '-',
        r.credit > 0 ? formatCurrency(r.credit, settings) : '-',
        formatCurrency(r.balance, settings),
      ]),
    ];

    autoTable(doc, {
      startY: 36,
      head: [['Date', 'Type', 'Party', 'Description', 'Debit (Outflow)', 'Credit (Inflow)', 'Balance']],
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [8, 22, 33] },
      styles: { fontSize: 7 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.text(`Opening Balance: ${formatCurrency(calculatedOpeningBalance, settings)}`, 14, finalY);
    doc.text(`Total Period Receipts (Credit): ${formatCurrency(totalPeriodInflow, settings)}`, 14, finalY + 5);
    doc.text(`Total Period Payments (Debit): ${formatCurrency(totalPeriodOutflow, settings)}`, 14, finalY + 10);
    doc.setFontSize(10);
    doc.text(`Closing Balance: ${formatCurrency(closingBalance, settings)}`, 14, finalY + 16);

    doc.save(`${selectedAccount.name}_Statement_${startDate}_to_${endDate}.pdf`);
  };

  if (!hasPermission('manage_finances')) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden space-y-6">
      {/* Top Header & Account Selector */}
      <div className="p-6 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="text-[#EF4444]" /> Payment Account Statement
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Individual bank, cash drawer, and mobile banking account ledger with opening/closing balances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Account Picker */}
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <Building size={14} className="text-gray-500" />
            <select
              value={selectedAccountId}
              onChange={e => { setSelectedAccountId(e.target.value); setCurrentPage(1); }}
              className="border-none bg-transparent text-xs font-bold text-gray-800 p-0 focus:ring-0 outline-none"
            >
              {paymentAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type})
                </option>
              ))}
            </select>
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

          {/* Export Actions */}
          <button
            onClick={exportToCSV}
            className="bg-[#081621] hover:bg-[#EF4444] text-white px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={exportToPDF}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <Printer size={14} /> PDF Statement
          </button>
        </div>
      </div>

      {/* Account Info Card & Summary KPIs */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Opening Balance</span>
          <span className="text-xl font-black text-gray-900 mt-1 block">
            {formatCurrency(calculatedOpeningBalance, settings)}
          </span>
          <span className="text-[10px] text-gray-500 mt-1 block">As of {new Date(startDate).toLocaleDateString()}</span>
        </div>

        <div className="bg-green-50/70 border border-green-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Total Inflow (Receipts)</span>
            <ArrowDownLeft size={16} className="text-green-600" />
          </div>
          <span className="text-xl font-black text-green-900 mt-1 block">
            {formatCurrency(totalPeriodInflow, settings)}
          </span>
          <span className="text-[10px] text-green-600 mt-1 block">Inflows during period</span>
        </div>

        <div className="bg-red-50/70 border border-red-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Total Outflow (Payments)</span>
            <ArrowUpRight size={16} className="text-red-600" />
          </div>
          <span className="text-xl font-black text-red-900 mt-1 block">
            {formatCurrency(totalPeriodOutflow, settings)}
          </span>
          <span className="text-[10px] text-red-600 mt-1 block">Payments & expenses</span>
        </div>

        <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Closing Balance</span>
          <span className="text-xl font-black text-blue-900 mt-1 block">
            {formatCurrency(closingBalance, settings)}
          </span>
          <span className="text-[10px] text-blue-600 mt-1 block">As of {new Date(endDate).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search description, reference, or party in this statement..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-100"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
        </div>
      </div>

      {/* Statement Table */}
      <div className="overflow-x-auto border-t border-gray-100">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-200">
            <tr>
              <th className="px-6 py-3.5">Date</th>
              <th className="px-6 py-3.5">Type</th>
              <th className="px-6 py-3.5">Party / Entity</th>
              <th className="px-6 py-3.5">Description</th>
              <th className="px-6 py-3.5 text-right">Debit (Outflow ৳)</th>
              <th className="px-6 py-3.5 text-right">Credit (Inflow ৳)</th>
              <th className="px-6 py-3.5 text-right">Balance (৳)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Opening Balance Row */}
            <tr className="bg-gray-50/50 font-bold">
              <td className="px-6 py-3 text-gray-600">{new Date(startDate).toLocaleDateString()}</td>
              <td className="px-6 py-3">
                <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-gray-200 text-gray-800">
                  OPENING
                </span>
              </td>
              <td className="px-6 py-3 text-gray-500">-</td>
              <td className="px-6 py-3 text-gray-700 italic">Balance Forwarded</td>
              <td className="px-6 py-3 text-right text-gray-400">-</td>
              <td className="px-6 py-3 text-right text-gray-400">-</td>
              <td className="px-6 py-3 text-right text-gray-900 font-bold">
                {formatCurrency(calculatedOpeningBalance, settings)}
              </td>
            </tr>

            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading statement...</td>
              </tr>
            ) : statementRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                  No transactions recorded for this account in the selected date period.
                </td>
              </tr>
            ) : (
              statementRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, idx) => (
                <tr key={row.id || idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">
                    {new Date(row.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      row.credit > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    )}>
                      {row.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-bold text-gray-800">
                    {row.entityName || '-'}
                  </td>
                  <td className="px-6 py-3.5 font-medium text-gray-800">{row.description || '-'}</td>
                  <td className="px-6 py-3.5 text-right font-medium text-red-600">
                    {row.debit > 0 ? formatCurrency(row.debit, settings) : '-'}
                  </td>
                  <td className="px-6 py-3.5 text-right font-medium text-green-600">
                    {row.credit > 0 ? formatCurrency(row.credit, settings) : '-'}
                  </td>
                  <td className="px-6 py-3.5 text-right font-black text-gray-900">
                    {formatCurrency(row.balance, settings)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {statementRows.length > 0 && (
            <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-6 py-4 text-right uppercase text-[10px] text-gray-500 tracking-wider">
                  Period Totals / Ending Balance
                </td>
                <td className="px-6 py-4 text-right text-red-600">{formatCurrency(totalPeriodOutflow, settings)}</td>
                <td className="px-6 py-4 text-right text-green-600">{formatCurrency(totalPeriodInflow, settings)}</td>
                <td className="px-6 py-4 text-right text-blue-700 text-sm">{formatCurrency(closingBalance, settings)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      <div className="p-6 pt-0">
        <Pagination
          currentPage={currentPage}
          totalItems={statementRows.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
    </div>
  );
};

export default AccountStatement;
