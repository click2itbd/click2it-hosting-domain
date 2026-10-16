import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Product, Order } from '../../../../types';
import { formatCurrency, cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import {
  Package,
  Search,
  Download,
  Printer,
  TrendingUp,
  AlertTriangle,
  Eye,
  X,
  Boxes,
  DollarSign,
  Layers,
} from 'lucide-react';
import { Pagination } from '../../../../components/common/Pagination';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StockAccountingProps {
  setSelectedLedgerEntity?: (v: any) => void;
  setActiveTab?: (tab: string) => void;
}

interface ProductStockMetrics {
  product: Product;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  totalPurchasedQty: number;
  totalSoldQty: number;
  totalReturnedQty: number;
  totalSalesRevenue: number;
  totalCogs: number; // Cost of Goods Sold
  realizedGrossProfit: number;
  marginPercent: number;
  stockValuationCost: number;
  stockValuationRetail: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

const StockAccounting: React.FC<StockAccountingProps> = ({
  setActiveTab,
}) => {
  const { hasPermission } = useAuth();
  const { settings } = useSettings();

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [saleReturns, setSaleReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal for Product Movement History
  const [selectedProductMetrics, setSelectedProductMetrics] = useState<ProductStockMetrics | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodSnap, ordSnap, purchSnap, retSnap] = await Promise.all([
        getDocs(query(collection(db, 'products'), orderBy('name'))),
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'purchases'))).catch(() => ({ docs: [] })),
        getDocs(query(collection(db, 'sale_returns'))).catch(() => ({ docs: [] })),
      ]);

      setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setOrders(ordSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setPurchases(purchSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSaleReturns(retSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading stock accounting data:', err);
      toast.error('Failed to load stock accounting data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute live stock metrics for each product
  const productMetricsList: ProductStockMetrics[] = products.map(prod => {
    const costPrice = Number(prod.costPrice) || Number(prod.price) || 0;
    const sellingPrice = Number(prod.price) || 0;
    const currentStock = Number(prod.stock) || 0;

    // 1. Calculate units sold from orders
    let totalSoldQty = 0;
    let totalSalesRevenue = 0;

    orders.forEach(order => {
      if (order.status !== 'cancelled' && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (item.productId === prod.id || item.id === prod.id || item.name === prod.name) {
            const qty = Number(item.quantity) || 1;
            const price = Number(item.price) || sellingPrice;
            totalSoldQty += qty;
            totalSalesRevenue += qty * price;
          }
        });
      }
    });

    // 2. Calculate returns for this product
    let totalReturnedQty = 0;
    saleReturns.forEach(ret => {
      if (Array.isArray(ret.items)) {
        ret.items.forEach((item: any) => {
          if (item.productId === prod.id || item.name === prod.name) {
            totalReturnedQty += Number(item.quantity) || 1;
          }
        });
      }
    });

    // 3. Estimated initial/total purchased
    const totalPurchasedQty = currentStock + totalSoldQty - totalReturnedQty;

    // 4. Financial Calculations
    const totalCogs = totalSoldQty * costPrice;
    const realizedGrossProfit = totalSalesRevenue - totalCogs;
    const marginPercent = totalSalesRevenue > 0 ? (realizedGrossProfit / totalSalesRevenue) * 100 : 0;

    const stockValuationCost = currentStock * costPrice;
    const stockValuationRetail = currentStock * sellingPrice;

    let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
    if (currentStock <= 0) {
      status = 'out_of_stock';
    } else if (currentStock < 5) {
      status = 'low_stock';
    }

    return {
      product: prod,
      costPrice,
      sellingPrice,
      currentStock,
      totalPurchasedQty,
      totalSoldQty,
      totalReturnedQty,
      totalSalesRevenue,
      totalCogs,
      realizedGrossProfit,
      marginPercent,
      stockValuationCost,
      stockValuationRetail,
      status,
    };
  });

  // Extract unique categories
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  // Filter Logic
  const filteredMetrics = productMetricsList.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && item.product.category !== categoryFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = (item.product.name || '').toLowerCase().includes(q);
      const matchesCat = (item.product.category || '').toLowerCase().includes(q);
      const matchesBrand = (item.product.brand || '').toLowerCase().includes(q);
      const matchesSku = (item.product.sku || item.product.id || '').toLowerCase().includes(q);
      if (!matchesName && !matchesCat && !matchesBrand && !matchesSku) return false;
    }

    return true;
  });

  // Aggregate KPI Metrics
  const totalStockUnits = productMetricsList.reduce((sum, m) => sum + m.currentStock, 0);
  const totalStockCostValuation = productMetricsList.reduce((sum, m) => sum + m.stockValuationCost, 0);
  const totalStockRetailValuation = productMetricsList.reduce((sum, m) => sum + m.stockValuationRetail, 0);
  const totalRealizedProfit = productMetricsList.reduce((sum, m) => sum + m.realizedGrossProfit, 0);
  const lowStockCount = productMetricsList.filter(m => m.status === 'low_stock' || m.status === 'out_of_stock').length;

  // Export CSV
  const exportToCSV = () => {
    if (filteredMetrics.length === 0) {
      toast.error('No stock records to export');
      return;
    }

    const headers = [
      'Product Name',
      'Category',
      'Cost Price (৳)',
      'Selling Price (৳)',
      'On-Hand Stock Qty',
      'Stock Valuation @ Cost (৳)',
      'Stock Valuation @ Retail (৳)',
      'Total Units Sold',
      'Realized Gross Profit (৳)',
      'Gross Margin (%)',
      'Status',
    ];

    const rows = filteredMetrics.map(m => [
      `"${m.product.name}"`,
      `"${m.product.category || 'General'}"`,
      m.costPrice,
      m.sellingPrice,
      m.currentStock,
      m.stockValuationCost,
      m.stockValuationRetail,
      m.totalSoldQty,
      m.realizedGrossProfit,
      `${m.marginPercent.toFixed(1)}%`,
      m.status.toUpperCase(),
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stock_Accounting_Valuation_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export PDF
  const exportToPDF = () => {
    if (filteredMetrics.length === 0) {
      toast.error('No records to export');
      return;
    }

    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text(settings?.siteName || 'Click2IT', 14, 18);
    doc.setFontSize(11);
    doc.text('Inventory Stock Valuation & Profitability Report', 14, 25);
    doc.setFontSize(9);
    doc.text(
      `As of: ${new Date().toLocaleDateString()} | Total Stock Value (Cost): ${formatCurrency(totalStockCostValuation, settings)} | Total On-Hand Qty: ${totalStockUnits}`,
      14,
      31
    );

    const body = filteredMetrics.map(m => [
      m.product.name,
      m.product.category || '-',
      formatCurrency(m.costPrice, settings),
      formatCurrency(m.sellingPrice, settings),
      m.currentStock,
      formatCurrency(m.stockValuationCost, settings),
      m.totalSoldQty,
      formatCurrency(m.realizedGrossProfit, settings),
      `${m.marginPercent.toFixed(1)}%`,
      m.status.replace('_', ' ').toUpperCase(),
    ]);

    autoTable(doc, {
      startY: 36,
      head: [['Product Name', 'Category', 'Cost Price', 'Selling Price', 'Stock Qty', 'Valuation (Cost)', 'Units Sold', 'Gross Profit', 'Margin %', 'Status']],
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [8, 22, 33] },
      styles: { fontSize: 7 },
    });

    doc.save(`Stock_Accounting_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (!hasPermission('manage_finances') && !hasPermission('manage_inventory')) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden space-y-6">
      {/* Header Bar */}
      <div className="p-6 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Boxes className="text-[#EF4444]" /> Live Stock Accounting & Profitability Tracker
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Real-time stock valuation, cost of goods sold (COGS), purchase additions, and sales profitability per SKU.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportToCSV}
            className="bg-[#081621] hover:bg-[#EF4444] text-white px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download size={14} /> CSV Valuation
          </button>
          <button
            onClick={exportToPDF}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <Printer size={14} /> PDF Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Inventory Value (@ Cost)</span>
            <DollarSign size={16} className="text-blue-600" />
          </div>
          <span className="text-xl font-black text-blue-950 mt-1 block">
            {formatCurrency(totalStockCostValuation, settings)}
          </span>
          <span className="text-[10px] text-blue-600 mt-1 block">Total asset cost of on-hand items</span>
        </div>

        <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Potential Value (@ Retail)</span>
            <Layers size={16} className="text-purple-600" />
          </div>
          <span className="text-xl font-black text-purple-950 mt-1 block">
            {formatCurrency(totalStockRetailValuation, settings)}
          </span>
          <span className="text-[10px] text-purple-600 mt-1 block">Retail price if 100% stock is sold</span>
        </div>

        <div className="bg-green-50/70 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Realized Gross Profit</span>
            <TrendingUp size={16} className="text-green-600" />
          </div>
          <span className="text-xl font-black text-green-950 mt-1 block">
            {formatCurrency(totalRealizedProfit, settings)}
          </span>
          <span className="text-[10px] text-green-600 mt-1 block">Actual profit earned from sold units</span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Total On-Hand Units</span>
            <Package size={16} className="text-amber-600" />
          </div>
          <span className="text-xl font-black text-amber-950 mt-1 block">
            {totalStockUnits.toLocaleString()} Units
          </span>
          <span className="text-[10px] text-amber-600 mt-1 block">
            {lowStockCount} items in low/out of stock
          </span>
        </div>
      </div>

      {/* Filter Row: Category, Status, Search */}
      <div className="px-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter Buttons */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                statusFilter === 'all' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              All Items
            </button>
            <button
              onClick={() => { setStatusFilter('in_stock'); setCurrentPage(1); }}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                statusFilter === 'in_stock' ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              In Stock
            </button>
            <button
              onClick={() => { setStatusFilter('low_stock'); setCurrentPage(1); }}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                statusFilter === 'low_stock' ? "bg-white text-amber-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Low Stock (&lt;5)
            </button>
            <button
              onClick={() => { setStatusFilter('out_of_stock'); setCurrentPage(1); }}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-md transition-all",
                statusFilter === 'out_of_stock' ? "bg-white text-red-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Out of Stock
            </button>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="py-1.5 px-3 text-xs border border-gray-200 rounded-lg outline-none font-medium"
            >
              <option value="all">-- All Categories --</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Search */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search product name, category, SKU..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-100"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
        </div>
      </div>

      {/* Stock Accounting Table */}
      <div className="overflow-x-auto border-t border-gray-100">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-200">
            <tr>
              <th className="px-6 py-3.5">Product & SKU</th>
              <th className="px-6 py-3.5">Category</th>
              <th className="px-6 py-3.5 text-right">Cost Price</th>
              <th className="px-6 py-3.5 text-right">Selling Price</th>
              <th className="px-6 py-3.5 text-center">On-Hand Stock</th>
              <th className="px-6 py-3.5 text-right">Stock Value (@ Cost)</th>
              <th className="px-6 py-3.5 text-center">Sold Units</th>
              <th className="px-6 py-3.5 text-right">Gross Profit</th>
              <th className="px-6 py-3.5 text-right">Margin %</th>
              <th className="px-6 py-3.5 text-center">Status</th>
              <th className="px-6 py-3.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={11} className="px-6 py-12 text-center text-gray-400">Loading stock accounting data...</td>
              </tr>
            ) : filteredMetrics.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-6 py-12 text-center text-gray-400 italic">
                  No stock records match the selected filter.
                </td>
              </tr>
            ) : (
              filteredMetrics.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((m, idx) => (
                <tr key={m.product.id || idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <span className="font-bold text-gray-900 block">{m.product.name}</span>
                    <span className="text-[10px] font-mono text-gray-400">ID: #{m.product.id?.slice(0, 8)}</span>
                  </td>
                  <td className="px-6 py-3.5 text-gray-600">
                    {m.product.category || 'General'}
                  </td>
                  <td className="px-6 py-3.5 text-right font-medium text-gray-700">
                    {formatCurrency(m.costPrice, settings)}
                  </td>
                  <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                    {formatCurrency(m.sellingPrice, settings)}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={cn(
                      "font-black px-2.5 py-0.5 rounded text-xs inline-block",
                      m.currentStock <= 0 ? "bg-red-100 text-red-700" :
                      m.currentStock < 5 ? "bg-amber-100 text-amber-700" :
                      "bg-blue-50 text-blue-900"
                    )}>
                      {m.currentStock}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-bold text-blue-900">
                    {formatCurrency(m.stockValuationCost, settings)}
                  </td>
                  <td className="px-6 py-3.5 text-center font-semibold text-gray-700">
                    {m.totalSoldQty}
                  </td>
                  <td className={cn(
                    "px-6 py-3.5 text-right font-black",
                    m.realizedGrossProfit >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(m.realizedGrossProfit, settings)}
                  </td>
                  <td className="px-6 py-3.5 text-right font-medium text-gray-600">
                    {m.marginPercent.toFixed(1)}%
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      m.status === 'in_stock' ? "bg-green-100 text-green-700" :
                      m.status === 'low_stock' ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {m.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <button
                      onClick={() => setSelectedProductMetrics(m)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="View Movement Breakdown"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredMetrics.length > 0 && (
            <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-6 py-4 text-right uppercase text-[10px] text-gray-500 tracking-wider">
                  Total Valuation & Profit (Filtered)
                </td>
                <td className="px-6 py-4 text-center text-blue-900">
                  {filteredMetrics.reduce((sum, m) => sum + m.currentStock, 0)} Units
                </td>
                <td className="px-6 py-4 text-right text-blue-900">
                  {formatCurrency(filteredMetrics.reduce((sum, m) => sum + m.stockValuationCost, 0), settings)}
                </td>
                <td className="px-6 py-4 text-center text-gray-700">
                  {filteredMetrics.reduce((sum, m) => sum + m.totalSoldQty, 0)} Units
                </td>
                <td className="px-6 py-4 text-right text-green-600">
                  {formatCurrency(filteredMetrics.reduce((sum, m) => sum + m.realizedGrossProfit, 0), settings)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      <div className="p-6 pt-0">
        <Pagination
          currentPage={currentPage}
          totalItems={filteredMetrics.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* Product Movement Breakdown Modal */}
      {selectedProductMetrics && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="p-5 bg-[#081621] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Package size={16} className="text-[#EF4444]" /> {selectedProductMetrics.product.name}
                </h3>
                <span className="text-[10px] text-gray-300">
                  Category: {selectedProductMetrics.product.category || 'General'} | SKU: #{selectedProductMetrics.product.id?.slice(0, 8)}
                </span>
              </div>
              <button onClick={() => setSelectedProductMetrics(null)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Cost Price</span>
                  <span className="text-sm font-black text-gray-900 mt-0.5 block">
                    {formatCurrency(selectedProductMetrics.costPrice, settings)}
                  </span>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Selling Price</span>
                  <span className="text-sm font-black text-gray-900 mt-0.5 block">
                    {formatCurrency(selectedProductMetrics.sellingPrice, settings)}
                  </span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <span className="text-[10px] text-blue-700 font-bold uppercase block">On-Hand Stock</span>
                  <span className="text-sm font-black text-blue-900 mt-0.5 block">
                    {selectedProductMetrics.currentStock} Units
                  </span>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <span className="text-[10px] text-green-700 font-bold uppercase block">Realized Profit</span>
                  <span className="text-sm font-black text-green-900 mt-0.5 block">
                    {formatCurrency(selectedProductMetrics.realizedGrossProfit, settings)}
                  </span>
                </div>
              </div>

              {/* Movement Summary */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-2">
                <h4 className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                  Stock Inventory Movement Summary
                </h4>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                    <span className="text-[10px] text-gray-500 block">Total Purchased</span>
                    <span className="text-sm font-black text-gray-900">{selectedProductMetrics.totalPurchasedQty}</span>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                    <span className="text-[10px] text-gray-500 block">Total Sold</span>
                    <span className="text-sm font-black text-blue-600">{selectedProductMetrics.totalSoldQty}</span>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                    <span className="text-[10px] text-gray-500 block">Returns Restocked</span>
                    <span className="text-sm font-black text-green-600">{selectedProductMetrics.totalReturnedQty}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedProductMetrics(null)}
                  className="px-5 py-2 bg-gray-800 hover:bg-black text-white font-bold rounded-lg transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAccounting;
