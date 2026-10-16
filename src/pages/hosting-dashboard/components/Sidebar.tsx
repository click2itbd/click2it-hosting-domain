import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileEdit, Folder, Package, PlusSquare, Tag, Server, Settings, Globe, LogOut, Users, DollarSign, HardDrive, RefreshCw, HeadphonesIcon, LayoutDashboard, ShoppingCart, Shield, MessageSquare, Megaphone } from 'lucide-react';
import { auth } from '../../../firebase';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-hot-toast';

export function Sidebar({ state }) {
  const navigate = useNavigate();
  const { startImpersonation } = useAuth();
  const { sidebarOpen, setSidebarOpen, activeTab, setActiveTab, loginAsUserId, setLoginAsUserId, users } = state;

  return (
    <aside className={cn(
      'bg-[#0B1121] text-slate-300 flex flex-col transition-all duration-300 ease-in-out z-50 border-r border-white/5 shadow-2xl relative',
      'fixed inset-y-0 left-0 lg:relative lg:inset-auto',
      sidebarOpen ? 'w-[260px] translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'
    )}>
      {/* Background glowing orb for a premium feel */}
      <div className="absolute top-0 left-0 w-full h-64 bg-blue-600/10 blur-[80px] pointer-events-none" />

      <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' }}>
        {/* Logo Section */}
        <div className="h-[70px] border-b border-white/5 flex items-center px-6 gap-3 mb-4 relative shrink-0 sticky top-0 bg-[#0B1121]/90 backdrop-blur-md z-20">
          <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-xl flex items-center justify-center text-white font-bold tracking-tighter shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            &lt;/&gt;
          </div>
          <span className="font-extrabold text-2xl text-white tracking-tight">
            InHost<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Billing</span>
          </span>
        </div>

        <div className="flex items-center justify-between px-6 mb-2 lg:hidden">
          <span className="font-bold text-white text-lg">Menu</span>
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-lg text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 mb-3 mt-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.2em]">Management</div>
        <ul className="space-y-1.5 px-3 mb-6">
          {[
            { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
            { icon: ShoppingCart, label: 'Hosting Orders', id: 'all-orders' },
            { icon: Users, label: 'Customers & Wallet', id: 'users' },
            { icon: Server, label: 'Active Accounts', id: 'server-accounts' },
            { icon: Tag, label: 'Domain Offer Request', id: 'domain-offers' },
            { icon: RefreshCw, label: 'Domain Renewals', id: 'domain-renewals' },
            { icon: Globe, label: '.BD Domain Apps', id: 'bd-domain-apps' },
            { icon: Globe, label: 'NS Requests', id: 'ns-requests' },
            { icon: HeadphonesIcon, label: 'Support Tickets', id: 'tickets' },
              { icon: Shield, label: 'SSL Certificates', id: 'ssl-certificates' },
              { icon: Globe, label: 'DNS Management', id: 'dns-management' },
              { icon: MessageSquare, label: 'WhatsApp CRM (WAPlus)', id: 'whatsapp-crm' },
              { icon: Megaphone, label: 'Meta Ads (FB & IG)', id: 'meta-campaigns' },
          ].map((item, idx) => {
            const isActive = activeTab === item.id;
            return (
              <li key={idx}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden",
                    isActive ? "text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5 hover:translate-x-1"
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent" />
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-r-md shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  )}
                  <item.icon size={18} className={cn(
                    "relative z-10 transition-transform duration-300 group-hover:scale-110",
                    isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-cyan-400/70"
                  )} />
                  <span className="relative z-10">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="px-6 mb-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.2em]">Modules & Settings</div>
        <ul className="space-y-1.5 px-3 pb-6">
          {[
            { icon: FileEdit, label: 'Pages Editor', id: 'pages-editor' },
            { icon: Folder, label: 'Categories', id: 'categories' },
            { icon: Package, label: 'Hosting Packages', id: 'plan-packages' },
            { icon: PlusSquare, label: 'Extra Services', id: 'extra-services' },
            { icon: Package, label: 'Addon Packages', id: 'addon-packages' },
            { icon: DollarSign, label: 'Domain Price', id: 'domain-pricing' },
            { icon: Tag, label: 'Promo Codes', id: 'promo-codes' },
            { icon: Server, label: 'Servers', id: 'servers' },
            { icon: Settings, label: 'Domain Registrars', id: 'domain-registrars' },
            { icon: Settings, label: 'Hosting API Settings', id: 'api-settings' },
          ].map((item, idx) => {
            const isActive = activeTab === item.id;
            return (
              <li key={idx}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden",
                    isActive ? "text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5 hover:translate-x-1"
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent" />
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-r-md shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  )}
                  <item.icon size={18} className={cn(
                    "relative z-10 transition-transform duration-300 group-hover:scale-110",
                    isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-cyan-400/70"
                  )} />
                  <span className="relative z-10">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-5 border-t border-white/5 bg-[#070b14] relative z-10 mt-auto shrink-0">
        <p className="text-[10px] text-slate-500 mb-3 font-extrabold uppercase tracking-[0.15em]">Login as User</p>
        <div className="flex items-center gap-2">
          <select
            value={loginAsUserId}
            onChange={e => {
              const val = e.target.value;
              setLoginAsUserId(val);
              if (val) {
                const selected = users.find((u: any) => (u.id === val || u.uid === val));
                if (selected) {
                  startImpersonation({
                    uid: selected.id || selected.uid,
                    email: selected.email || '',
                    displayName: selected.displayName || selected.name || 'Customer',
                    name: selected.name || selected.displayName || 'Customer',
                    balance: selected.balance,
                    phone: selected.phone || selected.phoneNumber,
                    customerId: selected.customerId
                  });
                  toast.success(`Opening Customer Portal for ${selected.displayName || selected.name || selected.email}`);
                  navigate('/profile');
                }
              }
            }}
            className="bg-[#0f172a] text-xs font-semibold text-slate-300 border border-white/5 rounded-lg p-2.5 flex-1 focus:ring-1 focus:ring-cyan-500 outline-none transition-all">
            <option value="">Select user...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.email || u.displayName || u.id}</option>
            ))}
          </select>
          <button
            onClick={() => { import('firebase/auth').then(({ signOut }) => signOut(auth)); navigate('/'); }}
            className="bg-[#0f172a] border border-white/5 p-2.5 rounded-lg hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 transition-all text-slate-400"
            title="Logout via Sidebar">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}



