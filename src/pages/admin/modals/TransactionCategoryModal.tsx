import React from 'react';
import { XCircle, X, FileText, Upload, Cpu, Fan, Server, Database, HardDrive, Monitor, Plug, Keyboard, Mouse, Speaker, Headphones, Wifi, ShieldCheck, BatteryCharging, Download, Search } from 'lucide-react';
import { formatCurrency, cn } from '../../../lib/utils';
import { useSettings } from '../../../context/SettingsContext';

interface TransactionCategoryModalProps {
  isAddingTransactionCategory: boolean;
  setIsAddingTransactionCategory: (v: boolean) => void;
  newTransactionCategory: any;
  setNewTransactionCategory: (v: any) => void;
  handleSaveTransactionCategory: (e: any) => void;
}

export const TransactionCategoryModal: React.FC<TransactionCategoryModalProps> = ({ isAddingTransactionCategory, setIsAddingTransactionCategory, newTransactionCategory, setNewTransactionCategory, handleSaveTransactionCategory }) => {
  const { settings } = useSettings();


  return (
    <>
      {/* Transaction Category Modal */}
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
    </>
  );
};
