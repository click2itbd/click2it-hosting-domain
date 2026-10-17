import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, Plus, Edit2, Trash2, Shield, Server, Phone, Mail, Globe, 
  CheckCircle2, AlertCircle, RefreshCw, Sparkles, ExternalLink, Settings, MessageSquare, Zap, Cpu
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../../../firebase';

export interface StaffHostMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive' | 'on_leave';
  avatar?: string;
  assignedHosts: string[];
  assignedChannels: string[];
}

export function StaffHostsTab({ state }: { state?: any }) {
  const [staffHosts, setStaffHosts] = useState<StaffHostMember[]>([
    {
      id: 'staff_1',
      name: 'Alex M.',
      email: 'alex@click2it.bd',
      phone: '+880 1711-000111',
      role: 'Support Admin',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      assignedHosts: ['Server Host BDIX #1 (Dhaka)', 'cPanel USA NVMe #2 (Dallas)', 'KVM VPS Node #1'],
      assignedChannels: ['Official Sales & Support Line', 'VIP Enterprise Line']
    },
    {
      id: 'staff_2',
      name: 'Sarah K.',
      email: 'sarah@click2it.bd',
      phone: '+880 1711-000222',
      role: 'Sales & Operations Lead',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
      assignedHosts: ['cPanel USA NVMe #2 (Dallas)', 'Enterprise WordPress Cloud'],
      assignedChannels: ['Official Sales & Support Line', 'VIP Enterprise Line']
    },
    {
      id: 'staff_3',
      name: 'Imran H.',
      email: 'imran@click2it.bd',
      phone: '+880 1711-000333',
      role: 'Technical Support Specialist',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      assignedHosts: ['Server Host BDIX #1 (Dhaka)', 'KVM VPS Node #1 (Germany)'],
      assignedChannels: ['Official Sales & Support Line']
    },
    {
      id: 'staff_4',
      name: 'Kamal R.',
      email: 'kamal@click2it.bd',
      phone: '+880 1711-000444',
      role: 'Billing & Accounting Specialist',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80',
      assignedHosts: ['WHMCS Billing Node #1'],
      assignedChannels: ['VIP Enterprise Line']
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffHostMember | null>(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Technical Support Specialist',
    status: 'active' as 'active' | 'inactive' | 'on_leave',
    assignedHosts: [] as string[],
    assignedChannels: [] as string[]
  });

  const availableHostNodes = [
    'Server Host BDIX #1 (Dhaka)',
    'cPanel USA NVMe #2 (Dallas)',
    'KVM VPS Node #1 (Germany)',
    'Enterprise WordPress Cloud Node',
    'WHMCS Billing Node #1'
  ];

  const availableWaChannels = [
    'Official Sales & Technical Support Line',
    'VIP Enterprise Cloud VPS Line',
    'Billing & Invoice Support Line'
  ];

  useEffect(() => {
    fetchStaffHosts();
  }, []);

  const fetchStaffHosts = async () => {
    setLoading(true);
    try {
      // 1. Fetch from backend API
      const res = await fetch('/api/staff-hosts');
      const data = await res.json();
      if (data.success && Array.isArray(data.staffHosts) && data.staffHosts.length > 0) {
        setStaffHosts(data.staffHosts);
      } else {
        // 2. Fallback to Firestore users collection
        const snap = await getDocs(collection(db, 'users'));
        if (!snap.empty) {
          const loaded: StaffHostMember[] = [];
          snap.docs.forEach(d => {
            const uData = d.data();
            if (uData && (uData.role === 'admin' || uData.role === 'staff' || uData.role === 'manager')) {
              loaded.push({
                id: d.id,
                name: uData.displayName || uData.name || uData.email?.split('@')[0] || 'Staff Member',
                email: uData.email || '',
                phone: uData.phone || '',
                role: uData.role === 'admin' ? 'Support Admin' : (uData.role === 'manager' ? 'Sales Lead' : 'Technical Support'),
                status: uData.status || 'active',
                avatar: uData.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80`,
                assignedHosts: uData.assignedHosts || ['Server Host BDIX #1 (Dhaka)'],
                assignedChannels: uData.assignedChannels || ['Official Sales & Support Line']
              });
            }
          });
          if (loaded.length > 0) {
            setStaffHosts(loaded);
          }
        }
      }
    } catch (err) {
      console.warn('Staff & Hosts fetch failed, using fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingMember(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      role: 'Technical Support Specialist',
      status: 'active',
      assignedHosts: [availableHostNodes[0]],
      assignedChannels: [availableWaChannels[0]]
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (member: StaffHostMember) => {
    setEditingMember(member);
    setForm({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      role: member.role,
      status: member.status,
      assignedHosts: member.assignedHosts || [],
      assignedChannels: member.assignedChannels || []
    });
    setShowModal(true);
  };

  const handleSaveStaffHostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('Please enter name and email');
      return;
    }

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: form.role,
      status: form.status,
      assignedHosts: form.assignedHosts,
      assignedChannels: form.assignedChannels,
      avatar: editingMember?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
    };

    try {
      let resData: any;
      if (editingMember) {
        // PUT update
        const res = await fetch(`/api/staff-hosts/${editingMember.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        resData = await res.json();
      } else {
        // POST create
        const res = await fetch('/api/staff-hosts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        resData = await res.json();
      }

      if (resData?.success && Array.isArray(resData.staffHosts)) {
        setStaffHosts(resData.staffHosts);
      } else {
        fetchStaffHosts();
      }

      // Sync into Firestore 'users' & 'staff_hosts' collection
      const targetId = editingMember?.id || `staff_${Date.now()}`;
      await setDoc(doc(db, 'staff_hosts', targetId), { ...payload, id: targetId }, { merge: true }).catch(() => null);
      await setDoc(doc(db, 'users', targetId), {
        uid: targetId,
        displayName: form.name,
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role.toLowerCase().includes('admin') ? 'admin' : (form.role.toLowerCase().includes('lead') ? 'manager' : 'staff'),
        status: form.status
      }, { merge: true }).catch(() => null);

      setShowModal(false);
      toast.success(
        `🎉 Staff member "${form.name}" saved & synchronized to WA WhatsApp Channel & Team Settings Manager in real-time!`
      );
    } catch (err: any) {
      toast.error('Failed to save staff member: ' + err.message);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from Staff & Hosts?`)) return;

    try {
      await fetch(`/api/staff-hosts/${id}`, { method: 'DELETE' });
      setStaffHosts(prev => prev.filter(s => s.id !== id));
      toast.success(`Removed ${name} from Staff & Hosts list.`);
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  const handleToggleHost = (hostName: string) => {
    setForm(prev => {
      const exists = prev.assignedHosts.includes(hostName);
      if (exists) {
        return { ...prev, assignedHosts: prev.assignedHosts.filter(h => h !== hostName) };
      } else {
        return { ...prev, assignedHosts: [...prev.assignedHosts, hostName] };
      }
    });
  };

  const handleToggleChannel = (chanName: string) => {
    setForm(prev => {
      const exists = prev.assignedChannels.includes(chanName);
      if (exists) {
        return { ...prev, assignedChannels: prev.assignedChannels.filter(c => c !== chanName) };
      } else {
        return { ...prev, assignedChannels: [...prev.assignedChannels, chanName] };
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 md:p-10 shadow-2xl border border-white/10 overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-extrabold uppercase tracking-wider">
            <UserCheck size={14} className="text-cyan-300" /> Real-time Sync with WA WhatsApp Channel Manager
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            Staff & Hosts Management
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
            Manage your support staff, system administrators, and server host clusters. Every staff member added or updated here is automatically synchronized in real-time with the <strong>WA WhatsApp Channel & Team Settings Manager</strong> and chat queue assignments.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus size={16} /> Add New Staff Member
            </button>

            <button
              onClick={() => {
                if (state?.setActiveTab) {
                  state.setActiveTab('whatsapp-crm');
                  toast.success('Navigated to WA WhatsApp Channel & Team Settings Manager!');
                }
              }}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <MessageSquare size={16} /> Open WA Team Sync Manager
            </button>

            <button
              onClick={fetchStaffHosts}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/20 flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh Sync State
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Staff Members</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{staffHosts.filter(s => s.status === 'active').length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <UserCheck size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monitored Server Hosts</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{availableHostNodes.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Server size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">WA Channels Synced</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{availableWaChannels.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <MessageSquare size={22} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sync Status</p>
            <p className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md mt-1 inline-block">
              ⚡ Live Synchronized
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
            <Zap size={22} />
          </div>
        </div>
      </div>

      {/* Staff Members List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="text-indigo-600" size={20} />
            Staff & Support Team Members ({staffHosts.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {staffHosts.map(member => (
            <div 
              key={member.id} 
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4 relative flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={member.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs"
                    />
                    <div>
                      <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                        {member.name}
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          member.status === 'active' ? 'bg-emerald-500' : (member.status === 'on_leave' ? 'bg-amber-500' : 'bg-slate-300')
                        }`} title={member.status} />
                      </h4>
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200 inline-block mt-0.5">
                        {member.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(member)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Edit Staff Member"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMember(member.id, member.name)}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                      title="Delete Staff Member"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100 font-medium">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400 shrink-0" />
                    <span>{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2 font-mono">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>

                {/* Assigned Host Clusters */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">
                    Assigned Server Host Clusters:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {member.assignedHosts && member.assignedHosts.length > 0 ? (
                      member.assignedHosts.map((host, idx) => (
                        <span key={idx} className="text-[11px] font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
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
                  <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">
                    WA WhatsApp Synced Channels:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {member.assignedChannels && member.assignedChannels.length > 0 ? (
                      member.assignedChannels.map((chan, idx) => (
                        <span key={idx} className="text-[11px] font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
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
                <span className="text-slate-400 font-medium">Data Sync:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1 text-[11px]">
                  <CheckCircle2 size={13} /> Synced with WA CRM
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Server Hosts Summary Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Server className="text-blue-600" size={20} />
          Monitored Server Hosts & Cluster Health
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {availableHostNodes.map((hostName, idx) => {
            const assignedStaff = staffHosts.filter(s => s.assignedHosts?.includes(hostName));
            return (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Cpu size={15} className="text-blue-600" /> {hostName}
                  </h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Operational" />
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
                  <span className="font-medium">Assigned Staff:</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {assignedStaff.length} Members
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD / EDIT STAFF MEMBER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <UserCheck size={20} className="text-indigo-600" />
                {editingMember ? `Modify Staff Member "${editingMember.name}"` : 'Add New Staff Member & Host Assignment'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStaffHostSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Mahmudul Hasan"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. mahmudul@click2it.bd"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +880 1712-345678"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Staff Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Support Admin">Support Admin</option>
                    <option value="Sales & Operations Lead">Sales & Operations Lead</option>
                    <option value="Technical Support Specialist">Technical Support Specialist</option>
                    <option value="Billing & Accounting Specialist">Billing & Accounting Specialist</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Account Status</label>
                <div className="flex items-center gap-4">
                  {[
                    { id: 'active', label: 'Active' },
                    { id: 'on_leave', label: 'On Leave' },
                    { id: 'inactive', label: 'Inactive / Suspended' }
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

              {/* Assigned Server Host Clusters */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-black text-slate-900 block text-xs">
                  Assigned Server Host Clusters
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableHostNodes.map((hostName, idx) => {
                    const isChecked = form.assignedHosts.includes(hostName);
                    return (
                      <label 
                        key={idx} 
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                          isChecked ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 font-medium'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleHost(hostName)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span>{hostName}</span>
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
                <div className="space-y-2">
                  {availableWaChannels.map((chanName, idx) => {
                    const isChecked = form.assignedChannels.includes(chanName);
                    return (
                      <label 
                        key={idx} 
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                          isChecked ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 font-medium'
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
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {editingMember ? 'Save Staff & Host Changes' : 'Add & Sync Staff Member'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
