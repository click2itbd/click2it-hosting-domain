import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { toast } from 'react-hot-toast';
import { checkDomainAvailability } from '../../../services/hostingApi';

export function useDomainManagement(domainOrders, setDomainOrders) {
  const [domainQuery, setDomainQuery] = useState('');
  const [isSearchingDomain, setIsSearchingDomain] = useState(false);
  const [domainResults, setDomainResults] = useState(null);
  const [domainOrderPage, setDomainOrderPage] = useState(1);
  const [domainStatusEdits, setDomainStatusEdits] = useState({});
  const [savingDomainStatus, setSavingDomainStatus] = useState({});

  const handleDomainSearch = async () => {
    if (!domainQuery.trim()) return;
    setIsSearchingDomain(true);
    setDomainResults(null);
    try {
      const q = domainQuery.trim().toLowerCase();
      const baseName = q.includes('.') ? q.split('.')[0] : q;
      const targetExt = q.includes('.') ? '.' + q.split('.').slice(1).join('.') : '.com';
      const domainsToCheck = [
        `${baseName}${targetExt}`,
        `${baseName}.net`,
        `${baseName}.org`,
        `${baseName}.io`,
        `${baseName}.co`,
      ];
      const results = await checkDomainAvailability(domainsToCheck);
      setDomainResults(results);
    } catch (err) {
      toast.error('Domain availability check failed');
      setDomainResults([]);
    } finally {
      setIsSearchingDomain(false);
    }
  };

  const saveDomainOrderStatus = async (id) => {
    const newStatus = domainStatusEdits[id];
    if (!newStatus) return;
    setSavingDomainStatus(prev => ({ ...prev, [id]: true }));
    try {
      await updateDoc(doc(db, 'domainOrders', id), { status: newStatus });
      setDomainOrders(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
      toast.success('Domain order status updated');
    } catch {
      toast.error('Failed to update domain order status');
    } finally {
      setSavingDomainStatus(prev => ({ ...prev, [id]: false }));
    }
  };

  const ITEMS_PER_PAGE = 15;
  const domainOrdersTotal = domainOrders.length;
  const domainOrdersPages = Math.max(1, Math.ceil(domainOrdersTotal / ITEMS_PER_PAGE));
  const pagedDomainOrders = domainOrders.slice((domainOrderPage - 1) * ITEMS_PER_PAGE, domainOrderPage * ITEMS_PER_PAGE);

  return {
    domainQuery, setDomainQuery,
    isSearchingDomain,
    domainResults,
    domainOrderPage, setDomainOrderPage,
    domainStatusEdits, setDomainStatusEdits,
    savingDomainStatus,
    handleDomainSearch,
    saveDomainOrderStatus,
    domainOrdersPages,
    pagedDomainOrders
  };
}
