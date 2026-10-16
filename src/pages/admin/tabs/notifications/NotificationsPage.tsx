import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { formatDistanceToNow } from 'date-fns';
import { Package, Globe, LifeBuoy, AlertTriangle, CheckCircle2, CheckCheck, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

export const NotificationsPage = ({ setActiveTab }: { setActiveTab: (t: string) => void }) => {
  const { isAdmin, isManager, isStaff, hasPermission } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'orders' | 'hosting' | 'support' | 'stock'>('all');

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('admin_read_notifs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [clearedIds, setClearedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('admin_cleared_notifs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleMarkAllRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
    try {
      localStorage.setItem('admin_read_notifs', JSON.stringify(Array.from(allIds)));
    } catch {}
  };

  const handleClearAll = () => {
    const newCleared = new Set(clearedIds);
    notifications.forEach(n => newCleared.add(n.id));
    setClearedIds(newCleared);
    try {
      localStorage.setItem('admin_cleared_notifs', JSON.stringify(Array.from(newCleared)));
    } catch {}
  };

  const handleClearSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newCleared = new Set(clearedIds);
    newCleared.add(id);
    setClearedIds(newCleared);
    try {
      localStorage.setItem('admin_cleared_notifs', JSON.stringify(Array.from(newCleared)));
    } catch {}
  };

  const handleMarkReadSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newRead = new Set(readIds);
    newRead.add(id);
    setReadIds(newRead);
    try {
      localStorage.setItem('admin_read_notifs', JSON.stringify(Array.from(newRead)));
    } catch {}
  };

  // Sync state across tabs/dropdowns
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin_read_notifs' && e.newValue) {
        setReadIds(new Set(JSON.parse(e.newValue)));
      }
      if (e.key === 'admin_cleared_notifs' && e.newValue) {
        setClearedIds(new Set(JSON.parse(e.newValue)));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  useEffect(() => {
    const itemsMap = new Map<string, any>();
// ... existing effects ...
    const rebuild = () => {
      const arr = Array.from(itemsMap.values());
      arr.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setNotifications(arr);
    };

    // Orders
    if (isAdmin || isManager || hasPermission('orders')) {
      const unsub = onSnapshot(collection(db, 'orders'), (snap) => {
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.status === 'pending') {
            itemsMap.set(`order-${d.id}`, {
              id: `order-${d.id}`, docId: d.id, category: 'orders', targetTab: 'orders',
              title: 'New Store Order', badgeText: 'PENDING',
              badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
              message: `Order #${data.documentNumber || d.id.substring(0, 7)} — ৳${Number(data.total || 0).toLocaleString()}`,
              time: data.createdAt || new Date().toISOString(),
              icon: Package, iconBg: 'bg-blue-500 text-white'
            });
          } else itemsMap.delete(`order-${d.id}`);
        });
        rebuild();
      });
    }

    // Domain Offers
    if (isAdmin || isManager) {
      const unsub = onSnapshot(collection(db, 'domain_offers'), (snap) => {
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.status === 'pending' || !data.status) {
            itemsMap.set(`offer-${d.id}`, {
              id: `offer-${d.id}`, docId: d.id, category: 'hosting', targetTab: 'domainOffers',
              title: 'Domain Buy Offer', badgeText: 'OFFER',
              badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              message: `${data.domain || 'Domain'} offer: ৳${Number(data.amount || data.offerAmount || 0).toLocaleString()}`,
              time: data.createdAt || new Date().toISOString(),
              icon: Globe, iconBg: 'bg-emerald-500 text-white'
            });
          } else itemsMap.delete(`offer-${d.id}`);
        });
        rebuild();
      });
    }

    // Support Tickets
    if (isAdmin || isManager || isStaff) {
      const unsub = onSnapshot(collection(db, 'support_tickets'), (snap) => {
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.status === 'open' || data.status === 'in_progress') {
            itemsMap.set(`ticket-${d.id}`, {
              id: `ticket-${d.id}`, docId: d.id, category: 'support', targetTab: 'support_tickets',
              title: 'Support Ticket', badgeText: data.status.toUpperCase(),
              badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
              message: `${data.title || 'Support Request'} from ${data.customerName || 'Customer'}`,
              time: data.createdAt || new Date().toISOString(),
              icon: LifeBuoy, iconBg: 'bg-purple-500 text-white'
            });
          } else itemsMap.delete(`ticket-${d.id}`);
        });
        rebuild();
      });
    }

    // Products Low Stock
    if (isAdmin || isManager || hasPermission('inventory')) {
      const unsub = onSnapshot(collection(db, 'products'), (snap) => {
        snap.docs.forEach(d => {
          const data = d.data();
          if (typeof data.stock === 'number' && data.stock <= 5 && data.stock >= 0) {
            itemsMap.set(`stock-${d.id}`, {
              id: `stock-${d.id}`, docId: d.id, category: 'stock', targetTab: 'inventory',
              title: 'Low Stock Warning', badgeText: `${data.stock} LEFT`,
              badgeColor: data.stock === 0 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-orange-100 text-orange-800 border-orange-200',
              message: `${data.name} is running low on stock.`,
              time: data.createdAt || new Date().toISOString(),
              icon: AlertTriangle, iconBg: data.stock === 0 ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
            });
          } else itemsMap.delete(`stock-${d.id}`);
        });
        rebuild();
      });
    }
  }, [isAdmin, isManager, isStaff, hasPermission]);

  const visible = notifications.filter(n => !clearedIds.has(n.id));
  const filtered = filter === 'all' ? visible : visible.filter(n => n.category === filter);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">All Notifications</h2>
          <p className="text-sm text-gray-500 mt-1">Manage and view all system alerts</p>
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
            >
              <CheckCheck size={14} /> Mark all read
            </button>
            <button
              onClick={handleClearAll}
              className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
            >
              <X size={14} /> Clear all
            </button>
          </div>
          <div className="flex gap-2">
          {['all', 'orders', 'hosting', 'support', 'stock'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                filter === f 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
          </div>
        </div>
      </div>
      
      <div className="divide-y divide-gray-100 h-full p-4 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-400 mb-3" />
            <p className="text-gray-500 text-lg">All caught up! No new notifications.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(notif => {
              const Icon = notif.icon;
              const isRead = readIds.has(notif.id);
              
              return (
                <div 
                  key={notif.id}
                  onClick={() => {
                    handleMarkReadSingle({ stopPropagation: () => {} } as any, notif.id);
                    setActiveTab(notif.targetTab);
                  }}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${
                    isRead 
                      ? 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50' 
                      : 'bg-blue-50/50 border-blue-100 hover:bg-blue-100/50 hover:border-blue-200'
                  }`}
                >
                  <div className={`p-3 rounded-full shrink-0 shadow-sm ${notif.iconBg}`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                          {notif.title}
                        </h4>
                        {!isRead && (
                          <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                            New
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 font-medium">
                        {notif.time ? formatDistanceToNow(new Date(notif.time), { addSuffix: true }) : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 truncate">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wider ${notif.badgeColor}`}>
                        {notif.badgeText}
                      </span>
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isRead && (
                          <button
                            onClick={(e) => handleMarkReadSingle(e, notif.id)}
                            className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Mark as read"
                          >
                            <CheckCheck size={16} />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleClearSingle(e, notif.id)}
                          className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                          title="Clear notification"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
