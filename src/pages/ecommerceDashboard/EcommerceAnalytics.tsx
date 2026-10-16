import React, { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../../lib/utils';
import { useSettings } from '../../context/SettingsContext';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { TrendingUp, ShoppingBag, DollarSign, Users, Calendar, Activity } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';

export const EcommerceAnalytics: React.FC = () => {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [range, setRange] = useState<'7' | '30' | 'month' | 'year' | 'all'>('30');

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(1000)));
        setAllOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      } catch (error) {
        console.error('Error fetching analytics', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { stats, salesData, categoryData, topProducts } = useMemo(() => {
    const now = new Date();
    let from = 0;
    if (range === '7') from = Date.now() - 7 * 86400000;
    else if (range === '30') from = Date.now() - 30 * 86400000;
    else if (range === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    else if (range === 'year') from = new Date(now.getFullYear(), 0, 1).getTime();

    // Store orders only (exclude hosting/domain/ERP/cancelled)
    const orders = allOrders.filter(o => {
      const isDomain = o.type === 'domain' || o.domain || o.items?.some((i: any) => i.itemType === 'domain');
      const isHosting = o.type === 'hosting' || o.hostingServiceId || o.items?.some((i: any) => i.itemType === 'hosting');
      const isERP = o.saleSource === 'in_store' || o.type === 'quotation' || o.type === 'challan';
      if (isDomain || isHosting || isERP) return false;
      if (o.status === 'cancelled' || o.status === 'returned') return false;
      return new Date(o.createdAt).getTime() >= from;
    });

    const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const customers = new Set(orders.map(o => o.customerEmail || o.customerPhone || o.userId).filter(Boolean));

    const byDate: Record<string, { ts: number; sales: number }> = {};
    orders.forEach(o => {
      const d = new Date(o.createdAt);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!byDate[key]) byDate[key] = { ts: d.getTime(), sales: 0 };
      byDate[key].sales += o.total || 0;
    });
    const salesData = Object.entries(byDate).sort((a, b) => a[1].ts - b[1].ts).map(([date, v]) => ({ date, sales: v.sales }));

    const prod: Record<string, { name: string; sales: number; revenue: number }> = {};
    const cat: Record<string, number> = {};
    orders.forEach(o => (o.items || []).forEach((it: any) => {
      const key = it.id || it.name;
      const qty = it.quantity || 1;
      const amt = (it.price || 0) * qty;
      if (!prod[key]) prod[key] = { name: it.name || 'Unknown', sales: 0, revenue: 0 };
      prod[key].sales += qty;
      prod[key].revenue += amt;
      const cn = it.category || 'Uncategorized';
      cat[cn] = (cat[cn] || 0) + amt;
    }));

    return {
      stats: { totalRevenue: revenue, totalOrders: orders.length, averageOrderValue: orders.length ? revenue / orders.length : 0, totalCustomers: customers.size },
      salesData,
      categoryData: Object.entries(cat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6),
      topProducts: Object.values(prod).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
    };
  }, [allOrders, range]);

  const money = (n: number) => formatCurrency(n, settings);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics & Reports</h2>
          <p className="text-gray-500 text-sm mt-1">Monitor your store's performance, sales trends, and top products.</p>
        </div>
        <div className="flex gap-2">
          <select value={range} onChange={(e) => setRange(e.target.value as any)} className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium shadow-sm focus:ring-blue-500 focus:border-blue-500">
            <option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="month">This Month</option><option value="year">This Year</option><option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            <h3 className="text-2xl font-bold text-gray-900">{money(stats.totalRevenue)}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 shrink-0">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Orders</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalOrders}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Avg. Order Value</p>
            <h3 className="text-2xl font-bold text-gray-900">{money(Math.round(stats.averageOrderValue))}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Unique Customers</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</h3>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-500" /> Sales Trend
            </h3>
          </div>
          <div className="h-72">
            {salesData.length === 0 && <div className="h-full flex items-center justify-center text-gray-400 text-sm">No sales in this period.</div>}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value) => value >= 1000 ? `${Math.round(value/1000)}k` : `${value}`} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [money(value), 'Revenue']}
                />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
            <ShoppingBag size={18} className="text-purple-500" /> Revenue by Category
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: number) => [money(value), 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Selling Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-500" /> Top Selling Products
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4 text-center">Items Sold</th>
                <th className="px-6 py-4 text-right">Revenue Generated</th>
                <th className="px-6 py-4 text-center">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topProducts.map((product, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full">
                      {product.sales}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">{money(product.revenue)}</td>
                  <td className="px-6 py-4 text-center text-gray-600 font-medium">{stats.totalRevenue ? Math.round((product.revenue / stats.totalRevenue) * 100) : 0}%</td>
                </tr>
              ))}
            {topProducts.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No sales in this period.</td></tr>}
            {topProducts.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No sales in this period.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
