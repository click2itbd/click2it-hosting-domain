import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Globe, Server, Save, Loader2, CalendarClock, Settings, Lock, Unlock, Key, Shield, UserCheck, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiPost } from '../services/apiClient';
import { getFriendlyErrorMessage } from '../utils/errorUtils';
import { getDomainRenewalPrice } from '../services/domainApi';
import { DomainOwnershipModal } from './hosting/DomainOwnershipModal';

export const MyDomainsTab = ({ currentUser }: { currentUser: any }) => {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [managingOwnership, setManagingOwnership] = useState<any>(null);
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [managingDomain, setManagingDomain] = useState<any>(null);
  const [managingSettings, setManagingSettings] = useState<any>(null);
  const [domainDetails, setDomainDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [nsValues, setNsValues] = useState({ ns0: '', ns1: '' });
  const [savingNs, setSavingNs] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchDomains();
    }
  }, [currentUser]);

  
  const handleRenewDomain = async (domainOrder: any) => {
    try {
      const quote = await getDomainRenewalPrice(domainOrder.domain);
      addToCart({
        id: `renew_${domainOrder.domain}`,
        name: `Domain Renewal - ${domainOrder.domain}`,
        description: '1 Year Renewal',
        price: quote.renewalPriceBdt,
        category: 'Hosting & Domains',
        stock: 999,
        images: [],
        createdAt: new Date().toISOString(),
        itemType: 'domain_renewal',
        domain: domainOrder.domain,
        termYears: 1
      } as any);
      toast.success('Renewal added to cart');
      navigate('/hosting/checkout');
    } catch (error: any) {
      toast.error(getFriendlyErrorMessage(error, 'Could not retrieve domain renewal price. Please try again.'));
    }
  };

  const fetchDomains = async () => {
    setLoading(true);
    try {
      // Query by customerId first
      const qCust = query(
        collection(db, 'domainOrders'),
        where('customerId', '==', currentUser.uid)
      );
      const snapCust = await getDocs(qCust);
      const domMap = new Map();
      snapCust.docs.forEach(doc => domMap.set(doc.id, { id: doc.id, ...doc.data() }));

      // Also query by userId for backwards compatibility
      const qUser = query(
        collection(db, 'domainOrders'),
        where('userId', '==', currentUser.uid)
      );
      const snapUser = await getDocs(qUser);
      snapUser.docs.forEach(doc => domMap.set(doc.id, { id: doc.id, ...doc.data() }));

      setDomains(Array.from(domMap.values()));
    } catch (error) {
      console.error("Error fetching domains:", error);
    } finally {
      setLoading(false);
    }
  };

  
  const handleManageSettings = async (domainOrder: any) => {
    setManagingSettings(domainOrder);
    setManagingDomain(null);
    setLoadingDetails(true);
    setDomainDetails(null);
    try {
      const response = await apiPost<{ success: boolean; data?: unknown; error?: string }>('/api/domain/manage', {
        command: 'get_details',
        domain: domainOrder.domain
      });
      if (response.success && response.data) {
        setDomainDetails(response.data);
      } else {
        toast.error(getFriendlyErrorMessage(response.error, 'Failed to fetch domain details'));
      }
    } catch (e: any) {
      toast.error(getFriendlyErrorMessage(e, 'Error fetching details'));
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleToggleLock = async (domainOrder: any, currentStatus: boolean) => {
    const loadingToast = toast.loading(currentStatus ? 'Unlocking domain...' : 'Locking domain...');
    try {
      const response = await apiPost<{ success: boolean; error?: string }>('/api/domain/manage', {
        command: 'set_lock',
        domain: domainOrder.domain,
        extraParams: { isLocked: !currentStatus }
      });
      if (response.success) {
        toast.success(currentStatus ? 'Domain unlocked successfully!' : 'Domain locked successfully!', { id: loadingToast });
        setDomainDetails({ ...domainDetails, is_locked: !currentStatus });
      } else {
        toast.error(getFriendlyErrorMessage(response.error, 'Failed to update lock status'), { id: loadingToast });
      }
    } catch (e: any) {
      toast.error(getFriendlyErrorMessage(e, 'Error updating lock status'), { id: loadingToast });
    }
  };

  const handleUpdateNameServers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingDomain) return;
    if (!nsValues.ns0 || !nsValues.ns1) {
      toast.error('At least two nameservers are required');
      return;
    }

    setSavingNs(true);
    try {
      const response = await apiPost<{ success: boolean; data?: any; error?: string }>('/api/domains/manage', {
        command: 'set_ns',
        domain: managingDomain.domain,
        extraParams: {
          ns0: nsValues.ns0,
          ns1: nsValues.ns1
        }
      });

      if (response.success) {
        toast.success('NameServers updated successfully! It may take 24-48 hours to propagate.');
        await updateDoc(doc(db, 'domainOrders', managingDomain.id), {
          nameservers: nsValues
        });
        fetchDomains();
        setManagingDomain(null);
      } else {
        toast.error(getFriendlyErrorMessage(response.error, 'Failed to update NameServers. Please verify nameserver values.'), { id: undefined });
      }
    } catch (error: any) {
      console.error('NS Update Error:', error);
      toast.error(getFriendlyErrorMessage(error, 'Error communicating with domain registry'));
    } finally {
      setSavingNs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <Globe size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-bold text-gray-800 mb-2">No Domains Found</h3>
        <p className="text-gray-500">You haven't registered any domains yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {domains.map((domainOrder) => (
        <div key={domainOrder.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Globe className="text-blue-600" size={24} />
                <h3 className="text-xl font-bold text-gray-900">{domainOrder.domain}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold \${
                  domainOrder.status === 'active' ? 'bg-green-100 text-green-700' : 
                  domainOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                }`}>
                  {domainOrder.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <CalendarClock size={14} /> Registered on: {new Date(domainOrder.createdAt?.seconds * 1000).toLocaleDateString()}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => setManagingOwnership(domainOrder)}
                className="px-3.5 py-1.5 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                title="Push Domain to User or Update WHOIS Legal Registrant"
              >
                <UserCheck size={14} /> Ownership
              </button>
              <button 
                onClick={() => handleManageSettings(domainOrder)}
                className="px-3.5 py-1.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                title="Lock & Security Settings"
              >
                <Shield size={14} /> Lock & EPP
              </button>
              <button 
                onClick={() => {
                  setManagingDomain(domainOrder);
                  setNsValues(domainOrder.nameservers || { ns0: '', ns1: '' });
                }}
                className="px-3.5 py-1.5 border border-gray-200 hover:border-blue-500 hover:text-blue-600 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Server size={14} /> Manage DNS
              </button>
              <button 
                onClick={() => handleRenewDomain(domainOrder)}
                className="px-3.5 py-1.5 bg-[#0E2A47] hover:bg-blue-900 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw size={13} /> Renew
              </button>
            </div>
          </div>

          
            {managingSettings?.id === domainOrder.id && (
              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <Shield size={18} /> Settings & Security
                  </h4>
                  <button onClick={() => setManagingSettings(null)} className="text-gray-500 hover:text-gray-800 text-sm font-medium">Close</button>
                </div>
                
                {loadingDetails ? (
                  <div className="flex items-center gap-2 text-blue-600 p-4 bg-white rounded-lg border border-gray-200">
                    <Loader2 size={18} className="animate-spin" /> Fetching domain details from provider...
                  </div>
                ) : domainDetails ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Registrar Lock */}
                    <div className="p-4 bg-white rounded-xl border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                            {domainDetails.is_locked ? <Lock size={16} className="text-emerald-600" /> : <Unlock size={16} className="text-amber-500" />} 
                            Registrar Lock
                          </h5>
                          <p className="text-xs text-gray-500 mt-1">Prevents unauthorized domain transfers.</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-bold ${domainDetails.is_locked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {domainDetails.is_locked ? 'LOCKED' : 'UNLOCKED'}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleToggleLock(domainOrder, domainDetails.is_locked)}
                        className={`mt-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors w-full ${domainDetails.is_locked ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                      >
                        {domainDetails.is_locked ? 'Unlock Domain' : 'Lock Domain'}
                      </button>
                    </div>

                    {/* EPP / Auth Code */}
                    <div className="p-4 bg-white rounded-xl border border-gray-200">
                      <h5 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                        <Key size={16} className="text-blue-600" /> Transfer Auth Code
                      </h5>
                      <p className="text-xs text-gray-500 mb-3">Required to transfer this domain to another registrar.</p>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm break-all text-center select-all">
                        {domainDetails.auth_code || 'Not available'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-red-500 text-sm p-4 bg-red-50 rounded-lg border border-red-100">
                    Could not retrieve domain settings.
                  </div>
                )}
              </div>
            )}
  
            {managingDomain?.id === domainOrder.id && (
            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Settings size={18} /> Update NameServers
              </h4>
              <form onSubmit={handleUpdateNameServers} className="max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nameserver 1</label>
                    <input 
                      type="text" 
                      required
                      value={nsValues.ns0}
                      onChange={(e) => setNsValues({...nsValues, ns0: e.target.value})}
                      placeholder="e.g. ns1.yourhost.com"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nameserver 2</label>
                    <input 
                      type="text" 
                      required
                      value={nsValues.ns1}
                      onChange={(e) => setNsValues({...nsValues, ns1: e.target.value})}
                      placeholder="e.g. ns2.yourhost.com"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    type="submit" 
                    disabled={savingNs}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingNs ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save NameServers
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setManagingDomain(null)}
                    className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      ))}

      {managingOwnership && (
        <DomainOwnershipModal
          domain={managingOwnership.domain}
          isOpen={!!managingOwnership}
          onClose={() => setManagingOwnership(null)}
          onUpdated={() => fetchDomains()}
        />
      )}
    </div>
  );
};
