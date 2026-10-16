import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Shield, ShieldOff, CheckCircle2, User as UserIcon, Wallet, PlusCircle, MinusCircle, 
  History, ArrowUpRight, ArrowDownLeft, DollarSign, Clock, AlertCircle, Check, X, Eye, LogIn, ExternalLink, RefreshCw
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Spinner } from '../components/SharedUI';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../../services/apiClient';
import { db } from '../../../firebase';
import { doc, getDoc, updateDoc, setDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export function UsersTab({ state }: { state: any }) {
  const {
    activeTab, userSearch, setUserSearch, filteredUsers, userRoleEdits, setUserRoleEdits,
    saveUserRole, savingUserRole, users, setUsers, setLoginAsUserId
  } = state;

  const [subTab, setSubTab] = useState<'users' | 'deposits'>('users');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Modal States
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<any>(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState<boolean>(false);
  const [balanceUserSearch, setBalanceUserSearch] = useState<string>('');
  const [balanceAction, setBalanceAction] = useState<'add' | 'deduct'>('add');
  const [balanceAmount, setBalanceAmount] = useState<string>('');
  const [balanceReason, setBalanceReason] = useState<string>('');
  const [balanceAdminNotes, setBalanceAdminNotes] = useState<string>('');
  const [submittingBalance, setSubmittingBalance] = useState<boolean>(false);

  // Customer Detail Drawer State
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);
  const [userTxHistory, setUserTxHistory] = useState<any[]>([]);
  const [loadingUserTx, setLoadingUserTx] = useState<boolean>(false);

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

  // Fetch transactions for selected user detail
  const fetchUserTransactions = async (userId: string) => {
    setLoadingUserTx(true);
    try {
      const res = await apiClient.get(`/api/customers/admin/${userId}/transactions`);
      if (res.data?.success) {
        setUserTxHistory(res.data.transactions || []);
      }
    } catch (err: any) {
      console.warn('Failed to load user transactions:', err);
    } finally {
      setLoadingUserTx(false);
    }
  };

  const handleOpenUserDetail = (user: any) => {
    setSelectedUserDetail(user);
    fetchUserTransactions(user.id || user.uid);
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
        if (selectedUserDetail && (selectedUserDetail.id === targetUid || selectedUserDetail.uid === targetUid)) {
          setSelectedUserDetail((prev: any) => ({ ...prev, balance: updatedNewBal }));
          fetchUserTransactions(targetUid);
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
        if (selectedUserDetail && (selectedUserDetail.id === targetUid || selectedUserDetail.uid === targetUid)) {
          setSelectedUserDetail((prev: any) => ({ ...prev, balance: newBal }));
          fetchUserTransactions(targetUid);
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
      setBalanceUserSearch('');
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
          <div className="text-xl font-extrabold text-cyan-200 mt-1">WHMCS Wallet Ready</div>
          <p className="text-xs text-cyan-400/80 mt-2 font-medium">Auto-renewal & balance debit active</p>
        </div>
      </div>

      {/* Navigation Tabs Header */}
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
              <p className="text-xs text-slate-500 font-medium">Manage client accounts, credit wallet balances, and track services</p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Search */}
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

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e: any) => setRoleFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                <option value="all">All Roles</option>
                <option value="customer">Customers</option>
                <option value="admin">Admins</option>
              </select>

              {/* Status filter */}
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
                        <tr key={user.id || user.uid} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-200">
                                {user.displayName?.charAt(0).toUpperCase() || user.name?.charAt(0).toUpperCase() || <UserIcon size={16}/>}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                  {user.displayName || user.name || 'Customer'}
                                  {user.status === 'suspended' && (
                                    <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">Suspended</span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 font-medium">{user.email || 'N/A'}</div>
                              </div>
                            </div>
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
                              {/* Manage Balance Button */}
                              <button
                                onClick={() => setSelectedUserForBalance(user)}
                                className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5"
                                title="Add/Deduct Wallet Balance"
                              >
                                <DollarSign size={14} /> Balance
                              </button>

                              {/* View Details / Ledger */}
                              <button
                                onClick={() => handleOpenUserDetail(user)}
                                className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                                title="View Customer Ledger & History"
                              >
                                <Eye size={14} /> Profile
                              </button>

                              {/* Login as user */}
                              <button
                                onClick={() => setLoginAsUserId(user.id || user.uid)}
                                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 p-1.5 rounded-xl text-xs font-bold transition-all"
                                title="Impersonate / Login as Customer"
                              >
                                <LogIn size={14} />
                              </button>

                              {/* Save Role Button */}
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

      {/* MODAL 1: ADD / DEDUCT WALLET BALANCE MODAL */}
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
                  {/* Target User Selector */}
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

                  {/* Selected User Balance Card */}
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

                  {/* Action Switch */}
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

                  {/* Projected Balance Preview */}
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
                  {/* Amount & Quick Chips */}
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
                    {/* Preset Chips */}
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

                  {/* Reason & Quick Chips */}
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

                  {/* Internal Admin Notes */}
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

      {/* MODAL 2: CUSTOMER DETAIL & TRANSACTION LEDGER DRAWER */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white h-full w-full max-w-2xl shadow-2xl border-l border-slate-200 overflow-y-auto p-6 md:p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md">
                    {selectedUserDetail.displayName?.charAt(0).toUpperCase() || selectedUserDetail.name?.charAt(0).toUpperCase() || <UserIcon size={20}/>}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">
                      {selectedUserDetail.displayName || selectedUserDetail.name || 'Customer Profile'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{selectedUserDetail.email}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedUserDetail(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Wallet Summary Card */}
              <div className="bg-gradient-to-br from-emerald-900 to-teal-900 text-white rounded-2xl p-5 shadow-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Available Wallet Balance</div>
                  <div className="text-3xl font-black mt-1 text-emerald-200">
                    ৳{Number(selectedUserDetail.balance || 0).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedUserForBalance(selectedUserDetail);
                  }}
                  className="bg-white text-emerald-900 hover:bg-emerald-50 px-4 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all"
                >
                  + Add Funds
                </button>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs font-medium">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">User UID</span>
                  <span className="font-mono text-slate-800 font-bold truncate block">{selectedUserDetail.id || selectedUserDetail.uid}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone Number</span>
                  <span className="text-slate-800 font-bold">{selectedUserDetail.phone || selectedUserDetail.phoneNumber || 'N/A'}</span>
                </div>
              </div>

              {/* Transaction Ledger Table */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <History size={16} className="text-blue-600" /> Wallet Transaction History / Ledger
                </h4>

                {loadingUserTx ? (
                  <div className="text-center py-8">
                    <Spinner />
                  </div>
                ) : userTxHistory.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                    No transactions recorded for this customer yet.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                          <th className="p-3">Date</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Description</th>
                          <th className="p-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userTxHistory.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-slate-50">
                            <td className="p-3 text-slate-500 font-medium">
                              {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="p-3 font-bold">
                              {tx.type === 'credit' ? (
                                <span className="text-emerald-600 flex items-center gap-1">
                                  <ArrowDownLeft size={12} /> Credit
                                </span>
                              ) : (
                                <span className="text-rose-600 flex items-center gap-1">
                                  <ArrowUpRight size={12} /> Debit
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-800 font-medium max-w-[200px] truncate" title={tx.reason}>
                              {tx.reason || 'Balance Adjustment'}
                            </td>
                            <td className="p-3 text-right font-black">
                              <span className={tx.type === 'credit' ? "text-emerald-600" : "text-rose-600"}>
                                {tx.type === 'credit' ? '+' : '-'}৳{Number(tx.amount || 0).toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="w-full py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-xl text-xs transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
