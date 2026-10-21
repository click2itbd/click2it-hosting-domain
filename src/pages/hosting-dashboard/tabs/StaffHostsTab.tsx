import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Server,
  Phone,
  Mail,
  Globe,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Zap,
  Cpu,
  Key,
  Copy,
  Eye,
  EyeOff,
  Search,
  Lock,
  Activity,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doc, setDoc, getDocs, deleteDoc, collection } from 'firebase/firestore';
import { db, firebaseConfig } from '../../../firebase';
import { generateCustomerPassword } from '../../../utils/customerAdminUtils';

export interface StaffHostMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  systemRole: 'admin' | 'manager' | 'staff';
  permissions: string[];
  status: 'active' | 'inactive' | 'on_leave';
  avatar?: string;
  assignedHosts: string[];
  assignedChannels: string[];
}

export interface ServerHostCluster {
  id: string;
  name: string;
  title: string; // Hostname / IP
  slug: string;  // Panel / Node Type (e.g. cPanel / WHM, KVM VPS Node)
  location: string;
  status: 'operational' | 'maintenance' | 'high_load';
}

const DEFAULT_SERVER_HOSTS: ServerHostCluster[] = [
  {
    id: 'host_bdix_1',
    name: 'Server Host BDIX #1 (Dhaka)',
    title: 'bdix1.click2it.bd',
    slug: 'cPanel / WHM Node',
    location: 'Dhaka, Bangladesh (BDIX)',
    status: 'operational',
  },
  {
    id: 'host_usa_2',
    name: 'cPanel USA NVMe #2 (Dallas)',
    title: 'us2.click2it.bd',
    slug: 'CloudLinux NVMe Node',
    location: 'Dallas, USA',
    status: 'operational',
  },
  {
    id: 'host_kvm_1',
    name: 'KVM VPS Node #1 (Singapore)',
    title: 'kvm-sg1.click2it.bd',
    slug: 'Virtualizor / Proxmox KVM',
    location: 'Singapore (Equinix SG1)',
    status: 'operational',
  },
  {
    id: 'host_wp_1',
    name: 'Enterprise WordPress Cloud Node',
    title: 'wp-cloud.click2it.bd',
    slug: 'LiteSpeed Enterprise',
    location: 'Frankfurt, Germany',
    status: 'operational',
  },
];

const AVAILABLE_PERMISSIONS = [
  { id: 'all', label: 'Full Access (All Modules)' },
  { id: 'orders', label: 'Hosting & Domain Orders' },
  { id: 'domains', label: 'Domain List & Renewals' },
  { id: 'hosting', label: 'Server Accounts & Provisioning' },
  { id: 'customers', label: 'Customers & Wallet' },
  { id: 'tickets', label: 'Support Tickets' },
  { id: 'crm', label: 'WhatsApp & Hosting CRM' },
  { id: 'financial', label: 'Billing & Financial Reports' },
];

const AVAILABLE_WA_CHANNELS = [
  'Official Sales & Technical Support Line',
  'VIP Enterprise Cloud VPS Line',
  'Billing & Invoice Support Line',
];

