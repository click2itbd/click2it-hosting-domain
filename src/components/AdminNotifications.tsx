import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Package, 
  Tag, 
  Clock, 
  LifeBuoy, 
  Server, 
  AlertTriangle, 
  CheckCircle2, 
  CheckCheck,
  ChevronRight,
  ShieldAlert,
  Globe,
  Sparkles,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

function showBrowserNotification(title: string, body: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Smooth, pleasant 3-tone chime (F5 -> A5 -> C6)
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    const t = ctx.currentTime;
    playTone(698.46, t, 0.22);        // F5 tone
    playTone(880.00, t + 0.12, 0.22);  // A5 tone
    playTone(1046.50, t + 0.24, 0.55); // C6 tone
  } catch (e) {
    console.debug('Notification sound playback error:', e);
  }
}

interface AdminNotificationsProps {
  setActiveTab?: (tab: string) => void;
}

export const AdminNotifications: React.FC<AdminNotificationsProps> = ({ setActiveTab }) => {
  const { canAccessAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
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
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('admin_notif_sound_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const initialLoadRef = useRef(false);
  const knownNotifIdsRef = useRef<Set<string>>(new Set());
  const soundEnabledRef = useRef(isSoundEnabled);

  useEffect(() => {
    soundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !isSoundEnabled;
    setIsSoundEnabled(nextVal);
    try {
      localStorage.setItem('admin_notif_sound_enabled', JSON.stringify(nextVal));
    } catch {}
    if (nextVal) {
      playNotificationChime();
    }
  };

  const [activeFilter, setActiveFilter] = useState<'all' | 'orders' | 'hosting' | 'support' | 'stock'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canAccessAdmin) return;
    const itemsMap = new Map<string, any>();

    // 1. Pending Store Orders
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), limit(25)), (snap) => {
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.status === 'pending') {
          itemsMap.set(`order-${d.id}`, {
            id: `order-${d.id}`,
            docId: d.id,
            category: 'orders',
            targetTab: 'orders',
            title: 'New Store Order',
            badgeText: 'PENDING',
            badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
            message: `Order #${data.documentNumber || d.id.substring(0, 7)} — ৳${Number(data.total || 0).toLocaleString()}`,
            time: data.createdAt || new Date().toISOString(),
            icon: Package,
            iconBg: 'bg-blue-500 text-white',
          });
        } else {
          itemsMap.delete(`order-${d.id}`);
        }
      });
      rebuildList();
    }, () => {});

    // 2. Domain Offers
    const unsubOffers = onSnapshot(query(collection(db, 'domain_offers'), limit(25)), (snap) => {
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.status === 'pending' || !data.status) {
          itemsMap.set(`offer-${d.id}`, {
            id: `offer-${d.id}`,
            docId: d.id,
            category: 'hosting',
            targetTab: 'domainOffers',
            title: 'Domain Buy Offer',
            badgeText: 'OFFER',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            message: `${data.domain || 'Domain'} offer: ৳${Number(data.amount || data.offerAmount || 0).toLocaleString()}`,
            time: data.createdAt || new Date().toISOString(),
            icon: Globe,
            iconBg: 'bg-emerald-500 text-white',
          });
        } else {
          itemsMap.delete(`offer-${d.id}`);
        }
      });
      rebuildList();
    }, () => {});

    // 3. Hosting Orders
    const unsubHosting = onSnapshot(query(collection(db, 'hostingOrders'), limit(25)), (snap) => {
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.status === 'pending' || data.paymentStatus === 'pending') {
          itemsMap.set(`hosting-${d.id}`, {
            id: `hosting-${d.id}`,
            docId: d.id,
            category: 'hosting',
            targetTab: 'hostingOrders',
            title: 'Hosting Order',
            badgeText: 'HOSTING',
            badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
            message: `${data.planName || data.packageName || 'Hosting Plan'} for ${data.domain || 'Client'}`,
            time: data.createdAt || new Date().toISOString(),
            icon: Server,
            iconBg: 'bg-purple-600 text-white',
          });
        } else {
          itemsMap.delete(`hosting-${d.id}`);
        }
      });
      rebuildList();
    }, () => {});

    // 4. Support Tickets
    const unsubTickets = onSnapshot(query(collection(db, 'support_tickets'), limit(25)), (snap) => {
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.status === 'open' || data.status === 'pending') {
          itemsMap.set(`ticket-${d.id}`, {
            id: `ticket-${d.id}`,
            docId: d.id,
            category: 'support',
            targetTab: 'support_tickets',
            title: 'Support Ticket',
            badgeText: 'HELP',
            badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            message: `${data.subject || 'Client Inquiry'} — ${data.userEmail || 'Customer'}`,
            time: data.createdAt || new Date().toISOString(),
            icon: LifeBuoy,
            iconBg: 'bg-indigo-600 text-white',
          });
        } else {
          itemsMap.delete(`ticket-${d.id}`);
        }
      });
      rebuildList();
    }, () => {});

    // 5. Low Stock / Out of Stock
    const unsubProducts = onSnapshot(query(collection(db, 'products'), limit(30)), (snap) => {
      snap.docs.forEach((d) => {
        const data = d.data();
        const stock = Number(data.stock || 0);
        if (stock === 0) {
          itemsMap.set(`stock-out-${d.id}`, {
            id: `stock-out-${d.id}`,
            docId: d.id,
            category: 'stock',
            targetTab: 'inventory',
            title: 'Out of Stock',
            badgeText: 'EMPTY',
            badgeColor: 'bg-red-100 text-red-800 border-red-200',
            message: `${data.name || 'Product'} has 0 stock remaining!`,
            time: data.updatedAt || data.createdAt || new Date().toISOString(),
            icon: ShieldAlert,
            iconBg: 'bg-red-500 text-white',
          });
        } else if (stock > 0 && stock <= 3) {
          itemsMap.set(`stock-low-${d.id}`, {
            id: `stock-low-${d.id}`,
            docId: d.id,
            category: 'stock',
            targetTab: 'inventory',
            title: 'Low Stock Alert',
            badgeText: 'LOW STOCK',
            badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
            message: `Only ${stock} unit(s) left for ${data.name || 'Product'}`,
            time: data.updatedAt || data.createdAt || new Date().toISOString(),
            icon: AlertTriangle,
            iconBg: 'bg-orange-500 text-white',
          });
        } else {
          itemsMap.delete(`stock-out-${d.id}`);
          itemsMap.delete(`stock-low-${d.id}`);
        }
      });
      rebuildList();
    }, () => {});

    // 6. Project Quote Requests
    const unsubQuotes = onSnapshot(query(collection(db, 'quote_requests'), limit(25)), (snap) => {
      snap.docs.forEach((d) => {
        const data = d.data();
        if ((data.status || 'pending') === 'pending') {
          itemsMap.set(`quote-${d.id}`, {
            id: `quote-${d.id}`,
            docId: d.id,
            category: 'orders',
            targetTab: 'projects',
            title: 'New Quote Request',
            badgeText: 'QUOTE',
            badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
            message: `${data.name || 'Client'} — ${data.projectType || 'Project'}`,
            time: data.createdAt || new Date().toISOString(),
            icon: Package,
            iconBg: 'bg-teal-600 text-white',
          });
        } else {
          itemsMap.delete(`quote-${d.id}`);
        }
      });
      rebuildList();
    }, () => {});

    // 7. Pre-Bookings
    const unsubPreBooks = onSnapshot(query(collection(db, 'pre_bookings'), limit(25)), (snap) => {
      snap.docs.forEach((d) => {
        const data = d.data();
        if ((data.status || 'pending') === 'pending') {
          itemsMap.set(`prebook-${d.id}`, {
            id: `prebook-${d.id}`,
            docId: d.id,
            category: 'orders',
            targetTab: 'preBooks',
            title: 'New Pre-Book Request',
            badgeText: 'PRE-BOOK',
            badgeColor: 'bg-pink-100 text-pink-800 border-pink-200',
            message: `${data.customerName || data.name || 'Customer'} — ${data.productName || data.product || 'Product'}`,
            time: data.createdAt || new Date().toISOString(),
            icon: Package,
            iconBg: 'bg-pink-600 text-white',
          });
        } else {
          itemsMap.delete(`prebook-${d.id}`);
        }
      });
      rebuildList();
    }, () => {});

    const rebuildList = () => {
      const arr = Array.from(itemsMap.values()).sort((a, b) => {
        const parseTime = (t: any) => t?.toDate?.()?.getTime() || (t?.seconds ? t.seconds * 1000 : 0) || new Date(t).getTime() || 0;
        const timeA = parseTime(a.time);
        const timeB = parseTime(b.time);
        return timeB - timeA;
      });

      // Check if there is any brand new action item arriving in real-time
      if (initialLoadRef.current) {
        const newItems = arr.filter(item => !knownNotifIdsRef.current.has(item.id));
        if (newItems.length > 0) {
          if (soundEnabledRef.current) {
            playNotificationChime();
          }
          newItems.forEach(item => {
            showBrowserNotification(item.title, item.message);
          });
        }
      } else {
        setTimeout(() => {
          initialLoadRef.current = true;
        }, 1500);
      }

      knownNotifIdsRef.current = new Set(arr.map(i => i.id));
      setNotifications(arr);
    };

    return () => {
      unsubOrders();
      unsubOffers();
      unsubHosting();
      unsubTickets();
      unsubProducts();
      unsubQuotes();
      unsubPreBooks();
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark all as read
  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
    try {
      localStorage.setItem('admin_read_notifs', JSON.stringify(Array.from(allIds)));
    } catch {}
  };

  // Clear all notifications
  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCleared = new Set(clearedIds);
    notifications.forEach(n => newCleared.add(n.id));
    setClearedIds(newCleared);
    try {
      localStorage.setItem('admin_cleared_notifs', JSON.stringify(Array.from(newCleared)));
    } catch {}
  };

  // Click on a notification item
  const handleItemClick = (notif: any) => {
    const newSet = new Set(readIds);
    newSet.add(notif.id);
    setReadIds(newSet);
    try {
      localStorage.setItem('admin_read_notifs', JSON.stringify(Array.from(newSet)));
    } catch {}

    setIsOpen(false);
    
    // Global Navigation for Universal Usability
    const currentPath = window.location.pathname;
    
    if (notif.targetTab === 'projects' || notif.targetTab === 'preBooks') {
      if (currentPath !== '/admin/e-commerce') window.location.href = '/admin/e-commerce?tab=' + notif.targetTab;
      else if (setActiveTab) setActiveTab(notif.targetTab);
    } else if (notif.category === 'orders') {
      if (currentPath !== '/admin/e-commerce') window.location.href = '/admin/e-commerce?tab=orders';
      else if (setActiveTab) setActiveTab('orders');
    } else if (notif.category === 'hosting' || notif.targetTab === 'domainOffers') {
      if (currentPath !== '/admin/billing') window.location.href = '/admin/billing?tab=all-orders';
      else if (setActiveTab) setActiveTab('all-orders');
    } else if (notif.category === 'support') {
      if (currentPath !== '/admin/billing') window.location.href = '/admin/billing?tab=tickets';
      else if (setActiveTab) setActiveTab('tickets');
    } else if (notif.category === 'stock') {
      if (currentPath !== '/admin/e-commerce') window.location.href = '/admin/e-commerce?tab=inventory';
      else if (setActiveTab) setActiveTab('inventory');
    } else if (setActiveTab && notif.targetTab) {
      setActiveTab(notif.targetTab);
    }
  };

  const visibleNotifications = notifications.filter(n => !clearedIds.has(n.id));
  const unreadNotifications = visibleNotifications.filter(n => !readIds.has(n.id));
  const unreadCount = unreadNotifications.length;

  const filteredNotifications = visibleNotifications.filter(n => {
    if (activeFilter === 'all') return true;
    return n.category === activeFilter;
  });

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border",
          isOpen 
            ? "bg-blue-50 text-blue-600 border-blue-200 shadow-sm" 
            : "bg-gray-50/80 text-gray-600 border-gray-200/80 hover:bg-gray-100 hover:text-gray-900"
        )}
        title="Admin Notifications"
      >
        <Bell size={18} />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Modern Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2.5 w-[360px] sm:w-[410px] bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-200 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                <Bell size={15} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight leading-none">Notifications Center</h3>
                <span className="text-[10px] text-gray-400 font-medium">
                  {unreadCount > 0 ? `${unreadCount} unread action items` : 'All alerts up to date'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSound}
                title={isSoundEnabled ? "Notification sound is ON (Click to mute)" : "Notification sound is MUTED (Click to unmute)"}
                className={cn(
                  "px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border",
                  isSoundEnabled 
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30" 
                    : "bg-white/10 text-gray-400 border-white/10 hover:bg-white/20"
                )}
              >
                {isSoundEnabled ? <Volume2 size={13} className="text-emerald-400" /> : <VolumeX size={13} />}
                <span className="text-[10px]">{isSoundEnabled ? 'Sound ON' : 'Muted'}</span>
              </button>

              {unreadCount > 0 && (
                <button 
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-bold text-blue-400 hover:text-blue-300 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={13} />
                </button>
              )}
              {visibleNotifications.length > 0 && (
                <button 
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-bold text-red-400 hover:text-red-300 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                  title="Clear all notifications"
                >
                  <X size={13} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 border-b border-gray-200 overflow-x-auto text-[11px] font-bold custom-scrollbar">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all shrink-0",
                activeFilter === 'all' 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              All ({visibleNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('orders')}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all shrink-0",
                activeFilter === 'orders' 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              Orders
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('hosting')}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all shrink-0",
                activeFilter === 'hosting' 
                  ? "bg-purple-600 text-white shadow-sm" 
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              Hosting
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('support')}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all shrink-0",
                activeFilter === 'support' 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              Support
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('stock')}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all shrink-0",
                activeFilter === 'stock' 
                  ? "bg-red-600 text-white shadow-sm" 
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              Stock
            </button>
          </div>
          
          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto p-2 space-y-1.5 bg-slate-50/50">
            {filteredNotifications.length === 0 ? (
              <div className="py-14 px-6 text-center text-gray-400">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-sm font-bold text-gray-800">All Caught Up!</p>
                <p className="text-xs text-gray-500 mt-1">No pending alerts in this category.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const Icon = notif.icon;
                const isRead = readIds.has(notif.id);

                return (
                  <div 
                    key={notif.id} 
                    onClick={() => handleItemClick(notif)}
                    className={cn(
                      "p-3.5 rounded-xl transition-all cursor-pointer border flex items-start gap-3.5 relative group",
                      isRead 
                        ? "bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm" 
                        : "bg-blue-50/40 border-blue-200 shadow-sm hover:border-blue-300 hover:bg-blue-50/70"
                    )}
                  >
                    {/* Icon container */}
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", notif.iconBg)}>
                      <Icon size={18} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-gray-900">{notif.title}</h4>
                          {notif.badgeText && (
                            <span className={cn("text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider", notif.badgeColor)}>
                              {notif.badgeText}
                            </span>
                          )}
                        </div>

                        {!isRead && (
                          <span className="text-[9px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.2 rounded-full shrink-0">
                            NEW
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-600 font-medium leading-relaxed line-clamp-1">{notif.message}</p>
                      
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100/80 text-[10px]">
                        <span className="text-gray-400 font-medium flex items-center gap-1">
                          <Clock size={11} />
                          {notif.time ? formatDistanceToNow(notif.time?.toDate?.() || (notif.time?.seconds ? new Date(notif.time.seconds * 1000) : new Date(notif.time)), { addSuffix: true }) : 'Just now'}
                        </span>

                        <span className="font-bold text-blue-600 group-hover:text-blue-700 flex items-center gap-0.5">
                          Open Details <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-200 bg-white flex flex-col gap-2">
            <button 
              type="button"
              className="w-full text-center text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 py-1.5 rounded-lg transition-colors"
              onClick={() => {
                setIsOpen(false);
                if (setActiveTab) setActiveTab('notifications');
              }}
            >
              View All Notifications &rarr;
            </button>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
              <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                <Sparkles size={11} className="text-blue-500" /> Live Real-time Sync
              </span>
              <button 
                type="button"
                className="text-xs font-bold text-gray-700 hover:text-gray-900 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors" 
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

