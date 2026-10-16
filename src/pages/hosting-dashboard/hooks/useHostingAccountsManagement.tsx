import { useState } from 'react';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { toast } from 'react-hot-toast';
import { provisionHostingAccount, suspendHostingAccount, unsuspendHostingAccount, terminateHostingAccount } from '../../../services/hostingApi';

export function useHostingAccountsManagement(hostingAccounts, setHostingAccounts) {
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({ domain: '', email: '', billingCycle: 'monthly', planCode: '' });
  const [provisioningAccount, setProvisioningAccount] = useState(false);
  const [accountActionLoading, setAccountActionLoading] = useState({});

  const handleAccountAction = async (account, action) => {
    if (action === 'terminate' && !window.confirm(`Terminate account for ${account.domain}? This cannot be undone.`)) return;
    const key = `${account.id}-${action}`;
    setAccountActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      const pid = account.providerAccountId || account.id;
      let result;
      if (action === 'suspend') result = await suspendHostingAccount(pid);
      else if (action === 'unsuspend') result = await unsuspendHostingAccount(pid);
      else if (action === 'terminate') result = await terminateHostingAccount(pid);

      if (result && result.success === false) throw new Error(result.error || 'API error');

      const newStatus = action === 'suspend' ? 'suspended' : action === 'unsuspend' ? 'active' : 'terminated';
      await updateDoc(doc(db, 'hostingAccounts', account.id), { status: newStatus });
      setHostingAccounts(prev => prev.map(a => a.id === account.id ? { ...a, status: newStatus } : a));
      toast.success(`Account ${action}ed successfully`);
    } catch (err) {
      toast.error(`Failed to ${action} account: ${err.message || 'Unknown error'}`);
    } finally {
      setAccountActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleProvisionAccount = async (e) => {
    e.preventDefault();
    if (!newAccountForm.domain || !newAccountForm.email) {
      toast.error('Domain and email are required');
      return;
    }
    setProvisioningAccount(true);
    try {
      const result = await provisionHostingAccount({
        domain: newAccountForm.domain,
        contactEmail: newAccountForm.email,
        billingCycle: newAccountForm.billingCycle,
        planCode: newAccountForm.planCode || undefined,
      });
      if (result && result.success === false) throw new Error(result.error || 'Provisioning failed');
      toast.success(`Hosting account provisioned for ${newAccountForm.domain}`);
      setShowNewAccountModal(false);
      setNewAccountForm({ domain: '', email: '', billingCycle: 'monthly', planCode: '' });
      
      const haSnap = await getDocs(query(collection(db, 'hostingAccounts'), orderBy('createdAt', 'desc'), limit(200)));
      setHostingAccounts(haSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error(`Provisioning failed: ${err.message || 'Unknown error'}`);
    } finally {
      setProvisioningAccount(false);
    }
  };

  return {
    showNewAccountModal, setShowNewAccountModal,
    newAccountForm, setNewAccountForm,
    provisioningAccount,
    accountActionLoading,
    handleAccountAction,
    handleProvisionAccount
  };
}
