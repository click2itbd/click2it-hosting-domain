import React, { useMemo, useState } from 'react';
import { Order, Customer } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useSettings } from '../../context/SettingsContext';
import { Search, Filter, Download, ExternalLink, Printer, Edit2, Trash2, Eye, X, Database, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fetchCourierRisk, CourierRiskReport } from '../../utils/courierRisk';
import { generatePDF } from '../../lib/pdf';
import { getOrderCategory } from '../admin/tabs/sales/Orders'; // Reuse classification logic
import { toast } from 'react-hot-toast';
import { db } from '../../firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useConfirm } from '../../context/ConfirmContext';

interface EcommerceOrdersProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  customers: Customer[];
  updateOrderStatus: (orderId: string, newStatus: Order['status']) => Promise<void>;
  handleDeleteOrder: (id: string) => Promise<void>;
  updateOrderPaymentStatus?: (orderId: string, paymentStatus: string) => Promise<void>;
}

export const EcommerceOrders: React.FC<EcommerceOrdersProps> = ({
  orders,
  setOrders,
  customers,
  updateOrderStatus,
  handleDeleteOrder,
  updateOrderPaymentStatus
}) => {
  const { confirm } = useConfirm();
  const { settings } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<Order['status'] | ''>('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [riskCache, setRiskCache] = useState<Record<string, CourierRiskReport>>({});
  const [loadingRiskPhone, setLoadingRiskPhone] = useState<string | null>(null);
  const [selectedRiskReport, setSelectedRiskReport] = useState<{ phone: string; name: string; report: CourierRiskReport } | null>(null);

  const handleCheckRisk = async (phone: string, name: string) => {
    if (!phone) {
      toast.error('No phone number found for this order');
      return;
    }
    if (riskCache[phone]) {
      setSelectedRiskReport({ phone, name, report: riskCache[phone] });
      return;
    }
    setLoadingRiskPhone(phone);
    try {
      const report = await fetchCourierRisk(phone, settings?.steadfastApiKey, settings?.steadfastSecretKey);
      setRiskCache(prev => ({ ...prev, [phone]: report }));
      setSelectedRiskReport({ phone, name, report });
    } catch (err: any) {
      toast.error(err.message || 'Failed to check courier risk');
    } finally {
      setLoadingRiskPhone(null);
    }
  };

  
  const storeOrders = useMemo(() => {
    return orders.filter(o => {
      const cat = getOrderCategory(o);
      const isERP = o.saleSource === 'in_store' || o.type === 'quotation' || o.type === 'challan';
      return (cat === 'ecommerce' || cat === 'pc_build') && !isERP;
    });
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return storeOrders.filter(order => {
      const matchesSearch = (order.documentNumber || order.id).toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (order.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (order.customerPhone || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || getOrderCategory(order) === categoryFilter;
      
      const t = new Date(order.createdAt).getTime();
      const matchesFrom = !startDate || t >= new Date(startDate + 'T00:00:00').getTime();
      const matchesTo = !endDate || t <= new Date(endDate + 'T23:59:59').getTime();

      return matchesSearch && matchesStatus && matchesCategory && matchesFrom && matchesTo;
    });
  }, [storeOrders, searchQuery, statusFilter, categoryFilter, startDate, endDate]);

  const allSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.includes(o.id));
  const toggleAll = () => setSelectedIds(allSelected ? [] : filteredOrders.map(o => o.id));
  const toggleOne = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleBulkStatus = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    if (!await confirm({ title: 'Confirmation', message: `Change ${selectedIds.length} order(s) to "${bulkStatus}"?`, isDestructive: false })) return;
    setBulkBusy(true);
    for (const id of selectedIds) {
      const o = orders.find(x => x.id === id);
      if (o && bulkStatus && o.status !== bulkStatus) await updateOrderStatus(id, bulkStatus);
    }
    setBulkBusy(false);
    setSelectedIds([]);
    setBulkStatus('');
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!await confirm({ title: 'Confirmation', message: `Permanently delete ${selectedIds.length} order(s)? This cannot be undone.`, isDestructive: true })) return;
    setBulkBusy(true);
    for (const id of selectedIds) await handleDeleteOrder(id);
    setBulkBusy(false);
    setSelectedIds([]);
    toast.success('Selected orders deleted');
  };

  const handleExportCSV = () => {
    const list = selectedIds.length > 0 ? filteredOrders.filter(o => selectedIds.includes(o.id)) : filteredOrders;
    if (list.length === 0) { toast.error('No orders to export'); return; }
    const esc = (v: any) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = [['Order ID', 'Date', 'Customer', 'Phone', 'Email', 'Address', 'Type', 'Status', 'Payment', 'Items', 'Total']];
    list.forEach(o => rows.push([
      o.documentNumber || o.id, new Date(o.createdAt).toLocaleDateString('en-GB'), o.customerName, o.customerPhone, o.customerEmail,
      o.shippingAddress, getOrderCategory(o) === 'pc_build' ? 'PC Build' : 'E-Commerce', o.status, (o as any).paymentStatus || '',
      (o.items || []).map((i: any) => i.name + ' x' + i.quantity).join('; '), String(o.total || 0)
    ]));
    const blob = new Blob(['\uFEFF' + rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'store-orders-' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    toast.success('Exported ' + list.length + ' orders');
  };

  const handlePrint = async (order: Order) => {
    try {
      const pdfDoc = await generatePDF(order as any, 'invoice', settings);
      pdfDoc.autoPrint();
      window.open(pdfDoc.output('bloburl'), '_blank');
    } catch (err) {
      toast.error('Failed to generate PDF');
    }
  };


  const handleSendToSteadfast = async (order: Order) => {
    if (!settings?.steadfastApiKey || !settings?.steadfastSecretKey) {
      toast.error('Steadfast API keys are missing in Settings!');
      return;
    }
    
    const tid = toast.loading('Sending to Steadfast...');
    try {
      const payload = {
        invoice: order.id.slice(0, 8).toUpperCase(),
        recipient_name: order.shippingInfo?.fullName || 'Customer',
        recipient_phone: order.shippingInfo?.phone || '',
        recipient_address: (order.shippingInfo?.address || '') + ', ' + (order.shippingInfo?.city || ''),
        cod_amount: order.paymentMethod === 'cod' ? order.total : 0,
        note: `Order ${order.id.slice(0, 8)}`
      };

      const baseUrl = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/steadfast.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': settings.steadfastApiKey,
          'Secret-Key': settings.steadfastSecretKey
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (data.status === 200) {
        await updateDoc(doc(db, 'orders', order.id), { 
          trackingNumber: data.consignment.tracking_code, 
          courier: 'Steadfast' 
        });
        toast.success('Sent to Steadfast successfully!', { id: tid });
        setViewingOrder(prev => prev ? { ...prev, trackingNumber: data.consignment.tracking_code, courier: 'Steadfast' } : null);
      } else {
        toast.error(data.message || 'Failed to send to Steadfast', { id: tid });
      }
    } catch (err: any) {
      toast.error('Network Error: ' + err.message, { id: tid });
    }
  };

  const handleAddTrackingUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingOrder) return;
    
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const status = formData.get('status') as string;
    const location = formData.get('location') as string;
    const description = formData.get('description') as string;
    const deliveryManName = formData.get('deliveryManName') as string;
    const deliveryManPhone = formData.get('deliveryManPhone') as string;
    
    const update = {
      status,
      location,
      description,
      timestamp: new Date().toISOString(),
      updatedBy: 'Admin',
      deliveryMan: deliveryManName ? { name: deliveryManName, phone: deliveryManPhone } : undefined
    };
    
    const newTimeline = [...(viewingOrder.trackingTimeline || []), update];
    
    try {
      const tid = toast.loading('Adding update...');
      await updateDoc(doc(db, 'orders', viewingOrder.id), { trackingTimeline: newTimeline });
      setViewingOrder({ ...viewingOrder, trackingTimeline: newTimeline });
      
      // Update in main list
      setOrders(orders.map(o => o.id === viewingOrder.id ? { ...o, trackingTimeline: newTimeline } : o));
      
      toast.success('Tracking update added!', { id: tid });
      (e.target as HTMLFormElement).reset();
    } catch(err) {
      toast.error('Failed to add update');
    }
  };

  const handleUpdateTracking = async (orderId: string, trackingNumber: string, courier: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { trackingNumber, courier });
      toast.success('Tracking information updated!');
      setViewingOrder(prev => prev ? { ...prev, trackingNumber, courier } : null);
    } catch (err) {
      toast.error('Failed to update tracking');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Store Orders</h2>
          <p className="text-gray-500 text-sm mt-1">Manage e-commerce and PC build orders.</p>
        </div>
        <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <Download size={16} /> Export CSV{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
        </button>
        
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search orders by ID, Customer or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>
        <select 
          value={categoryFilter} 
          onChange={e => setCategoryFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <option value="all">All Store Orders</option>
          <option value="ecommerce">E-Commerce Only</option>
          <option value="pc_build">PC Builds Only</option>
        </select>
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} title="From date" className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} title="To date" className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700" />
        {(startDate || endDate) && <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs text-blue-600 font-semibold">Clear dates</button>}
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-blue-800">{selectedIds.length} selected</span>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value as Order['status'] | '')} className="border border-blue-200 rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="">Change status to...</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button disabled={!bulkStatus || bulkBusy} onClick={handleBulkStatus} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{bulkBusy ? 'Working...' : 'Apply'}</button>
          <button disabled={bulkBusy} onClick={handleBulkDelete} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">Delete</button>
          <button onClick={() => setSelectedIds([])} className="text-sm text-gray-600 ml-auto">Clear</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-4 py-4 w-10"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" /></th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map(order => {
                const cat = getOrderCategory(order);
                return (
                  <tr key={order.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(order.id)} onChange={() => toggleOne(order.id)} className="rounded" /></td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900">{order.documentNumber || order.id.substring(0,8)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{order.customerName}</span>
                        <span className="text-xs text-gray-500">{order.customerPhone || order.customerEmail}</span>
                        {order.customerPhone && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheckRisk(order.customerPhone, order.customerName);
                            }}
                            disabled={loadingRiskPhone === order.customerPhone}
                            className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all w-fit ${
                              riskCache[order.customerPhone] 
                                ? riskCache[order.customerPhone].risk_badge_color
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                            }`}
                            title="Check Steadfast delivery & return record"
                          >
                            <ShieldAlert size={11} />
                            {loadingRiskPhone === order.customerPhone 
                              ? 'Checking...' 
                              : (riskCache[order.customerPhone]?.risk_title || 'Courier Risk')}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString('en-GB')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cat === 'pc_build' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {cat === 'pc_build' ? 'PC Build' : 'E-Commerce'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <select 
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                          className={`text-xs font-bold px-2 py-1 rounded w-fit uppercase border-none focus:ring-0 cursor-pointer ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}
                        >
                          <option value="pending">PENDING</option>
                          <option value="processing">PROCESSING</option>
                          <option value="shipped">SHIPPED</option>
                          <option value="delivered">DELIVERED</option>
                          <option value="cancelled">CANCELLED</option>
                        </select>
                        
                        <select 
                          value={order.paymentStatus}
                          onChange={async (e) => {
                            const newPaymentStatus = e.target.value;
                            if (updateOrderPaymentStatus) { await updateOrderPaymentStatus(order.id, newPaymentStatus); return; }
                            try {
                              await updateDoc(doc(db, 'orders', order.id), { paymentStatus: newPaymentStatus });
                              toast.success('Payment status updated!');
                            } catch (err: any) {
                              toast.error(`Error: ${err.message}`);
                            }
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit uppercase border-none focus:ring-0 cursor-pointer ${
                            order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          <option value="unpaid">UNPAID</option>
                          <option value="paid">PAID</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(order.total || 0, settings)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 transition-colors">
                        <button onClick={() => setViewingOrder(order)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Details">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => handlePrint(order)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Print Invoice">
                          <Printer size={16} />
                        </button>
                        <button onClick={async () => { if(await confirm({ title: 'Confirmation', message: 'Are you sure you want to delete this order?', isDestructive: true })) handleDeleteOrder(order.id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Order">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No orders found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if(e.target === e.currentTarget) setViewingOrder(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900">Order #{viewingOrder.documentNumber || viewingOrder.id.substring(0,8)}</h3>
                {viewingOrder.createdBy && <p className="text-[10px] text-gray-500 uppercase font-semibold">Handled By: {viewingOrder.createdBy}</p>}
              </div>
              <button onClick={() => setViewingOrder(null)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase mb-1">Customer Details</p>
                  <p className="font-medium text-gray-900">{viewingOrder.customerName}</p>
                  <p className="text-sm text-gray-600">{viewingOrder.customerPhone}</p>
                  <p className="text-sm text-gray-600">{viewingOrder.customerEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase mb-1">Shipping Address</p>
                  <p className="text-sm text-gray-700">{viewingOrder.shippingAddress || 'No address provided'}</p>
                </div>
              </div>

              {/* Customer Courier Risk Preview */}
              {viewingOrder.customerPhone && (
                <div className="mb-6 p-4 rounded-xl border bg-gray-50/70 border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-indigo-600" /> কুরিয়ার হিস্ট্রি ও রিস্ক অ্যানালাইসিস (Steadfast)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCheckRisk(viewingOrder.customerPhone, viewingOrder.customerName)}
                      disabled={loadingRiskPhone === viewingOrder.customerPhone}
                      className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
                    >
                      {loadingRiskPhone === viewingOrder.customerPhone ? 'যাচাই করা হচ্ছে...' : (riskCache[viewingOrder.customerPhone] ? 'পুনরায় চেক করুন' : 'রিস্ক চেক করুন')}
                    </button>
                  </div>
                  {riskCache[viewingOrder.customerPhone] ? (
                    <div className="space-y-3 mt-3">
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-white p-2 rounded-lg border border-gray-100">
                          <p className="text-[10px] text-gray-500 font-medium">মোট পার্সেল</p>
                          <p className="text-base font-bold text-gray-900">{riskCache[viewingOrder.customerPhone].total_parcels}</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-gray-100">
                          <p className="text-[10px] text-gray-500 font-medium">ডেলিভারি সম্পন্ন</p>
                          <p className="text-base font-bold text-emerald-600">{riskCache[viewingOrder.customerPhone].total_delivered}</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-gray-100">
                          <p className="text-[10px] text-gray-500 font-medium">বাতিল / রিটার্ন</p>
                          <p className="text-base font-bold text-rose-600">{riskCache[viewingOrder.customerPhone].total_cancelled}</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-gray-100">
                          <p className="text-[10px] text-gray-500 font-medium">সাকসেস রেট</p>
                          <p className="text-base font-bold text-indigo-600">{riskCache[viewingOrder.customerPhone].success_rate}%</p>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg border text-xs leading-relaxed ${riskCache[viewingOrder.customerPhone].risk_badge_color}`}>
                        <p className="font-bold flex items-center gap-1.5 mb-1">
                          {riskCache[viewingOrder.customerPhone].risk_level === 'safe' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                          {riskCache[viewingOrder.customerPhone].risk_title}
                        </p>
                        <p>{riskCache[viewingOrder.customerPhone].recommendation}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      কাস্টমারের ফোন নম্বরের পূর্ববর্তী Steadfast পার্সেল ডেলিভারি ও রিটার্ন রেকর্ড দেখতে 'রিস্ক চেক করুন' বাটনে ক্লিক করুন।
                    </p>
                  )}
                </div>
              )}
              <div className="border border-gray-100 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-gray-600">Item</th>
                      <th className="px-4 py-2 text-right text-gray-600">Qty</th>
                      <th className="px-4 py-2 text-right text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewingOrder.items?.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency((item.price || item.sellingPrice || 0) * (item.quantity || 1), settings)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right text-gray-900">Total:</td>
                      <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(viewingOrder.total || 0, settings)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Tracking Info Form */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 font-bold uppercase mb-3">Courier Tracking Info</p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleUpdateTracking(viewingOrder.id, formData.get('trackingNumber') as string, formData.get('courier') as string);
                }} className="flex flex-col sm:flex-row gap-3">
                  <input type="text" name="courier" defaultValue={viewingOrder.courier || ''} placeholder="Courier Name (e.g. Steadfast)" className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500" required />
                  <input type="text" name="trackingNumber" defaultValue={viewingOrder.trackingNumber || ''} placeholder="Tracking Number" className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500" required />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">Update</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Courier Risk Modal */}
      {selectedRiskReport && (
        <div 
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedRiskReport(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Courier Risk & Fraud Prevention</h3>
                  <p className="text-xs text-indigo-200">Steadfast কুরিয়ার পার্সেল ডেলিভারি হিস্ট্রি</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRiskReport(null)} 
                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Customer Info */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">কাস্টমার নাম ও মোবাইল</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{selectedRiskReport.name || 'Unknown'}</p>
                  <p className="text-xs font-mono text-indigo-600 font-semibold">{selectedRiskReport.phone}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${selectedRiskReport.report.risk_badge_color}`}>
                  {selectedRiskReport.report.risk_title}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[11px] text-gray-500 font-semibold">মোট পার্সেল</p>
                  <p className="text-xl font-black text-gray-900 mt-1">{selectedRiskReport.report.total_parcels}</p>
                </div>
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                  <p className="text-[11px] text-emerald-700 font-semibold">ডেলিভারড</p>
                  <p className="text-xl font-black text-emerald-600 mt-1">{selectedRiskReport.report.total_delivered}</p>
                </div>
                <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-100">
                  <p className="text-[11px] text-rose-700 font-semibold">ক্যান্সেলড / রিটার্ন</p>
                  <p className="text-xl font-black text-rose-600 mt-1">{selectedRiskReport.report.total_cancelled}</p>
                </div>
                <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100">
                  <p className="text-[11px] text-indigo-700 font-semibold">সাকসেস রেট</p>
                  <p className="text-xl font-black text-indigo-600 mt-1">{selectedRiskReport.report.success_rate}%</p>
                </div>
              </div>

              {/* Recommendation Notice */}
              <div className={`p-4 rounded-xl border ${selectedRiskReport.report.risk_badge_color}`}>
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {selectedRiskReport.report.risk_level === 'safe' ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : (
                      <AlertTriangle size={18} className="text-rose-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm mb-1">অ্যাডমিন গাইডলাইন ও সতর্কতা:</p>
                    <p className="text-xs leading-relaxed opacity-95">{selectedRiskReport.report.recommendation}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCheckRisk(selectedRiskReport.phone, selectedRiskReport.name)}
                  disabled={loadingRiskPhone === selectedRiskReport.phone}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  {loadingRiskPhone === selectedRiskReport.phone ? 'যাচাই করা হচ্ছে...' : 'পুনরায় রিফ্রেশ করুন'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRiskReport(null)}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  ঠিক আছে
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