export function StaffHostsTab({ state }: { state?: any }) {
  const [staffHosts, setStaffHosts] = useState<StaffHostMember[]>([]);
  const [serverHosts, setServerHosts] = useState<ServerHostCluster[]>(DEFAULT_SERVER_HOSTS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'staff'>('all');

  // Staff Add/Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffHostMember | null>(null);
  const [createdStaffCredentials, setCreatedStaffCredentials] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(true);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'Technical Support Specialist',
    systemRole: 'staff' as 'admin' | 'manager' | 'staff',
    permissions: ['orders', 'domains', 'hosting', 'tickets'] as string[],
    status: 'active' as 'active' | 'inactive' | 'on_leave',
    assignedHosts: [] as string[],
    assignedChannels: [] as string[],
  });

  // Server Host Add/Edit Modal State
  const [showHostModal, setShowHostModal] = useState(false);
  const [editingHost, setEditingHost] = useState<ServerHostCluster | null>(null);
  const [hostForm, setHostForm] = useState({
    name: '',
    title: '',
    slug: 'cPanel / WHM Node',
    location: 'Dhaka, Bangladesh',
    status: 'operational' as 'operational' | 'maintenance' | 'high_load',
  });

  useEffect(() => {
    fetchStaffAndServers();
  }, []);

  const fetchStaffAndServers = async () => {
    setLoading(true);
    try {
      // 1. Load Server Hosts from Firestore 'servers' collection
      try {
        const srvSnap = await getDocs(collection(db, 'servers'));
        if (!srvSnap.empty) {
          const loadedServers: ServerHostCluster[] = srvSnap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || 'Server Host',
              title: data.title || data.hostname || '',
              slug: data.slug || data.type || 'cPanel / WHM Node',
              location: data.location || 'DataCenter',
              status: data.status || 'operational',
            };
          });
          if (loadedServers.length > 0) {
            setServerHosts(loadedServers);
          }
        }
      } catch (srvErr) {
        console.warn('Server hosts load fallback:', srvErr);
      }

      // 2. Load real Staff / Admins / Managers from Firestore 'users' collection
      const memberMap = new Map<string, StaffHostMember>();
      try {
        const uSnap = await getDocs(collection(db, 'users'));
        uSnap.docs.forEach(d => {
          const uData = d.data();
          if (
            uData &&
            (uData.role === 'admin' ||
              uData.role === 'manager' ||
              uData.role === 'staff' ||
              uData.isAdmin === true)
          ) {
            const sysRole: 'admin' | 'manager' | 'staff' =
              uData.role === 'admin' || uData.isAdmin
                ? 'admin'
                : uData.role === 'manager'
                ? 'manager'
                : 'staff';

            memberMap.set(d.id, {
              id: d.id,
              name: uData.displayName || uData.name || uData.email?.split('@')[0] || 'Staff Member',
              email: uData.email || '',
              phone: uData.phone || '',
              role:
                uData.company ||
                (sysRole === 'admin'
                  ? 'Support Admin'
                  : sysRole === 'manager'
                  ? 'Sales & Operations Lead'
                  : 'Technical Support Specialist'),
              systemRole: sysRole,
              permissions: Array.isArray(uData.permissions)
                ? uData.permissions
                : sysRole === 'admin'
                ? ['all']
                : ['orders', 'domains', 'hosting', 'tickets'],
              status: uData.status === 'on_leave' ? 'on_leave' : uData.status === 'inactive' || uData.status === 'suspended' ? 'inactive' : 'active',
              avatar: uData.photoURL || uData.avatar || '',
              assignedHosts: Array.isArray(uData.assignedHosts)
                ? uData.assignedHosts
                : [DEFAULT_SERVER_HOSTS[0].name],
              assignedChannels: Array.isArray(uData.assignedChannels)
                ? uData.assignedChannels
                : [AVAILABLE_WA_CHANNELS[0]],
            });
          }
        });
      } catch (uErr) {
        console.warn('Firestore users staff load warning:', uErr);
      }

      // 3. Also merge from backend /api/staff-hosts if any custom records exist
      try {
        const res = await fetch('/api/staff-hosts');
        const data = await res.json();
        if (data?.success && Array.isArray(data.staffHosts)) {
          data.staffHosts.forEach((m: any) => {
            if (m && m.id && !m.deleted) {
              const existing = memberMap.get(m.id);
              memberMap.set(m.id, {
                ...(existing || {}),
                id: m.id,
                name: m.name || existing?.name || 'Staff Member',
                email: m.email || existing?.email || '',
                phone: m.phone || existing?.phone || '',
                role: m.role || existing?.role || 'Technical Support Specialist',
                systemRole: m.systemRole || existing?.systemRole || 'staff',
                permissions: Array.isArray(m.permissions) ? m.permissions : existing?.permissions || [],
                status: m.status || existing?.status || 'active',
                avatar: m.avatar || existing?.avatar || '',
                assignedHosts: Array.isArray(m.assignedHosts) ? m.assignedHosts : existing?.assignedHosts || [],
                assignedChannels: Array.isArray(m.assignedChannels) ? m.assignedChannels : existing?.assignedChannels || [],
              });
            }
          });
        }
      } catch {
        // ignore if offline
      }

      setStaffHosts(Array.from(memberMap.values()));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingMember(null);
    setCreatedStaffCredentials(null);
    setForm({
      name: '',
      email: '',
      password: generateCustomerPassword(10),
      phone: '',
      role: 'Technical Support Specialist',
      systemRole: 'staff',
      permissions: ['orders', 'domains', 'hosting', 'tickets'],
      status: 'active',
      assignedHosts: serverHosts.length > 0 ? [serverHosts[0].name] : [],
      assignedChannels: [AVAILABLE_WA_CHANNELS[0]],
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (member: StaffHostMember) => {
    setEditingMember(member);
    setCreatedStaffCredentials(null);
    setForm({
      name: member.name,
      email: member.email,
      password: '',
      phone: member.phone || '',
      role: member.role,
      systemRole: member.systemRole || 'staff',
      permissions: Array.isArray(member.permissions) ? member.permissions : [],
      status: member.status,
      assignedHosts: member.assignedHosts || [],
      assignedChannels: member.assignedChannels || [],
    });
    setShowModal(true);
  };

  const handleSaveStaffHostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Please enter staff member name and email address');
      return;
    }

    if (!editingMember && (!form.password.trim() || form.password.trim().length < 6)) {
      toast.error('Please set a login password (at least 6 characters) for the new staff member');
      return;
    }

    setSaving(true);
    const cleanEmail = form.email.trim().toLowerCase();
    const cleanName = form.name.trim();
    let targetId = editingMember?.id || '';

    try {
      // If creating a new staff member, create their Firebase Auth account first so they can sign in!
      if (!editingMember && form.password.trim()) {
        const apiKey = firebaseConfig.apiKey;
        const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: form.password.trim(),
            returnSecureToken: true,
          }),
        });
        const signUpJson: any = await signUpRes.json();
        if (signUpRes.ok && signUpJson?.localId) {
          targetId = signUpJson.localId;
          if (signUpJson.idToken) {
            await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken: signUpJson.idToken,
                displayName: cleanName,
                returnSecureToken: false,
              }),
            }).catch(() => null);
          }
        } else if (signUpJson?.error?.message && !signUpJson.error.message.includes('EMAIL_EXISTS')) {
          throw new Error(`Could not create login account: ${signUpJson.error.message}`);
        }
      }

      if (!targetId) {
        targetId = `staff_${Date.now()}`;
      }

      const now = new Date().toISOString();
      const updatedMember: StaffHostMember = {
        id: targetId,
        name: cleanName,
        email: cleanEmail,
        phone: form.phone.trim(),
        role: form.role,
        systemRole: form.systemRole,
        permissions: form.systemRole === 'admin' ? ['all'] : form.permissions,
        status: form.status,
        avatar: editingMember?.avatar || '',
        assignedHosts: form.assignedHosts,
        assignedChannels: form.assignedChannels,
      };

      // 1. Save to Firestore 'users' collection (matches firestore.rules isValidUser!)
      await setDoc(
        doc(db, 'users', targetId),
        {
          uid: targetId,
          displayName: cleanName.slice(0, 100),
          name: cleanName.slice(0, 100),
          email: cleanEmail,
          phone: form.phone.trim().slice(0, 40),
          company: form.role.slice(0, 100),
          role: form.systemRole,
          isAdmin: form.systemRole === 'admin',
          permissions: updatedMember.permissions,
          status: form.status,
          assignedHosts: form.assignedHosts,
          assignedChannels: form.assignedChannels,
          updatedAt: now,
          ...(editingMember ? {} : { createdAt: now, balance: 0 }),
        },
        { merge: true }
      );

      // 2. Also sync with backend /api/staff-hosts (best effort)
      try {
        if (editingMember) {
          await fetch(`/api/staff-hosts/${targetId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedMember),
          });
        } else {
          await fetch('/api/staff-hosts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedMember),
          });
        }
      } catch {
        // non-blocking
      }

      setStaffHosts(prev => {
        const exists = prev.some(s => s.id === targetId);
        if (exists) {
          return prev.map(s => (s.id === targetId ? updatedMember : s));
        }
        return [updatedMember, ...prev];
      });

      if (!editingMember) {
        setCreatedStaffCredentials({
          ...updatedMember,
          plainPassword: form.password.trim(),
        });
        toast.success(`Staff account created for "${cleanName}"!`);
      } else {
        setShowModal(false);
        toast.success(`Staff member "${cleanName}" updated & synced!`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save staff member');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from Staff & Hosts access?`)) return;

    try {
      // Demote in Firestore 'users' to regular 'user' so they no longer have staff/admin access
      await setDoc(
        doc(db, 'users', id),
        {
          role: 'user',
          isAdmin: false,
          permissions: [],
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => null);

      await fetch(`/api/staff-hosts/${id}`, { method: 'DELETE' }).catch(() => null);

      setStaffHosts(prev => prev.filter(s => s.id !== id));
      toast.success(`Removed ${name} from Staff & Hosts team.`);
    } catch (err: any) {
      toast.error('Failed to remove staff member: ' + err.message);
    }
  };

  // Server Host Cluster Handlers
  const handleOpenAddHostModal = () => {
    setEditingHost(null);
    setHostForm({
      name: '',
      title: '',
      slug: 'cPanel / WHM Node',
      location: 'Dhaka, Bangladesh (BDIX)',
      status: 'operational',
    });
    setShowHostModal(true);
  };

  const handleOpenEditHostModal = (host: ServerHostCluster) => {
    setEditingHost(host);
    setHostForm({
      name: host.name,
      title: host.title,
      slug: host.slug,
      location: host.location,
      status: host.status,
    });
    setShowHostModal(true);
  };

  const handleSaveServerHost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostForm.name.trim()) {
      toast.error('Please enter a server host name');
      return;
    }

    const hostId = editingHost?.id || `host_${Date.now()}`;
    const newHost: ServerHostCluster = {
      id: hostId,
      name: hostForm.name.trim(),
      title: hostForm.title.trim() || 'node.click2it.bd',
      slug: hostForm.slug.trim(),
      location: hostForm.location.trim(),
      status: hostForm.status,
    };

    try {
      await setDoc(
        doc(db, 'servers', hostId),
        {
          name: newHost.name.slice(0, 200),
          title: newHost.title.slice(0, 200),
          slug: newHost.slug.slice(0, 150),
          location: newHost.location,
          status: newHost.status,
          price: 0,
          order: 1,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setServerHosts(prev => {
        const exists = prev.some(h => h.id === hostId);
        return exists ? prev.map(h => (h.id === hostId ? newHost : h)) : [...prev, newHost];
      });
      setShowHostModal(false);
      toast.success(`Server Host "${newHost.name}" saved!`);
    } catch (err: any) {
      toast.error('Failed to save server host: ' + err.message);
    }
  };

  const handleDeleteServerHost = async (host: ServerHostCluster) => {
    if (!confirm(`Remove server host "${host.name}" from monitored clusters?`)) return;
    try {
      await deleteDoc(doc(db, 'servers', host.id)).catch(() => null);
      setServerHosts(prev => prev.filter(h => h.id !== host.id));
      toast.success(`Removed server host "${host.name}"`);
    } catch (err: any) {
      toast.error('Failed to delete server host: ' + err.message);
    }
  };

  const handleToggleHost = (hostName: string) => {
    setForm(prev => {
      const exists = prev.assignedHosts.includes(hostName);
      return {
        ...prev,
        assignedHosts: exists
          ? prev.assignedHosts.filter(h => h !== hostName)
          : [...prev.assignedHosts, hostName],
      };
    });
  };

  const handleToggleChannel = (chanName: string) => {
    setForm(prev => {
      const exists = prev.assignedChannels.includes(chanName);
      return {
        ...prev,
        assignedChannels: exists
          ? prev.assignedChannels.filter(c => c !== chanName)
          : [...prev.assignedChannels, chanName],
      };
    });
  };

  const handleTogglePermission = (permId: string) => {
    setForm(prev => {
      if (permId === 'all') {
        return {
          ...prev,
          permissions: prev.permissions.includes('all') ? [] : ['all'],
        };
      }
      const withoutAll = prev.permissions.filter(p => p !== 'all');
      const exists = withoutAll.includes(permId);
      return {
        ...prev,
        permissions: exists ? withoutAll.filter(p => p !== permId) : [...withoutAll, permId],
      };
    });
  };

  const filteredStaff = useMemo(() => {
    return staffHosts.filter(m => {
      if (roleFilter !== 'all' && m.systemRole !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q) ||
          (m.phone || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [staffHosts, roleFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 md:p-10 shadow-2xl border border-white/10 overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-extrabold uppercase tracking-wider">
              <Shield size={14} className="text-cyan-300" /> Role-Based Staff Access &amp; Server Cluster Control
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Staff &amp; Hosts Management
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Create and manage real Admin, Manager, and Support Staff accounts with login passwords, module permissions, server cluster assignments, and WhatsApp CRM queue routing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleOpenAddModal}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserPlus size={16} /> + Add Staff Member
            </button>

            <button
              onClick={handleOpenAddHostModal}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Server size={16} /> + Add Server Host
            </button>

            <button
              onClick={() => {
                if (state?.setActiveTab) {
                  state.setActiveTab('whatsapp-crm');
                  toast.success('Opened WhatsApp CRM & Team Manager');
                }
              }}
              className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare size={15} /> WA Team CRM
            </button>

            <button
              onClick={fetchStaffAndServers}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/15 cursor-pointer"
              title="Refresh Staff & Servers"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Team Members</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {staffHosts.filter(s => s.status === 'active').length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{staffHosts.length} total accounts</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <UserCheck size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admins &amp; Managers</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {staffHosts.filter(s => s.systemRole === 'admin' || s.systemRole === 'manager').length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Elevated RBAC privileges</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Shield size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monitored Server Hosts</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{serverHosts.length}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {serverHosts.filter(h => h.status === 'operational').length} Operational
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Server size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Database &amp; Auth Sync</p>
            <p className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg mt-1.5 inline-flex items-center gap-1">
              <Zap size={12} /> Live Firebase RBAC
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Activity size={22} />
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'all', label: `All Team (${staffHosts.length})` },
            { id: 'admin', label: `Admins (${staffHosts.filter(s => s.systemRole === 'admin').length})` },
            { id: 'manager', label: `Managers (${staffHosts.filter(s => s.systemRole === 'manager').length})` },
            { id: 'staff', label: `Support Staff (${staffHosts.filter(s => s.systemRole === 'staff').length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                roleFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search staff by name, email, role..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Staff Members Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="text-indigo-600" size={20} />
            Staff &amp; Support Team Members ({filteredStaff.length})
          </h3>
        </div>

        {filteredStaff.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Users size={26} />
            </div>
            <h4 className="text-base font-extrabold text-slate-800">No Staff Members Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Click <strong>+ Add Staff Member</strong> above to create a real staff, manager, or admin account with login credentials.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 cursor-pointer"
            >
              <UserPlus size={15} /> + Add First Staff Member
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStaff.map(member => (
              <div
                key={member.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3.5">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white font-black text-lg flex items-center justify-center shadow-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                          {member.name}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              member.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : member.status === 'on_leave'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {member.status === 'on_leave' ? 'On Leave' : member.status}
                          </span>
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                            {member.role}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            RBAC: {member.systemRole || 'staff'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(member)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 transition-colors cursor-pointer"
                        title="Edit Staff Member & Permissions"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(member.id, member.name)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                        title="Remove Staff Access"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 text-xs text-slate-600 pt-2.5 border-t border-slate-100 font-medium">
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2 font-mono">
                        <Phone size={14} className="text-slate-400 shrink-0" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Assigned Permissions */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                    <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] block">
                      Module Access Permissions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(member.permissions || []).includes('all') || member.systemRole === 'admin' ? (
                        <span className="text-[11px] font-bold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1">
                          <Shield size={11} className="text-amber-600" /> Full Super Admin Access
                        </span>
                      ) : member.permissions && member.permissions.length > 0 ? (
                        member.permissions.map((perm, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-semibold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200 uppercase"
                          >
                            {perm}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs italic">Standard Support Access</span>
                      )}
                    </div>
                  </div>

                  {/* Assigned Host Clusters */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] block">
                      Assigned Server Host Clusters:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {member.assignedHosts && member.assignedHosts.length > 0 ? (
                        member.assignedHosts.map((host, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1"
                          >
                            <Server size={12} className="text-blue-600" /> {host}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs italic">All Server Hosts</span>
                      )}
                    </div>
                  </div>

                  {/* Assigned WA WhatsApp Channels */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] block">
                      WA WhatsApp Synced Channels:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {member.assignedChannels && member.assignedChannels.length > 0 ? (
                        member.assignedChannels.map((chan, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1"
                          >
                            <MessageSquare size={12} className="text-emerald-600" /> {chan}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs italic">All WA Channels</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Status */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Admin Portal Login:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1 text-[11px]">
                    <CheckCircle2 size={13} /> Enabled (/admin)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monitored Server Hosts & Cluster Health Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Server className="text-blue-600" size={20} />
              Monitored Server Hosts &amp; Cluster Health ({serverHosts.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Add or edit server nodes to assign staff members and monitor infrastructure status
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddHostModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={15} /> + Add Server Host
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {serverHosts.map(host => {
            const assignedStaff = staffHosts.filter(s => s.assignedHosts?.includes(host.name));
            return (
              <div
                key={host.id}
                className="p-4 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200 hover:border-blue-200 transition-all space-y-2.5 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Cpu size={15} className="text-blue-600 shrink-0" />
                      <span>{host.name}</span>
                    </h4>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditHostModal(host)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        title="Edit Server Host"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteServerHost(host)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete Server Host"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 mt-1">{host.title}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                      {host.slug}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                        host.status === 'operational'
                          ? 'bg-emerald-100 text-emerald-800'
                          : host.status === 'maintenance'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {host.status === 'high_load' ? 'High Load' : host.status}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-slate-600">
                  <span className="font-medium text-[11px] truncate max-w-[120px]">{host.location}</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[11px]">
                    {assignedStaff.length} Staff
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD / EDIT STAFF MEMBER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[92vh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/10">
                  <UserCheck size={20} className="text-cyan-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black">
                    {editingMember ? `Edit Staff Member — ${editingMember.name}` : 'Create New Staff / Admin Account'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Configure login credentials, RBAC permissions, server clusters &amp; WhatsApp queues
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {createdStaffCredentials ? (
              <div className="p-6 sm:p-8 space-y-5 overflow-y-auto">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3.5">
                  <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={24} />
                  <div>
                    <h4 className="text-base font-extrabold text-emerald-950">
                      Staff Login Account Created &amp; Synced!
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1">
                      This team member can now log in at <strong>/login</strong> and access the Admin Dashboard (<strong>/admin</strong>) with their assigned permissions.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="font-bold uppercase tracking-wider text-slate-500">Staff Login Credentials</span>
                    <button
                      type="button"
                      onClick={() => {
                        const text = `Click2IT Staff Portal Login\nURL: ${window.location.origin}/login\nAdmin Panel: ${window.location.origin}/admin\nName: ${createdStaffCredentials.name}\nRole: ${createdStaffCredentials.role} (${createdStaffCredentials.systemRole})\nEmail: ${createdStaffCredentials.email}\nPassword: ${createdStaffCredentials.plainPassword}`;
                        navigator.clipboard?.writeText(text);
                        toast.success('Staff credentials copied!');
                      }}
                      className="inline-flex items-center gap-1.5 font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg"
                    >
                      <Copy size={13} /> Copy Credentials
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block">Staff Name</span>
                      <span className="font-bold text-slate-900 text-sm">{createdStaffCredentials.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Access Role</span>
                      <span className="font-bold text-indigo-700 text-sm uppercase">
                        {createdStaffCredentials.systemRole} ({createdStaffCredentials.role})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Login Email</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{createdStaffCredentials.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Login Password</span>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-sm">
                        {createdStaffCredentials.plainPassword}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveStaffHostSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Mahmudul Hasan"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Email Address (Login ID) *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="e.g. mahmudul@click2it.bd"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Login Password (When creating new staff member) */}
                {!editingMember && (
                  <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Key size={14} className="text-indigo-600" /> Staff Login Password *
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ ...prev, password: generateCustomerPassword(10) }));
                            setShowPassword(true);
                          }}
                          className="text-[11px] font-bold px-2.5 py-1 bg-white text-indigo-700 rounded-lg border border-indigo-200 hover:bg-indigo-100"
                        >
                          <Sparkles size={11} className="inline mr-1" /> Generate Password
                        </button>
                        {form.password && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(form.password);
                              toast.success('Password copied!');
                            }}
                            className="text-[11px] font-bold px-2.5 py-1 bg-white text-slate-700 rounded-lg border border-slate-200"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        placeholder="Set login password (min 6 chars)"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      placeholder="+880 1712-345678"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">System Access Level *</label>
                    <select
                      value={form.systemRole}
                      onChange={e => {
                        const newSysRole = e.target.value as 'admin' | 'manager' | 'staff';
                        setForm(prev => ({
                          ...prev,
                          systemRole: newSysRole,
                          permissions:
                            newSysRole === 'admin'
                              ? ['all']
                              : prev.permissions.filter(p => p !== 'all'),
                        }));
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="staff">Support Staff (Standard)</option>
                      <option value="manager">Manager (Operations &amp; Sales)</option>
                      <option value="admin">Super Admin (Full Control)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Job Title / Designation</label>
                    <select
                      value={form.role}
                      onChange={e => setForm({ ...form, role: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Support Admin">Support Admin</option>
                      <option value="Sales & Operations Lead">Sales &amp; Operations Lead</option>
                      <option value="Technical Support Specialist">Technical Support Specialist</option>
                      <option value="Billing & Accounting Specialist">Billing &amp; Accounting Specialist</option>
                      <option value="System & Server Engineer">System &amp; Server Engineer</option>
                    </select>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Account Status</label>
                  <div className="flex flex-wrap items-center gap-4">
                    {[
                      { id: 'active', label: 'Active' },
                      { id: 'on_leave', label: 'On Leave' },
                      { id: 'inactive', label: 'Inactive / Suspended' },
                    ].map(st => (
                      <label key={st.id} className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                        <input
                          type="radio"
                          name="status"
                          checked={form.status === st.id}
                          onChange={() => setForm({ ...form, status: st.id as any })}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        {st.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Module Permissions */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="font-black text-slate-900 block text-xs">
                    Admin Panel Module Permissions
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AVAILABLE_PERMISSIONS.map(perm => {
                      const isChecked =
                        form.systemRole === 'admin' ||
                        form.permissions.includes('all') ||
                        form.permissions.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700 font-medium'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={form.systemRole === 'admin' && perm.id !== 'all'}
                            onChange={() => handleTogglePermission(perm.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span>{perm.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Assigned Server Host Clusters */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="font-black text-slate-900 block text-xs">
                    Assigned Server Host Clusters
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {serverHosts.map(host => {
                      const isChecked = form.assignedHosts.includes(host.name);
                      return (
                        <label
                          key={host.id}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700 font-medium'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleHost(host.name)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <span>{host.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Assigned WA WhatsApp Channels */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="font-black text-slate-900 block text-xs">
                    WA WhatsApp Synced Channels
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AVAILABLE_WA_CHANNELS.map((chanName, idx) => {
                      const isChecked = form.assignedChannels.includes(chanName);
                      return (
                        <label
                          key={idx}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-700 font-medium'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleChannel(chanName)}
                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                          />
                          <span>{chanName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {saving
                      ? 'Saving...'
                      : editingMember
                      ? 'Save Staff & Host Changes'
                      : 'Create & Sync Staff Member'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ADD / EDIT SERVER HOST CLUSTER MODAL */}
      {showHostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Server size={20} />
                <h3 className="text-base font-black">
                  {editingHost ? 'Edit Server Host Cluster' : 'Add Server Host Cluster'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHostModal(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveServerHost} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Server Host Cluster Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Server Host BDIX #2 (Dhaka)"
                  value={hostForm.name}
                  onChange={e => setHostForm({ ...hostForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Hostname or Primary IP *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. bdix2.click2it.bd or 103.x.x.x"
                  value={hostForm.title}
                  onChange={e => setHostForm({ ...hostForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Node / Panel Type</label>
                  <select
                    value={hostForm.slug}
                    onChange={e => setHostForm({ ...hostForm, slug: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none"
                  >
                    <option value="cPanel / WHM Node">cPanel / WHM Node</option>
                    <option value="CloudLinux NVMe Node">CloudLinux NVMe Node</option>
                    <option value="Virtualizor / Proxmox KVM">Virtualizor / Proxmox KVM</option>
                    <option value="LiteSpeed Enterprise">LiteSpeed Enterprise</option>
                    <option value="DirectAdmin Node">DirectAdmin Node</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cluster Status</label>
                  <select
                    value={hostForm.status}
                    onChange={e => setHostForm({ ...hostForm, status: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none"
                  >
                    <option value="operational">Operational</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="high_load">High Load</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Datacenter Location</label>
                <input
                  type="text"
                  placeholder="e.g. Dhaka, Bangladesh (BDIX)"
                  value={hostForm.location}
                  onChange={e => setHostForm({ ...hostForm, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHostModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  Save Server Host
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
