import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { X, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateDocumentNumber } from '../../../lib/numbering';
import { Vendor, PaymentAccount, NavigationMenu } from '../../../types';

interface CustomProductPurchaseModalProps {
  onClose: () => void;
  onSuccess: (product: any) => void;
}

export const CustomProductPurchaseModal: React.FC<CustomProductPurchaseModalProps> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [menus, setMenus] = useState<NavigationMenu[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    subCategory: '',
    brand: '',
    model: '',
    barcode: '',
    vendorId: '',
    costPrice: 0,
    salesPrice: 0,
    quantity: 1,
      unit: 'pcs',
      warrantyMonths: 0,
      warrantyUnit: 'months',
    paymentAccountId: '',
    paidAmount: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [venSnap, accSnap, menuSnap] = await Promise.all([
          getDocs(query(collection(db, 'vendors'), orderBy('name'))),
          getDocs(query(collection(db, 'payment_accounts'), orderBy('name'))),
          getDocs(collection(db, 'menus')),
        ]);
        
        const fetchedVendors = venSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor));
        const fetchedAccs = accSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentAccount));
        const fetchedMenus = menuSnap.docs.map(d => ({ id: d.id, ...d.data() } as NavigationMenu));
        
        setVendors(fetchedVendors);
        setAccounts(fetchedAccs);
        setMenus(fetchedMenus);

        if (fetchedAccs.length > 0) {
          setFormData(prev => ({ ...prev, paymentAccountId: fetchedAccs[0].id }));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Failed to load vendors and accounts');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.vendorId || formData.quantity <= 0) {
      toast.error('Please fill required fields (Name, Vendor, Quantity > 0)');
      return;
    }
    
    setSubmitting(true);
    try {
      const vendor = vendors.find(v => v.id === formData.vendorId);
      const account = accounts.find(a => a.id === formData.paymentAccountId);

      // 1. Create Product
      const categoryName = menus.find(m => m.id === formData.categoryId)?.title || 'Custom Product';
      const productData = {
        name: formData.name,
        description: 'Custom Product',
        price: formData.salesPrice,
        costPrice: formData.costPrice,
        stock: formData.quantity,
          unit: formData.unit,
          warrantyMonths: formData.warrantyMonths,
          warrantyUnit: formData.warrantyUnit,
        categoryId: formData.categoryId,
        category: categoryName,
        subCategory: formData.subCategory,
        brand: formData.brand,
        model: formData.model,
        barcode: formData.barcode,
        images: [],
        vendorId: formData.vendorId,
        createdAt: new Date().toISOString(),
      };
      const prodRef = await addDoc(collection(db, 'products'), productData);
      const newProduct = { id: prodRef.id, ...productData };

      // 2. Create Purchase
      const totalAmount = formData.costPrice * formData.quantity;
      const docNumber = await generateDocumentNumber('purchase');
      const purchaseData = {
        documentNumber: docNumber,
        vendorId: formData.vendorId,
        vendorName: vendor?.name || 'Unknown Vendor',
        date: new Date().toISOString().split('T')[0],
        items: [{
          id: prodRef.id,
          name: formData.name,
          purchasePrice: formData.costPrice,
          salesPrice: formData.salesPrice,
          quantity: formData.quantity,
            unit: formData.unit,
        }],
        subtotal: totalAmount,
        total: totalAmount,
        paidAmount: formData.paidAmount,
        paymentStatus: formData.paidAmount >= totalAmount ? 'paid' : (formData.paidAmount > 0 ? 'partial' : 'unpaid'),
        paymentAccountId: formData.paymentAccountId,
        paymentMethod: account?.type || 'cash',
        createdAt: new Date().toISOString(),
      };
      
      const purchaseRef = await addDoc(collection(db, 'purchases'), purchaseData);

      // 3. Create Accounting Transactions
      await addDoc(collection(db, 'transactions'), {
        type: 'purchase',
        amount: purchaseData.total,
        date: purchaseData.date,
        description: `Purchase from ${vendor?.name || 'Unknown Vendor'} (#${docNumber})`,
        entityId: formData.vendorId,
        entityName: vendor?.name || 'Unknown Vendor',
        entityType: 'vendor',
        referenceId: purchaseRef.id,
        documentNumber: docNumber,
        paymentAccountId: '',
        paymentMethod: '',
        createdAt: new Date().toISOString(),
      });

      if (formData.paidAmount > 0) {
        await addDoc(collection(db, 'transactions'), {
          type: 'payment_made',
          amount: formData.paidAmount,
          date: purchaseData.date,
          paymentAccountId: formData.paymentAccountId,
          paymentMethod: account?.type || 'cash',
          entityId: formData.vendorId,
          entityName: vendor?.name || 'Unknown Vendor',
          entityType: 'vendor',
          referenceId: purchaseRef.id,
          documentNumber: docNumber,
          description: `Payment for custom purchase #${docNumber}`,
          createdAt: new Date().toISOString(),
        });
      }

      toast.success('Custom product purchased successfully!');
      onSuccess(newProduct);
    } catch (err) {
      console.error('Error purchasing custom product:', err);
      toast.error('Failed to purchase custom product');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white p-6 rounded-lg">Loading...</div>
      </div>
    );
  }

  const totalAmount = formData.costPrice * formData.quantity;
  const selectedMenu = menus.find(m => m.id === formData.categoryId);
  const availableSubCategories = selectedMenu?.subCategories || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Quick Purchase: Custom Product</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              placeholder="Enter product name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                placeholder="e.g. Intel"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                placeholder="e.g. Core i9"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Vendor *</label>
            <select
              required
              value={formData.vendorId}
              onChange={e => setFormData({ ...formData, vendorId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            >
              <option value="">-- Select Vendor --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cost Price</label>
              <input
                type="number"
                min="0"
                value={formData.costPrice || ''}
                onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Sales Price</label>
              <input
                type="number"
                min="0"
                value={formData.salesPrice || ''}
                onChange={e => setFormData({ ...formData, salesPrice: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Quantity *</label>
              <div className="flex">
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity || ''}
                  onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-l-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <select
                  value={formData.unit || 'pcs'}
                  onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  className="border-y border-r border-gray-300 rounded-r-lg p-2 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none w-20"
                >
                  <option value="pcs">pcs</option>
                  <option value="nos">nos</option>
                  <option value="kg">kg</option>
                  <option value="gm">gm</option>
                  <option value="ltr">ltr</option>
                  <option value="meter">meter</option>
                  <option value="box">box</option>
                  <option value="set">set</option>
                  <option value="pack">pack</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Barcode / SKU</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Scan or enter"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Warranty</label>
              <div className="flex">
                <input
                  type="number"
                  min="0"
                  value={formData.warrantyMonths || ''}
                  onChange={e => setFormData({ ...formData, warrantyMonths: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-l-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0 (No Warranty)"
                />
                <select
                  value={formData.warrantyUnit || 'months'}
                  onChange={e => setFormData({ ...formData, warrantyUnit: e.target.value })}
                  className="border-y border-r border-gray-300 rounded-r-lg p-2 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none w-32"
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex justify-between font-bold text-sm mb-3">
              <span>Total Cost:</span>
              <span>{totalAmount}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Payment Account</label>
                <select
                  value={formData.paymentAccountId}
                  onChange={e => setFormData({ ...formData, paymentAccountId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                >
                  <option value="">-- No Payment --</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Paid Amount</label>
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  value={formData.paidAmount || ''}
                  onChange={e => setFormData({ ...formData, paidAmount: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <CheckCircle size={18} />
            {submitting ? 'Processing...' : 'Purchase & Add to Cart'}
          </button>
        </form>
      </div>
    </div>
  );
};
