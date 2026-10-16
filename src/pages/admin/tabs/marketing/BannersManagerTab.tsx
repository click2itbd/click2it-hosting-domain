import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../../firebase';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Image as ImageIcon, CheckCircle, XCircle, Link as LinkIcon, MoveUp, MoveDown } from 'lucide-react';

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  position: 'hero_slider' | 'deal_of_the_day' | 'sidebar_ad' | 'footer_banner';
  isActive: boolean;
  order: number;
}

export const BannersManagerTab = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState<Omit<Banner, 'id'>>({
    title: '',
    imageUrl: '',
    targetUrl: '',
    position: 'hero_slider',
    isActive: true,
    order: 0,
  });

  useEffect(() => {
    const q = query(collection(db, 'store_banners'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
      setBanners(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching banners:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  const compressImage = (file: File, maxWidth: number, maxHeight: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
  
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }
  
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name.replace(/.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(newFile);
            } else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.85); // 85% quality JPEG
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile) return;

    setIsUploading(true);
    const CPANEL_UPLOAD_URL = typeof window !== 'undefined' ? `${window.location.origin}/upload.php` : '/upload.php';

    try {
      // Compress the image before uploading
      const file = await compressImage(originalFile, 1920, 1920);

      if (CPANEL_UPLOAD_URL) {
        const uploadData = new FormData();

        uploadData.append('image', file);
        const res = await fetch(CPANEL_UPLOAD_URL, {
          method: 'POST',
          body: uploadData
        });
        const data = await res.json();
        if (data.success) {
          setFormData(prev => ({ ...prev, imageUrl: data.url }));
          toast.success('Image uploaded successfully');
        } else {
          throw new Error(data.message || 'cPanel upload failed');
        }
      } else {
        const storageRef = ref(storage, `banners/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        setFormData(prev => ({ ...prev, imageUrl: url }));
        toast.success('Image uploaded successfully');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      toast.error('Please upload an image for the banner');
      return;
    }
    if (!formData.title) {
      toast.error('Please enter a title');
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'store_banners', editingId), formData);
        toast.success('Banner updated successfully');
      } else {
        await addDoc(collection(db, 'store_banners'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
        toast.success('Banner added successfully');
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({ title: '', imageUrl: '', targetUrl: '', position: 'hero_slider', isActive: true, order: 0 });
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error('Failed to save banner');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      await deleteDoc(doc(db, 'store_banners', id));
      toast.success('Banner deleted');
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error('Failed to delete banner');
    }
  };

  const handleEdit = (banner: Banner) => {
    setFormData({
      title: banner.title,
      imageUrl: banner.imageUrl,
      targetUrl: banner.targetUrl,
      position: banner.position,
      isActive: banner.isActive,
      order: banner.order || 0,
    });
    setEditingId(banner.id);
    setIsAdding(true);
  };

  const toggleStatus = async (banner: Banner) => {
    try {
      await updateDoc(doc(db, 'store_banners', banner.id), { isActive: !banner.isActive });
      toast.success(`Banner ${!banner.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ImageIcon className="text-blue-500" /> Storefront Banners & CMS
          </h3>
          <p className="text-sm text-gray-500 mt-1">Manage homepage sliders, deals, and promotional banners.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ title: '', imageUrl: '', targetUrl: '', position: 'hero_slider', isActive: true, order: banners.length });
            setEditingId(null);
            setIsAdding(!isAdding);
          }} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2"
        >
          {isAdding ? <XCircle size={16} /> : <Plus size={16} />}
          {isAdding ? 'Cancel' : 'Add Banner'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banner Title (Internal)</label>
              <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="e.g. Winter Sale 2026" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Link (URL)</label>
              <input type="text" value={formData.targetUrl} onChange={e => setFormData({...formData, targetUrl: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="e.g. /category/laptop or https://..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Position</label>
              <select value={formData.position} onChange={e => setFormData({...formData, position: e.target.value as any})} className="w-full px-3 py-2 border rounded-md">
                <option value="hero_slider">Main Hero Slider (Top)</option>
                <option value="deal_of_the_day">Deal of the Day (Middle)</option>
                <option value="sidebar_ad">Sidebar Ad</option>
                <option value="footer_banner">Footer Banner</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input type="number" value={formData.order} onChange={e => setFormData({...formData, order: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-md" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Banner Image</label>
              <div className="flex items-center gap-4">
                {formData.imageUrl && (
                  <div className="w-32 h-20 rounded border overflow-hidden bg-white">
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="flex-1">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="banner-image-upload" disabled={isUploading} />
                  <label htmlFor="banner-image-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <ImageIcon size={16} />
                    {isUploading ? 'Uploading...' : 'Choose Image'}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.position === 'hero_slider' && '📐 Recommended size: 1200×400 px (3:1 ratio)'}
                    {formData.position === 'sidebar_ad' && '📐 Recommended size: 380×185 px (2:1 ratio)'}
                    {formData.position === 'deal_of_the_day' && '📐 Recommended size: 1200×300 px (4:1 ratio)'}
                    {formData.position === 'footer_banner' && '📐 Recommended size: 1200×200 px (6:1 ratio)'}
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex items-center gap-2 mt-2">
              <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active (Visible on frontend)</label>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="submit" disabled={isUploading} className="bg-green-600 text-white px-6 py-2 rounded-md font-bold hover:bg-green-700 disabled:opacity-50">
              {editingId ? 'Update Banner' : 'Save Banner'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8">Loading banners...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {banners.map((banner) => (
                <tr key={banner.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="w-24 h-12 bg-gray-100 rounded overflow-hidden">
                      <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-gray-800">{banner.title}</div>
                    {banner.targetUrl && (
                      <a href={banner.targetUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                        <LinkIcon size={10} /> {banner.targetUrl}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold uppercase tracking-wider">
                      {banner.position.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => toggleStatus(banner)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${banner.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {banner.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(banner)} className="text-blue-600 hover:text-blue-800 p-2"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(banner.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {banners.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">No banners found. Add a banner to display on the storefront.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
