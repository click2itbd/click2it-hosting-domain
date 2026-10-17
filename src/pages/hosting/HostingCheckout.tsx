import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { Layout } from '../../components/Layout';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { Lock, ShieldCheck, Terminal, CheckCircle, CreditCard, Landmark, Wallet, ArrowRight, Loader2, Server, Key, Copy, Check, Eye, EyeOff, Sparkles, RefreshCw, Globe, Cpu, Layers, AlertCircle, PlusCircle } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, setDoc, writeBatch } from 'firebase/firestore';
import { generateDocumentNumber } from '../../lib/numbering';
import { initiateBkashPayment, initiateSSLCommerzPayment, initiateNagadPayment } from '../../services/paymentApi';
import { apiPost, getApiUrl, apiClient } from '../../services/apiClient';

export const HostingCheckout: React.FC = () => {
  const { user } = useAuth();
  const { items: allItems, total, clearCart } = useCart();
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
    email: user?.email || '',
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

  const [transferAuthCodes, setTransferAuthCodes] = useState<Record<string, string>>({});
  const [bkashNumber, setBkashNumber] = useState('');
  const [copiedNumber, setCopiedNumber] = useState(false);

  useEffect(() => {
    const initialCodes: Record<string, string> = {};
    items.forEach(i => {
      if (i.itemType === 'domain_transfer') {
        const code = (i as any).authCode || (i as any).eppCode;
        if (code) {
          initialCodes[i.id] = code;
          if (i.domain) initialCodes[i.domain] = code;
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
        toast.error(fErr?.message || 'Failed to submit deposit request');
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
              <button
                onClick={() => navigate('/login?redirect=/hosting/checkout')}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-md shadow-blue-200"
              >
                Login or Create Account
              </button>
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
      const code = (transferAuthCodes[item.id] || transferAuthCodes[item.domain])?.trim();
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
      let orderId = existingOrderId;

      if (!orderId) {
      const docType = 'INV'; 
      const docNumber = await generateDocumentNumber(docType);

      const orderData = {
        userId: user?.uid || 'guest',
        platform: 'hosting',
        items: items.map(({ eppCode: _eppCode, authCode: _authCode, ...item }) => {
          const code = item.itemType === 'domain_transfer' ? (transferAuthCodes[item.id]?.trim() || transferAuthCodes[item.domain]?.trim()) : undefined;
          return {
            ...item,
            isDigital: true,
            ...(code ? { authCode: code, eppCode: code } : {}),
          };
        }),
        total: grandTotal,
        shippingCost,
        status: 'pending',
        paymentStatus: formData.paymentMethod === 'bkash' && formData.transactionId?.trim() ? 'submitted' : 'pending',
        paymentSubmittedAt: formData.paymentMethod === 'bkash' && formData.transactionId?.trim() ? new Date().toISOString() : null,
        type: 'invoice',
        documentNumber: docNumber,
        customerName: `${formData.firstName} ${formData.lastName}`.trim(),
        customerEmail: formData.email,
        customerPhone: fullPhone,
        shippingAddress: `${formData.address1}, ${formData.address2 ? formData.address2 + ', ' : ''}${formData.city}, ${formData.state} - ${formData.postcode}, ${formData.country}`,
        company: formData.company,
        paymentMethod: formData.paymentMethod,
        transactionId: ['bkash', 'bank'].includes(formData.paymentMethod) ? formData.transactionId.trim() : null,
        discountAmount: discountAmount,
        appliedDiscountCode: appliedDiscount ? appliedDiscount.code : null,
        vpsConfig: hasVps ? {
          hostname: vpsConfig.hostname.trim(),
          os: vpsConfig.os,
          serverLocation: vpsConfig.serverLocation,
          rootPassword: vpsConfig.rootPassword,
          sshKey: vpsConfig.sshKey.trim(),
          notes: vpsConfig.notes.trim()
        } : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const batch = writeBatch(db);
      const newOrderRef = doc(collection(db, 'orders'));
      batch.set(newOrderRef, orderData);
      
      
      
      const sslItems = items.filter(item => item.itemType === 'ssl');
      for (const sslItem of sslItems) {
        const sOrderRef = doc(collection(db, 'sslOrders'));
        batch.set(sOrderRef, {
          userId: user?.uid || 'guest',
          orderId: newOrderRef.id,
          productId: sslItem.id.split('_')[0] + '_' + sslItem.id.split('_')[1], // e.g. ssl_positive
          name: sslItem.name,
          termYears: sslItem.termYears || 1,
          price: sslItem.price,
          status: 'pending_configuration', // User needs to enter CSR later
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      const domainItems = items.filter(item => item.itemType === 'domain');
      
      const renewalItems = items.filter(item => item.itemType === 'domain_renewal');
      const transferItems = items.filter(item => item.itemType === 'domain_transfer');


      const hostingItems = items.filter(item => item.itemType === 'hosting' || item.itemType === 'vps' || isVpsItem(item));

      for (const domainItem of domainItems) {
        const domain = domainItem.id.replace('domain_', '');
        const tld = domainItem.domainTld || domain.split('.').pop() || '';
        const dOrderRef = doc(collection(db, 'domainOrders'));
        batch.set(dOrderRef, {
          userId: user?.uid || 'guest',
          orderId: newOrderRef.id,
          domain: domain,
          tld: tld,
          termYears: domainItem.termYears || 1,
          price: domainItem.price,
          nameservers: domainConfig.useCustomNs
            ? [domainConfig.ns1.trim(), domainConfig.ns2.trim()].filter(Boolean)
            : ['ns1.click2itbd.com', 'ns2.click2itbd.com'],
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      
      for (const rItem of renewalItems) {
        const dOrderRef = doc(collection(db, 'domainOrders'));
        batch.set(dOrderRef, {
          userId: user?.uid || 'guest',
          orderId: newOrderRef.id,
          domain: rItem.domain,
          tld: rItem.domain.split('.').pop() || '',
          termYears: rItem.termYears || 1,
          price: rItem.price,
          status: 'pending',
          action: 'renewal',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      
      for (const tItem of transferItems) {
        const dOrderRef = doc(collection(db, 'domainOrders'));
        const code = (transferAuthCodes[tItem.id] || transferAuthCodes[tItem.domain])?.trim() || '';
        const domainClean = (tItem.domain || tItem.id.replace('domain_transfer_', '')).trim().toLowerCase();
        batch.set(dOrderRef, {
          userId: user?.uid || 'guest',
          orderId: newOrderRef.id,
          domain: domainClean,
          tld: domainClean.split('.').pop() || '',
          termYears: tItem.termYears || 1,
          years: tItem.termYears || 1,
          price: tItem.price,
          status: 'pending',
          type: 'transfer',
          ...(code ? { authCode: code, eppCode: code } : {}),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      for (const hostingItem of hostingItems) {
        const hAccountRef = doc(collection(db, 'hostingAccounts'));
        const isItemVps = isVpsItem(hostingItem);
        const packageSlug = hostingItem.planSlug || hostingItem.planId || hostingItem.id.replace('hosting_', '').replace('dynamic-hosting-', '').split('-')[0] || (isItemVps ? 'vps_starter' : 'starter');
        
        batch.set(hAccountRef, {
          userId: user?.uid || 'guest',
          orderId: newOrderRef.id,
          planId: packageSlug,
          domain: isItemVps ? vpsConfig.hostname.trim() : (hostingConfig.domain || null),
          provider: isItemVps ? 'vps' : 'cpanel',
          type: isItemVps ? 'vps' : 'shared',
          status: 'pending',
          provisioningStatus: 'pending',
          billingCycle: hostingItem.billingCycle || 'monthly',
          autoRenew: false,
          isCustomPackage: Boolean((hostingItem as any).isCustomPackage),
          customSpecs: (hostingItem as any).customSpecs || null,
          priceBreakdown: (hostingItem as any).priceBreakdown || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(isItemVps ? {
            vpsDetails: {
              hostname: vpsConfig.hostname.trim(),
              os: vpsConfig.os,
              serverLocation: vpsConfig.serverLocation,
              controlPanel: (hostingItem as any).details?.controlPanel || 'None',
              rootPassword: vpsConfig.rootPassword,
              sshKey: vpsConfig.sshKey.trim(),
              notes: vpsConfig.notes.trim(),
              cores: hostingItem.details?.cores || '2 vCPU',
              ram: hostingItem.details?.ram || '4 GB',
              storage: hostingItem.details?.storage || '60 GB NVMe',
              bandwidth: hostingItem.details?.bandwidth || '2 TB',
              ipv4: hostingItem.details?.ipv4 || '1 Dedicated IPv4'
            }
          } : {
            cpanelDetails: typeof hostingItem.details === 'object' ? hostingItem.details : null
          })
        });

        // Also write to hostingOrders collection with explicit fields
        const hostingOrderDocRef = doc(collection(db, 'hostingOrders'), newOrderRef.id);
        batch.set(hostingOrderDocRef, {
          ...orderData,
          id: newOrderRef.id,
          orderId: newOrderRef.id,
          packageSlug: packageSlug,
          billingCycle: hostingItem.billingCycle || 'monthly',
          price: grandTotal,
          isCustomPackage: Boolean((hostingItem as any).isCustomPackage),
          customSpecs: (hostingItem as any).customSpecs || null,
          priceBreakdown: (hostingItem as any).priceBreakdown || null,
          domain: isItemVps ? vpsConfig.hostname.trim() : (hostingConfig.domain || ''),
          customerInfo: {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.email,
            phone: fullPhone,
            address: formData.address1,
            city: formData.city,
            country: formData.country,
          },
          status: 'pending',
          vpsConfig: isItemVps ? {
            hostname: vpsConfig.hostname.trim(),
            os: vpsConfig.os,
            serverLocation: vpsConfig.serverLocation,
            rootPassword: vpsConfig.rootPassword,
            sshKey: vpsConfig.sshKey.trim(),
            notes: vpsConfig.notes.trim()
          } : null
        });
      }

      await batch.commit();
      
      // Notify Admin
      try {
        if (user) {
          const token = await user.getIdToken();
          await apiPost('/api/send-email/notify-admin-new-order', { orderId: newOrderRef.id, orderData }, token);
        }
      } catch (err) {
        console.error('Failed to notify admin:', err);
      }
      
      orderId = newOrderRef.id;
        setExistingOrderId(orderId);
      } // End if (!orderId)

      // Store transfer auth codes securely via backend API
      if (transferItems.length > 0) {
        try {
          const authCodesPayload = transferItems
            .map(item => {
              const code = (transferAuthCodes[item.id] || transferAuthCodes[item.domain])?.trim() || '';
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
          console.error('Failed to store transfer auth codes:', error);
          toast.error(error?.message || 'Failed to secure transfer authorization codes. Please try again.');
          setIsProcessing(false);
          return;
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
        try {
          const token = await user.getIdToken();
          const res = await apiClient.post('/api/customers/pay-order', { orderId }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data?.success) {
            walletPaid = true;
          }
        } catch (apiErr: any) {
          console.warn('API pay-order error, attempting direct Firestore fallback:', apiErr);
        }

        // Direct fallback if API was unreachable
        if (!walletPaid) {
          try {
            const userDocSnap = await getDoc(doc(db, 'users', user.uid));
            const currentBal = typeof userDocSnap.data()?.balance === 'number' ? userDocSnap.data()?.balance : 0;
            if (currentBal >= grandTotal) {
              const newBal = currentBal - grandTotal;
              const now = new Date().toISOString();
              await updateDoc(doc(db, 'users', user.uid), { balance: newBal, updatedAt: now });
              await updateDoc(doc(db, 'orders', orderId), {
                paymentStatus: 'verified',
                paymentMethod: 'wallet_balance',
                status: 'completed',
                paidAt: now,
                updatedAt: now
              });
              const txDoc = doc(collection(db, 'wallet_transactions'));
              await setDoc(txDoc, {
                id: txDoc.id,
                userId: user.uid,
                customerEmail: user.email || formData.email,
                type: 'debit',
                amount: grandTotal,
                balanceBefore: currentBal,
                balanceAfter: newBal,
                reason: `Payment for Order #${orderId.slice(0, 8)}`,
                orderId,
                createdAt: now
              });
              walletPaid = true;
            }
          } catch (fErr) {
            console.error('Direct Firestore wallet payment failed:', fErr);
          }
        }

        if (walletPaid) {
          toast.success('Order paid instantly using Account Wallet Balance!');
          clearCart();
          navigate(`/order-success/${orderId}`);
          return;
        } else {
          throw new Error('Insufficient wallet balance or payment failed. Please add funds in User Profile or choose bKash.');
        }
      } else if (formData.paymentMethod === 'bkash') {
        clearCart();
        navigate(`/order-success/${orderId}`);
        return;
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
      toast.error(error.message || 'Failed to place order');
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

              {/* Transfer Auth Codes */}
              {hasTransfer && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Key className="w-5 h-5 text-blue-600" />
                      Transfer Authorization Codes
                    </h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">Please provide the Auth/EPP Code for each domain you are transferring. These codes are required by your current registrar to authorize the transfer.</p>
                    {items.filter(i => i.itemType === 'domain_transfer').map((item) => (
                      <div key={item.id} className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">
                          Auth/EPP Code for <span className="text-blue-600 font-semibold">{item.domain || item.id.replace('domain_transfer_', '')}</span>
                        </label>
                        <input
                          type="text"
                          value={transferAuthCodes[item.id] ?? transferAuthCodes[item.domain] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTransferAuthCodes(prev => ({
                              ...prev,
                              [item.id]: val,
                              ...(item.domain ? { [item.domain]: val } : {}),
                            }));
                          }}
                          placeholder="e.g. 5xP#9mQ!zL12"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-mono text-sm"
                          required
                        />
                        <p className="text-xs text-gray-500">
                          Make sure your domain is <strong>unlocked</strong> at your current registrar and privacy protection is disabled or allows transfer.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

                    <label className="relative flex flex-col items-center justify-center p-4 rounded-xl border-2 border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed">
                      <input type="radio" name="paymentMethod" value="card" disabled className="sr-only" />
                      <CreditCard className="w-8 h-8 mb-2 text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">Credit Card</span>
                      <span className="text-[10px] text-gray-400 mt-1">Visa, Master</span>
                      <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-xl">
                        <span className="bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap">Coming Soon</span>
                      </div>
                    </label>

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
                      return (
                        <div key={item.id} className="flex justify-between items-start text-sm pb-2.5 border-b border-gray-50 last:border-0">
                          <div className="flex-1 pr-4">
                            <p className="font-bold text-gray-900 line-clamp-2">{item.name}</p>
                            <div className="text-gray-500 mt-0.5 text-xs flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${itemIsVps ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'}`}>
                                  {item.itemType === 'domain' 
                                    ? `${item.termYears || 1} Year${(item.termYears || 1) > 1 ? 's' : ''}` 
                                    : (item.billingCycle === 'monthly' ? 'Monthly' : `${item.termYears || 1} Year${(item.termYears || 1) > 1 ? 's' : ''}`)}
                                </span>
                                {itemIsVps && (
                                  <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                                    KVM VPS
                                  </span>
                                )}
                                <span>{item.description || ''}</span>
                              </div>
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











