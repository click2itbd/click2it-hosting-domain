import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Transaction, Customer } from '../../../../types';
import { formatCurrency, cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import {
  CreditCard,
  Search,
  Download,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  User,
} from 'lucide-react';
import { Pagination } from '../../../../components/common/Pagination';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TransactionHistoryProps {
  setSelectedLedgerEntity?: (v: { id: string; name: string; type: 'customer' | 'vendor' } | null) => void;
  setActiveTab?: (tab: string) => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  setSelectedLedgerEntity,
  setActiveTab,
}) => {
  const { hasPermission } = useAuth();
  const { settings } = useSettings();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txSnap, custSnap] = await Promise.all([
        getDocs(query(collection(db, 'transactions'), orderBy('date', 'desc'))),
        getDocs(query(collection(db, 'customers'), orderBy('name'))),
      ]);

      setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    } catch (err) {
      console.error('Error fetching transaction history:', err);
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Logic
  const getFilteredTransactions = () => {
    return transactions.filter(tx => {
      const txDateStr = new Date(tx.date).toISOString().split('T')[0];
      const matchesDate = txDateStr >= startDate && txDateStr <= endDate;
      if (!matchesDate) return false;

      if (typeFilter !== 'all') {
        if (typeFilter === 'income_group') {
          if (!['sale', 'payment_received', 'money_receipt', 'income', 'purchase_return', 'deposit', 'transfer_in'].includes(tx.type)) {
            return false;
          }
        } else if (typeFilter === 'expense_group') {
          if (['sale', 'payment_received', 'money_receipt', 'income', 'purchase_return', 'deposit', 'transfer_in'].includes(tx.type)) {
            return false;
          }
        } else if (tx.type !== typeFilter) {
          return false;
        }
      }

      if (methodFilter !== 'all') {
        const pMethod = (tx.paymentMethod || 'cash').toLowerCase();
        if (!pMethod.includes(methodFilter.toLowerCase())) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = (tx.description || '').toLowerCase().includes(q);
        const matchesEntity = (tx.entityName || '').toLowerCase().includes(q);
        const matchesCategory = (tx.category || '').toLowerCase().includes(q);
        const matchesType = (tx.type || '').toLowerCase().includes(q);
        if (!matchesDesc && !matchesEntity && !matchesCategory && !matchesType) {
          return false;
        }
      }

      return true;
    });
  };

  const filteredTx = getFilteredTransactions();

  // Metrics
  const totalInflow = filteredTx
    .filter(tx => ['sale', 'payment_received', 'money_receipt', 'income', 'purchase_return'].includes(tx.type))
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const totalOutflow = filteredTx
    .filter(tx => !['sale', 'payment_received', 'money_receipt', 'income', 'purchase_return'].includes(tx.type))
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const netBalance = totalInflow - totalOutflow;

  // Jump to Party Ledger
  const handleEntityClick = (tx: Transaction) => {
    if (!tx.entityId && !tx.entityName) return;
    const isCustomer = customers.some(c => c.id === tx.entityId || c.name === tx.entityName);
    if (setSelectedLedgerEntity) {
      setSelectedLedgerEntity({
        id: tx.entityId || '',
        name: tx.entityName || 'Entity',
        type: (tx.entityType as any) || (isCustomer ? 'customer' : 'vendor'),
      });
    }
    if (setActiveTab) {
      setActiveTab('ledger');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredTx.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const headers = ['Date', 'Type', 'Entity', 'Category', 'Description', 'Method', 'Debit (Outflow)', 'Credit (Inflow)'];
    const rows = filteredTx.map(tx => {
      const isCredit = ['sale', 'payment_received', 'money_receipt', 'income', 'purchase_return'].includes(tx.type);
      return [
        new Date(tx.date).toLocaleDateString(),
        tx.type,
        `"${tx.entityName || ''}"`,
        `"${tx.category || ''}"`,
        `"${tx.description || ''}"`,
        tx.paymentMethod || 'cash',
        !isCredit ? tx.amount : '',
        isCredit ? tx.amount : '',
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_journal_${startDate}_to_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (filteredTx.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(settings?.siteName || 'Click2IT', 14, 18);
    doc.setFontSize(11);
    doc.text('General Transactions Journal', 14, 25);
    doc.setFontSize(9);
    doc.text(`Period: ${startDate} to ${endDate} | Total Records: ${filteredTx.length}`, 14, 31);

    const body = filteredTx.map(tx => {
      const isCredit = ['sale', 'payment_received', 'money_receipt', 'income', 'purchase_return'].includes(tx.type);
      return [
        new Date(tx.date).toLocaleDateString(),
        tx.type.replace('_', ' ').toUpperCase(),
        tx.entityName || '-',
        tx.description || '-',
        tx.paymentMethod || 'cash',
        !isCredit ? formatCurrency(tx.amount, settings) : '-',
        isCredit ? formatCurrency(tx.amount, settings) : '-',
      ];
    });

    autoTable(doc, {
      startY: 36,
      head: [['Date', 'Type', 'Entity', 'Description', 'Method', 'Debit (Outflow)', 'Credit (Inflow)']],
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [8, 22, 33] },
      styles: { fontSize: 7 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.text(`Total Inflow (Credits): ${formatCurrency(totalInflow, settings)}`, 14, finalY);
    doc.text(`Total Outflow (Debits): ${formatCurrency(totalOutflow, settings)}`, 14, finalY + 5);
    doc.text(`Net Balance: ${formatCurrency(netBalance, settings)}`, 14, finalY + 10);

    doc.save(`Journal_${startDate}_to_${endDate}.pdf`);
  };

  if (!hasPermission('manage_finances')) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden space-y-6">
      {/* Header & Date / Action Controls */}
      <div className="p-6 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="text-[#EF4444]" /> Unified Transaction Journal
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Complete searchable ledger across all sales, purchases, returns, salaries, and operating expenses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
            <Printer size={14} /> PDF Journal
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50/70 border border-green-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Total Inflow (Credits)</span>
            <ArrowDownLeft size={16} className="text-green-600" />
          </div>
          <span className="text-xl font-black text-green-900 mt-1 block">{formatCurrency(totalInflow, settings)}</span>
          <span className="text-[10px] text-green-600 mt-1 block">Sales, Receipts & Income</span>
        </div>

        <div className="bg-red-50/70 border border-red-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Total Outflow (Debits)</span>
            <ArrowUpRight size={16} className="text-red-600" />
          </div>
          <span className="text-xl font-black text-red-900 mt-1 block">{formatCurrency(totalOutflow, settings)}</span>
          <span className="text-[10px] text-red-600 mt-1 block">Purchases, Salaries & Expenses</span>
        </div>

        <div className={cn(
          "border rounded-xl p-4",
          netBalance >= 0 ? "bg-blue-50/70 border-blue-100" : "bg-amber-50/70 border-amber-200"
        )}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">Net Fund Movement</span>
          <span className={cn(
            "text-xl font-black mt-1 block",
            netBalance >= 0 ? "text-blue-900" : "text-amber-800"
          )}>
            {formatCurrency(netBalance, settings)}
          </span>
          <span className="text-[10px] text-gray-500 mt-1 block">{netBalance >= 0 ? 'Cash Surplus' : 'Cash Deficit'}</span>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Transactions</span>
          <span className="text-xl font-black text-gray-900 mt-1 block">{filteredTx.length.toLocaleString()}</span>
          <span className="text-[10px] text-gray-500 mt-1 block">Matching filter criteria</span>
        </div>
      </div>

      {/* Filter Row: Search, Type, Method */}
      <div className="px-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search description, entity, category, or type..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-100"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="w-full py-2 px-3 text-xs border border-gray-200 rounded-lg outline-none font-medium text-gray-700"
          >
            <option value="all">-- All Transaction Types --</option>
            <option value="income_group">📈 All Inflow (Sales & Incomes)</option>
            <option value="expense_group">📉 All Outflow (Purchases & Expenses)</option>
            <option value="sale">Sale Invoice</option>
            <option value="payment_received">Payment Received</option>
            <option value="purchase">Purchase Bill</option>
            <option value="payment_made">Payment to Supplier</option>
            <option value="sale_return">Sale Return (Refund)</option>
            <option value="purchase_return">Purchase Return (Credit)</option>
            <option value="expense">Operating Expense</option>
            <option value="income">Other Income</option>
            <option value="salary">Employee Salary</option>
            <option value="conveyance">Conveyance</option>
          </select>
        </div>

        <div>
          <select
            value={methodFilter}
            onChange={e => { setMethodFilter(e.target.value); setCurrentPage(1); }}
            className="w-full py-2 px-3 text-xs border border-gray-200 rounded-lg outline-none font-medium text-gray-700"
          >
            <option value="all">-- All Payment Methods --</option>
            <option value="cash">Cash Drawer</option>
            <option value="bank">Bank Account</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="card">Card / POS</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border-t border-gray-100">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-200">
            <tr>
              <th className="px-6 py-3.5">Date</th>
              <th className="px-6 py-3.5">Type</th>
              <th className="px-6 py-3.5">Entity / Party</th>
              <th className="px-6 py-3.5">Category / Description</th>
              <th className="px-6 py-3.5">Method</th>
              <th className="px-6 py-3.5 text-right">Debit (Outflow)</th>
              <th className="px-6 py-3.5 text-right">Credit (Inflow)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading transactions...</td>
              </tr>
            ) : filteredTx.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                  No transactions found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredTx.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((tx, idx) => {
                const isCredit = ['sale', 'payment_received', 'money_receipt', 'income', 'purchase_return'].includes(tx.type);
                return (
                  <tr key={tx.id || idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        isCredit ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      )}>
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      {tx.entityName ? (
                        <button
                          onClick={() => handleEntityClick(tx)}
                          className="font-bold text-gray-900 hover:text-[#EF4444] hover:underline flex items-center gap-1 text-left"
                        >
                          <User size={12} className="text-gray-400" /> {tx.entityName}
                        </button>
                      ) : (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-medium text-gray-800 block">{tx.description || tx.category || '-'}</span>
                      {tx.category && tx.description && (
                        <span className="text-[10px] text-gray-400">{tx.category}</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-[10px] uppercase font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {tx.paymentMethod || 'cash'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-red-600">
                      {!isCredit ? formatCurrency(tx.amount, settings) : '-'}
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-green-600">
                      {isCredit ? formatCurrency(tx.amount, settings) : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredTx.length > 0 && (
            <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
              <tr>
                <td colSpan={5} className="px-6 py-4 text-right uppercase text-[10px] text-gray-500 tracking-wider">
                  Filtered Period Total
                </td>
                <td className="px-6 py-4 text-right text-red-600">{formatCurrency(totalOutflow, settings)}</td>
                <td className="px-6 py-4 text-right text-green-600">{formatCurrency(totalInflow, settings)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      <div className="p-6 pt-0">
        <Pagination
          currentPage={currentPage}
          totalItems={filteredTx.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
    </div>
  );
};

export default TransactionHistory;
