import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { Layout } from '../../components/Layout';
import { 
  Shield, Lock, Unlock, Key, Copy, Check, Eye, EyeOff, 
  RefreshCw, Globe, AlertTriangle, CheckCircle, ArrowLeft, 
  HelpCircle, ChevronRight, Server, RotateCcw, UserCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiPost } from '../../services/apiClient';
import { getFriendlyErrorMessage } from '../../utils/errorUtils';
import { NameserverModal } from '../../components/hosting/NameserverModal';
import { DomainOwnershipModal } from '../../components/hosting/DomainOwnershipModal';

interface DomainOrder {
  id: string;
  domain: string;
  status: string;
  expiresAt?: string;
  autoRenew?: boolean;
  price?: number;
  [key: string]: any;
}

export const DomainSecurityPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlDomain = searchParams.get('domain') || '';

  const [domains, setDomains] = useState<DomainOrder[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  
  // Security details for selected domain
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [updatingLock, setUpdatingLock] = useState(false);
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);
  const [showEpp, setShowEpp] = useState(false);
  const [copiedEpp, setCopiedEpp] = useState(false);

  // Nameserver modal
  const [managingNs, setManagingNs] = useState<DomainOrder | null>(null);
  const [showOwnershipModal, setShowOwnershipModal] = useState(false);

  // 1. Fetch user's domains
  useEffect(() => {
    if (!user) return;
    const qDomains = query(collection(db, 'domainOrders'), where('userId', '==', user.uid), limit(100));
    const unsub = onSnapshot(qDomains, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as DomainOrder));
      setDomains(list);
      setLoadingDomains(false);

      if (urlDomain) {
        setSelectedDomain(urlDomain);
      } else if (list.length > 0 && !selectedDomain) {
        setSelectedDomain(list[0].domain);
      }
    }, (err) => {
      console.error('Error loading domains:', err);
      setLoadingDomains(false);
    });

    return () => unsub();
  }, [user, urlDomain]);

  // 2. Fetch security details whenever selected domain changes
  const fetchDomainDetails = async (domName: string) => {
    if (!domName) return;
    setLoadingDetails(true);
    setDetails(null);
    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'get_details',
        domain: domName
      });
      if (res && res.success && res.data) {
        setDetails(res.data);
      } else {
        toast.error(getFriendlyErrorMessage(res?.error, `Could not retrieve registry status for ${domName}. Please try again.`));
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Unable to connect to domain registry right now. Please try again shortly.'));
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedDomain) {
      fetchDomainDetails(selectedDomain);
    }
  }, [selectedDomain]);

  // Change selected domain
  const handleSelectDomain = (dom: string) => {
    setSelectedDomain(dom);
    setSearchParams({ domain: dom });
  };

  // Toggle Registrar Lock
  const handleToggleLock = async () => {
    if (!details || !selectedDomain) return;
    const nextLock = !details.is_locked;
    setUpdatingLock(true);
    const toastId = toast.loading(`${nextLock ? 'Locking' : 'Unlocking'} domain at registry...`);

    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'set_lock',
        domain: selectedDomain,
        extraParams: { isLocked: nextLock }
      });

      if (res && res.success) {
        toast.success(`Domain ${nextLock ? 'Locked (Transfer Prohibited)' : 'Unlocked (Transfer Allowed)'}!`, { id: toastId });
        setDetails((prev: any) => ({ ...prev, is_locked: nextLock }));
      } else {
        toast.error(getFriendlyErrorMessage(res?.error, 'Failed to update domain lock status. Please try again.'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to update domain lock status. Please try again.'), { id: toastId });
    } finally {
      setUpdatingLock(false);
    }
  };

  // Toggle WHOIS Privacy
  const handleTogglePrivacy = async () => {
    if (!details || !selectedDomain) return;
    const nextPrivacy = !details.is_whois_privacy_enabled;
    setUpdatingPrivacy(true);
    const toastId = toast.loading(`${nextPrivacy ? 'Enabling' : 'Disabling'} WHOIS Privacy...`);

    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'set_whois_privacy',
        domain: selectedDomain,
        extraParams: { isEnabled: nextPrivacy }
      });

      if (res && res.success) {
        toast.success(`WHOIS Privacy ${nextPrivacy ? 'Enabled' : 'Disabled'}!`, { id: toastId });
        setDetails((prev: any) => ({ ...prev, is_whois_privacy_enabled: nextPrivacy }));
      } else {
        toast.error(getFriendlyErrorMessage(res?.error, 'Failed to update WHOIS privacy. Please try again.'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to update WHOIS privacy. Please try again.'), { id: toastId });
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const copyEpp = () => {
    if (!details?.auth_code) return;
    navigator.clipboard.writeText(details.auth_code);
    setCopiedEpp(true);
    toast.success('EPP Code copied!');
    setTimeout(() => setCopiedEpp(false), 2000);
  };

  const isLocked = details ? Boolean(details.is_locked) : true;
  const isPrivacyOn = details ? Boolean(details.is_whois_privacy_enabled) : false;
  const authCode = details?.auth_code || '';
  const currentDomainObj = domains.find(d => d.domain === selectedDomain);

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/60 pb-16">
        
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-slate-950 via-[#0a1f38] to-slate-900 text-white border-b border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.18),rgba(255,255,255,0))] pointer-events-none" />
          
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 relative">
            <button
              onClick={() => navigate('/account/services')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white mb-4 transition"
            >
              <ArrowLeft size={14} /> Back to My Services
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    Domain Lock & Theft Protection
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/20 uppercase tracking-wide">
                    Registry Security
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Protect your domain from unauthorized hijackers or unlock it with your secret EPP/Auth code when preparing to transfer out.
                </p>
              </div>

              {/* Domain Selector Dropdown */}
              {domains.length > 0 && (
                <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/15 backdrop-blur-md">
                  <Globe size={16} className="text-blue-300 ml-2" />
                  <select
                    value={selectedDomain}
                    onChange={(e) => handleSelectDomain(e.target.value)}
                    className="bg-transparent text-white text-xs font-bold px-2 py-1 outline-none cursor-pointer"
                  >
                    {domains.map(d => (
                      <option key={d.id} value={d.domain} className="bg-slate-900 text-white">
                        {d.domain}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          
          {loadingDomains ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw size={28} className="animate-spin text-blue-600" />
              <p className="text-xs font-medium">Loading your domain security profiles...</p>
            </div>
          ) : domains.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Globe size={28} />
              </div>
              <h3 className="font-bold text-slate-900 text-base">No Registered Domains Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
                You do not have any registered domains under this account. Once you register or transfer a domain to Click2IT, you can manage Registrar Locks and EPP codes here.
              </p>
              <button
                onClick={() => navigate('/domain')}
                className="px-5 py-2.5 bg-[#0E2A47] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Find & Register a Domain
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (2 Cols): Security Controls */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Domain Overview Banner */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Globe size={22} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900">{selectedDomain}</h2>
                      <p className="text-xs text-slate-500">
                        Expires: {currentDomainObj?.expiresAt ? new Date(currentDomainObj.expiresAt).toLocaleDateString() : 'N/A'}
                        {currentDomainObj?.expiresAt && ` (${Math.ceil((new Date(currentDomainObj.expiresAt).getTime() - Date.now()) / (1000 * 3600 * 24))} days left)`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchDomainDetails(selectedDomain)}
                      disabled={loadingDetails}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <RefreshCw size={12} className={loadingDetails ? 'animate-spin' : ''} />
                      <span>Sync Registry</span>
                    </button>
                    {currentDomainObj && (
                      <>
                        <button
                          onClick={() => setManagingNs(currentDomainObj)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-blue-200/60"
                        >
                          <Server size={12} />
                          <span>Nameservers</span>
                        </button>
                        <button
                          onClick={() => setShowOwnershipModal(true)}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-purple-200/60"
                        >
                          <UserCheck size={12} />
                          <span>Change Ownership</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {loadingDetails ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                    <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-xs font-medium">Fetching live registry security flags from Openprovider...</p>
                  </div>
                ) : (
                  <>
                    {/* CARD 1: REGISTRAR LOCK STATUS & TOGGLE */}
                    <div className={`p-6 rounded-2xl border shadow-xs transition-all ${
                      isLocked
                        ? 'bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 border-emerald-200 text-emerald-950'
                        : 'bg-gradient-to-br from-amber-50/70 via-white to-orange-50/50 border-amber-200 text-amber-950'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                            isLocked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {isLocked ? <Lock size={24} /> : <Unlock size={24} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black">
                                {isLocked ? 'Registrar Lock Active (Theft Protection ON)' : 'Registrar Lock Disabled (UNLOCKED)'}
                              </h3>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                                isLocked ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                              }`}>
                                {isLocked ? 'LOCKED' : 'UNLOCKED'}
                              </span>
                            </div>
                            <p className={`text-xs mt-1 leading-relaxed ${isLocked ? 'text-emerald-800' : 'text-amber-800'}`}>
                              {isLocked 
                                ? 'Domain is safeguarded by the central registry (status: clientTransferProhibited). Any unauthorized attempts to move this domain will be instantly blocked.'
                                : 'Domain is currently unlocked. Any registrar who submits a transfer request with your EPP code can initiate moving this domain.'}
                            </p>
                          </div>
                        </div>

                        {/* Action Toggle */}
                        <div className="shrink-0 sm:self-center">
                          <button
                            onClick={handleToggleLock}
                            disabled={updatingLock}
                            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-xs disabled:opacity-50 ${
                              isLocked
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {updatingLock ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : isLocked ? (
                              <Unlock size={14} />
                            ) : (
                              <Lock size={14} />
                            )}
                            <span>{updatingLock ? 'Updating Registry...' : isLocked ? 'Unlock Domain' : 'Lock Domain (Protect)'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: EPP / TRANSFER AUTH CODE */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Key size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">Transfer Authorization (EPP Code)</h3>
                            <p className="text-xs text-slate-500">Secret cryptographic passphrase required by the new registrar</p>
                          </div>
                        </div>

                        {authCode && (
                          <button
                            onClick={copyEpp}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition border border-blue-200/60"
                          >
                            {copiedEpp ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            <span>{copiedEpp ? 'Copied' : 'Copy Code'}</span>
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type={showEpp ? 'text' : 'password'}
                          readOnly
                          value={authCode || 'Auth code protected / contact support'}
                          className="w-full pl-4 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900 outline-none select-all"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setShowEpp(!showEpp)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                            title={showEpp ? 'Hide EPP Code' : 'Show EPP Code'}
                          >
                            {showEpp ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                          {authCode && (
                            <button
                              type="button"
                              onClick={copyEpp}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition"
                              title="Copy EPP Code"
                            >
                              <Copy size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          <strong>Security Warning:</strong> Never share your EPP code with untrusted third parties. Anyone who obtains this code while your domain is unlocked can request to take over your domain.
                        </p>
                      </div>
                    </div>

                    {/* CARD 3: WHOIS PRIVACY (ID PROTECTION) */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isPrivacyOn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Shield size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">WHOIS Privacy (ID Protection)</h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isPrivacyOn ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isPrivacyOn ? 'PROTECTED' : 'DISABLED'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Masks your personal identity, telephone number, and postal address from public spam harvesters.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 sm:self-center">
                        <span className={`text-xs font-bold ${isPrivacyOn ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isPrivacyOn ? 'Privacy Active' : 'Public WHOIS'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isPrivacyOn}
                            onChange={handleTogglePrivacy}
                            disabled={updatingPrivacy}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5.5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-blue-600" />
                        </label>
                      </div>
                    </div>
                  </>
                )}

              </div>

              {/* Right Column (1 Col): ICANN Policy Guide & Domain List */}
              <div className="space-y-6">
                
                {/* Transfer-Out Checklist */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 text-xs">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
                    <HelpCircle size={17} className="text-blue-600" />
                    <span>Domain Transfer Checklist</span>
                  </div>

                  <p className="text-slate-500 leading-relaxed">
                    Planning to transfer <strong>{selectedDomain || 'your domain'}</strong> to another registrar? Follow these 5 essential steps:
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                        1
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">Unlock the Domain</span>
                        <p className="text-slate-500 text-[11px]">Toggle off Registrar Lock so the registry marks status as transferable.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                        2
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">Copy the EPP Code</span>
                        <p className="text-slate-500 text-[11px]">Provide this code to your new registrar when initiating the transfer.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                        3
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">Disable WHOIS Privacy</span>
                        <p className="text-slate-500 text-[11px]">Some registrars require public email visibility to send verification links.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                        4
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">60-Day ICANN Policy</span>
                        <p className="text-slate-500 text-[11px]">Domains registered or transferred within the last 60 days are locked by international registry policy.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                        5
                      </div>
                      <div>
                        <span className="font-bold text-slate-900">5 to 7 Day Approval Window</span>
                        <p className="text-slate-500 text-[11px]">Once started, check your admin email to approve, or wait for the automatic release period.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Switch to Other Domains */}
                {domains.length > 1 && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      All Your Registered Domains ({domains.length})
                    </h3>
                    <div className="divide-y divide-slate-100">
                      {domains.map(dom => (
                        <button
                          key={dom.id}
                          onClick={() => handleSelectDomain(dom.domain)}
                          className={`w-full text-left py-2.5 px-2 rounded-xl flex items-center justify-between transition text-xs ${
                            dom.domain === selectedDomain
                              ? 'bg-blue-50 text-blue-900 font-bold'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{dom.domain}</span>
                          <ChevronRight size={14} className={dom.domain === selectedDomain ? 'text-blue-600' : 'text-slate-300'} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>

        {/* Nameserver Modal */}
        {managingNs && (
          <NameserverModal
            domain={managingNs as any}
            onClose={() => setManagingNs(null)}
            onUpdate={() => {}}
          />
        )}

        {/* Domain Ownership Modal */}
        {selectedDomain && (
          <DomainOwnershipModal
            domain={selectedDomain}
            isOpen={showOwnershipModal}
            onClose={() => setShowOwnershipModal(false)}
            onUpdated={() => fetchDomainDetails(selectedDomain)}
          />
        )}
      </div>
    </Layout>
  );
};

export default DomainSecurityPage;
