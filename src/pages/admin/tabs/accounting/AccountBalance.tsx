import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { PaymentAccount, Customer, Vendor, Transaction, Order } from '../../../../types';
import { formatCurrency, cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../../../context/SettingsContext';
import {
  CreditCard,
  Building,
  Users,
  Calendar,
  RefreshCw,
  Wallet,
} from 'lucide-react';

interface AccountBalanceProps {
  setSelectedLedgerEntity?: (v: any) => void;
  setActiveTab?: (tab: string) => void;
}

const AccountBalanceTab: React.FC<AccountBalanceProps> = ({ setSelectedLedgerEntity, setActiveTab }) => {
  const { settings } = useSettings();
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState<boolean>(true);

  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const [accSnap, custSnap, vendSnap, txSnap, ordSnap] = await Promise.all([
        getDocs(query(collection(db, 'payment_accounts'), orderBy('name'))),
        getDocs(query(collection(db, 'customers'), orderBy('name'))),
        getDocs(query(collection(db, 'vendors'), orderBy('name'))),
        getDocs(query(collection(db, 'transactions'), orderBy('date', 'asc'))),
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'asc'))),
      ]);

      setPaymentAccounts(accSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentAccount)));
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
      setVendors(vendSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
      setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
      setOrders(ordSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load account balances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const validTransactions = transactions.filter(tx => tx.date.split('T')[0] <= asOfDate);
  const validOrders = orders.filter(o => o.createdAt.split('T')[0] <= asOfDate && o.status !== 'cancelled');

  // Compute Balances
  const accountBalances = paymentAccounts.map(acc => {
    const opening = Number(acc.openingBalance || 0);
    const accTx = validTransactions.filter(tx => tx.paymentAccountId === acc.id);
    const inflow = accTx.filter(tx => ['sale', 'payment_received', 'money_receipt', 'income', 'purchase_return', 'deposit', 'transfer_in'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const outflow = accTx.filter(tx => ['purchase', 'payment_made', 'expense', 'salary', 'conveyance', 'sale_return', 'withdrawal', 'transfer_out'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    return { ...acc, currentBalance: opening + inflow - outflow };
  });

  const customerBalances = customers.map(c => {
    const cTx = validTransactions.filter(tx => tx.entityId === c.id || tx.entityName === c.name);
    const debits = cTx.filter(tx => ['sale', 'opening_balance'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const credits = cTx.filter(tx => ['payment_received', 'money_receipt', 'sale_return', 'return'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    return { ...c, currentBalance: Math.max(0, debits - credits) };
  }).filter(c => c.currentBalance > 0);

  const vendorBalances = vendors.map(v => {
    const vTx = validTransactions.filter(tx => tx.entityId === v.id || tx.entityName === v.name);
    const credits = vTx.filter(tx => ['purchase', 'opening_balance'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const debits = vTx.filter(tx => ['payment_made', 'purchase_return', 'return'].includes(tx.type)).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    return { ...v, currentBalance: Math.max(0, credits - debits) };
  }).filter(v => v.currentBalance > 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 uppercase tracking-tight">
            <Wallet className="text-blue-600 w-6 h-6" /> Account Balances
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
            <button onClick={fetchFinancialData} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors shadow-sm">
              <RefreshCw size={18} className={cn(loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Accounts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-blue-50/50 border-b border-gray-100 flex items-center gap-2">
              <CreditCard className="text-blue-600" size={18} />
              <h3 className="font-bold text-gray-800">Cash & Bank Accounts</h3>
            </div>
            <div className="divide-y divide-gray-100 flex-1 overflow-y-auto max-h-[500px]">
              {accountBalances.length === 0 && <p className="text-gray-400 text-sm p-6 text-center">No accounts found</p>}
              {accountBalances.map(acc => (
                <div key={acc.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div>
                    <p className="font-bold text-sm text-gray-800">{acc.name}</p>
                    <p className="text-xs text-gray-500 uppercase">{acc.type}</p>
                  </div>
                  <span className="font-black text-gray-900">{formatCurrency(acc.currentBalance, settings)}</span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <span className="font-bold text-xs uppercase text-gray-500">Total Liquid Assets</span>
              <span className="font-black text-blue-700">{formatCurrency(accountBalances.reduce((s, a) => s + a.currentBalance, 0), settings)}</span>
            </div>
          </div>

          {/* Customers (Receivables) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-emerald-50/50 border-b border-gray-100 flex items-center gap-2">
              <Users className="text-emerald-600" size={18} />
              <h3 className="font-bold text-gray-800">Accounts Receivable (Due)</h3>
            </div>
            <div className="divide-y divide-gray-100 flex-1 overflow-y-auto max-h-[500px]">
              {customerBalances.length === 0 && <p className="text-gray-400 text-sm p-6 text-center">No customer dues</p>}
              {customerBalances.map(c => (
                <div key={c.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => {
                  if (setSelectedLedgerEntity && setActiveTab) {
                    setSelectedLedgerEntity({ id: c.id, name: c.name, type: 'customer' });
                    setActiveTab('ledger');
                  }
                }}>
                  <div>
                    <p className="font-bold text-sm text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.phone}</p>
                  </div>
                  <span className="font-black text-red-600">{formatCurrency(c.currentBalance, settings)}</span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <span className="font-bold text-xs uppercase text-gray-500">Total Receivables</span>
              <span className="font-black text-emerald-700">{formatCurrency(customerBalances.reduce((s, c) => s + c.currentBalance, 0), settings)}</span>
            </div>
          </div>

          {/* Vendors (Payables) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-rose-50/50 border-b border-gray-100 flex items-center gap-2">
              <Building className="text-rose-600" size={18} />
              <h3 className="font-bold text-gray-800">Accounts Payable (Due)</h3>
            </div>
            <div className="divide-y divide-gray-100 flex-1 overflow-y-auto max-h-[500px]">
              {vendorBalances.length === 0 && <p className="text-gray-400 text-sm p-6 text-center">No vendor payables</p>}
              {vendorBalances.map(v => (
                <div key={v.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => {
                  if (setSelectedLedgerEntity && setActiveTab) {
                    setSelectedLedgerEntity({ id: v.id, name: v.name, type: 'vendor' });
                    setActiveTab('ledger');
                  }
                }}>
                  <div>
                    <p className="font-bold text-sm text-gray-800">{v.name}</p>
                    <p className="text-xs text-gray-500">{v.phone}</p>
                  </div>
                  <span className="font-black text-rose-600">{formatCurrency(v.currentBalance, settings)}</span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <span className="font-bold text-xs uppercase text-gray-500">Total Payables</span>
              <span className="font-black text-rose-700">{formatCurrency(vendorBalances.reduce((s, v) => s + v.currentBalance, 0), settings)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountBalanceTab;
