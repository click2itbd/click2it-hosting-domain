import React, { useState, useEffect } from 'react';
import {
  Layers, Plus, Search, Trash2, Edit2, CheckCircle2, AlignLeft, DollarSign, Box, AlertCircle, PlusCircle
} from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';
import { toast } from 'react-hot-toast';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { Modal } from '../components/SharedUI';

export function ExtraServicesModule() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', description: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchServices = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'hostingExtraServices'), orderBy('createdAt', 'desc')));
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      toast.error('Failed to load extra services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServices(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', price: '', description: '', status: 'active' });
    setShowModal(true);
  };

  const openEdit = (svc) => {
    setEditing(svc);
    setForm({ 
      name: svc.name || '', 
      price: String(svc.price || ''), 
      description: svc.description || '', 
      status: svc.status || 'active' 
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
        await updateDoc(doc(db, 'hostingExtraServices', editing.id), data);
        toast.success('Service updated');
      } else {
        await addDoc(collection(db, 'hostingExtraServices'), { ...data, createdAt: serverTimestamp() });
        toast.success('Service added');
      }
      setShowModal(false);
      fetchServices();
    } catch {
      toast.error('Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this extra service?')) return;
    try {
      await deleteDoc(doc(db, 'hostingExtraServices', id));
      toast.success('Service deleted');
      setServices(s => s.filter(x => x.id !== id));
    } catch {
      toast.error('Failed to delete service');
    }
  };

  const toggleStatus = async (item) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'hostingExtraServices', item.id), { status: newStatus });
      setServices(s => s.map(x => x.id === item.id ? { ...x, status: newStatus } : x));
      toast.success(newStatus === 'active' ? 'Service activated' : 'Service deactivated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filteredServices = services.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
              <Layers className="text-white" size={24} />
            </div>
            Extra Services
          </h2>
          <p className="text-slate-500 text-sm mt-1 ml-14">Manage one-time addons, extra setups, and custom requests</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input 
              type="text" 
              placeholder="Search services..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
          <button onClick={openAdd} className="bg-slate-900 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-0.5 whitespace-nowrap">
            <Plus size={18} /> Add Service
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-300">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6">
            <Layers size={40} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">No Extra Services</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-6">Create additional services like 'Website Migration', 'Premium SSL Setup', or 'Priority Support'.</p>
          <button onClick={openAdd} className="bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-600 hover:bg-indigo-50 px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2">
            <PlusCircle size={18} /> Create Service
          </button>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-slate-100">
          <AlertCircle size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="text-slate-500 font-medium">No services found matching "{searchTerm}"</p>
          <button onClick={() => setSearchTerm('')} className="mt-3 text-indigo-600 hover:text-indigo-800 font-semibold text-sm">Clear search</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map(svc => (
            <div key={svc.id} className={cn(
              "group bg-white rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden relative",
              svc.status === 'active' 
                ? "border-slate-200 hover:border-indigo-200 hover:shadow-indigo-100/50 hover:-translate-y-1" 
                : "border-slate-200 opacity-75 bg-slate-50"
            )}>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
                    svc.status === 'active' ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 text-slate-400"
                  )}>
                    <Box size={24} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(svc)} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white rounded-lg border border-slate-100 shadow-sm transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(svc.id)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-white rounded-lg border border-slate-100 shadow-sm transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <h4 className="text-lg font-bold text-slate-800 mb-2 leading-tight">{svc.name}</h4>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                  {svc.description || 'No description provided.'}
                </p>
                
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                  <div className="font-black text-lg text-slate-800">
                    {formatCurrency(svc.price || 0)}
                  </div>
                  <button 
                    onClick={() => toggleStatus(svc)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                      svc.status === 'active' 
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                        : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                    )}
                  >
                    {svc.status === 'active' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {svc.status === 'active' ? 'Active' : 'Hidden'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Update Extra Service' : 'Create Extra Service'} maxWidth="max-w-lg">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Service Name <span className="text-rose-500">*</span></label>
            <div className="relative">
              <Box className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input required type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all outline-none" placeholder="e.g. Website Migration Service" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">One-time Price (BDT) <span className="text-rose-500">*</span></label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input required type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-bold text-slate-800 transition-all outline-none" placeholder="1500" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Short Description</label>
            <div className="relative">
              <AlignLeft className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
              <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all outline-none resize-none" placeholder="Briefly describe what this service includes..." />
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <div>
              <p className="font-bold text-indigo-900 text-sm">Active Service</p>
              <p className="text-xs text-indigo-700/80 mt-0.5">Allow customers to see and buy this service</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={form.status === 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.checked ? 'active' : 'inactive' }))} />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors outline-none">Cancel</button>
            <button type="submit" disabled={saving} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-indigo-600 hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 outline-none">
              {saving ? 'Saving...' : editing ? 'Update Service' : 'Create Service'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
