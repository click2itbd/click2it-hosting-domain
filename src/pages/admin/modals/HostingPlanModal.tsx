import React from 'react';
import { XCircle, Plus, Trash2 } from 'lucide-react';

interface HostingPlanModalProps {
  isAddingHostingPlan: boolean;
  setIsAddingHostingPlan: (v: boolean) => void;
  editingHostingPlan: any;
  setEditingHostingPlan: (v: any) => void;
  hostingPlanFormData: any;
  setHostingPlanFormData: (v: any) => void;
  hostingServices: any[];
  handleSaveHostingPlan: (e: any) => void;
}

export const HostingPlanModal: React.FC<HostingPlanModalProps> = ({
  isAddingHostingPlan, setIsAddingHostingPlan, editingHostingPlan, setEditingHostingPlan,
  hostingPlanFormData, setHostingPlanFormData, hostingServices, handleSaveHostingPlan
}) => {
  return (
    <>
      {isAddingHostingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingHostingPlan ? 'Edit' : 'Create'} Hosting Plan</h2>
              <button onClick={() => { setIsAddingHostingPlan(false); setEditingHostingPlan(null); }} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveHostingPlan} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service Category</label>
                <select
                  required
                  value={hostingPlanFormData.serviceId}
                  onChange={e => setHostingPlanFormData({ ...hostingPlanFormData, serviceId: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                >
                  <option value="">Select a service category</option>
                  {hostingServices.map(service => (
                    <option key={service.id} value={service.id}>{service.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={hostingPlanFormData.name}
                  onChange={e => setHostingPlanFormData({ ...hostingPlanFormData, name: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  placeholder="e.g. Basic Hosting"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={hostingPlanFormData.price}
                    onChange={e => setHostingPlanFormData({ ...hostingPlanFormData, price: Number(e.target.value) })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Billing Cycle</label>
                  <input
                    type="text"
                    required
                    value={hostingPlanFormData.billingCycle}
                    onChange={e => setHostingPlanFormData({ ...hostingPlanFormData, billingCycle: e.target.value })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                    placeholder="e.g. /mo or /yr"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Order</label>
                <input
                  type="number"
                  required
                  value={hostingPlanFormData.order}
                  onChange={e => setHostingPlanFormData({ ...hostingPlanFormData, order: Number(e.target.value) })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  placeholder="e.g. 1"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center justify-between">
                  <span>Features</span>
                  <button
                    type="button"
                    onClick={() => setHostingPlanFormData((prev: any) => ({ ...prev, features: [...prev.features, ''] }))}
                    className="text-[#EF4444] flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} /> Add
                  </button>
                </label>
                <div className="space-y-2">
                  {hostingPlanFormData.features.map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...hostingPlanFormData.features];
                          newFeatures[idx] = e.target.value;
                          setHostingPlanFormData({ ...hostingPlanFormData, features: newFeatures });
                        }}
                        className="flex-1 border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444] text-sm py-1.5"
                        placeholder="e.g. 10GB SSD Storage"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newFeatures = hostingPlanFormData.features.filter((_: any, i: number) => i !== idx);
                          setHostingPlanFormData({ ...hostingPlanFormData, features: newFeatures });
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {hostingPlanFormData.features.length === 0 && <div className="text-sm text-gray-400 italic">No features added.</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="popularPlan"
                  checked={hostingPlanFormData.popular}
                  onChange={e => setHostingPlanFormData({ ...hostingPlanFormData, popular: e.target.checked })}
                  className="rounded border-gray-300 text-[#EF4444] focus:ring-[#EF4444]"
                />
                <label htmlFor="popularPlan" className="text-sm font-medium text-gray-700">Mark as Popular</label>
              </div>
              <button
                type="submit"
                className="w-full bg-[#EF4444] text-white py-3 rounded-md font-bold hover:bg-red-600 transition-all"
              >
                {editingHostingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
