import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { toast } from 'react-hot-toast';
import { Settings, Save, Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';

const DEFAULT_CATEGORIES = [
  { id: 'cpu', name: 'Processor (CPU)', iconName: 'Cpu', type: 'core', required: true, order: 0 },
  { id: 'cpu-cooler', name: 'CPU Cooler', iconName: 'Fan', type: 'core', required: false, order: 1 },
  { id: 'motherboard', name: 'Motherboard', iconName: 'CircuitBoard', type: 'core', required: true, order: 2 },
  { id: 'ram', name: 'Memory (RAM)', iconName: 'Microchip', type: 'core', required: true, order: 3 },
  { id: 'storage', name: 'Storage (SSD/HDD)', iconName: 'HardDrive', type: 'core', required: true, order: 4 },
  { id: 'graphics-card', name: 'Graphics Card', iconName: 'Monitor', type: 'core', required: false, order: 5 },
  { id: 'power-supply', name: 'Power Supply', iconName: 'Battery', type: 'core', required: true, order: 6 },
  { id: 'casing', name: 'Casing', iconName: 'CaseLower', type: 'core', required: true, order: 7 },
  { id: 'monitor', name: 'Monitor', iconName: 'Monitor', type: 'peripheral', required: false, order: 8 },
  { id: 'keyboard', name: 'Keyboard', iconName: 'Keyboard', type: 'peripheral', required: false, order: 9 },
  { id: 'mouse', name: 'Mouse', iconName: 'Mouse', type: 'peripheral', required: false, order: 10 },
];

export const PCBuilderCategoriesManager = () => {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const snap = await getDocs(collection(db, 'pc_builder_categories'));
      if (!snap.empty) {
        const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        fetched.sort((a, b) => a.order - b.order);
        setCategories(fetched);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load PC Builder categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save all categories sequentially or batch
      for (let i = 0; i < categories.length; i++) {
        await setDoc(doc(db, 'pc_builder_categories', categories[i].id), { ...categories[i], order: i });
      }
      toast.success('Categories saved successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save categories');
    } finally {
      setSaving(false);
    }
  };

  const updateCat = (id: string, field: string, value: any) => {
    setCategories(categories.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addCategory = () => {
    const newId = `cat-${Date.now()}`;
    setCategories([...categories, { id: newId, name: 'New Component', iconName: 'Settings', type: 'peripheral', required: false, order: categories.length }]);
  };

  const removeCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">PC Builder Categories</h2>
          <p className="text-sm text-gray-500">Manage components layout for the Custom PC Builder.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={addCategory} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            <Plus size={16} /> Add Category
          </button>
          <button onClick={handleSave} disabled={saving || loading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Layout
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 size={32} className="animate-spin text-gray-400" /></div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-lg text-sm font-bold text-gray-600">
            <div className="col-span-1"></div>
            <div className="col-span-3">Slug / ID</div>
            <div className="col-span-4">Display Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-1 text-center">Required</div>
            <div className="col-span-1"></div>
          </div>
          
          {categories.map((cat, i) => (
            <div key={cat.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3 border border-gray-100 rounded-lg bg-white shadow-sm">
              <div className="col-span-1 text-gray-400 cursor-grab"><GripVertical size={18} /></div>
              <div className="col-span-3"><input type="text" value={cat.id} onChange={e => updateCat(cat.id, 'id', e.target.value)} className="w-full text-sm border-gray-200 rounded p-1" /></div>
              <div className="col-span-4"><input type="text" value={cat.name} onChange={e => updateCat(cat.id, 'name', e.target.value)} className="w-full text-sm border-gray-200 rounded p-1 font-medium" /></div>
              <div className="col-span-2">
                <select value={cat.type} onChange={e => updateCat(cat.id, 'type', e.target.value)} className="w-full text-sm border-gray-200 rounded p-1">
                  <option value="core">Core</option>
                  <option value="peripheral">Peripheral</option>
                </select>
              </div>
              <div className="col-span-1 text-center">
                <input type="checkbox" checked={cat.required} onChange={e => updateCat(cat.id, 'required', e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              </div>
              <div className="col-span-1 text-right">
                <button onClick={() => removeCategory(cat.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
