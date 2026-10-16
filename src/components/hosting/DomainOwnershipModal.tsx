import React, { useState, useEffect } from 'react';
import { 
  X, UserCheck, Send, Shield, Globe, AlertTriangle, CheckCircle2, 
  ExternalLink, Key, Lock, Unlock, Copy, Check, RefreshCw, Mail, Phone, MapPin, Building
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiPost } from '../../services/apiClient';

interface DomainOwnershipModalProps {
  domain: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const DomainOwnershipModal: React.FC<DomainOwnershipModalProps> = ({
  domain,
  isOpen,
  onClose,
  onUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'push' | 'whois' | 'external'>('push');

  // Push Tab State
  const [recipientEmail, setRecipientEmail] = useState('');
  const [confirmPush, setConfirmPush] = useState(false);
  const [pushing, setPushing] = useState(false);

  // WHOIS Tab State
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [savingWhois, setSavingWhois] = useState(false);
  const [contact, setContact] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phoneCountryCode: '+880',
    phoneNumber: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    country: 'BD',
  });

  // External Transfer State
  const [registryDetails, setRegistryDetails] = useState<any>(null);
  const [updatingLock, setUpdatingLock] = useState(false);
  const [copiedEpp, setCopiedEpp] = useState(false);

  useEffect(() => {
    if (isOpen && domain) {
      loadDomainInfo();
    }
  }, [isOpen, domain]);

