import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { TransactionCategory } from '../../../../types';
import { cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import {
  Plus,
  XCircle,
  List,
  Trash2,
} from 'lucide-react';

const TxCategoriesTab: React.FC = () => {
  const { hasPermission } = useAuth();
  const [transactionCategories, setTransactionCategories] = useState<TransactionCategory[]>([]);
  const [isAddingTransactionCategory, setIsAddingTransactionCategory] = useState(false);
  const [newTransactionCategory, setNewTransactionCategory] = useState<Partial<TransactionCategory>>({ name: '', type: 'expense', description: '' });

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'transaction_categories'), orderBy('name'));
      const snap = await getDocs(q);
      setTransactionCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as TransactionCategory)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load categories');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSaveTransactionCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransactionCategory.name) return;

    try {
      const category: Omit<TransactionCategory, 'id'> = {
        name: newTransactionCategory.name,
        type: newTransactionCategory.type as 'income' | 'expense',
        description: newTransactionCategory.description || '',
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'transaction_categories'), category);
      setTransactionCategories([...transactionCategories, { id: docRef.id, ...category } as TransactionCategory]);
      setIsAddingTransactionCategory(false);
      setNewTransactionCategory({ name: '', type: 'expense', description: '' });
      toast.success('Category added successfully');
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  if (!hasPermission('manage_finances')) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <List className="text-[#EF4444]" /> Income & Expense Categories
        </h2>
        <button
          onClick={() => {
            setNewTransactionCategory({name: '', type: 'expense', description: ''});
            setIsAddingTransactionCategory(true);
          }}
          className="bg-[#EF4444] text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-red-600 transition-all font-bold text-sm"
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      <div className="p-6 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Created Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactionCategories.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-bold">{cat.name}</td>
                <td className="px-6 py-4">
                  <span className={cn("px-2 py-1 text-[10px] font-bold rounded-full uppercase", cat.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                    {cat.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{cat.description}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(cat.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {transactionCategories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">No categories found. Create one.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAddingTransactionCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Category</h2>
              <button onClick={() => setIsAddingTransactionCategory(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveTransactionCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newTransactionCategory.name}
                  onChange={e => setNewTransactionCategory({ ...newTransactionCategory, name: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                <select
                  required
                  value={newTransactionCategory.type}
                  onChange={e => setNewTransactionCategory({ ...newTransactionCategory, type: e.target.value as 'income' | 'expense' })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444]"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={newTransactionCategory.description}
                  onChange={e => setNewTransactionCategory({ ...newTransactionCategory, description: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444]"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAddingTransactionCategory(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-md font-bold hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-[#EF4444] text-white rounded-md font-bold hover:bg-red-600">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TxCategoriesTab;
