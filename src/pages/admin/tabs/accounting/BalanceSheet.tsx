import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Product, PaymentAccount, Customer, Vendor, Transaction, Order } from '../../../../types';
import { formatCurrency, cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import {
  Scale,
  Download,
  Printer,
  Calendar,
  Building,
  DollarSign,
  Package,
  Users,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BalanceSheetProps {
  setSelectedLedgerEntity?: (v: { id: string; name: string; type: 'customer' | 'vendor' } | null) => void;
  setActiveTab?: (tab: string) => void;
}

const BalanceSheet: React.FC<BalanceSheetProps> = ({
  setSelectedLedgerEntity,
  setActiveTab,
}) => {
  const { hasPermission } = useAuth();
  const { settings } = useSettings();

  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const [pSnap, accSnap, custSnap, vendSnap, txSnap, ordSnap] = await Promise.all([
        getDocs(query(collection(db, 'products'))),
        getDocs(query(collection(db, 'payment_accounts'), orderBy('name'))),
        getDocs(query(collection(db, 'customers'), orderBy('name'))),
        getDocs(query(collection(db, 'vendors'), orderBy('name'))),
        getDocs(query(collection(db, 'transactions'), orderBy('date', 'asc'))),
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'asc'))),
      ]);

      setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setPaymentAccounts(accSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentAccount)));
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
      setVendors(vendSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
      setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      setOrders(ordSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    } catch (err) {
      console.error('Error fetching Balance Sheet data:', err);
      toast.error('Failed to load balance sheet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  // Filter transactions up to asOfDate
  const validTransactions = transactions.filter(tx => {
    const txDateStr = new Date(tx.date).toISOString().split('T')[0];
    return txDateStr <= asOfDate;
  });

  // 1. ASSETS CALCULATION
  // A. Cash & Bank Balances per account
  const accountBalances = paymentAccounts.map(acc => {
    const opening = Number(acc.openingBalance || 0);
    const accTx = validTransactions.filter(tx => {
      return tx.paymentAccountId === acc.id;
    });

    const inflow = accTx
      .filter(tx => ['sale', 'payment_received', 'money_receipt', 'income', 'purchase_return', 'deposit', 'transfer_in'].includes(tx.type))
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const outflow = accTx
      .filter(tx => ['purchase', 'payment_made', 'expense', 'salary', 'conveyance', 'sale_return', 'withdrawal', 'transfer_out'].includes(tx.type))
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    return {
      ...acc,
      currentBalance: opening + inflow - outflow,
    };
  });

  const totalCashAndBank = accountBalances.reduce((sum, a) => sum + a.currentBalance, 0);

  // B. Inventory Valuation (Stock * Cost Price / Selling Price)
  const totalInventoryStockQty = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const totalInventoryValuation = products.reduce((sum, p) => {
    const unitCost = Number(p.costPrice) || Number(p.price) || 0;
    const qty = Number(p.stock) || 0;
    return sum + (unitCost * qty);
  }, 0);

  // C. Accounts Receivable (Customer Dues up to asOfDate)
  const customerReceivables = customers.map(c => {
    const cTx = validTransactions.filter(tx => tx.entityId === c.id || tx.entityName === c.name);
    const debits = cTx.filter(tx => ['sale', 'opening_balance'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const credits = cTx.filter(tx => ['payment_received', 'money_receipt', 'sale_return', 'return'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    return Math.max(0, debits - credits);
  });
  
  const totalReceivables = customerReceivables.reduce((sum, val) => sum + val, 0);

  const totalAssets = totalCashAndBank + totalInventoryValuation + totalReceivables;

  // 2. LIABILITIES CALCULATION
  // A. Accounts Payable (Vendor / Supplier Pending Dues)
  // Sum of purchase transactions minus payments made to vendors
  const vendorPayables = vendors.map(v => {
    const vTx = validTransactions.filter(tx => tx.entityId === v.id || tx.entityName === v.name);
    const credits = vTx.filter(tx => ['purchase', 'opening_balance'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const debits = vTx.filter(tx => ['payment_made', 'purchase_return', 'return'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const balance = credits - debits;
    return {
      ...v,
      payable: Math.max(0, balance),
    };
  });

  const totalAccountsPayable = vendorPayables.reduce((sum, v) => sum + v.payable, 0);
  const totalLiabilities = totalAccountsPayable;

  // 3. EQUITY / CAPITAL CALCULATION
  // Equity = Assets - Liabilities (Retained Earnings & Owner's Capital)
  const totalEquity = totalAssets - totalLiabilities;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Category', 'Sub-Account / Head', 'Amount (৳)'];
    const rows = [
      ['ASSETS', '--- CURRENT ASSETS ---', ''],
      ...accountBalances.map(a => ['Cash & Bank', `${a.name} (${a.type})`, a.currentBalance]),
      ['Inventory', `Inventory Stock Value (${totalInventoryStockQty} units)`, totalInventoryValuation],
      ['Receivables', 'Accounts Receivable (Customer Dues)', totalReceivables],
      ['TOTAL ASSETS', 'Total Business Assets', totalAssets],
      ['', '', ''],
      ['LIABILITIES', '--- CURRENT LIABILITIES ---', ''],
      ...vendorPayables.filter(v => v.payable > 0).map(v => ['Accounts Payable', `Due to ${v.name}`, v.payable]),
      ['TOTAL LIABILITIES', 'Total Current Liabilities', totalLiabilities],
      ['', '', ''],
      ['EQUITY', '--- OWNER\'S EQUITY ---', ''],
      ['Owner Equity', 'Retained Earnings & Accumulated Capital', totalEquity],
      ['TOTAL LIABILITIES & EQUITY', 'Balanced Total', totalLiabilitiesAndEquity],
    ];

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Balance_Sheet_as_of_${asOfDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(settings?.siteName || 'Click2IT', 14, 18);
    doc.setFontSize(11);
    doc.text('Statement of Financial Position (Balance Sheet)', 14, 25);
    doc.setFontSize(9);
    doc.text(`As of Date: ${new Date(asOfDate).toLocaleDateString()} | Generated: ${new Date().toLocaleDateString()}`, 14, 31);

    const assetRows = [
      ['ASSETS', '', ''],
      ['  Liquid Cash & Bank Balances', '', formatCurrency(totalCashAndBank, settings)],
      ...accountBalances.map(a => [`    • ${a.name} (${a.type})`, formatCurrency(a.currentBalance, settings), '']),
      ['  Merchandise Inventory Stock Value', `${totalInventoryStockQty} Items`, formatCurrency(totalInventoryValuation, settings)],
      ['  Accounts Receivable (Customer Dues)', '', formatCurrency(totalReceivables, settings)],
      ['TOTAL ASSETS', '', formatCurrency(totalAssets, settings)],
    ];

    const liabilityRows = [
      ['LIABILITIES & EQUITY', '', ''],
      ['  Accounts Payable (Supplier Dues)', '', formatCurrency(totalAccountsPayable, settings)],
      ['TOTAL LIABILITIES', '', formatCurrency(totalLiabilities, settings)],
      ['  Owner\'s Equity & Retained Earnings', '', formatCurrency(totalEquity, settings)],
      ['TOTAL LIABILITIES & EQUITY', '', formatCurrency(totalLiabilitiesAndEquity, settings)],
    ];

    autoTable(doc, {
      startY: 36,
      head: [['Financial Category / Account', 'Details', 'Amount (৳)']],
      body: [...assetRows, ['', '', ''], ...liabilityRows],
      theme: 'striped',
      headStyles: { fillColor: [8, 22, 33] },
      styles: { fontSize: 8 },
    });

    doc.save(`Balance_Sheet_${asOfDate}.pdf`);
  };

  if (!hasPermission('manage_finances')) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden space-y-6">
      {/* Top Header & As of Date */}
      <div className="p-6 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Scale className="text-[#EF4444]" /> Balance Sheet Statement
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Statement of Financial Position: Assets, Liabilities, and Owner's Equity as of a specific date.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <label className="text-[10px] font-bold text-gray-500 uppercase">As of Date</label>
            <input
              type="date"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
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
            <Printer size={14} /> PDF Sheet
          </button>
        </div>
      </div>

      {/* Summary KPI Equilibrium Cards */}
      <div className="px-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Assets Card */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Total Assets</span>
            <DollarSign size={18} className="text-blue-600" />
          </div>
          <span className="text-2xl font-black text-blue-950 mt-2 block">
            {formatCurrency(totalAssets, settings)}
          </span>
          <span className="text-[10px] text-blue-700 mt-1 block">Cash + Stock Value + Receivables</span>
        </div>

        {/* Total Liabilities Card */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Total Liabilities</span>
            <AlertCircle size={18} className="text-amber-600" />
          </div>
          <span className="text-2xl font-black text-amber-950 mt-2 block">
            {formatCurrency(totalLiabilities, settings)}
          </span>
          <span className="text-[10px] text-amber-700 mt-1 block">Accounts Payable & Supplier Dues</span>
        </div>

        {/* Total Equity Card */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Owner's Net Equity</span>
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-950 mt-2 block">
            {formatCurrency(totalEquity, settings)}
          </span>
          <span className="text-[10px] text-emerald-700 mt-1 block">Retained Earnings (Assets − Liabilities)</span>
        </div>
      </div>

      {/* Side-by-Side Dual Ledger Breakdown */}
      <div className="px-6 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {/* ── LEFT: ASSETS ── */}
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-gradient-to-r from-blue-900 to-[#081621] text-white flex items-center justify-between">
            <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
              <DollarSign size={16} className="text-blue-400" /> Assets (সম্পদ)
            </h3>
            <span className="font-black text-base text-blue-200">{formatCurrency(totalAssets, settings)}</span>
          </div>

          <div className="p-4 space-y-4 text-xs">
            {/* 1. Cash & Bank */}
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 space-y-2">
              <div className="flex justify-between items-center font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Building size={14} className="text-blue-600" /> Cash & Bank Balances
                </span>
                <span className="text-blue-700">{formatCurrency(totalCashAndBank, settings)}</span>
              </div>
              <div className="space-y-1 pl-4 text-gray-600">
                {accountBalances.map(acc => (
                  <div key={acc.id} className="flex justify-between py-0.5">
                    <span>{acc.name} <span className="text-[10px] text-gray-400">({acc.type})</span></span>
                    <span className="font-mono font-medium text-gray-800">{formatCurrency(acc.currentBalance, settings)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Merchandise Inventory */}
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 space-y-2">
              <div className="flex justify-between items-center font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Package size={14} className="text-green-600" /> Inventory Stock Valuation
                </span>
                <span className="text-green-700">{formatCurrency(totalInventoryValuation, settings)}</span>
              </div>
              <div className="flex justify-between pl-4 text-gray-600 pt-1">
                <span>Total On-Hand Quantity</span>
                <span className="font-mono font-bold text-gray-800">{totalInventoryStockQty.toLocaleString()} Units</span>
              </div>
              <div className="flex justify-between pl-4 text-gray-600">
                <span>Active Product SKUs</span>
                <span className="font-mono text-gray-800">{products.length} Products</span>
              </div>
            </div>

            {/* 3. Accounts Receivable */}
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 space-y-2">
              <div className="flex justify-between items-center font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="text-purple-600" /> Accounts Receivable (Customer Due)
                </span>
                <span className="text-purple-700">{formatCurrency(totalReceivables, settings)}</span>
              </div>
              <div className="flex justify-between pl-4 text-gray-600 pt-1">
                <span>Customer Unpaid Invoices</span>
                <span className="font-mono font-bold text-gray-800">{formatCurrency(totalReceivables, settings)}</span>
              </div>
            </div>

            {/* Total Asset Footer */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center font-black text-sm text-blue-900">
              <span>TOTAL ASSETS</span>
              <span>{formatCurrency(totalAssets, settings)}</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: LIABILITIES & EQUITY ── */}
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-gradient-to-r from-[#081621] to-red-950 text-white flex items-center justify-between">
            <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
              <Scale size={16} className="text-red-400" /> Liabilities & Equity (দায় ও মূলধন)
            </h3>
            <span className="font-black text-base text-red-200">{formatCurrency(totalLiabilitiesAndEquity, settings)}</span>
          </div>

          <div className="p-4 space-y-4 text-xs">
            {/* 1. Liabilities */}
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 space-y-2">
              <div className="flex justify-between items-center font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Briefcase size={14} className="text-red-600" /> Accounts Payable (Supplier Dues)
                </span>
                <span className="text-red-700">{formatCurrency(totalAccountsPayable, settings)}</span>
              </div>
              <div className="space-y-1 pl-4 text-gray-600 max-h-32 overflow-y-auto">
                {vendorPayables.filter(v => v.payable > 0).length === 0 ? (
                  <span className="text-gray-400 italic">No supplier payable dues recorded.</span>
                ) : (
                  vendorPayables.filter(v => v.payable > 0).map(v => (
                    <div key={v.id} className="flex justify-between py-0.5">
                      <span>{v.name}</span>
                      <span className="font-mono font-medium text-red-600">{formatCurrency(v.payable, settings)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Total Liabilities Subtotal */}
            <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg flex justify-between items-center font-bold text-amber-900">
              <span>Total Current Liabilities</span>
              <span>{formatCurrency(totalLiabilities, settings)}</span>
            </div>

            {/* 2. Equity */}
            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50 space-y-2">
              <div className="flex justify-between items-center font-bold text-gray-900 border-b border-gray-200 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-emerald-600" /> Owner's Equity & Retained Earnings
                </span>
                <span className="text-emerald-700">{formatCurrency(totalEquity, settings)}</span>
              </div>
              <div className="space-y-1 pl-4 text-gray-600 pt-1">
                <div className="flex justify-between">
                  <span>Net Retained Earnings</span>
                  <span className="font-mono font-bold text-emerald-700">{formatCurrency(totalEquity, settings)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Accounting Equation</span>
                  <span>Assets = Liabilities + Equity</span>
                </div>
              </div>
            </div>

            {/* Total Liabilities & Equity Footer */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center font-black text-sm text-emerald-900">
              <span>TOTAL LIABILITIES & EQUITY</span>
              <span>{formatCurrency(totalLiabilitiesAndEquity, settings)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheet;
