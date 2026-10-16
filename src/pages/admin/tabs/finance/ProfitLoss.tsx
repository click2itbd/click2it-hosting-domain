import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Order, Transaction, ServiceRecord } from '../../../../types';
import { formatCurrency, cn } from '../../../../lib/utils';
import { 
  Wallet, TrendingUp, TrendingDown, 
  Calculator, Calendar, DollarSign, 
  Activity, ArrowRight 
} from 'lucide-react';

export default function ProfitLoss() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Format YYYY-MM-DD local time without timezone shifts
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [fromDate, setFromDate] = useState(formatDate(firstDay));
  const [toDate, setToDate] = useState(formatDate(today));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersSnap, servicesSnap, txSnap] = await Promise.all([
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'service_records')),
        getDocs(collection(db, 'transactions'))
      ]);

      setOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      setServices(servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceRecord)));
      setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    } catch (error) {
      console.error('Error fetching P&L data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const start = new Date(`${fromDate}T00:00:00`);
    const end = new Date(`${toDate}T23:59:59.999`);

    let totalRevenue = 0;
    let cogs = 0;
    let totalExpenses = 0;

    const billedServiceIds = new Set();
    orders.forEach(order => {
      if ((order as any).platform === 'hosting' || (order as any).isHostingOrder || order.type === 'hosting' || order.type === 'domain') return;

      order.items?.forEach(item => {
        if (item.id && String(item.id).startsWith('svc-')) {
          billedServiceIds.add(String(item.id).replace('svc-', ''));
        }
      });
      const orderDate = new Date(order.createdAt);
      if (orderDate >= start && orderDate <= end) {
        if (order.status !== 'cancelled' && order.status !== 'returned') {
          totalRevenue += (order.total || 0);
          
          order.items?.forEach(item => {
            const itemType = (item as any).itemType || '';
            const itemCat = ((item as any).category || '').toLowerCase();
            if (itemType === 'hosting' || itemType === 'domain' || itemType === 'domain_renewal' || itemType === 'domain_transfer' || itemType === 'ssl' || itemCat.includes('hosting') || itemCat.includes('domain')) return;

            const cost = (item as any).costPrice || 0;
            cogs += cost * (item.quantity || 1);
          });
        }
      }
    });

    services.forEach(service => {
      if (billedServiceIds.has(String(service.id))) return;
      const serviceDate = service.receivedAt || service.createdAt ? new Date(service.receivedAt || service.createdAt) : new Date(0);
      if (serviceDate >= start && serviceDate <= end) {
        totalRevenue += (service.serviceCharge || 0);
      }
    });

    transactions.forEach(tx => {
      const txDate = new Date(tx.createdAt || tx.date);
      if (txDate >= start && txDate <= end) {
        const isVendorStockPayment = tx.entityType === 'vendor' || tx.description?.toLowerCase().includes('purchase');
        if (
          ['expense', 'salary', 'conveyance'].includes(tx.type) ||
          (tx.type === 'payment_made' && !isVendorStockPayment)
        ) {
          totalExpenses += (tx.amount || 0);
        }
      }
    });

    const grossProfit = totalRevenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    return { totalRevenue, cogs, grossProfit, totalExpenses, netProfit };
  }, [orders, services, transactions, fromDate, toDate]);

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="text-blue-600" />
            Profit & Loss Statement
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Financial overview and performance metrics
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 px-2">
            <Calendar size={16} className="text-gray-400" />
            <input 
              type="date" 
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="border-none bg-transparent text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
            />
          </div>
          <ArrowRight size={14} className="text-gray-400" />
          <div className="flex items-center gap-2 px-2">
            <input 
              type="date" 
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="border-none bg-transparent text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium text-sm">Total Revenue</h3>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-blue-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-gray-400 mt-1">From Sales & Services</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium text-sm">Cost of Goods Sold (COGS)</h3>
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
              <Calculator size={16} className="text-orange-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{formatCurrency(stats.cogs)}</div>
            <p className="text-xs text-gray-400 mt-1">Product costs</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium text-sm">Total Expenses</h3>
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <TrendingDown size={16} className="text-red-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalExpenses)}</div>
            <p className="text-xs text-gray-400 mt-1">Payments & Overheads</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={cn(
          "p-6 rounded-xl shadow-sm border flex flex-col justify-between relative overflow-hidden",
          stats.grossProfit >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
        )}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn(
                "font-bold text-sm uppercase tracking-wider",
                stats.grossProfit >= 0 ? "text-emerald-700" : "text-red-700"
              )}>Gross Profit</h3>
              <Wallet size={20} className={stats.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"} />
            </div>
            <div className={cn(
              "text-3xl font-bold",
              stats.grossProfit >= 0 ? "text-emerald-800" : "text-red-800"
            )}>
              {formatCurrency(stats.grossProfit)}
            </div>
            <p className={cn(
              "text-sm mt-2 font-medium",
              stats.grossProfit >= 0 ? "text-emerald-600/80" : "text-red-600/80"
            )}>
              Revenue - COGS
            </p>
          </div>
          <div className={cn(
            "absolute -right-6 -bottom-6 opacity-10",
            stats.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"
          )}>
            <Wallet size={120} />
          </div>
        </div>

        <div className={cn(
          "p-6 rounded-xl shadow-sm border flex flex-col justify-between relative overflow-hidden",
          stats.netProfit >= 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"
        )}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn(
                "font-bold text-sm uppercase tracking-wider",
                stats.netProfit >= 0 ? "text-blue-700" : "text-red-700"
              )}>Net Profit</h3>
              <DollarSign size={20} className={stats.netProfit >= 0 ? "text-blue-600" : "text-red-600"} />
            </div>
            <div className={cn(
              "text-3xl font-bold",
              stats.netProfit >= 0 ? "text-blue-800" : "text-red-800"
            )}>
              {formatCurrency(stats.netProfit)}
            </div>
            <p className={cn(
              "text-sm mt-2 font-medium",
              stats.netProfit >= 0 ? "text-blue-600/80" : "text-red-600/80"
            )}>
              Gross Profit - Expenses
            </p>
          </div>
          <div className={cn(
            "absolute -right-6 -bottom-6 opacity-10",
            stats.netProfit >= 0 ? "text-blue-600" : "text-red-600"
          )}>
            <DollarSign size={120} />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">Statement Breakdown</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-600 font-medium">Total Revenue</span>
              <span className="font-bold text-gray-800">{formatCurrency(stats.totalRevenue)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-600">Less: Cost of Goods Sold (COGS)</span>
              <span className="text-red-600 font-medium">- {formatCurrency(stats.cogs)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b-2 border-gray-100 bg-gray-50/30 px-2 rounded">
              <span className="text-gray-800 font-bold uppercase text-sm tracking-wider">Gross Profit</span>
              <span className={cn(
                "font-bold text-lg",
                stats.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"
              )}>{formatCurrency(stats.grossProfit)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50 mt-4">
              <span className="text-gray-600">Less: Total Expenses</span>
              <span className="text-red-600 font-medium">- {formatCurrency(stats.totalExpenses)}</span>
            </div>
            <div className="flex justify-between items-center py-4 border-t-2 border-gray-800 mt-2 px-2 bg-blue-50/30 rounded-b">
              <span className="text-gray-900 font-bold uppercase tracking-wider">Net Profit</span>
              <span className={cn(
                "font-bold text-2xl",
                stats.netProfit >= 0 ? "text-blue-600" : "text-red-600"
              )}>{formatCurrency(stats.netProfit)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
