import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { formatCurrency, cn } from '../../../../lib/utils';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import { FileText, Search, Download, ArrowUp, ArrowDown, ShoppingBag } from 'lucide-react';
import { Pagination } from '../../../../components/common/Pagination';

interface SaleRecord {
  id: string;
  orderId: string;
  documentNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  paymentMethod?: string;
  paymentStatus?: string;
}

const SalesReportTab: React.FC = () => {
  const { isAdmin, hasPermission } = useAuth();
  const { settings } = useSettings();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [reportStartDate, setReportStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportSearch, setReportSearch] = useState('');
  const [reportSortConfig, setReportSortConfig] = useState({ key: 'date', direction: 'desc' as 'asc' | 'desc' });
  const [salesData, setSalesData] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const records: SaleRecord[] = [];

      snap.forEach(docSnap => {
        const order = docSnap.data();
        // Skip cancelled or failed orders
        if (order.status === 'cancelled' || order.status === 'failed') return;
        // Completely exclude quotations (they are estimates, not finalized sales)
        if (order.type === 'quotation') return;
        // Exclude hosting orders
        if ((order as any).platform === 'hosting' || (order as any).isHostingOrder || order.type === 'hosting' || order.type === 'domain') return;

        const orderDate = order.createdAt || new Date().toISOString();
        const docNum = order.documentNumber || docSnap.id.slice(0, 8);
        const custName = order.customerName || (order.shippingAddress?.fullName) || 'Walk-in Customer';
        const custPhone = order.customerPhone || order.shippingAddress?.phone || '';

        if (order.items && Array.isArray(order.items) && order.items.length > 0) {
          const orderDiscount = order.discountAmount || 0;
          const orderSubtotal = order.items.reduce((sum: number, i: any) => sum + ((i.price || i.unitPrice || 0) * (i.quantity || 1)), 0);

          order.items.forEach((item: any, idx: number) => {
            const itemType = (item as any).itemType || '';
            const itemCat = ((item as any).category || '').toLowerCase();
            if (itemType === 'hosting' || itemType === 'domain' || itemType === 'domain_renewal' || itemType === 'domain_transfer' || itemType === 'ssl' || itemCat.includes('hosting') || itemCat.includes('domain')) return;

            const itemQty = item.quantity || 1;
            const itemPrice = item.price || item.unitPrice || 0;
            const lineTotal = itemQty * itemPrice;
            
            // Proportional discount for this item
            let itemDiscount = 0;
            if (orderSubtotal > 0 && orderDiscount > 0) {
              itemDiscount = orderDiscount * (lineTotal / orderSubtotal);
            }

            records.push({
              id: `${docSnap.id}-${idx}`,
              orderId: docSnap.id,
              documentNumber: docNum,
              date: orderDate,
              customerName: custName,
              customerPhone: custPhone,
              productName: item.name || item.productName || 'General Item',
              quantity: itemQty,
              unitPrice: itemPrice,
              total: lineTotal - itemDiscount, // Net item total
              paymentMethod: order.paymentMethod || 'cash',
              paymentStatus: order.paymentStatus || 'paid',
            });
          });

          // Include shipping charge so the report matches the invoice grand total
          if (order.shippingCost && Number(order.shippingCost) > 0) {
            records.push({
              id: `${docSnap.id}-shipping`,
              orderId: docSnap.id,
              documentNumber: docNum,
              date: orderDate,
              customerName: custName,
              customerPhone: custPhone,
              productName: 'Delivery / Shipping Fee',
              quantity: 1,
              unitPrice: Number(order.shippingCost),
              total: Number(order.shippingCost),
              paymentMethod: order.paymentMethod || 'cash',
              paymentStatus: order.paymentStatus || 'paid',
            });
          }
        } else {
          // Single order entry if items array is missing
          records.push({
            id: docSnap.id,
            orderId: docSnap.id,
            documentNumber: docNum,
            date: orderDate,
            customerName: custName,
            customerPhone: custPhone,
            productName: 'Sale Order #' + docNum,
            quantity: 1,
            unitPrice: order.total || 0,
            total: order.total || 0,
            paymentMethod: order.paymentMethod || 'cash',
            paymentStatus: order.paymentStatus || 'paid',
          });
        }
      });

      setSalesData(records);
    } catch (error) {
      console.error('Error fetching sales report data:', error);
      toast.error('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  const getSalesReportData = () => {
    let data = salesData.filter(sale => {
      const saleDate = new Date(sale.date).toISOString().split('T')[0];
      return saleDate >= reportStartDate && saleDate <= reportEndDate;
    });

    if (reportSearch) {
      const queryLower = reportSearch.toLowerCase();
      data = data.filter(sale =>
        sale.productName.toLowerCase().includes(queryLower) ||
        sale.customerName.toLowerCase().includes(queryLower) ||
        sale.documentNumber.toLowerCase().includes(queryLower) ||
        (sale.customerPhone || '').toLowerCase().includes(queryLower)
      );
    }

    data.sort((a, b) => {
      let valA = a[reportSortConfig.key as keyof SaleRecord] as any;
      let valB = b[reportSortConfig.key as keyof SaleRecord] as any;

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return reportSortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return reportSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    if (reportSearch.trim()) {
      const q = reportSearch.toLowerCase();
      data = data.filter(r => 
        (r.customerName || '').toLowerCase().includes(q) ||
        (r.customerPhone || '').toLowerCase().includes(q) ||
        (r.productName || '').toLowerCase().includes(q) ||
        (r.documentNumber || '').toLowerCase().includes(q)
      );
    }
    return data;
  };

  const currentReportData = getSalesReportData();
  const totalSalesAmount = currentReportData.reduce((sum, r) => sum + r.total, 0);
  const totalUnitsSold = currentReportData.reduce((sum, r) => sum + r.quantity, 0);
  const uniqueInvoicesCount = new Set(currentReportData.map(r => r.orderId)).size;

  const exportToCSV = () => {
    if (currentReportData.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = ['Date', 'Invoice No', 'Customer Name', 'Phone', 'Product Name', 'Quantity', 'Unit Price', 'Total Amount', 'Payment Method'];
    const rows = currentReportData.map(row => [
      new Date(row.date).toLocaleDateString(),
      row.documentNumber,
      `"${row.customerName}"`,
      row.customerPhone || '',
      `"${row.productName}"`,
      row.quantity,
      row.unitPrice,
      row.total,
      row.paymentMethod || 'cash',
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${reportStartDate}-to-${reportEndDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!hasPermission('manage_finances')) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden space-y-6">
      {/* Header & Date Pickers */}
      <div className="p-6 pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="text-[#EF4444]" /> Sales Accounting Report
          </h2>
          <p className="text-xs text-gray-500 mt-1">Real-time revenue, invoiced items, and sales breakdown from offline POS and online orders.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <label className="text-[10px] font-bold text-gray-500 uppercase">From</label>
            <input
              type="date"
              value={reportStartDate}
              onChange={e => { setReportStartDate(e.target.value); setCurrentPage(1); }}
              className="border-none bg-transparent text-xs font-bold text-gray-800 p-0 focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <label className="text-[10px] font-bold text-gray-500 uppercase">To</label>
            <input
              type="date"
              value={reportEndDate}
              onChange={e => { setReportEndDate(e.target.value); setCurrentPage(1); }}
              className="border-none bg-transparent text-xs font-bold text-gray-800 p-0 focus:ring-0"
            />
          </div>
          <button
            onClick={exportToCSV}
            className="bg-[#081621] hover:bg-[#EF4444] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-bold text-xs shadow-sm"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Total Sales Revenue</span>
          <span className="text-xl font-black text-blue-900 mt-1 block">{formatCurrency(totalSalesAmount, settings)}</span>
          <span className="text-[10px] text-blue-600 mt-1 block">In selected period</span>
        </div>
        <div className="bg-green-50/60 border border-green-100 rounded-xl p-4">
          <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider block">Total Units Sold</span>
          <span className="text-xl font-black text-green-900 mt-1 block">{totalUnitsSold.toLocaleString()} Units</span>
          <span className="text-[10px] text-green-600 mt-1 block">Line items delivered</span>
        </div>
        <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-4">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Total Invoices</span>
          <span className="text-xl font-black text-purple-900 mt-1 block">{uniqueInvoicesCount} Orders</span>
          <span className="text-[10px] text-purple-600 mt-1 block">Unique transactions</span>
        </div>
        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Average Item Value</span>
          <span className="text-xl font-black text-amber-900 mt-1 block">
            {formatCurrency(totalUnitsSold > 0 ? totalSalesAmount / totalUnitsSold : 0, settings)}
          </span>
          <span className="text-[10px] text-amber-600 mt-1 block">Per unit average</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by invoice #, customer name, phone, or product name..."
            value={reportSearch}
            onChange={e => { setReportSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border-t border-gray-100">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-200">
            <tr>
              <th className="px-6 py-3.5">Date</th>
              <th className="px-6 py-3.5">Invoice #</th>
              <th className="px-6 py-3.5">Customer</th>
              <th className="px-6 py-3.5">Product Name</th>
              <th className="px-6 py-3.5 text-center">Qty</th>
              <th className="px-6 py-3.5 text-right">Unit Price</th>
              <th className="px-6 py-3.5 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading sales records...</td>
              </tr>
            ) : currentReportData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">No sales records found for the selected filter range.</td>
              </tr>
            ) : (
              currentReportData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3.5 text-gray-500">{new Date(row.date).toLocaleDateString()}</td>
                  <td className="px-6 py-3.5 font-mono font-bold text-blue-600">#{row.documentNumber}</td>
                  <td className="px-6 py-3.5">
                    <span className="font-bold text-gray-900 block">{row.customerName}</span>
                    {row.customerPhone && <span className="text-[10px] text-gray-400">{row.customerPhone}</span>}
                  </td>
                  <td className="px-6 py-3.5 font-medium text-gray-800">{row.productName}</td>
                  <td className="px-6 py-3.5 text-center font-bold text-gray-700">{row.quantity}</td>
                  <td className="px-6 py-3.5 text-right font-medium text-gray-600">{formatCurrency(row.unitPrice, settings)}</td>
                  <td className="px-6 py-3.5 text-right font-bold text-gray-900">{formatCurrency(row.total, settings)}</td>
                </tr>
              ))
            )}
          </tbody>
          {currentReportData.length > 0 && (
            <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-6 py-4 text-right uppercase text-[10px] text-gray-500 tracking-wider">Filtered Total</td>
                <td className="px-6 py-4 text-center text-gray-900">{totalUnitsSold} Units</td>
                <td className="px-6 py-4 text-right"></td>
                <td className="px-6 py-4 text-right text-base text-red-600">{formatCurrency(totalSalesAmount, settings)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="p-6 pt-0">
        <Pagination
          currentPage={currentPage}
          totalItems={currentReportData.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
    </div>
  );
};

export default SalesReportTab;
