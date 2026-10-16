import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { formatCurrency, cn } from '../../../../lib/utils';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import { Truck, Plus, Trash2 } from 'lucide-react';

interface Conveyance {
  id: string;
  date: string;
  description: string;
  amount: number;
  employee: string;
}

const ConveyanceTab: React.FC = () => {
  const { isAdmin, hasPermission } = useAuth();
  const { settings } = useSettings();
  const [conveyances, setConveyances] = useState<Conveyance[]>([]);
  const [isAddingConveyance, setIsAddingConveyance] = useState(false);
  const [newConveyance, setNewConveyance] = useState({date: new Date().toISOString().split('T')[0], description: '', amount: 0, employee: ''});

  useEffect(() => {
    const fetchConveyances = async () => {
      try {
        const q = query(collection(db, 'conveyances'), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        setConveyances(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conveyance)));
      } catch (err) {
        console.error(err);
        toast.error('Failed to load conveyances');
      }
    };
    fetchConveyances();
  }, []);

  const handleSaveConveyance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConveyance.description || newConveyance.amount <= 0) return;
    try {
      const docRef = await addDoc(collection(db, 'conveyances'), {
        ...newConveyance,
        createdAt: new Date().toISOString(),
      });
      setConveyances([{ id: docRef.id, ...newConveyance }, ...conveyances]);
      setIsAddingConveyance(false);
      setNewConveyance({date: new Date().toISOString().split('T')[0], description: '', amount: 0, employee: ''});
      toast.success('Conveyance added successfully');
    } catch (error) {
      console.error('Error saving conveyance:', error);
      toast.error('Failed to save conveyance');
    }
  };

  const handleDeleteConveyance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conveyance?')) return;
    try {
      await deleteDoc(doc(db, 'conveyances', id));
      setConveyances(conveyances.filter(c => c.id !== id));
      toast.success('Conveyance deleted');
    } catch (error) {
      console.error('Error deleting conveyance:', error);
      toast.error('Failed to delete conveyance');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Truck className="text-[#EF4444]" /> Employee Transport Conveyance
        </h2>
        <button
          onClick={() => setIsAddingConveyance(true)}
          className="bg-[#EF4444] text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-red-600 transition-all font-bold text-sm"
        >
          <Plus size={18} /> Add Conveyance
        </button>
      </div>

      {isAddingConveyance && (
        <form onSubmit={handleSaveConveyance} className="p-6 bg-gray-50 border-b border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
              <input
                type="date"
                required
                value={newConveyance.date}
                onChange={e => setNewConveyance({ ...newConveyance, date: e.target.value })}
                className="w-full border-gray-200 rounded-md focus:ring-[#EF4444]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Employee Name</label>
              <input
                type="text"
                required
                value={newConveyance.employee}
                onChange={e => setNewConveyance({ ...newConveyance, employee: e.target.value })}
                className="w-full border-gray-200 rounded-md focus:ring-[#EF4444]"
                placeholder="Employee Name"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
              <input
                type="text"
                required
                value={newConveyance.description}
                onChange={e => setNewConveyance({ ...newConveyance, description: e.target.value })}
                className="w-full border-gray-200 rounded-md focus:ring-[#EF4444]"
                placeholder="Transport from A to B"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={newConveyance.amount}
                onChange={e => setNewConveyance({ ...newConveyance, amount: parseFloat(e.target.value) || 0 })}
                className="w-full border-gray-200 rounded-md focus:ring-[#EF4444]"
              />
            </div>
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setIsAddingConveyance(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-md font-bold hover:bg-gray-50">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2 bg-[#EF4444] text-white rounded-md font-bold hover:bg-red-600">Save</button>
            </div>
          </div>
        </form>
      )}

      <div className="p-6 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Employee</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {conveyances.length > 0 ? (
              conveyances.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{c.date}</td>
                  <td className="px-6 py-4 text-sm font-bold">{c.employee || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{c.description}</td>
                  <td className="px-6 py-4 text-sm font-bold text-right">{formatCurrency(c.amount, settings)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDeleteConveyance(c.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No conveyance records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConveyanceTab;
