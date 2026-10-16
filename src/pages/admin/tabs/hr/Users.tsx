import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, query, getDocs, orderBy } from 'firebase/firestore';
import { db, firebaseConfig } from '../../../../firebase';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { UserProfile, UserPermission } from '../../../../types';
import { formatCurrency, cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { Users as UsersIcon, Mail, X, Trash2, Shield, Key } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Pagination } from '../../../../components/common/Pagination';

const UsersTab: React.FC = () => {
  const { isAdmin, hasPermission } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUserPermissions, setEditingUserPermissions] = useState<any | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [userFormData, setUserFormData] = useState({ name: '', email: '', password: '', role: 'staff', permissions: [] as UserPermission[] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() } as unknown as UserProfile));
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      let permissions: UserPermission[] = [];
      if (newRole === 'admin') permissions = ['view_dashboard', 'manage_users', 'manage_settings', 'manage_inventory', 'manage_orders', 'manage_finances', 'manage_reports', 'manage_hr', 'manage_services', 'manage_marketing'];
      else if (newRole === 'manager') permissions = ['view_dashboard', 'manage_inventory', 'manage_orders', 'manage_finances', 'manage_reports'];
      else if (newRole === 'staff') permissions = ['view_dashboard', 'manage_inventory', 'manage_orders', 'manage_services', 'manage_finances', 'manage_settings'];
      
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        permissions
      });
      toast.success('User role and permissions updated successfully');
      fetchData();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleAddPortalUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (userFormData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp" + Date.now());
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, userFormData.email, userFormData.password);
      
      let defaultPermissions: UserPermission[] = userFormData.permissions;
      if (defaultPermissions.length === 0) {
        if (userFormData.role === 'admin') {
          defaultPermissions = ['view_dashboard', 'manage_users', 'manage_settings', 'manage_inventory', 'manage_orders', 'manage_finances', 'manage_reports', 'manage_hr', 'manage_services', 'manage_marketing'];
        } else if (userFormData.role === 'manager') {
          defaultPermissions = ['view_dashboard', 'manage_inventory', 'manage_orders', 'manage_finances', 'manage_reports'];
        } else if (userFormData.role === 'staff') {
          defaultPermissions = ['view_dashboard', 'manage_inventory', 'manage_orders', 'manage_services', 'manage_finances', 'manage_settings'];
        }
      }

      await setDoc(doc(db, 'users', userCred.user.uid), {
        uid: userCred.user.uid,
        displayName: userFormData.name || userFormData.email.split('@')[0],
        email: userFormData.email,
        role: userFormData.role,
        permissions: defaultPermissions,
        createdAt: new Date().toISOString()
      });
      
      await secondaryAuth.signOut();
      
      toast.success('Staff/Portal user added successfully');
      setIsAddingUser(false);
      setUserFormData({ name: '', email: '', password: '', role: 'staff', permissions: [] });
      fetchData();
    } catch (err: any) {
      toast.error('Error adding user: ' + err.message);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (!window.confirm(`Are you sure you want to remove ${user.displayName || user.email}?`)) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid || (user as any).id));
      toast.success('User removed from database');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to delete user: ' + err.message);
    }
  };

  const [selectedRoleCategory, setSelectedRoleCategory] = useState<'all' | 'staff' | 'manager' | 'admin' | 'user'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(u => {
    const matchesCategory = selectedRoleCategory === 'all' || (u.role || 'user') === selectedRoleCategory;
    const matchesSearch = !searchQuery || 
      (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.uid || (u as any).id || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const roleCounts = {
    all: users.length,
    staff: users.filter(u => u.role === 'staff').length,
    manager: users.filter(u => u.role === 'manager').length,
    admin: users.filter(u => u.role === 'admin').length,
    user: users.filter(u => !u.role || u.role === 'user').length,
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden flex flex-col">
      {/* Header Area */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 to-[#081621] text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-black uppercase tracking-widest mb-3">
              <Shield size={12} className="text-blue-400" /> Security & Access
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
              Staff & App Management
              <span className="text-xs font-bold text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/5">
                {filteredUsers.length} of {users.length} Users
              </span>
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              Create and manage access levels for offline shop staff, managers, and system administrators. Protect your application securely.
            </p>
          </div>
          <div className="shrink-0">
            <button 
              onClick={() => {
                setUserFormData({ name: '', email: '', password: '', role: 'staff', permissions: [] });
                setIsAddingUser(true);
              }} 
              className="bg-emerald-500 text-white px-5 py-3 rounded-xl hover:bg-emerald-400 transition-all font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <UsersIcon size={18} /> Add Staff / User
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0 scrollbar-hide">
          <button
            onClick={() => { setSelectedRoleCategory('all'); setCurrentPage(1); }}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border",
              selectedRoleCategory === 'all'
                ? "bg-slate-800 text-white border-slate-800 shadow-md"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            All Users
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", selectedRoleCategory === 'all' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
              {roleCounts.all}
            </span>
          </button>
          <button
            onClick={() => { setSelectedRoleCategory('staff'); setCurrentPage(1); }}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border",
              selectedRoleCategory === 'staff'
                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                : "bg-white text-blue-700 border-blue-100 hover:bg-blue-50"
            )}
          >
            Staff
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", selectedRoleCategory === 'staff' ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700")}>
              {roleCounts.staff}
            </span>
          </button>
          <button
            onClick={() => { setSelectedRoleCategory('manager'); setCurrentPage(1); }}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border",
              selectedRoleCategory === 'manager'
                ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20"
                : "bg-white text-amber-700 border-amber-100 hover:bg-amber-50"
            )}
          >
            Managers
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", selectedRoleCategory === 'manager' ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700")}>
              {roleCounts.manager}
            </span>
          </button>
          <button
            onClick={() => { setSelectedRoleCategory('admin'); setCurrentPage(1); }}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border",
              selectedRoleCategory === 'admin'
                ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20"
                : "bg-white text-purple-700 border-purple-100 hover:bg-purple-50"
            )}
          >
            Admins
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", selectedRoleCategory === 'admin' ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700")}>
              {roleCounts.admin}
            </span>
          </button>
          <button
            onClick={() => { setSelectedRoleCategory('user'); setCurrentPage(1); }}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border",
              selectedRoleCategory === 'user'
                ? "bg-slate-600 text-white border-slate-600 shadow-md shadow-slate-600/20"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
            )}
          >
            Customers
            <span className={cn("px-2 py-0.5 rounded-full text-[10px]", selectedRoleCategory === 'user' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
              {roleCounts.user}
            </span>
          </button>
        </div>

        <div className="relative w-full xl:w-[320px] shrink-0">
          <input
            type="text"
            placeholder="Search by name, email or UID..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-10 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm transition-all placeholder:text-slate-400"
          />
          <UsersIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full p-1 transition-colors">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">User Profile</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Contact Info</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date Joined</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Access Level</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 bg-white">
            {filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(user => {
              const uRole = user.role || 'user';
              return (
                <tr key={user.uid || (user as any).id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center font-black text-sm shadow-inner shrink-0",
                        uRole === 'admin' ? "bg-purple-100 text-purple-700 border border-purple-200" :
                        uRole === 'manager' ? "bg-amber-100 text-amber-700 border border-amber-200" :
                        uRole === 'staff' ? "bg-blue-100 text-blue-700 border border-blue-200" :
                        "bg-slate-100 text-slate-700 border border-slate-200"
                      )}>
                        {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-900 block group-hover:text-blue-600 transition-colors">{user.displayName || 'Unnamed User'}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">UID: {(user.uid || (user as any).id || '').slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <a href={`mailto:${user.email}`} className="text-slate-600 hover:text-blue-600 flex items-center gap-2 text-sm font-medium transition-colors">
                      <Mail size={14} className="text-slate-400" /> {user.email}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-500">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative inline-block w-40">
                      <select
                        value={user.role || 'user'}
                        onChange={(e) => handleUpdateUserRole(user.uid || (user as any).id, e.target.value)}
                        className={cn(
                          "appearance-none w-full text-xs font-black rounded-xl pl-3 pr-8 py-2 border outline-none focus:ring-2 transition-all cursor-pointer",
                          user.role === 'admin' ? "bg-purple-50 text-purple-700 border-purple-200 focus:ring-purple-500/20" :
                          user.role === 'manager' ? "bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-500/20" :
                          user.role === 'staff' ? "bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500/20" :
                          "bg-slate-50 text-slate-700 border-slate-200 focus:ring-slate-500/20"
                        )}
                      >
                        <option value="user">Customer</option>
                        <option value="staff">Staff</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-70 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingUserPermissions(user);
                          setShowPermissionsModal(true);
                        }}
                        className="flex items-center gap-1.5 text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-200 transition-all shadow-sm"
                        title="Manage Permissions"
                      >
                        <Key size={14} /> <span className="hidden sm:inline">Manage</span>
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 p-2 rounded-lg border border-slate-200 hover:border-red-200 transition-all shadow-sm"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredUsers.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />

      {showPermissionsModal && editingUserPermissions && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] border border-slate-200/50">
            <div className="p-5 px-6 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <Key size={18} className="text-blue-500" /> Edit Profile & Permissions
              </h3>
              <button onClick={() => setShowPermissionsModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 p-1.5 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-white p-5 rounded-xl border border-slate-200 mb-6 shadow-sm">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Full Name / Nickname</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl px-4 py-2.5 font-bold text-slate-800 outline-none transition-all"
                  value={editingUserPermissions.displayName || ''}
                  onChange={e => setEditingUserPermissions({...editingUserPermissions, displayName: e.target.value})}
                  placeholder="e.g. System Admin, Muntasir..."
                />
              </div>

              <h4 className="font-black text-[11px] mb-3 text-slate-500 uppercase tracking-widest px-1">Primary Dashboard Access</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {[
                  { id: 'access_ecommerce', label: 'E-Commerce Admin', desc: 'Allow access to retail dashboard' },
                  { id: 'access_hosting', label: 'Hosting Admin', desc: 'Allow access to server/domain hub' }
                ].map(dash => {
                  const hasAccess = (editingUserPermissions.permissions || []).includes(dash.id);
                  return (
                    <label key={dash.id} className={cn(
                      "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      hasAccess ? "border-emerald-500 bg-emerald-50/50" : "border-slate-200 bg-white hover:border-slate-300"
                    )}>
                      <input type="checkbox" className="hidden" checked={hasAccess} onChange={() => {
                        const newPermissions = hasAccess
                          ? (editingUserPermissions.permissions || []).filter((p: string) => p !== dash.id)
                          : [...(editingUserPermissions.permissions || []), dash.id];
                        setEditingUserPermissions({...editingUserPermissions, permissions: newPermissions});
                      }} />
                      <div className="flex-1">
                        <span className="block font-bold text-slate-800">{dash.label}</span>
                        <span className="block text-[10px] text-slate-500 font-medium leading-snug mt-0.5">{dash.desc}</span>
                      </div>
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all", hasAccess ? "bg-emerald-500 border-emerald-500" : "border-slate-300")}>
                        {hasAccess && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                      </div>
                    </label>
                  )
                })}
              </div>

              <h4 className="font-black text-[11px] mb-3 text-slate-500 uppercase tracking-widest px-1">Granular App Permissions</h4>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                  <div className="p-5 space-y-3">
                     <div className="text-[10px] font-black text-slate-400 mb-4 border-b border-slate-100 pb-2 uppercase tracking-widest">E-Commerce & Operations</div>
                     {['manage_inventory', 'manage_orders', 'manage_marketing', 'manage_services'].map(perm => {
                        const hasPermission = (editingUserPermissions.permissions || []).includes(perm);
                        return (
                          <label key={perm} className="flex items-center gap-3 cursor-pointer group">
                            <div className={cn("w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors", hasPermission ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300 group-hover:border-blue-400")}>
                              {hasPermission && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                            </div>
                            <input type="checkbox" className="hidden" checked={hasPermission} onChange={() => {
                              const newPermissions = hasPermission
                                ? (editingUserPermissions.permissions || []).filter((p: string) => p !== perm)
                                : [...(editingUserPermissions.permissions || []), perm];
                              setEditingUserPermissions({...editingUserPermissions, permissions: newPermissions});
                            }} />
                            <span className="text-sm font-bold text-slate-700 capitalize group-hover:text-blue-700">{perm.replace(/manage_/g, '')}</span>
                          </label>
                        );
                     })}
                  </div>
                  <div className="p-5 space-y-3">
                     <div className="text-[10px] font-black text-slate-400 mb-4 border-b border-slate-100 pb-2 uppercase tracking-widest">System & Reports</div>
                     {['manage_finances', 'manage_reports', 'manage_users', 'manage_hr', 'manage_settings', 'view_dashboard'].map(perm => {
                        const hasPermission = (editingUserPermissions.permissions || []).includes(perm);
                        return (
                          <label key={perm} className="flex items-center gap-3 cursor-pointer group">
                            <div className={cn("w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors", hasPermission ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300 group-hover:border-blue-400")}>
                              {hasPermission && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                            </div>
                            <input type="checkbox" className="hidden" checked={hasPermission} onChange={() => {
                              const newPermissions = hasPermission
                                ? (editingUserPermissions.permissions || []).filter((p: string) => p !== perm)
                                : [...(editingUserPermissions.permissions || []), perm];
                              setEditingUserPermissions({...editingUserPermissions, permissions: newPermissions});
                            }} />
                            <span className="text-sm font-bold text-slate-700 capitalize group-hover:text-blue-700">{perm.replace(/manage_|view_/g, '')}</span>
                          </label>
                        );
                     })}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowPermissionsModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={async () => {
                await updateDoc(doc(db, 'users', editingUserPermissions.uid), { permissions: editingUserPermissions.permissions, displayName: editingUserPermissions.displayName });
                toast.success('Permissions updated successfully');
                setShowPermissionsModal(false);
                fetchData();
              }} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 text-white rounded-xl text-sm font-bold transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {isAddingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] border border-slate-200/50">
            <div className="p-5 px-6 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <UsersIcon size={18} className="text-emerald-400" /> New Portal User
              </h3>
              <button onClick={() => setIsAddingUser(false)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddPortalUser} className="p-6 overflow-y-auto flex-1 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Display Name</label>
                <input type="text" required className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-xl px-4 py-2.5 font-bold text-slate-800 outline-none transition-all" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} placeholder="e.g. Staff Member" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                <input type="email" required className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-xl px-4 py-2.5 font-bold text-slate-800 outline-none transition-all" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} placeholder="staff@example.com" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Temporary Password</label>
                <input type="password" required minLength={6} className="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-xl px-4 py-2.5 font-bold text-slate-800 outline-none transition-all" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} placeholder="Minimum 6 characters" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Base Role</label>
                <div className="relative">
                  <select className="w-full appearance-none bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-xl pl-4 pr-10 py-2.5 font-bold text-slate-800 outline-none transition-all cursor-pointer" value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value})}>
                    <option value="user">Customer (No Admin Access)</option>
                    <option value="staff">Staff (Limited Access)</option>
                    <option value="manager">Manager (Advanced Access)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
              {(userFormData.role === 'manager' || userFormData.role === 'staff') && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Custom Permissions</label>
                  <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
                    {['access_ecommerce', 'access_hosting', 'view_dashboard', 'manage_users', 'manage_settings', 'manage_inventory', 'manage_orders', 'manage_finances', 'manage_reports', 'manage_hr', 'manage_services', 'manage_marketing'].map((perm) => (
                      <label key={perm} className="flex items-center gap-2.5 cursor-pointer group">
                        <div className={cn("w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors shrink-0", userFormData.permissions.includes(perm as UserPermission) ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300 group-hover:border-blue-400")}>
                          {userFormData.permissions.includes(perm as UserPermission) && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={userFormData.permissions.includes(perm as UserPermission)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUserFormData({ ...userFormData, permissions: [...userFormData.permissions, perm as UserPermission] });
                            } else {
                              setUserFormData({ ...userFormData, permissions: userFormData.permissions.filter(p => p !== perm) });
                            }
                          }}
                        />
                        <span className="text-[11px] font-bold text-slate-700 capitalize group-hover:text-blue-700 whitespace-nowrap truncate">{perm.replace(/manage_|view_|access_/g, '')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddingUser(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersTab;
