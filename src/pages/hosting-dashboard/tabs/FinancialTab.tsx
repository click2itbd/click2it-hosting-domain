import React from 'react';
import { 
  Globe, Server, FileText, HeadphonesIcon, TrendingUp, DollarSign, CheckCircle2, User, Search, RefreshCw, Plus, Edit2, Shield, ShieldOff, Trash2, ArrowUpRight
, AlertCircle } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { formatCurrency, cn } from '../../../lib/utils';
import SupportTickets from '../../admin/tabs/hosting/SupportTickets';
import {
  PagesEditorModule, CategoriesModule, PlanPackagesModule, ExtraServicesModule, 
  AddonPackagesModule, PromoCodesModule, ServersModule, DomainPricingModule, DomainRegistrarsModule
} from '../modules';

export function FinancialTab({ state }) {
  const {
    activeTab, thisMonthRevenue, totalOutstanding, totalPaid, orders, PAID_STATUSES, PENDING_STATUSES
  } = state;

  if (activeTab !== 'financial') return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function getMonthYear(dateVal) {
    if (!dateVal) return null;
    const d = new Date(dateVal.toDate ? dateVal.toDate() : dateVal);
    return { month: d.getMonth(), year: d.getFullYear() };
  }

  const monthlyBreakdown = MONTHS.map((m, idx) => {
    const monthOrders = orders.filter(o => {
      const my = getMonthYear(o.createdAt);
      return my && my.year === currentYear && my.month === idx;
    });
    const revenue = monthOrders.filter(o => PAID_STATUSES.includes(o.status) || o.paymentStatus === 'paid').reduce((s, o) => s + (Number(o.total) || 0), 0);
    const outstanding = monthOrders.filter(o => PENDING_STATUSES.includes(o.status)).reduce((s, o) => s + (Number(o.total) || 0), 0);
    return { month: m, revenue, outstanding, count: monthOrders.length };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8 relative overflow-hidden group hover:border-emerald-200 transition-all">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign size={100} className="text-emerald-500" />
          </div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-3 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg shadow-emerald-200">
              <DollarSign size={24} className="text-white" />
            </div>
            <p className="text-base font-bold text-slate-500 uppercase tracking-wider">Total Revenue</p>
          </div>
          <p className="text-4xl font-black text-slate-800 tracking-tight relative z-10">{formatCurrency(totalPaid)}</p>
          <div className="mt-4 flex items-center gap-2 relative z-10">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold border border-emerald-100">All Time</span>
            <span className="text-xs font-medium text-slate-400">Total collected revenue</span>
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8 relative overflow-hidden group hover:border-amber-200 transition-all">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle size={100} className="text-amber-500" />
          </div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg shadow-amber-200">
              <AlertCircle size={24} className="text-white" />
            </div>
            <p className="text-base font-bold text-slate-500 uppercase tracking-wider">Outstanding</p>
          </div>
          <p className="text-4xl font-black text-slate-800 tracking-tight relative z-10">{formatCurrency(totalOutstanding)}</p>
          <div className="mt-4 flex items-center gap-2 relative z-10">
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-bold border border-amber-100">Pending</span>
            <span className="text-xs font-medium text-slate-400">Unpaid invoices</span>
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8 relative overflow-hidden group hover:border-blue-200 transition-all">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={100} className="text-blue-500" />
          </div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-3 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl shadow-lg shadow-blue-200">
              <ArrowUpRight size={24} className="text-white" />
            </div>
            <p className="text-base font-bold text-slate-500 uppercase tracking-wider">This Month</p>
          </div>
          <p className="text-4xl font-black text-slate-800 tracking-tight relative z-10">{formatCurrency(thisMonthRevenue)}</p>
          <div className="mt-4 flex items-center gap-2 relative z-10">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-100">{MONTHS[now.getMonth()]}</span>
            <span className="text-xs font-medium text-slate-400">Paid in current month</span>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8">
        <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-8 flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
            <FileText size={20} />
          </div>
          {currentYear} Monthly Breakdown
        </h3>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Orders</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Revenue</th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyBreakdown.map((row, i) => (
                  <tr key={row.month} className={cn("hover:bg-slate-50/50 transition-colors", i % 2 === 0 ? "bg-white" : "bg-slate-50/20")}>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      <span className="inline-block w-8 text-slate-400 font-medium mr-2 text-xs">{String(i+1).padStart(2, '0')}</span> 
                      {row.month} {currentYear}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                        {row.count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-emerald-600 text-base">{formatCurrency(row.revenue)}</td>
                    <td className="px-6 py-4 text-right font-black text-amber-500 text-base">{formatCurrency(row.outstanding)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-900 text-white font-black">
                  <td className="px-6 py-5 rounded-bl-xl uppercase tracking-wider">Total {currentYear}</td>
                  <td className="px-6 py-5 text-right">{monthlyBreakdown.reduce((s, r) => s + r.count, 0)}</td>
                  <td className="px-6 py-5 text-right text-emerald-400 text-lg">{formatCurrency(monthlyBreakdown.reduce((s, r) => s + r.revenue, 0))}</td>
                  <td className="px-6 py-5 text-right text-amber-400 rounded-br-xl text-lg">{formatCurrency(monthlyBreakdown.reduce((s, r) => s + r.outstanding, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
