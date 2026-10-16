import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { MyServicesTab } from '../components/MyServicesTab';
import { CustomerTicketsTab } from '../components/CustomerTicketsTab';
import { SavedBuildsTab } from '../components/SavedBuildsTab';
import { useAuth } from '../context/AuthContext';
import { db, storage, auth } from '../firebase';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, addDoc, updateDoc, setDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../lib/imageCompressor';
import { toast } from 'react-hot-toast';
import { User, Mail, Globe, Phone, MapPin, Building, Save, Camera, Loader2, ShoppingBag, Heart, Package, Clock, CheckCircle2, XCircle, ChevronRight, Tag, MessageSquare, Image as ImageIcon, CalendarPlus, Lock, Shield, RotateCcw, Truck, Box, Check, Star, Plus, Bell, Wallet } from 'lucide-react';
import { PriceAlertsTab } from '../components/PriceAlertsTab';
import { CustomerWalletTab } from '../components/CustomerWalletTab';
import { SEO } from '../components/SEO';
import { formatCurrency } from '../lib/utils';
import { generatePDF } from '../lib/pdf';
import { useSettings } from '../context/SettingsContext';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { getSiteContext } from '../hooks/useSiteContext';
import { useWishlist } from '../context/WishlistContext';
import { ProductCard } from '../components/ProductCard';

