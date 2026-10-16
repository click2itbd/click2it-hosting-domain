import React, { useMemo } from 'react';
import { Product, Order, Customer, Transaction, Lead } from '../types';
import { formatCurrency } from '../lib/utils';
import { useSettings } from '../context/SettingsContext';
import {
  Wrench,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  CreditCard,
  Percent,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Briefcase,
  Server,
  Globe,
  LifeBuoy,
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

interface AdminOverviewDashboardProps {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  transactions: Transaction[];
  serviceRecords?: any[];
  setActiveTab: (tab: any) => void;
}

export const AdminOverviewDashboard: React.FC<AdminOverviewDashboardProps> = ({
  products,
  orders,
  customers,
  transactions,
  serviceRecords = [],
  setActiveTab
}) => {
  const { settings } = useSettings();

  // Filter out hosting and domain orders so Admin Overview strictly reflects Retail Hardware, Shop & Services
  const retailOrders = useMemo(() => {
    return orders.filter(o => (o as any).platform !== 'hosting' && !(o as any).isHostingOrder && o.type !== 'hosting' && o.type !== 'domain');
  }, [orders]);

  // Summary Metrics
  const totalProducts = products.length;
  const totalCustomers = customers.length;
  const totalOrders = retailOrders.filter(o => o.type !== 'quotation').length;

  const totalRevenue = useMemo(() => {
    return retailOrders
      .filter(o => o.status !== 'cancelled' && o.type !== 'quotation')
      .reduce((sum, order) => sum + (order.total || 0), 0);
  }, [retailOrders]);

  const totalRevenueTransactions = useMemo(() => {
     return transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalExpenseTransactions = useMemo(() => {
     return transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const netProfit = useMemo(() => {
    const billedServiceIds = new Set();
    retailOrders.filter(o => o.status !== 'cancelled' && o.type !== 'quotation').forEach(o => {
        o.items?.forEach(item => {
            if (item.id && String(item.id).startsWith('svc-')) {
                billedServiceIds.add(String(item.id).replace('svc-', ''));
            }
        });
    });

    const standaloneService = serviceRecords
      .filter(s => !billedServiceIds.has(String(s.id)) && s.serviceCharge > 0 && (s.status === 'delivered' || s.status === 'ready' || s.status === 'repaired'))
      .reduce((sum, s) => sum + (Number(s.serviceCharge) || 0), 0);
    return totalRevenue + standaloneService + totalRevenueTransactions - totalExpenseTransactions;
  }, [totalRevenue, totalRevenueTransactions, totalExpenseTransactions, serviceRecords, retailOrders]);

  const { serviceRevenue, ordersServiceRevenue } = useMemo(() => {
    const billedServiceIds = new Set();
    
    const ordersService = retailOrders
      .filter(o => o.status !== 'cancelled' && o.type !== 'quotation')
      .reduce((sum, o) => {
        let orderServiceTotal = 0;
        o.items?.forEach(item => {
          if (item.id && String(item.id).startsWith('svc-')) {
            billedServiceIds.add(String(item.id).replace('svc-', ''));
          }
          if (item.itemType === 'service' || item.isCustomService) {
            orderServiceTotal += (Number(item.price) || 0) * (Number(item.quantity) || 1);
          }
        });
        return sum + orderServiceTotal;
      }, 0);

    const standaloneService = serviceRecords
      .filter(s => !billedServiceIds.has(String(s.id)) && s.serviceCharge > 0 && (s.status === 'delivered' || s.status === 'ready' || s.status === 'repaired'))
      .reduce((sum, s) => sum + (Number(s.serviceCharge) || 0), 0);

    return { 
      serviceRevenue: ordersService + standaloneService, 
      ordersServiceRevenue: ordersService 
    };
  }, [retailOrders, serviceRecords]);

  const totalCompletedOrders = useMemo(() => {
    return retailOrders.filter(o => o.status === 'active' || o.status === 'completed' || o.status === 'delivered').length;
  }, [retailOrders]);

  // Recent Orders
  const recentOrders = useMemo(() => {
    return [...retailOrders].filter(o => o.type !== 'quotation').slice(0, 5);
  }, [retailOrders]);

  // Chart Data: Sales Last 7 Days
  const salesChartData = useMemo(() => {
    const data: { date: string; amount: number; sales: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      
      const dayStart = new Date(d.setHours(0, 0, 0, 0));
      const dayEnd = new Date(d.setHours(23, 59, 59, 999));
      
      const dayOrders = retailOrders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= dayStart && orderDate <= dayEnd && o.type !== 'quotation' && o.status !== 'cancelled';
      });

      const dayTotal = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      data.push({
        date: dateStr,
        amount: dayTotal,
        sales: dayOrders.length
      });
    }
    return data;
  }, [retailOrders]);

  return (
    <div className="space-y-6">

      {/* Top Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
            <h3 className="text-2xl font-bold text-gray-800">{formatCurrency(totalRevenueTransactions || totalRevenue, settings)}</h3>
            <p className="text-xs text-green-500 flex items-center mt-1">
              <TrendingUp size={12} className="mr-1" /> +12.5% from last month
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <DollarSign size={24} />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between cursor-pointer hover:border-indigo-200 transition-colors" onClick={() => setActiveTab('orders')}>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Orders</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalOrders}</h3>
            <p className="text-xs text-green-500 flex items-center mt-1">
              <TrendingUp size={12} className="mr-1" /> All times
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
            <ShoppingCart size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between cursor-pointer hover:border-purple-200 transition-colors" onClick={() => setActiveTab('customers')}>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Customers</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalCustomers}</h3>
            <p className="text-xs text-green-500 flex items-center mt-1">
              <Activity size={12} className="mr-1" /> Active directory
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between cursor-pointer hover:border-orange-200 transition-colors" onClick={() => setActiveTab('inventory')}>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Products</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalProducts}</h3>
            <p className="text-xs text-gray-400 flex items-center mt-1">
              <Package size={12} className="mr-1" /> In inventory
            </p>
          </div>
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
            <Package size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income & Expenses Quick Overview */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                <Briefcase className="text-indigo-600 p-1 bg-indigo-50 rounded" size={24} /> Accounting Summary
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                         <ArrowUpRight size={16} />
                      </div>
                      <span className="text-sm font-medium text-gray-600">Sales Revenue</span>
                     </div>
                     <span className="font-bold text-gray-800">{formatCurrency(totalRevenue - ordersServiceRevenue, settings)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                           <ArrowUpRight size={16} />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Other Income</span>
                     </div>
                     <span className="font-bold text-gray-800">{formatCurrency(totalRevenueTransactions, settings)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                           <Wrench size={16} />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Service Revenue</span>
                     </div>
                     <span className="font-bold text-gray-800">{formatCurrency(serviceRevenue, settings)}</span>
                  </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                         <ArrowDownRight size={16} />
                      </div>
                      <span className="text-sm font-medium text-gray-600">Expenses</span>
                   </div>
                   <span className="font-bold text-gray-800">{formatCurrency(totalExpenseTransactions, settings)}</span>
                </div>
                <div className="flex justify-between items-center py-2 pt-4">
                   <span className="text-sm text-gray-600 font-bold">Net Profit</span>
                   <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                     {formatCurrency(netProfit, settings)}
                   </span>
                </div>
              </div>
           </div>

           {/* Quick Actions widget */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                <Activity className="text-orange-600 p-1 bg-orange-50 rounded" size={24} /> Quick Links
              </h3>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setActiveTab('orders')} className="p-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors border border-gray-100 flex flex-col items-center gap-2">
                   <ShoppingCart size={20} /> Orders
                 </button>
                 <button onClick={() => setActiveTab('crm')} className="p-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors border border-gray-100 flex flex-col items-center gap-2">
                   <Users size={20} /> CRM
                 </button>
                 <button onClick={() => setActiveTab('tasks')} className="p-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors border border-gray-100 flex flex-col items-center gap-2">
                   <Clock size={20} /> Tasks
                 </button>
                 <button onClick={() => setActiveTab('support_tickets')} className="p-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors border border-gray-100 flex flex-col items-center gap-2">
                   <CreditCard size={20} /> Support
                 </button>
              </div>
           </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
               <TrendingUp className="text-blue-600 p-1 bg-blue-50 rounded" size={24} /> Sales Overview (Last 7 Days)
            </h3>
            <div className="h-72 w-full min-w-0" style={{ minHeight: '280px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250}>
                <AreaChart data={salesChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(val) => `${val}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value, settings), 'Revenue']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                   <Clock className="text-emerald-600 p-1 bg-emerald-50 rounded" size={24} /> Recent Orders
                </h3>
                <button onClick={() => setActiveTab('orders')} className="text-sm font-bold text-indigo-600 hover:text-indigo-800">
                   View All
                </button>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                         <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                         <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                         <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total</th>
                         <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {recentOrders.length === 0 ? (
                         <tr><td colSpan={4} className="py-6 text-center text-gray-500">No orders yet.</td></tr>
                      ) : (
                         recentOrders.map(order => (
                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                               <td className="py-3 px-4">
                                  <span className="font-mono text-sm font-medium text-gray-700">{order.documentNumber || order.id.slice(0, 8).toUpperCase()}</span>
                                  <div className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</div>
                               </td>
                               <td className="py-3 px-4 p-0">
                                  <div className="text-sm font-medium text-gray-800 truncate max-w-[150px]">{order.customerName}</div>
                                  <div className="text-xs text-gray-500 truncate max-w-[150px]">{order.customerEmail}</div>
                               </td>
                               <td className="py-3 px-4 text-right">
                                  <span className="font-bold text-gray-900">{formatCurrency(order.total, settings)}</span>
                               </td>
                               <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize 
                                     ${order.status === 'completed' || order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                                       order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                       'bg-yellow-100 text-yellow-800'}`}>
                                    {order.status}
                                  </span>
                               </td>
                            </tr>
                         ))
                      )}
                   </tbody>
                </table>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
