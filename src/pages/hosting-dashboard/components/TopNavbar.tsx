import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronDown, Bell, User, LogOut, Settings2, Server, Ticket, RefreshCw, Globe, CheckCheck } from 'lucide-react';
import { AdminNotifications } from '../../../components/AdminNotifications';
import { auth, db } from '../../../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { cn } from '../../../lib/utils';

const SETTINGS_MODULES = [
  { label: '📧 Email Templates', id: 'email-templates' },
  { label: '💬 WhatsApp / SMS Alerts', id: 'whatsapp-sms' },
  { label: '📄 Pages Editor', id: 'pages-editor' },
  { label: '🗂️ Categories', id: 'categories' },
  { label: '📦 Plan Packages', id: 'plan-packages' },
  { label: '➕ Extra Services', id: 'extra-services' },
  { label: '🧩 Addon Packages', id: 'addon-packages' },
  { label: '🏷️ Promo Codes', id: 'promo-codes' },
  { label: '🖥️ Servers', id: 'servers' },
  { label: '💰 Domain Pricing', id: 'domain-pricing' },
  { label: '🌐 Domain Registrars', id: 'domain-registrars' },
];

function timeAgo(dateVal) {
  if (!dateVal) return '';
  const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function TopNavbar({ state }) {
  const navigate = useNavigate();
  const { sidebarOpen, setSidebarOpen, activeTab, setActiveTab, tickets } = state;

  const dropdownRef = useRef(null);
  const bellRef = useRef(null);
  const profileRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(true);

  // Close settings dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time notifications — domain & hosting only
  useEffect(() => {
    const unsubs = [];

    // Hosting orders
    const hostingQ = query(collection(db, 'hostingOrders'), orderBy('createdAt', 'desc'), limit(5));
    unsubs.push(onSnapshot(hostingQ, (snap) => {
      const items = snap.docs.map(d => ({
        id: `hosting-${d.id}`,
        type: 'hosting',
        title: 'Hosting Order',
        desc: `${d.data().customerName || d.data().email || 'Customer'} — ${d.data().plan || d.data().planName || 'Hosting Plan'}`,
        time: d.data().createdAt,
        icon: 'server',
        tab: 'all-orders',
      }));
      setNotifications(prev => {
        const filtered = prev.filter(n => !n.id.startsWith('hosting-'));
        const merged = [...items, ...filtered].sort((a, b) => {
          const aTime = a.time?.toDate ? a.time.toDate() : new Date(a.time || 0);
          const bTime = b.time?.toDate ? b.time.toDate() : new Date(b.time || 0);
          return bTime - aTime;
        }).slice(0, 15);
        setUnreadCount(merged.length);
        return merged;
      });
      setNotifLoading(false);
    }, (err) => {
      setNotifLoading(false);
    }));

    // Domain orders
    const domainQ = query(collection(db, 'domainOrders'), orderBy('createdAt', 'desc'), limit(5));
    unsubs.push(onSnapshot(domainQ, (snap) => {
      const items = snap.docs.map(d => ({
        id: `domain-${d.id}`,
        type: 'domain',
        title: 'Domain Order',
        desc: `${d.data().domainName || d.data().domain || 'Domain'} — ${d.data().status || 'pending'}`,
        time: d.data().createdAt,
        icon: 'globe',
        tab: 'domain-search',
      }));
      setNotifications(prev => {
        const filtered = prev.filter(n => !n.id.startsWith('domain-'));
        return [...items, ...filtered].sort((a, b) => {
          const aTime = a.time?.toDate ? a.time.toDate() : new Date(a.time || 0);
          const bTime = b.time?.toDate ? b.time.toDate() : new Date(b.time || 0);
          return bTime - aTime;
        }).slice(0, 15);
      });
    }, () => {}));

    // Support tickets (hosting support)
    const ticketsQ = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'), limit(4));
    unsubs.push(onSnapshot(ticketsQ, (snap) => {
      const items = snap.docs.map(d => ({
        id: `ticket-${d.id}`,
        type: 'ticket',
        title: 'Support Ticket',
        desc: `${d.data().subject || 'New ticket'} — ${d.data().name || ''}`,
        time: d.data().createdAt,
        icon: 'ticket',
        tab: 'tickets',
      }));
      setNotifications(prev => {
        const filtered = prev.filter(n => !n.id.startsWith('ticket-'));
        return [...items, ...filtered].sort((a, b) => {
          const aTime = a.time?.toDate ? a.time.toDate() : new Date(a.time || 0);
          const bTime = b.time?.toDate ? b.time.toDate() : new Date(b.time || 0);
          return bTime - aTime;
        }).slice(0, 15);
      });
    }, () => {}));

    return () => unsubs.forEach(u => u());
  }, []);

  const getIcon = (iconType) => {
    if (iconType === 'server') return <Server size={14} className="text-blue-500" />;
    if (iconType === 'ticket') return <Ticket size={14} className="text-rose-500" />;
    if (iconType === 'globe') return <Globe size={14} className="text-emerald-500" />;
    return <Bell size={14} className="text-slate-400" />;
  };

  const getBadge = (type) => {
    if (type === 'hosting') return 'bg-blue-50 text-blue-700';
    if (type === 'ticket') return 'bg-rose-50 text-rose-700';
    if (type === 'domain') return 'bg-emerald-50 text-emerald-700';
    return 'bg-slate-50 text-slate-600';
  };

  return (
    <header className="h-[70px] bg-white border-b border-slate-200 flex items-center px-4 sticky top-0 z-50 shadow-sm">

      {/* Hamburger */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors flex-shrink-0 mr-2">
        <Menu size={22} />
      </button>

      {/* Scrollable nav tabs — takes remaining space, clips internally */}
      <nav className="flex overflow-x-auto items-center gap-1 min-w-0 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'server-accounts', label: 'Server Accounts' },
          { id: 'all-orders', label: 'All Orders' },
          { id: 'domain-search', label: 'Domain List' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            {tab.label}
          </button>
        ))}

        <div className="w-px h-6 bg-slate-200 mx-1 flex-shrink-0"></div>

        {[
          { id: 'sales', label: 'Sales' },
          { id: 'users', label: 'Users' },
          { id: 'tickets', label: 'Tickets', count: tickets?.length || 0 },
          { id: 'financial', label: 'Financial' },
          { id: 'api-settings', label: 'API Settings' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
            {tab.label}
            {tab.count > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none">{tab.count}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Settings Dropdown — OUTSIDE nav so it's not clipped by overflow-x-auto */}
      <div className="relative flex-shrink-0 ml-1" ref={dropdownRef}>
        <button
          onClick={() => setSettingsOpen(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${settingsOpen ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
        >
          <Settings2 size={15} />
          Settings
          <ChevronDown size={14} className={`transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
        </button>

        {settingsOpen && (
          <div className="absolute top-full mt-2 right-0 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] w-60 py-2">
            <p className="px-5 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">Modules</p>
            {SETTINGS_MODULES.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSettingsOpen(false); }}
                className={`w-full text-left px-5 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === item.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50 hover:text-indigo-600'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right section — always visible, never shrinks */}
      <div className="flex items-center flex-shrink-0 h-full border-l border-slate-200 pl-4 ml-2 gap-1">
                {/* Bell Notification Panel */}
        <div className="relative flex items-center justify-center mr-2">
          <AdminNotifications setActiveTab={setActiveTab} />
        </div>

        {/* Profile & Logout */}
        <div className="relative h-full flex items-center pl-3 border-l border-slate-200" ref={profileRef}>
          <button 
            onClick={() => setProfileOpen(v => !v)}
            className="flex items-center gap-2 hover:bg-slate-50 p-1.5 pr-3 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-white shadow-md">
              <User size={15} className="text-white" />
            </div>
            <span className="text-sm font-bold text-slate-700 hidden lg:block">Admin</span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div className="absolute top-[60px] right-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] w-52 py-2 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 mb-1">
                <p className="text-sm font-bold text-slate-800">Admin User</p>
                <p className="text-xs text-slate-500 font-medium truncate">admin@system.local</p>
              </div>
              
              <button onClick={() => { setProfileOpen(false); navigate('/admin/profile'); }} className="w-full text-left px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2">
                <User size={15} /> My Profile
              </button>
              <button onClick={() => { setProfileOpen(false); setSettingsOpen(true); }} className="w-full text-left px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2">
                <Settings2 size={15} /> Preferences
              </button>
              
              <div className="h-px bg-slate-100 my-1"></div>
              
              <button
                onClick={() => { 
                  import('firebase/auth').then(({ signOut }) => signOut(auth)); 
                  navigate('/'); 
                }}
                className="w-full text-left px-5 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
