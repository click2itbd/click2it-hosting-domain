import React from 'react';
import { cn } from '../../../lib/utils';

interface SerialSelectionModalProps {
  serialSelectionModal: any;
  setSerialSelectionModal: (v: any) => void;
  handleConfirmSerialSelection: () => void;
}

export const SerialSelectionModal: React.FC<SerialSelectionModalProps> = ({
  serialSelectionModal, setSerialSelectionModal, handleConfirmSerialSelection
}) => {
  return (
    <>
      {/* Serial Selection Modal */}
      {serialSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Select Sold Serials</h2>
            <p className="text-sm text-gray-500 mb-4">
              Please select the exact serial numbers being fulfilled for the serial-tracked items in this order.
            </p>

            <div className="space-y-6">
              {serialSelectionModal.items.map((item: any, idx: number) => (
                <div key={idx} className="border border-gray-200 rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-800">{item.productName}</h3>
                    <span className="text-sm bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded">
                      Required: {item.quantity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Selected: {item.selectedSerials.length} / {item.quantity}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {item.availableSerials.map((serial: string, sIdx: number) => {
                      const isSelected = item.selectedSerials.includes(serial);
                      return (
                        <button
                          key={sIdx}
                          onClick={() => {
                            const newSelected = isSelected
                              ? item.selectedSerials.filter((s: string) => s !== serial)
                              : item.selectedSerials.length < item.quantity
                                ? [...item.selectedSerials, serial]
                                : item.selectedSerials;
                            
                            setSerialSelectionModal({
                              ...serialSelectionModal,
                              items: serialSelectionModal.items.map((i: any) => 
                                i.productId === item.productId ? { ...i, selectedSerials: newSelected } : i
                              )
                            });
                          }}
                          className={cn(
                            "text-xs py-2 px-3 rounded border font-mono transition-all text-left truncate",
                            isSelected 
                              ? "bg-[#EF4444] text-white border-[#EF4444]" 
                              : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700"
                          )}
                        >
                          {serial}
                        </button>
                      );
                    })}
                    {item.availableSerials.length === 0 && (
                      <div className="col-span-full text-xs text-red-500 italic">No serials available in stock!</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={() => setSerialSelectionModal(null)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded font-bold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSerialSelection}
                className="px-6 py-2 bg-[#EF4444] text-white rounded font-bold hover:bg-red-600 transition-all"
              >
                Confirm & Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
