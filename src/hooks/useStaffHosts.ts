import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface StaffHostMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  systemRole?: 'admin' | 'manager' | 'staff';
  status: 'active' | 'inactive' | 'on_leave';
  avatar?: string;
  assignedHosts?: string[];
  assignedChannels?: string[];
}

export function useStaffHosts() {
  const [staffMembers, setStaffMembers] = useState<StaffHostMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaffMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const mergedMap = new Map<string, StaffHostMember>();

    // 1. Fetch from Firestore 'users' collection with staff/manager/admin roles
    try {
      const q = query(collection(db, 'users'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        snap.docs.forEach(d => {
          const data = d.data();
          if (data && (data.role === 'admin' || data.role === 'staff' || data.role === 'manager' || data.isAdmin === true)) {
            const sysRole: 'admin' | 'manager' | 'staff' =
              data.role === 'admin' || data.isAdmin === true
                ? 'admin'
                : data.role === 'manager'
                ? 'manager'
                : 'staff';
            const displayRole =
              data.company ||
              data.jobTitle ||
              (sysRole === 'admin'
                ? 'Super Admin / System Architect'
                : sysRole === 'manager'
                ? 'Sales & Operations Manager'
                : 'Technical Support Specialist');

            mergedMap.set(d.id, {
              id: d.id,
              name: data.displayName || data.name || data.email?.split('@')[0] || 'Staff Member',
              email: data.email || '',
              phone: data.phone || '',
              role: displayRole,
              systemRole: sysRole,
              status: data.status === 'inactive' || data.status === 'on_leave' ? data.status : 'active',
              avatar: data.photoURL || data.avatar || '',
              assignedHosts: Array.isArray(data.assignedHosts) ? data.assignedHosts : ['KVM-BD-Node-01'],
              assignedChannels: Array.isArray(data.assignedChannels) ? data.assignedChannels : ['Ticket Queue', 'Live Chat']
            });
          }
        });
      }
    } catch (err: any) {
      console.warn('[useStaffHosts] Could not fetch users from Firestore:', err?.message);
    }

    // 2. Fetch from Firestore 'staff_hosts' collection and merge
    try {
      const snap = await getDocs(collection(db, 'staff_hosts'));
      if (!snap.empty) {
        snap.docs.forEach(d => {
          const data = d.data();
          if (data && !data.deleted && (data.name || data.email)) {
            const existing = mergedMap.get(d.id);
            mergedMap.set(d.id, {
              id: d.id,
              name: data.name || existing?.name || 'Staff Member',
              email: data.email || existing?.email || '',
              phone: data.phone || existing?.phone || '',
              role: data.role || existing?.role || 'Technical Support Specialist',
              systemRole: data.systemRole || existing?.systemRole || 'staff',
              status: data.status || existing?.status || 'active',
              avatar: data.avatar || existing?.avatar || '',
              assignedHosts: Array.isArray(data.assignedHosts) ? data.assignedHosts : (existing?.assignedHosts || []),
              assignedChannels: Array.isArray(data.assignedChannels) ? data.assignedChannels : (existing?.assignedChannels || [])
            });
          }
        });
      }
    } catch (err: any) {
      console.warn('[useStaffHosts] Could not fetch staff_hosts from Firestore:', err?.message);
    }

    // 3. Fetch from /api/staff-hosts backend endpoint and merge
    try {
      const res = await fetch('/api/staff-hosts');
      const data = await res.json();
      if (data.success && Array.isArray(data.staffHosts) && data.staffHosts.length > 0) {
        data.staffHosts.forEach((s: any) => {
          if (s && s.id && !s.deleted) {
            const existing = mergedMap.get(s.id);
            mergedMap.set(s.id, {
              id: s.id,
              name: s.name || existing?.name || 'Staff Member',
              email: s.email || existing?.email || '',
              phone: s.phone || existing?.phone || '',
              role: s.role || existing?.role || 'Technical Support Specialist',
              systemRole: s.systemRole || existing?.systemRole || 'staff',
              status: s.status || existing?.status || 'active',
              avatar: s.avatar || existing?.avatar || '',
              assignedHosts: Array.isArray(s.assignedHosts) ? s.assignedHosts : (existing?.assignedHosts || []),
              assignedChannels: Array.isArray(s.assignedChannels) ? s.assignedChannels : (existing?.assignedChannels || [])
            });
          }
        });
      }
    } catch (err: any) {
      console.warn('[useStaffHosts] Failed to load from /api/staff-hosts:', err?.message);
    }

    // 4. Fallback to current authenticated admin if map is still empty
    if (mergedMap.size === 0 && auth.currentUser) {
      const u = auth.currentUser;
      mergedMap.set(u.uid, {
        id: u.uid,
        name: u.displayName || u.email?.split('@')[0] || 'Administrator',
        email: u.email || '',
        phone: '',
        role: 'Super Admin',
        systemRole: 'admin',
        status: 'active',
        avatar: u.photoURL || '',
        assignedHosts: ['KVM-BD-Node-01'],
        assignedChannels: ['Ticket Queue', 'Live Chat']
      });
    }

    setStaffMembers(Array.from(mergedMap.values()));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStaffMembers();
  }, [fetchStaffMembers]);

  return {
    staffMembers,
    activeStaffMembers: staffMembers.filter(s => s.status === 'active'),
    loading,
    error,
    refetch: fetchStaffMembers
  };
}
