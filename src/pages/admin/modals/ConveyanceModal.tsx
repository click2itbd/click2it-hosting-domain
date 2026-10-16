import React from 'react';
import { XCircle, X, FileText, Upload, Cpu, Fan, Server, Database, HardDrive, Monitor, Plug, Keyboard, Mouse, Speaker, Headphones, Wifi, ShieldCheck, BatteryCharging, Download, Search } from 'lucide-react';
import { formatCurrency, cn } from '../../../lib/utils';
import { useSettings } from '../../../context/SettingsContext';

interface ConveyanceModalProps {
  isAddingConveyance: boolean;
  setIsAddingConveyance: (v: boolean) => void;
  newConveyance: any;
  setNewConveyance: (v: any) => void;
  handleSaveConveyance: (e: any) => void;
}

export const ConveyanceModal: React.FC<ConveyanceModalProps> = ({ isAddingConveyance, setIsAddingConveyance, newConveyance, setNewConveyance, handleSaveConveyance }) => {
  const { settings } = useSettings();


  return (
    <>
      {/* Conveyance Modal */}
      {isAddingConveyance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Conveyance</h2>
              <button onClick={() => setIsAddingConveyance(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveConveyance} className="space-y-4">
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
            </form>
          </div>
        </div>
      )}
    </>
  );
};
