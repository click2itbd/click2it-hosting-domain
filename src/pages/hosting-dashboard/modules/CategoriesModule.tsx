import React, { useState, useEffect } from 'react';
import {
  Folder, Plus, Trash2, Edit2, Layers, Tag, Database, Globe, Cpu, Server, Shield
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { toast } from 'react-hot-toast';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { Modal, StatusBadge, EmptyState, slugify } from '../components/SharedUI';

const CATEGORY_ICONS = [
  { id: 'folder', icon: Folder, name: 'Folder' },
  { id: 'server', icon: Server, name: 'Server' },
  { id: 'database', icon: Database, name: 'Database' },
  { id: 'globe', icon: Globe, name: 'Globe' },
  { id: 'cpu', icon: Cpu, name: 'CPU' },
  { id: 'shield', icon: Shield, name: 'Security' },
  { id: 'layers', icon: Layers, name: 'Layers' },
  { id: 'tag', icon: Tag, name: 'Tag' }
];

const CATEGORY_COLORS = [
  'from-blue-500 to-cyan-400',
  'from-purple-500 to-fuchsia-400',
  'from-emerald-500 to-teal-400',
  'from-amber-500 to-orange-400',
  'from-rose-500 to-pink-400',
  'from-indigo-500 to-blue-400'
];

export function CategoriesModule() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  
  const defaultForm = { name: '', description: '', status: 'active', icon: 'folder', color: CATEGORY_COLORS[0] };
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchCats = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'hostingServiceCategories'), orderBy('createdAt', 'desc')));
      setCats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCats(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ 
      name: cat.name, 
      description: cat.description || '', 
      status: cat.status,
      icon: cat.icon || 'folder',
      color: cat.color || CATEGORY_COLORS[0]
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, updatedAt: new Date().toISOString() };
      if (editing) {
        await updateDoc(doc(db, 'hostingServiceCategories', editing.id), payload);
        toast.success('Category updated');
      } else {
        await addDoc(collection(db, 'hostingServiceCategories'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success('Category created');
      }
      setShowModal(false);
      fetchCats();
    } catch (err) {
      toast.error('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category? It might be linked to services.')) return;
    try {
      await deleteDoc(doc(db, 'hostingServiceCategories', id));
      toast.success('Category deleted');
      setCats(c => c.filter(x => x.id !== id));
    } catch {
      toast.error('Failed to delete category');
    }
  };

  const getIcon = (iconId) => {
    const found = CATEGORY_ICONS.find(i => i.id === iconId);
    const IconComponent = found ? found.icon : Folder;
    return <IconComponent size={24} className="text-white" />;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <Folder className="text-purple-600" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Service Categories</h3>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Organize hosting plans and services</p>
          </div>
        </div>
        <button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md text-sm font-bold flex items-center gap-2 transition-all hover:-translate-y-0.5">
          <Plus size={18} /> Add Category
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-2xl"></div>)}
          </div>
        ) : cats.length === 0 ? (
          <EmptyState message="No categories yet. Add your first category to organize services!" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cats.map(cat => (
              <div key={cat.id} className="group bg-white border border-slate-200 rounded-2xl hover:border-purple-300 hover:shadow-lg transition-all duration-300 relative overflow-hidden flex flex-col h-full">
                
                <div className={`h-24 bg-gradient-to-r ${cat.color || CATEGORY_COLORS[0]} relative`}>
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(cat)} className="w-8 h-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-blue-600 transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="w-8 h-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-rose-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="px-6 pb-6 flex-1 flex flex-col">
                  <div className={`w-14 h-14 bg-gradient-to-br ${cat.color || CATEGORY_COLORS[0]} rounded-2xl flex items-center justify-center shadow-lg -mt-7 mb-4 border-4 border-white`}>
                    {getIcon(cat.icon)}
                  </div>
                  
                  <h4 className="font-bold text-slate-800 text-lg mb-2">{cat.name}</h4>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">
                    {cat.description || 'No description provided.'}
                  </p>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto">
                    <StatusBadge status={cat.status} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
                      ID: {cat.id.substring(0, 5)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Category' : 'Create Category'}>
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Category Name</label>
            <input required type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm font-semibold transition-all outline-none" placeholder="e.g. Shared Hosting" />
          </div>
          
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm font-semibold transition-all outline-none resize-none" placeholder="Briefly describe what goes into this category..." />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Icon</label>
            <div className="grid grid-cols-4 gap-3">
              {CATEGORY_ICONS.map(ic => (
                <button
                  key={ic.id} type="button"
                  onClick={() => setForm(f => ({ ...f, icon: ic.id }))}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${form.icon === ic.id ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'}`}>
                  <ic.icon size={24} className="mb-1" />
                  <span className="text-[10px] font-bold uppercase">{ic.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">Color Theme</label>
            <div className="flex flex-wrap gap-3">
              {CATEGORY_COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-10 h-10 rounded-full bg-gradient-to-r ${c} transition-transform ${form.color === c ? 'ring-4 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-110 shadow-sm'}`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2 mt-2">Status</label>
            <div className="flex gap-4">
              <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 cursor-pointer transition-all ${form.status === 'active' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                <input type="radio" name="status" value="active" checked={form.status === 'active'} onChange={() => setForm(f => ({ ...f, status: 'active' }))} className="hidden" />
                <div className={`w-3 h-3 rounded-full ${form.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                <span className="font-bold text-sm">Active</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 cursor-pointer transition-all ${form.status === 'inactive' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                <input type="radio" name="status" value="inactive" checked={form.status === 'inactive'} onChange={() => setForm(f => ({ ...f, status: 'inactive' }))} className="hidden" />
                <div className={`w-3 h-3 rounded-full ${form.status === 'inactive' ? 'bg-rose-500' : 'bg-slate-300'}`}></div>
                <span className="font-bold text-sm">Inactive</span>
              </label>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 transition-colors rounded-xl font-bold text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center gap-2">
              {saving ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