interface UserProfileData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  company: string;
  photoURL: string;
  addresses?: any[];
}

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { wishlist } = useWishlist();
  const { settings } = useSettings();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [preBooks, setPreBooks] = useState<any[]>([]);
  const [preBooksLoading, setPreBooksLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [returnModalOrderId, setReturnModalOrderId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const siteContext = getSiteContext();
  const isHosting = siteContext === 'hosting';

  const [formData, setFormData] = useState<UserProfileData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    company: '',
    photoURL: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);

  // Sync tab from URL search params if changed
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            name: data.name || user.displayName || '',
            email: data.email || user.email || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            company: data.company || '',
            photoURL: data.photoURL || user.photoURL || ''
          });
        } else {
          setFormData(prev => ({
            ...prev,
            name: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (activeTab !== 'offers' || !user) return;
    const fetchOffers = async () => {
      setOffersLoading(true);
      try {
        const q = query(
          collection(db, 'domain_offers'),
          where('email', '==', user.email)
        );
        const snap = await getDocs(q);
        let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a: any, b: any) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
        setOffers(data);
      } catch (err) {
        console.error('Error fetching offers:', err);
      } finally {
        setOffersLoading(false);
      }
    };
    fetchOffers();
  }, [activeTab, user]);

  
  useEffect(() => {
    if (!user) return;
    const fetchPreBooks = async () => {
      setPreBooksLoading(true);
      try {
        const q = query(collection(db, 'pre_bookings'), where('email', '==', user.email));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setPreBooks(data);
      } catch (err) {
        console.error('Error fetching prebooks:', err);
      } finally {
        setPreBooksLoading(false);
      }
    };
    fetchPreBooks();
  }, [user]);

  // Fetch all orders for the user unconditionally to show stats
  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      setOrdersLoading(true);
      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid)
        );
        const snap = await getDocs(q);
        let fetchedOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Client-side sort to avoid requiring a composite index in Firestore
        fetchedOrders.sort((a: any, b: any) => {
          const getOrderDate = (val: any) => {
            if (!val) return 0;
            if (val.toDate) return val.toDate().getTime();
            if (val.seconds) return val.seconds * 1000;
            return new Date(val).getTime();
          };
          return getOrderDate(b.createdAt) - getOrderDate(a.createdAt);
        });
        
        setOrders(fetchedOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [activeTab, user]);

  const handlePayOffer = (offer: any) => {
    const product = {
      id: `domain_${offer.domain}`,
      name: `Domain Registration - ${offer.domain}`,
      description: '1 Year Registration (Accepted Offer)',
      price: offer.amount,
      category: 'Hosting & Domains',
      stock: 9999,
      images: [],
      createdAt: new Date().toISOString(),
      itemType: 'domain' as const,
      domainTld: offer.domain.split('.').pop() || '',
      termYears: 1,
    };
    addToCart(product as any);
    navigate('/hosting/checkout');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    // DEV MODE: Simulate save
    if (import.meta.env.DEV) {
      await new Promise(r => setTimeout(r, 800));
      toast.success('[DEV] Profile updated! (Simulated)');
      setSaving(false);
      return;
    }

    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        company: formData.company,
        photoURL: formData.photoURL,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image size should be less than 3MB');
      return;
    }

    setUploadingImage(true);
    setImgLoadError(false);

    try {
      let finalUrl = '';
      
      // Try Firebase Storage first
      try {
        const storageRef = ref(storage, `profiles/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        finalUrl = await getDownloadURL(storageRef);
      } catch (storageErr) {
        console.warn('Storage upload fallback to base64:', storageErr);
        // Fallback to high quality base64 data URL
        finalUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      setFormData(prev => ({ ...prev, photoURL: finalUrl }));
      
      // Save to Firestore
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { photoURL: finalUrl, updatedAt: new Date().toISOString() }, { merge: true });

      // Also update Firebase Auth profile if current user is active
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, { photoURL: finalUrl.startsWith('data:') ? undefined : finalUrl });
        } catch {
          // ignore auth profile photo length limit
        }
      }

      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to update profile picture. Please try another image.');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <Layout>
      <SEO title="My Profile" />

      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row gap-8">
          
          {/* Left Sidebar */}
          <div className="w-full lg:w-1/4 flex-shrink-0">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                {/* Avatar */}
                <div className="flex flex-col items-center mb-6">
                   <div className="relative group mb-4">
                     <div className={`w-24 h-24 rounded-full border-4 overflow-hidden flex items-center justify-center ${isHosting ? 'border-blue-100 bg-blue-50' : 'border-orange-100 bg-orange-50'}`}>
                       {formData.photoURL && !imgLoadError ? (
                         <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setImgLoadError(true)} />
                       ) : (
                         <User size={40} className={isHosting ? "text-blue-300" : "text-orange-300"} />
                       )}
                     </div>
                     <label className={`absolute bottom-0 right-0 text-white p-2 rounded-full cursor-pointer transition-all hover:scale-110 active:scale-95 shadow-md ${isHosting ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                       {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                       <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                     </label>
                   </div>
                   <h2 className="text-xl font-bold text-gray-900 text-center">{formData.name || 'Your Profile'}</h2>
                   <p className="text-sm text-gray-500 text-center">{formData.email}</p>
                </div>
                
                <div className="w-full h-px bg-gray-100 my-4" />
                
                {/* Nav Links */}
                <div className="space-y-1">
                   {(() => {
                     const ctx = getSiteContext();
                     const isHostingContext = ctx === 'hosting';
                     
                     const baseTabs = [
    { id: 'saved-builds', label: 'Saved PC Builds', icon: Save },
                       { id: 'profile', label: 'My Profile', icon: User },
                       { id: 'orders', label: 'My Orders', icon: ShoppingBag },
                     ];
                     if (!isHostingContext) {
                        baseTabs.push({ id: 'pre-orders', label: 'My Pre-Orders', icon: CalendarPlus });
    // 'saved-builds' is in baseTabs already
                        baseTabs.push({ id: 'wishlist', label: 'My Wishlist', icon: Heart });
                        baseTabs.push({ id: 'price-alerts', label: 'Price Alerts', icon: Bell });
                     }
                     const hostingTabs = [
                       { id: 'wallet', label: 'My Wallet', icon: Wallet },
                       { id: 'my_domains', label: 'My Services', icon: Globe },
                       { id: 'tickets', label: 'Support Tickets', icon: MessageSquare },
                       { id: 'offers', label: 'My Offers', icon: Tag },
                     ];
                     const tabs = isHostingContext ? [
                       { id: 'profile', label: 'My Profile', icon: User },
                       { id: 'wallet', label: 'My Wallet', icon: Wallet },
                       { id: 'orders', label: 'My Orders', icon: ShoppingBag },
                       ...hostingTabs.filter(t => t.id !== 'wallet')
                     ] : [
                       ...baseTabs,
                       { id: 'wallet', label: 'My Wallet', icon: Wallet }
                     ];

                     return tabs.map(({ id, label, icon: Icon }) => (
                       <button
                         key={id}
                         onClick={() => setActiveTab(id)}
                         className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                           activeTab === id
                             ? (isHostingContext ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-600')
                             : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                         }`}
                       >
                         <Icon size={18} className={activeTab === id ? (isHostingContext ? 'text-blue-600' : 'text-orange-500') : 'text-gray-400'} /> 
                         {label}
                       </button>
                     ));
                   })()}
                </div>
             </div>
          </div>

          {/* Right Content */}
          <div className="w-full lg:w-3/4 flex-1">
             
             {/* DASHBOARD TAB */}
             {activeTab === 'dashboard' && !isHosting && (
                <div className="space-y-6">
                   <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div>
                         <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, {formData.name.split(' ')[0] || 'User'}!</h2>
                         <p className="text-gray-500">From your account dashboard you can view your recent orders, manage your shipping and billing addresses, and edit your password and account details.</p>
                      </div>
                      <div className="flex-shrink-0 flex gap-4">
                         <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-center min-w-[120px]">
                            <div className="text-3xl font-black text-orange-500 mb-1">{orders.length}</div>
                            <div className="text-xs font-bold text-orange-800 uppercase tracking-wider">Total Orders</div>
                         </div>
                         <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center min-w-[120px]">
                            <div className="text-3xl font-black text-blue-600 mb-1">{formatCurrency(orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + (o.total || 0), 0))}</div>
                            <div className="text-xs font-bold text-blue-800 uppercase tracking-wider">Total Spent</div>
                         </div>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                         <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                           Recent Orders
                           <button onClick={() => setActiveTab('orders')} className="text-sm text-orange-500 hover:underline">View All</button>
                         </h3>
                         {orders.length > 0 ? (
                           <div className="space-y-4">
                              {orders.slice(0, 3).map(order => (
                                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                   <div>
                                     <div className="font-bold text-sm text-gray-900">#{order.documentNumber || order.id.slice(-8).toUpperCase()}</div>
                                     <div className="text-xs text-gray-500">{new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : order.createdAt).toLocaleDateString()}</div>
                                   </div>
                                   <div className="text-right">
                                     <div className="font-bold text-sm text-orange-500">{formatCurrency(order.total)}</div>
                                     <div className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">{order.status || 'Pending'}</div>
                                   </div>
                                </div>
                              ))}
                           </div>
                         ) : (
                           <div className="text-center py-8 text-gray-500 text-sm">No orders yet.</div>
                         )}
                      </div>

                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                         <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                           Account Information
                           <button onClick={() => setActiveTab('profile')} className="text-sm text-orange-500 hover:underline">Edit</button>
                         </h3>
                         <div className="space-y-3 text-sm">
                            <div className="flex gap-2">
                              <User size={16} className="text-gray-400 shrink-0 mt-0.5" />
                              <span className="text-gray-700 font-medium">{formData.name || 'Not set'}</span>
                            </div>
                            <div className="flex gap-2">
                              <Mail size={16} className="text-gray-400 shrink-0 mt-0.5" />
                              <span className="text-gray-700">{formData.email}</span>
                            </div>
                            <div className="flex gap-2">
                              <Phone size={16} className="text-gray-400 shrink-0 mt-0.5" />
                              <span className="text-gray-700">{formData.phone || 'Not set'}</span>
                            </div>
                            <div className="flex gap-2">
                              <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                              <span className="text-gray-700">{formData.addresses && formData.addresses.length > 0 ? `${formData.addresses[0].address}, ${formData.addresses[0].city}` : 'Address not set'}</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             )}

             {/* PROFILE TAB */}
             {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* 1. Personal Information */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-6 md:p-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <User size={24} className={isHosting ? "text-blue-600" : "text-orange-500"} /> Personal Information
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">Full Name</label>
                          <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50" placeholder="Your Full Name" />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">Email Address (Read-only)</label>
                          <input type="email" value={formData.email} disabled className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed" />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700">Phone Number</label>
                          <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50" placeholder="e.g. +8801700000000" />
                        </div>

                        {isHosting && (
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Company (Optional)</label>
                            <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50" placeholder="Company Name" />
                          </div>
                        )}
                      </div>

                      <div className="mt-8 pt-6 border-t border-gray-100">
                        <button type="submit" disabled={saving} className={isHosting ? "bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 w-full md:w-auto shadow-lg shadow-blue-500/30" : "bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 w-full md:w-auto shadow-lg shadow-orange-500/30"}>
                          {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* 2. Address Book */}
                  {!isHosting && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          <MapPin size={24} className="text-orange-500" /> Address Book
                        </h2>
                        <button onClick={() => setShowAddressModal(true)} className="flex items-center gap-1 text-sm font-bold text-orange-500 hover:text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
                          <Plus size={16} /> Add New
                        </button>
                      </div>
                      
                      {formData.addresses && formData.addresses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {formData.addresses.map((addr, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-xl p-4 relative hover:border-orange-500 transition-colors">
                              {addr.isDefault && (
                                <span className="absolute top-4 right-4 bg-orange-100 text-orange-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded">Default</span>
                              )}
                              <div className="flex items-center gap-2 mb-2">
                                 <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-1 rounded-md">{addr.type}</span>
                                 <span className="font-bold text-gray-900">{addr.name}</span>
                              </div>
                              <p className="text-sm text-gray-500 mb-1">{addr.phone}</p>
                              <p className="text-sm text-gray-700 leading-relaxed">{addr.address}, {addr.city}</p>
                              <div className="mt-4 flex gap-3 text-sm">
                                 <button onClick={() => {
                                   const newAddrs = [...formData.addresses];
                                   newAddrs.splice(idx, 1);
                                   setFormData({...formData, addresses: newAddrs});
                                 }} className="text-red-500 font-semibold hover:underline">Delete</button>
                                 {!addr.isDefault && (
                                   <button onClick={() => {
                                     const newAddrs = formData.addresses.map((a, i) => ({...a, isDefault: i === idx}));
                                     setFormData({...formData, addresses: newAddrs});
                                   }} className="text-orange-500 font-semibold hover:underline">Set as Default</button>
                                 )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                           <p className="text-gray-500">No saved addresses.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Account Security */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 md:p-8">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Shield size={24} className={isHosting ? "text-blue-600" : "text-orange-500"} /> Account Security
                      </h2>
                      
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                         <div>
                           <h4 className="font-bold text-gray-900 flex items-center gap-2"><Lock size={18} className="text-gray-400" /> Password</h4>
                           <p className="text-sm text-gray-500 mt-1">We recommend updating your password regularly to keep your account secure.</p>
                         </div>
                         <button 
                           onClick={async () => {
                             try {
                               await sendPasswordResetEmail(auth, user.email);
                               toast.success('Password reset link sent to your email!');
                             } catch (e) {
                               toast.error('Failed to send reset email');
                             }
                           }}
                           className={`px-6 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${isHosting ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                         >
                           Send Reset Link
                         </button>
                      </div>
                    </div>
                  </div>

                </div>
             )}

             {/* ORDERS TAB */}
             {activeTab === 'orders' && (
                <div className="space-y-4">
                   <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                     <Package className={isHosting ? "text-blue-600" : "text-orange-500"} size={24} /> My Orders
                   </h2>
                   {ordersLoading ? (
                      <div className="flex justify-center py-12"><Loader2 size={32} className={`animate-spin ${isHosting ? 'text-blue-600' : 'text-orange-500'}`} /></div>
                   ) : orders.length === 0 ? (
                      <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Package size={48} className="text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No Orders Yet</h3>
                        <p className="text-gray-500 mb-6">You haven't placed any orders yet.</p>
                        {!isHosting && (
                          <button onClick={() => navigate('/shop')} className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">
                            Start Shopping <ChevronRight size={16} />
                          </button>
                        )}
                      </div>
                   ) : (
                      orders.map(order => {
                        const isExpanded = expandedOrderId === order.id;
                        const date = new Date(
                          order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt?.seconds ? order.createdAt.seconds * 1000 : order.createdAt
                        ).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        
                        const status = order.status || 'pending';
                        const steps = ['pending', 'processing', 'shipped', 'delivered'];
                        const currentStepIdx = steps.indexOf(status);
                        
                        return (
                          <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <button onClick={() => setExpandedOrderId(isExpanded ? null : order.id)} className="w-full text-left px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                                  status === 'delivered' ? 'bg-green-100 text-green-600' :
                                  status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                  (isHosting ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-500')
                                }`}>
                                  {status === 'delivered' ? <CheckCircle2 size={24} /> : status === 'cancelled' ? <XCircle size={24} /> : <Truck size={24} />}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 text-lg">Order #{order.documentNumber || order.id.slice(-8).toUpperCase()}</div>
                                  <div className="text-sm text-gray-500">{date}</div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                                 <div className="text-right">
                                   <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Total Amount</div>
                                   <div className="font-black text-gray-900">{formatCurrency(order.total)}</div>
                                 </div>
                                 <ChevronRight size={20} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </div>
                            </button>
                            
                            {isExpanded && (
                              <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                                 {/* Visual Tracking Timeline */}
                                 {status !== 'cancelled' && !isHosting && (
                                   <div className="mb-8">
                                     <div className="flex items-center justify-between relative">
                                       <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full z-0"></div>
                                       <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-orange-500 rounded-full z-0 transition-all duration-500" style={{ width: `${Math.max(0, (currentStepIdx / (steps.length - 1)) * 100)}%` }}></div>
                                       
                                       {steps.map((step, idx) => (
                                         <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                                           <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                                             idx <= currentStepIdx ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/30' : 'bg-white border-gray-300 text-gray-400'
                                           }`}>
                                             {idx < currentStepIdx ? <Check size={16} /> : (idx + 1)}
                                           </div>
                                           <span className={`text-xs font-bold uppercase tracking-wider hidden sm:block ${idx <= currentStepIdx ? 'text-gray-900' : 'text-gray-400'}`}>
                                             {step}
                                           </span>
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 )}

                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                      <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Shipping Details</h4>
                                      <div className="bg-white p-4 rounded-xl border border-gray-100 text-sm space-y-2">
                                        <p><span className="text-gray-500">Name:</span> {order.customerName}</p>
                                        <p><span className="text-gray-500">Phone:</span> {order.phone}</p>
                                        <p><span className="text-gray-500">Address:</span> {order.address}, {order.city}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Order Summary</h4>
                                      <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3">
                                        {order.items?.map((item: any, i: number) => (
                                          <div key={i} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                              <div className="w-10 h-10 bg-gray-50 rounded p-1 shrink-0 flex items-center justify-center">
                                                {item.image ? <img src={item.image} className="w-full h-full object-contain" alt="" /> : <Box size={20} className="text-gray-300" />}
                                              </div>
                                              <div className="truncate">
                                                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                                                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                              </div>
                                            </div>
                                            <span className="font-bold shrink-0 ml-4">{formatCurrency(item.price * item.quantity)}</span>
                                          </div>
                                        ))}
                                        <div className="pt-3 border-t border-gray-100 flex justify-between font-black text-gray-900">
                                          <span>Total</span>
                                          <span>{formatCurrency(order.total)}</span>
                                        </div>
                                      </div>
                                    </div>
                                 </div>

                                 <div className="flex flex-wrap gap-3 justify-end">
                                   <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 flex items-center gap-2">
                                     <CheckCircle2 size={16} /> Download Invoice
                                   </button>
                                   {status === 'delivered' && !isHosting && (
                                     <button onClick={() => setReturnModalOrderId(order.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 flex items-center gap-2">
                                       <RotateCcw size={16} /> Request Return
                                     </button>
                                   )}
                                 </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                   )}
                </div>
             )}

             {/* PRE-ORDERS TAB */}
             {activeTab === 'pre-orders' && !isHosting && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <CalendarPlus className="text-orange-500" size={24} /> My Pre-Orders
                  </h2>
                  {preBooksLoading ? (
                    <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-orange-500" /></div>
                  ) : preBooks.length > 0 ? (
                    <div className="space-y-4">
                      {preBooks.map(pb => (
                        <div key={pb.id} className="border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                           <div className="flex gap-4 items-center">
                              <div className="w-16 h-16 bg-gray-50 rounded-lg p-2 border border-gray-100">
                                 <img src={pb.productImage || 'https://via.placeholder.com/64'} alt="product" className="w-full h-full object-contain mix-blend-multiply" />
                              </div>
                              <div>
                                 <h4 className="font-bold text-gray-900 text-sm">{pb.productName}</h4>
                                 <p className="text-xs text-gray-500 mt-1">Requested on: {new Date(pb.createdAt?.seconds ? pb.createdAt.seconds * 1000 : pb.createdAt).toLocaleDateString()}</p>
                                 <p className="text-xs text-gray-500">Phone: {pb.phone}</p>
                              </div>
                           </div>
                           <div className="flex flex-col items-end">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                pb.status === 'approved' ? 'bg-green-100 text-green-700' :
                                pb.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {pb.status || 'Pending'}
                              </span>
                              {pb.status === 'approved' && <span className="text-xs text-green-600 font-semibold mt-2 text-right">We will contact you soon for delivery.</span>}
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <CalendarPlus size={48} className="text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-gray-900 mb-2">No pre-orders yet</h3>
                      <p className="text-gray-500">You haven't requested any pre-books.</p>
                    </div>
                  )}
                </div>
             )}

             {/* WISHLIST TAB */}
             {activeTab === 'wishlist' && !isHosting && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Heart className="text-orange-500 fill-orange-500" size={24} /> My Wishlist
                  </h2>
                  {wishlist.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {wishlist.map(product => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Heart size={48} className="text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Your wishlist is empty</h3>
                      <p className="text-gray-500">Save items you love to view or buy them later.</p>
                    </div>
                  )}
                </div>
             )}

             {/* WALLET TAB */}
             {activeTab === 'wallet' && <CustomerWalletTab />}

             {/* HOSTING TABS */}
             {activeTab === 'my_domains' && <MyServicesTab />}
             {activeTab === 'tickets' && <CustomerTicketsTab currentUser={user} />}
             {activeTab === 'offers' && (
                <div>
                  {offersLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                  ) : offers.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                      <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-700 mb-2">No Offers Yet</h3>
                      <p className="text-gray-400 mb-6">You haven't submitted any domain offers.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {offers.map(offer => (
                        <div key={offer.id} className="bg-white p-6 rounded-xl border border-gray-100 flex justify-between items-center">
                           <div>
                              <div className="font-bold text-lg text-gray-900">{offer.domain}</div>
                              <div className="text-sm text-gray-500">Offered: {formatCurrency(offer.amount)}</div>
                           </div>
                           <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold uppercase">{offer.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
             )}

             {/* Price Alerts Tab */}
             {activeTab === 'price-alerts' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                  <PriceAlertsTab />
                </div>
             )}
             
          </div>
        </div>
      </div>

      {/* Return Modal */}
      {returnModalOrderId && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up">
            <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <RotateCcw className="text-red-500" /> Request Return (RMA)
            </h3>
            <p className="text-sm text-gray-500 mb-6">Please tell us why you want to return this order.</p>
            
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 min-h-[120px] mb-6"
              placeholder="E.g. The product was damaged upon arrival..."
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
            />
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setReturnModalOrderId(null)}
                className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                   if(!returnReason.trim()) return toast.error('Please provide a reason');
                   try {
                     await addDoc(collection(db, 'returns'), {
                       orderId: returnModalOrderId,
                       userId: user?.uid,
                       reason: returnReason,
                       status: 'pending',
                       createdAt: new Date().toISOString()
                     });
                     toast.success('Return request submitted successfully!');
                     setReturnModalOrderId(null);
                     setReturnReason('');
                   } catch (e) {
                     toast.error('Failed to submit return request');
                   }
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <MapPin className="text-orange-500" /> Add New Address
            </h3>
            
            <form onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const newAddr = {
                type: fd.get('type'),
                name: fd.get('name'),
                phone: fd.get('phone'),
                address: fd.get('address'),
                city: fd.get('city'),
                isDefault: formData.addresses?.length === 0 || !formData.addresses
              };
              setFormData({ ...formData, addresses: [...(formData.addresses || []), newAddr] });
              setShowAddressModal(false);
            }} className="space-y-4">
               <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 block">Address Label</label>
                  <select name="type" className="w-full border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20" required>
                    <option value="Home">Home</option>
                    <option value="Office">Office</option>
                    <option value="Other">Other</option>
                  </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 block">Full Name</label>
                    <input name="name" type="text" defaultValue={formData.name} className="w-full border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 block">Phone</label>
                    <input name="phone" type="tel" defaultValue={formData.phone} className="w-full border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20" required />
                  </div>
               </div>
               <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 block">City / District</label>
                  <input name="city" type="text" className="w-full border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20" required />
               </div>
               <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 block">Full Address</label>
                  <textarea name="address" className="w-full border border-gray-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 min-h-[80px]" required placeholder="Street, House No, Area..." />
               </div>
               
               <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                 <button type="button" onClick={() => setShowAddressModal(false)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Cancel</button>
                 <button type="submit" className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl">Save Address</button>
               </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
};