  const loadDomainInfo = async () => {
    setLoadingDetails(true);
    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'get_details',
        domain
      });
      if (res && res.success && res.data) {
        setRegistryDetails(res.data);
        if (res.data.owner) {
          const owner = res.data.owner;
          setContact({
            firstName: owner.name?.first_name || '',
            lastName: owner.name?.last_name || '',
            companyName: owner.company_name || '',
            email: owner.email || '',
            phoneCountryCode: owner.phone?.country_code || '+880',
            phoneNumber: owner.phone?.subscriber_number || '',
            address: owner.address?.street || '',
            city: owner.address?.city || '',
            state: owner.address?.state || '',
            zipcode: owner.address?.zipcode || '',
            country: owner.address?.country || 'BD',
          });
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch registry details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (!isOpen) return null;

  // Handle Internal Push
  const handlePushDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.trim()) {
      toast.error('Please enter the recipient Click2IT email address');
      return;
    }
    if (!confirmPush) {
      toast.error('Please confirm ownership transfer authorization');
      return;
    }

    setPushing(true);
    const toastId = toast.loading(`Transferring ${domain} to ${recipientEmail}...`);

    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'push_domain',
        domain,
        extraParams: { recipientEmail: recipientEmail.trim() }
      });

      if (res && res.success) {
        toast.success(res.message || `Domain successfully transferred to ${recipientEmail}!`, { id: toastId });
        setRecipientEmail('');
        setConfirmPush(false);
        if (onUpdated) onUpdated();
        onClose();
      } else {
        toast.error(res?.error || 'Failed to transfer domain', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Server error while pushing domain', { id: toastId });
    } finally {
      setPushing(false);
    }
  };

  // Handle WHOIS Contact Update
  const handleUpdateWhois = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.firstName || !contact.lastName || !contact.email || !contact.phoneNumber || !contact.address || !contact.city) {
      toast.error('Please fill in all required contact fields');
      return;
    }

    const cleanPhone = contact.phoneNumber.replace(/\D/g, '').replace(/^(?:880|88)?0?/, '');
    if (!/^1[3-9]\d{8}$/.test(cleanPhone)) {
      toast.error('Please enter a valid 10-digit subscriber number starting with 1 (e.g. 17XXXXXXXX)');
      return;
    }

    setSavingWhois(true);
    const toastId = toast.loading('Updating legal registrant with global registry...');

    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'update_contacts',
        domain,
        extraParams: { contact }
      });

      if (res && res.success) {
        toast.success('Domain legal registrant updated successfully at registry!', { id: toastId });
        if (onUpdated) onUpdated();
      } else {
        toast.error(res?.error || 'Failed to update domain contacts', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Server error while updating contact', { id: toastId });
    } finally {
      setSavingWhois(false);
    }
  };

  // Toggle Registrar Lock for External Transfer
  const handleToggleLock = async () => {
    if (!registryDetails) return;
    const currentLock = !!registryDetails.is_locked;
    const nextState = !currentLock;
    setUpdatingLock(true);
    const toastId = toast.loading(`${nextState ? 'Locking' : 'Unlocking'} domain...`);

    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'set_lock',
        domain,
        extraParams: { isLocked: nextState }
      });

      if (res && res.success) {
        toast.success(`Domain ${nextState ? 'Locked' : 'Unlocked'} successfully!`, { id: toastId });
        setRegistryDetails((prev: any) => ({ ...prev, is_locked: nextState }));
        if (onUpdated) onUpdated();
      } else {
        toast.error(res?.error || 'Failed to update lock', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error updating lock', { id: toastId });
    } finally {
      setUpdatingLock(false);
    }
  };

  const copyEpp = () => {
    if (!registryDetails?.auth_code) return;
    navigator.clipboard.writeText(registryDetails.auth_code);
    setCopiedEpp(true);
    toast.success('EPP / Auth code copied!');
    setTimeout(() => setCopiedEpp(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#0e2a47] to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-400/20 px-2.5 py-0.5 rounded-full">
              International Domain Ownership
            </span>
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Change Domain Ownership
          </h2>
          <p className="text-blue-200 text-xs mt-1 font-mono">
            {domain}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-6 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('push')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'push'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck size={15} />
            <span>Push to User (Account-to-Account)</span>
          </button>

          <button
            onClick={() => setActiveTab('whois')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'whois'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe size={15} />
            <span>WHOIS / Legal Registrant</span>
          </button>

          <button
            onClick={() => setActiveTab('external')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'external'
                ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ExternalLink size={15} />
            <span>Transfer to External Registrar</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[72vh] overflow-y-auto">
          
          {/* TAB 1: Account Push */}
          {activeTab === 'push' && (
            <form onSubmit={handlePushDomain} className="space-y-5">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-900">
                  <UserCheck size={16} className="text-blue-600" />
                  What is Domain Push?
                </div>
                <p className="leading-relaxed">
                  Moving a domain to another Click2IT user is <strong>instant and free</strong>. The recipient will immediately gain full control over nameservers, DNS, and renewal billing. Website hosting and DNS records remain completely unaffected without downtime.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Recipient's Click2IT Account Email *
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="e.g. newowner@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  The recipient must already have a Click2IT registered account.
                </p>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle size={16} className="text-amber-600" /> Important Security Warning
                </div>
                <p>
                  Once you confirm this push, you will immediately lose ownership and access to <strong>{domain}</strong>. This action cannot be undone unless the new owner pushes it back.
                </p>
              </div>

              <div>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmPush}
                    onChange={(e) => setConfirmPush(e.target.checked)}
                    required
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    I confirm that I want to transfer full ownership, control, and management of <strong>{domain}</strong> to this Click2IT user.
                  </span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pushing || !confirmPush || !recipientEmail}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {pushing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Transferring Domain...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Push Domain to User
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: WHOIS / Legal Registrant */}
          {activeTab === 'whois' && (
            <form onSubmit={handleUpdateWhois} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Globe size={15} className="text-blue-600" /> ICANN Change of Registrant Policy
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Updating legal registrant contact information changes the registered owner at the international registry (Openprovider / ICANN).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contact.firstName}
                    onChange={(e) => setContact({ ...contact, firstName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="First Name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contact.lastName}
                    onChange={(e) => setContact({ ...contact, lastName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Last Name"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Organization / Company Name
                  </label>
                  <input
                    type="text"
                    value={contact.companyName}
                    onChange={(e) => setContact({ ...contact, companyName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Company Name (Optional)"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="owner@example.com"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Phone Country Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={contact.phoneCountryCode}
                    onChange={(e) => setContact({ ...contact, phoneCountryCode: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="+880"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Subscriber Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={contact.phoneNumber}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.startsWith('880')) val = val.slice(3);
                      else if (val.startsWith('88')) val = val.slice(2);
                      val = val.replace(/^0+/, '');
                      val = val.slice(0, 10);
                      setContact({ ...contact, phoneNumber: val });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="17XXXXXXXX"
                    maxLength={10}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={contact.address}
                    onChange={(e) => setContact({ ...contact, address: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="House, Road, Area"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={contact.city}
                    onChange={(e) => setContact({ ...contact, city: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Dhaka"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Postal / Zip Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={contact.zipcode}
                    onChange={(e) => setContact({ ...contact, zipcode: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="1207"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWhois}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {savingWhois ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Saving to Registry...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Save Legal Registrant
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: External Transfer Out */}
          {activeTab === 'external' && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <ExternalLink size={16} className="text-blue-600" />
                  How to transfer to another registrar
                </div>
                <p className="leading-relaxed">
                  To move your domain from Click2IT to another provider (such as Namecheap or GoDaddy), follow these 3 simple steps:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li><strong>Unlock Registrar Lock:</strong> Disable the domain lock below.</li>
                  <li><strong>Copy Secret EPP Code:</strong> Copy your transfer authorization key.</li>
                  <li><strong>Initiate Transfer:</strong> Go to the new registrar's domain transfer page and submit the code.</li>
                </ol>
              </div>

              {/* Lock Control */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    registryDetails?.is_locked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {registryDetails?.is_locked ? <Lock size={18} /> : <Unlock size={18} />}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      Registrar Lock:
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        registryDetails?.is_locked ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {registryDetails?.is_locked ? 'LOCKED (Protected)' : 'UNLOCKED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {registryDetails?.is_locked ? 'Unlock domain before initiating transfer.' : 'Domain is unlocked and ready for transfer.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleLock}
                  disabled={updatingLock}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 ${
                    registryDetails?.is_locked
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {updatingLock ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : registryDetails?.is_locked ? (
                    <Unlock size={13} />
                  ) : (
                    <Lock size={13} />
                  )}
                  <span>{registryDetails?.is_locked ? 'Unlock Domain' : 'Lock Domain'}</span>
                </button>
              </div>

              {/* EPP / Auth Code */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Key size={15} className="text-blue-600" /> Transfer EPP / Authorization Code
                  </span>
                  {registryDetails?.auth_code && (
                    <button
                      type="button"
                      onClick={copyEpp}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60"
                    >
                      {copiedEpp ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedEpp ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-center select-all break-all text-slate-800">
                  {registryDetails?.auth_code || 'Retrieving from registry...'}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
