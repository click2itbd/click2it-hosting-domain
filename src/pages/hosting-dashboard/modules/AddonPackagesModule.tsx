import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Trash2, Edit2, Search, CheckCircle2, Box, Cpu, DollarSign, Activity, AlertCircle, PlusCircle, Link as LinkIcon
} from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';
import { toast } from 'react-hot-toast';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { Modal } from '../components/SharedUI';

export function AddonPackagesModule() {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', billingCycle: 'monthly', price: '', status: 'active', type: 'software' });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAddons = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'hostingAddonPackages'), orderBy('createdAt', 'desc')));
      setAddons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      toast.error('Failed to load addon packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAddons(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', billingCycle: 'monthly', price: '', status: 'active', type: 'software' });
    setShowModal(true);
  };

  const openEdit = (addon) => {
    setEditing(addon);
    setForm({ 
      name: addon.name || '', 
      billingCycle: addon.billingCycle || 'monthly', 
      price: String(addon.price || ''), 
      status: addon.status || 'active',
      type: addon.type || 'software'
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    const data = { ...form, price: parseFloat(form.price) || 0 };
    try {
      if (editing) {
        await updateDoc(doc(db, 'hostingAddonPackages', editing.id), data);
        toast.success('Addon package updated');
      } else {
        await addDoc(collection(db, 'hostingAddonPackages'), { ...data, createdAt: serverTimestamp() });
        toast.success('Addon package created');
      }
      setShowModal(false);
      fetchAddons();
    } catch {
      toast.error('Failed to save addon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this addon package?')) return;
    try {
      await deleteDoc(doc(db, 'hostingAddonPackages', id));
      toast.success('Addon deleted');
      setAddons(a => a.filter(x => x.id !== id));
    } catch {
      toast.error('Failed to delete addon');
    }
  };

  const toggleStatus = async (item) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'hostingAddonPackages', item.id), { status: newStatus });
      setAddons(a => a.map(x => x.id === item.id ? { ...x, status: newStatus } : x));
      toast.success(newStatus === 'active' ? 'Addon activated' : 'Addon deactivated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filteredAddons = addons.filter(a => 
    (a.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAddonIcon = (type) => {
    switch (type) {
      case 'software': return <Box size={24} className="text-teal-600" />;
      case 'ip': return <Activity size={24} className="text-blue-600" />;
      case 'security': return <CheckCircle2 size={24} className="text-emerald-600" />;
      case 'resource': return <Cpu size={24} className="text-indigo-600" />;
      default: return <Package size={24} className="text-teal-600" />;
    }
  };

  const getAddonBg = (type) => {
    switch (type) {
      case 'software': return 'bg-teal-50 border-teal-100 shadow-teal-100/50';
      case 'ip': return 'bg-blue-50 border-blue-100 shadow-blue-100/50';
      case 'security': return 'bg-emerald-50 border-emerald-100 shadow-emerald-100/50';
      case 'resource': return 'bg-indigo-50 border-indigo-100 shadow-indigo-100/50';
      default: return 'bg-slate-50 border-slate-100 shadow-slate-100/50';
    }
  };

  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl shadow-lg shadow-teal-200">
              <Package className="text-white" size={24} />
            </div>
            Addon Services
          </h2>
          <p className="text-slate-500 text-sm mt-1 ml-14">Upsell extra IPs, software licenses, and security features</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input 
              type="text" 
              placeholder="Search addons..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
          <button onClick={openAdd} className="bg-slate-900 hover:bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-teal-200 hover:-translate-y-0.5 whitespace-nowrap">
            <Plus size={18} /> Add Service
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : addons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-300">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6">
            <Box size={40} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">No Addon Services Yet</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-8">Increase your revenue by offering additional services like Dedicated IPs, cPanel licenses, and automated backups.</p>
          <button onClick={openAdd} className="bg-white text-teal-600 border-2 border-teal-100 hover:border-teal-600 hover:bg-teal-50 px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2">
            <PlusCircle size={18} /> Create First Addon
          </button>
        </div>
      ) : filteredAddons.length === 0 ? (
        <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-100">
          <AlertCircle size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="text-slate-500 font-medium">No addon services found matching "{searchTerm}"</p>
          <button onClick={() => setSearchTerm('')} className="mt-3 text-teal-600 hover:text-teal-800 font-semibold text-sm">Clear search</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAddons.map(addon => (
            <div key={addon.id} className={cn(
              "group rounded-2xl border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col relative",
              addon.status === 'active' ? getAddonBg(addon.type || 'software') : 'bg-slate-50 border-slate-200 opacity-80 grayscale-[20%]'
            )}>
              <div className="p-6 flex flex-col h-full bg-white/60">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-white/50">
                    {getAddonIcon(addon.type || 'software')}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(addon)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-white rounded-lg transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(addon.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mb-6 flex-1">
                  <h4 className="font-extrabold text-slate-800 text-lg mb-1 leading-tight">{addon.name}</h4>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {addon.type || 'software'}
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-200/50 flex justify-between items-end">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Price</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">{formatCurrency(addon.price || 0)}</span>
                      <span className="text-sm font-semibold text-slate-500">/{addon.billingCycle === 'annually' ? 'yr' : 'mo'}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => toggleStatus(addon)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                      addon.status === 'active' 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                        : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                    )}
                  >
                    {addon.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Update Addon Service' : 'Create Addon Service'} maxWidth="max-w-xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 flex gap-3 items-start">
            <LinkIcon className="text-teal-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-teal-900 text-sm">Upsell Opportunity</h4>
              <p className="text-xs text-teal-700/80 mt-1">These services will be displayed as optional checkboxes during the checkout process when customers purchase a VPS or Dedicated server.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Addon Name <span className="text-rose-500">*</span></label>
              <input required type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm font-medium transition-all outline-none" placeholder="e.g. cPanel Solo License" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Category Type</label>
                <div className="relative">
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm font-medium transition-all appearance-none outline-none">
                    <option value="software">Software License</option>
                    <option value="ip">Dedicated IP</option>
                    <option value="security">Security & Backup</option>
                    <option value="resource">Server Resource</option>
                  </select>
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Box size={16} />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Billing Cycle</label>
                <div className="relative">
                  <select value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm font-medium transition-all appearance-none outline-none">
                    <option value="monthly">Monthly</option>
                    <option value="annually">Annually</option>
                  </select>
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Activity size={16} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Price (BDT) <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input required type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm font-bold text-slate-800 transition-all outline-none" placeholder="1000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Status</label>
                <div className="relative">
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm font-medium transition-all appearance-none outline-none">
                    <option value="active">Active (Available)</option>
                    <option value="inactive">Inactive (Hidden)</option>
                  </select>
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors rounded-xl font-bold outline-none">Cancel</button>
            <button type="submit" disabled={saving} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-teal-600 hover:shadow-teal-200 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 outline-none">
              {saving ? 'Saving...' : editing ? 'Update Addon' : 'Create Addon'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
