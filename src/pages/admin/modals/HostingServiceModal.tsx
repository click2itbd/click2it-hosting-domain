import React from 'react';
import { XCircle } from 'lucide-react';

interface HostingServiceModalProps {
  isAddingHostingService: boolean;
  setIsAddingHostingService: (v: boolean) => void;
  editingHostingService: any;
  setEditingHostingService: (v: any) => void;
  hostingServiceFormData: any;
  setHostingServiceFormData: (v: any) => void;
  handleSaveHostingService: (e: any) => void;
}

export const HostingServiceModal: React.FC<HostingServiceModalProps> = ({
  isAddingHostingService, setIsAddingHostingService, editingHostingService, setEditingHostingService,
  hostingServiceFormData, setHostingServiceFormData, handleSaveHostingService
}) => {
  return (
    <>
      {isAddingHostingService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingHostingService ? 'Edit' : 'Create'} Hosting Service</h2>
              <button onClick={() => { setIsAddingHostingService(false); setEditingHostingService(null); }} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveHostingService} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service Title</label>
                <input
                  type="text"
                  required
                  value={hostingServiceFormData.title}
                  onChange={e => setHostingServiceFormData({ ...hostingServiceFormData, title: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  placeholder="e.g. Domain, VPS"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  value={hostingServiceFormData.description}
                  onChange={e => setHostingServiceFormData({ ...hostingServiceFormData, description: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  placeholder="Short description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Starting Price</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={hostingServiceFormData.startingPrice}
                    onChange={e => setHostingServiceFormData({ ...hostingServiceFormData, startingPrice: Number(e.target.value) })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Billing Cycle</label>
                  <input
                    type="text"
                    required
                    value={hostingServiceFormData.billingCycle}
                    onChange={e => setHostingServiceFormData({ ...hostingServiceFormData, billingCycle: e.target.value })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                    placeholder="e.g. /Year"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Icon Path / Emoji</label>
                  <input
                    type="text"
                    value={hostingServiceFormData.iconPath}
                    onChange={e => setHostingServiceFormData({ ...hostingServiceFormData, iconPath: e.target.value })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                    placeholder="e.g. 🌐"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Order Index</label>
                  <input
                    type="number"
                    required
                    value={hostingServiceFormData.order}
                    onChange={e => setHostingServiceFormData({ ...hostingServiceFormData, order: Number(e.target.value) })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActiveService"
                  checked={hostingServiceFormData.isActive}
                  onChange={e => setHostingServiceFormData({ ...hostingServiceFormData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-[#EF4444] focus:ring-[#EF4444]"
                />
                <label htmlFor="isActiveService" className="text-sm font-medium text-gray-700">Service is Active</label>
              </div>
              <button
                type="submit"
                className="w-full bg-[#EF4444] text-white py-3 rounded-md font-bold hover:bg-red-600 transition-all"
              >
                {editingHostingService ? 'Update Service' : 'Create Service'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
