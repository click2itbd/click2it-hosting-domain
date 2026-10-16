import React from 'react';
import { XCircle } from 'lucide-react';

interface DiscountCodeModalProps {
  isAddingDiscountCode: boolean;
  setIsAddingDiscountCode: (v: boolean) => void;
  editingDiscountCode: any;
  setEditingDiscountCode: (v: any) => void;
  discountCodeFormData: any;
  setDiscountCodeFormData: (v: any) => void;
  handleSaveDiscountCode: (e: any) => void;
}

export const DiscountCodeModal: React.FC<DiscountCodeModalProps> = ({
  isAddingDiscountCode, setIsAddingDiscountCode, editingDiscountCode, setEditingDiscountCode,
  discountCodeFormData, setDiscountCodeFormData, handleSaveDiscountCode
}) => {
  return (
    <>
      {/* Discount Code Modal */}
      {isAddingDiscountCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{editingDiscountCode ? 'Edit' : 'Add'} Discount Code</h2>
              <button onClick={() => { setIsAddingDiscountCode(false); setEditingDiscountCode(null); }} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveDiscountCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER20"
                  value={discountCodeFormData.code}
                  onChange={e => setDiscountCodeFormData({ ...discountCodeFormData, code: e.target.value.toUpperCase() })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444] uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Discount Percentage (%)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={discountCodeFormData.discountPercentage}
                  onChange={e => setDiscountCodeFormData({ ...discountCodeFormData, discountPercentage: Number(e.target.value) })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry Date</label>
                <input
                  type="date"
                  required
                  value={discountCodeFormData.expiryDate}
                  onChange={e => setDiscountCodeFormData({ ...discountCodeFormData, expiryDate: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={discountCodeFormData.isActive}
                  onChange={e => setDiscountCodeFormData({ ...discountCodeFormData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-[#EF4444] focus:ring-[#EF4444]"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
              </div>
              <button
                type="submit"
                className="w-full bg-[#EF4444] text-white py-3 rounded-md font-bold hover:bg-red-600 transition-all"
              >
                {editingDiscountCode ? 'Update Code' : 'Create Code'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
