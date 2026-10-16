import React from 'react';
import { XCircle, Cpu, Fan, Server, Database, HardDrive, Monitor, Plug, Keyboard, Mouse, Speaker, Headphones, Wifi, ShieldCheck, BatteryCharging } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { useSettings } from '../../../context/SettingsContext';

interface PCBuilderModalProps {
  showPCBuilderModal: boolean;
  setShowPCBuilderModal: (v: boolean) => void;
  products: any[];
  addItemToSale: (product: any) => void;
}

export const PCBuilderModal: React.FC<PCBuilderModalProps> = ({
  showPCBuilderModal, setShowPCBuilderModal, products, addItemToSale
}) => {
  const { settings } = useSettings();

  return (
    <>
      {/* PC Builder Modal for Sales */}
      {showPCBuilderModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#081621] text-white">
              <h2 className="text-xl font-bold">PC Builder for Sale</h2>
              <button onClick={() => setShowPCBuilderModal(false)} className="text-gray-400 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-6">
              <p className="text-sm text-gray-500 mb-6">Select components to build a PC and add them to the sale.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(settings?.pcBuilderCategories || ["CPU", "CPU Cooler", "Motherboard", "RAM", "Storage", "Graphics Card", "Power Supply", "Casing", "Monitor", "Keyboard", "Mouse", "Speaker", "UPS"]).map(catName => (
                  <div key={catName} className="border border-gray-100 rounded-lg p-4 hover:border-[#EF4444] transition-all">
                    <h3 className="font-bold mb-3 flex items-center gap-2">
                      <Cpu size={16} className="text-[#EF4444]" /> {catName}
                    </h3>
                    <select 
                      className="w-full border-gray-200 rounded-md text-sm focus:ring-[#EF4444] focus:border-[#EF4444]"
                      onChange={(e) => {
                        const p = products.find(prod => prod.id === e.target.value);
                        if (p) addItemToSale(p);
                      }}
                    >
                      <option value="">Select {catName}</option>
                      {products.filter(p => 
                        (p.category || "").toLowerCase().includes(catName.toLowerCase()) || 
                        (p.name || "").toLowerCase().includes(catName.toLowerCase()) ||
                        catName.toLowerCase().includes((p.category || "").toLowerCase())
                      ).map(p => (
                        <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price, settings)}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowPCBuilderModal(false)}
                className="bg-[#EF4444] text-white px-8 py-2 rounded-md font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
