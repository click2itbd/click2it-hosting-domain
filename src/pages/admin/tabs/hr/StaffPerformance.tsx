import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Order } from '../../../../types';
import { Trophy, TrendingUp, Package, Wrench, Calendar, Award, DollarSign } from 'lucide-react';
import { formatCurrency, cn } from '../../../../lib/utils';
import { useSettings } from '../../../../context/SettingsContext';

interface StaffPerformanceProps {
  orders: Order[];
}

export const StaffPerformanceTab: React.FC<StaffPerformanceProps> = ({ orders }) => {
  const { settings } = useSettings();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_month'>('this_month');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'services'), limit(1000)));
        setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching services', err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const { stats, totals } = useMemo(() => {
    // Filter by date
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

    const filteredOrders = orders.filter(o => {
      if (dateFilter === 'this_month') return o.createdAt >= firstDayThisMonth;
      if (dateFilter === 'last_month') return o.createdAt >= firstDayLastMonth && o.createdAt <= lastDayLastMonth;
      return true;
    });

    const filteredServices = services.filter(s => {
      const createdAt = s.createdAt || new Date(0).toISOString();
      if (dateFilter === 'this_month') return createdAt >= firstDayThisMonth;
      if (dateFilter === 'last_month') return createdAt >= firstDayLastMonth && createdAt <= lastDayLastMonth;
      return true;
    });

    // Aggregate
    const staffMap: Record<string, { name: string; totalSales: number; totalRevenue: number; totalServices: number; totalServiceCharge: number }> = {};

    let totalSalesSystem = 0;
    let totalRevenueSystem = 0;

    filteredOrders.forEach(o => {
      // Exclude invalid orders
      if (o.status === 'cancelled' || o.status === 'returned' || o.type === 'quotation') return;

      let name = o.createdBy || 'System Admin';
      if (name === 'Admin / Unknown' || name === 'Admin') name = 'System Admin';
      
      if (!staffMap[name]) staffMap[name] = { name, totalSales: 0, totalRevenue: 0, totalServices: 0, totalServiceCharge: 0 };
      staffMap[name].totalSales += 1;
      
      const rev = Number(o.total) || 0;
      staffMap[name].totalRevenue += rev;

      totalSalesSystem += 1;
      totalRevenueSystem += rev;
    });

    filteredServices.forEach(s => {
      if (s.status === 'cancelled') return;

      let name = s.receivedBy || 'System Admin';
      if (name === 'Admin / Unknown' || name === 'Admin') name = 'System Admin';
      if (!staffMap[name]) staffMap[name] = { name, totalSales: 0, totalRevenue: 0, totalServices: 0, totalServiceCharge: 0 };
      staffMap[name].totalServices += 1;
      
      const charge = Number(s.serviceCharge) || 0;
      staffMap[name].totalServiceCharge += charge;
      staffMap[name].totalRevenue += charge;
      
      totalRevenueSystem += charge;
    });

    const sortedStats = Object.values(staffMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
    
    return {
      stats: sortedStats,
      totals: {
        sales: totalSalesSystem,
        revenue: totalRevenueSystem,
        topSeller: sortedStats.length > 0 ? sortedStats[0] : null
      }
    };
  }, [orders, services, dateFilter]);

  if (loading) return <div className="p-8 text-center text-gray-500 font-bold animate-pulse">Loading performance data...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Trophy className="text-yellow-500" /> Staff Performance
          </h2>
          <p className="text-sm text-gray-500 mt-1">Track sales, revenue, and service records handled by your staff.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
          <Calendar size={16} className="text-gray-400 ml-2" />
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 py-1 pr-4 focus:ring-0 cursor-pointer"
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-blue-100 font-bold text-sm uppercase tracking-wider mb-1">Total Sales</p>
            <h3 className="text-3xl font-black">{totals.sales}</h3>
            <p className="text-blue-200 text-xs mt-2 font-medium">Valid orders placed in period</p>
          </div>
          <Package className="absolute right-[-10px] bottom-[-10px] text-white/10" size={100} />
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-emerald-100 font-bold text-sm uppercase tracking-wider mb-1">Total Revenue Gen.</p>
            <h3 className="text-3xl font-black">{formatCurrency(totals.revenue, settings)}</h3>
            <p className="text-emerald-200 text-xs mt-2 font-medium">Includes service charges</p>
          </div>
          <DollarSign className="absolute right-[-10px] bottom-[-10px] text-white/10" size={100} />
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-amber-100 font-bold text-sm uppercase tracking-wider mb-1">Top Performer</p>
            <h3 className="text-2xl font-black truncate">{totals.topSeller?.name || 'N/A'}</h3>
            <p className="text-amber-200 text-xs mt-2 font-medium">Leading in total revenue</p>
          </div>
          <Award className="absolute right-[-10px] bottom-[-10px] text-white/10" size={100} />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Staff Member</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Sales Made</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Services Recv.</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Revenue Gen.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">No data for the selected period.</td>
                </tr>
              ) : (
                stats.map((staff, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {idx === 0 ? (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600">
                          <Trophy size={16} className="fill-current" />
                        </div>
                      ) : idx === 1 ? (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-black">2</div>
                      ) : idx === 2 ? (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100/50 text-amber-700 font-black">3</div>
                      ) : (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 font-bold">{idx + 1}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm",
                          idx === 0 ? "bg-gradient-to-br from-yellow-400 to-yellow-600" :
                          idx === 1 ? "bg-gradient-to-br from-slate-400 to-slate-600" :
                          idx === 2 ? "bg-gradient-to-br from-amber-600 to-amber-800" :
                          "bg-gradient-to-br from-blue-500 to-indigo-600"
                        )}>
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-black text-slate-800">{staff.name}</span>
                          {idx === 0 && <span className="block text-[10px] font-bold text-yellow-600 mt-0.5">Top Performer</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-700 text-lg">{staff.totalSales}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Orders</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-700 text-lg">{staff.totalServices}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Tickets</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-black text-emerald-600 text-lg bg-emerald-50 px-3 py-1 rounded-lg">
                          {formatCurrency(staff.totalRevenue, settings)}
                        </span>
                        {staff.totalServiceCharge > 0 && (
                          <span className="text-[10px] text-slate-400 font-bold mt-1">
                            Includes {formatCurrency(staff.totalServiceCharge, settings)} (Service)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
