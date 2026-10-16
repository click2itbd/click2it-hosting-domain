import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc, deleteDoc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Layout } from '../components/Layout';
import { Transaction, PaymentAccount, TransactionCategory } from '../types';
import { formatCurrency } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { Briefcase, CreditCard, FileText, LayoutDashboard, List } from 'lucide-react';

export const AccountingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'deposits_withdrawals' | 'balance_sheet' | 'trial_balance' | 'statement' | 'categories'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryForm, setCategoryForm] = useState<Partial<TransactionCategory>>({ name: '', type: 'expense', description: '' });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  const handleSaveCategory = async () => {
    if (!categoryForm.name) return;
    try {
      if (editingCategory) {
        // Edit logic
        await updateDoc(doc(db, 'transaction_categories', editingCategory), { ...categoryForm });
        setCategories(prev => prev.map(c => c.id === editingCategory ? { ...c, ...categoryForm } as TransactionCategory : c));
        setEditingCategory(null);
        toast.success('Category updated');
      } else {
        // Add logic
        const docRef = await addDoc(collection(db, 'transaction_categories'), { ...categoryForm, createdAt: new Date().toISOString() });
        setCategories(prev => [...prev, { id: docRef.id, ...categoryForm } as TransactionCategory]);
        toast.success('Category added');
      }
      setCategoryForm({ name: '', type: 'expense', description: '' });
    } catch (e) {
      toast.error('Failed to save category');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const txSnap = await getDocs(query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(200)));
      const accSnap = await getDocs(query(collection(db, 'payment_accounts'), limit(100)));
      const catSnap = await getDocs(query(collection(db, 'transaction_categories'), limit(100)));
      
      setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[]);
      setPaymentAccounts(accSnap.docs.map(d => ({ id: d.id, ...d.data() })) as PaymentAccount[]);
      setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })) as TransactionCategory[]);
    } catch (e) {
      toast.error('Failed to load accounting data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Layout><div className="text-center py-20">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Accounting Dashboard</h1>
        
        <div className="flex gap-4 border-b overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'deposits_withdrawals', label: 'Deposits/Withdrawals', icon: Briefcase },
            { id: 'transactions', label: 'Transaction History', icon: List },
            { id: 'statement', label: 'Account Statement', icon: FileText },
            { id: 'balance_sheet', label: 'Balance Sheet', icon: CreditCard },
            { id: 'trial_balance', label: 'Trial Balance', icon: List },
            { id: 'categories', label: 'Categories', icon: List },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 py-2 px-4 border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-bold mb-2">Total Balance</h3>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(paymentAccounts.reduce((sum, acc) => sum + acc.openingBalance, 0))}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-bold mb-2">Total Transactions</h3>
              <p className="text-2xl font-bold text-gray-800">{transactions.length}</p>
            </div>
          </div>
        )}
        
        {activeTab === 'categories' && (
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h2 className="text-xl font-bold">Transaction Categories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Categories list */}
               {categories.map(cat => (
                <div key={cat.id} className="p-4 border rounded flex justify-between items-center">
                  <div>
                    <div className="font-bold">{cat.name} ({cat.type})</div>
                    <div className="text-sm text-gray-500">{cat.description}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setCategoryForm(cat); setEditingCategory(cat.id); }} className="text-blue-600">Edit</button>
                    <button onClick={async () => {
                        await deleteDoc(doc(db, 'transaction_categories', cat.id));
                        setCategories(prev => prev.filter(c => c.id !== cat.id));
                        toast.success('Category deleted');
                    }} className="text-red-600">Delete</button>
                  </div>
                </div>
              ))}
            </div>
            {/* Add/Edit Form */}
            <div className="p-4 border rounded bg-gray-50 mt-4 space-y-2">
                <h3 className="font-bold">{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
                <input value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} placeholder="Name" className="w-full border p-2 rounded" />
                <select value={categoryForm.type} onChange={e => setCategoryForm({...categoryForm, type: e.target.value as 'income' | 'expense'})} className="w-full border p-2 rounded">
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                </select>
                <textarea value={categoryForm.description} onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} placeholder="Description" className="w-full border p-2 rounded" />
                <button onClick={handleSaveCategory} className="bg-blue-600 text-white px-4 py-2 rounded">{editingCategory ? 'Save Changes' : 'Add Category'}</button>
                {editingCategory && <button onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', type: 'expense', description: '' }); }} className="ml-2 text-gray-500">Cancel</button>}
            </div>
          </div>
        )}
        
        {activeTab === 'transactions' && (
           <div className="bg-white p-6 rounded-lg shadow">
             <table className="w-full">
               <thead>
                 <tr className="border-b">
                   <th className="text-left py-2">Date</th>
                   <th className="text-left py-2">Description</th>
                   <th className="text-left py-2">Type</th>
                   <th className="text-right py-2">Amount</th>
                 </tr>
               </thead>
               <tbody>
                 {transactions.map(tx => (
                   <tr key={tx.id} className="border-b">
                     <td className="py-2">{new Date(tx.date).toLocaleDateString()}</td>
                     <td className="py-2">{tx.description}</td>
                     <td className="py-2 capitalize">{tx.type}</td>
                     <td className="py-2 text-right">{formatCurrency(tx.amount)}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        )}

        {['deposits_withdrawals', 'statement', 'balance_sheet', 'trial_balance'].includes(activeTab) && (
            <div className="bg-white p-12 text-center rounded-lg shadow">
                <h3 className="text-xl font-bold text-gray-700">Feature: {activeTab.replace('_', ' ').toUpperCase()}</h3>
                <p className="text-gray-500 mt-2">This module is under development and will be available in the next update.</p>
            </div>
        )}
      </div>
    </Layout>
  );
};
