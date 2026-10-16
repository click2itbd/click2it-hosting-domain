import React from 'react';
import { XCircle, X, FileText, Upload, Cpu, Fan, Server, Database, HardDrive, Monitor, Plug, Keyboard, Mouse, Speaker, Headphones, Wifi, ShieldCheck, BatteryCharging, Download, Search } from 'lucide-react';
import { formatCurrency, cn } from '../../../lib/utils';
import { useSettings } from '../../../context/SettingsContext';

interface ManualTransactionModalProps {
  isAddingManualTransaction: boolean;
  setIsAddingManualTransaction: (v: boolean) => void;
  manualTransactionType: string;
  newManualTransaction: any;
  setNewManualTransaction: (v: any) => void;
  handleSaveManualTransaction: (e: any) => void;
  transactionCategories: any[];
}

export const ManualTransactionModal: React.FC<ManualTransactionModalProps> = ({ isAddingManualTransaction, setIsAddingManualTransaction, manualTransactionType, newManualTransaction, setNewManualTransaction, handleSaveManualTransaction, transactionCategories }) => {
  const { settings } = useSettings();


  return (
    <>
      {/* Manual Transaction Modal */}
      {isAddingManualTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Record Manual {manualTransactionType === 'income' ? 'Income' : 'Expense'}</h2>
              <button onClick={() => setIsAddingManualTransaction(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveManualTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={newManualTransaction.date}
                  onChange={e => setNewManualTransaction({ ...newManualTransaction, date: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category (Optional)</label>
                <select
                  value={newManualTransaction.categoryId || ''}
                  onChange={e => setNewManualTransaction({ ...newManualTransaction, categoryId: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444]"
                >
                  <option value="">Uncategorized</option>
                  {transactionCategories.filter(c => c.type === manualTransactionType).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={newManualTransaction.amount || ''}
                  onChange={e => setNewManualTransaction({ ...newManualTransaction, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={newManualTransaction.description}
                  onChange={e => setNewManualTransaction({ ...newManualTransaction, description: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444]"
                  placeholder="e.g. Office Supplies, Salary, etc."
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAddingManualTransaction(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-md font-bold hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-[#EF4444] text-white rounded-md font-bold hover:bg-red-600">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
