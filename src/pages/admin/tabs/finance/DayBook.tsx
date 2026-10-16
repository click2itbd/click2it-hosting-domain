import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, doc, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { CashRegister, Order, Transaction } from '../../../../types';
import { useAuth } from '../../../../context/AuthContext';
import { Wallet, Calculator, ArrowUpRight, ArrowDownRight, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { formatCurrency, cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';

export default function DayBook() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  
  const [openingBalance, setOpeningBalance] = useState<string>('');
  const [closingBalance, setClosingBalance] = useState<string>('');
  
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    expectedBalance: 0
  });

  const fetchRegisters = async () => {
    try {
      const q = query(collection(db, 'cash_register'), orderBy('openedAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CashRegister));
      setRegisters(data);
      
      const openReg = data.find(r => r.status === 'open');
      if (openReg) {
        setActiveRegister(openReg);
        await calculateStats(openReg);
      } else {
        setActiveRegister(null);
      }
    } catch (error) {
      console.error('Error fetching cash registers:', error);
      toast.error('Failed to load Day Book');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async (register: CashRegister) => {
    try {
      let income = 0;
      let expense = 0;

      // Inflow & Outflow from real transaction records
      const txQ = query(collection(db, 'transactions'), where('createdAt', '>=', register.openedAt));
      const txSnap = await getDocs(txQ);
      const coveredOrderIds = new Set<string>();

      txSnap.docs.forEach(d => {
        const tx = d.data() as Transaction;
        if (tx.referenceId) {
          coveredOrderIds.add(tx.referenceId);
        }
        if (tx.paymentMethod?.toLowerCase().includes('cash')) {
          const type = tx.type;
          // Actual cash inflows and outflows
          if (['income', 'payment_received', 'money_receipt'].includes(type)) {
            income += Number(tx.amount || 0);
          } else if (['expense', 'payment_made', 'salary', 'conveyance'].includes(type)) {
            expense += Number(tx.amount || 0);
          }
        }
      });

      // Also check cash orders that didn't generate a transaction entry (avoids duplicate counting)
      const ordersQ = query(collection(db, 'orders'), where('createdAt', '>=', register.openedAt));
      const ordersSnap = await getDocs(ordersQ);
      ordersSnap.docs.forEach(d => {
        if (!coveredOrderIds.has(d.id)) {
          const order = d.data() as Order;
          if (order.paymentMethod?.toLowerCase().includes('cash')) {
            income += Number(order.amountPaid ?? order.total ?? 0);
          }
        }
      });

      setStats({
        totalIncome: income,
        totalExpense: expense,
        expectedBalance: Number(register.openingBalance || 0) + income - expense
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  useEffect(() => {
    fetchRegisters();
  }, []);

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openingBalance) return;
    
    try {
      const newReg: Omit<CashRegister, 'id'> = {
        openedAt: new Date().toISOString(),
        openedBy: profile?.displayName || 'Unknown',
        openingBalance: Number(openingBalance),
        status: 'open'
      };
      
      await addDoc(collection(db, 'cash_register'), newReg);
      toast.success('Register opened successfully');
      setOpeningBalance('');
      fetchRegisters();
    } catch (error) {
      console.error('Error opening register:', error);
      toast.error('Failed to open register');
    }
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRegister || !activeRegister.id || !closingBalance) return;
    
    try {
      const actualCount = Number(closingBalance);
      const discrepancy = actualCount - stats.expectedBalance;
      
      await updateDoc(doc(db, 'cash_register', activeRegister.id), {
        status: 'closed',
        closedAt: new Date().toISOString(),
        closedBy: profile?.displayName || 'Unknown',
        closingBalance: actualCount,
        expectedBalance: stats.expectedBalance,
        discrepancy
      });
      
      toast.success('Register closed successfully');
      setClosingBalance('');
      fetchRegisters();
    } catch (error) {
      console.error('Error closing register:', error);
      toast.error('Failed to close register');
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Wallet className="text-blue-600" />
          Day Book / Cash Drawer
        </h1>
      </div>

      {!activeRegister ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calculator size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Open Register</h2>
          <p className="text-gray-500 mb-6 text-sm">Enter the starting cash amount to begin the day.</p>
          
          <form onSubmit={handleOpenRegister} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance (Cash in Drawer)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open Register
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Active Register</h2>
                  <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                    <Clock size={14} /> Opened {new Date(activeRegister.openedAt).toLocaleString()} by {activeRegister.openedBy}
                  </p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
                  Open
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-gray-500 text-xs font-medium uppercase mb-1">Opening Balance</div>
                  <div className="text-lg font-bold text-gray-800">{formatCurrency(activeRegister.openingBalance)}</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-blue-600 text-xs font-medium uppercase mb-1 flex items-center gap-1">
                    <ArrowUpRight size={14} /> Cash In
                  </div>
                  <div className="text-lg font-bold text-blue-700">{formatCurrency(stats.totalIncome)}</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-red-600 text-xs font-medium uppercase mb-1 flex items-center gap-1">
                    <ArrowDownRight size={14} /> Cash Out
                  </div>
                  <div className="text-lg font-bold text-red-700">{formatCurrency(stats.totalExpense)}</div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="text-emerald-700 text-xs font-medium uppercase mb-1 flex items-center gap-1">
                    <DollarSign size={14} /> Expected Cash
                  </div>
                  <div className="text-xl font-bold text-emerald-700">{formatCurrency(stats.expectedBalance)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Close Register</h3>
            <form onSubmit={handleCloseRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actual Cash Counted</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={closingBalance}
                  onChange={e => setClosingBalance(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              
              {closingBalance !== '' && (
                <div className={cn(
                  "p-3 rounded-lg text-sm font-medium flex items-center justify-between",
                  (Number(closingBalance) - stats.expectedBalance) === 0 ? "bg-green-50 text-green-700" :
                  (Number(closingBalance) - stats.expectedBalance) > 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"
                )}>
                  <span>Discrepancy:</span>
                  <span>{formatCurrency(Number(closingBalance) - stats.expectedBalance)}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gray-800 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-900 transition-colors"
              >
                Close Register
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Register History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-3">Opened</th>
                <th className="px-6 py-3">Closed</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Opening</th>
                <th className="px-6 py-3">Expected</th>
                <th className="px-6 py-3">Actual</th>
                <th className="px-6 py-3">Discrepancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {registers.filter(r => r.status === 'closed').map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(r.openedAt).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{r.closedAt ? new Date(r.closedAt).toLocaleString() : '-'}</td>
                  <td className="px-6 py-4">{r.openedBy}</td>
                  <td className="px-6 py-4 font-medium text-gray-700">{formatCurrency(r.openingBalance)}</td>
                  <td className="px-6 py-4 text-gray-500">{formatCurrency(r.expectedBalance || 0)}</td>
                  <td className="px-6 py-4 font-bold text-gray-800">{formatCurrency(r.closingBalance || 0)}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      (r.discrepancy || 0) === 0 ? "bg-green-100 text-green-700" :
                      (r.discrepancy || 0) > 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                    )}>
                      {formatCurrency(r.discrepancy || 0)}
                    </span>
                  </td>
                </tr>
              ))}
              {registers.filter(r => r.status === 'closed').length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No closed registers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
