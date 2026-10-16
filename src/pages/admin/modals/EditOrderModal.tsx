import React, { useState } from 'react';
import { X, Save, Edit2 } from 'lucide-react';
import { Order } from '../../../types';
import { db } from '../../../firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { logAudit } from '../../../lib/audit';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingsContext';
import { formatCurrency } from '../../../lib/utils';

interface EditOrderModalProps {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
  onEditInSales?: () => void;
}

export default function EditOrderModal({ order, onClose, onSuccess, onEditInSales }: EditOrderModalProps) {
  const [formData, setFormData] = useState({
    customerName: order.customerName || '',
    customerPhone: order.customerPhone || '',
    customerEmail: order.customerEmail || '',
      createdBy: order.createdBy || 'Admin',
    shippingAddress: order.shippingAddress || '',
    notes: order.notes || '',
    workOrderNumber: order.workOrderNumber || '',
  });

  const [items, setItems] = useState([...order.items]);
  const [discountAmount, setDiscountAmount] = useState<number>(order.discountAmount || 0);
  const [saving, setSaving] = useState(false);
  const { profile } = useAuth();
  const { settings } = useSettings();

  const subtotal = items.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const total = subtotal - discountAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Update the order
      await updateDoc(doc(db, 'orders', order.id), {
        ...formData,
        items,
        subtotal,
        discountAmount,
        total
      });

      // 2. Update the 'sale' transaction amount so the ledger stays accurate
      if (order.total !== total) {
        const txIdsToUpdate = new Set<string>();
        const txSnap1 = await getDocs(query(collection(db, 'transactions'), where('referenceId', '==', order.id), where('type', '==', 'sale')));
        txSnap1.docs.forEach(d => txIdsToUpdate.add(d.id));
        if (order.documentNumber) {
          const txSnap2 = await getDocs(query(collection(db, 'transactions'), where('documentNumber', '==', order.documentNumber), where('type', '==', 'sale')));
          txSnap2.docs.forEach(d => txIdsToUpdate.add(d.id));
        }
        await Promise.all(Array.from(txIdsToUpdate).map(id => updateDoc(doc(db, 'transactions', id), { amount: total })));
      }

      await logAudit('EDIT', 'Order', `Edited order #${order.documentNumber || order.id} (Total: ${total})`, profile?.displayName || profile?.email || 'Unknown');
      toast.success('Order updated successfully');
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Edit2 size={16} />
            </div>
            Edit Document <span className="text-blue-600 ml-1">#{order.documentNumber || order.id.slice(-6)}</span>
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
          
          {onEditInSales && (
            <div className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div>
                <h3 className="font-bold text-indigo-900 text-sm">Need to add or remove products?</h3>
                <p className="text-xs text-indigo-700/80 mt-0.5 font-medium">Open this document in the POS/Sales interface to safely add items, remove items, or adjust quantities while keeping inventory synced.</p>
              </div>
              <button
                type="button"
                onClick={onEditInSales}
                className="shrink-0 bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white py-2.5 px-5 rounded-lg font-bold text-xs transition-all shadow-sm border border-indigo-200 hover:border-indigo-600 flex items-center gap-2"
              >
                <Edit2 size={14} /> Modify Invoice Items
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Customer Name</label>
                <input type="text" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Customer Phone</label>
                <input type="text" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Customer Email</label>
                <input type="text" value={formData.customerEmail} onChange={e => setFormData({...formData, customerEmail: e.target.value})} className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Work Order Number</label>
                <input type="text" value={formData.workOrderNumber} onChange={e => setFormData({...formData, workOrderNumber: e.target.value})} className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Shipping Address</label>
                <textarea value={formData.shippingAddress} onChange={e => setFormData({...formData, shippingAddress: e.target.value})} className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" rows={2} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Order Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-slate-200 bg-slate-50 focus:bg-white rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" rows={2} />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
            <h3 className="font-black text-slate-800 mb-4 text-xs uppercase tracking-wider">Item Details & Pricing</h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden mb-5 shadow-sm">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider">Product Name</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-center">Qty</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-right">Price</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 text-[13px]">{item.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" value={item.description || ''} onChange={e => { const newItems = [...items]; newItems[index].description = e.target.value; setItems(newItems); }} className="w-full min-w-[150px] border border-slate-200 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Optional details..." />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-xs">{item.quantity}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input type="number" value={item.price} onChange={e => { const newItems = [...items]; newItems[index].price = Number(e.target.value); setItems(newItems); }} className="w-24 border border-slate-200 rounded-md px-2 py-1 text-xs text-right font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-800 text-[13px]">
                        {formatCurrency((item.price || 0) * (item.quantity || 1), settings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Discount Amount</label>
                <input 
                  type="number" 
                  value={discountAmount} 
                  onChange={e => setDiscountAmount(Number(e.target.value))} 
                  className="w-28 border border-slate-300 rounded-lg px-3 py-1.5 text-right text-sm font-black text-red-600 focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm outline-none"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Subtotal</div>
                  <div className="font-bold text-slate-600 text-sm">{formatCurrency(subtotal, settings)}</div>
                </div>
                <div className="h-8 w-px bg-slate-300"></div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase text-blue-500 tracking-wider">Final Total</div>
                  <div className="font-black text-blue-700 text-xl">{formatCurrency(total, settings)}</div>
                </div>
              </div>
            </div>
            
            <p className="text-[11px] text-slate-400 mt-3 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
              Note: Changing price or discount adjusts the customer's ledger automatically. Quantity editing is disabled here to preserve stock accuracy.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2.5 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors text-sm">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 flex items-center gap-2 text-sm disabled:opacity-70">
            <Save size={16} /> {saving ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
}
