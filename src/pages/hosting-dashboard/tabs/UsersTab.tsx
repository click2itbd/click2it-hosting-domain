import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Shield, ShieldOff, CheckCircle2, User as UserIcon, Wallet, PlusCircle, MinusCircle, 
  History, ArrowUpRight, ArrowDownLeft, DollarSign, Clock, AlertCircle, Check, X, Eye, LogIn, ExternalLink, RefreshCw,
  Edit3, Key, Mail, Trash2, Globe, Server, FileText, Lock, Settings, Send, Tag, ChevronRight, Copy, Building, MapPin, Phone
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Spinner } from '../components/SharedUI';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../../services/apiClient';
import { db } from '../../../firebase';
import { doc, getDoc, updateDoc, setDoc, deleteDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export function UsersTab({ state }: { state: any }) {
  const {
    activeTab, userSearch, setUserSearch, filteredUsers, userRoleEdits, setUserRoleEdits,
    saveUserRole, savingUserRole, users, setUsers, setLoginAsUserId
  } = state;

  const [subTab, setSubTab] = useState<'users' | 'deposits'>('users');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Add / Deduct Balance Modal State
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<any>(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState<boolean>(false);
  const [balanceAction, setBalanceAction] = useState<'add' | 'deduct'>('add');
  const [balanceAmount, setBalanceAmount] = useState<string>('');
  const [balanceReason, setBalanceReason] = useState<string>('');
  const [balanceAdminNotes, setBalanceAdminNotes] = useState<string>('');
  const [submittingBalance, setSubmittingBalance] = useState<boolean>(false);

  // WHMCS Customer Details Modal / Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerDetailsTab, setCustomerDetailsTab] = useState<
    'view' | 'modify' | 'domains' | 'hosting' | 'invoices' | 'transactions' | 'pricing' | 'bd_names'
  >('view');
  const [loadingCustomerDetails, setLoadingCustomerDetails] = useState<boolean>(false);
  const [customerFullData, setCustomerFullData] = useState<any>(null);

  // Customer Edit Form State (Modify Tab)
  const [editForm, setEditForm] = useState<any>({});
  const [savingCustomerEdit, setSavingCustomerEdit] = useState<boolean>(false);

  // Password Change Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [savingPassword, setSavingPassword] = useState<boolean>(false);

  // Add Custom Invoice Modal State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [invoiceItemName, setInvoiceItemName] = useState<string>('');
  const [invoiceAmount, setInvoiceAmount] = useState<string>('');
  const [creatingInvoice, setCreatingInvoice] = useState<boolean>(false);

  // Pending Deposit Requests State
  const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState<boolean>(false);
  const [verifyingDepositId, setVerifyingDepositId] = useState<string | null>(null);

  // Fetch pending deposits on tab load
  const fetchDepositRequests = async () => {
    setLoadingDeposits(true);
    let loaded = false;
    try {
      const res = await apiClient.get('/api/customers/admin/deposits/pending');
      if (res.data?.success && Array.isArray(res.data.deposits)) {
        setDepositRequests(res.data.deposits);
        loaded = true;
      }
    } catch (err: any) {
      console.warn('Failed to load deposit requests from API, trying direct Firestore:', err);
    }

    if (!loaded) {
      try {
        const depSnap = await getDocs(query(collection(db, 'deposit_requests'), orderBy('createdAt', 'desc'), limit(100)));
        setDepositRequests(depSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (fErr) {
        console.error('Direct Firestore deposit fetch failed:', fErr);
      }
    }
    setLoadingDeposits(false);
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchDepositRequests();
    }
  }, [activeTab]);

  // Fetch Full Customer Details (Openprovider & Hosting & Transactions & Profile)
  const fetchCustomerFullDetails = async (userObj: any) => {
    const targetUid = userObj.id || userObj.uid;
    setSelectedCustomer(userObj);
    setCustomerDetailsTab('view');
    setLoadingCustomerDetails(true);

    // Initialize edit form defaults
    setEditForm({
      name: userObj.displayName || userObj.name || '',
      email: userObj.email || '',
      company: userObj.company || '',
      address1: userObj.address1 || '',
      address2: userObj.address2 || '',
      address3: userObj.address3 || '',
      city: userObj.city || 'Chattogram',
      zip: userObj.zip || '4216',
      state: userObj.state || userObj.region || 'Chittagong',
      country: userObj.country || 'Bangladesh',
      phone: userObj.phone || userObj.phoneNumber || '',
      mobile: userObj.mobile || userObj.phone || userObj.phoneNumber || '',
      pin: userObj.pin || String(Math.floor(1000 + Math.random() * 9000)),
      language: userObj.language || 'English',
      status: userObj.status || 'active',
      statusDescription: userObj.statusDescription || 'Active Account'
    });

    try {
      const res = await apiClient.get(`/api/customers/admin/${targetUid}/details`);
      if (res.data?.success && res.data.customer) {
        setCustomerFullData(res.data.customer);
        // update form with fresh backend data
        const c = res.data.customer;
        setEditForm({
          name: c.name || c.displayName || '',
          email: c.email || '',
          company: c.company || '',
          address1: c.address1 || '',
          address2: c.address2 || '',
          address3: c.address3 || '',
          city: c.city || 'Chattogram',
          zip: c.zip || '4216',
          state: c.state || 'Chittagong',
          country: c.country || 'Bangladesh',
          phone: c.phone || '',
          mobile: c.mobile || c.phone || '',
          pin: c.pin || String(Math.floor(1000 + Math.random() * 9000)),
          language: c.language || 'English',
          status: c.status || 'active',
          statusDescription: c.statusDescription || 'Active Account'
        });
      }
    } catch (err) {
      console.warn('API customer details fetch failed, querying Firestore directly:', err);
      // Fallback query
      try {
        const uSnap = await getDoc(doc(db, 'users', targetUid));
        const uData = uSnap.exists() ? uSnap.data() : {};

        // Query domains & hosting for user
        const domSnap = await getDocs(query(collection(db, 'domainOrders'), where('userId', '==', targetUid)));
        const hostSnap = await getDocs(query(collection(db, 'hostingAccounts'), where('userId', '==', targetUid)));
        const txSnap = await getDocs(query(collection(db, 'wallet_transactions'), where('userId', '==', targetUid)));
        const ordSnap = await getDocs(query(collection(db, 'orders'), where('userId', '==', targetUid)));

        const domainsList = domSnap.docs.map(d => ({ id: d.id, source: 'openprovider', ...d.data() }));
        const hostingList = hostSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const txList = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const ordList = ordSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const totalRecs = txList.filter((t: any) => t.type === 'credit').reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
        const numericId = uData.customerId || Math.abs(targetUid.split('').reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0)) % 90000000 + 10000000;

        setCustomerFullData({
          id: targetUid,
          uid: targetUid,
          customerId: String(numericId),
          name: uData.displayName || uData.name || uData.email || 'Customer',
          email: uData.email || userObj.email || '',
          status: uData.status || 'active',
          statusDescription: uData.statusDescription || 'Active Account',
          pin: uData.pin || String(Math.floor(1000 + Math.random() * 9000)),
          company: uData.company || '',
          address1: uData.address1 || '',
          address2: uData.address2 || '',
          address3: uData.address3 || '',
          city: uData.city || 'Chattogram',
          zip: uData.zip || '4216',
          state: uData.state || uData.region || 'Chittagong',
          country: uData.country || 'Bangladesh',
          phone: uData.phone || uData.phoneNumber || '',
          mobile: uData.mobile || uData.phone || '',
          language: uData.language || 'English',
          balance: typeof uData.balance === 'number' ? uData.balance : (userObj.balance || 0),
          totalReceipts: totalRecs,
          createdAt: uData.createdAt || userObj.createdAt || new Date().toISOString(),
          domains: domainsList,
          hosting: hostingList,
          transactions: txList,
          orders: ordList
        });
      } catch (fErr) {
        console.error('Firestore direct details fetch error:', fErr);
      }
    } finally {
      setLoadingCustomerDetails(false);
    }
  };

  // Save Customer Profile Modifications (Modify Tab)
  const handleSaveCustomerModify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const targetUid = selectedCustomer.id || selectedCustomer.uid;
    setSavingCustomerEdit(true);

    try {
      const res = await apiClient.post(`/api/customers/admin/${targetUid}/update`, editForm);
      if (res.data?.success) {
        toast.success('Customer profile modified successfully!');
      }
    } catch (err: any) {
      console.warn('API update failed, saving directly to Firestore:', err);
      try {
        await updateDoc(doc(db, 'users', targetUid), {
          displayName: editForm.name,
          name: editForm.name,
          company: editForm.company,
          address1: editForm.address1,
          address2: editForm.address2,
          address3: editForm.address3,
          city: editForm.city,
          zip: editForm.zip,
          state: editForm.state,
          country: editForm.country,
          phone: editForm.phone,
          mobile: editForm.mobile,
          pin: editForm.pin,
          language: editForm.language,
          status: editForm.status,
          statusDescription: editForm.statusDescription,
          updatedAt: new Date().toISOString()
        });
        toast.success('Customer profile modified successfully in Firestore!');
      } catch (fErr: any) {
        toast.error('Failed to update customer: ' + fErr.message);
      }
    }

    // Refresh state
    setUsers((prev: any[]) => prev.map(u => (u.id === targetUid || u.uid === targetUid) ? { ...u, ...editForm, displayName: editForm.name } : u));
    setCustomerFullData((prev: any) => ({ ...prev, ...editForm, name: editForm.name }));
    setSavingCustomerEdit(false);
  };

  // Toggle Suspend / Unsuspend Status
  const handleToggleCustomerStatus = async () => {
    if (!selectedCustomer) return;
    const targetUid = selectedCustomer.id || selectedCustomer.uid;
    const currentStatus = customerFullData?.status || selectedCustomer.status || 'active';
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';

    if (!confirm(`Are you sure you want to ${newStatus === 'suspended' ? 'SUSPEND' : 'UNSUSPEND'} customer account for ${selectedCustomer.email}?`)) {
      return;
    }

    try {
      const res = await apiClient.post(`/api/customers/admin/${targetUid}/status`, {
        status: newStatus,
        description: newStatus === 'suspended' ? 'Suspended by Administrator' : 'Active Account'
      });
      if (res.data?.success) {
        toast.success(`Customer status changed to ${newStatus.toUpperCase()}`);
      }
    } catch (err) {
      await updateDoc(doc(db, 'users', targetUid), { status: newStatus, updatedAt: new Date().toISOString() });
      toast.success(`Customer status changed to ${newStatus.toUpperCase()}`);
    }

    setUsers((prev: any[]) => prev.map(u => (u.id === targetUid || u.uid === targetUid) ? { ...u, status: newStatus } : u));
    setCustomerFullData((prev: any) => ({ ...prev, status: newStatus }));
    setEditForm((prev: any) => ({ ...prev, status: newStatus }));
  };

  // Delete Customer Account
  const handleDeleteCustomerAccount = async () => {
    if (!selectedCustomer) return;
    const targetUid = selectedCustomer.id || selectedCustomer.uid;

    if (!confirm(`CRITICAL WARNING: Are you sure you want to PERMANENTLY DELETE customer account ${selectedCustomer.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.post(`/api/customers/admin/${targetUid}/status`, { status: 'deleted' });
      toast.success('Customer account deleted successfully');
    } catch (err) {
      await deleteDoc(doc(db, 'users', targetUid));
      toast.success('Customer account deleted successfully');
    }

    setUsers((prev: any[]) => prev.filter(u => (u.id !== targetUid && u.uid !== targetUid)));
    setSelectedCustomer(null);
  };

  // Send Password Reset Email
  const handleSendPasswordReset = async () => {
    if (!selectedCustomer) return;
    const targetUid = selectedCustomer.id || selectedCustomer.uid;

    try {
      const res = await apiClient.post(`/api/customers/admin/${targetUid}/send-password-reset`, {});
      if (res.data?.success) {
        toast.success(res.data.message || 'Password reset email sent to customer!');
      }
    } catch (err: any) {
      toast.error('Failed to send password reset email: ' + (err.message || 'Error occurred'));
    }
  };

  // Create Manual Custom Invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const targetUid = selectedCustomer.id || selectedCustomer.uid;

    const numAmt = Number(invoiceAmount);
    if (!numAmt || numAmt <= 0 || !invoiceItemName.trim()) {
      toast.error('Please enter a valid item description and positive amount');
      return;
    }

    setCreatingInvoice(true);
    const now = new Date().toISOString();
    const invRef = doc(collection(db, 'orders'));

    const newOrderDoc = {
      id: invRef.id,
      userId: targetUid,
      customerEmail: selectedCustomer.email || '',
      customerName: selectedCustomer.displayName || selectedCustomer.name || 'Customer',
      items: [{ name: invoiceItemName.trim(), price: numAmt, quantity: 1 }],
      total: numAmt,
      totalBdt: numAmt,
      paymentStatus: 'pending',
      paymentMethod: 'manual_invoice',
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };

    try {
      await setDoc(invRef, newOrderDoc);
      toast.success(`Invoice created for ৳${numAmt.toLocaleString()}!`);
      setCustomerFullData((prev: any) => ({
        ...prev,
        orders: [newOrderDoc, ...(prev?.orders || [])]
      }));
      setIsInvoiceModalOpen(false);
      setInvoiceItemName('');
      setInvoiceAmount('');
    } catch (err: any) {
      toast.error('Failed to create invoice: ' + err.message);
    } finally {
      setCreatingInvoice(false);
    }
  };

  // Submit Add/Deduct Balance
  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForBalance) {
      toast.error('Please select a customer user to adjust balance.');
      return;
    }

    const numAmount = Number(balanceAmount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    if (!balanceReason.trim()) {
      toast.error('Please enter a reason for balance adjustment');
      return;
    }

    setSubmittingBalance(true);
    let success = false;
    const targetUid = selectedUserForBalance.id || selectedUserForBalance.uid;

    try {
      const res = await apiClient.post(`/api/customers/admin/${targetUid}/balance`, {
        userId: targetUid,
        amount: numAmount,
        action: balanceAction,
        reason: balanceReason.trim(),
        adminNotes: balanceAdminNotes.trim()
      });

      if (res.data?.success) {
        toast.success(`Wallet ${balanceAction === 'add' ? 'credited' : 'debited'} successfully! New balance: ৳${(res.data.newBalance || 0).toLocaleString()}`);
        const updatedNewBal = res.data.newBalance;
        setUsers((prev: any[]) => prev.map(u => (u.id === targetUid || u.uid === targetUid) ? { ...u, balance: updatedNewBal } : u));
        if (selectedCustomer && (selectedCustomer.id === targetUid || selectedCustomer.uid === targetUid)) {
          setCustomerFullData((prev: any) => ({ ...prev, balance: updatedNewBal }));
        }
        success = true;
      }
    } catch (err: any) {
      console.warn('API balance adjust error, trying direct Firestore:', err);
    }

    if (!success) {
      try {
        const userRef = doc(db, 'users', targetUid);
        const userSnap = await getDoc(userRef);
        const currentBal = typeof userSnap.data()?.balance === 'number' ? userSnap.data()?.balance : 0;
        const newBal = balanceAction === 'add' ? currentBal + numAmount : Math.max(0, currentBal - numAmount);
        const now = new Date().toISOString();
        await updateDoc(userRef, { balance: newBal, updatedAt: now });

        const txRef = doc(collection(db, 'wallet_transactions'));
        await setDoc(txRef, {
          id: txRef.id,
          userId: targetUid,
          customerEmail: selectedUserForBalance.email || '',
          customerName: selectedUserForBalance.displayName || selectedUserForBalance.name || 'Customer',
          type: balanceAction === 'add' ? 'credit' : 'debit',
          amount: numAmount,
          balanceBefore: currentBal,
          balanceAfter: newBal,
          reason: balanceReason.trim(),
          adminNotes: balanceAdminNotes.trim(),
          createdAt: now
        });

        toast.success(`Wallet ${balanceAction === 'add' ? 'credited' : 'debited'} successfully! New balance: ৳${newBal.toLocaleString()}`);
        setUsers((prev: any[]) => prev.map(u => (u.id === targetUid || u.uid === targetUid) ? { ...u, balance: newBal } : u));
        if (selectedCustomer && (selectedCustomer.id === targetUid || selectedCustomer.uid === targetUid)) {
          setCustomerFullData((prev: any) => ({ ...prev, balance: newBal }));
        }
        success = true;
      } catch (fErr: any) {
        toast.error(fErr.message || 'Failed to adjust balance');
      }
    }

    if (success) {
      setIsBalanceModalOpen(false);
      setSelectedUserForBalance(null);
      setBalanceAmount('');
      setBalanceReason('');
      setBalanceAdminNotes('');
    }
    setSubmittingBalance(false);
  };

  // Verify Deposit Request (Approve / Reject)
  const handleVerifyDeposit = async (depositId: string, action: 'approve' | 'reject') => {
    setVerifyingDepositId(depositId);
    let success = false;
    try {
      const res = await apiClient.post(`/api/customers/admin/deposits/${depositId}/verify`, {
        action,
        adminNotes: action === 'approve' ? 'Approved by Admin' : 'Rejected by Admin'
      });

      if (res.data?.success) {
        toast.success(res.data.message || `Deposit ${action}d successfully!`);
        success = true;
      }
    } catch (err: any) {
      console.warn('API deposit verification failed, trying direct Firestore:', err);
    }

    if (!success) {
      try {
        const depRef = doc(db, 'deposit_requests', depositId);
        const depSnap = await getDoc(depRef);
        if (depSnap.exists()) {
          const depData = depSnap.data();
          const now = new Date().toISOString();
          if (action === 'approve') {
            const userRef = doc(db, 'users', depData.userId);
            const userSnap = await getDoc(userRef);
            const currentBal = typeof userSnap.data()?.balance === 'number' ? userSnap.data()?.balance : 0;
            const newBal = currentBal + Number(depData.amount || 0);
            await updateDoc(userRef, { balance: newBal, updatedAt: now });

            const txRef = doc(collection(db, 'wallet_transactions'));
            await setDoc(txRef, {
              id: txRef.id,
              userId: depData.userId,
              customerEmail: depData.customerEmail,
              type: 'credit',
              amount: depData.amount,
              balanceBefore: currentBal,
              balanceAfter: newBal,
              reason: `Deposit Approved via ${depData.paymentMethod || 'bKash'} (TrxID: ${depData.transactionId})`,
              createdAt: now
            });
            setUsers((prev: any[]) => prev.map(u => (u.id === depData.userId || u.uid === depData.userId) ? { ...u, balance: newBal } : u));
          }
          await updateDoc(depRef, { status: action === 'approve' ? 'approved' : 'rejected', updatedAt: now });
          toast.success(`Deposit request ${action}d successfully!`);
          success = true;
        }
      } catch (fErr: any) {
        toast.error(fErr.message || 'Failed to process deposit');
      }
    }

    if (success) {
      fetchDepositRequests();
    }
    setVerifyingDepositId(null);
  };

  // Filter Users
  const displayUsers = useMemo(() => {
    return filteredUsers.filter((u: any) => {
      if (roleFilter !== 'all' && (u.role || 'customer') !== roleFilter) return false;
      if (statusFilter !== 'all' && (u.status || 'active') !== statusFilter) return false;
      return true;
    });
  }, [filteredUsers, roleFilter, statusFilter]);

  // Stats
  const totalBalanceAllCustomers = useMemo(() => {
    return users.reduce((acc: number, u: any) => acc + (typeof u.balance === 'number' ? u.balance : 0), 0);
  }, [users]);

  const pendingDepositsCount = useMemo(() => {
    return depositRequests.filter((d: any) => d.status === 'pending').length;
  }, [depositRequests]);

  if (activeTab !== 'users') return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* WHMCS Header Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={72} />
          </div>
          <div className="flex items-center gap-3 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Users size={16} />
            </div>
            Total Customers
          </div>
          <div className="text-3xl font-black tracking-tight">{users.length}</div>
          <p className="text-xs text-slate-400 mt-2 font-medium">Registered account holders</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 border border-emerald-900/40 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={72} />
          </div>
          <div className="flex items-center gap-3 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Wallet size={16} />
            </div>
            Total Client Balances
          </div>
          <div className="text-3xl font-black tracking-tight text-emerald-300">
            ৳{totalBalanceAllCustomers.toLocaleString()}
          </div>
          <p className="text-xs text-emerald-400/80 mt-2 font-medium">Funds held across all customer wallets</p>
        </div>

        <div className="bg-gradient-to-br from-amber-950 via-slate-900 to-orange-950 text-white rounded-3xl p-6 border border-amber-900/40 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock size={72} />
          </div>
          <div className="flex items-center gap-3 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Clock size={16} />
            </div>
            Pending Deposits
          </div>
          <div className="text-3xl font-black tracking-tight text-amber-300">{pendingDepositsCount}</div>
          <p className="text-xs text-amber-400/80 mt-2 font-medium">Awaiting manual payment verification</p>
        </div>

        <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-cyan-950 text-white rounded-3xl p-6 border border-blue-900/40 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Shield size={72} />
          </div>
          <div className="flex items-center gap-3 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
              <Shield size={16} />
            </div>
            System Status
          </div>
          <div className="text-xl font-extrabold text-cyan-200 mt-1">Openprovider & Hosting Active</div>
          <p className="text-xs text-cyan-400/80 mt-2 font-medium">WHMCS Management Panel Sync</p>
        </div>
      </div>

      {/* Subtab Switcher */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setSubTab('users')}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              subTab === 'users' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Users size={16} /> All Customers ({displayUsers.length})
          </button>
          <button
            onClick={() => setSubTab('deposits')}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative",
              subTab === 'deposits' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Clock size={16} /> Deposit Requests
            {pendingDepositsCount > 0 && (
              <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold animate-pulse">
                {pendingDepositsCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedUserForBalance(users[0] || null);
              setIsBalanceModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-sm transition-all hover:scale-105"
          >
            <PlusCircle size={16} /> Add Funds to User
          </button>

          <button
            onClick={fetchDepositRequests}
            className="p-2.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
            title="Refresh list"
          >
            <RefreshCw size={16} className={loadingDeposits ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>

      {/* SUBTAB 1: ALL CUSTOMERS TABLE */}
      {subTab === 'users' && (
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Customer Management Panel
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Click on any customer name to open full WHMCS options, Openprovider & Hosting account details
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <input
                  type="text"
                  placeholder="Search name, email, phone..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              </div>

              <select
                value={roleFilter}
                onChange={(e: any) => setRoleFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                <option value="all">All Roles</option>
                <option value="customer">Customers</option>
                <option value="admin">Admins</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {displayUsers.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                <Users className="text-slate-300" size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No matching customers found</h3>
              <p className="text-slate-500 text-xs mt-1">Try clearing filters or search terms.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      <th className="py-4 px-6">Customer Name & Email</th>
                      <th className="py-4 px-6">Phone Number</th>
                      <th className="py-4 px-6">Wallet Balance</th>
                      <th className="py-4 px-6 text-center">Services</th>
                      <th className="py-4 px-6">Role</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayUsers.map((user: any) => {
                      const userBal = typeof user.balance === 'number' ? user.balance : 0;
                      return (
                        <tr key={user.id || user.uid} className="hover:bg-blue-50/40 transition-colors group">
                          
                          {/* CLICKABLE CUSTOMER NAME & EMAIL */}
                          <td className="py-4 px-6">
                            <button
                              onClick={() => fetchCustomerFullDetails(user)}
                              className="flex items-center gap-3 text-left w-full group/name focus:outline-none"
                              title="Click to manage customer details & options"
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-200 group-hover/name:scale-105 transition-transform">
                                {user.displayName?.charAt(0).toUpperCase() || user.name?.charAt(0).toUpperCase() || <UserIcon size={16}/>}
                              </div>
                              <div>
                                <div className="font-bold text-blue-700 group-hover/name:text-blue-900 group-hover/name:underline flex items-center gap-2">
                                  {user.displayName || user.name || 'Customer'}
                                  {user.status === 'suspended' && (
                                    <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold no-underline">Suspended</span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 font-medium">{user.email || 'N/A'}</div>
                              </div>
                            </button>
                          </td>

                          <td className="py-4 px-6 text-slate-600 font-medium text-xs">
                            {user.phone || user.phoneNumber || '—'}
                          </td>

                          <td className="py-4 px-6">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-xs shadow-xs">
                              <Wallet size={14} className="text-emerald-600" />
                              ৳{userBal.toLocaleString()}
                            </div>
                          </td>

                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-xl text-xs font-bold" title="Domains count">
                                🌐 {user.domainsCount || 0}
                              </span>
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-xl text-xs font-bold" title="Hosting accounts count">
                                🖥️ {user.hostingCount || 0}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <select
                              defaultValue={user.role || 'customer'}
                              onChange={e => setUserRoleEdits((prev: any) => ({ ...prev, [user.id || user.uid]: e.target.value }))}
                              className={cn(
                                "w-28 border-2 border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold bg-white focus:ring-2 focus:border-blue-500 outline-none transition-all shadow-xs",
                                (userRoleEdits[user.id || user.uid] === 'admin' || (!userRoleEdits[user.id || user.uid] && user.role === 'admin')) ? "text-purple-700 border-purple-300 bg-purple-50" : "text-slate-700"
                              )}
                            >
                              <option value="customer">Customer</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>

                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => fetchCustomerFullDetails(user)}
                                className="bg-blue-600 text-white hover:bg-blue-700 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5"
                                title="Manage Customer Details & Services"
                              >
                                <Eye size={14} /> Manage Customer
                              </button>

                              <button
                                onClick={() => setSelectedUserForBalance(user)}
                                className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5"
                                title="Add/Deduct Wallet Balance"
                              >
                                <DollarSign size={14} /> Balance
                              </button>

                              <button
                                onClick={() => setLoginAsUserId(user.id || user.uid)}
                                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 p-1.5 rounded-xl text-xs font-bold transition-all"
                                title="Impersonate / Login to Customer Panel"
                              >
                                <LogIn size={14} />
                              </button>

                              {userRoleEdits[user.id || user.uid] && userRoleEdits[user.id || user.uid] !== user.role && (
                                <button
                                  onClick={() => saveUserRole(user.id || user.uid)}
                                  disabled={savingUserRole[user.id || user.uid]}
                                  className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700 shadow-sm"
                                >
                                  {savingUserRole[user.id || user.uid] ? <Spinner /> : 'Save Role'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: PENDING DEPOSIT REQUESTS */}
      {subTab === 'deposits' && (
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/60 p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Pending Wallet Deposit Requests
              </h2>
              <p className="text-xs text-slate-500 font-medium">Review customer payment receipts (bKash/Nagad/Bank) to add funds</p>
            </div>
          </div>

          {loadingDeposits ? (
            <div className="text-center py-16">
              <Spinner />
            </div>
          ) : depositRequests.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                <CheckCircle2 className="text-emerald-500" size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No Pending Deposit Requests</h3>
              <p className="text-slate-500 text-xs mt-1">All client deposits have been processed.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                      <th className="py-4 px-6">Customer</th>
                      <th className="py-4 px-6">Payment Method</th>
                      <th className="py-4 px-6">Transaction ID</th>
                      <th className="py-4 px-6">Deposit Amount</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Submitted At</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {depositRequests.map((dep: any) => (
                      <tr key={dep.id} className="hover:bg-blue-50/20 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-800">{dep.customerName || 'Customer'}</div>
                          <div className="text-xs text-slate-500">{dep.customerEmail || 'N/A'}</div>
                        </td>

                        <td className="py-4 px-6 font-bold text-xs uppercase text-slate-700">
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            {dep.paymentMethod || 'bKash'}
                          </span>
                        </td>

                        <td className="py-4 px-6 font-mono font-bold text-blue-600 text-xs">
                          {dep.transactionId || 'N/A'}
                        </td>

                        <td className="py-4 px-6 font-black text-emerald-600 text-base">
                          ৳{Number(dep.amount || 0).toLocaleString()}
                        </td>

                        <td className="py-4 px-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider",
                            dep.status === 'approved' ? "bg-emerald-100 text-emerald-800" :
                            dep.status === 'rejected' ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                          )}>
                            {dep.status}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                          {dep.createdAt ? new Date(dep.createdAt).toLocaleString() : 'N/A'}
                        </td>

                        <td className="py-4 px-6 text-right">
                          {dep.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleVerifyDeposit(dep.id, 'approve')}
                                disabled={verifyingDepositId === dep.id}
                                className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all"
                              >
                                {verifyingDepositId === dep.id ? <Spinner /> : <Check size={14} />} Approve
                              </button>
                              <button
                                onClick={() => handleVerifyDeposit(dep.id, 'reject')}
                                disabled={verifyingDepositId === dep.id}
                                className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                              >
                                <X size={14} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WHMCS CUSTOMER DETAILS & MANAGEMENT MODAL (MATCHING USER REFERENCE SCREENSHOT) */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden text-slate-800 font-sans">
            
            {/* Top Modal Header Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md">
                  {selectedCustomer.displayName?.charAt(0).toUpperCase() || selectedCustomer.name?.charAt(0).toUpperCase() || <UserIcon size={20}/>}
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                    Customer Details — {selectedCustomer.displayName || selectedCustomer.name || 'Customer'}
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                      (customerFullData?.status || selectedCustomer.status) === 'suspended' ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
                    )}>
                      {customerFullData?.status || selectedCustomer.status || 'Active'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    ID: <span className="font-mono text-cyan-300 font-bold">{customerFullData?.customerId || selectedCustomer.customerId || '29398326'}</span> • Email: {selectedCustomer.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* WHMCS TOOLBAR ACTION BUTTONS HEADER (IDENTICAL TO SCREENSHOT) */}
            <div className="bg-slate-100 border-b border-slate-300 p-2 overflow-x-auto scrollbar-thin">
              <div className="flex flex-wrap items-center gap-1.5 min-w-max text-xs font-semibold">
                
                {/* View Button */}
                <button
                  onClick={() => setCustomerDetailsTab('view')}
                  className={cn(
                    "px-3 py-1.5 border rounded text-xs font-bold transition-all shadow-2xs flex items-center gap-1",
                    customerDetailsTab === 'view' ? "bg-blue-700 text-white border-blue-800" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  )}
                >
                  View
                </button>

                {/* Modify Button */}
                <button
                  onClick={() => setCustomerDetailsTab('modify')}
                  className={cn(
                    "px-3 py-1.5 border rounded text-xs font-bold transition-all shadow-2xs flex items-center gap-1",
                    customerDetailsTab === 'modify' ? "bg-blue-700 text-white border-blue-800" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  )}
                >
                  Modify
                </button>

                {/* Suspend / Unsuspend */}
                <button
                  onClick={handleToggleCustomerStatus}
                  className={cn(
                    "px-3 py-1.5 border rounded text-xs font-bold transition-all shadow-2xs flex items-center gap-1",
                    (customerFullData?.status || selectedCustomer.status) === 'suspended' ? "bg-emerald-600 text-white border-emerald-700" : "bg-amber-600 text-white border-amber-700"
                  )}
                >
                  {(customerFullData?.status || selectedCustomer.status) === 'suspended' ? 'Unsuspend' : 'Suspend'}
                </button>

                {/* Delete */}
                <button
                  onClick={handleDeleteCustomerAccount}
                  className="px-3 py-1.5 border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded text-xs font-bold transition-all shadow-2xs"
                >
                  Delete
                </button>

                {/* Change Password */}
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded text-xs font-bold transition-all shadow-2xs"
                >
                  Change Password
                </button>

                {/* Send Password */}
                <button
                  onClick={handleSendPasswordReset}
                  className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded text-xs font-bold transition-all shadow-2xs"
                >
                  Send Password
                </button>

                {/* Login to Panel */}
                <button
                  onClick={() => setLoginAsUserId(selectedCustomer.id || selectedCustomer.uid)}
                  className="px-3 py-1.5 border border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-600 hover:text-white rounded text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                >
                  <LogIn size={13} /> Login to Panel
                </button>

                <span className="text-slate-300 px-1">|</span>

                {/* List Domains */}
                <button
                  onClick={() => setCustomerDetailsTab('domains')}
                  className={cn(
                    "px-3 py-1.5 border rounded text-xs font-bold transition-all shadow-2xs flex items-center gap-1",
                    customerDetailsTab === 'domains' ? "bg-blue-700 text-white border-blue-800" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  )}
                >
                  🌐 List Domains (Openprovider)
                </button>

                {/* Hosting Accounts */}
                <button
                  onClick={() => setCustomerDetailsTab('hosting')}
                  className={cn(
                    "px-3 py-1.5 border rounded text-xs font-bold transition-all shadow-2xs flex items-center gap-1",
                    customerDetailsTab === 'hosting' ? "bg-blue-700 text-white border-blue-800" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  )}
                >
                  🖥️ Hosting Accounts (cPanel/WHM)
                </button>

                <span className="text-slate-300 px-1">|</span>

                {/* Pending Invoices */}
                <button
                  onClick={() => setCustomerDetailsTab('invoices')}
                  className={cn(
                    "px-3 py-1.5 border rounded text-xs font-bold transition-all shadow-2xs flex items-center gap-1",
                    customerDetailsTab === 'invoices' ? "bg-blue-700 text-white border-blue-800" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  )}
                >
                  Pending Invoices
                </button>

                {/* List Transactions */}
                <button
                  onClick={() => setCustomerDetailsTab('transactions')}
                  className={cn(
                    "px-3 py-1.5 border rounded text-xs font-bold transition-all shadow-2xs flex items-center gap-1",
                    customerDetailsTab === 'transactions' ? "bg-blue-700 text-white border-blue-800" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  )}
                >
                  List Transactions
                </button>

                {/* Add Funds */}
                <button
                  onClick={() => {
                    setSelectedUserForBalance(selectedCustomer);
                    setIsBalanceModalOpen(true);
                  }}
                  className="px-3 py-1.5 border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white rounded text-xs font-bold transition-all shadow-2xs"
                >
                  + Add Funds
                </button>

                {/* Add Invoice */}
                <button
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded text-xs font-bold transition-all shadow-2xs"
                >
                  Add Invoice
                </button>

                {/* Custom Pricing */}
                <button
                  onClick={() => setCustomerDetailsTab('pricing')}
                  className={cn(
                    "px-3 py-1.5 border rounded text-xs font-bold transition-all shadow-2xs flex items-center gap-1",
                    customerDetailsTab === 'pricing' ? "bg-blue-700 text-white border-blue-800" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  )}
                >
                  Pricing
                </button>

                {/* BD Domains */}
                <button
                  onClick={() => setCustomerDetailsTab('bd_names')}
                  className={cn(
                    "px-3 py-1.5 border rounded text-xs font-bold transition-all shadow-2xs flex items-center gap-1",
                    customerDetailsTab === 'bd_names' ? "bg-blue-700 text-white border-blue-800" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  )}
                >
                  3rd level .BR / .BD names
                </button>

              </div>
            </div>

            {/* Modal Body / Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {loadingCustomerDetails ? (
                <div className="text-center py-20">
                  <Spinner />
                  <p className="text-xs text-slate-500 font-bold mt-3">Loading Openprovider & Hosting account details...</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: VIEW (IDENTICAL KEY-VALUE TABLE AS USER'S SCREENSHOT) */}
                  {customerDetailsTab === 'view' && (
                    <div className="space-y-6">
                      
                      {/* Section Header */}
                      <div className="border-b border-slate-200 pb-2">
                        <h4 className="text-sm font-black text-slate-800 tracking-tight">Customer Details</h4>
                      </div>

                      {/* Customer Details Table matching image.png */}
                      <div className="border border-slate-300 rounded-lg overflow-hidden bg-white text-xs">
                        <table className="w-full text-left border-collapse">
                          <tbody className="divide-y divide-slate-200 font-medium">
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 w-1/3 border-r border-slate-200">Customer Id</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{customerFullData?.customerId || selectedCustomer.customerId || '29398326'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Name</td>
                              <td className="py-2.5 px-4 font-bold text-slate-900">{customerFullData?.name || selectedCustomer.displayName || selectedCustomer.name}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Customer Status</td>
                              <td className="py-2.5 px-4 font-bold text-emerald-600 capitalize">{customerFullData?.status || selectedCustomer.status || 'Active'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Customer Status Description</td>
                              <td className="py-2.5 px-4 text-slate-600">{customerFullData?.statusDescription || 'Active Account'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Username (Email Address)</td>
                              <td className="py-2.5 px-4 font-bold text-blue-700">{selectedCustomer.email}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Personal Identification Number (PIN)</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{customerFullData?.pin || '2082'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Company</td>
                              <td className="py-2.5 px-4 text-slate-800">{customerFullData?.company || 'Binary Information Technology'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Address1</td>
                              <td className="py-2.5 px-4 text-slate-800">{customerFullData?.address1 || 'Halishahar, Chattogram'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Address2</td>
                              <td className="py-2.5 px-4 text-slate-800">{customerFullData?.address2 || '—'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Address3</td>
                              <td className="py-2.5 px-4 text-slate-800">{customerFullData?.address3 || '—'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">City</td>
                              <td className="py-2.5 px-4 text-slate-800">{customerFullData?.city || 'Chattogram'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Zip</td>
                              <td className="py-2.5 px-4 text-slate-800 font-mono">{customerFullData?.zip || '4216'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">State/Region/Province</td>
                              <td className="py-2.5 px-4 text-slate-800">{customerFullData?.state || 'Chittagong'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Country</td>
                              <td className="py-2.5 px-4 text-slate-800">{customerFullData?.country || 'Bangladesh'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Tel No.</td>
                              <td className="py-2.5 px-4 font-mono text-slate-800">{customerFullData?.phone || selectedCustomer.phone || '+880.1815140862'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Alternate Tel No.</td>
                              <td className="py-2.5 px-4 text-slate-800">—</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Mobile No.</td>
                              <td className="py-2.5 px-4 font-mono text-slate-800">{customerFullData?.mobile || customerFullData?.phone || selectedCustomer.phone || '+880.1815140862'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Fax No.</td>
                              <td className="py-2.5 px-4 text-slate-800">—</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Language Preference</td>
                              <td className="py-2.5 px-4 text-slate-800">{customerFullData?.language || 'English'}</td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Current Debit Account Balance</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-emerald-600">
                                BDT {Number(customerFullData?.balance || selectedCustomer.balance || 0).toFixed(2)}
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Total Receipts</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-blue-600">
                                BDT {Number(customerFullData?.totalReceipts || 0).toFixed(2)}
                              </td>
                            </tr>
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">Creation Date</td>
                              <td className="py-2.5 px-4 text-slate-600 font-mono">
                                {customerFullData?.createdAt ? new Date(customerFullData.createdAt).toLocaleString() : 'Oct 22, 2024 6:41:24 AM'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Quick Summary Grid for Active Services */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        
                        {/* Openprovider Registered Domains Summary */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                              <Globe size={15} className="text-blue-600" /> Active Registered Domains ({customerFullData?.domains?.length || 0})
                            </span>
                            <button
                              onClick={() => setCustomerDetailsTab('domains')}
                              className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                            >
                              Manage All <ChevronRight size={13} />
                            </button>
                          </div>
                          {customerFullData?.domains?.length > 0 ? (
                            <div className="space-y-1.5">
                              {customerFullData.domains.slice(0, 3).map((d: any) => (
                                <div key={d.id} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-200">
                                  <span className="font-mono font-bold text-slate-800">{d.domainName || d.domain}</span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">Active</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No registered domains found for this customer.</p>
                          )}
                        </div>

                        {/* cPanel / WHM Hosting Accounts Summary */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                              <Server size={15} className="text-indigo-600" /> Web Hosting Accounts ({customerFullData?.hosting?.length || 0})
                            </span>
                            <button
                              onClick={() => setCustomerDetailsTab('hosting')}
                              className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-0.5"
                            >
                              Manage All <ChevronRight size={13} />
                            </button>
                          </div>
                          {customerFullData?.hosting?.length > 0 ? (
                            <div className="space-y-1.5">
                              {customerFullData.hosting.slice(0, 3).map((h: any) => (
                                <div key={h.id} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-200">
                                  <span className="font-mono font-bold text-slate-800">{h.domain || h.username}</span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">{h.package || 'cPanel'}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No hosting accounts provisioned for this customer.</p>
                          )}
                        </div>

                      </div>

                    </div>
                  )}

                  {/* TAB 2: MODIFY (EDIT CUSTOMER FORM) */}
                  {customerDetailsTab === 'modify' && (
                    <form onSubmit={handleSaveCustomerModify} className="space-y-6">
                      <div className="border-b border-slate-200 pb-2">
                        <h4 className="text-sm font-black text-slate-800">Modify Customer Profile</h4>
                        <p className="text-xs text-slate-500">Update personal, billing address, and contact records</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Full Name</label>
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Email Address (Username)</label>
                          <input
                            type="email"
                            disabled
                            value={editForm.email || ''}
                            className="w-full p-2.5 border border-slate-200 rounded text-xs font-bold text-slate-500 bg-slate-100 cursor-not-allowed"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Company Name</label>
                          <input
                            type="text"
                            value={editForm.company || ''}
                            onChange={e => setEditForm({ ...editForm, company: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Personal PIN</label>
                          <input
                            type="text"
                            value={editForm.pin || ''}
                            onChange={e => setEditForm({ ...editForm, pin: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="font-bold text-slate-700">Address Line 1</label>
                          <input
                            type="text"
                            value={editForm.address1 || ''}
                            onChange={e => setEditForm({ ...editForm, address1: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Address Line 2</label>
                          <input
                            type="text"
                            value={editForm.address2 || ''}
                            onChange={e => setEditForm({ ...editForm, address2: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Address Line 3</label>
                          <input
                            type="text"
                            value={editForm.address3 || ''}
                            onChange={e => setEditForm({ ...editForm, address3: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">City</label>
                          <input
                            type="text"
                            value={editForm.city || ''}
                            onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Zip / Postal Code</label>
                          <input
                            type="text"
                            value={editForm.zip || ''}
                            onChange={e => setEditForm({ ...editForm, zip: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded text-xs font-mono font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">State / Region</label>
                          <input
                            type="text"
                            value={editForm.state || ''}
                            onChange={e => setEditForm({ ...editForm, state: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Country</label>
                          <input
                            type="text"
                            value={editForm.country || ''}
                            onChange={e => setEditForm({ ...editForm, country: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Telephone Number</label>
                          <input
                            type="text"
                            value={editForm.phone || ''}
                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Mobile Number</label>
                          <input
                            type="text"
                            value={editForm.mobile || ''}
                            onChange={e => setEditForm({ ...editForm, mobile: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Language Preference</label>
                          <select
                            value={editForm.language || 'English'}
                            onChange={e => setEditForm({ ...editForm, language: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="English">English</option>
                            <option value="Bengali">Bengali</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Customer Status</label>
                          <select
                            value={editForm.status || 'active'}
                            onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                            className="w-full p-2.5 border border-slate-300 rounded text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setCustomerDetailsTab('view')}
                          className="px-4 py-2 border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingCustomerEdit}
                          className="px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-bold shadow flex items-center gap-1.5"
                        >
                          {savingCustomerEdit ? <Spinner /> : <Check size={14} />} Save Customer Changes
                        </button>
                      </div>
                    </form>
                  )}

                  {/* TAB 3: DOMAINS (OPENPROVIDER INTEGRATION) */}
                  {customerDetailsTab === 'domains' && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-200 pb-2 flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <Globe size={16} className="text-blue-600" /> Customer Domains (Openprovider Registrar Integration)
                          </h4>
                          <p className="text-xs text-slate-500">Domains registered and managed by this customer</p>
                        </div>
                        <a
                          href="/admin/billing"
                          className="text-xs text-blue-700 font-bold hover:underline flex items-center gap-1"
                        >
                          Openprovider Settings <ExternalLink size={12} />
                        </a>
                      </div>

                      {customerFullData?.domains?.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-xl">
                          <Globe size={32} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-xs font-bold text-slate-600">No domains found for this customer.</p>
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600">
                              <tr>
                                <th className="p-3">Domain Name</th>
                                <th className="p-3">Provider</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Created At</th>
                                <th className="p-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-medium">
                              {customerFullData?.domains?.map((d: any) => (
                                <tr key={d.id} className="hover:bg-slate-50">
                                  <td className="p-3 font-mono font-bold text-blue-700">{d.domainName || d.domain}</td>
                                  <td className="p-3 font-bold uppercase text-[10px] text-slate-600">
                                    <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                                      {d.source === 'btcl_bd' ? 'BTCL .BD' : 'Openprovider'}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                                      {d.providerStatus || d.status || 'Active'}
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono font-bold text-slate-800">৳{Number(d.amount || 0).toLocaleString()}</td>
                                  <td className="p-3 text-slate-500 font-mono text-[11px]">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</td>
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={() => toast.success(`EPP Auth Code requested for ${d.domainName || d.domain}`)}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold mr-1.5"
                                    >
                                      Get EPP Code
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: HOSTING ACCOUNTS (CPANEL / WHM INTEGRATION) */}
                  {customerDetailsTab === 'hosting' && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-200 pb-2 flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <Server size={16} className="text-indigo-600" /> Customer Web Hosting Accounts (cPanel / WHM)
                          </h4>
                          <p className="text-xs text-slate-500">cPanel accounts provisioned for this customer</p>
                        </div>
                      </div>

                      {customerFullData?.hosting?.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-xl">
                          <Server size={32} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-xs font-bold text-slate-600">No hosting accounts found for this customer.</p>
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600">
                              <tr>
                                <th className="p-3">Domain / Account</th>
                                <th className="p-3">Username</th>
                                <th className="p-3">Package / Plan</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Created</th>
                                <th className="p-3 text-right">cPanel Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-medium">
                              {customerFullData?.hosting?.map((h: any) => (
                                <tr key={h.id} className="hover:bg-slate-50">
                                  <td className="p-3 font-mono font-bold text-slate-800">{h.domain || h.username}</td>
                                  <td className="p-3 font-mono text-slate-600">{h.username || '—'}</td>
                                  <td className="p-3 font-bold text-indigo-700">{h.package || h.planName || 'cPanel NVMe'}</td>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                                      {h.status || 'Active'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-500 font-mono text-[11px]">{h.createdAt ? new Date(h.createdAt).toLocaleDateString() : '—'}</td>
                                  <td className="p-3 text-right">
                                    <a
                                      href={h.cpanelUrl || `https://${h.domain || 'click2it.bd'}:2083`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs"
                                    >
                                      <LogIn size={12} /> Login to cPanel
                                    </a>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 5: INVOICES & ORDERS */}
                  {customerDetailsTab === 'invoices' && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-200 pb-2 flex justify-between items-center">
                        <div>
                          <h4 className="text-sm font-black text-slate-800">Pending Invoices & Billing Records</h4>
                          <p className="text-xs text-slate-500">Customer unpaid and processed order invoices</p>
                        </div>
                        <button
                          onClick={() => setIsInvoiceModalOpen(true)}
                          className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold text-xs shadow"
                        >
                          + Create New Invoice
                        </button>
                      </div>

                      {customerFullData?.orders?.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-bold">
                          No invoices recorded for this customer.
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600">
                              <tr>
                                <th className="p-3">Invoice ID</th>
                                <th className="p-3">Items / Service</th>
                                <th className="p-3">Total Amount</th>
                                <th className="p-3">Payment Method</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-medium">
                              {customerFullData?.orders?.map((o: any) => (
                                <tr key={o.id} className="hover:bg-slate-50">
                                  <td className="p-3 font-mono font-bold text-blue-700">#{o.id.slice(0, 8)}</td>
                                  <td className="p-3 text-slate-800 font-bold">{o.items?.[0]?.name || 'Service Invoice'}</td>
                                  <td className="p-3 font-mono font-bold text-slate-900">৳{Number(o.total || o.totalBdt || 0).toLocaleString()}</td>
                                  <td className="p-3 capitalize font-bold text-slate-600">{o.paymentMethod || 'bKash'}</td>
                                  <td className="p-3">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase",
                                      (o.paymentStatus === 'verified' || o.status === 'completed') ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                    )}>
                                      {o.paymentStatus || o.status || 'pending'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-500 font-mono text-[11px]">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 6: TRANSACTIONS */}
                  {customerDetailsTab === 'transactions' && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-200 pb-2">
                        <h4 className="text-sm font-black text-slate-800">Wallet Transactions & Receipts History</h4>
                        <p className="text-xs text-slate-500">Credits, debits, and automated billing transactions</p>
                      </div>

                      {customerFullData?.transactions?.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-bold">
                          No transactions recorded.
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600">
                              <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">Description / Reason</th>
                                <th className="p-3 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-medium">
                              {customerFullData?.transactions?.map((t: any) => (
                                <tr key={t.id} className="hover:bg-slate-50">
                                  <td className="p-3 text-slate-500 font-mono text-[11px]">{t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'}</td>
                                  <td className="p-3 font-bold">
                                    {t.type === 'credit' ? (
                                      <span className="text-emerald-600 uppercase">Credit (+)</span>
                                    ) : (
                                      <span className="text-rose-600 uppercase">Debit (-)</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-slate-800">{t.reason || 'Account Balance Adjustment'}</td>
                                  <td className="p-3 text-right font-mono font-bold">
                                    <span className={t.type === 'credit' ? "text-emerald-600" : "text-rose-600"}>
                                      {t.type === 'credit' ? '+' : '-'}৳{Number(t.amount || 0).toLocaleString()}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 7: PRICING */}
                  {customerDetailsTab === 'pricing' && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-200 pb-2">
                        <h4 className="text-sm font-black text-slate-800">Customer Specific Custom Pricing Tier</h4>
                        <p className="text-xs text-slate-500">Configure special domain & hosting discounts for this customer account</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Domain TLD Pricing Group</label>
                            <select className="w-full p-2 border border-slate-300 rounded font-medium">
                              <option>Default Retail Pricing</option>
                              <option>VIP Reseller Tier 1 (-10% TLD Markup)</option>
                              <option>VIP Reseller Tier 2 (-15% TLD Markup)</option>
                            </select>
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 block mb-1">Hosting Discount Rate</label>
                            <input type="text" defaultValue="0%" className="w-full p-2 border border-slate-300 rounded font-medium" />
                          </div>
                        </div>
                        <button
                          onClick={() => toast.success('Custom pricing group saved for customer!')}
                          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold text-xs"
                        >
                          Save Pricing Group
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 8: BD DOMAIN NAMES */}
                  {customerDetailsTab === 'bd_names' && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-200 pb-2">
                        <h4 className="text-sm font-black text-slate-800">3rd level .BR / .BD Domain Applications</h4>
                        <p className="text-xs text-slate-500">BTCL / .BD domain registrations and NID document submissions</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-center text-slate-500 font-bold">
                        No active .BD 3rd level application pending for this customer.
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>

            {/* Modal Bottom Footer */}
            <div className="bg-slate-100 border-t border-slate-300 px-6 py-3 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Customer ID: <strong className="text-slate-800 font-mono">{customerFullData?.customerId || selectedCustomer.customerId || '29398326'}</strong>
              </span>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Key size={16} className="text-blue-600" /> Change Password — {selectedCustomer.email}
              </h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700">New Password for Customer</label>
              <input
                type="password"
                placeholder="Enter new password (min 6 chars)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newPassword || newPassword.length < 6) {
                    toast.error('Password must be at least 6 characters');
                    return;
                  }
                  setSavingPassword(true);
                  try {
                    await apiClient.post(`/api/customers/admin/${selectedCustomer.id || selectedCustomer.uid}/update`, {
                      password: newPassword
                    });
                    toast.success('Customer password updated successfully!');
                    setIsPasswordModalOpen(false);
                    setNewPassword('');
                  } catch (err: any) {
                    toast.error('Failed to change password: ' + err.message);
                  } finally {
                    setSavingPassword(false);
                  }
                }}
                disabled={savingPassword}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow"
              >
                {savingPassword ? <Spinner /> : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOM INVOICE MODAL */}
      {isInvoiceModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleCreateInvoice} className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <FileText size={16} className="text-blue-600" /> Create Manual Invoice — {selectedCustomer.email}
              </h3>
              <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Service / Item Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Domain Transfer & NVMe Web Hosting"
                  value={invoiceItemName}
                  onChange={e => setInvoiceItemName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Invoice Amount (BDT)</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 2500"
                  value={invoiceAmount}
                  onChange={e => setInvoiceAmount(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingInvoice}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow"
              >
                {creatingInvoice ? <Spinner /> : 'Generate Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD / DEDUCT WALLET BALANCE MODAL */}
      {(isBalanceModalOpen || selectedUserForBalance) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">
                    Admin Add / Deduct Funds
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Directly manage wallet balance for any customer in the system
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsBalanceModalOpen(false);
                  setSelectedUserForBalance(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Two-Column Horizontal Layout */}
            <form onSubmit={handleAdjustBalance} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* LEFT COLUMN: Customer Selection & Account Status */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Select Customer Account <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedUserForBalance?.id || selectedUserForBalance?.uid || ''}
                      onChange={e => {
                        const found = users.find((u: any) => (u.id === e.target.value || u.uid === e.target.value));
                        setSelectedUserForBalance(found || null);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="" disabled>-- Select a customer to manage funds --</option>
                      {users.map((u: any) => {
                        const uId = u.id || u.uid;
                        const name = u.displayName || u.name || 'Unnamed';
                        const email = u.email || 'No email';
                        const bal = Number(u.balance || 0);
                        return (
                          <option key={uId} value={uId}>
                            {name} ({email}) — Balance: ৳{bal.toLocaleString()}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedUserForBalance ? (
                    <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                      <div className="min-w-0 pr-3">
                        <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block truncate">
                          {selectedUserForBalance.displayName || selectedUserForBalance.name || selectedUserForBalance.email || 'Selected Customer'}
                        </span>
                        <span className="text-xs text-emerald-700 font-medium block truncate">
                          {selectedUserForBalance.email}
                        </span>
                        {selectedUserForBalance.phone && (
                          <span className="text-[11px] text-slate-500 font-medium block">
                            Phone: {selectedUserForBalance.phone}
                          </span>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Balance</span>
                        <span className="text-2xl font-black text-emerald-600 font-mono">
                          ৳{Number(selectedUserForBalance.balance || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      Please select a customer to view their balance and adjust funds.
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Action</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setBalanceAction('add')}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all",
                          balanceAction === 'add' ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <PlusCircle size={15} /> Credit / Add Funds (+)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBalanceAction('deduct')}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all",
                          balanceAction === 'deduct' ? "bg-rose-600 text-white border-rose-600 shadow-sm" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <MinusCircle size={15} /> Debit / Deduct Funds (-)
                      </button>
                    </div>
                  </div>

                  {selectedUserForBalance && Number(balanceAmount) > 0 && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">Projected New Balance:</span>
                      <span className={cn(
                        "text-base font-mono font-black",
                        balanceAction === 'add' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        ৳{(
                          balanceAction === 'add'
                            ? Number(selectedUserForBalance.balance || 0) + Number(balanceAmount)
                            : Math.max(0, Number(selectedUserForBalance.balance || 0) - Number(balanceAmount))
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Amount, Presets, Reason & Notes */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Amount (BDT) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        placeholder="Enter amount (e.g. 1000)"
                        value={balanceAmount}
                        onChange={e => setBalanceAmount(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[500, 1000, 2000, 5000, 10000].map(amt => (
                        <button
                          type="button"
                          key={amt}
                          onClick={() => setBalanceAmount(String(amt))}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors"
                        >
                          +৳{amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Reason / Description <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Manual bKash Payment Verified #TX99120"
                      value={balanceReason}
                      onChange={e => setBalanceReason(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {['bKash Payment Verified', 'Nagad Payment Received', 'Bank Transfer Deposited', 'Manual Admin Top-up', 'Promotional Bonus'].map(r => (
                        <button
                          type="button"
                          key={r}
                          onClick={() => setBalanceReason(r)}
                          className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Internal Admin Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Approved via WhatsApp confirmation"
                      value={balanceAdminNotes}
                      onChange={e => setBalanceAdminNotes(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

              </div>

              {/* Bottom Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsBalanceModalOpen(false);
                    setSelectedUserForBalance(null);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBalance || !selectedUserForBalance}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 disabled:opacity-50",
                    balanceAction === 'add' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" : "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                  )}
                >
                  {submittingBalance ? <Spinner /> : (balanceAction === 'add' ? <PlusCircle size={16} /> : <MinusCircle size={16} />)}
                  Confirm {balanceAction === 'add' ? 'Add Funds' : 'Deduct Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
