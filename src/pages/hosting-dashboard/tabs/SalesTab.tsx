import React from 'react';
import { 
  Globe, Server, FileText, HeadphonesIcon, TrendingUp, DollarSign, CheckCircle2, User, Search, RefreshCw, Plus, Edit2, Shield, ShieldOff, Trash2, ArrowUpRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { formatCurrency, cn } from '../../../lib/utils';
import SupportTickets from '../../admin/tabs/hosting/SupportTickets';
import {
  PagesEditorModule, CategoriesModule, PlanPackagesModule, ExtraServicesModule, 
  AddonPackagesModule, PromoCodesModule, ServersModule, DomainPricingModule, DomainRegistrarsModule
} from '../modules';

export function SalesTab({ state }) {
  const {
    activeTab, setActiveTab, thisMonthRevenue, lastMonthRevenue, totalPaid,
    orders, areaData, selectedYear, setSelectedYear, yearOptions
  } = state;

  if (activeTab !== 'sales') return null;

  const percentageChange = lastMonthRevenue > 0 
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
    : 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header and Quick Stats */}
      <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-200">
              <TrendingUp className="text-white" size={24} />
            </div>
            Sales Overview
          </h2>
          <button 
            onClick={() => setActiveTab('all-orders')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-emerald-300 hover:text-emerald-600 transition-all shadow-sm"
          >
            View All Orders <ArrowUpRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Sales Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <DollarSign size={80} className="text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total Lifetime Sales</p>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(totalPaid)}</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold border border-emerald-100">Lifetime</span>
              <span className="text-xs font-medium text-slate-400">All successful orders</span>
            </div>
          </div>

          {/* This Month Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp size={80} className="text-blue-500" />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Revenue This Month</p>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(thisMonthRevenue)}</p>
            <div className="mt-4 flex items-center gap-2">
              <span className={cn(
                "px-2.5 py-1 rounded-md text-xs font-bold border flex items-center gap-1",
                percentageChange >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
              )}>
                {percentageChange >= 0 ? <ArrowUpRight size={12}/> : <TrendingUp className="rotate-180" size={12}/>}
                {Math.abs(percentageChange).toFixed(1)}%
              </span>
              <span className="text-xs font-medium text-slate-400">vs last month</span>
            </div>
          </div>

          {/* Total Orders Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-purple-200 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <FileText size={80} className="text-purple-500" />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total Orders</p>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{orders.length}</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-bold border border-purple-100">All Time</span>
              <span className="text-xs font-medium text-slate-400">Total orders placed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart Section */}
      <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Revenue Trends</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">Monthly paid vs invoiced revenue for {selectedYear}</p>
          </div>
          
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer shadow-sm"
          >
            {yearOptions.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>

        <div className="w-full h-[350px] mt-4">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
            <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSalesPaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSalesInvoiced" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748B" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#64748B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} tickFormatter={val => `৳${val}`} />
              <Tooltip 
                formatter={(value) => [formatCurrency(value), '']} 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px 16px', fontWeight: 'bold' }}
                cursor={{ stroke: '#94A3B8', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area type="monotone" name="Paid Revenue" dataKey="paid" stroke="#10B981" fillOpacity={1} fill="url(#colorSalesPaid)" strokeWidth={4} activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 3 }} />
              <Area type="monotone" name="Invoiced Amount" dataKey="invoiced" stroke="#94A3B8" fillOpacity={1} fill="url(#colorSalesInvoiced)" strokeWidth={2} strokeDasharray="5 5" activeDot={{ r: 5, fill: '#94A3B8', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
