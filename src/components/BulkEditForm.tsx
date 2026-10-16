import React from 'react';
import { Edit2 } from 'lucide-react';
import { NavigationMenu, Vendor } from '../types';

interface BulkEditFormProps {
  selectedCount: number;
  bulkEditData: {
    price: string;
    stock: string;
    category: string;
    vendorId: string;
    socketType: string;
    ramType: string;
  };
  setBulkEditData: (data: any) => void;
  handleBulkUpdate: (e: React.FormEvent) => void;
  setIsBulkEditing: (val: boolean) => void;
  menus: NavigationMenu[];
  vendors: Vendor[];
  loading: boolean;
}

export const BulkEditForm: React.FC<BulkEditFormProps> = ({
  selectedCount,
  bulkEditData,
  setBulkEditData,
  handleBulkUpdate,
  setIsBulkEditing,
  menus,
  vendors,
  loading
}) => {
  return (
    <div className="p-6 bg-red-50 border-b border-red-100 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2 mb-4">
        <Edit2 size={18} className="text-[#EF4444]" />
        <h3 className="font-bold text-[#081621]">Bulk Edit {selectedCount} Products</h3>
      </div>
      <form onSubmit={handleBulkUpdate} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">New Price (Optional)</label>
            <input
              type="number"
              value={bulkEditData.price}
              onChange={e => setBulkEditData({ ...bulkEditData, price: e.target.value })}
              placeholder="Keep current"
              className="w-full border-gray-200 rounded-md text-sm focus:ring-[#EF4444] focus:border-[#EF4444]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">New Stock (Optional)</label>
            <input
              type="number"
              value={bulkEditData.stock}
              onChange={e => setBulkEditData({ ...bulkEditData, stock: e.target.value })}
              placeholder="Keep current"
              className="w-full border-gray-200 rounded-md text-sm focus:ring-[#EF4444] focus:border-[#EF4444]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">New Category (Optional)</label>
            <select
              value={bulkEditData.category}
              onChange={e => setBulkEditData({ ...bulkEditData, category: e.target.value })}
              className="w-full border-gray-200 rounded-md text-sm focus:ring-[#EF4444] focus:border-[#EF4444]"
            >
              <option value="">Keep current</option>
              {menus.map(menu => (
                <optgroup key={menu.id} label={menu.name}>
                  <option value={menu.name}>{menu.name} (Main)</option>
                  {menu.subCategories?.map(sub => (
                    <option key={sub.id} value={sub.name}>{sub.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">New Vendor (Optional)</label>
            <select
              value={bulkEditData.vendorId}
              onChange={e => setBulkEditData({ ...bulkEditData, vendorId: e.target.value })}
              className="w-full border-gray-200 rounded-md text-sm focus:ring-[#EF4444] focus:border-[#EF4444]"
            >
              <option value="">Keep current</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">New Socket Type (Optional)</label>
            <input
              type="text"
              value={bulkEditData.socketType}
              onChange={e => setBulkEditData({ ...bulkEditData, socketType: e.target.value })}
              placeholder="e.g. AM4, LGA1700"
              className="w-full border-gray-200 rounded-md text-sm focus:ring-[#EF4444] focus:border-[#EF4444]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">New RAM Type (Optional)</label>
            <input
              type="text"
              value={bulkEditData.ramType}
              onChange={e => setBulkEditData({ ...bulkEditData, ramType: e.target.value })}
              placeholder="e.g. DDR4, DDR5"
              className="w-full border-gray-200 rounded-md text-sm focus:ring-[#EF4444] focus:border-[#EF4444]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsBulkEditing(false)}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md font-bold hover:bg-gray-300 transition-all text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2 bg-[#EF4444] text-white rounded-md font-bold hover:bg-red-600 transition-all text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Updating...' : 'Apply Changes to ' + selectedCount + ' Items'}
          </button>
        </div>
      </form>
      <p className="mt-2 text-[10px] text-gray-500 italic">* Only fields with values will be updated for all selected products.</p>
    </div>
  );
};
