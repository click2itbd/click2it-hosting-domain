import React, { useState } from 'react';
import { useConfirm } from '../../../../context/ConfirmContext';
import { db } from '../../../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { formatCurrency, cn } from '../../../../lib/utils';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import type { OrderStatus as AppOrderStatus } from '../../../../types';
export type OrderStatus = string;
export const DEFAULT_ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
import { Phone, Mail, MapPin,  Eye, ChevronDown, ChevronRight, Copy, Receipt, Search, Download, Filter, Printer, ShieldAlert, FileText, ArrowLeftRight, Trash2, RotateCcw, Globe, Server, Cpu, ShoppingBag, Layers, Truck, X , ShieldCheck } from 'lucide-react';
import EditOrderModal from '../../modals/EditOrderModal';
import { Edit2 } from 'lucide-react';
import { Pagination } from '../../../../components/common/Pagination';

export type OrderCategory = 'all' | 'ecommerce' | 'pc_build' | 'domain' | 'hosting';

interface OrdersTabProps { orders: any[]; customers: any[]; orderSearchQuery: string; setOrderSearchQuery: (v: string) => void; orderStatusFilter: string; setOrderStatusFilter: (v: AppOrderStatus | 'all') => void; orderStartDate: string; setOrderStartDate: (v: string) => void; orderEndDate: string; setOrderEndDate: (v: string) => void; orderSort: any; setOrderSort: (v: any) => void; selectedOrderIds: string[]; setSelectedOrderIds: (v: string[]) => void; handleExportFilteredOrders: () => void; handleBulkUpdateOrderStatus: (s: string) => void; handleBulkExportOrders: () => void; handleBulkDeleteOrders: () => void; setSelectedLedgerEntity: (v: any) => void; setActiveTab: (v: string) => void; fetchData: () => Promise<void>; updateOrderDiscount?: (id: string, v: number) => void; updateOrderStatus?: (id: string, status: OrderStatus) => void; generatePDF?: (order: any, type: 'invoice' | 'challan' | 'quotation') => void; handleDeleteOrder?: (order: any) => void; handleReturnOrder?: (order: any) => void; handleEditInSales?: (order: any) => void; }

export const getOrderCategory = (order: any): 'ecommerce' | 'pc_build' | 'domain' | 'hosting' => {
  if (
    order.type === 'domain' ||
    order.items?.some((i: any) => i.itemType === 'domain' || i.itemType === 'domain_renewal' || i.itemType === 'domain_transfer') ||
    order.domain
  ) {
    return 'domain';
  }
  if (
    order.type === 'hosting' ||
    order.items?.some((i: any) => i.itemType === 'hosting') ||
    order.hostingServiceId ||
    order.packageId
  ) {
    return 'hosting';
  }
  if (
    order.type === 'pc_build' ||
    order.type === 'pc_builder' ||
    order.isPCBuild === true ||
    order.items?.some((i: any) => i.isPCBuild || i.category === 'pc_builder' || i.category === 'pc_build')
  ) {
    return 'pc_build';
  }
  return 'ecommerce';
};

