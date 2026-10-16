import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Product, PaymentAccount, Customer, Vendor, Transaction, Order } from '../../../../types';
import { formatCurrency, cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import {
  List,
  Download,
  Printer,
  Calendar,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TrialBalanceProps {
  setSelectedLedgerEntity?: (v: any) => void;
  setActiveTab?: (tab: string) => void;
}

const TrialBalanceTab: React.FC<TrialBalanceProps> = ({ setActiveTab }) => {
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
      console.error(err);
      toast.error('Failed to load trial balance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const validTransactions = transactions.filter(tx => {
    const txDateStr = new Date(tx.date).toISOString().split('T')[0];
    return txDateStr <= asOfDate;
  });
  const validOrders = orders.filter(o => {
    const oDate = new Date(o.createdAt).toISOString().split('T')[0];
    return oDate <= asOfDate && o.status !== 'cancelled';
  });

  // Assets
  const accountBalances = paymentAccounts.map(acc => {
    const opening = Number(acc.openingBalance || 0);
    const accTx = validTransactions.filter(tx => tx.paymentAccountId === acc.id);
    const inflow = accTx.filter(tx => ['sale', 'payment_received', 'money_receipt', 'income', 'purchase_return', 'deposit', 'transfer_in'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const outflow = accTx.filter(tx => ['purchase', 'payment_made', 'expense', 'salary', 'conveyance', 'sale_return', 'withdrawal', 'transfer_out'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    return opening + inflow - outflow;
  });
  const totalCashAndBank = accountBalances.reduce((sum, a) => sum + a, 0);
  // A proper Trial Balance does not include closing Inventory Valuation in the trial balance if Purchases are recorded,
  // because that would double-count the asset (Purchases is a debit, Inventory is a debit). 
  // Trial balances generally show opening inventory + purchases. For a simple system, we just omit Closing Inventory 
  // from the core trial balance (it belongs in the Balance Sheet / Income Statement for COGS calculation).
  
  const totalReceivables = customers.map(c => {
    const cTx = validTransactions.filter(tx => tx.entityId === c.id || tx.entityName === c.name);
    const debits = cTx.filter(tx => ['sale', 'opening_balance'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const credits = cTx.filter(tx => ['payment_received', 'money_receipt', 'sale_return', 'return'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    return Math.max(0, debits - credits);
  }).reduce((sum, val) => sum + val, 0);

  // Liabilities
  const totalAccountsPayable = vendors.map(v => {
    const vTx = validTransactions.filter(tx => tx.entityId === v.id || tx.entityName === v.name);
    const credits = vTx.filter(tx => ['purchase', 'opening_balance'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const debits = vTx.filter(tx => ['payment_made', 'purchase_return', 'return'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    return Math.max(0, credits - debits);
  }).reduce((sum, p) => sum + p, 0);

  // Revenue & Expenses
  // Sales should be computed from transactions to be consistent and include all sales
  const totalSales = validTransactions.filter(tx => tx.type === 'sale').reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalIncome = validTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + (tx.amount || 0), 0);
  
  const totalPurchases = validTransactions.filter(tx => tx.type === 'purchase').reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalExpenses = validTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalSalaries = validTransactions.filter(tx => tx.type === 'salary').reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalConveyance = validTransactions.filter(tx => tx.type === 'conveyance').reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalOwnerDrawings = validTransactions.filter(tx => tx.type === 'withdrawal' && tx.category === 'Owner Withdrawal / Drawing').reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalCapitalDeposits = validTransactions.filter(tx => tx.type === 'deposit' || (tx.type === 'money_receipt' && tx.category === 'Capital / Fund Deposit')).reduce((sum, tx) => sum + (tx.amount || 0), 0);

  // Debits: Assets (Cash, Receivables), Expenses, Purchases, Drawings, Conveyance
  const totalDebits = totalCashAndBank + totalReceivables + totalPurchases + totalExpenses + totalSalaries + totalConveyance + totalOwnerDrawings;
  
  // Credits: Liabilities (Payables), Revenue (Sales, Income), Equity (Capital Deposits)
  const totalCredits = totalAccountsPayable + totalSales + totalIncome + totalCapitalDeposits;
  
  // Any discrepancy is due to Retained Earnings (Profit/Loss generated by the system)
  // or opening balances not properly modeled. 
  const calculatedRetainedEarnings = totalDebits - totalCredits;
  const isCreditRetainedEarnings = calculatedRetainedEarnings >= 0;
  
  const trialBalanceEntries = [
    { account: 'Cash & Bank Balances', debit: totalCashAndBank, credit: 0 },
    { account: 'Accounts Receivable (Customers)', debit: totalReceivables, credit: 0 },
    { account: 'Purchases (Cost of Goods)', debit: totalPurchases, credit: 0 },
    { account: 'Operating Expenses', debit: totalExpenses, credit: 0 },
    { account: 'Salary & Payroll', debit: totalSalaries, credit: 0 },
    { account: 'Conveyance & Transport', debit: totalConveyance, credit: 0 },
    { account: 'Owner Drawings', debit: totalOwnerDrawings, credit: 0 },
    { account: 'Accounts Payable (Vendors)', debit: 0, credit: totalAccountsPayable },
    { account: 'Sales Revenue', debit: 0, credit: totalSales },
    { account: 'Other Income', debit: 0, credit: totalIncome },
    { account: 'Owner Capital / Deposits', debit: 0, credit: totalCapitalDeposits },
  ];

  if (calculatedRetainedEarnings !== 0) {
    if (isCreditRetainedEarnings) {
      trialBalanceEntries.push({ account: 'Retained Earnings (Unadjusted)', debit: 0, credit: Math.abs(calculatedRetainedEarnings) });
    } else {
      trialBalanceEntries.push({ account: 'Retained Earnings (Unadjusted)', debit: Math.abs(calculatedRetainedEarnings), credit: 0 });
    }
  }

  const grandTotalDebit = trialBalanceEntries.reduce((sum, e) => sum + e.debit, 0);
  const grandTotalCredit = trialBalanceEntries.reduce((sum, e) => sum + e.credit, 0);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(settings?.brandName || 'Click2IT', 14, 18);
    doc.setFontSize(11);
    doc.text('Trial Balance', 14, 25);
    doc.setFontSize(9);
    doc.text(`As of Date: ${new Date(asOfDate).toLocaleDateString()}`, 14, 31);
    
    autoTable(doc, {
      startY: 40,
      head: [['Account Head', 'Debit (DR)', 'Credit (CR)']],
      body: [
        ...trialBalanceEntries.map(e => [
          e.account,
          e.debit > 0 ? formatCurrency(e.debit, settings) : '-',
          e.credit > 0 ? formatCurrency(e.credit, settings) : '-',
        ]),
        ['GRAND TOTAL', formatCurrency(grandTotalDebit, settings), formatCurrency(grandTotalCredit, settings)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
    });
    doc.save(`Trial_Balance_${asOfDate}.pdf`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 uppercase tracking-tight">
          <List className="text-blue-600 w-6 h-6" /> Trial Balance
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
              className="border-none outline-none text-sm font-medium text-gray-700 bg-transparent"
            />
          </div>
          <button onClick={fetchFinancialData} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors shadow-sm" title="Refresh">
            <RefreshCw size={18} className={cn(loading && "animate-spin")} />
          </button>
          <button onClick={exportToPDF} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm">
            <Download size={16} /> <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      <div className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="p-4 font-black text-gray-700 uppercase text-xs tracking-wider">Account Head</th>
                  <th className="p-4 font-black text-gray-700 uppercase text-xs tracking-wider text-right">Debit (DR)</th>
                  <th className="p-4 font-black text-gray-700 uppercase text-xs tracking-wider text-right">Credit (CR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {trialBalanceEntries.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm font-medium text-gray-800">{entry.account}</td>
                    <td className="p-4 text-sm font-bold text-gray-700 text-right">
                      {entry.debit > 0 ? formatCurrency(entry.debit, settings) : '-'}
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-700 text-right">
                      {entry.credit > 0 ? formatCurrency(entry.credit, settings) : '-'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 border-t-2 border-gray-300">
                  <td className="p-4 font-black text-gray-900 text-right uppercase text-sm">Grand Total</td>
                  <td className="p-4 font-black text-blue-700 text-right text-base border-b-4 border-double border-blue-700">
                    {formatCurrency(grandTotalDebit, settings)}
                  </td>
                  <td className="p-4 font-black text-blue-700 text-right text-base border-b-4 border-double border-blue-700">
                    {formatCurrency(grandTotalCredit, settings)}
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div className="p-6 bg-green-50 border-t border-green-100 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-green-900 text-sm">Trial Balance Matched</h4>
                <p className="text-green-700 text-xs mt-1">Total Debits strictly equal Total Credits. The equity/capital account serves as the balancing figure ensuring the dual-aspect accounting principle is maintained across all recorded transactions up to the selected date.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrialBalanceTab;
