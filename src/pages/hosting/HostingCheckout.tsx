import { getFriendlyErrorMessage } from '../../utils/errorUtils';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { Layout } from '../../components/Layout';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { Lock, ShieldCheck, Terminal, CheckCircle, CreditCard, Landmark, Wallet, ArrowRight, Loader2, Server, Key, Copy, Check, Eye, EyeOff, Sparkles, RefreshCw, Globe, Cpu, Layers, AlertCircle, PlusCircle, Users, UserPlus, Search, X } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, setDoc, writeBatch } from 'firebase/firestore';
import { generateDocumentNumber } from '../../lib/numbering';
import { initiateBkashPayment, initiateSSLCommerzPayment, initiateNagadPayment } from '../../services/paymentApi';
import { apiPost, getApiUrl, apiClient } from '../../services/apiClient';
import { createCustomerAccountByAdmin, generateCustomerPassword } from '../../utils/customerAdminUtils';

export const HostingCheckout: React.FC = () => {
  const { user, effectiveUser, canAccessAdmin, isImpersonating, impersonatedCustomer, loading: authLoading } = useAuth();
  const { items: allItems, total, clearCart, updateCartItem } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();
  
  const items = allItems.filter(i => i.category === 'Hosting & Domains');
  const hostingSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = 0;

  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  const discountAmount = appliedDiscount ? (hostingSubtotal * appliedDiscount.discountPercentage) / 100 : 0;
  const grandTotal = hostingSubtotal - discountAmount + shippingCost;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: effectiveUser?.email || user?.email || '',
    phone: '',
    company: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Bangladesh',
    paymentMethod: 'bkash',
    transactionId: '',
    termsAccepted: false
  });

  // Admin: Order on behalf of an existing or newly created customer
  const [adminCustomerMode, setAdminCustomerMode] = useState<'self_or_impersonated' | 'existing' | 'create_new'>('self_or_impersonated');
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedTargetCustomer, setSelectedTargetCustomer] = useState<any>(null);
  const [newCustomerPassword, setNewCustomerPassword] = useState(() => generateCustomerPassword(10));
  const [showNewCustomerPassword, setShowNewCustomerPassword] = useState(true);
  const [sendNewCustomerEmail, setSendNewCustomerEmail] = useState(true);
  const [creatingCustomerInline, setCreatingCustomerInline] = useState(false);

  const applyCustomerProfileToForm = (custData: any) => {
    if (!custData) return;
    const fullName = String(custData.displayName || custData.name || '').trim();
    const parts = fullName.split(/\s+/);
    const fName = custData.firstName || parts[0] || '';
    const lName = custData.lastName || parts.slice(1).join(' ') || '';
    const rawPhone = String(custData.phone || custData.phoneNumber || custData.mobile || '')
      .replace(/\D/g, '')
      .replace(/^(?:880|88)?0?/, '')
      .slice(0, 10);

    setFormData(prev => ({
      ...prev,
      firstName: fName || prev.firstName,
      lastName: lName || prev.lastName,
      email: custData.email || prev.email,
      phone: rawPhone || prev.phone,
      company: custData.company || '',
      address1: custData.address1 || custData.address || '',
      address2: custData.address2 || '',
      city: custData.city || 'Dhaka',
      state: custData.state || custData.city || 'Dhaka',
      postcode: custData.postcode || custData.zip || '1000',
      country: custData.country || 'Bangladesh',
    }));

    if (typeof custData.balance === 'number') {
      setUserWalletBalance(custData.balance);
    }
  };

  // Auto-load profile details for logged-in / impersonated customer
  useEffect(() => {
    const activeUid = impersonatedCustomer?.uid || user?.uid;
    if (!activeUid) return;
    getDoc(doc(db, 'users', activeUid))
      .then(snap => {
        if (snap.exists()) {
          applyCustomerProfileToForm({ uid: snap.id, ...snap.data() });
        }
      })
      .catch(() => {});
  }, [user?.uid, impersonatedCustomer?.uid]);

  // Load customer list for Admin selector
  useEffect(() => {
    if (!canAccessAdmin) return;
    getDocs(collection(db, 'users'))
      .then(snap => {
        const list = snap.docs.map(d => ({ uid: d.id, id: d.id, ...d.data() }));
        setAllCustomers(list);
      })
      .catch(() => {});
  }, [canAccessAdmin]);

  const handleCreateCustomerFromCheckout = async () => {
    setCreatingCustomerInline(true);
    try {
      const created = await createCustomerAccountByAdmin({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: newCustomerPassword,
        phone: formData.phone,
        company: formData.company,
        address1: formData.address1,
        address2: formData.address2,
        city: formData.city || 'Dhaka',
        state: formData.state || formData.city || 'Dhaka',
        postcode: formData.postcode || '1000',
        country: formData.country || 'Bangladesh',
        sendWelcomeEmail: sendNewCustomerEmail,
      });
      setAllCustomers(prev => [created, ...prev.filter(u => u.uid !== created.uid)]);
      setSelectedTargetCustomer({ ...created, plainPassword: newCustomerPassword });
      setAdminCustomerMode('existing');
      toast.success(`Customer account created for ${created.email}! This order will be placed under their account.`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create customer account');
    } finally {
      setCreatingCustomerInline(false);
    }
  };

  const [domainConfig, setDomainConfig] = useState({
    ns1: 'ns1.click2itbd.com',
    ns2: 'ns2.click2itbd.com',
    useCustomNs: false
  });

  const [hostingConfig, setHostingConfig] = useState({
    domain: ''
  });

  const isVpsItem = (item: any) => {
    const slug = (item.planSlug || item.id || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return (
      item.itemType === 'vps' ||
      slug.includes('vps') ||
      name.includes('vps') ||
      Boolean(item.details?.os)
    );
  };

  const [vpsConfig, setVpsConfig] = useState({
    hostname: '',
    os: 'Ubuntu 22.04 LTS',
    serverLocation: 'Dhaka, Bangladesh (BDIX Low-Latency)',
    rootPassword: '',
    sshKey: '',
    notes: ''
  });
  const [showRootPassword, setShowRootPassword] = useState(false);
  const [copiedRootPassword, setCopiedRootPassword] = useState(false);

  useEffect(() => {
    const firstVps = items.find(isVpsItem);
    if (firstVps) {
      const requestedOs = (firstVps as any).details?.os;
      const requestedLocation = (firstVps as any).details?.serverLocation;
      const cartOs = (typeof requestedOs === 'string' && requestedOs) ||
        (firstVps.name.includes('Ubuntu 24') ? 'Ubuntu 24.04 LTS' :
         firstVps.name.includes('Ubuntu') ? 'Ubuntu 22.04 LTS' :
         firstVps.name.includes('Debian') ? 'Debian 12 Bookworm' :
         firstVps.name.includes('AlmaLinux') ? 'AlmaLinux 9' :
         firstVps.name.includes('Rocky') ? 'Rocky Linux 9' :
         firstVps.name.includes('Windows') ? 'Windows Server 2022' : 'Ubuntu 22.04 LTS');

      setVpsConfig(prev => ({
        ...prev,
        os: requestedOs || prev.os || cartOs,
        serverLocation: requestedLocation || prev.serverLocation
      }));
    }
  }, [items]);

  const generateStrongPassword = () => {
    const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowercase = "abcdefghijkmnopqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "!@#$%&*+?";
    const all = uppercase + lowercase + numbers + symbols;
    
    let pwd = "";
    pwd += uppercase[Math.floor(Math.random() * uppercase.length)];
    pwd += lowercase[Math.floor(Math.random() * lowercase.length)];
    pwd += numbers[Math.floor(Math.random() * numbers.length)];
    pwd += symbols[Math.floor(Math.random() * symbols.length)];
    
    for (let i = 4; i < 16; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }
    pwd = pwd.split('').sort(() => 0.5 - Math.random()).join('');
    
    setVpsConfig(prev => ({ ...prev, rootPassword: pwd }));
    setShowRootPassword(true);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(pwd);
    }
    setCopiedRootPassword(true);
    setTimeout(() => setCopiedRootPassword(false), 2500);
    toast.success("Strong root password generated & copied to clipboard!");
  };

  const [transferAuthCodes, setTransferAuthCodes] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('click2it_transfer_codes') || '{}');
    } catch {
      return {};
    }
  });
  const [bkashNumber, setBkashNumber] = useState('');
  const [epsEnabled, setEpsEnabled] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch(getApiUrl('/api/payments/methods'))
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setEpsEnabled(Boolean(j?.data?.eps?.enabled)); })
      .catch(() => { /* EPS stays hidden */ });
    return () => { cancelled = true; };
  }, []);
  const [copiedNumber, setCopiedNumber] = useState(false);

  const getResolvedTransferCode = (item: any): string => {
    const cleanDom = (item.domain || item.id?.replace(/^domain_transfer_/, '') || '').trim().toLowerCase();
    let storedMap: Record<string, string> = {};
    try {
      storedMap = JSON.parse(localStorage.getItem('click2it_transfer_codes') || '{}');
    } catch {
      // ignore
    }
    return (
      item.authCode ||
      item.eppCode ||
      transferAuthCodes[item.id] ||
      (cleanDom ? transferAuthCodes[cleanDom] : '') ||
      storedMap[item.id] ||
      (cleanDom ? storedMap[cleanDom] : '') ||
      ''
    ).trim();
  };

  useEffect(() => {
    let storedMap: Record<string, string> = {};
    try {
      storedMap = JSON.parse(localStorage.getItem('click2it_transfer_codes') || '{}');
    } catch {
      // ignore
    }
    const initialCodes: Record<string, string> = { ...storedMap };
    items.forEach(i => {
      if (i.itemType === 'domain_transfer') {
        const cleanDom = (i.domain || i.id?.replace(/^domain_transfer_/, '') || '').trim().toLowerCase();
        const code = (i as any).authCode || (i as any).eppCode || storedMap[i.id] || (cleanDom ? storedMap[cleanDom] : '');
        if (code) {
          initialCodes[i.id] = code;
          if (cleanDom) initialCodes[cleanDom] = code;
        }
      }
    });
    if (Object.keys(initialCodes).length > 0) {
      setTransferAuthCodes(prev => ({ ...initialCodes, ...prev }));
    }
  }, [items]);

  useEffect(() => {
    const fetchBkashNumber = async () => {
      try {
        const res = await fetch(getApiUrl('/api/public/config'));
        const json = await res.json();
        if (json.success && json.data?.manualBkashNumber) {
          setBkashNumber(json.data.manualBkashNumber);
          return;
        }
      } catch (e) {
        // Suppress network error in dev and fall back
      }
      if ((settings as any)?.manualBkashNumber || settings?.bkashNumber) {
        setBkashNumber((settings as any)?.manualBkashNumber || settings?.bkashNumber || '01700000000');
      }
    };
    fetchBkashNumber();
  }, [settings]);

  const [userWalletBalance, setUserWalletBalance] = useState<number | null>(null);

  // Add Funds Modal State for Domain Hosting
  const [showAddFundModal, setShowAddFundModal] = useState<boolean>(false);
  const [addFundAmount, setAddFundAmount] = useState<string>('');
  const [addFundMethod, setAddFundMethod] = useState<'manual_bkash' | 'nagad' | 'bank_transfer'>('manual_bkash');
  const [addFundTrxId, setAddFundTrxId] = useState<string>('');
  const [addFundNotes, setAddFundNotes] = useState<string>('');
  const [submittingAddFund, setSubmittingAddFund] = useState<boolean>(false);

  const refreshWalletBalance = async () => {
    if (!user) return;
    try {
      const res = await apiClient.get('/api/customers/me/wallet');
      if (res.data?.success && typeof res.data.balance === 'number') {
        setUserWalletBalance(res.data.balance);
        return;
      }
    } catch {
      // fallback
    }
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists() && typeof snap.data()?.balance === 'number') {
        setUserWalletBalance(snap.data()?.balance);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmitAddFund = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(addFundAmount);
    if (!numAmt || numAmt <= 0) {
      toast.error('Please enter a valid deposit amount (min ৳100)');
      return;
    }
    if (!addFundTrxId.trim() || addFundTrxId.trim().length < 3) {
      toast.error('Please enter the payment Transaction ID (TrxID)');
      return;
    }
    if (!user) {
      toast.error('Please log in to submit a deposit request.');
      return;
    }

    setSubmittingAddFund(true);
    let success = false;
    try {
      const res = await apiClient.post('/api/customers/deposit-request', {
        amount: numAmt,
        paymentMethod: addFundMethod,
        transactionId: addFundTrxId.trim(),
        notes: addFundNotes.trim()
      });
      if (res.data?.success) {
        success = true;
      }
    } catch (err: any) {
      console.warn('API deposit submission failed, falling back to direct Firestore:', err);
    }

    if (!success) {
      try {
        const now = new Date().toISOString();
        const depRef = doc(collection(db, 'deposit_requests'));
        const depositData = {
          id: depRef.id,
          userId: user.uid,
          customerEmail: user.email || formData.email,
          customerName: user.displayName || `${formData.firstName} ${formData.lastName}`.trim() || 'Customer',
          amount: numAmt,
          paymentMethod: addFundMethod,
          transactionId: addFundTrxId.trim(),
          notes: addFundNotes.trim(),
          status: 'pending',
          createdAt: now,
          updatedAt: now
        };
        await setDoc(depRef, depositData);
        success = true;
      } catch (fErr: any) {
        toast.error(getFriendlyErrorMessage(fErr, 'Failed to submit deposit request. Please try again.'));
        setSubmittingAddFund(false);
        return;
      }
    }

    if (success) {
      toast.success('Funds deposit request submitted! Once verified by billing, your wallet balance will be credited.');
      setShowAddFundModal(false);
      if (!formData.transactionId) {
        setFormData(prev => ({ ...prev, transactionId: addFundTrxId.trim() }));
      }
      setAddFundAmount('');
      setAddFundTrxId('');
      setAddFundNotes('');
      await refreshWalletBalance();
    }
    setSubmittingAddFund(false);
  };

  useEffect(() => {
    if (user) {
      // 1. Try API
      apiClient.get('/api/customers/me/wallet')
        .then(res => {
          if (res.data?.success && typeof res.data.balance === 'number') {
            setUserWalletBalance(res.data.balance);
          }
        })
        .catch(e => console.warn('Failed to load wallet balance from API:', e));

      // 2. Direct Firestore check to ensure immediate balance display
      getDoc(doc(db, 'users', user.uid))
        .then(snap => {
          if (snap.exists()) {
            const bal = snap.data()?.balance;
            if (typeof bal === 'number') {
              setUserWalletBalance(bal);
            }
          }
        })
        .catch(e => console.warn('Direct Firestore wallet check:', e));
    }
  }, [user]);

  const hasDomain = items.some(i => i.itemType === 'domain');
  const hasVps = items.some(isVpsItem);
  const hasSharedHosting = items.some(i => i.itemType === 'hosting' && !isVpsItem(i));
  const hasHosting = items.some(i => i.itemType === 'hosting');
  const hasTransfer = items.some(i => i.itemType === 'domain_transfer');

  const [isProcessing, setIsProcessing] = useState(false);
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);

  if (items.length === 0) {
    navigate('/hosting/cart');
    return null;
  }

  // Auth Enforcement
  if (authLoading && !user) {
    return (
      <Layout fullWidth>
        <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 px-4 py-12">
          <div className="flex flex-col items-center gap-3 text-gray-600">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Verifying your account session...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout fullWidth>
        <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 px-4 py-12">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-500 mb-8">Please login or create an account to securely complete your hosting and domain purchase.</p>
            <div className="space-y-3">
              <Link
                to="/login?redirect=/hosting/checkout"
                onClick={(e) => {
                  e.preventDefault();
                  try {
                    navigate('/login?redirect=/hosting/checkout');
                  } catch {
                    window.location.href = '/login?redirect=/hosting/checkout';
                  }
                }}
                className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-md shadow-blue-200 cursor-pointer"
              >
                Login or Create Account
              </Link>
              <Link
                to="/register?redirect=/hosting/checkout"
                onClick={(e) => {
                  e.preventDefault();
                  try {
                    navigate('/register?redirect=/hosting/checkout');
                  } catch {
                    window.location.href = '/register?redirect=/hosting/checkout';
                  }
                }}
                className="block w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-xl transition-all text-sm cursor-pointer"
              >
                Create a New Account
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setIsValidatingCode(true);
    try {



      const q = query(
        collection(db, 'couponCodes'), 
        where('code', '==', discountCode.trim().toUpperCase()),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast.error('Invalid or inactive discount code');
        return;
      }

      const codeData: any = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      
      if (new Date(codeData.expiryDate) < new Date()) {
        toast.error('This discount code has expired');
        return;
      }

      setAppliedDiscount(codeData);
      toast.success(`Discount applied: ${codeData.discountPercentage}% off`);
    } catch (error) {
      console.error('Error validating discount code:', error);
      toast.error('Failed to validate discount code');
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.termsAccepted) {
      toast.error('You must agree to the Terms and Conditions.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, '').replace(/^(?:880|88)?0?/, '');
    const phoneRegex = /^1[3-9]\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      toast.error('Please enter a valid 10-digit Bangladeshi phone number starting with 1 (e.g. 17XXXXXXXX).');
      return;
    }
    const fullPhone = `+880${cleanPhone}`;

    if (hasSharedHosting && !hasDomain) {
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
      if (!hostingConfig.domain || !domainRegex.test(hostingConfig.domain)) {
        toast.error('Please enter a valid domain name for your hosting plan.');
        return;
      }
    }

    if (hasVps) {
      const hostname = vpsConfig.hostname.trim();
      const hostnameRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]{1,61}[a-zA-Z0-9]$/;
      if (!hostname || !hostnameRegex.test(hostname)) {
        toast.error('Please enter a valid server hostname (e.g., srv1.mydomain.com) for your Cloud VPS.');
        return;
      }
      if (!vpsConfig.rootPassword.trim() || vpsConfig.rootPassword.trim().length < 8) {
        toast.error('Please enter or generate a secure root password (at least 8 characters) for your Cloud VPS.');
        return;
      }
    }

    if (['card', 'nagad'].includes(formData.paymentMethod)) {
      toast.error('This payment method is coming soon.');
      return;
    }

    if (formData.paymentMethod === 'bkash' && !formData.transactionId.trim()) {
      toast.error('Please enter the Transaction ID for your bKash payment.');
      return;
    }

    const transferItems = items.filter(i => i.itemType === 'domain_transfer');
    for (const item of transferItems) {
      const code = getResolvedTransferCode(item);
      if (!code) {
        toast.error(`Please enter the Auth/EPP Code for ${item.domain || item.id.replace('domain_transfer_', '')}`);
        return;
      }
      if (code.length < 3) {
        toast.error(`Auth/EPP Code for ${item.domain || item.id.replace('domain_transfer_', '')} appears too short.`);
        return;
      }
    }

    setIsProcessing(true);

    try {
      if (user) {
        await user.getIdToken().catch(() => null);
      }

      let targetUserId =
        selectedTargetCustomer?.uid ||
        selectedTargetCustomer?.id ||
        (isImpersonating && impersonatedCustomer?.uid) ||
        user?.uid ||
        'guest';

      // If Admin chose "Create New Customer" mode and hasn't clicked "Create Customer Now" yet, create the customer account right now!
      if (canAccessAdmin && adminCustomerMode === 'create_new' && !selectedTargetCustomer) {
        const createdCustomer = await createCustomerAccountByAdmin({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: newCustomerPassword,
          phone: formData.phone,
          company: formData.company,
          address1: formData.address1,
          address2: formData.address2,
          city: formData.city || 'Dhaka',
          state: formData.state || formData.city || 'Dhaka',
          postcode: formData.postcode || '1000',
          country: formData.country || 'Bangladesh',
          sendWelcomeEmail: sendNewCustomerEmail,
        });
        targetUserId = createdCustomer.uid || createdCustomer.id;
        setSelectedTargetCustomer({ ...createdCustomer, plainPassword: newCustomerPassword });
        toast.success(`New customer account created (${createdCustomer.email})!`);
      }

      // Persist billing details on the target customer's profile document
      if (targetUserId && targetUserId !== 'guest') {
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();
        await setDoc(
          doc(db, 'users', targetUserId),
          {
            displayName: fullName.slice(0, 100),
            name: fullName.slice(0, 100),
            firstName: formData.firstName.trim().slice(0, 50),
            lastName: formData.lastName.trim().slice(0, 50),
            phone: fullPhone,
            mobile: fullPhone,
            company: (formData.company || '').trim().slice(0, 100),
            address: formData.address1.trim().slice(0, 300),
            address1: formData.address1.trim().slice(0, 200),
            address2: (formData.address2 || '').trim().slice(0, 100),
            city: formData.city.trim().slice(0, 100),
            state: (formData.state || formData.city).trim().slice(0, 100),
            zip: formData.postcode.trim().slice(0, 20),
            postcode: formData.postcode.trim().slice(0, 20),
            country: (formData.country || 'Bangladesh').trim().slice(0, 60),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(() => null);
      }

      let orderId = existingOrderId;
      const transferItems = items.filter(item => item.itemType === 'domain_transfer');

      if (!orderId) {
        // Retrieve affiliate referral if present
        let affiliateRef: string | null = null;
        try {
          const rawRef = localStorage.getItem('affiliate_ref');
          if (rawRef) {
            const parsed = JSON.parse(rawRef);
            if (parsed.code && (!parsed.expiry || parsed.expiry > Date.now())) {
              affiliateRef = parsed.code;
            }
          }
        } catch (e) {}

        // Authoritative Server-side Order Placement
        const token = user ? await user.getIdToken() : undefined;
        const res = await apiClient.post('/api/orders/create', {
          items,
          formData,
          domainConfig,
          hostingConfig,
          vpsConfig: hasVps ? vpsConfig : null,
          discountCode: appliedDiscount?.code || discountCode,
          targetUserId,
          affiliateRef
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!res.data?.success || !res.data?.orderId) {
          throw new Error(res.data?.error || 'Failed to place order on server.');
        }

        orderId = res.data.orderId;
        setExistingOrderId(orderId);
      } // End if (!orderId)

      // Store transfer auth codes securely via backend API
      if (transferItems.length > 0) {
        try {
          const authCodesPayload = transferItems
            .map(item => {
              const code = getResolvedTransferCode(item);
              const cleanDomain = (item.domain || item.id.replace('domain_transfer_', '')).trim().toLowerCase();
              return {
                orderId,
                domain: cleanDomain,
                authCode: code,
              };
            })
            .filter(entry => Boolean(entry.authCode));
          
          if (authCodesPayload.length > 0) {
            const token = user ? await user.getIdToken() : undefined;
            await apiPost('/api/domains/transfer-auth-codes', {
              orderId,
              authCodes: authCodesPayload,
            }, token);
          }
        } catch (error: any) {
          console.warn('Failed to store transfer auth codes via separate API (already stored in order):', error);
        }
      }

      // Process payment
      if (formData.paymentMethod === 'wallet_balance') {
        if (!user) {
          toast.error('Please log in to pay with Account Wallet Balance.');
          setIsProcessing(false);
          return;
        }

        let walletPaid = false;
        let payErrorMsg = '';
        try {
          const token = await user.getIdToken();
          const res = await apiClient.post('/api/customers/pay-order', { orderId }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data?.success) {
            walletPaid = true;
          } else if (res.data?.error) {
            payErrorMsg = res.data.error;
          }
        } catch (apiErr: any) {
          payErrorMsg = apiErr?.response?.data?.error || apiErr?.message || 'Payment processing failed.';
          console.error('API pay-order error:', apiErr);
        }

        if (walletPaid) {
          toast.success('Order paid instantly using Account Wallet Balance!');
          clearCart();
          navigate(`/order-success/${orderId}`);
          return;
        } else {
          throw new Error(payErrorMsg || 'Insufficient wallet balance or payment failed. Please add funds in User Profile or choose bKash.');
        }
      } else if (formData.paymentMethod === 'bkash') {
        clearCart();
        navigate(`/order-success/${orderId}`);
        return;
      } else if (formData.paymentMethod === 'eps') {
        const epsRes = await apiPost<{ success: boolean; redirectUrl?: string; error?: string }>('/api/payments/eps/initiate', { orderId });
        if (epsRes.success && epsRes.redirectUrl) {
          window.location.href = epsRes.redirectUrl;
          return;
        }
        throw new Error(epsRes.error || 'Failed to start online payment. Your order is saved; you can retry from your dashboard.');
      } else if (formData.paymentMethod === 'card') {
        const res = await initiateSSLCommerzPayment(
          orderId, 
          grandTotal, 
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
      } else if (formData.paymentMethod === 'nagad') {
        const res = await initiateNagadPayment(orderId, grandTotal, fullPhone);
        if (res.success && res.paymentUrl) {
          window.location.href = res.paymentUrl;
          return;
        } else {
          throw new Error(res.errorMessage || 'Failed to initiate Nagad payment');
        }
      }

      toast.success('Order completed successfully!');
      clearCart();
      navigate(`/order-success/${orderId}`);
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(getFriendlyErrorMessage(error, 'Unable to complete your order at this time. Please try again or reach out to our billing support.'));
      setIsProcessing(false);
    }
  };

  return (
    <Layout fullWidth>
      <div className="bg-gray-50 min-h-screen pb-20">
        {/* Header */}
        <div className="bg-[#0a1628] py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Secure Checkout</h1>
                <p className="text-blue-200 mt-1">Complete your order securely and quickly.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <form onSubmit={handleCompleteOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left Column (Forms) */}
            <div className="lg:col-span-2 space-y-6">

              {/* Admin Only: Order on Behalf of Customer / Create New Customer */}
              {canAccessAdmin && (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-blue-200 overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-white/15 rounded-xl">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-base font-extrabold text-white">
                          Admin Order Mode — Assign Order to Customer
                        </h2>
                        <p className="text-xs text-blue-100">
                          Select an existing customer or create a new customer account with password so they see this order in their dashboard
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white/15 p-1 rounded-xl text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminCustomerMode('existing');
                        }}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          adminCustomerMode === 'existing'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-white hover:bg-white/10'
                        }`}
                      >
                        Select Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTargetCustomer(null);
                          setAdminCustomerMode('create_new');
                        }}
                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                          adminCustomerMode === 'create_new'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-white hover:bg-white/10'
                        }`}
                      >
                        <UserPlus size={13} /> + New Customer
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {selectedTargetCustomer && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                          <div>
                            <p className="text-sm font-extrabold text-emerald-950">
                              Ordering for: {selectedTargetCustomer.displayName || selectedTargetCustomer.name || 'Customer'} ({selectedTargetCustomer.email})
                            </p>
                            <p className="text-xs text-emerald-800 mt-0.5">
                              Customer ID: #{selectedTargetCustomer.customerId || selectedTargetCustomer.uid?.slice(0, 8)}
                              {selectedTargetCustomer.plainPassword && (
                                <span className="ml-2 font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                                  Password: {selectedTargetCustomer.plainPassword}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedTargetCustomer(null)}
                          className="text-xs font-bold text-slate-600 hover:text-rose-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shrink-0"
                        >
                          Change Customer
                        </button>
                      </div>
                    )}

                    {adminCustomerMode === 'existing' && !selectedTargetCustomer && (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Search &amp; Select Customer Account
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="text"
                            placeholder="Search by customer name, email, or phone..."
                            value={customerSearchQuery}
                            onChange={e => setCustomerSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                          {allCustomers
                            .filter(c => {
                              if (!customerSearchQuery.trim()) return true;
                              const q = customerSearchQuery.toLowerCase();
                              return (
                                (c.displayName || c.name || '').toLowerCase().includes(q) ||
                                (c.email || '').toLowerCase().includes(q) ||
                                (c.phone || '').toLowerCase().includes(q)
                              );
                            })
                            .slice(0, 25)
                            .map(cust => (
                              <button
                                type="button"
                                key={cust.uid || cust.id}
                                onClick={() => {
                                  setSelectedTargetCustomer(cust);
                                  applyCustomerProfileToForm(cust);
                                  toast.success(`Selected customer: ${cust.displayName || cust.email}`);
                                }}
                                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                              >
                                <div>
                                  <p className="text-sm font-bold text-slate-800">
                                    {cust.displayName || cust.name || 'Customer'}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {cust.email} {cust.phone ? `• ${cust.phone}` : ''}
                                  </p>
                                </div>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                                  Select
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {adminCustomerMode === 'create_new' && !selectedTargetCustomer && (
                      <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                              <UserPlus size={16} className="text-blue-600" /> Create New Customer Login &amp; Set Password
                            </h4>
                            <p className="text-xs text-slate-600 mt-0.5">
                              Fill out the <strong>Billing Details</strong> below for the customer, and set their login password here:
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setNewCustomerPassword(generateCustomerPassword(10));
                                setShowNewCustomerPassword(true);
                              }}
                              className="text-xs font-bold px-2.5 py-1 bg-white text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100"
                            >
                              Generate Password
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(newCustomerPassword);
                                toast.success('Password copied!');
                              }}
                              className="text-xs font-bold px-2.5 py-1 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100"
                            >
                              Copy
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <input
                            type={showNewCustomerPassword ? 'text' : 'password'}
                            value={newCustomerPassword}
                            onChange={e => setNewCustomerPassword(e.target.value)}
                            placeholder="Set customer login password (min 6 chars)"
                            className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 outline-none focus:border-blue-600"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewCustomerPassword(!showNewCustomerPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showNewCustomerPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sendNewCustomerEmail}
                              onChange={e => setSendNewCustomerEmail(e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300"
                            />
                            <span>Email login credentials (Email &amp; Password) to customer</span>
                          </label>

                          <button
                            type="button"
                            disabled={creatingCustomerInline}
                            onClick={handleCreateCustomerFromCheckout}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            {creatingCustomerInline ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                            Create Customer Now (Or Auto-Create on Submit)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Cloud VPS Server Configuration */}
              {hasVps && (
                <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-indigo-50 bg-gradient-to-r from-indigo-50/80 to-purple-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                        <Terminal className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">Cloud VPS Server Configuration</h2>
                        <p className="text-xs text-gray-500">KVM Hardware Virtualization & Dedicated Resources</p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                      <Cpu size={12} /> Root Access
                    </span>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Server Hostname */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          <Globe size={15} className="text-indigo-600" /> Server Hostname *
                        </label>
                        <span className="text-[11px] text-gray-400">FQDN (e.g., srv1.mydomain.com)</span>
                      </div>
                      <input 
                        type="text" 
                        placeholder="e.g., srv1.yourdomain.com or server.company.io"
                        value={vpsConfig.hostname}
                        onChange={(e) => setVpsConfig({ ...vpsConfig, hostname: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-mono text-sm outline-none transition-all" 
                      />
                      <p className="text-xs text-gray-500">Your server's primary network hostname used for PTR and DNS identity.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Operating System */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          <Layers size={15} className="text-indigo-600" /> Operating System Template *
                        </label>
                        <select
                          value={vpsConfig.os}
                          onChange={(e) => setVpsConfig({ ...vpsConfig, os: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium bg-white outline-none transition-all"
                        >
                          <option value="Ubuntu 22.04 LTS">Ubuntu 22.04 LTS (Recommended)</option>
                          <option value="Ubuntu 24.04 LTS">Ubuntu 24.04 LTS (Latest LTS)</option>
                          <option value="Debian 12 Bookworm">Debian 12 Bookworm (Lightweight)</option>
                          <option value="AlmaLinux 9">AlmaLinux 9 (cPanel / Enterprise)</option>
                          <option value="Windows Server 2022">Windows Server 2022 (RDP Access)</option>
                        </select>
                        <p className="text-xs text-gray-500">Pre-installed operating system template image.</p>
                      </div>

                      {/* Datacenter Location */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          <Server size={15} className="text-indigo-600" /> Primary Datacenter Location *
                        </label>
                        <select
                          value={vpsConfig.serverLocation}
                          onChange={(e) => setVpsConfig({ ...vpsConfig, serverLocation: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-medium bg-white outline-none transition-all"
                        >
                          <option value="Dhaka, Bangladesh (BDIX Low-Latency)">Dhaka, Bangladesh (BDIX Low-Latency)</option>
                          <option value="Singapore (Equinix SG1 / Tier-4)">Singapore (Equinix SG1 / Tier-4)</option>
                          <option value="Frankfurt, Germany (Tier-3)">Frankfurt, Germany (Tier-3)</option>
                          <option value="Dallas, USA (Central Low-Latency)">Dallas, USA (Central Low-Latency)</option>
                        </select>
                        <p className="text-xs text-gray-500">Physical facility housing your virtual machine.</p>
                      </div>
                    </div>

                    {/* Root / Administrator Password */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          <Key size={15} className="text-indigo-600" /> Root / Administrator Password *
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={generateStrongPassword}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/60"
                          >
                            <Sparkles size={12} className="text-indigo-600" /> Generate Strong Password
                          </button>
                          {vpsConfig.rootPassword && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(vpsConfig.rootPassword);
                                setCopiedRootPassword(true);
                                toast.success("Password copied!");
                                setTimeout(() => setCopiedRootPassword(false), 2000);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              {copiedRootPassword ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                              {copiedRootPassword ? "Copied" : "Copy"}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="relative">
                        <input 
                          type={showRootPassword ? "text" : "password"} 
                          placeholder="Enter or generate a secure root password (min 8 chars)"
                          value={vpsConfig.rootPassword}
                          onChange={(e) => setVpsConfig({ ...vpsConfig, rootPassword: e.target.value })}
                          required
                          className="w-full px-4 py-2.5 pr-12 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-mono text-sm outline-none transition-all" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowRootPassword(!showRootPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        >
                          {showRootPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">You will need this password along with your Dedicated IPv4 to connect via SSH or Remote Desktop.</p>
                    </div>

                    {/* SSH Public Key (Optional) */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          <Terminal size={15} className="text-indigo-600" /> SSH Public Key (Optional)
                        </label>
                        <span className="text-[11px] text-gray-400">Recommended for Linux</span>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... or ssh-rsa AAAAB3NzaC1yc2E..."
                        value={vpsConfig.sshKey}
                        onChange={(e) => setVpsConfig({ ...vpsConfig, sshKey: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-mono text-xs outline-none transition-all resize-none"
                      />
                      <p className="text-xs text-gray-500">For passwordless, highly secure terminal access upon instance boot.</p>
                    </div>

                    {/* Server Setup Notes (Optional) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">
                        Custom Partition or Setup Notes (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Please pre-install Docker, aaPanel, or keep disk unpartitioned"
                        value={vpsConfig.notes}
                        onChange={(e) => setVpsConfig({ ...vpsConfig, notes: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Shared Hosting Domain Configuration */}
              {(hasSharedHosting || (hasHosting && !hasVps)) && !hasDomain && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Server className="w-5 h-5 text-blue-600" />
                      Shared Hosting Configuration
                    </h2>
                  </div>
                  <div className="p-6 space-y-3">
                    <h3 className="text-sm font-medium text-gray-900">Hosting Domain</h3>
                    <p className="text-sm text-gray-500">Please specify the domain name you will use for your cPanel hosting plan.</p>
                    <input 
                      type="text" 
                      placeholder="e.g., mydomain.com"
                      value={hostingConfig.domain}
                      onChange={(e) => setHostingConfig({...hostingConfig, domain: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
                    />
                  </div>
                </div>
              )}

              {/* Domain Nameservers Configuration */}
              {hasDomain && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-600" />
                      Domain Nameservers Configuration
                    </h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <h3 className="text-sm font-medium text-gray-900">Nameservers</h3>
                    
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                        <input 
                          type="radio" 
                          checked={!domainConfig.useCustomNs} 
                          onChange={() => setDomainConfig({...domainConfig, useCustomNs: false})}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Use Default Nameservers</p>
                          <p className="text-xs text-gray-500">ns1.click2itbd.com, ns2.click2itbd.com (Recommended)</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                        <input 
                          type="radio" 
                          checked={domainConfig.useCustomNs} 
                          onChange={() => setDomainConfig({...domainConfig, useCustomNs: true})}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Use Custom Nameservers</p>
                          <p className="text-xs text-gray-500">Enter your own nameservers below</p>
                        </div>
                      </label>
                    </div>

                    {domainConfig.useCustomNs && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">Nameserver 1</label>
                          <input 
                            type="text" 
                            value={domainConfig.ns1}
                            onChange={(e) => setDomainConfig({...domainConfig, ns1: e.target.value})}
                            placeholder="ns1.example.com"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700">Nameserver 2</label>
                          <input 
                            type="text" 
                            value={domainConfig.ns2}
                            onChange={(e) => setDomainConfig({...domainConfig, ns2: e.target.value})}
                            placeholder="ns2.example.com"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transfer Auth Code captured on /domain/transfer */}

              {/* Billing Details */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-lg font-semibold text-gray-900">Billing Details</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">First Name *</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Last Name *</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Email Address *</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-4 py-2.5 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 font-medium select-none text-sm">
                          +880
                        </span>
                        <input 
                          type="tel" 
                          name="phone" 
                          value={formData.phone} 
                          onChange={handleChange} 
                          placeholder="1XXXXXXXXX" 
                          maxLength={10} 
                          required 
                          className="flex-1 w-full px-4 py-2.5 rounded-r-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm" 
                        />
                      </div>
                      <p className="text-xs text-gray-400">Enter 10 digits starting with 1 (e.g. 17XXXXXXXX)</p>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">Company (Optional)</label>
                      <input type="text" name="company" value={formData.company} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">Street Address *</label>
                      <input type="text" name="address1" value={formData.address1} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">Address Line 2 (Optional)</label>
                      <input type="text" name="address2" value={formData.address2} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">City *</label>
                      <input type="text" name="city" value={formData.city} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">State/Region *</label>
                      <input type="text" name="state" value={formData.state} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Postcode *</label>
                      <input type="text" name="postcode" value={formData.postcode} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Country *</label>
                      <select name="country" value={formData.country} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white">
                        <option value="Bangladesh">Bangladesh</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {/* WHMCS Account Wallet Option */}
                    <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.paymentMethod === 'wallet_balance' ? 'border-emerald-600 bg-emerald-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                      <input type="radio" name="paymentMethod" value="wallet_balance" checked={formData.paymentMethod === 'wallet_balance'} onChange={handleChange} className="sr-only" />
                      <Wallet className={`w-8 h-8 mb-2 ${formData.paymentMethod === 'wallet_balance' ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-bold ${formData.paymentMethod === 'wallet_balance' ? 'text-emerald-900' : 'text-gray-700'}`}>Account Wallet</span>
                      <span className="text-[10px] text-emerald-700 font-extrabold mt-0.5">
                        {userWalletBalance !== null ? `৳${userWalletBalance.toLocaleString()}` : 'Instant Pay'}
                      </span>
                      {formData.paymentMethod === 'wallet_balance' && <div className="absolute top-2 right-2"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>}
                    </label>

                    <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.paymentMethod === 'bkash' ? 'border-pink-600 bg-pink-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                      <input type="radio" name="paymentMethod" value="bkash" checked={formData.paymentMethod === 'bkash'} onChange={handleChange} className="sr-only" />
                      <Wallet className={`w-8 h-8 mb-2 ${formData.paymentMethod === 'bkash' ? 'text-pink-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${formData.paymentMethod === 'bkash' ? 'text-pink-900' : 'text-gray-600'}`}>bKash</span>
                      {formData.paymentMethod === 'bkash' && <div className="absolute top-2 right-2"><CheckCircle className="w-4 h-4 text-pink-600" /></div>}
                    </label>

                    <label className="relative flex flex-col items-center justify-center p-4 rounded-xl border-2 border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed">
                      <input type="radio" name="paymentMethod" value="nagad" disabled className="sr-only" />
                      <Wallet className="w-8 h-8 mb-2 text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">Nagad</span>
                      <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-xl">
                        <span className="bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap">Coming Soon</span>
                      </div>
                    </label>

                    {epsEnabled ? (
                      <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.paymentMethod === 'eps' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                        <input type="radio" name="paymentMethod" value="eps" checked={formData.paymentMethod === 'eps'} onChange={handleChange} className="sr-only" />
                        <CreditCard className={`w-8 h-8 mb-2 ${formData.paymentMethod === 'eps' ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`text-sm font-bold ${formData.paymentMethod === 'eps' ? 'text-blue-900' : 'text-gray-700'}`}>Pay Online</span>
                        <span className="text-[10px] text-gray-500 mt-0.5 text-center">Card, bKash, Nagad, Rocket (EPS)</span>
                        {formData.paymentMethod === 'eps' && <div className="absolute top-2 right-2"><CheckCircle className="w-4 h-4 text-blue-600" /></div>}
                      </label>
                    ) : (
                    <label className="relative flex flex-col items-center justify-center p-4 rounded-xl border-2 border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed">
                      <input type="radio" name="paymentMethod" value="card" disabled className="sr-only" />
                      <CreditCard className="w-8 h-8 mb-2 text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">Credit Card</span>
                      <span className="text-[10px] text-gray-400 mt-1">Visa, Master</span>
                      <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-xl">
                        <span className="bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap">Coming Soon</span>
                      </div>
                    </label>
                    )}

                    <label className="relative flex flex-col items-center justify-center p-4 rounded-xl border-2 border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed">
                      <input type="radio" name="paymentMethod" value="bank" disabled className="sr-only" />
                      <Landmark className="w-8 h-8 mb-2 text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">Bank Transfer</span>
                      <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-xl">
                        <span className="bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap">Coming Soon</span>
                      </div>
                    </label>
                  </div>

                  {formData.paymentMethod === 'wallet_balance' && (
                    <div className="mt-6 p-5 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-200/90 rounded-2xl space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
                            <Wallet className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">Account Wallet Balance</h4>
                            <p className="text-xs text-gray-500">Instant 1-Click Payment</p>
                          </div>
                        </div>
                        <span className="text-xs font-black px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                          Instant Provisioning
                        </span>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Available Wallet Balance</span>
                            <button
                              type="button"
                              onClick={refreshWalletBalance}
                              title="Refresh balance"
                              className="text-gray-400 hover:text-emerald-600 transition-colors p-1 rounded-md hover:bg-slate-50"
                            >
                              <RefreshCw size={13} />
                            </button>
                          </div>
                          <div className="text-2xl font-black text-emerald-600 font-mono mt-0.5">
                            ৳{(userWalletBalance || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-gray-500 uppercase">Order Total</span>
                          <div className="text-lg font-black text-gray-900">
                            {formatCurrency(grandTotal)}
                          </div>
                        </div>
                      </div>

                      {(userWalletBalance || 0) < grandTotal ? (
                        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl space-y-3">
                          <div className="flex items-start gap-2.5 text-xs text-amber-900 font-medium">
                            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-amber-950">Insufficient Account Wallet Balance</p>
                              <p className="mt-0.5">
                                You need <strong>৳{(grandTotal - (userWalletBalance || 0)).toLocaleString()}</strong> more to pay using your account wallet balance.
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                const diff = Math.max(100, Math.ceil(grandTotal - (userWalletBalance || 0)));
                                setAddFundAmount(String(diff));
                                setShowAddFundModal(true);
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
                            >
                              <PlusCircle size={14} /> Add Funds to Wallet (৳{(grandTotal - (userWalletBalance || 0)).toLocaleString()})
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'bkash' }))}
                              className="px-3.5 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
                            >
                              <Wallet size={14} /> Pay with bKash Directly
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-emerald-800 font-medium">
                            ✓ You have sufficient funds! Upon clicking Complete Order, your wallet balance will be deducted and domain/hosting services provisioned immediately.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setAddFundAmount('500');
                              setShowAddFundModal(true);
                            }}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline shrink-0 ml-2"
                          >
                            + Top Up Extra
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {formData.paymentMethod === 'bkash' && (
                    <div className="mt-6 p-5 bg-gradient-to-b from-pink-50/70 via-pink-50/30 to-white border border-pink-200/90 rounded-2xl space-y-4 shadow-sm">
                      {/* bKash Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-pink-600 flex items-center justify-center text-white shadow-sm shadow-pink-200">
                            <Wallet className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">bKash Manual Payment</h4>
                            <p className="text-xs text-gray-500">Make Payment</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 bg-pink-100 text-pink-700 rounded-full">
                          Make Payment
                        </span>
                      </div>
                      
                      {/* Number and Amount Card */}
                      <div className="bg-white p-4 rounded-xl border border-pink-200 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">bKash Personal Number</span>
                            <div className="text-2xl font-black text-pink-600 tracking-wider font-mono mt-0.5">
                              {bkashNumber || settings?.bkashNumber || '01727666677'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const num = bkashNumber || settings?.bkashNumber || '01727666677';
                              await navigator.clipboard.writeText(num);
                              setCopiedNumber(true);
                              toast.success('bKash number copied!');
                              setTimeout(() => setCopiedNumber(false), 2000);
                            }}
                            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                              copiedNumber 
                                ? 'bg-emerald-600 text-white shadow-emerald-200' 
                                : 'bg-pink-600 hover:bg-pink-700 text-white shadow-pink-200'
                            }`}
                          >
                            {copiedNumber ? <Check size={14} /> : <Copy size={14} />}
                            {copiedNumber ? 'Copied' : 'Copy Number'}
                          </button>
                        </div>

                        <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-sm">
                          <span className="text-gray-600 font-medium">Amount to Pay:</span>
                          <span className="text-lg font-black text-gray-900">{formatCurrency(grandTotal)}</span>
                        </div>
                      </div>

                      {/* Step-by-Step Instructions */}
                      <div className="bg-pink-50/50 rounded-xl p-3.5 border border-pink-100 space-y-2">
                        <p className="text-xs font-bold text-pink-950 flex items-center gap-1.5">
                          <CheckCircle size={14} className="text-pink-600" /> How to Pay:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                          <div className="flex items-start gap-2 bg-white/80 p-2 rounded-lg border border-pink-100/60">
                            <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-700 font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                            <span>Open bKash App & tap <strong>Make Payment</strong></span>
                          </div>
                          <div className="flex items-start gap-2 bg-white/80 p-2 rounded-lg border border-pink-100/60">
                            <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-700 font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                            <span>Send exact <strong>{formatCurrency(grandTotal)}</strong></span>
                          </div>
                          <div className="flex items-start gap-2 bg-white/80 p-2 rounded-lg border border-pink-100/60">
                            <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-700 font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                            <span>Copy the <strong>Transaction ID (TrxID)</strong></span>
                          </div>
                          <div className="flex items-start gap-2 bg-white/80 p-2 rounded-lg border border-pink-100/60">
                            <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-700 font-bold text-[11px] flex items-center justify-center shrink-0">4</span>
                            <span>Paste TrxID below & click <strong>Complete Order</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Transaction ID Input */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                            bKash Transaction ID (TrxID) <span className="text-red-500">*</span>
                          </label>
                          {formData.transactionId?.trim() && (
                            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                              <Check size={12} /> TrxID entered
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          name="transactionId"
                          value={formData.transactionId || ''}
                          onChange={handleChange}
                          placeholder="e.g. 9J87K12L3M"
                          maxLength={64}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-4 focus:ring-pink-100 text-sm font-mono uppercase tracking-wider font-semibold text-gray-900 bg-white outline-none transition-all placeholder:font-sans placeholder:normal-case placeholder:font-normal placeholder:text-gray-400"
                        />
                        {formData.paymentMethod === 'bkash' && !formData.transactionId?.trim() && (
                          <p className="text-xs text-rose-500 font-medium">Please enter the Transaction ID from your bKash confirmation.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column (Sticky Order Summary) */}
            <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-6">
              <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
                </div>
                
                <div className="p-6">
                  {/* Items List */}
                  <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {items.map((item) => {
                      const itemIsVps = isVpsItem(item);
                      const itemIsTransfer = item.category === 'domain_transfer' || item.itemType === 'domain_transfer';
                      const resolvedAuthCode = itemIsTransfer ? getResolvedTransferCode(item) : '';
                      return (
                        <div key={item.id} className="flex justify-between items-start text-sm pb-2.5 border-b border-gray-50 last:border-0">
                          <div className="flex-1 pr-4">
                            <p className="font-bold text-gray-900 line-clamp-2">{item.name}</p>
                            <div className="text-gray-500 mt-0.5 text-xs flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${itemIsVps ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'}`}>
                                  {item.itemType === 'domain' || itemIsTransfer
                                    ? `${item.termYears || 1} Year${(item.termYears || 1) > 1 ? 's' : ''}` 
                                    : (item.billingCycle === 'monthly' ? 'Monthly' : `${item.termYears || 1} Year${(item.termYears || 1) > 1 ? 's' : ''}`)}
                                </span>
                                {itemIsVps && (
                                  <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                                    KVM VPS
                                  </span>
                                )}
                                {itemIsTransfer && resolvedAuthCode && (
                                  <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                                    ✓ Auth/EPP Code Attached
                                  </span>
                                )}
                                <span>{item.description || ''}</span>
                              </div>
                              {itemIsTransfer && !resolvedAuthCode && (
                                <div className="mt-1.5">
                                  <input
                                    type="text"
                                    placeholder="Enter Auth/EPP Code"
                                    value={transferAuthCodes[item.id] || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setTransferAuthCodes(prev => ({ ...prev, [item.id]: val }));
                                      updateCartItem(item.id, { authCode: val.trim(), eppCode: val.trim() });
                                      try {
                                        const domainKey = (item.domainName || item.name.replace(/^Domain Transfer:\s*/i, '')).trim().toLowerCase();
                                        const saved = JSON.parse(localStorage.getItem('click2it_transfer_codes') || '{}');
                                        saved[domainKey] = val.trim();
                                        localStorage.setItem('click2it_transfer_codes', JSON.stringify(saved));
                                      } catch {
                                        // ignore storage error
                                      }
                                    }}
                                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-amber-300 bg-amber-50/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                  />
                                </div>
                              )}
                              {itemIsVps && (
                                <p className="text-[11px] text-gray-600 font-mono">
                                  {vpsConfig.hostname ? `Host: ${vpsConfig.hostname}` : 'Host: [Pending]'} • {vpsConfig.os}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="font-black text-gray-900 whitespace-nowrap">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Totals */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(hostingSubtotal)}</span>
                    </div>
                    
                    {appliedDiscount && (
                      <div className="flex justify-between text-green-600 font-medium text-sm">
                        <div className="flex items-center gap-1">
                          <span>Discount ({appliedDiscount.code})</span>
                          <button type="button" onClick={handleRemoveDiscount} className="text-gray-400 hover:text-red-500">
                            <span className="text-xs ml-1">[Remove]</span>
                          </button>
                        </div>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}

                    {!appliedDiscount && (
                      <div className="pt-2 pb-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Discount Code"
                            value={discountCode}
                            onChange={e => setDiscountCode(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 uppercase"
                          />
                          <button
                            type="button"
                            onClick={handleApplyDiscount}
                            disabled={isValidatingCode || !discountCode.trim()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                          >
                            {isValidatingCode ? '...' : 'Apply'}
                          </button>
                        </div>
                      </div>
                    )}

                    {shippingCost > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Taxes & Fees</span>
                        <span>{formatCurrency(shippingCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-end pt-3 border-t border-gray-100">
                      <div>
                        <span className="block text-sm text-gray-500">Total Due Today</span>
                        <span className="block text-2xl font-bold text-gray-900 leading-none mt-1">{formatCurrency(grandTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="mt-8 mb-6">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center mt-0.5">
                        <input type="checkbox" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} className="peer sr-only" />
                        <div className="w-5 h-5 border-2 border-gray-300 rounded transition-all peer-checked:bg-blue-600 peer-checked:border-blue-600 group-hover:border-blue-500"></div>
                        <CheckCircle className="w-3.5 h-3.5 text-white absolute opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all pointer-events-none" />
                      </div>
                      <span className="text-sm text-gray-600 leading-tight">
                        I have read and agree to the <Link to="/terms" target="_blank" className="text-blue-600 hover:underline">Terms of Service</Link> and <Link to="/privacy" target="_blank" className="text-blue-600 hover:underline">Privacy Policy</Link>.
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isProcessing || !formData.termsAccepted}
                    className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Complete Order
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  {/* Trust Badges */}
                  <div className="mt-6 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <ShieldCheck className="w-5 h-5 text-green-500" />
                      <span>Secure 256-bit SSL Encryption</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>30-Day Money-Back Guarantee</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </form>
        </div>
      </div>
    </Layout>
  );
};











