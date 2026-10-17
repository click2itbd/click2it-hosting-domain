import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export interface StaffHostMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive' | 'on_leave';
  avatar?: string;
  assignedHosts?: string[];
  assignedChannels?: string[];
}

export function useStaffHosts() {
  const [staffMembers, setStaffMembers] = useState<StaffHostMember[]>([
    { id: 'staff_1', name: 'Alex M.', email: 'alex@click2itbd.com', phone: '+880 1711-000111', role: 'Support Admin', status: 'active', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' },
    { id: 'staff_2', name: 'Sarah K.', email: 'sarah@click2itbd.com', phone: '+880 1711-000222', role: 'Sales & Operations Lead', status: 'active', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80' },
    { id: 'staff_3', name: 'Imran H.', email: 'imran@click2itbd.com', phone: '+880 1711-000333', role: 'Technical Support Specialist', status: 'active', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80' },
    { id: 'staff_4', name: 'Kamal R.', email: 'kamal@click2itbd.com', phone: '+880 1711-000444', role: 'Billing & Accounting Specialist', status: 'active', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80' }
  ]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaffMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    let loaded: StaffHostMember[] = [];

    // 1. Fetch from /api/staff-hosts backend endpoint
    try {
      const res = await fetch('/api/staff-hosts');
      const data = await res.json();
      if (data.success && Array.isArray(data.staffHosts) && data.staffHosts.length > 0) {
        loaded = data.staffHosts.map((s: any) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          phone: s.phone || '',
          role: s.role || 'Technical Support',
          status: s.status || 'active',
          avatar: s.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
          assignedHosts: s.assignedHosts || [],
          assignedChannels: s.assignedChannels || []
        }));
      }
    } catch (err: any) {
      console.warn('[useStaffHosts] Failed to load from /api/staff-hosts:', err?.message);
    }

    // 2. Fetch from Firestore 'staff_hosts' collection
    if (loaded.length === 0) {
      try {
        const snap = await getDocs(collection(db, 'staff_hosts'));
        if (!snap.empty) {
          snap.docs.forEach(d => {
            const data = d.data();
            if (data && data.name) {
              loaded.push({
                id: d.id,
                name: data.name,
                email: data.email || '',
                phone: data.phone || '',
                role: data.role || 'Technical Support',
                status: data.status || 'active',
                avatar: data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
                assignedHosts: data.assignedHosts || [],
                assignedChannels: data.assignedChannels || []
              });
            }
          });
        }
      } catch (err: any) {
        console.warn('[useStaffHosts] Could not fetch staff_hosts from Firestore:', err?.message);
      }
    }

    // 3. Fetch from Firestore 'users' collection with staff roles
    if (loaded.length === 0) {
      try {
        const q = query(collection(db, 'users'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          snap.docs.forEach(d => {
            const data = d.data();
            if (data && (data.role === 'admin' || data.role === 'staff' || data.role === 'manager')) {
              loaded.push({
                id: d.id,
                name: data.displayName || data.name || data.email?.split('@')[0] || 'Staff Member',
                email: data.email || '',
                phone: data.phone || '',
                role: data.role === 'admin' ? 'Support Admin' : (data.role === 'manager' ? 'Sales Lead' : 'Technical Support'),
                status: data.status || 'active',
                avatar: data.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
              });
            }
          });
        }
      } catch (err: any) {
        console.warn('[useStaffHosts] Could not fetch users from Firestore:', err?.message);
      }
    }

    if (loaded.length > 0) {
      setStaffMembers(loaded);
    }
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
