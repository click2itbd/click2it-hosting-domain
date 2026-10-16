import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { cn } from '../../../../lib/utils';
import { useAuth } from '../../../../context/AuthContext';
import { Tag, Edit, Trash2, Plus, X, Ticket, Edit2 } from 'lucide-react';

const DiscountCodesTab: React.FC = () => {
  const { isAdmin, hasPermission } = useAuth();
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);
  const [isAddingDiscountCode, setIsAddingDiscountCode] = useState(false);
  const [editingDiscountCode, setEditingDiscountCode] = useState<any>(null);
  const [discountCodeFormData, setDiscountCodeFormData] = useState({
    code: '',
    discountPercentage: 0,
    type: 'percentage',
    fixedAmount: 0,
    expiryDate: '',
    isActive: true,
  });

  const fetchDiscountCodes = async () => {
    try {
      const discountCodesSnap = await getDocs(query(collection(db, 'couponCodes'), orderBy('createdAt', 'desc')));
      setDiscountCodes(discountCodesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      toast.error('Failed to load discount codes');
    }
  };

  useEffect(() => {
    fetchDiscountCodes();
  }, []);

  const handleSaveDiscountCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (new Date(discountCodeFormData.expiryDate) < new Date(new Date().setHours(0, 0, 0, 0))) {
      toast.error('Expiry date cannot be in the past');
      return;
    }

    try {
      const data = {
        ...discountCodeFormData,
        code: discountCodeFormData.code.toUpperCase(),
        createdAt: new Date().toISOString(),
      };

      if (editingDiscountCode) {
        await updateDoc(doc(db, 'couponCodes', editingDiscountCode.id), data);
        toast.success('Discount code updated');
      } else {
        await addDoc(collection(db, 'couponCodes'), data);
        toast.success('Discount code created');
      }

      setIsAddingDiscountCode(false);
      setEditingDiscountCode(null);
      setDiscountCodeFormData({ code: '', discountPercentage: 0, type: 'percentage', fixedAmount: 0, expiryDate: '', isActive: true });
      fetchDiscountCodes();
    } catch (error) {
      console.error('Error saving discount code:', error);
      toast.error('Failed to save discount code');
    }
  };

  const handleDeleteDiscountCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount code?')) return;
    try {
      
if (!isAdmin) { toast.error('You do not have permission to delete this.'); return; }
await deleteDoc(doc(db, 'couponCodes', id));

      toast.success('Discount code deleted');
      fetchDiscountCodes();
    } catch (error) {
      console.error('Error deleting discount code:', error);
      toast.error('Failed to delete discount code');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Ticket className="text-[#EF4444]" /> Discount Codes
              </h2>
              <button
                onClick={() => setIsAddingDiscountCode(true)}
                className="bg-[#EF4444] text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-red-600 transition-all font-bold text-sm"
              >
                <Plus size={18} /> Create Code
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Discount</th>
                    <th className="px-6 py-4">Expiry Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {discountCodes.map(code => (
                    <tr key={code.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-sm">{code.code}</td>
                      <td className="px-6 py-4 text-sm font-bold text-[#EF4444]">{code.type === "free_shipping" ? "Free Shipping" : code.type === "fixed" ? `৳${code.fixedAmount}` : `${code.discountPercentage}%`}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(code.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          code.isActive && new Date(code.expiryDate) > new Date() ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {code.isActive && new Date(code.expiryDate) > new Date() ? 'Active' : 'Inactive/Expired'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingDiscountCode(code);
                              setDiscountCodeFormData({
                                code: code.code,
                                discountPercentage: code.discountPercentage || 0,
                                  type: code.type || 'percentage',
                                  fixedAmount: code.fixedAmount || 0,
                                expiryDate: code.expiryDate,
                                isActive: code.isActive,
                              });
                              setIsAddingDiscountCode(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteDiscountCode(code.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {discountCodes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No discount codes created yet.</td>
                    </tr>
                  )}
                </tbody>
        </table>
      </div>

      {isAddingDiscountCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{editingDiscountCode ? 'Edit Discount Code' : 'Create Discount Code'}</h2>
              <button onClick={() => { setIsAddingDiscountCode(false); setEditingDiscountCode(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveDiscountCode} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER2024"
                  value={discountCodeFormData.code}
                  onChange={e => setDiscountCodeFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type *</label>
                <select
                  value={discountCodeFormData.type || 'percentage'}
                  onChange={e => setDiscountCodeFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (৳)</option>
                  <option value="free_shipping">Free Shipping</option>
                </select>
              </div>
              
              {(!discountCodeFormData.type || discountCodeFormData.type === 'percentage') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage (%) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={discountCodeFormData.discountPercentage || 0}
                    onChange={e => setDiscountCodeFormData(prev => ({ ...prev, discountPercentage: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
              
              {discountCodeFormData.type === 'fixed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Amount (৳) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={discountCodeFormData.fixedAmount || 0}
                    onChange={e => setDiscountCodeFormData(prev => ({ ...prev, fixedAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={discountCodeFormData.expiryDate}
                  onChange={e => setDiscountCodeFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={discountCodeFormData.isActive}
                  onChange={e => setDiscountCodeFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsAddingDiscountCode(false); setEditingDiscountCode(null); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                >
                  {editingDiscountCode ? 'Update Code' : 'Save Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountCodesTab;
