import React, { useState, useEffect } from 'react';
import {
  Tag, Plus, Trash2, Edit2, Percent, Calendar, AlertCircle, CheckCircle2, ShieldCheck, Ticket, Search, Clock
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { toast } from 'react-hot-toast';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { Modal } from '../components/SharedUI';

export function PromoCodesModule() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ 
    code: '', 
    discountPercentage: '', 
    expiryDate: '', 
    isActive: true,
    applicableFor: ['domain', 'hosting'] // Enforcing domain/hosting only
  });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [promoSettings, setPromoSettings] = useState({
    excludeBdDomains: true
  });
  const [savingSettings, setSavingSettings] = useState(false);
  
  useEffect(() => {
    import('firebase/firestore').then(({ onSnapshot, doc }) => {
      onSnapshot(doc(db, 'settings', 'hostingPromos'), (snap) => {
        if (snap.exists()) {
          setPromoSettings(prev => ({ ...prev, ...snap.data() }));
        }
      });
    });
  }, []);

  const saveGlobalSettings = async (newVal: boolean) => {
    setSavingSettings(true);
    try {
      const { setDoc, doc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'hostingPromos'), { excludeBdDomains: newVal }, { merge: true });
      toast.success('Settings updated!');
    } catch (e) {
      toast.error('Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchCodes = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'couponCodes'), orderBy('createdAt', 'desc')));
      setCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      toast.error('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCodes(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ code: '', discountPercentage: '', expiryDate: '', isActive: true, applicableFor: ['domain', 'hosting'] });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ 
      code: c.code, 
      discountPercentage: String(c.discountPercentage || ''), 
      expiryDate: c.expiryDate || '', 
      isActive: c.isActive !== false,
      applicableFor: c.applicableFor || ['domain', 'hosting']
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) { toast.error('Code is required'); return; }
    
    // Ensure it's strictly domain/hosting
    setSaving(true);
    const data = {
      code: form.code.toUpperCase().trim(),
      discountPercentage: parseFloat(form.discountPercentage) || 0,
      expiryDate: form.expiryDate || null,
      isActive: form.isActive,
      applicableFor: ['domain', 'hosting'] // HARD ENFORCED
    };
    
    try {
      if (editing) {
        await updateDoc(doc(db, 'couponCodes', editing.id), data);
        toast.success('Promo code updated successfully');
      } else {
        await addDoc(collection(db, 'couponCodes'), { ...data, createdAt: new Date().toISOString() });
        toast.success('Promo code created successfully');
      }
      setShowModal(false);
      fetchCodes();
    } catch {
      toast.error('Failed to save promo code');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      await deleteDoc(doc(db, 'couponCodes', id));
      toast.success('Promo code deleted');
      setCodes(c => c.filter(x => x.id !== id));
    } catch {
      toast.error('Failed to delete promo code');
    }
  };

  const toggleActive = async (item) => {
    try {
      await updateDoc(doc(db, 'couponCodes', item.id), { isActive: !item.isActive });
      setCodes(c => c.map(x => x.id === item.id ? { ...x, isActive: !x.isActive } : x));
      toast.success(item.isActive ? 'Promo code disabled' : 'Promo code enabled');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filteredCodes = codes.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isExpired = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl shadow-lg shadow-pink-200">
              <Ticket className="text-white" size={24} />
            </div>
            Discount & Promo Codes
          </h2>
          <p className="text-slate-500 text-sm mt-1 ml-14">Manage exclusive coupons for Domain & Hosting services</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <input 
              type="text" 
              placeholder="Search code..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
          <button onClick={openAdd} className="bg-slate-900 hover:bg-pink-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-pink-200 hover:-translate-y-0.5 whitespace-nowrap">
            <Plus size={18} /> New Coupon
          </button>
        </div>
      </div>

      {/* Global Promo Settings */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-blue-900 flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-600"/> 
            Strict Margin Protection (.BD Domains)
          </h3>
          <p className="text-sm text-blue-700 mt-1 leading-relaxed">
            When enabled, all .BD domain variants (e.g. .com.bd, .edu.bd) are completely excluded from percentage or fixed discounts in the cart.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={promoSettings.excludeBdDomains !== false} 
            onChange={(e) => saveGlobalSettings(e.target.checked)} 
            disabled={savingSettings} 
          />
          <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 opacity-90 peer-disabled:opacity-50"></div>
        </label>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-slate-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : codes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-300">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-5">
            <Tag size={36} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">No Promo Codes</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-6">You haven't created any promotional campaigns yet. Add your first coupon code.</p>
          <button onClick={openAdd} className="bg-white text-pink-600 border-2 border-pink-100 hover:border-pink-600 hover:bg-pink-50 px-6 py-2.5 rounded-xl font-bold transition-all">
            Create First Coupon
          </button>
        </div>
      ) : filteredCodes.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-slate-100">
           <AlertCircle size={32} className="mx-auto text-slate-400 mb-3" />
           <p className="text-slate-500 font-medium">No coupons found matching "{searchTerm}"</p>
           <button onClick={() => setSearchTerm('')} className="mt-3 text-indigo-600 hover:text-indigo-800 font-semibold text-sm">Clear search</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCodes.map(item => {
            const expired = isExpired(item.expiryDate);
            return (
              <div key={item.id} className={cn(
                "relative group flex flex-col rounded-2xl overflow-hidden transition-all duration-300 border",
                item.isActive && !expired 
                  ? "bg-white border-pink-200 shadow-lg shadow-pink-100/50 hover:-translate-y-1" 
                  : "bg-slate-50 border-slate-200 opacity-80"
              )}>
                {/* Decorative cutouts for ticket effect */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50 border-r border-slate-200 z-10"></div>
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50 border-l border-slate-200 z-10"></div>
                
                {/* Actions overlay */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white rounded-md shadow-sm border border-slate-100"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white rounded-md shadow-sm border border-slate-100"><Trash2 size={14} /></button>
                </div>

                <div className={cn(
                  "p-6 text-center border-b border-dashed border-slate-200",
                  item.isActive && !expired ? "bg-gradient-to-br from-pink-50 to-white" : ""
                )}>
                  <div className="text-3xl font-black font-mono tracking-wider mb-2 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                    {item.code}
                  </div>
                  <div className="inline-flex items-center justify-center gap-1.5 bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-bold">
                    <Percent size={14} /> {item.discountPercentage}% OFF
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between bg-white">
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-1.5"><ShieldCheck size={14} /> Scope</span>
                      <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs border border-indigo-100">Hosting & Domain</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-1.5"><Calendar size={14} /> Expiry</span>
                      <span className={cn("font-semibold", expired ? "text-red-500" : "text-slate-700")}>
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Expiry'}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => toggleActive(item)}
                    className={cn(
                      "w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
                      item.isActive 
                        ? "bg-slate-900 text-white hover:bg-slate-800" 
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}>
                    {item.isActive ? (
                      <><CheckCircle2 size={16} /> Active Coupon</>
                    ) : (
                      <><AlertCircle size={16} /> Disabled</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Update Coupon Code' : 'Create New Coupon'} maxWidth="max-w-md">
        <form onSubmit={handleSave} className="space-y-5">
          
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 items-start">
            <ShieldCheck className="text-indigo-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-indigo-900 text-sm">Domain & Hosting Only</h4>
              <p className="text-xs text-indigo-700/80 mt-1">This coupon will strictly apply to web hosting packages and domain registrations. It will not work for general e-commerce products.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Coupon Code <span className="text-red-500">*</span></label>
            <div className="relative">
              <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input required type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-base font-bold font-mono tracking-widest text-slate-800 transition-all uppercase outline-none" placeholder="E.g. EID2026" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Discount Percentage <span className="text-red-500">*</span></label>
            <div className="relative">
              <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input required type="number" step="0.01" min="1" max="100" value={form.discountPercentage} onChange={e => setForm(f => ({ ...f, discountPercentage: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-base font-bold text-slate-800 transition-all outline-none" placeholder="15" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Expiry Date (Optional)</label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm font-medium transition-all text-slate-600 outline-none" />
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <div>
              <p className="font-bold text-slate-800 text-sm">Active Status</p>
              <p className="text-xs text-slate-500">Enable or disable this coupon instantly</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
            </label>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors outline-none">Cancel</button>
            <button type="submit" disabled={saving} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-pink-600 hover:shadow-pink-200 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 outline-none">
              {saving ? 'Saving...' : editing ? 'Update Coupon' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

