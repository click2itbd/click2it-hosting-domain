import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, orderBy, where, limit, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { formatCurrency, cn } from '../../../../lib/utils';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import { RotateCcw, Plus, Download, Printer, CheckSquare, Search, FileText, Check, X, Eye, Trash2 } from 'lucide-react';
import { generateDocumentNumber } from '../../../../lib/numbering';
import { Pagination } from '../../../../components/common/Pagination';

interface PurchaseReturnItem {
  productId: string;
  name: string;
  code?: string;
  currentStock: number;
  returnQty: number;
  unitPrice: number;
  availableSerials: string[];
  selectedReturnSerials: string[];
}

export const PurchaseReturnTab: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [activeView, setActiveView] = useState<'create' | 'history'>('create');
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);

  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [returnItems, setReturnItems] = useState<PurchaseReturnItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'supplier_credit' | 'cash' | 'bank' | 'bkash'>('supplier_credit');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History State
  const [returnsHistory, setReturnsHistory] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(15);
  const [viewingReturnModal, setViewingReturnModal] = useState<any | null>(null);

  useEffect(() => {
    fetchInitialData();
    generateRefNo();
  }, []);

  const generateRefNo = async () => {
    try {
      const ref = await generateDocumentNumber('PR');
      setReferenceNo(ref);
    } catch {
      setReferenceNo(`PR-${Date.now().toString().slice(-6)}`);
    }
  };

  const fetchInitialData = async () => {
    try {
      const vendorsSnap = await getDocs(query(collection(db, 'vendors'), orderBy('name')));
      setVendors(vendorsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const productsSnap = await getDocs(query(collection(db, 'products'), orderBy('name')));
      setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const purchasesSnap = await getDocs(query(collection(db, 'purchases'), orderBy('createdAt', 'desc'), limit(100)));
      setPurchases(purchasesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      fetchReturnsHistory();
    } catch (err) {
      console.error(err);
      toast.error('Failed to load initial data');
    }
  };

  const fetchReturnsHistory = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'purchase_returns'), orderBy('createdAt', 'desc')));
      setReturnsHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading purchase returns:', err);
    }
  };

  const handleSelectPurchase = (purchaseId: string) => {
    setSelectedPurchaseId(purchaseId);
    if (!purchaseId) return;

    const purchase = purchases.find(p => p.id === purchaseId);
    if (purchase) {
      if (purchase.vendorId) setSelectedVendorId(purchase.vendorId);
      
      const items: PurchaseReturnItem[] = (purchase.items || []).map((item: any) => {
        const prod = products.find(p => p.id === item.productId || p.id === item.id);
        const availSerials = prod?.availableSerials || [];

        return {
          productId: item.productId || item.id,
          name: item.name || prod?.name || 'Product',
          code: item.code || prod?.sku || '',
          currentStock: prod?.stock || 0,
          returnQty: 1,
          unitPrice: item.costPrice || item.unitPrice || prod?.costPrice || 0,
          availableSerials: availSerials,
          selectedReturnSerials: [],
        };
      });

      setReturnItems(items);
      recalculateRefund(items);
    }
  };

  const handleAddProductManually = (prodId: string) => {
    if (!prodId) return;
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    if (returnItems.some(i => i.productId === prod.id)) {
      toast.error('Product already added to return table');
      return;
    }

    const newItem: PurchaseReturnItem = {
      productId: prod.id,
      name: prod.name,
      code: prod.sku || '',
      currentStock: prod.stock || 0,
      returnQty: 1,
      unitPrice: prod.costPrice || prod.price || 0,
      availableSerials: prod.availableSerials || [],
      selectedReturnSerials: [],
    };

    const updated = [...returnItems, newItem];
    setReturnItems(updated);
    recalculateRefund(updated);
    setSelectedProductToAdd('');
  };

  const handleRemoveItem = (index: number) => {
    const updated = returnItems.filter((_, idx) => idx !== index);
    setReturnItems(updated);
    recalculateRefund(updated);
  };

  const handleReturnQtyChange = (index: number, qty: number) => {
    const updated = [...returnItems];
    const item = updated[index];
    const clampedQty = Math.max(1, Math.min(item.currentStock || 9999, qty));
    item.returnQty = clampedQty;

    if (item.selectedReturnSerials.length > clampedQty) {
      item.selectedReturnSerials = item.selectedReturnSerials.slice(0, clampedQty);
    }

    setReturnItems(updated);
    recalculateRefund(updated);
  };

  const handleToggleSerial = (index: number, serial: string) => {
    const updated = [...returnItems];
    const item = updated[index];
    const exists = item.selectedReturnSerials.includes(serial);

    if (exists) {
      item.selectedReturnSerials = item.selectedReturnSerials.filter(s => s !== serial);
    } else {
      if (item.selectedReturnSerials.length >= item.returnQty) {
        if (item.returnQty < item.currentStock) {
          item.returnQty += 1;
          item.selectedReturnSerials.push(serial);
        } else {
          toast.error(`Cannot select more serials than current stock (${item.currentStock})`);
          return;
        }
      } else {
        item.selectedReturnSerials.push(serial);
      }
    }

    setReturnItems(updated);
    recalculateRefund(updated);
  };

  const recalculateRefund = (items: PurchaseReturnItem[]) => {
    const total = items.reduce((sum, i) => sum + (i.returnQty * i.unitPrice), 0);
    setRefundAmount(total);
  };

  const grandTotalReturn = returnItems.reduce((sum, i) => sum + (i.returnQty * i.unitPrice), 0);
  const totalReturnUnits = returnItems.reduce((sum, i) => sum + i.returnQty, 0);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) {
      toast.error('Please select a Supplier/Vendor');
      return;
    }
    if (returnItems.length === 0) {
      toast.error('Please add at least one product item to return');
      return;
    }

    // Check stock & serial constraints
    for (const item of returnItems) {
      if (item.returnQty > item.currentStock) {
        toast.error(`Return quantity for ${item.name} exceeds available stock (${item.currentStock})`);
        return;
      }
      if (item.availableSerials && item.availableSerials.length > 0 && item.selectedReturnSerials.length > 0) {
        if (item.selectedReturnSerials.length !== item.returnQty) {
          toast.error(`Please select exactly ${item.returnQty} serial(s) for ${item.name}`);
          return;
        }
      }
    }

    const vendor = vendors.find(v => v.id === selectedVendorId);

    setIsSubmitting(true);
    try {
      // 1. Write purchase_returns document
      const returnRecord = {
        referenceNumber: referenceNo,
        vendorId: selectedVendorId,
        vendorName: vendor?.name || 'Vendor',
        vendorPhone: vendor?.phone || '',
        purchaseId: selectedPurchaseId || null,
        items: returnItems.map(i => ({
          productId: i.productId,
          name: i.name,
          returnQty: i.returnQty,
          unitPrice: i.unitPrice,
          total: i.returnQty * i.unitPrice,
          returnedSerials: i.selectedReturnSerials,
        })),
        totalUnits: totalReturnUnits,
        grandTotal: grandTotalReturn,
        refundAmount: refundAmount,
        paymentMethod: paymentMethod,
        note: note,
        returnDate: returnDate,
        createdBy: user?.email || 'admin',
        createdAt: new Date().toISOString(),
      };

      const returnDocRef = await addDoc(collection(db, 'purchase_returns'), returnRecord);

      // 2. Deduct product inventory & remove returned serials
      for (const item of returnItems) {
        if (item.productId) {
          const productRef = doc(db, 'products', item.productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const currentProd = productSnap.data();
            const updates: any = { stock: increment(-item.returnQty) };

            if (item.selectedReturnSerials && item.selectedReturnSerials.length > 0) {
              const currentAvail: string[] = currentProd.availableSerials || [];
              updates.availableSerials = currentAvail.filter(s => !item.selectedReturnSerials.includes(s));
            }

            await updateDoc(productRef, updates);
          }
        }
      }

      // 3. Log Accounting Transaction
      if (refundAmount > 0) {
        await addDoc(collection(db, 'transactions'), {
          type: 'purchase_return',
          amount: refundAmount,
          date: returnDate,
          description: `Purchase Return ${referenceNo} to Vendor ${vendor?.name || ''}`,
          entityId: selectedVendorId,
          entityName: vendor?.name || 'Vendor',
          entityType: 'vendor',
          referenceId: returnDocRef.id,
          paymentMethod: paymentMethod,
          createdAt: new Date().toISOString(),
        });
      }

      toast.success(`Purchase Return ${referenceNo} submitted! Inventory stock deducted.`);

      // Reset form
      setSelectedPurchaseId('');
      setSelectedVendorId('');
      setReturnItems([]);
      setRefundAmount(0);
      setNote('');
      generateRefNo();
      fetchInitialData();
      setActiveView('history');
    } catch (err: any) {
      console.error('Error processing purchase return:', err);
      toast.error('Failed to submit purchase return: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredHistory = returnsHistory.filter(r => {
    if (!historySearch) return true;
    const q = historySearch.toLowerCase();
    return (
      (r.referenceNumber || '').toLowerCase().includes(q) ||
      (r.vendorName || '').toLowerCase().includes(q) ||
      (r.vendorPhone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden space-y-6">
      {/* Top Header & View Switcher */}
      <div className="p-6 pb-0 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <RotateCcw className="text-[#EF4444]" /> Purchase Return Management
          </h2>
          <p className="text-xs text-gray-500 mt-1">Return damaged or surplus items to suppliers, deduct inventory, and record refunds.</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveView('create')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2",
              activeView === 'create' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Plus size={14} /> New Purchase Return
          </button>
          <button
            onClick={() => { setActiveView('history'); fetchReturnsHistory(); }}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center gap-2",
              activeView === 'history' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <FileText size={14} /> Return History
            <span className="bg-gray-200 text-gray-700 text-[10px] px-1.5 py-0.2 rounded-full">
              {returnsHistory.length}
            </span>
          </button>
        </div>
      </div>

      {activeView === 'create' ? (
        <form onSubmit={handleSubmitReturn} className="p-6 pt-0 space-y-6">
          {/* Metadata Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Reference No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={referenceNo}
                readOnly
                className="w-full border-gray-200 rounded-lg bg-gray-100 text-xs font-mono font-bold text-gray-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Supplier / Vendor <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedVendorId}
                onChange={e => setSelectedVendorId(e.target.value)}
                className="w-full border-gray-200 rounded-lg text-xs focus:ring-[#EF4444]"
              >
                <option value="">-- Choose Supplier --</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.phone || 'No phone'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Original Purchase Invoice (Optional)
              </label>
              <select
                value={selectedPurchaseId}
                onChange={e => handleSelectPurchase(e.target.value)}
                className="w-full border-gray-200 rounded-lg text-xs focus:ring-[#EF4444]"
              >
                <option value="">-- Select from Past Purchases --</option>
                {purchases.map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.id.slice(0, 8)} — {p.vendorName} ({formatCurrency(p.totalAmount || p.total || 0, settings)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Return Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={returnDate}
                onChange={e => setReturnDate(e.target.value)}
                className="w-full border-gray-200 rounded-lg text-xs focus:ring-[#EF4444]"
              />
            </div>
          </div>

          {/* Add Product Line */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <select
                value={selectedProductToAdd}
                onChange={e => {
                  setSelectedProductToAdd(e.target.value);
                  handleAddProductManually(e.target.value);
                }}
                className="w-full border-gray-200 rounded-xl text-xs py-2.5 focus:ring-[#EF4444]"
              >
                <option value="">+ Add Product from Inventory to Return...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Current Stock: {p.stock || 0} — Cost: {formatCurrency(p.costPrice || p.price || 0, settings)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4 text-center">In Stock</th>
                  <th className="py-3 px-4 text-center">Return Qty</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right">Return Subtotal</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {returnItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      No products added to return. Choose a purchase invoice or add products from the dropdown above.
                    </td>
                  </tr>
                ) : (
                  returnItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-gray-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-gray-900 block">{item.name}</span>
                        {item.availableSerials && item.availableSerials.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase block">Select Stock Serials to Return:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.availableSerials.map(ser => {
                                const isSelected = item.selectedReturnSerials.includes(ser);
                                return (
                                  <button
                                    key={ser}
                                    type="button"
                                    onClick={() => handleToggleSerial(idx, ser)}
                                    className={cn(
                                      "px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-all",
                                      isSelected
                                        ? "bg-red-600 text-white border-red-600"
                                        : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                                    )}
                                  >
                                    {isSelected && <Check size={10} />} {ser}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-gray-700">{item.currentStock}</td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min={1}
                          max={item.currentStock}
                          value={item.returnQty}
                          onChange={e => handleReturnQtyChange(idx, parseInt(e.target.value) || 1)}
                          className="w-16 text-center border-gray-200 rounded-lg text-xs font-bold focus:ring-[#EF4444]"
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-600">{formatCurrency(item.unitPrice, settings)}</td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">{formatCurrency(item.returnQty * item.unitPrice, settings)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Refund Settlement Footer */}
          {returnItems.length > 0 && (
            <div className="flex flex-col lg:flex-row justify-between gap-6 pt-4 border-t border-gray-100">
              <div className="flex-1 space-y-3">
                <label className="block text-xs font-bold text-gray-700">Return Reason / Supplier Remarks</label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Factory defective batch, wrong model delivered, damaged in transit..."
                  className="w-full border-gray-200 rounded-xl text-xs focus:ring-[#EF4444]"
                />
              </div>

              <div className="w-full lg:w-96 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>Total Items to Return:</span>
                  <span className="font-bold text-gray-900">{totalReturnUnits} Units</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>Grand Return Total:</span>
                  <span className="font-bold text-lg text-red-600">{formatCurrency(grandTotalReturn, settings)}</span>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Settlement Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:ring-[#EF4444]"
                  >
                    <option value="supplier_credit">Supplier Ledger Credit (Debit Note)</option>
                    <option value="cash">Cash Refund from Supplier</option>
                    <option value="bank">Bank Transfer Refund</option>
                    <option value="bkash">bKash / MFS Refund</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Refund / Credit Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={refundAmount}
                    onChange={e => setRefundAmount(parseFloat(e.target.value) || 0)}
                    className="w-full border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-[#EF4444]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || returnItems.length === 0}
                  className="w-full py-3 bg-[#081621] hover:bg-[#EF4444] text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <CheckSquare size={16} /> {isSubmitting ? 'Submitting Return...' : 'Confirm & Submit Purchase Return'}
                </button>
              </div>
            </div>
          )}
        </form>
      ) : (
        /* History View */
        <div className="p-6 pt-0 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <input
                type="text"
                placeholder="Search by Ref, Vendor..."
                value={historySearch}
                onChange={e => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <button
              onClick={fetchReturnsHistory}
              className="px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-1.5"
            >
              <RotateCcw size={14} /> Refresh
            </button>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4">Ref No</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4 text-center">Units Returned</th>
                  <th className="py-3.5 px-4 text-right">Credit Amount</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      No purchase return records found.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage).map(ret => (
                    <tr key={ret.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-600">{ret.referenceNumber}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block">{ret.vendorName}</span>
                        <span className="text-[10px] text-gray-400">{ret.vendorPhone}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-700">{ret.totalUnits} Units</td>
                      <td className="py-3.5 px-4 text-right font-bold text-green-600">{formatCurrency(ret.refundAmount || ret.grandTotal || 0, settings)}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-gray-100 text-gray-700">
                          {ret.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">{ret.returnDate || new Date(ret.createdAt).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setViewingReturnModal(ret)}
                          className="px-2.5 py-1 text-xs font-bold bg-purple-50 text-purple-600 hover:bg-purple-100 rounded flex items-center gap-1 ml-auto"
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={historyPage}
            totalItems={filteredHistory.length}
            itemsPerPage={historyPerPage}
            onPageChange={setHistoryPage}
            onItemsPerPageChange={setHistoryPerPage}
          />
        </div>
      )}

      {/* View Modal */}
      {viewingReturnModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Purchase Return: {viewingReturnModal.referenceNumber}</h3>
                <p className="text-xs text-gray-500">Supplier: {viewingReturnModal.vendorName}</p>
              </div>
              <button onClick={() => setViewingReturnModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg">
                <div><span className="text-gray-500">Supplier:</span> <strong className="text-gray-900">{viewingReturnModal.vendorName}</strong></div>
                <div><span className="text-gray-500">Date:</span> <strong className="text-gray-900">{viewingReturnModal.returnDate}</strong></div>
                <div><span className="text-gray-500">Method:</span> <strong className="text-gray-900 uppercase">{viewingReturnModal.paymentMethod}</strong></div>
                <div><span className="text-gray-500">Credit Total:</span> <strong className="text-green-600">{formatCurrency(viewingReturnModal.refundAmount || viewingReturnModal.grandTotal, settings)}</strong></div>
              </div>

              <div className="border border-gray-100 rounded-lg overflow-hidden mt-3">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-600 font-bold">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Cost Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(viewingReturnModal.items || []).map((itm: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <span className="font-bold block">{itm.name}</span>
                          {itm.returnedSerials && itm.returnedSerials.length > 0 && (
                            <span className="text-[10px] text-purple-600 font-mono block">
                              Serials: {itm.returnedSerials.join(', ')}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center font-bold">{itm.returnQty}</td>
                        <td className="p-2 text-right font-bold text-gray-900">{formatCurrency(itm.total, settings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {viewingReturnModal.note && (
                <div className="p-3 bg-amber-50 rounded-lg text-amber-900 text-xs mt-2">
                  <strong>Notes:</strong> {viewingReturnModal.note}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                onClick={() => setViewingReturnModal(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseReturnTab;
