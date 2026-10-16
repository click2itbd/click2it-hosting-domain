import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import { toast } from 'react-hot-toast';
import { Order } from '../../../types';

export const PENDING_STATUSES = ['pending', 'processing', 'on-hold'];
export const PAID_STATUSES = ['paid', 'delivered', 'completed'];
export const COLORS = ['#F59E0B', '#3B82F6'];

export function useDashboardData() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [domainOrders, setDomainOrders] = useState([]);
  const [hostingAccounts, setHostingAccounts] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ordSnap, domOrdSnap, haSnap, tickSnap, usersSnap] = await Promise.all([
          getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(500))),
          getDocs(query(collection(db, 'domainOrders'), orderBy('createdAt', 'desc'), limit(200))),
          getDocs(query(collection(db, 'hostingAccounts'), orderBy('createdAt', 'desc'), limit(200))),
          getDocs(query(collection(db, 'tickets'), orderBy('updatedAt', 'desc'), limit(100))),
          getDocs(collection(db, 'users')),
        ]);

        let fetchedOrders = ordSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        fetchedOrders = fetchedOrders.filter(order => 
          order.items && order.items.some(item => 
            item.itemType === 'domain' || 
            item.itemType === 'hosting' || 
            item.category === 'Hosting & Domains' ||
            item.isDigital
          )
        );

        setOrders(fetchedOrders);
        setDomainOrders(domOrdSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setHostingAccounts(haSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setTickets(tickSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        toast.error('Some data failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return {
    orders, setOrders,
    domainOrders, setDomainOrders,
    hostingAccounts, setHostingAccounts,
    tickets, setTickets,
    users, setUsers,
    loading
  };
}
