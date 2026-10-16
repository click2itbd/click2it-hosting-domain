import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, DollarSign, Percent, Save, RefreshCw, Phone, Globe, Server, LifeBuoy, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Pagination } from '../../common/Pagination';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingsContext';
import { formatCurrency } from '../../../lib/utils';

interface DomainPricing {
  id?: string;  // Firestore document ID (auto-generated)
  tld: string;
  registerPrice: number;
  renewPrice: number;
  transferPrice: number;
  currency: string;
  isActive: boolean;
}

interface DomainHubOrder {
  id: string;
  items?: Array<{ itemType?: string }>;
  status?: string;
  paymentStatus?: string;
  createdAt?: string | number;
  total?: number;
}

interface DomainPricingManagerProps {
  setActiveTab?: (tab: any) => void;
}

export const DomainPricingManager: React.FC<DomainPricingManagerProps> = ({ setActiveTab }) => {
  const { user, isAdmin } = useAuth();
  const { settings } = useSettings();
  const [pricing, setPricing] = useState<DomainPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Live order stats for Hub widget
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'orders'), (snap) => {
      const allOrders: DomainHubOrder[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const hostingAndDomainOrders = allOrders.filter(order => 
        order.items && order.items.some((item: any) => 
          item.itemType === 'domain' || 
          item.itemType === 'hosting' || 
          item.itemType === 'vps'
        )
      );
      setLiveOrders(hostingAndDomainOrders);
    }, () => {});
    return () => unsub();
  }, []);

  const pendingOrders = useMemo(() =>
    liveOrders.filter(o => o.status === 'pending' || o.paymentStatus === 'submitted'), [liveOrders]);
  const todayRevenue = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return liveOrders
      .filter(o => new Date(o.createdAt) >= start && o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }, [liveOrders]);
  const completedOrders = useMemo(() =>
    liveOrders.filter(o => o.status === 'active' || o.status === 'completed' || o.status === 'delivered').length, [liveOrders]);
  const [globalSettings, setGlobalSettings] = useState({
    usdToBdtRate: 0,
    domainMarkupPercent: 0,
    manualBkashNumber: '01700000000',
  });
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState<DomainPricing>({
    tld: '',
    registerPrice: 0,
    renewPrice: 0,
    transferPrice: 0,
    currency: 'BDT',
    isActive: true,
  });
  const [confirmDelete, setConfirmDelete] = useState<{ tld: string; onConfirm: () => void } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const tldsToSync = ['.com', '.net', '.org', '.xyz', '.io', '.co', '.dev', '.online', '.info', '.biz'];
      const res = await fetch('/api/domains/sync-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ tlds: tldsToSync }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully synced ${data.synced?.length || 0} TLDs from Openprovider!`);
        if (data.failed?.length) {
          toast.error(`Could not sync ${data.failed.length} TLD(s): ${data.failed.map((item: any) => item.tld).join(', ')}`);
        }
        fetchData(); // Refresh table
      } else {
        toast.error(data.error || 'Failed to sync API pricing');
      }
    } catch (e: any) {
      toast.error(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Global Settings from public_config or site
      const publicSnap = await getDoc(doc(db, 'settings', 'public_config'));
      if (publicSnap.exists()) {
        const sData = publicSnap.data();
        setGlobalSettings({
          usdToBdtRate: Number(sData.usdToBdtRate) || 0,
          domainMarkupPercent: Number(sData.domainMarkupPercent) || 0,
          manualBkashNumber: sData.manualBkashNumber || '01700000000',
        });
      } else {
        const siteSnap = await getDoc(doc(db, 'settings', 'site'));
        if (siteSnap.exists()) {
          const sData = siteSnap.data();
          setGlobalSettings({
            usdToBdtRate: Number((sData as any).usdToBdtRate) || 0,
            domainMarkupPercent: Number((sData as any).domainMarkupPercent) || 0,
            manualBkashNumber: (sData as any).manualBkashNumber || '01700000000',
          });
        }
      }

      // 2. Fetch Per-TLD Pricing
      const snap = await getDocs(query(collection(db, 'domainPricing'), orderBy('tld', 'asc'), limit(500)));
      const data = snap.docs.map(d => ({ ...(d.data() as DomainPricing), id: d.id }));
      setPricing(data);
    } catch (error) {
      console.error('Error fetching domain pricing:', error);
      toast.error('Failed to load domain pricing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(globalSettings.usdToBdtRate) || globalSettings.usdToBdtRate <= 0
      || !Number.isFinite(globalSettings.domainMarkupPercent) || globalSettings.domainMarkupPercent < 0) {
      toast.error('Enter a positive USD to BDT rate and a non-negative markup percentage.');
      return;
    }
    setSavingGlobal(true);
    try {
      const payload = {
        usdToBdtRate: Number(globalSettings.usdToBdtRate),
        domainMarkupPercent: Number(globalSettings.domainMarkupPercent),
        manualBkashNumber: globalSettings.manualBkashNumber.trim() || '01700000000',
        updatedAt: new Date().toISOString(),
      };

      // 1. Save to public_config (accessible by client checkout and domain search)
      await setDoc(doc(db, 'settings', 'public_config'), payload, { merge: true });

      // 2. Sync to site settings
      await setDoc(doc(db, 'settings', 'site'), payload, { merge: true });

      // 3. Sync to backend API config if token available
      try {
        const token = await user?.getIdToken();
        if (token) {
          await fetch('/api/admin/api-config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }).catch(() => null);
        }
      } catch (e) {
        // Backend optional sync
      }

      toast.success('Global pricing settings & bKash number updated successfully!');
    } catch (err: any) {
      console.error('Error saving global domain pricing settings:', err);
      toast.error('Failed to update global settings: ' + (err.message || 'Permission error'));
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pricingData = {
        tld: formData.tld,
        registerPrice: formData.registerPrice,
        renewPrice: formData.renewPrice,
        transferPrice: formData.transferPrice,
        currency: formData.currency,
        isActive: formData.isActive,
      };
      if (editingDocId) {
        // Use the actual Firestore document ID for updates
        await updateDoc(doc(db, 'domainPricing', editingDocId), pricingData);
        toast.success('Domain pricing updated');
      } else {
        await addDoc(collection(db, 'domainPricing'), pricingData);
        toast.success('Domain pricing added');
      }
      setIsAdding(false);
      setEditingDocId(null);
      setFormData({ tld: '', registerPrice: 0, renewPrice: 0, transferPrice: 0, currency: 'BDT', isActive: true });
      fetchData();
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast.error('Failed to save pricing');
    }
  };

  const handleDelete = (item: DomainPricing) => {
    setConfirmDelete({
      tld: item.tld,
      onConfirm: async () => {
        try {
          if (!item.id) {
            toast.error('Cannot delete: missing document ID');
            return;
          }
          // Use the actual Firestore document ID for deletion
          await deleteDoc(doc(db, 'domainPricing', item.id));
          toast.success('Domain pricing deleted');
          fetchData();
        } catch (error) {
          console.error('Error deleting pricing:', error);
          toast.error('Failed to delete pricing');
        }
      },
    });
  };

  const startEdit = (item: DomainPricing) => {
    setEditingDocId(item.id || null); // track by doc ID, not TLD
    setFormData({
      tld: item.tld,
      registerPrice: item.registerPrice,
      renewPrice: item.renewPrice,
      transferPrice: item.transferPrice,
      currency: item.currency,
      isActive: item.isActive,
    });
    setIsAdding(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Domain & Cloud Server Hub Widget */}
      <div className="bg-gradient-to-r from-[#0a1628] via-[#0f2444] to-[#0a1628] rounded-2xl p-6 text-white shadow-xl border border-blue-900/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Globe size={14} className="animate-spin text-blue-400" style={{ animationDuration: '8s' }} />
              Live Hosting & Domain Operations
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Domain & Cloud Server Hub</h2>
            <p className="text-xs text-blue-200/80 mt-1 max-w-lg">
              Manage client domain registrations, WHM cPanel hosting provisioning, and bKash payment verification in real-time.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setActiveTab?.('hostingOrders')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-blue-600/30"
            >
              <Server size={16} /> View Orders
            </button>
            <button
              onClick={() => setActiveTab?.('support_tickets')}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all border border-white/10"
            >
              <LifeBuoy size={16} /> Support
            </button>
          </div>
        </div>

        {/* Mini Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-blue-800/40">
          <div
            onClick={() => setActiveTab?.('hostingOrders')}
            className={`p-4 rounded-xl cursor-pointer transition-all border ${
              pendingOrders.length > 0
                ? 'bg-amber-500/10 border-amber-400/40 hover:bg-amber-500/20'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-200">Pending Orders (Action Required)</span>
              {pendingOrders.length > 0 ? (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              ) : (
                <CheckCircle2 size={16} className="text-emerald-400" />
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-2xl font-black ${pendingOrders.length > 0 ? 'text-amber-400' : 'text-white'}`}>
                {pendingOrders.length}
              </span>
              <span className="text-[11px] text-blue-300">
                {pendingOrders.length > 0 ? 'Awaiting verification' : 'All cleared'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <span className="text-xs font-semibold text-blue-200">Today's Sales Revenue</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-emerald-400">
                {formatCurrency(todayRevenue, settings)}
              </span>
              <span className="text-[11px] text-blue-300">Today's collections</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <span className="text-xs font-semibold text-blue-200">Active Completed Orders</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-blue-400">{completedOrders}</span>
              <span className="text-[11px] text-blue-300">Provisioned services</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Rate & Profit Margin Settings Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              Global Exchange Rate & Profit Margin
            </h3>
            <p className="text-sm text-slate-500 mt-2 max-w-2xl">
              Configure the base USD to BDT exchange rate and your desired profit margin. These settings are used to automatically calculate live domain pricing dynamically from <strong className="text-slate-700">Openprovider API</strong> supplier rates.
            </p>
          </div>
          <div className="shrink-0 bg-slate-50 border border-slate-100 rounded-xl p-3 px-4 flex flex-col items-end">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</span>
             <span className="text-xs font-bold text-emerald-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active Settings</span>
          </div>
        </div>

        <form onSubmit={handleSaveGlobal} className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Exchange Rate */}
          <div className="group">
            <label className="flex flex-col text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              USD to BDT Exchange Rate
              <span className="text-[10px] text-slate-400 normal-case font-normal mt-0.5">Base rate for domain conversion</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={globalSettings.usdToBdtRate}
                onChange={e => setGlobalSettings({ ...globalSettings, usdToBdtRate: parseFloat(e.target.value) || 0 })}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 font-black transition-all"
                placeholder="Enter current exchange rate"
              />
            </div>
          </div>

          {/* Profit Margin */}
          <div className="group">
            <label className="flex flex-col text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Retail Profit Margin
              <span className="text-[10px] text-slate-400 normal-case font-normal mt-0.5">Percentage added to supplier cost</span>
            </label>
            <div className="relative">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                value={globalSettings.domainMarkupPercent}
                onChange={e => setGlobalSettings({ ...globalSettings, domainMarkupPercent: parseFloat(e.target.value) || 0 })}
                className="w-full pl-4 pr-9 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 font-black transition-all"
                placeholder="Enter markup percentage"
              />
            </div>
          </div>

          {/* bKash Number */}
          <div className="group">
            <label className="flex flex-col text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Manual bKash Number
              <span className="text-[10px] text-slate-400 normal-case font-normal mt-0.5">Used for offline manual payments</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 bg-pink-100 text-pink-600 font-bold text-[10px] px-2 py-1 rounded-md uppercase">bKash</span>
              <input
                type="text"
                required
                value={globalSettings.manualBkashNumber}
                onChange={e => setGlobalSettings({ ...globalSettings, manualBkashNumber: e.target.value })}
                className="w-full pl-16 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-slate-800 font-black transition-all"
                placeholder="01700000000"
              />
            </div>
          </div>

          {/* Full Width Save Button & Formula Preview */}
          <div className="md:col-span-3 flex flex-col md:flex-row items-center gap-4 mt-2">
            <button
              type="submit"
              disabled={savingGlobal}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20 whitespace-nowrap"
            >
              <Save size={18} /> {savingGlobal ? 'Saving Changes...' : 'Save Global Settings'}
            </button>
            
            <div className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:bg-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="text-emerald-500"><Percent size={14} /></span>
                <span className="hidden sm:inline"><strong>Formula:</strong> Supplier Price (USD) × (1 + {globalSettings.domainMarkupPercent}% / 100) × ৳{globalSettings.usdToBdtRate} BDT</span>
                <span className="sm:hidden"><strong>Formula Preview</strong></span>
              </div>
              <span className="text-xs text-slate-500">TLD supplier prices are fetched live from Openprovider.</span>
            </div>
          </div>
        </form>
      </div>

      {/* Per-TLD Pricing Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold">Custom TLD Pricing Overrides</h2>
            <p className="text-sm text-gray-500 mt-1">Override specific TLD pricing for domain registration, renewal, and transfer (Optional)</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md font-bold flex items-center gap-2 transition-all hover:bg-indigo-700 disabled:opacity-70"
            >
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Popular TLDs'}
            </button>
            <button
              onClick={() => {
                setEditingDocId(null);
                setFormData({ tld: '', registerPrice: 0, renewPrice: 0, transferPrice: 0, currency: 'BDT', isActive: true });
                setIsAdding(true);
              }}
              className="bg-[#EF4444] text-white px-4 py-2 rounded-md font-bold flex items-center gap-2 transition-all hover:bg-red-600"
            >
              <Plus size={18} /> Add TLD Override
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#081621] text-white text-xs uppercase">
              <tr>
                <th className="px-6 py-4">TLD</th>
                <th className="px-6 py-4">Register Price</th>
                <th className="px-6 py-4">Renew Price</th>
                <th className="px-6 py-4">Transfer Price</th>
                <th className="px-6 py-4">Currency</th>
                <th className="px-6 py-4">Active</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pricing.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => (
                <tr key={item.id || item.tld} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold">{item.tld}</td>
                  <td className="px-6 py-4 text-[#EF4444] font-bold">৳{item.registerPrice.toLocaleString()}</td>
                  <td className="px-6 py-4 text-[#EF4444] font-bold">৳{item.renewPrice.toLocaleString()}</td>
                  <td className="px-6 py-4 text-[#EF4444] font-bold">৳{item.transferPrice.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.currency}</td>
                  <td className="px-6 py-4">
                    {item.isActive ? (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Active</span>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="bg-gray-100 p-2 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="bg-gray-100 p-2 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pricing.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                    No custom TLD pricing overrides configured. Default pricing will be calculated using the Global Dollar Rate & Profit Margin above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={pricing.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* Add/Edit Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingDocId ? 'Edit' : 'Add'} Domain Pricing Override</h2>
              <button onClick={() => { setIsAdding(false); setEditingDocId(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">TLD</label>
                <input
                  type="text"
                  required
                  value={formData.tld}
                  onChange={e => setFormData({ ...formData, tld: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  placeholder="e.g. .com"
                  disabled={!!editingDocId}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Register Price (৳)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.registerPrice}
                    onChange={e => setFormData({ ...formData, registerPrice: Number(e.target.value) })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Renew Price (৳)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.renewPrice}
                    onChange={e => setFormData({ ...formData, renewPrice: Number(e.target.value) })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Transfer Price (৳)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.transferPrice}
                    onChange={e => setFormData({ ...formData, transferPrice: Number(e.target.value) })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Currency</label>
                <input
                  type="text"
                  required
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-[#EF4444] focus:ring-[#EF4444]"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
              </div>
              <button
                type="submit"
                className="w-full bg-[#EF4444] text-white py-3 rounded-md font-bold hover:bg-red-600 transition-all"
              >
                {editingDocId ? 'Update Pricing' : 'Add Pricing'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Domain Pricing</h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              Are you sure you want to delete pricing for <span className="font-bold">{confirmDelete.tld}</span>?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDelete.onConfirm();
                  setConfirmDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