const OrdersTab: React.FC<OrdersTabProps> = ({ orders, customers, orderSearchQuery, setOrderSearchQuery, orderStatusFilter, setOrderStatusFilter, orderStartDate, setOrderStartDate, orderEndDate, setOrderEndDate, orderSort, setOrderSort, selectedOrderIds, setSelectedOrderIds, handleExportFilteredOrders, handleBulkUpdateOrderStatus, handleBulkExportOrders, handleBulkDeleteOrders, setSelectedLedgerEntity, setActiveTab, fetchData, updateOrderDiscount, updateOrderStatus, generatePDF, handleDeleteOrder, handleReturnOrder, handleEditInSales }) => {
  const { isAdmin, hasPermission } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [orderCategoryFilter, setOrderCategoryFilter] = useState<OrderCategory>('all');
  const [shippingModalOrder, setShippingModalOrder] = useState<any | null>(null);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedOrderIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedOrderIds(newSet);
  };
  const { settings } = useSettings();
  const activeStatuses = (settings as any)?.customOrderStatuses || DEFAULT_ORDER_STATUSES;

  const actualOrders = orders.filter(o => o.type !== 'quotation');
  
  const categoryCounts = {
    all: actualOrders.length,
    ecommerce: actualOrders.filter(o => getOrderCategory(o) === 'ecommerce').length,
    pc_build: actualOrders.filter(o => getOrderCategory(o) === 'pc_build').length,
    domain: actualOrders.filter(o => getOrderCategory(o) === 'domain').length,
    hosting: actualOrders.filter(o => getOrderCategory(o) === 'hosting').length,
  };

  const processedOrders = actualOrders.filter(order => {
    const matchesCategory = orderCategoryFilter === 'all' || getOrderCategory(order) === orderCategoryFilter;
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
    const matchesSearch = (order.documentNumber || order.id || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) || 
                          (order.customerName || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) || 
                          (order.customerPhone || '').toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                          (order.customerEmail || '').toLowerCase().includes(orderSearchQuery.toLowerCase());
    const orderDate = order.createdAt ? order.createdAt.split('T')[0] : '';
    const matchesStartDate = !orderStartDate || orderDate >= orderStartDate;
    const matchesEndDate = !orderEndDate || orderDate <= orderEndDate;
    return matchesCategory && matchesStatus && matchesSearch && matchesStartDate && matchesEndDate;
  }).sort((a, b) => {
      const getNum = (obj) => {
        const str = obj.documentNumber || obj.id || '';
        const match = str.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };

      if (orderSort === 'date_desc') {
        return getNum(b) - getNum(a);
      }
      if (orderSort === 'date_asc') {
        return getNum(a) - getNum(b);
      }
      if (orderSort === 'total_desc') return (b.total || 0) - (a.total || 0);
      if (orderSort === 'total_asc') return (a.total || 0) - (b.total || 0);
      return 0;
    });

  const totalPages = Math.ceil(processedOrders.length / itemsPerPage);
  const currentOrders = processedOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col min-h-[calc(100vh-8rem)]">
        {/* Category Tabs Header */}
        <div className="p-6 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="text-[#EF4444]" /> Order Management
            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full ml-2">
              {processedOrders.length} of {actualOrders.length} Orders
            </span>
          </h2>
        </div>

        {/* Category Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 border-b border-gray-100">
          <button
            onClick={() => { setOrderCategoryFilter('all'); setCurrentPage(1); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
              orderCategoryFilter === 'all'
                ? "bg-[#081621] text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Layers size={14} /> All Orders
            <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", orderCategoryFilter === 'all' ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700")}>
              {categoryCounts.all}
            </span>
          </button>

          <button
            onClick={() => { setOrderCategoryFilter('ecommerce'); setCurrentPage(1); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
              orderCategoryFilter === 'ecommerce'
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            )}
          >
            <ShoppingBag size={14} /> E-Commerce
            <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", orderCategoryFilter === 'ecommerce' ? "bg-white/20 text-white" : "bg-emerald-200 text-emerald-800")}>
              {categoryCounts.ecommerce}
            </span>
          </button>

          <button
            onClick={() => { setOrderCategoryFilter('pc_build'); setCurrentPage(1); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
              orderCategoryFilter === 'pc_build'
                ? "bg-purple-600 text-white shadow-md"
                : "bg-purple-50 text-purple-700 hover:bg-purple-100"
            )}
          >
            <Cpu size={14} /> PC Build
            <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", orderCategoryFilter === 'pc_build' ? "bg-white/20 text-white" : "bg-purple-200 text-purple-800")}>
              {categoryCounts.pc_build}
            </span>
          </button>

          <button
            onClick={() => { setOrderCategoryFilter('domain'); setCurrentPage(1); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
              orderCategoryFilter === 'domain'
                ? "bg-cyan-600 text-white shadow-md"
                : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
            )}
          >
            <Globe size={14} /> Domain
            <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", orderCategoryFilter === 'domain' ? "bg-white/20 text-white" : "bg-cyan-200 text-cyan-800")}>
              {categoryCounts.domain}
            </span>
          </button>

          <button
            onClick={() => { setOrderCategoryFilter('hosting'); setCurrentPage(1); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
              orderCategoryFilter === 'hosting'
                ? "bg-blue-600 text-white shadow-md"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            )}
          >
            <Server size={14} /> Hosting
            <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", orderCategoryFilter === 'hosting' ? "bg-white/20 text-white" : "bg-blue-200 text-blue-800")}>
              {categoryCounts.hosting}
            </span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="px-6 mt-4 flex items-center justify-between flex-wrap gap-4 flex-shrink-0">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by Order ID, Name, Phone or Email..."
            value={orderSearchQuery}
            onChange={(e) => { setOrderSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#EF4444] focus:border-[#EF4444]"
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Status:</label>
            <select
              value={orderStatusFilter}
              onChange={e => { setOrderStatusFilter(e.target.value as AppOrderStatus | 'all'); setCurrentPage(1); }}
              className="text-sm border-gray-200 rounded-lg focus:ring-[#EF4444] focus:border-[#EF4444]"
            >
              <option value="all">All Statuses</option>
              {activeStatuses.map((s: string) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase">From:</label>
            <input
              type="date"
              value={orderStartDate}
              onChange={e => { setOrderStartDate(e.target.value); setCurrentPage(1); }}
              className="text-sm border-gray-200 rounded-lg focus:ring-[#EF4444] focus:border-[#EF4444]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase">To:</label>
            <input
              type="date"
              value={orderEndDate}
              onChange={e => { setOrderEndDate(e.target.value); setCurrentPage(1); }}
              className="text-sm border-gray-200 rounded-lg focus:ring-[#EF4444] focus:border-[#EF4444]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase">Sort:</label>
            <select
              value={orderSort}
              onChange={e => setOrderSort(e.target.value as any)}
              className="text-sm border-gray-200 rounded-lg focus:ring-[#EF4444] focus:border-[#EF4444]"
            >
              <option value="date_desc">Date (Newest)</option>
              <option value="date_asc">Date (Oldest)</option>
              <option value="total_desc">Total (High-Low)</option>
              <option value="total_asc">Total (Low-High)</option>
            </select>
          </div>
          <button
            onClick={handleExportFilteredOrders}
            className="bg-[#081621] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#EF4444] transition-all font-bold text-sm shadow-sm"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Quick Date Presets */}
      <div className="px-6 mt-3 flex items-center gap-2 overflow-x-auto pb-2 shrink-0">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mr-2">Quick Dates:</span>
        <button onClick={() => {
          const d = new Date().toISOString().split('T')[0];
          setOrderStartDate(d); setOrderEndDate(d); setCurrentPage(1);
        }} className="px-3 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-[10px] font-bold uppercase rounded-md transition-colors shadow-sm">Today</button>
        <button onClick={() => {
          const d = new Date(); d.setDate(d.getDate() - 1);
          const ds = d.toISOString().split('T')[0];
          setOrderStartDate(ds); setOrderEndDate(ds); setCurrentPage(1);
        }} className="px-3 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-[10px] font-bold uppercase rounded-md transition-colors shadow-sm">Yesterday</button>
        <button onClick={() => {
          const end = new Date().toISOString().split('T')[0];
          const d = new Date(); d.setDate(d.getDate() - 7);
          const start = d.toISOString().split('T')[0];
          setOrderStartDate(start); setOrderEndDate(end); setCurrentPage(1);
        }} className="px-3 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-[10px] font-bold uppercase rounded-md transition-colors shadow-sm">Last 7 Days</button>
        <button onClick={() => {
          const d = new Date();
          const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
          setOrderStartDate(start); setOrderEndDate(end); setCurrentPage(1);
        }} className="px-3 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-[10px] font-bold uppercase rounded-md transition-colors shadow-sm">This Month</button>
        <button onClick={() => {
          setOrderStartDate(''); setOrderEndDate(''); setCurrentPage(1);
        }} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-[10px] font-bold uppercase rounded-md transition-colors shadow-sm">Clear</button>
      </div>



            {selectedOrderIds.length > 0 && (
              <div className="bg-[#081621] text-white p-4 flex items-center justify-between animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold">{selectedOrderIds.length} orders selected</span>
                  <div className="h-4 w-[1px] bg-gray-700" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 uppercase font-bold">Update Status:</span>
                    <select
                      onChange={(e) => handleBulkUpdateOrderStatus(e.target.value as OrderStatus)}
                      className="bg-gray-800 border-gray-700 text-white text-xs rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                      defaultValue=""
                    >
                      <option value="" disabled>Select Status</option>
                        {activeStatuses.map((s: string) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                    </select>
                  </div>
                  <div className="h-4 w-[1px] bg-gray-700" />
                  
                  <button
                    onClick={handleBulkExportOrders}
                    className="flex items-center gap-2 text-sm hover:text-[#EF4444] transition-colors font-bold"
                  >
                    <Download size={16} /> Export CSV
                  </button>
                  <button
                    onClick={handleBulkDeleteOrders}
                    className="flex items-center gap-2 text-sm hover:text-red-400 transition-colors font-bold"
                  >
                    <Trash2 size={16} /> Delete Selected
                  </button>
                </div>
                <button
                  onClick={() => setSelectedOrderIds([])}
                  className="text-xs uppercase tracking-wider font-bold hover:underline"
                >
                  Clear Selection
                </button>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-gray-200 mx-6 mb-6 mt-4 shadow-sm flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-[#081621] text-xs font-bold text-white uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-4 w-48">Order Info</th>
                      <th className="px-5 py-4">Customer</th>
                      <th className="px-5 py-4">Amount & Payment</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentOrders.map(order => {
                    const cat = getOrderCategory(order);
                    return (
                      <React.Fragment key={order.id}>
                        <tr className={cn(
                          "hover:bg-slate-50 transition-colors group cursor-pointer",
                          selectedOrderIds.includes(order.id) && "bg-blue-50/50"
                        )} onClick={() => setViewingOrder(order)}>
                          
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="font-black text-slate-900 flex items-center gap-1.5 text-[13px]">
                              <Receipt size={14} className="text-blue-500" />
                              {order.documentNumber || order.id.slice(-6)}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 font-bold">
                              {new Date(order.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">By: {order.createdBy || "Admin"}</div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 text-[13px]">{order.customerName}</span>
                              <span className="text-[11px] text-slate-500 font-semibold mt-0.5">{order.customerPhone}</span>
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-black text-slate-900">{formatCurrency(order.total, settings)}</span>
                                {order.paymentStatus === 'paid' && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase tracking-wider">Paid</span>}
                                {order.paymentStatus === 'partial' && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black uppercase tracking-wider">Partial</span>}
                                {(order.paymentStatus === 'unpaid' || !order.paymentStatus) && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase tracking-wider">Due</span>}
                              </div>
                              <div className="text-[10px] text-slate-500 font-bold mt-1">
                                Paid: <span className="text-slate-700">{formatCurrency(order.paidAmount || 0, settings)}</span>
                              </div>
                              {order.discountAmount > 0 && (
                                <div className="text-[9px] text-red-500 font-black mt-0.5 uppercase tracking-wider">
                                  Disc: {formatCurrency(order.discountAmount, settings)}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <select
                              value={order.status}
                              onClick={(e)=>e.stopPropagation()} onChange={e => updateOrderStatus && updateOrderStatus(order.id, e.target.value as OrderStatus)}
                              disabled={!hasPermission('manage_orders')}
                              className="w-32 text-xs border-slate-200 rounded focus:ring-blue-500 font-bold bg-slate-50 text-slate-700 py-1.5"
                            >
                              {activeStatuses.map((s: string) => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                              ))}
                            </select>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   if (handleEditInSales) {
                                     handleEditInSales(order);
                                   } else {
                                     setEditingOrder(order);
                                   }
                                 }}
                                 className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-200 bg-white shadow-sm"
                                 title="Edit Order / Items"
                               >
                                 <Edit2 size={14} />
                               </button>
                               <button onClick={(e) => { e.stopPropagation(); setViewingOrder(order); }} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-200 bg-white shadow-sm" title="View Order">
                                 <Eye size={14} />
                               </button>
                              
                              {(order.status === 'shipped' || order.status === 'delivered' || order.courierName) && (
                                <button onClick={(e) => { e.stopPropagation(); setShippingModalOrder(order); }} className="w-8 h-8 flex items-center justify-center text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-200 shadow-sm" title="Shipping Details">
                                  <Truck size={14} />
                                </button>
                              )}
                              
                              {generatePDF && (
                                <div className="relative group">
                                  <button onClick={(e)=>e.stopPropagation()} className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all border border-slate-300 shadow-sm" title="Generate Documents">
                                    <Download size={14} />
                                  </button>
                                  <div className="absolute right-0 top-full mt-1.5 w-32 bg-white rounded-xl shadow-2xl border border-slate-300 ring-1 ring-black/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 flex flex-col overflow-hidden py-1">
                                    <button onClick={(e) => { e.stopPropagation(); generatePDF(order, 'invoice'); }} className="text-left px-3.5 py-2 text-xs font-black text-slate-800 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2">
                                      <FileText size={13} className="text-red-500" /> Invoice
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); generatePDF(order, 'challan'); }} className="text-left px-3.5 py-2 text-xs font-black text-slate-800 hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center gap-2">
                                      <Truck size={13} className="text-emerald-500" /> Challan
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {handleReturnOrder && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleReturnOrder(order); }}
                                  className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-200 bg-white shadow-sm ml-1"
                                  title="Return Order"
                                >
                                  <RotateCcw size={14} />
                                </button>
                              )}
                              {handleDeleteOrder && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); if(window.confirm('Are you sure you want to delete this order?')) handleDeleteOrder(order); }}
                                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-200 bg-white shadow-sm ml-1"
                                  title="Delete Order"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                              
                            </div>
                          </td>
                        </tr>
                        </React.Fragment>

                    );
                  })}
                  {processedOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                        No orders found matching the selected category and filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
        </div>

        <div className="mt-auto border-t border-gray-100 flex-shrink-0">
          <Pagination
            currentPage={currentPage}
            totalItems={processedOrders.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      </div>

      {/* Shipping Details Modal */}
      
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSuccess={() => {
            setEditingOrder(null);
            fetchData();
          }}
          onEditInSales={handleEditInSales ? () => {
            setEditingOrder(null);
            handleEditInSales(editingOrder);
          } : undefined}
        />
      )}
      {shippingModalOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShippingModalOrder(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
              <h3 className="font-bold flex items-center gap-2 text-blue-900">
                <Truck className="text-blue-600" size={18} /> 
                Shipping Logistics
              </h3>
              <button onClick={() => setShippingModalOrder(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const courierName = (form.elements.namedItem('courierName') as HTMLInputElement).value;
                const trackingNumber = (form.elements.namedItem('trackingNumber') as HTMLInputElement).value;
                
                try {
                  await updateDoc(doc(db, 'orders', shippingModalOrder.id), { 
                    courierName, 
                    courier: courierName, 
                    trackingNumber 
                  });
                  toast.success('Shipping details updated');
                  if (fetchData) fetchData();
                  setShippingModalOrder(null);
                } catch (err) {
                  toast.error('Failed to update shipping details');
                }
              }}
              className="p-6 space-y-4"
            >
              <div className="mb-2">
                <div className="text-xs font-bold text-gray-500 mb-1">Order Number</div>
                <div className="text-sm font-semibold text-gray-900">#{shippingModalOrder.documentNumber || shippingModalOrder.id.slice(0, 8)}</div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Courier Service Name</label>
                <input 
                  type="text" 
                  name="courierName"
                  defaultValue={shippingModalOrder.courierName || shippingModalOrder.courier || ''}
                  placeholder="e.g. Steadfast, Pathao, RedX" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={!hasPermission('manage_orders')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tracking Number</label>
                <input 
                  type="text" 
                  name="trackingNumber"
                  defaultValue={shippingModalOrder.trackingNumber || ''}
                  placeholder="Enter parcel tracking number" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={!hasPermission('manage_orders')}
                />
              </div>

              {hasPermission('manage_orders') && (
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                  <button type="button" onClick={() => setShippingModalOrder(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm">
                    Save Details
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      {/* Viewing Order Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 ring-1 ring-black/5">
            {/* Premium Header */}
            <div className="p-5 md:px-8 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-white/10 text-white rounded-xl backdrop-blur-md border border-white/10 shadow-inner">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-wide uppercase">
                    {viewingOrder.type === 'quotation' ? 'Quotation' : (viewingOrder.type === 'challan' ? 'Challan' : 'Invoice')}
                  </h2>
                  <p className="text-sm text-slate-300 font-medium tracking-wider">#{viewingOrder.documentNumber || viewingOrder.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { generatePDF(viewingOrder, viewingOrder.type || 'invoice'); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-sm">
                  <Download size={16}/> Download PDF
                </button>
                <button onClick={() => setViewingOrder(null)} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-all">
                  <X size={24}/>
                </button>
              </div>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">
              <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex-1 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl"></div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Billed To</h3>
                  <div className="text-slate-900 font-black text-xl mb-3">{viewingOrder.customerName || 'Walk-in Customer'}</div>
                  <div className="space-y-1.5">
                    {viewingOrder.customerPhone && <div className="text-sm text-slate-600 flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {viewingOrder.customerPhone}</div>}
                    {viewingOrder.customerEmail && <div className="text-sm text-slate-600 flex items-center gap-2"><Mail size={14} className="text-slate-400"/> {viewingOrder.customerEmail}</div>}
                    {viewingOrder.customerAddress && <div className="text-sm text-slate-600 flex items-start gap-2"><MapPin size={14} className="text-slate-400 shrink-0 mt-0.5"/> <span className="max-w-[250px] leading-snug">{viewingOrder.customerAddress}</span></div>}
                  </div>
                </div>
                
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex-1 md:max-w-xs relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500 rounded-r-2xl"></div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Document Details</h3>
                  <div className="grid grid-cols-2 gap-y-3">
                    <div className="text-sm font-semibold text-slate-500">Date:</div>
                    <div className="text-sm font-bold text-slate-900 text-right">{new Date(viewingOrder.createdAt).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</div>
                    
                    <div className="text-sm font-semibold text-slate-500">Status:</div>
                    <div className="text-right flex justify-end">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border",
                        viewingOrder.status === 'delivered' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        viewingOrder.status === 'pending' ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-blue-50 text-blue-700 border-blue-200"
                      )}>
                        {viewingOrder.status}
                      </span>
                    </div>
                    
                    <div className="text-sm font-semibold text-slate-500">Prepared By:</div>
                    <div className="text-sm font-bold text-slate-900 text-right">{viewingOrder.userId || 'Admin'}</div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden mb-8 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="py-4 px-4 w-12 text-center">#</th>
                      <th className="py-4 px-4">Item Description</th>
                      <th className="py-4 px-4 text-center">Qty</th>
                      <th className="py-4 px-4 text-right">Price</th>
                      <th className="py-4 px-5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {viewingOrder.items?.map((item: any, i: number) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 text-center text-slate-400 font-bold">{i + 1}</td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          {item.selectedSerials?.length > 0 && (
                            <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap gap-1">
                              {item.selectedSerials.map((s: string) => (
                                <span key={s} className="bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm font-medium">{s}</span>
                              ))}
                            </div>
                          )}
                          {item.warrantyMonths > 0 && (
                            <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold mt-2 border border-emerald-100">
                              <ShieldCheck size={10}/> Warranty: {item.warrantyMonths} Mos
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-slate-700">
                          <span className="text-base">{item.quantity}</span>
                          <span className="text-[10px] text-slate-400 ml-1 uppercase">{item.unit || 'pcs'}</span>
                        </td>
                        <td className="py-4 px-4 text-right font-medium text-slate-600">{formatCurrency(item.price, settings)}</td>
                        <td className="py-4 px-5 text-right font-black text-slate-900">{formatCurrency(item.price * item.quantity, settings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col md:flex-row justify-between gap-8">
                <div className="flex-1 space-y-4">
                  {viewingOrder.notes && (
                    <div className="bg-amber-50/60 border border-amber-200/60 p-5 rounded-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                      <h4 className="text-[10px] font-black text-amber-800/60 uppercase tracking-widest mb-2">Order Notes</h4>
                      <p className="text-sm font-medium text-amber-900/80 whitespace-pre-wrap leading-relaxed">{viewingOrder.notes}</p>
                    </div>
                  )}
                  {viewingOrder.courierName && (
                    <div className="bg-indigo-50/60 border border-indigo-200/60 p-5 rounded-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                      <h4 className="text-[10px] font-black text-indigo-800/60 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Truck size={12}/> Shipping Details</h4>
                      <div className="text-sm font-medium text-indigo-900/80 space-y-1">
                        <div><span className="text-indigo-800/60 font-bold uppercase text-[10px] tracking-wider w-16 inline-block">Courier:</span> {viewingOrder.courierName}</div>
                        {viewingOrder.trackingNumber && <div><span className="text-indigo-800/60 font-bold uppercase text-[10px] tracking-wider w-16 inline-block">Tracking:</span> {viewingOrder.trackingNumber}</div>}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="w-full md:w-[340px] bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-fit relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between text-slate-500 font-medium">
                      <span>Subtotal</span>
                      <span className="text-slate-900">{formatCurrency((viewingOrder.total || 0) + (viewingOrder.discount || 0), settings)}</span>
                    </div>
                    {(viewingOrder.discount > 0) && (
                      <div className="flex justify-between font-bold text-red-500 bg-red-50 px-2 py-1 -mx-2 rounded-lg">
                        <span>Discount</span>
                        <span>-{formatCurrency(viewingOrder.discount, settings)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-slate-900 text-lg pt-4 border-t border-slate-100">
                      <span>Net Total</span>
                      <span>{formatCurrency(viewingOrder.total || 0, settings)}</span>
                    </div>
                    {(() => {
                        const profit = viewingOrder.profit ?? (viewingOrder.items?.reduce((sum: number, item: any) => sum + (((item.price || 0) - (item.costPrice || item.purchasePrice || 0)) * (item.quantity || 1)), 0) ?? 0);
                        if (profit > 0) {
                          return (
                            <div className="flex justify-between text-emerald-600 bg-emerald-50 px-3 py-1.5 -mx-3 rounded-lg border border-emerald-100 mt-2 mb-2" title="Only admins can see this profit">
                              <span className="font-bold text-[10px] uppercase tracking-wider self-center flex items-center gap-1">? Admin Profit</span>
                              <span className="font-bold text-sm">+{formatCurrency(profit, settings)}</span>
                            </div>
                          );
                        }
                        return null;
                    })()}
                    {(() => {
                        const profit = viewingOrder.profit ?? (viewingOrder.items?.reduce((sum: number, item: any) => sum + (((item.price || 0) - (item.costPrice || item.purchasePrice || 0)) * (item.quantity || 1)), 0) ?? 0);
                        if (profit > 0) {
                          return (
                            <div className="flex justify-between text-emerald-600 bg-emerald-50 px-3 py-1.5 -mx-3 rounded-lg border border-emerald-100 mt-2 mb-2" title="Only admins can see this profit">
                              <span className="font-bold text-[10px] uppercase tracking-wider self-center flex items-center gap-1">? Admin Profit</span>
                              <span className="font-bold text-sm">+{formatCurrency(profit, settings)}</span>
                            </div>
                          );
                        }
                        return null;
                    })()}
                    {viewingOrder.type !== 'quotation' && (
                      <div className="pt-2 space-y-2">
                        <div className="flex justify-between text-emerald-600 bg-emerald-50 px-3 py-2 -mx-3 rounded-xl border border-emerald-100">
                          <span className="font-bold text-xs uppercase tracking-wider self-center">Paid</span>
                          <span className="font-black text-base">{formatCurrency(viewingOrder.amountPaid || 0, settings)}</span>
                        </div>
                        <div className="flex justify-between text-rose-600 bg-rose-50 px-3 py-2 -mx-3 rounded-xl border border-rose-100">
                          <span className="font-bold text-xs uppercase tracking-wider self-center">Due</span>
                          <span className="font-black text-base">{formatCurrency(Math.max(0, (viewingOrder.total || 0) - (viewingOrder.amountPaid || 0)), settings)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrdersTab;
