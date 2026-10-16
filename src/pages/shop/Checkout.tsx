// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { Layout } from '../../components/Layout';
import { toast } from 'react-hot-toast';
import { Lock, ArrowRight } from 'lucide-react';
import { auth, db } from '../../firebase';
import { collection, addDoc, doc, writeBatch, getDoc, increment } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { generateDocumentNumber } from '../../lib/numbering';
import { generatePDF } from '../../lib/pdf';
import { initiateBkashPayment, initiateSSLCommerzPayment, initiateNagadPayment } from '../../services/paymentApi';
import { apiPost } from '../../services/apiClient';



export const Checkout: React.FC = () => {
  const { user } = useAuth();
  const { items, subtotal, total, promoDiscount, appliedDiscount, clearCart, isShippingFree, addToCart } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();

  

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    company: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Bangladesh',
    source: 'None',
    domainContact: 'default',
    password: '',
    confirmPassword: '',
    paymentMethod: 'bkash',
    notes: '',
    termsAccepted: false
  });

  
  const [shippingConfig, setShippingConfig] = useState({
    insideDhaka: 80,
    outsideDhaka: 120,
    freeShippingThreshold: 5000,
    enableFreeShipping: false
  });

  React.useEffect(() => {
    const fetchShipping = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'ecommerce_shipping'));
        if (snap.exists()) {
          setShippingConfig(snap.data() as any);
        }
      } catch (e) {}
    };
    fetchShipping();
  }, []);

  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const bdDomain = searchParams.get('bd_domain');
    const appId = searchParams.get('app_id');
    
    if (bdDomain && appId) {
      const exists = items.some(item => item.id === `domain_${bdDomain}`);
      if (!exists) {
        const product = {
          id: `domain_${bdDomain}`,
          name: `Domain Registration - ${bdDomain}`,
          description: '2 Years Registration',
          price: 1840,
          category: 'Hosting & Domains',
          stock: 9999,
          images: [],
          createdAt: new Date().toISOString(),
          itemType: 'domain' as const,
          domainTld: bdDomain.split('.').slice(1).join('.'),
          termYears: 2,
          bdAppId: appId
        };
        addToCart(product);
        toast.success(`${bdDomain} added to cart`);
      }
    }
  }, []); // Only run once on mount to prevent infinite re-renders if items change

  let shippingCost = 0;
  if (formData.state && formData.city) {
    if (formData.state === 'Dhaka' && formData.city === 'Dhaka' || formData.state === 'Dhaka') {
      shippingCost = shippingConfig.insideDhaka;
    } else {
      shippingCost = shippingConfig.outsideDhaka;
    }
  }

  if (isShippingFree || (shippingConfig.enableFreeShipping && subtotal >= shippingConfig.freeShippingThreshold)) {
    shippingCost = 0;
  }
  
  const [paymentType, setPaymentType] = useState<'cod' | 'pay_now'>('cod');
  const [advanceDelivery, setAdvanceDelivery] = useState(false);

  // If payment is COD and advance delivery is checked, the customer only pays the delivery charge right now
  const isAdvanceCOD = paymentType === 'cod' && advanceDelivery && shippingCost > 0;
  const payNowAmount = isAdvanceCOD ? shippingCost : (total + shippingCost);
  const dueOnDelivery = isAdvanceCOD ? total : 0;
  const grandTotal = total + shippingCost;

  const [geoData, setGeoData] = useState({ divisions: [], districts: [], upazilas: [], unions: [] });
  const [activeGeo, setActiveGeo] = useState({ districts: [], upazilas: [], unions: [] });

  React.useEffect(() => {
    fetch('/data/bd-geo.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Failed to load geo data', err));
  }, []);

  const handleGeoChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    let newData = { ...formData, [name]: value };
    
    if (name === 'state') {
      const selectedDiv = geoData.divisions.find(d => d.name === value);
      const filteredDistricts = selectedDiv ? geoData.districts.filter(d => d.div_id === selectedDiv.id) : [];
      setActiveGeo(prev => ({ ...prev, districts: filteredDistricts, upazilas: [], unions: [] }));
      newData = { ...newData, city: '', thana: '', union: '' };
    } else if (name === 'city') {
      const selectedDist = activeGeo.districts.find(d => d.name === value);
      const filteredUpazilas = selectedDist ? geoData.upazilas.filter(u => u.dist_id === selectedDist.id) : [];
      setActiveGeo(prev => ({ ...prev, upazilas: filteredUpazilas, unions: [] }));
      newData = { ...newData, thana: '', union: '' };
    } else if (name === 'thana') {
      const selectedUpz = activeGeo.upazilas.find(u => u.name === value);
      const filteredUnions = selectedUpz ? geoData.unions.filter(u => u.upz_id === selectedUpz.id) : [];
      setActiveGeo(prev => ({ ...prev, unions: filteredUnions }));
      newData = { ...newData, union: '' };
    }
    
    setFormData(newData);
  };

  const [isProcessing, setIsProcessing] = useState(false);

  // If cart is empty, redirect to cart
  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    if (e.target.name === 'phone') {
      let val = String(value).replace(/\D/g, '');
      if (val.startsWith('880')) val = val.slice(3);
      else if (val.startsWith('88')) val = val.slice(2);
      val = val.replace(/^0+/, '');
      val = val.slice(0, 10);
      setFormData(prev => ({ ...prev, phone: val }));
      return;
    }
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      toast.success('Signed in with Google!');
    } catch (error: any) {
      console.error('Google sign in error:', error);
      if (error?.code === 'auth/unauthorized-domain') {
        const hostname = window.location.hostname;
        toast.error(`Domain "${hostname}" is not authorized in Firebase. Add it under Firebase Console -> Auth -> Settings -> Authorized Domains.`, { duration: 8000 });
      } else if (error?.code === 'auth/popup-blocked') {
        toast.error('Pop-up blocked by browser. Please enable pop-ups for this site.');
      } else if (error?.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-in pop-up was closed.');
      } else {
        toast.error(error?.message || 'Google sign in failed');
      }
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({...prev, password: pwd, confirmPassword: pwd}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.termsAccepted) {
      toast.error('You must agree to the Terms of Service.');
      return;
    }

    setIsProcessing(true);

    try {
      let currentUserId = user?.uid;

      if (!user && formData.password) {
        if (formData.password !== formData.confirmPassword) {
          toast.error("Passwords do not match");
          setIsProcessing(false);
          return;
        }
        try {
          const newUserCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          currentUserId = newUserCred.user.uid;
        } catch (error: any) {
          toast.error(error.message);
          setIsProcessing(false);
          return;
        }
      } else if (!user) {
        toast.error("Please login, sign in with Google or create a password to checkout.");
        setIsProcessing(false);
        return;
      }

      const cleanPhone = formData.phone.replace(/\D/g, '').replace(/^(?:880|88)?0?/, '');
      const phoneRegex = /^1[3-9]\d{8}$/;
      if (!phoneRegex.test(cleanPhone)) {
        toast.error('Please enter a valid 10-digit phone number starting with 1 (e.g. 17XXXXXXXX).');
        setIsProcessing(false);
        return;
      }
      const fullPhone = `+880${cleanPhone}`;

      const docType = 'INV'; // default to invoice
      const docNumber = await generateDocumentNumber(docType);

      let affiliateRefId = null;
      try {
        const stored = localStorage.getItem('affiliate_ref');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.expiry > Date.now()) {
            affiliateRefId = parsed.code;
          } else {
            localStorage.removeItem('affiliate_ref');
          }
        }
      } catch(e) {}

      const orderData = {
        userId: currentUserId,
        platform: 'ecommerce',
        items,
        total: grandTotal,
        shippingCost,
        status: 'pending',
        paymentStatus: 'pending',
        type: 'invoice',
        documentNumber: docNumber,
        customerName: `${formData.firstName} ${formData.lastName}`.trim(),
        customerEmail: formData.email,
        customerPhone: fullPhone,
        shippingAddress: `${formData.address1}, ${formData.address2 ? formData.address2 + ', ' : ''}${formData.union ? formData.union + ', ' : ''}${formData.thana ? formData.thana + ', ' : ''}${formData.city}, ${formData.state} - ${formData.postcode}, ${formData.country}`,
        company: formData.company,
        discountCode: appliedDiscount ? appliedDiscount.code : null,
        discountAmount: promoDiscount,
        paymentMethod: paymentType === 'cod' ? (advanceDelivery ? 'cod_advance_paid' : 'cod') : formData.paymentMethod,
        advancePaidAmount: isAdvanceCOD ? shippingCost : 0,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

      const batch = writeBatch(db);
      const newOrderRef = doc(collection(db, 'orders'));
      batch.set(newOrderRef, orderData);

      // Record sale transaction in accounting ledger
      const txRef = doc(collection(db, 'transactions'));
      batch.set(txRef, {
        type: 'sale',
        amount: grandTotal,
        date: new Date().toISOString(),
        description: `Online Order #${docNumber} (${formData.firstName} ${formData.lastName})`,
        entityId: currentUserId || 'web_customer',
        entityName: `${formData.firstName} ${formData.lastName}`.trim(),
        entityType: 'customer',
        referenceId: newOrderRef.id,
        documentNumber: docNumber,
        paymentAccountId: '',
        paymentMethod: paymentType === 'cod' ? 'cod' : (formData.paymentMethod || 'online'),
        createdAt: new Date().toISOString(),
        createdBy: 'Online Customer',
      });

      // If advance delivery fee was paid
      if (isAdvanceCOD && shippingCost > 0) {
        const advTxRef = doc(collection(db, 'transactions'));
        batch.set(advTxRef, {
          type: 'payment_received',
          amount: shippingCost,
          date: new Date().toISOString(),
          description: `Advance Delivery Fee for Order #${docNumber}`,
          entityId: currentUserId || 'web_customer',
          entityName: `${formData.firstName} ${formData.lastName}`.trim(),
          entityType: 'customer',
          referenceId: newOrderRef.id,
          documentNumber: docNumber,
          paymentAccountId: '',
          paymentMethod: 'online',
          createdAt: new Date().toISOString(),
          createdBy: 'Online Customer',
        });
      }
      
      const domainItems = items.filter(item => item.itemType === 'domain' || item.itemType === 'domain_transfer');
      const hostingItems = items.filter(item => item.itemType === 'hosting');

      const sslItems = items.filter(item => item.itemType === 'ssl');
      for (const sslItem of sslItems) {
        const sOrderRef = doc(collection(db, 'sslOrders'));
        batch.set(sOrderRef, {
          userId: user?.uid || 'guest',
          orderId: newOrderRef.id,
          productId: sslItem.id.split('_')[0] + '_' + sslItem.id.split('_')[1],
          name: sslItem.name,
          termYears: sslItem.termYears || 1,
          price: sslItem.price,
          status: 'pending_configuration',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      
      const productItems = items.filter(item => !item.itemType || item.itemType === 'product');
      for (const pItem of productItems) {
        if (pItem.id) {
          const prodRef = doc(db, 'products', pItem.id);
          batch.update(prodRef, { stock: increment(-pItem.quantity) });
        }
      }

      for (const domainItem of domainItems) {
        const domain = domainItem.id.replace('domain_', '');
        const tld = domainItem.domainTld || domain.split('.').pop() || '';
        const dOrderRef = doc(collection(db, 'domainOrders'));
        batch.set(dOrderRef, {
          domain,
          tld,
          userId: currentUserId,
          orderId: newOrderRef.id,
          status: 'pending',
          years: domainItem.termYears || 1,
          autoRenew: false,
          nameservers: [],
          price: domainItem.price,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        if ((domainItem as any).bdAppId) {
          const appRef = doc(db, 'bd_domain_applications', (domainItem as any).bdAppId);
          batch.update(appRef, {
            status: 'processing',
            orderId: newOrderRef.id,
            updatedAt: new Date().toISOString()
          });
        }
      }

      for (const hostingItem of hostingItems) {
        const hAccountRef = doc(collection(db, 'hostingAccounts'));
        batch.set(hAccountRef, {
          userId: currentUserId,
          orderId: newOrderRef.id,
          planId: hostingItem.id.replace('hosting_', ''),
          provider: 'dummy',
          status: 'pending',
          billingCycle: hostingItem.billingCycle || 'monthly',
          autoRenew: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

        await batch.commit();
        
        // Notify Admin and Customer
        try {
          if (user) {
            const token = await user.getIdToken();
            await apiPost('/api/send-email/notify-admin-new-order', { orderId: newOrderRef.id, orderData }, token);
            
            // Generate PDF for customer
            const pdfDoc = await generatePDF({ id: newOrderRef.id, ...orderData } as any, 'invoice', settings, 'doc');
            const pdfBase64 = pdfDoc.output('datauristring');
            
            // Send Order Confirmation to Customer
            await apiPost('/api/send-email/order-confirmation', {
              orderId: newOrderRef.id,
              customerName: `${formData.firstName} ${formData.lastName}`,
              customerEmail: formData.email,
              attachments: [
                {
                  filename: `Invoice-${newOrderRef.id}.pdf`,
                  content: pdfBase64.split('base64,')[1],
                  encoding: 'base64',
                  contentType: 'application/pdf'
                }
              ]
            }, token);
          }
        } catch (err) {
          console.error('Failed to send order emails:', err);
        }
      
      // Update docRef for payment initiation logic below
      const docRef = newOrderRef;
      // Only clear cart and show success if not redirecting to a payment gateway
        const selectedPayment = paymentType === 'cod' ? 'cod' : formData.paymentMethod;
        if (selectedPayment === 'bkash' || selectedPayment === 'card' || selectedPayment === 'nagad' || isAdvanceCOD) {
        // Online payments or Advance COD route to a gateway
        const gateway = isAdvanceCOD ? (formData.paymentMethod || 'bkash') : selectedPayment;
        
        if (gateway === 'bkash') {
          const res = await initiateBkashPayment(docRef.id, payNowAmount, formData.email, `${formData.firstName} ${formData.lastName}`, fullPhone);
          if (res.success && res.paymentUrl) {
            window.location.href = res.paymentUrl;
            return;
          } else {
            throw new Error(res.errorMessage || 'Failed to initiate bKash payment');
          }
        } else if (gateway === 'card') {
          const res = await initiateSSLCommerzPayment(
            docRef.id, 
            payNowAmount, 
            formData.email, 
            `${formData.firstName} ${formData.lastName}`, 
            fullPhone
          );
          if (res.success && res.paymentUrl) {
            window.location.href = res.paymentUrl;
            return;
          } else {
            throw new Error(res.errorMessage || 'Failed to initiate Card payment');
          }
        } else if (gateway === 'nagad') {
          const res = await initiateNagadPayment(docRef.id, payNowAmount, fullPhone);
          if (res.success && res.paymentUrl) {
            window.location.href = res.paymentUrl;
            return;
          } else {
            throw new Error(res.errorMessage || 'Failed to initiate Nagad payment');
          }
        }
      } else {
        // Pure COD without advance
        clearCart();
        navigate(`/order-success/${docRef.id}`);
        toast.success('Order placed successfully!');
        return;
      }

      // For manual methods (bank transfer, etc), proceed directly
      toast.success('Order placed successfully!');
      clearCart();
      navigate(`/order-success/${docRef.id}`);
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to place order');
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-12 mb-20 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Checkout</h1>
            <p className="text-slate-500 text-base mt-2">Please enter your personal details and billing information to complete your order.</p>
          </div>
          {!user && (
            <button 
              onClick={() => navigate('/login')}
              className="bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-6 py-2.5 text-slate-700 font-semibold rounded-xl text-sm transition-all shadow-sm"
            >
              Already Registered? Login
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-100">
          {!user && (
            <div className="mb-12 relative border-t border-slate-200 pt-8 mt-4">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-6 py-1 rounded-full text-slate-800 text-sm font-semibold border border-slate-100 shadow-sm">Sign Up</span>
              <p className="text-center text-slate-500 mb-6">Save time by signing up using an existing account.</p>
              <div className="flex justify-center">
                <button type="button" onClick={handleGoogleSignIn} className="flex flex-row items-center justify-center gap-3 border border-slate-200 rounded-xl px-8 py-3 hover:bg-slate-50 bg-white shadow-sm transition-all text-sm font-bold text-slate-700 hover:-translate-y-0.5">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  Sign in with Google
                </button>
              </div>
            </div>
          )}

          <div className="mb-12 relative border-t border-slate-200 pt-8">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-6 py-1 rounded-full text-slate-800 text-sm font-semibold border border-slate-100 shadow-sm">Personal Information</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First Name *" required className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all" />
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last Name *" required className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all" />
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email Address *" required className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all" />
              <div className="flex">
                <span className="inline-flex items-center px-4 border border-r-0 border-slate-200 bg-slate-100 text-slate-600 font-medium text-sm rounded-l-xl">
                  <img src="https://flagcdn.com/w20/bd.png" alt="BD" className="w-5 h-auto mr-2 rounded-sm shadow-sm" /> +880
                </span>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="1XXXXXXXXX *" maxLength={10} required className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-r-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all flex-1" />
              </div>
            </div>
          </div>

          <div className="mb-12 relative border-t border-slate-200 pt-8">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-6 py-1 rounded-full text-slate-800 text-sm font-semibold border border-slate-100 shadow-sm">Billing Address</span>
            <div className="space-y-5">
              <input type="text" name="company" value={formData.company} onChange={handleChange} placeholder="Company Name (Optional)" className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all" />
              <input type="text" name="address1" value={formData.address1} onChange={handleChange} placeholder="Street Address *" required className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all" />
              <input type="text" name="address2" value={formData.address2} onChange={handleChange} placeholder="Apartment, suite, etc. (Optional)" className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <select name="state" value={formData.state} onChange={handleGeoChange} required className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all text-slate-700">
                    <option value="" disabled>Select Division *</option>
                    {geoData.divisions.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                  
                  <select name="city" value={formData.city} onChange={handleGeoChange} required disabled={!formData.state} className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed">
                    <option value="" disabled>Select District/City *</option>
                    {activeGeo.districts.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <select name="thana" value={formData.thana} onChange={handleGeoChange} required disabled={!formData.city} className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed">
                    <option value="" disabled>Select Thana / Upazila *</option>
                    {activeGeo.upazilas.map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                  
                  <select name="union" value={formData.union} onChange={handleGeoChange} disabled={!formData.thana || activeGeo.unions.length === 0} className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed">
                    <option value="" disabled>{activeGeo.unions.length === 0 ? "No Union (Optional)" : "Select Union / Area (Optional)"}</option>
                    {activeGeo.unions.map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <input type="text" name="postcode" value={formData.postcode} onChange={handleChange} placeholder="Postcode / ZIP *" required className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all" />
                  
                  <select name="country" value={formData.country} onChange={handleChange} className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all">
                    <option value="Bangladesh">Bangladesh</option>
                  </select>
                </div>

          <div className="mb-12 relative border-t border-slate-200 pt-8">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-6 py-1 rounded-full text-slate-800 text-sm font-semibold border border-slate-100 shadow-sm">Additional Information</span>
            <div className="max-w-xs mx-auto text-center">
              <label className="block text-sm font-medium text-slate-700 mb-3">How did you find us?</label>
              <select name="source" value={formData.source} onChange={handleChange} className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all text-center">
                <option value="None">Please Select...</option>
                <option value="Google">Google Search</option>
                <option value="Social Media">Social Media</option>
                <option value="Friend">Friend / Recommendation</option>
              </select>
            </div>
          </div>

          {items.some(item => item.itemType === 'domain') && (
            <div className="mb-10 relative border-t border-slate-200 pt-8">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-50 px-6 py-1 rounded-full text-slate-800 text-sm font-semibold border border-slate-100 shadow-sm">Domain Registrant Information</span>
              <p className="text-sm text-slate-500 mb-6 text-center max-w-2xl mx-auto">You may specify alternative registered contact details for the domain registration(s) in your order when placing an order on behalf of another person or entity.</p>
              <div className="flex justify-center">
                <select name="domainContact" value={formData.domainContact} onChange={handleChange} className="border border-slate-200 p-3 rounded-xl text-sm min-w-[300px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all">
                  <option value="default">Use Default Contact (Details Above)</option>
                  <option value="custom">Add New Contact</option>
                </select>
              </div>
            </div>
          )}

          {!user && (
            <div className="mb-12 relative border-t border-slate-200 pt-8">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-6 py-1 rounded-full text-slate-800 text-sm font-semibold border border-slate-100 shadow-sm">Account Security</span>
              <p className="text-center text-sm text-slate-500 mb-6">Create a password to easily access your orders and track status.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-3">
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-[#0E2A47] transition-colors" />
                  <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password *" required className="border border-slate-200 bg-slate-50/50 p-3.5 pl-11 rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all" />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-[#0E2A47] transition-colors" />
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm Password *" required className="border border-slate-200 bg-slate-50/50 p-3.5 pl-11 rounded-xl text-sm w-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-center text-sm gap-3">
                <button type="button" onClick={generatePassword} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors">Generate Password</button>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Password Strength:</span>
                  <span className={`font-semibold ${formData.password.length > 8 ? 'text-emerald-500' : formData.password.length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                    {formData.password.length > 8 ? 'Strong' : formData.password.length > 0 ? 'Weak' : 'Enter Password'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="mb-12 relative border-t border-slate-200 pt-8">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-6 py-1 rounded-full text-slate-800 text-sm font-semibold border border-slate-100 shadow-sm">Payment Details</span>
            
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl mb-8">
              <div className="space-y-3 max-w-sm mx-auto">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">৳ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 pb-3 border-b border-slate-200">
                  <span>Shipping:</span>
                  <span className="font-semibold">৳ {shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-900 pt-1">
                  <span className="font-bold text-lg">Total Due:</span>
                  <span className="font-black text-xl text-[#6EC72A]">৳ {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <p className="text-center text-slate-600 font-medium mb-6">Select Payment Method</p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-lg mx-auto mb-8">
              <div className={`flex-1 border-2 rounded-xl p-5 flex flex-col gap-3 transition-all ${paymentType === 'cod' ? 'border-[#6EC72A] bg-[#6EC72A]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                <label className="cursor-pointer flex items-center justify-center gap-3" onClick={() => setPaymentType('cod')}>
                  <input type="radio" name="paymentType" value="cod" checked={paymentType === 'cod'} onChange={() => {}} className="hidden" />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentType === 'cod' ? 'border-[#6EC72A]' : 'border-slate-400'}`}>
                    {paymentType === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-[#6EC72A]" />}
                  </div>
                  <span className={`font-bold ${paymentType === 'cod' ? 'text-[#6EC72A]' : 'text-slate-600'}`}>Cash on Delivery</span>
                </label>
                {paymentType === 'cod' && shippingCost > 0 && (
                  <div className="mt-2 pt-3 border-t border-[#6EC72A]/20">
                    <label className="flex items-start gap-2 cursor-pointer group">
                      <div className="relative flex items-start pt-0.5">
                        <input type="checkbox" checked={advanceDelivery} onChange={(e) => setAdvanceDelivery(e.target.checked)} className="w-4 h-4 text-[#6EC72A] border-gray-300 rounded focus:ring-[#6EC72A]" />
                      </div>
                      <span className="text-xs text-slate-700 leading-tight">Pay only delivery charge (৳{shippingCost}) in advance. Remaining amount on delivery.</span>
                    </label>
                  </div>
                )}
              </div>

              <label className={`flex-1 cursor-pointer border-2 rounded-xl p-5 flex items-center justify-center gap-3 transition-all ${paymentType === 'pay_now' ? 'border-[#6EC72A] bg-[#6EC72A]/5 text-[#6EC72A]' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                <input type="radio" name="paymentType" value="pay_now" checked={paymentType === 'pay_now'} onChange={() => setPaymentType('pay_now')} className="hidden" />
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-current">
                  {paymentType === 'pay_now' && <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                </div>
                <span className="font-bold">Pay Now</span>
              </label>
            </div>

            {paymentType === 'pay_now' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto animate-in fade-in slide-in-from-top-4 duration-300">
                {[
                  { id: 'bkash', label: 'bKash', img: 'https://freelogopng.com/images/all_img/1656234745bkash-app-logo-png.png' },
                  { id: 'nagad', label: 'Nagad', img: 'https://download.logo.wine/logo/Nagad/Nagad-Logo.wine.png' },
                  { id: 'card', label: 'Cards (Visa/Master)', img: 'https://cdn-icons-png.flaticon.com/512/196/196578.png' },
                  { id: 'bank', label: 'Bank Transfer', img: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png' }
                ].map(method => (
                  <label key={method.id} className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-3 transition-all ${formData.paymentMethod === method.id ? 'border-[#6EC72A] bg-[#6EC72A]/5' : 'border-slate-100 hover:border-slate-300'}`}>
                    <input type="radio" name="paymentMethod" value={method.id} checked={formData.paymentMethod === method.id} onChange={handleChange} className="hidden" />
                    <div className="h-10 flex items-center justify-center">
                      <img src={method.img} alt={method.label} className="max-h-full object-contain mix-blend-multiply opacity-90" />
                    </div>
                    <span className={`text-xs font-semibold text-center ${formData.paymentMethod === method.id ? 'text-[#6EC72A]' : 'text-slate-500'}`}>{method.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          
          {items.some(item => item.itemType === 'domain' && (item.id.endsWith('.bd') || (item.domainTld && item.domainTld.endsWith('bd')))) && (
            <div className="mb-12 relative border border-blue-200 bg-blue-50/50 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-6 py-1 rounded-full text-sm font-bold shadow-md whitespace-nowrap">.BD Domain Requirements</span>
              <div className="flex gap-4">
                <div className="shrink-0 text-blue-600 bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg mb-2">BTCL Verification Needed</h4>
                  <p className="text-slate-600 text-sm mb-4">
                    You are registering a Bangladesh specific domain (e.g. .com.bd). BTCL requires identity verification. Please send the following documents to <strong>info@click2itbd.com</strong> with your Order ID, or upload them in your dashboard after completing this order:
                  </p>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 font-medium">
                    <li>Copy of valid Trade License (For businesses)</li>
                    <li>Copy of NID (National Identity Card)</li>
                    <li>Authorization Letter (if applicable)</li>
                  </ul>
                  <p className="text-xs text-slate-500 mt-4 bg-white/60 p-3 rounded-lg">Your domain will be activated once documents are verified by BTCL.</p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-12 relative border-t border-slate-200 pt-8">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-6 py-1 rounded-full text-slate-800 text-sm font-semibold border border-slate-100 shadow-sm">Additional Notes</span>
            <textarea 
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Enter any additional notes, delivery instructions, or special requests..."
              rows={4}
              className="w-full border border-slate-200 bg-slate-50/50 rounded-xl p-4 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0E2A47]/20 focus:border-[#0E2A47] transition-all resize-y"
            ></textarea>
          </div>

          <div className="flex flex-col items-center justify-center gap-6 pt-4 border-t border-slate-100">
            <label className="flex items-center gap-3 text-sm text-slate-600 cursor-pointer group">
              <div className="relative flex items-center">
                <input type="checkbox" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} className="w-5 h-5 border-2 border-slate-300 rounded text-[#0E2A47] focus:ring-[#0E2A47] cursor-pointer transition-colors" />
              </div>
              <span>I have read and agree to the <Link to="/terms" className="text-[#0E2A47] font-semibold hover:underline" target="_blank">Terms of Service</Link> & Privacy Policy</span>
            </label>

            <button type="submit" disabled={isProcessing} className="bg-gradient-to-r from-[#0E2A47] to-[#1a426e] hover:shadow-xl hover:shadow-[#0E2A47]/20 hover:-translate-y-0.5 text-white font-bold py-4 px-10 rounded-xl text-lg flex items-center gap-3 disabled:opacity-50 disabled:hover:translate-y-0 transition-all min-w-[300px] justify-center group">
              {isProcessing ? 'Processing Order...' : 'Complete Order'}
              {!isProcessing && (
                <span className="bg-white/20 p-1.5 rounded-full group-hover:bg-white/30 transition-colors">
                  <ArrowRight size={20} />
                </span>
              )}
            </button>
          </div>
        </div></div></form>
      </div>
    </Layout>
  );
};




