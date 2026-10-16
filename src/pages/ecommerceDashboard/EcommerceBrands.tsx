import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { db, storage } from '../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

export const EcommerceBrands: React.FC = () => {
  const [brands, setBrands] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', logo: '', isActive: true, order: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const { confirm } = useConfirm();

  useEffect(() => {
    const q = query(collection(db, 'store_brands'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBrands(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleRestoreDefaults = async () => {
    if (!await confirm({ title: 'Confirmation', message: 'Are you sure you want to load default brands?', isDestructive: false })) return;
    
    const defaultBrands = [
      { name: 'Intel', logo: '/images/brands/intel.svg', isActive: true, order: 0 },
      { name: 'AMD', logo: '/images/brands/amd.svg', isActive: true, order: 1 },
      { name: 'Asus', logo: '/images/brands/asus.svg', isActive: true, order: 2 },
      { name: 'MSI', logo: '/images/brands/msi.svg', isActive: true, order: 3 },
      { name: 'Gigabyte', logo: '/images/brands/gigabyte.svg', isActive: true, order: 4 },
      { name: 'KingSpec', logo: '/images/brands/kingspec.svg', isActive: true, order: 5 },
      { name: 'Value-Top', logo: '/images/brands/valuetop.svg', isActive: true, order: 6 },
      { name: 'Logitech', logo: '/images/brands/logitech.svg', isActive: true, order: 7 }
    ];
    
    const loadingToast = toast.loading('Restoring default brands...');
    try {
      for (const b of defaultBrands) {
        await addDoc(collection(db, 'store_brands'), { ...b, createdAt: new Date().toISOString() });
      }
      toast.success('Default brands restored!');
    } catch (e) {
      toast.error('Failed to restore');
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const loadingToast = toast.loading('Uploading logo...');

    try {
      const storageRef = ref(storage, `brands/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        null,
        () => { toast.error('Upload failed'); setIsUploading(false); toast.dismiss(loadingToast); },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData(prev => ({ ...prev, logo: url }));
          setIsUploading(false);
          toast.success('Logo uploaded!');
          toast.dismiss(loadingToast);
        }
      );
    } catch (err) {
      toast.error('Upload failed');
      setIsUploading(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.logo) return toast.error('Logo is required');
    
    const loadingToast = toast.loading('Saving brand...');
    try {
      if (editingId) {
        await updateDoc(doc(db, 'store_brands', editingId), formData);
        toast.success('Brand updated!');
      } else {
        await addDoc(collection(db, 'store_brands'), { ...formData, createdAt: new Date().toISOString() });
        toast.success('Brand added!');
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error('Failed to save brand');
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ title: 'Confirmation', message: 'Delete this brand?', isDestructive: true })) return;
    try {
      await deleteDoc(doc(db, 'store_brands', id));
      toast.success('Brand deleted');
    } catch (err) { toast.error('Failed to delete'); }
  };

  const fallbackSvg = (text: string) => `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 50'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-weight='bold' font-size='24' fill='%23333'%3E${text}%3C/text%3E%3C/svg%3E`;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-800">Store Brands</h3>
        <div className="flex items-center gap-3">
          <button onClick={handleRestoreDefaults} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            Load Defaults
          </button>
          <button onClick={() => { setEditingId(null); setFormData({ name: '', logo: '', isActive: true, order: brands.length }); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Plus size={16} /> Add Brand
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {brands.map(brand => (
          <div key={brand.id} className="border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-between hover:shadow-lg transition-all group bg-white relative">
            <div className="h-16 w-full flex items-center justify-center mb-4">
              <img src={brand.logo} alt={brand.name} onError={(e) => { e.currentTarget.src = fallbackSvg(brand.name); }} className="max-h-full max-w-full object-contain grayscale group-hover:grayscale-0 transition-all" />
            </div>
            <span className="text-sm font-medium text-gray-700">{brand.name}</span>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingId(brand.id); setFormData(brand); setIsModalOpen(true); }} className="bg-white text-blue-600 p-1.5 rounded shadow hover:scale-110 transition-transform"><Edit2 size={14}/></button>
              <button onClick={() => handleDelete(brand.id)} className="bg-white text-red-600 p-1.5 rounded shadow hover:scale-110 transition-transform"><Trash2 size={14}/></button>
            </div>
            {!brand.isActive && <div className="absolute top-2 left-2 bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Hidden</div>}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-800">{editingId ? 'Edit Brand' : 'Add Brand'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors relative group">
                {formData.logo ? (
                  <div className="relative flex justify-center">
                    <img src={formData.logo} alt="Preview" onError={(e) => { e.currentTarget.src = fallbackSvg(formData.name || 'Logo'); }} className="h-20 object-contain rounded" />
                    <button type="button" onClick={() => setFormData({...formData, logo: ''})} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center py-2">
                    <ImageIcon className="text-gray-400 mb-2" size={32} />
                    <span className="text-sm font-medium text-blue-600">Click to upload logo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isUploading} />
                  </label>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg" placeholder="e.g. Asus" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input type="number" min="0" value={formData.order} onChange={e => setFormData({...formData, order: Number(e.target.value)})} className="w-full px-4 py-2 border border-gray-200 rounded-lg" />
              </div>
              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-medium text-gray-700">Brand is Active (Show in Store)</span>
              </label>
              <button type="submit" disabled={isUploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors mt-6">
                {editingId ? 'Update Brand' : 'Save Brand'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
