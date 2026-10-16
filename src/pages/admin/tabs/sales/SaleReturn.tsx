import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, orderBy, where, limit, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { formatCurrency, cn } from '../../../../lib/utils';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import { RotateCcw, Plus, Download, Printer, CheckSquare, Search, FileText, ShoppingBag, ArrowLeftRight, Check, X, Eye } from 'lucide-react';
import { generateDocumentNumber } from '../../../../lib/numbering';
import { Pagination } from '../../../../components/common/Pagination';

interface ReturnItemState {
  productId: string;
  name: string;
  code?: string;
  soldPrice: number;
  soldQty: number;
  returnQty: number;
  returnPrice: number;
  hasSerialTracking?: boolean;
  availableSerials?: string[];
  selectedReturnSerials: string[];
}

export const SaleReturnTab: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [activeView, setActiveView] = useState<'create' | 'history'>('create');
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItemState[]>([]);
  const [referenceNo, setReferenceNo] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'bkash' | 'store_credit'>('cash');
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
      const ref = await generateDocumentNumber('SR');
      setReferenceNo(ref);
    } catch {
      setReferenceNo(`SR-${Date.now().toString().slice(-6)}`);
    }
  };

  const fetchInitialData = async () => {
    try {
      const custSnap = await getDocs(query(collection(db, 'customers'), orderBy('name')));
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const ordersSnap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(150)));
      setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      fetchReturnsHistory();
    } catch (err) {
      console.error(err);
      toast.error('Failed to load initial data');
    }
  };

  const fetchReturnsHistory = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'sale_returns'), orderBy('createdAt', 'desc')));
      setReturnsHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading returns history:', err);
    }
  };

  const handleSelectOrder = async (orderId: string) => {
    setSelectedOrderId(orderId);
    if (!orderId) {
      setSelectedOrder(null);
      setReturnItems([]);
      setRefundAmount(0);
      return;
    }

    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      if (order.customerName) {
        const foundCust = customers.find(c => c.name?.toLowerCase() === order.customerName?.toLowerCase() || c.phone === order.customerPhone);
        if (foundCust) setSelectedCustomerId(foundCust.id);
      }

      // Fetch sold serials for this order from sold_serials
      let orderSoldSerials: any[] = [];
      try {
        const ssSnap = await getDocs(query(collection(db, 'sold_serials'), where('orderId', '==', order.id)));
        orderSoldSerials = ssSnap.docs.map(d => d.data());
      } catch (err) {
        console.error('Error fetching sold serials:', err);
      }

      // Prepare items state
      const items: ReturnItemState[] = (order.items || []).map((item: any) => {
        const matchingSerials = orderSoldSerials
          .filter(s => s.productId === item.id || s.productName === item.name)
          .filter(s => s.status !== 'returned')
          .map(s => s.serial);

        const availableSerials = item.selectedSerials && item.selectedSerials.length > 0
          ? item.selectedSerials
          : matchingSerials;

        return {
          productId: item.id || item.productId,
          name: item.name || 'Product',
          code: item.code || item.sku || '',
          soldPrice: item.price || item.unitPrice || 0,
          soldQty: item.quantity || 1,
          returnQty: 0,
          returnPrice: item.price || item.unitPrice || 0,
          hasSerialTracking: item.hasSerialTracking || availableSerials.length > 0,
          availableSerials: availableSerials,
          selectedReturnSerials: [],
        };
      });

      setReturnItems(items);
      setRefundAmount(0);
    }
  };

  const handleReturnQtyChange = (index: number, qty: number) => {
    const updated = [...returnItems];
    const item = updated[index];
    const clampedQty = Math.max(0, Math.min(item.soldQty, qty));
    item.returnQty = clampedQty;

    // Adjust selected serials if quantity decreased
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
        // Automatically increase return qty if adding serial
        if (item.returnQty < item.soldQty) {
          item.returnQty += 1;
          item.selectedReturnSerials.push(serial);
        } else {
          toast.error(`Cannot select more serials than sold quantity (${item.soldQty})`);
          return;
        }
      } else {
        item.selectedReturnSerials.push(serial);
      }
    }

    setReturnItems(updated);
    recalculateRefund(updated);
  };

  const recalculateRefund = (items: ReturnItemState[]) => {
    const total = items.reduce((sum, i) => sum + (i.returnQty * i.returnPrice), 0);
    setRefundAmount(total);
  };

  const grandTotalReturn = returnItems.reduce((sum, i) => sum + (i.returnQty * i.returnPrice), 0);
  const totalReturnUnits = returnItems.reduce((sum, i) => sum + i.returnQty, 0);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) {
      toast.error('Please select an original sale invoice');
      return;
    }
    if (totalReturnUnits === 0) {
      toast.error('Please select at least 1 item quantity to return');
      return;
    }

    // Verify serial numbers for serial-tracked items
    for (const item of returnItems) {
      if (item.returnQty > 0 && item.hasSerialTracking && item.availableSerials && item.availableSerials.length > 0) {
        if (item.selectedReturnSerials.length !== item.returnQty) {
          toast.error(`Please select exactly ${item.returnQty} serial(s) for ${item.name}`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const activeReturnItems = returnItems.filter(i => i.returnQty > 0);

      // 1. Write sale_returns record
      const returnRecord = {
        referenceNumber: referenceNo,
        orderId: selectedOrder.id,
        orderDocumentNumber: selectedOrder.documentNumber || selectedOrder.id,
        customerName: selectedOrder.customerName || 'Walk-in Customer',
        customerPhone: selectedOrder.customerPhone || '',
        customerEmail: selectedOrder.customerEmail || '',
        items: activeReturnItems.map(i => ({
          productId: i.productId,
          name: i.name,
          returnQty: i.returnQty,
          returnPrice: i.returnPrice,
          total: i.returnQty * i.returnPrice,
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

      const returnDocRef = await addDoc(collection(db, 'sale_returns'), returnRecord);

      // 2. Restock product inventory & serials
      for (const item of activeReturnItems) {
        if (item.productId) {
          const productRef = doc(db, 'products', item.productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const currentProd = productSnap.data();
            const updates: any = { stock: increment(item.returnQty) };

            if (item.selectedReturnSerials && item.selectedReturnSerials.length > 0) {
              const currentAvail = currentProd.availableSerials || [];
              updates.availableSerials = Array.from(new Set([...currentAvail, ...item.selectedReturnSerials]));
            }

            await updateDoc(productRef, updates);
          }
        }

        // 3. Mark sold_serials as returned
        for (const serial of item.selectedReturnSerials) {
          const q = query(collection(db, 'sold_serials'), where('serial', '==', serial), where('orderId', '==', selectedOrder.id));
          const snap = await getDocs(q);
          for (const docSnap of snap.docs) {
            await updateDoc(doc(db, 'sold_serials', docSnap.id), {
              status: 'returned',
              returnedAt: new Date().toISOString(),
              returnReference: referenceNo,
            });
          }
        }
      }

      // 4. Log Accounting Transaction
      if (refundAmount > 0) {
        await addDoc(collection(db, 'transactions'), {
          type: 'sale_return',
          amount: refundAmount,
          date: returnDate,
          description: `Sale Return ${referenceNo} (Invoice #${selectedOrder.documentNumber || selectedOrder.id})`,
          entityId: selectedCustomerId || selectedOrder.customerName || 'customer',
          entityName: selectedOrder.customerName || 'Customer',
          entityType: 'customer',
          referenceId: returnDocRef.id,
          paymentMethod: paymentMethod,
          createdAt: new Date().toISOString(),
        });
      }

      toast.success(`Sale Return ${referenceNo} recorded successfully! Stock restocked.`);
      
      // Reset form
      setSelectedOrderId('');
      setSelectedOrder(null);
      setReturnItems([]);
      setRefundAmount(0);
      setNote('');
      generateRefNo();
      fetchReturnsHistory();
      setActiveView('history');
    } catch (err: any) {
      console.error('Error processing sale return:', err);
      toast.error('Failed to submit sale return: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredHistory = returnsHistory.filter(r => {
    if (!historySearch) return true;
    const q = historySearch.toLowerCase();
    return (
      (r.referenceNumber || '').toLowerCase().includes(q) ||
      (r.orderDocumentNumber || '').toLowerCase().includes(q) ||
      (r.customerName || '').toLowerCase().includes(q) ||
      (r.customerPhone || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden flex flex-col">
      {/* Top Header & View Switcher */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 to-[#081621] text-white border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 text-[10px] font-black uppercase tracking-widest mb-3">
              <RotateCcw size={12} className="text-red-400" /> Returns & Refunds
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
              Sale Return Management
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              Accept customer returns, restock inventory, void warranty serials, and log refunds securely.
            </p>
          </div>

          <div className="flex bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50 backdrop-blur-sm shrink-0">
            <button
              onClick={() => setActiveView('create')}
              className={cn(
                "px-5 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
                activeView === 'create' 
                  ? "bg-white text-slate-900 shadow-md" 
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              )}
            >
              <Plus size={16} /> New Sale Return
            </button>
            <button
              onClick={() => { setActiveView('history'); fetchReturnsHistory(); }}
              className={cn(
                "px-5 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
                activeView === 'history' 
                  ? "bg-white text-slate-900 shadow-md" 
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              )}
            >
              <FileText size={16} /> Return History
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full", activeView === 'history' ? "bg-slate-100 text-slate-600" : "bg-slate-700 text-slate-300")}>
                {returnsHistory.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {activeView === 'create' ? (
        <form onSubmit={handleSubmitReturn} className="p-6 pt-0 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Reference No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={referenceNo}
                readOnly
                className="w-full border-slate-200 rounded-xl bg-slate-100 text-sm font-mono font-bold text-slate-500 px-4 py-2.5 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Select Sale Invoice <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedOrderId}
                onChange={e => handleSelectOrder(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 px-4 py-2.5 shadow-sm transition-all"
              >
                <option value="">-- Choose Sold Invoice --</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    #{o.documentNumber || o.id.slice(0, 8)} — {o.customerName || 'Walk-in'} ({formatCurrency(o.total || 0, settings)}) — {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Return Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={returnDate}
                onChange={e => setReturnDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700 px-4 py-2.5 shadow-sm transition-all"
              />
            </div>
          </div>

          {/* Selected Order Summary Card */}
          {selectedOrder && (
            <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm shadow-sm">
              <div>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Customer Details</span>
                <span className="font-bold text-slate-800 block text-base">{selectedOrder.customerName || 'N/A'}</span>
                <span className="text-slate-500 font-medium mt-0.5 block">Phone: {selectedOrder.customerPhone || 'N/A'} | Email: {selectedOrder.customerEmail || 'N/A'}</span>
              </div>
              <div className="sm:text-right bg-white/60 p-3 rounded-xl border border-blue-50">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Invoice Status</span>
                <span className="font-black text-blue-900 block text-lg">{formatCurrency(selectedOrder.total || 0, settings)}</span>
                <span className="text-slate-500 text-xs font-bold block mt-0.5">Status: <span className="uppercase text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md ml-1">{selectedOrder.status}</span></span>
              </div>
            </div>
          )}

          {/* Items Return Table */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">#</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name / Details</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sold Qty</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Return Qty</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Unit Price</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Return Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {returnItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <ShoppingBag size={24} className="text-slate-300 mb-2" />
                        <span className="font-bold text-slate-500">No Items to Return</span>
                        <span className="text-sm">Select a sale invoice above to view sold items and choose quantities.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  returnItems.map((item, idx) => (
                    <tr key={idx} className={cn("transition-colors group", item.returnQty > 0 ? "bg-red-50/50" : "hover:bg-slate-50/80")}>
                      <td className="py-4 px-6 font-mono text-sm text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900 block text-sm">{item.name}</span>
                        {item.hasSerialTracking && item.availableSerials && item.availableSerials.length > 0 && (
                          <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Select Returned Serials</span>
                            <div className="flex flex-wrap gap-2">
                              {item.availableSerials.map(ser => {
                                const isSelected = item.selectedReturnSerials.includes(ser);
                                return (
                                  <button
                                    key={ser}
                                    type="button"
                                    onClick={() => handleToggleSerial(idx, ser)}
                                    className={cn(
                                      "px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border transition-all",
                                      isSelected
                                        ? "bg-red-500 text-white border-red-500 shadow-sm"
                                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                                    )}
                                  >
                                    {isSelected && <Check size={12} />} {ser}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center font-black text-slate-400 text-sm">{item.soldQty}</td>
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center justify-center">
                          <input
                            type="number"
                            min={0}
                            max={item.soldQty}
                            value={item.returnQty}
                            onChange={e => handleReturnQtyChange(idx, parseInt(e.target.value) || 0)}
                            className={cn(
                              "w-20 text-center border rounded-xl text-sm font-black focus:ring-2 focus:ring-blue-500 outline-none px-2 py-1.5 transition-all",
                              item.returnQty > 0 ? "border-red-300 bg-white text-red-600" : "border-slate-200 bg-slate-50 text-slate-700"
                            )}
                          />
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-500 text-sm">{formatCurrency(item.returnPrice, settings)}</td>
                      <td className="py-4 px-6 text-right font-black text-slate-900 text-sm">
                        {item.returnQty > 0 ? (
                           <span className="text-red-600 bg-red-100 px-2.5 py-1 rounded-lg">{formatCurrency(item.returnQty * item.returnPrice, settings)}</span>
                        ) : (
                           formatCurrency(0, settings)
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Refund Settlement Footer */}
          {returnItems.length > 0 && (
            <div className="flex flex-col lg:flex-row justify-between gap-6 pt-6 border-t border-slate-100 mt-6">
              <div className="flex-1 space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Return Reason / Internal Notes</label>
                <textarea
                  rows={4}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Defective unit, customer requested refund, wrong specification delivered..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none p-4 font-medium text-slate-700 transition-all resize-none"
                />
              </div>

              <div className="w-full lg:w-96 bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                  <span className="font-bold text-slate-500">Total Items to Return:</span>
                  <span className="font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-full">{totalReturnUnits} Units</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                  <span className="font-bold text-slate-500">Grand Return Total:</span>
                  <span className="font-black text-xl text-red-600">{formatCurrency(grandTotalReturn, settings)}</span>
                </div>

                <div className="pt-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Refund / Settlement Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none px-4 py-2.5 transition-all"
                  >
                    <option value="cash">Cash Drawer Refund</option>
                    <option value="bank">Bank Transfer Refund</option>
                    <option value="bkash">bKash / MFS Refund</option>
                    <option value="store_credit">Customer Due / Credit Note Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Refund Amount to Customer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={refundAmount}
                    onChange={e => setRefundAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border-2 border-red-100 focus:border-red-400 rounded-xl text-lg font-black text-red-600 focus:ring-4 focus:ring-red-500/10 outline-none px-4 py-2.5 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || totalReturnUnits === 0}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50 mt-2"
                >
                  <CheckSquare size={18} /> {isSubmitting ? 'Processing Return...' : 'Confirm Sale Return'}
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
                placeholder="Search returns by Ref, Invoice, Customer..."
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
                  <th className="py-3.5 px-4">Original Invoice</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4 text-center">Items Returned</th>
                  <th className="py-3.5 px-4 text-right">Refund Amount</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      No sale return records found.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage).map(ret => (
                    <tr key={ret.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{ret.referenceNumber}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-700">#{ret.orderDocumentNumber}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block">{ret.customerName}</span>
                        <span className="text-[10px] text-gray-400">{ret.customerPhone}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-700">{ret.totalUnits} Units</td>
                      <td className="py-3.5 px-4 text-right font-bold text-red-600">{formatCurrency(ret.refundAmount || ret.grandTotal || 0, settings)}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-gray-100 text-gray-700">
                          {ret.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">{ret.returnDate || new Date(ret.createdAt).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setViewingReturnModal(ret)}
                          className="px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 rounded flex items-center gap-1 ml-auto"
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

      {/* View Return Modal */}
      {viewingReturnModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Return Details: {viewingReturnModal.referenceNumber}</h3>
                <p className="text-xs text-gray-500">Original Invoice #{viewingReturnModal.orderDocumentNumber}</p>
              </div>
              <button onClick={() => setViewingReturnModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg">
                <div><span className="text-gray-500">Customer:</span> <strong className="text-gray-900">{viewingReturnModal.customerName}</strong></div>
                <div><span className="text-gray-500">Date:</span> <strong className="text-gray-900">{viewingReturnModal.returnDate}</strong></div>
                <div><span className="text-gray-500">Method:</span> <strong className="text-gray-900 uppercase">{viewingReturnModal.paymentMethod}</strong></div>
                <div><span className="text-gray-500">Refund Amount:</span> <strong className="text-red-600">{formatCurrency(viewingReturnModal.refundAmount || viewingReturnModal.grandTotal, settings)}</strong></div>
              </div>

              <div className="border border-gray-100 rounded-lg overflow-hidden mt-3">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-600 font-bold">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Refund Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(viewingReturnModal.items || []).map((itm: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <span className="font-bold block">{itm.name}</span>
                          {itm.returnedSerials && itm.returnedSerials.length > 0 && (
                            <span className="text-[10px] text-red-600 font-mono block">
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

export default SaleReturnTab;
