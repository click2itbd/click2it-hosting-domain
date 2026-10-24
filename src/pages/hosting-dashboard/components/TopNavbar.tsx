import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  ChevronDown,
  Bell,
  User,
  LogOut,
  Settings2,
  Server,
  Ticket,
  Globe,
  ShieldCheck,
  ExternalLink,
  Key,
  Mail,
  Phone,
  CheckCircle2,
  X,
  Save,
  Users
} from 'lucide-react';
import { AdminNotifications } from '../../../components/AdminNotifications';
import { auth, db } from '../../../firebase';
import { useAuth } from '../../../context/AuthContext';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { toast } from 'react-hot-toast';

const SETTINGS_MODULES = [
  { label: '💳 Payment Gateway (EPS)', id: 'payment-settings' },
  { label: '✉️ Email & SMTP Settings', id: 'email-templates' },
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

export function TopNavbar({ state }: { state: any }) {
  const navigate = useNavigate();
  const { user, profile, isAdmin, isManager, logout } = useAuth();
  const { sidebarOpen, setSidebarOpen, activeTab, setActiveTab, tickets } = state;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(true);

  // Admin Profile Modal State
  const [isAdminProfileModalOpen, setIsAdminProfileModalOpen] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [savingAdminProfile, setSavingAdminProfile] = useState(false);

  const displayAdminName =
    profile?.displayName ||
    (profile as any)?.name ||
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : 'Admin');
  const displayAdminEmail = user?.email || profile?.email || 'admin@click2it.bd';
  const displayAdminRole = isAdmin ? 'Super Admin' : isManager ? 'Manager' : 'Staff';

  const openAdminProfileModal = () => {
    setAdminName(displayAdminName);
    setAdminPhone((profile as any)?.phone || '');
    setAdminNewPassword('');
    setProfileOpen(false);
    setIsAdminProfileModalOpen(true);
  };

  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingAdminProfile(true);
    try {
      const cleanName = adminName.trim() || 'Admin';
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: cleanName,
        name: cleanName,
        phone: adminPhone.trim(),
        updatedAt: new Date().toISOString(),
      });
      await updateProfile(user, { displayName: cleanName }).catch(() => null);

      if (adminNewPassword.trim()) {
        if (adminNewPassword.trim().length < 6) {
          toast.error('New password must be at least 6 characters.');
          setSavingAdminProfile(false);
          return;
        }
        try {
          await updatePassword(user, adminNewPassword.trim());
          toast.success('Admin profile and password updated!');
        } catch (pwErr: any) {
          if (pwErr?.code === 'auth/requires-recent-login' && user.email) {
            await sendPasswordResetEmail(auth, user.email);
            toast.success('Profile saved! A password reset link was sent to your email for security verification.');
          } else {
            throw pwErr;
          }
        }
      } else {
        toast.success('Admin profile updated successfully!');
      }
      setIsAdminProfileModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update admin profile.');
    } finally {
      setSavingAdminProfile(false);
    }
  };

  // Close settings dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time notifications — domain & hosting only
  useEffect(() => {
    const unsubs: Array<() => void> = [];

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
          return Number(bTime) - Number(aTime);
        }).slice(0, 15);
        setUnreadCount(merged.length);
        return merged;
      });
      setNotifLoading(false);
    }, () => {
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
          return Number(bTime) - Number(aTime);
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
          return Number(bTime) - Number(aTime);
        }).slice(0, 15);
      });
    }, () => {}));

    return () => unsubs.forEach(u => u());
  }, []);

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
          { id: 'payment-settings', label: 'Payment Gateway' },
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
            className="flex items-center gap-2.5 hover:bg-slate-50 p-1.5 pr-3 rounded-xl transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center border-2 border-white shadow-md text-white font-bold text-xs">
              {displayAdminName.charAt(0).toUpperCase() || <User size={15} className="text-white" />}
            </div>
            <div className="hidden lg:block text-left">
              <span className="text-xs font-extrabold text-slate-800 block leading-tight max-w-[110px] truncate">
                {displayAdminName}
              </span>
              <span className="text-[10px] font-semibold text-blue-600 block leading-tight">
                {displayAdminRole}
              </span>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div className="absolute top-[62px] right-2 bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-[100] w-64 py-2 overflow-hidden animate-in fade-in duration-150">
              <div className="px-4 py-3.5 bg-gradient-to-br from-slate-50 to-blue-50/40 border-b border-slate-100 mb-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-slate-900 truncate">{displayAdminName}</p>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-100 text-blue-700 shrink-0">
                    {displayAdminRole}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{displayAdminEmail}</p>
              </div>
              
              <button
                onClick={openAdminProfileModal}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <User size={15} className="text-slate-400" /> Admin Profile &amp; Password
              </button>

              <button
                onClick={() => {
                  setProfileOpen(false);
                  setActiveTab('users');
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <Users size={15} className="text-slate-400" /> Manage Customers
              </button>

              <button
                onClick={() => {
                  setProfileOpen(false);
                  setActiveTab('api-settings');
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <Settings2 size={15} className="text-slate-400" /> System &amp; API Preferences
              </button>

              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/');
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <ExternalLink size={15} className="text-slate-400" /> Visit Live Website
              </button>
              
              <div className="h-px bg-slate-100 my-1"></div>
              
              <button
                onClick={async () => {
                  setProfileOpen(false);
                  await logout();
                  navigate('/login');
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Admin Profile & Security Modal */}
      {isAdminProfileModalOpen && createPortal(
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsAdminProfileModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center font-black text-base">
                  {displayAdminName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Admin Profile &amp; Security</h3>
                  <p className="text-xs text-blue-200">{displayAdminEmail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminProfileModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdminProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Admin Display Name</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Admin Email (Login ID)</label>
                <input
                  type="email"
                  disabled
                  value={displayAdminEmail}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+8801XXXXXXXXX"
                  value={adminPhone}
                  onChange={e => setAdminPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Change Password <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Enter new password (min 6 characters)"
                  value={adminNewPassword}
                  onChange={e => setAdminNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminProfileModalOpen(false);
                    navigate('/profile');
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Open Client Area Profile &rarr;
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAdminProfileModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAdminProfile}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Save size={14} /> {savingAdminProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
