
import React, { useState, useEffect } from 'react';
import { Tag, Globe, Info, Ticket, Plus, Edit2, Trash2, CheckCircle, XCircle, Image as ImageIcon, Link as LinkIcon, MoveUp, MoveDown, Save, X } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { db, storage } from '../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { NavigationMenu } from '../../types';
import { useConfirm } from '../../context/ConfirmContext';

export const EcommerceMarketing: React.FC<{initialTab?: 'coupons'|'banners', menus?: NavigationMenu[]}> = ({initialTab = 'coupons', menus = []}) => {
  const { confirm } = useConfirm();
  const [activeSubTab, setActiveSubTab] = useState<'coupons' | 'banners'>(initialTab);
  
  useEffect(() => {
    setActiveSubTab(initialTab);
  }, [initialTab]);
  
  // Coupons State
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [couponForm, setCouponForm] = useState({ code: '', discountPercentage: 0, type: 'percentage', fixedAmount: 0, expiryDate: '', isActive: true });
  
  // Banners State
  const [banners, setBanners] = useState<any[]>([]);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState({ title: '', imageUrl: '', targetUrl: '', position: 'hero_slider', isActive: true, order: 0 });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Fetch Coupons
    const fetchCoupons = async () => {
      const snap = await getDocs(query(collection(db, 'couponCodes'), orderBy('createdAt', 'desc')));
      setCoupons(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchCoupons();

    // Subscribe Banners
    const unsubscribeBanners = onSnapshot(query(collection(db, 'store_banners'), orderBy('order', 'asc')), (snapshot) => {
      setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribeBanners();
  }, []);

  // --- Coupon Handlers ---
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...couponForm, code: couponForm.code.toUpperCase(), updatedAt: new Date().toISOString() };
      if (editingCouponId) {
        await updateDoc(doc(db, 'couponCodes', editingCouponId), data);
        toast.success('Coupon updated');
      } else {
        await addDoc(collection(db, 'couponCodes'), { ...data, createdAt: new Date().toISOString() });
        toast.success('Coupon added');
      }
      setIsCouponModalOpen(false);
      // Refresh coupons
      const snap = await getDocs(query(collection(db, 'couponCodes'), orderBy('createdAt', 'desc')));
      setCoupons(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) { toast.error('Failed to save coupon'); }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!await confirm({ title: 'Confirmation', message: 'Delete this coupon?', isDestructive: true })) return;
    try {
      await deleteDoc(doc(db, 'couponCodes', id));
      setCoupons(prev => prev.filter(c => c.id !== id));
      toast.success('Deleted');
    } catch (err) { toast.error('Failed to delete'); }
  };

  // Auto-fix broken unsplash image
  useEffect(() => {
    banners.forEach(b => {
      if (b.imageUrl === 'https://images.unsplash.com/photo-1615663245857-ac1eeb536674?q=80&w=1000&auto=format&fit=crop') {
        updateDoc(doc(db, 'store_banners', b.id), { imageUrl: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=1000&auto=format&fit=crop' }).catch(console.error);
      }
    });
  }, [banners]);

  // --- Banner Handlers ---
  const handleRestoreDefaults = async () => {
    if (!await confirm({ title: 'Confirmation', message: 'Are you sure you want to load default banners?', isDestructive: false })) return;
    
    const defaultBanners = [
      { title: 'GAMING SETUPS', imageUrl: '/banners/hero-main.jpg', targetUrl: '/category/components', position: 'hero_slider', isActive: true, order: 0 },
      { title: 'MONITORS & DISPLAYS', imageUrl: '/banners/hero-main.jpg', targetUrl: '/category/components/monitor', position: 'hero_slider', isActive: true, order: 1 },
      { title: 'ACCESSORIES', imageUrl: '/banners/side-acc.jpg', targetUrl: '/category/components', position: 'sidebar_ad_top', isActive: true, order: 0 },
      { title: 'GADGETS', imageUrl: '/banners/side-gadget.jpg', targetUrl: '/category/components', position: 'sidebar_ad_bottom', isActive: true, order: 0 },
      { title: 'Premium Gaming Laptops', imageUrl: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=1000&auto=format&fit=crop', targetUrl: '/category/laptop', position: 'promo_banner_left', isActive: true, order: 0 },
      { title: 'Gaming Accessories', imageUrl: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=1000&auto=format&fit=crop', targetUrl: '/category/accessories', position: 'promo_banner_right', isActive: true, order: 0 }
    ];
    
    const loadingToast = toast.loading('Restoring default banners...');
    try {
      for (const b of defaultBanners) {
        await addDoc(collection(db, 'store_banners'), { ...b, createdAt: new Date().toISOString() });
      }
      toast.success('Default banners restored!');
    } catch (e) {
      toast.error('Failed to restore');
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.imageUrl) return toast.error('Image is required');
    try {
      if (editingBannerId) {
        await updateDoc(doc(db, 'store_banners', editingBannerId), bannerForm);
        toast.success('Banner updated');
      } else {
        await addDoc(collection(db, 'store_banners'), { ...bannerForm, createdAt: new Date().toISOString() });
        toast.success('Banner added');
      }
      setIsBannerModalOpen(false);
    } catch (err) { toast.error('Failed to save banner'); }
  };


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
    const loadingToast = toast.loading('Uploading banner...');
    
    const CPANEL_UPLOAD_URL = typeof window !== 'undefined' ? `${window.location.origin}/upload.php` : '/upload.php';
    try {
      // Compress the image before uploading (Max 1920x1920)
      const file = await compressImage(originalFile, 1920, 1920);

      const uploadData = new FormData();

      uploadData.append('image', file);
      const res = await fetch(CPANEL_UPLOAD_URL, {
        method: 'POST',
        body: uploadData
      });
      const data = await res.json();
      if (data.success) {
        setBannerForm(prev => ({ ...prev, imageUrl: data.url }));
        toast.success('Banner uploaded!');
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Upload error: ' + error.message);
    } finally {
      setIsUploading(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!await confirm({ title: 'Confirmation', message: 'Delete this banner?', isDestructive: true })) return;
    await deleteDoc(doc(db, 'store_banners', id));
    toast.success('Banner deleted');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Marketing & Promotions</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your store's promotional banners and discount coupons.</p>
        </div>
        <div className="flex space-x-1 bg-gray-100/80 p-1 rounded-xl">
          <button onClick={() => setActiveSubTab('coupons')} className={cn("flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200", activeSubTab === 'coupons' ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50")}>
            <Ticket size={16} /> Discount Coupons
          </button>
          <button onClick={() => setActiveSubTab('banners')} className={cn("flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200", activeSubTab === 'banners' ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50")}>
            <Globe size={16} /> Homepage Banners
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px] p-6">
        
        {/* COUPONS TAB */}
        {activeSubTab === 'coupons' && (
          <div className="animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">Discount Coupons</h3>
              <button onClick={() => { setEditingCouponId(null); setCouponForm({ code: '', discountPercentage: 0, type: 'percentage', fixedAmount: 0, expiryDate: '', isActive: true }); setIsCouponModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                <Plus size={16} /> Create Coupon
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coupons.map(coupon => (
                <div key={coupon.id} className="border border-dashed border-gray-300 rounded-xl p-5 relative overflow-hidden bg-white hover:border-blue-300 hover:shadow-md transition-all group">
                  <div className="absolute top-0 right-0 p-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-white via-white to-transparent">
                    <button onClick={() => { setEditingCouponId(coupon.id); setCouponForm(coupon); setIsCouponModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={14}/></button>
                    <button onClick={() => handleDeleteCoupon(coupon.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <Ticket size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 tracking-wider uppercase">{coupon.code}</h4>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", coupon.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                        {coupon.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                  </div>
                  <div className="text-3xl font-black text-gray-800 mb-1">
                    {coupon.type === 'fixed' ? `৳${coupon.fixedAmount}` : `${coupon.discountPercentage}%`}
                  </div>
                  <p className="text-sm text-gray-500">Valid until: {new Date(coupon.expiryDate).toLocaleDateString()}</p>
                </div>
              ))}
              {coupons.length === 0 && <div className="col-span-full py-12 text-center text-gray-400">No coupons available</div>}
            </div>
          </div>
        )}

        {/* BANNERS TAB */}
        {activeSubTab === 'banners' && (
          <div className="animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">Store Banners</h3>
              <div className="flex items-center gap-3">
                
                <button onClick={() => { setEditingBannerId(null); setBannerForm({ title: '', imageUrl: '', targetUrl: '', position: 'hero_slider', isActive: true, order: banners.length }); setIsBannerModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  <Plus size={16} /> Upload Banner
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {banners.map(banner => (
                <div key={banner.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all group bg-white">
                  <div className="relative h-48 bg-gray-100">
                    <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button onClick={() => { setEditingBannerId(banner.id); setBannerForm(banner); setIsBannerModalOpen(true); }} className="bg-white text-blue-600 p-2 rounded-lg shadow hover:scale-110 transition-transform"><Edit2 size={18}/></button>
                      <button onClick={() => handleDeleteBanner(banner.id)} className="bg-white text-red-600 p-2 rounded-lg shadow hover:scale-110 transition-transform"><Trash2 size={18}/></button>
                    </div>
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded shadow-sm text-gray-700 uppercase tracking-wider">
                      {banner.position.replace('_', ' ')}
                    </span>
                    {!banner.isActive && (
                      <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">INACTIVE</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-gray-900 mb-1 truncate">{banner.title || 'Untitled Banner'}</h4>
                    <a href={banner.targetUrl} target="_blank" className="text-sm text-blue-500 hover:underline flex items-center gap-1 truncate"><LinkIcon size={14}/> {banner.targetUrl || 'No link'}</a>
                  </div>
                </div>
              ))}
              {banners.length === 0 && <div className="col-span-full py-12 text-center text-gray-400">No banners available</div>}
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h3 className="font-bold text-gray-900">{editingCouponId ? 'Edit Coupon' : 'Create Coupon'}</h3>
              <button onClick={() => setIsCouponModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-lg"><X size={18}/></button>
            </div>
            <form onSubmit={handleSaveCoupon} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
                <input required type="text" value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})} className="w-full px-4 py-2 border border-gray-200 rounded-lg uppercase" placeholder="e.g. SUMMER50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select value={couponForm.type} onChange={e => setCouponForm({...couponForm, type: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input required type="number" min="0" max={couponForm.type === 'percentage' ? 100 : 999999} value={couponForm.type === 'percentage' ? couponForm.discountPercentage : couponForm.fixedAmount} onChange={e => setCouponForm(couponForm.type === 'percentage' ? {...couponForm, discountPercentage: Number(e.target.value)} : {...couponForm, fixedAmount: Number(e.target.value)})} className="w-full px-4 py-2 border border-gray-200 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input required type="date" value={couponForm.expiryDate} onChange={e => setCouponForm({...couponForm, expiryDate: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg" />
              </div>
              <label className="flex items-center gap-2 mt-4 cursor-pointer">
                <input type="checkbox" checked={couponForm.isActive} onChange={e => setCouponForm({...couponForm, isActive: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-medium text-gray-700">Coupon is Active</span>
              </label>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium mt-4">Save Coupon</button>
            </form>
          </div>
        </div>
      )}

      {isBannerModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <h3 className="font-bold text-gray-900 text-lg">{editingBannerId ? 'Edit Banner' : 'Upload Banner'}</h3>
                <button type="button" onClick={() => setIsBannerModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><X size={20}/></button>
              </div>
              <form onSubmit={handleSaveBanner} className="flex-1 overflow-y-auto">
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Left Column: Image Upload & Link */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Banner Image</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-2 text-center hover:bg-gray-50 transition-colors relative group h-48 flex flex-col items-center justify-center bg-gray-50/50">
                        {bannerForm.imageUrl ? (
                          <div className="relative w-full h-full">
                            <img src={bannerForm.imageUrl} alt="Preview" className="w-full h-full object-contain rounded-lg bg-gray-100" />
                            <button type="button" onClick={() => setBannerForm({...bannerForm, imageUrl: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors"><X size={14}/></button>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                            <ImageIcon size={36} className="text-blue-500 mb-3 opacity-80" />
                            <span className="text-sm font-bold text-blue-600 mb-1">Click to upload image</span>
                            <span className="text-xs text-gray-500">Supports JPG, PNG, WEBP</span>
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                          </label>
                        )}
                        {isUploading && <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-xl font-bold text-blue-600 backdrop-blur-sm z-10">Uploading...</div>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 py-2">
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">OR</span>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Paste Image URL directly</label>
                      <input type="url" value={bannerForm.imageUrl} onChange={e => setBannerForm({...bannerForm, imageUrl: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="https://example.com/image.jpg" />
                      <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1"><Info size={12} /> Useful if you already have the image link.</p>
                    </div>
                  </div>

                  {/* Right Column: Details */}
                  <div className="space-y-5 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Banner Title</label>
                      <input required type="text" value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Premium Gaming Setups" />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="block text-sm font-bold text-gray-700">Target URL / Click Link</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select 
                          className="px-3 py-2.5 border border-gray-200 rounded-lg bg-white font-medium text-sm sm:w-1/3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={bannerForm.targetUrl.startsWith('/category/') ? 'category' : 'custom'}
                          onChange={(e) => {
                            if(e.target.value === 'category') {
                              setBannerForm({...bannerForm, targetUrl: menus[0] ? `/category/${menus[0].slug}` : ''});
                            } else {
                              setBannerForm({...bannerForm, targetUrl: ''});
                            }
                          }}
                        >
                          <option value="custom">Custom URL</option>
                          <option value="category">Category Page</option>
                        </select>
                        
                        {bannerForm.targetUrl.startsWith('/category/') ? (
                          <select 
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={bannerForm.targetUrl.replace('/category/', '')}
                            onChange={(e) => setBannerForm({...bannerForm, targetUrl: `/category/${e.target.value}`})}
                          >
                            {menus.map(m => (
                              <option key={m.id} value={m.slug}>{m.title}</option>
                            ))}
                          </select>
                        ) : (
                          <input type="text" value={bannerForm.targetUrl} onChange={e => setBannerForm({...bannerForm, targetUrl: e.target.value})} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. /shop/sale or https://..." />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Position</label>
                        <select value={bannerForm.position} onChange={e => setBannerForm({...bannerForm, position: e.target.value as any})} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                          <option value="hero_slider">Hero Slider</option>
                          <option value="promo_banner_left">Promo Banner (Left - Large)</option>
                          <option value="promo_banner_right">Promo Banner (Right - Small)</option>
                          <option value="sidebar_ad_top">Sidebar Ad (Top)</option>
                          <option value="sidebar_ad_bottom">Sidebar Ad (Bottom)</option>
                          <option value="pc_builder">PC Builder Banner</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Display Order</label>
                        <input type="number" min="0" value={bannerForm.order} onChange={e => setBannerForm({...bannerForm, order: Number(e.target.value)})} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                    </div>

                    <div className="pt-2 pb-2">
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                        <input type="checkbox" checked={bannerForm.isActive} onChange={e => setBannerForm({...bannerForm, isActive: e.target.checked})} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" />
                        <span className="text-sm font-bold text-gray-900">Banner is Active & Visible</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3 shrink-0">
                  <button type="button" onClick={() => setIsBannerModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
                  <button type="submit" disabled={!bannerForm.imageUrl || isUploading} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-600/20">
                    Save Banner
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

    </div>
  );
};
