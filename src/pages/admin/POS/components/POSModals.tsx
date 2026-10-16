import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../../../../lib/utils';

interface POSModalsProps {
  showSerialModal: boolean;
  activeSerialItem: any;
  setShowSerialModal: (v: boolean) => void;
  setActiveSerialItemIdx: (v: number | null) => void;
  toggleSerialSelection: (serial: string) => void;
  isAddingCustomer: boolean;
  setIsAddingCustomer: (v: boolean) => void;
  customerFormData: {name: string, phone: string, email: string, address: string};
  setCustomerFormData: (v: any) => void;
  handleQuickAddCustomer: (e: React.FormEvent) => void;
}

export const POSModals: React.FC<POSModalsProps> = ({
  showSerialModal,
  activeSerialItem,
  setShowSerialModal,
  setActiveSerialItemIdx,
  toggleSerialSelection,
  isAddingCustomer,
  setIsAddingCustomer,
  customerFormData,
  setCustomerFormData,
  handleQuickAddCustomer
}) => {
  return (
    <>
      {/* Serial Selection Modal */}
      {showSerialModal && activeSerialItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[500px] max-w-[90vw] max-h-[85vh] flex flex-col">
            <h2 className="text-xl font-black text-gray-900 mb-1">Select Serial Numbers</h2>
            <p className="text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">
              {activeSerialItem.product.name}
            </p>

            <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="text-sm font-bold text-gray-700">Required: {activeSerialItem.quantity}</span>
              <span className={cn(
                "text-sm font-bold",
                (activeSerialItem.selectedSerials?.length || 0) === activeSerialItem.quantity ? "text-green-600" : "text-amber-600"
              )}>
                Selected: {activeSerialItem.selectedSerials?.length || 0}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[200px] mb-4">
              {(!activeSerialItem.product.availableSerials || activeSerialItem.product.availableSerials.length === 0) ? (
                <div className="text-center py-8 text-red-500 font-bold">
                  No serial numbers available for this product in stock.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeSerialItem.product.availableSerials.map((serial: string) => {
                    const isSelected = (activeSerialItem.selectedSerials || []).includes(serial);
                    return (
                      <button
                        key={serial}
                        onClick={() => toggleSerialSelection(serial)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-sm font-mono transition-all",
                          isSelected 
                            ? "bg-green-500 text-white border-green-600 shadow-inner" 
                            : "bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                        )}
                      >
                        {isSelected && <CheckCircle2 size={14} className="inline mr-1" />}
                        {serial}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowSerialModal(false);
                  setActiveSerialItemIdx(null);
                }}
                className="px-6 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {isAddingCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px]">
            <h2 className="text-xl font-black text-gray-900 mb-4 pb-4 border-b border-gray-100">Quick Add Customer</h2>
            <form onSubmit={handleQuickAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name *</label>
                <input required type="text" className="w-full rounded-lg border-gray-300 text-sm" value={customerFormData.name} onChange={e => setCustomerFormData({...customerFormData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                <input type="text" className="w-full rounded-lg border-gray-300 text-sm" value={customerFormData.phone} onChange={e => setCustomerFormData({...customerFormData, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                <input type="email" className="w-full rounded-lg border-gray-300 text-sm" value={customerFormData.email} onChange={e => setCustomerFormData({...customerFormData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                <textarea className="w-full rounded-lg border-gray-300 text-sm" rows={2} value={customerFormData.address} onChange={e => setCustomerFormData({...customerFormData, address: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsAddingCustomer(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
