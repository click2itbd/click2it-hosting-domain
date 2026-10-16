import React, { useState, useEffect } from 'react';
import {
  FileEdit, Folder, Package, PlusSquare, Tag, Server, Settings, Globe,
  Plus, Trash2, Edit2, CheckCircle2, Eye, EyeOff, Save
} from 'lucide-react';
import { cn, formatCurrency } from '../../../lib/utils';
import { toast } from 'react-hot-toast';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc,
  serverTimestamp, query, orderBy, onSnapshot, limit
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { Modal, StatusBadge, EmptyState, slugify } from '../components/SharedUI';

export function PlanPackagesModule() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', disk: '', bw: '', featured: false });

  const fetchPlans = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'hosting_plans'), limit(100)));
      const data = snap.docs.map(d => ({ id: d.id, order: 0, ...d.data() }));
      data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setPlans(data);
    } catch {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan && editingPlan.id) {
        await updateDoc(doc(db, 'hosting_plans', editingPlan.id), { ...formData });
        toast.success('Plan updated successfully');
      } else {
        await addDoc(collection(db, 'hosting_plans'), { ...formData, order: plans.length, createdAt: serverTimestamp() });
        toast.success('Plan created successfully');
      }
      setShowModal(false);
      setEditingPlan(null);
      setFormData({ name: '', price: '', disk: '', bw: '', featured: false });
      fetchPlans();
    } catch {
      toast.error('Failed to save plan');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this hosting plan?')) return;
    try {
      await deleteDoc(doc(db, 'hosting_plans', id));
      toast.success('Plan deleted');
      fetchPlans();
    } catch {
      toast.error('Failed to delete plan');
    }
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({ name: plan.name, price: plan.price, disk: plan.disk, bw: plan.bw, featured: plan.featured });
    setShowModal(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          <Package className="text-orange-500" /> Plan Packages
        </h3>
        <button onClick={() => { setEditingPlan(null); setFormData({ name: '', price: '', disk: '', bw: '', featured: false }); setShowModal(true); }}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus size={16} /> Add Package
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading plans...</div>
      ) : plans.length === 0 ? (
        <EmptyState message="No hosting plans found. Add your first plan!" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div key={plan.id || i} className={cn("border rounded-lg p-6 relative group", plan.featured ? "border-orange-500 shadow-md" : "border-gray-200 hover:border-orange-300 transition-colors")}>
              {plan.featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold">Popular</span>}
              <button onClick={(e) => plan.id && handleDelete(plan.id, e)}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={16} />
              </button>
              <h4 className="text-xl font-bold text-slate-800 mb-2 text-center">{plan.name}</h4>
              <p className="text-2xl font-bold text-orange-600 mb-4 text-center">{plan.price}</p>
              <ul className="mb-6 space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> {plan.disk}</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> {plan.bw}</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> Free SSL</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500" /> cPanel Included</li>
              </ul>
              <button onClick={() => openEdit(plan)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-slate-800 py-2 rounded text-sm font-bold flex justify-center items-center gap-2 transition-colors">
                <Edit2 size={14} /> Edit Package
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingPlan ? 'Edit Plan' : 'Add New Plan'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Plan Name</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g. Starter Plan" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Monthly Price</label>
            <input required type="text" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g. ৳499/mo" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Disk Space</label>
            <input required type="text" value={formData.disk} onChange={e => setFormData({ ...formData, disk: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g. 10GB SSD" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Bandwidth</label>
            <input required type="text" value={formData.bw} onChange={e => setFormData({ ...formData, bw: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g. 100GB Bandwidth" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="featured" checked={formData.featured} onChange={e => setFormData({ ...formData, featured: e.target.checked })}
              className="rounded text-orange-500 focus:ring-indigo-500 cursor-pointer w-4 h-4" />
            <label htmlFor="featured" className="text-sm font-bold text-slate-700 cursor-pointer">Mark as Featured (Popular)</label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50\/80 transition-colors rounded font-medium">Cancel</button>
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md hover:bg-orange-700">Save Plan</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
