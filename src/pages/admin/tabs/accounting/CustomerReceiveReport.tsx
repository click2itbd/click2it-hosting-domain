import React, { useState } from 'react';
import { Order, Transaction, Customer, SiteSettings } from '../../../../types';
import { formatCurrency, cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Download,
  Search,
} from 'lucide-react';
import { Pagination } from '../../../../components/common/Pagination';

interface CustomerReceiveReportProps {
  orders: Order[];
  transactions: Transaction[];
  customers: Customer[];
  paymentAccounts: any[];
  settings: SiteSettings;
  hasPermission: (permission: string) => boolean;
}

const CustomerReceiveReport: React.FC<CustomerReceiveReportProps> = ({
  orders,
  transactions,
  customers,
  paymentAccounts,
  settings,
  hasPermission,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [crReportStartDate, setCrReportStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [crReportEndDate, setCrReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [crReportSearch, setCrReportSearch] = useState('');
  const [crReportMethod, setCrReportMethod] = useState('all');
  const [crReportCustomer, setCrReportCustomer] = useState('all');

  const mfsMethods = React.useMemo(() => {
    const defaultMfs = ['bkash', 'nagad', 'rocket', 'upay', 'cellfin', 'surecash'];
    const dbMfs = paymentAccounts.filter(p => p.type === 'mfs' || p.type === 'mobile_banking').map(p => p.name.toLowerCase());
    return [...new Set([...defaultMfs, ...dbMfs])];
  }, [paymentAccounts]);

  const getCustomerReceiveReportData = () => {
    const reportData: Array<{
      id: string;
      date: string;
      customerName: string;
      description: string;
      paymentMethod: string;
      amount: number;
      referenceId: string;
    }> = [];

    transactions.forEach(tx => {
      if (!['payment_received', 'money_receipt'].includes(tx.type)) {
        return;
      }

      const txDate = tx.date || tx.createdAt || new Date().toISOString();
      const orderDate = txDate.split('T')[0];
      if (orderDate < crReportStartDate || orderDate > crReportEndDate) {
        return;
      }

      const customerName = tx.entityName || "Guest Customer";
      
      if (crReportCustomer !== 'all' && tx.entityId !== crReportCustomer) {
        return;
      }

      let method = tx.paymentMethod || 'cash';
      
      if (tx.type === 'sale' && tx.referenceId) {
        const matchingOrder = orders.find(o => o.id === tx.referenceId);
        if (matchingOrder && matchingOrder.paymentMethod) {
          method = matchingOrder.paymentMethod;
        }
      } else {
        const descLower = (tx.description || '').toLowerCase();
        if (descLower.includes('bkash')) method = 'bkash';
        else if (descLower.includes('nagad')) method = 'nagad';
        else if (descLower.includes('rocket')) method = 'rocket';
        else if (descLower.includes('bank')) method = 'bank';
        else if (descLower.includes('card') || descLower.includes('visa') || descLower.includes('mastercard')) method = 'card';
        else if (descLower.includes('cellfin')) method = 'cellfin';
      }

      if (crReportMethod !== 'all' && method !== crReportMethod) {
        return;
      }

      const refId = tx.referenceId || "N/A";
      const description = tx.description || `Payment received from ${customerName}`;

      if (crReportSearch) {
        const s = crReportSearch.toLowerCase();
        const matchesSearch = 
          customerName.toLowerCase().includes(s) ||
          description.toLowerCase().includes(s) ||
          refId.toLowerCase().includes(s) ||
          method.toLowerCase().includes(s);
        if (!matchesSearch) {
          return;
        }
      }

      reportData.push({
        id: tx.id,
        date: txDate,
        customerName,
        description,
        paymentMethod: method,
        amount: tx.amount,
        referenceId: refId,
      });
    });

    return reportData.sort((a, b) => b.date.localeCompare(a.date));
  };

  const exportCrToCSV = () => {
    const data = getCustomerReceiveReportData();
    const headers = ['Date', 'Receipt No / Ref', 'Customer Name', 'Description', 'Payment Method', 'Amount'];
    const csvRows = [
      headers.join(','),
      ...data.map(row => [
        `"${new Date(row.date).toLocaleString()}"`,
        `"${row.referenceId}"`,
        `"${row.customerName}"`,
        `"${row.description.replace(/"/g, '""')}"`,
        `"${row.paymentMethod.toUpperCase()}"`,
        row.amount
      ].join(','))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customer_receive_report_${crReportStartDate}_to_${crReportEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!hasPermission('manage_reports')) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="text-[#EF4444]" /> Customer Receive Report
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase">From</label>
            <input
              type="date"
              value={crReportStartDate}
              onChange={e => setCrReportStartDate(e.target.value)}
              className="border-gray-200 rounded-md text-sm focus:ring-[#EF4444] focus:border-[#EF4444]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase">To</label>
            <input
              type="date"
              value={crReportEndDate}
              onChange={e => setCrReportEndDate(e.target.value)}
              className="border-gray-200 rounded-md text-sm focus:ring-[#EF4444] focus:border-[#EF4444]"
            />
          </div>
          <button
            onClick={exportCrToCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-green-700 transition-all font-bold text-sm"
          >
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-6 bg-gray-50 border-b border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by customer name, ref, desc..."
            value={crReportSearch}
            onChange={e => setCrReportSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-gray-200 rounded-md text-sm focus:ring-[#EF4444] focus:border-[#EF4444] bg-white"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>

        <div>
          <select
            value={crReportMethod}
            onChange={e => setCrReportMethod(e.target.value)}
            className="w-full border-gray-200 rounded-md text-sm focus:ring-[#EF4444] focus:border-[#EF4444] bg-white"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash (Direct/COD)</option>
              {paymentAccounts.filter(p => p.status !== "inactive").map((p: any) => (
                <option key={p.id || p.name} value={p.name.toLowerCase()}>{p.name}</option>
              ))}
            <option value="card">Visa/Mastercard</option>
            <option value="bank">Bank Transfer</option>
            <option value="other">Other Gateways</option>
          </select>
        </div>

        <div>
          <select
            value={crReportCustomer}
            onChange={e => setCrReportCustomer(e.target.value)}
            className="w-full border-gray-200 rounded-md text-sm focus:ring-[#EF4444] focus:border-[#EF4444] bg-white"
          >
            <option value="all">All Customers</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50/50 border-b border-gray-100">
        {(() => {
          const reportRows = getCustomerReceiveReportData();
          const totalAmount = reportRows.reduce((sum, r) => sum + r.amount, 0);
          const cashTotal = reportRows.filter(r => r.paymentMethod === 'cash' || r.paymentMethod === 'cod').reduce((sum, r) => sum + r.amount, 0);
          const mfsTotal = reportRows.filter(r => mfsMethods.includes((r.paymentMethod || '').toLowerCase())).reduce((sum, r) => sum + r.amount, 0);
          const bankCardTotal = totalAmount - cashTotal - mfsTotal;

          return (
            <>
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Received</p>
                <p className="text-2xl font-black text-gray-900">{formatCurrency(totalAmount, settings)}</p>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">{reportRows.length} total payments collected</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cash Collected</p>
                <p className="text-2xl font-black text-green-600">{formatCurrency(cashTotal, settings)}</p>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">Physical cash & cash-on-delivery payments</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">MFS / Mobile Wallets</p>
                <p className="text-2xl font-black text-pink-600">{formatCurrency(mfsTotal, settings)}</p>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">bKash, Nagad, Rocket, Cellfin</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Bank & Card Collections</p>
                <p className="text-2xl font-black text-blue-600">{formatCurrency(bankCardTotal, settings)}</p>
                <p className="text-[10px] text-gray-400 mt-2 font-medium font-sans">Direct transfers & digital cards</p>
              </div>
            </>
          );
        })()}
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Date/Time</th>
              <th className="px-6 py-4">Receipt No / Ref</th>
              <th className="px-6 py-4">Customer Name</th>
              <th className="px-6 py-4">Payment Method</th>
              <th className="px-6 py-4">Description / Memo</th>
              <th className="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {getCustomerReceiveReportData().slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row) => {
              const isCash = row.paymentMethod === 'cash' || row.paymentMethod === 'cod';
              const isMfs = mfsMethods.includes((row.paymentMethod || '').toLowerCase());
              const badgeClass = isCash
                ? "bg-green-100 text-green-700" 
                : isMfs 
                  ? "bg-pink-100 text-pink-700 border border-pink-200"
                  : "bg-blue-100 text-blue-700 border border-blue-200";

              return (
                <tr key={row.id} className="hover:bg-gray-50 transition-all font-sans">
                  <td className="px-6 py-4 text-xs font-medium text-gray-600">
                    {new Date(row.date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono font-bold text-gray-500">
                    {row.referenceId}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-700">
                    {row.customerName}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${badgeClass}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                      {row.paymentMethod === 'cod' ? 'CASH ON DELIVERY' : row.paymentMethod.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 truncate max-w-[200px]" title={row.description}>
                    {row.description}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-gray-950">
                    {formatCurrency(row.amount, settings)}
                  </td>
                </tr>
              );
            })}
            {getCustomerReceiveReportData().length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-gray-400 italic">
                  No payments received matching your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
          {getCustomerReceiveReportData().length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200 font-extrabold">
              <tr>
                <td colSpan={5} className="px-6 py-5 text-right uppercase text-xs text-gray-500 tracking-wider">
                  Total Collections For Selected Criteria
                </td>
                <td className="px-6 py-5 text-right text-gray-950 text-base">
                  {formatCurrency(getCustomerReceiveReportData().reduce((sum, r) => sum + r.amount, 0), settings)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={getCustomerReceiveReportData().length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};

export default CustomerReceiveReport;
