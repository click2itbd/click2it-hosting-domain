import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Brand } from '../../../../types';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export default function BrandsTab() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', logoUrl: '' });

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'brands'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Brand[];
      setBrands(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Brand name is required');
    try {
      if (editingId) {
        await updateDoc(doc(db, 'brands', editingId), formData);
        toast.success('Brand updated');
      } else {
        await addDoc(collection(db, 'brands'), formData);
        toast.success('Brand added');
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({ name: '', logoUrl: '' });
      fetchBrands();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save brand');
    }
  };

  const handleEdit = (brand: Brand) => {
    setFormData({ name: brand.name, logoUrl: brand.logoUrl || '' });
    setEditingId(brand.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brand?')) return;
    try {
      await deleteDoc(doc(db, 'brands', id));
      toast.success('Brand deleted');
      fetchBrands();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete brand');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Brands Management</h2>
        <button
          onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', logoUrl: '' }); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={18} /> Add Brand
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Brand Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-blue-500"
              placeholder="e.g. ASUS, MSI, Corsair"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Logo URL (Optional)</label>
            <input
              type="url"
              value={formData.logoUrl}
              onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
              className="w-full border border-gray-200 rounded-lg p-2 outline-none focus:border-blue-500"
              placeholder="https://..."
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
              <Save size={18} /> Save
            </button>
            <button type="button" onClick={() => setIsAdding(false)} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200">
              <X size={18} /> Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading brands...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                <th className="p-4 font-bold">Logo</th>
                <th className="p-4 font-bold">Brand Name</th>
                <th className="p-4 font-bold w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map(brand => (
                <tr key={brand.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt={brand.name} className="h-8 object-contain" />
                    ) : (
                      <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-400">
                        {brand.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-bold text-gray-800">{brand.name}</td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => handleEdit(brand)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(brand.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {brands.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400 font-medium">
                    No brands found. Add your first brand!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
