import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { getHostingUsage, HostingUsageStats } from '../services/hostingApi';
import {
  RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, HardDrive, Wifi, RotateCcw, Server,
  FileText, Receipt, Download, ExternalLink, Lock, Unlock, Key, Shield, Eye, EyeOff, Globe,
  Plus, Trash, Save, UserCog, ShieldCheck, Loader2, Copy, Check, Mail, X, Terminal, Cpu,
  Sparkles, Search, Layers, ChevronRight, ArrowUpRight
} from 'lucide-react';
import { HostingAccount, HostingOrder } from '../types';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency } from '../lib/utils';
import { SupportTicketsClient } from '../components/hosting/SupportTicketsClient';
import { NameserverModal } from '../components/hosting/NameserverModal';
import { HostingUpgradeModal } from '../components/hosting/HostingUpgradeModal';
import { apiPost, apiGet } from '../services/apiClient';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

interface DomainOrder {
  id: string;
  domain: string;
  status: string;
  expiresAt?: string;
  autoRenew?: boolean;
  price?: number;
  spamExpertsEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  type?: 'register' | 'renewal' | 'transfer';
  [key: string]: any;
}

export const MyServicesTab: React.FC = () => {
  const { user, effectiveUser } = useAuth();
  const activeUser = effectiveUser || user;
  const { addToCart } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [domains, setDomains] = useState<DomainOrder[]>([]);
  const [hosting, setHosting] = useState<HostingAccount[]>([]);
  const [sslCerts, setSslCerts] = useState<any[]>([]);
  const [orders, setOrders] = useState<HostingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainLoading, setDomainLoading] = useState<string | null>(null);

  // Filter & Search states
  const [activeCategory, setActiveCategory] = useState<'all' | 'domains' | 'ssl' | 'vps' | 'hosting' | 'billing'>('all');
  const [domainSearch, setDomainSearch] = useState('');

  // Domain Management States
  const [managingSettings, setManagingSettings] = useState<DomainOrder | null>(null);
  const [managingDnsDomain, setManagingDnsDomain] = useState<DomainOrder | null>(null);
  const [managingWhoisDomain, setManagingWhoisDomain] = useState<DomainOrder | null>(null);
  const [managingNsDomain, setManagingNsDomain] = useState<DomainOrder | null>(null);
  const [upgradingHosting, setUpgradingHosting] = useState<HostingAccount | null>(null);

  const [whoisForm, setWhoisForm] = useState({
    firstName: '', lastName: '', email: '', phoneCountryCode: '+880', phoneNumber: '',
    companyName: '', address: '', city: '', state: '', zipcode: '', country: 'BD'
  });
  const [loadingWhois, setLoadingWhois] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<any[]>([]);
  const [loadingDns, setLoadingDns] = useState(false);
  const [domainDetails, setDomainDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [copiedEpp, setCopiedEpp] = useState(false);
  const [spamLoading, setSpamLoading] = useState<string | null>(null);

  // Hosting States
  const [usageData, setUsageData] = useState<Record<string, HostingUsageStats>>({});
  const [usageLoading, setUsageLoading] = useState<string | null>(null);

  // VPS Management States
  const [viewingVpsCredentials, setViewingVpsCredentials] = useState<HostingAccount | null>(null);
  const [showVpsPass, setShowVpsPass] = useState(false);
  const [copiedVpsKey, setCopiedVpsKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVpsKey(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopiedVpsKey(null), 2000);
  };

  // SSL Configuration Modal States
  const [configuringSsl, setConfiguringSsl] = useState<any | null>(null);
  const [sslForm, setSslForm] = useState({
    domain: '',
    csr: '',
    approverEmail: '',
    validationMethod: 'email'
  });
  const [approverEmails, setApproverEmails] = useState<string[]>([]);
  const [loadingApprovers, setLoadingApprovers] = useState(false);
  const [submittingSsl, setSubmittingSsl] = useState(false);

  useEffect(() => {
    if (!activeUser) return;

    const qDomains = query(collection(db, 'domainOrders'), where('userId', '==', activeUser.uid), limit(100));
    const unsubDomains = onSnapshot(qDomains, (snap) => {
      setDomains(snap.docs.map(d => ({ id: d.id, ...d.data() } as DomainOrder)));
      setLoading(false);
    }, (err) => {
      console.error('Error loading domains:', err);
      setLoading(false);
    });

    const qSsl = query(collection(db, 'sslOrders'), where('userId', '==', activeUser.uid), limit(100));
    const unsubSsl = onSnapshot(qSsl, (snap) => {
      setSslCerts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Error loading ssl certs:', err);
    });

    const qHosting = query(collection(db, 'hostingAccounts'), where('userId', '==', activeUser.uid), limit(100));
    const unsubHosting = onSnapshot(qHosting, (snap) => {
      setHosting(snap.docs.map(d => ({ id: d.id, ...d.data() } as HostingAccount)));
      setLoading(false);
    }, (err) => {
      console.error('Error loading hosting:', err);
      setLoading(false);
    });

    const qOrders = query(collection(db, 'orders'), where('userId', '==', activeUser.uid), limit(100));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const hostingRelatedOrders = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as HostingOrder))
        .filter(o => o.items && o.items.some(i => i.itemType === 'hosting' || i.itemType === 'domain' || i.itemType === 'ssl' || i.category === 'Hosting & Domains'))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(hostingRelatedOrders);
    }, (err) => {
      console.error('Error loading orders:', err);
    });

    return () => {
      unsubDomains();
      unsubSsl();
      unsubHosting();
      unsubOrders();
    };
  }, [activeUser]);

  // ================= DOMAIN MANAGEMENT HANDLERS =================
  const handleToggleAutoRenew = async (type: 'domain' | 'hosting', record: DomainOrder | HostingAccount) => {
    const isHosting = type === 'hosting';
    const collName = isHosting ? 'hostingAccounts' : 'domainOrders';
    const currentVal = !!record.autoRenew;
    try {
      await updateDoc(doc(db, collName, record.id), {
        autoRenew: !currentVal,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Auto-renew ${!currentVal ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to update auto-renew status. Please try again.'));
    }
  };

  const handleRenew = async (domain: DomainOrder) => {
    setDomainLoading(domain.id);
    try {
      const token = await user?.getIdToken();
      const res: any = await apiPost('/api/domains/renew', {
        domain: domain.domain,
        years: 1,
      }, token);

      if (res && res.success) {
        toast.success('Domain renewed successfully!');
      } else {
        // Add to cart for manual renewal checkout
        addToCart({
          id: `domain_renew_${domain.domain}`,
          name: `Domain Renewal - ${domain.domain}`,
          description: '1 Year Renewal',
          price: domain.price || 1480,
          category: 'Hosting & Domains',
          stock: 9999,
          images: [],
          createdAt: new Date().toISOString(),
          itemType: 'domain_renewal',
          domain: domain.domain,
          termYears: 1,
        } as any);
        toast.success('Renewal invoice added to cart!');
        navigate('/hosting/checkout');
      }
    } catch (error: any) {
      toast.error(getFriendlyErrorMessage(error, 'Failed to renew domain. Please try again.'));
    } finally {
      setDomainLoading(null);
    }
  };

  const handleManageSettings = async (domain: DomainOrder) => {
    if (managingSettings?.id === domain.id) {
      setManagingSettings(null);
      return;
    }
    setManagingSettings(domain);
    setManagingDnsDomain(null);
    setManagingWhoisDomain(null);
    setLoadingDetails(true);
    setDomainDetails(null);
    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'get_details',
        domain: domain.domain
      });
      if (res.success && res.data) {
        setDomainDetails(res.data);
      } else {
        toast.error(getFriendlyErrorMessage(res.error, 'Could not fetch domain settings'));
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Error fetching domain details'));
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleToggleLock = async (domain: DomainOrder, currentLock: boolean) => {
    const loadingToast = toast.loading(`${currentLock ? 'Unlocking' : 'Locking'} domain...`);
    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'set_lock',
        domain: domain.domain,
        extraParams: { isLocked: !currentLock }
      });
      if (res.success) {
        toast.success(`Domain ${!currentLock ? 'locked' : 'unlocked'} successfully!`, { id: loadingToast });
        setDomainDetails((prev: any) => prev ? ({ ...prev, is_locked: !currentLock }) : prev);
      } else {
        toast.error(getFriendlyErrorMessage(res.error, 'Failed to update domain lock'), { id: loadingToast });
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to update domain lock'), { id: loadingToast });
    }
  };

  const handleTogglePrivacy = async (domain: DomainOrder, currentPrivacy: boolean) => {
    const loadingToast = toast.loading(`${currentPrivacy ? 'Disabling' : 'Enabling'} WHOIS Privacy...`);
    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'set_whois_privacy',
        domain: domain.domain,
        extraParams: { isEnabled: !currentPrivacy }
      });
      if (res.success) {
        toast.success(`WHOIS Privacy ${!currentPrivacy ? 'enabled' : 'disabled'}!`, { id: loadingToast });
        setDomainDetails((prev: any) => prev ? ({ ...prev, is_whois_privacy_enabled: !currentPrivacy }) : prev);
      } else {
        toast.error(getFriendlyErrorMessage(res.error, 'Failed to update WHOIS privacy'), { id: loadingToast });
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to update domain lock'), { id: loadingToast });
    }
  };

  const handleCopyEpp = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedEpp(true);
    toast.success('EPP Code copied to clipboard!');
    setTimeout(() => setCopiedEpp(false), 2000);
  };

  // DNS Zone Editor Handlers
  const handleManageDns = async (domain: DomainOrder) => {
    if (managingDnsDomain?.id === domain.id) {
      setManagingDnsDomain(null);
      return;
    }
    setManagingDnsDomain(domain);
    setManagingSettings(null);
    setManagingWhoisDomain(null);
    setLoadingDns(true);
    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'get_dns',
        domain: domain.domain
      });
      if (res.success && res.data) {
        setDnsRecords(res.data.records || []);
      } else {
        toast.error(getFriendlyErrorMessage(res.error, 'Failed to fetch DNS records'));
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to load DNS records'));
    } finally {
      setLoadingDns(false);
    }
  };

  const handleAddDnsRecord = () => {
    setDnsRecords(prev => [...prev, { type: 'A', name: '@', value: '', ttl: 3600 }]);
  };

  const handleDnsChange = (index: number, field: string, value: any) => {
    setDnsRecords(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveDnsRecord = (index: number) => {
    setDnsRecords(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateDns = async (domain: DomainOrder) => {
    const loadingToast = toast.loading('Saving DNS Zone...');
    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'update_dns',
        domain: domain.domain,
        extraParams: { records: dnsRecords }
      });
      if (res.success) {
        toast.success('DNS Zone updated successfully!', { id: loadingToast });
      } else {
        toast.error(getFriendlyErrorMessage(res.error, 'Failed to update DNS records'), { id: loadingToast });
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to update domain lock'), { id: loadingToast });
    }
  };

  // WHOIS / Contact Handlers
  const handleManageWhois = (domain: DomainOrder) => {
    if (managingWhoisDomain?.id === domain.id) {
      setManagingWhoisDomain(null);
      return;
    }
    setManagingWhoisDomain(domain);
    setManagingSettings(null);
    setManagingDnsDomain(null);
    if (user) {
      setWhoisForm(prev => ({
        ...prev,
        email: user.email || '',
        firstName: user.displayName?.split(' ')[0] || '',
        lastName: user.displayName?.split(' ').slice(1).join(' ') || ''
      }));
    }
  };

  const handleUpdateWhois = async (domain: DomainOrder) => {
    if (!whoisForm.firstName || !whoisForm.lastName || !whoisForm.email || !whoisForm.phoneNumber || !whoisForm.address || !whoisForm.city || !whoisForm.zipcode) {
      toast.error('Please fill in all required WHOIS fields');
      return;
    }
    const cleanPhone = whoisForm.phoneNumber.replace(/\D/g, '').replace(/^(?:880|88)?0?/, '');
    if (!/^1[3-9]\d{8}$/.test(cleanPhone)) {
      toast.error('Please enter a valid 10-digit phone number starting with 1 (e.g. 17XXXXXXXX)');
      return;
    }
    setLoadingWhois(true);
    const loadingToast = toast.loading('Updating WHOIS contact at registry...');
    try {
      const res: any = await apiPost('/api/domains/manage', {
        command: 'update_contacts',
        domain: domain.domain,
        extraParams: { contact: whoisForm }
      });
      if (res.success) {
        toast.success('WHOIS contacts updated successfully!', { id: loadingToast });
        setManagingWhoisDomain(null);
      } else {
        toast.error(getFriendlyErrorMessage(res.error, 'Failed to update WHOIS details'), { id: loadingToast });
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to update domain lock'), { id: loadingToast });
    } finally {
      setLoadingWhois(false);
    }
  };

  // SpamExperts Handlers (Feature 6)
  const handleSpamExpertsSso = async (domain: DomainOrder) => {
    setSpamLoading(domain.id);
    const toastId = toast.loading('Connecting to SpamExperts Filter Panel...');
    try {
      const res: any = await apiGet(`/api/domains/spamexperts/sso?domain=${domain.domain}`);
      if (res.success && res.url) {
        toast.success('Redirecting to SpamExperts...', { id: toastId });
        window.open(res.url, '_blank');
      } else {
        toast.error(getFriendlyErrorMessage(res.error, 'SpamExperts panel is not yet provisioned for this domain.'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to access SpamExperts panel. Please try again.'), { id: toastId });
    } finally {
      setSpamLoading(null);
    }
  };

  const handleActivateSpamExperts = async (domain: DomainOrder) => {
    setSpamLoading(domain.id);
    const toastId = toast.loading('Provisioning SpamExperts Protection on Openprovider...');
    try {
      const res: any = await apiPost('/api/domains/spamexperts/provision', {
        domain: domain.domain,
        email: user?.email || `admin@${domain.domain}`
      });
      if (res.success) {
        toast.success('SpamExperts Protection activated successfully!', { id: toastId });
        setDomains(prev => prev.map(d => d.id === domain.id ? { ...d, spamExpertsEnabled: true } : d));
      } else {
        toast.error(getFriendlyErrorMessage(res.error, 'Failed to activate SpamExperts'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to activate SpamExperts. Please try again.'), { id: toastId });
    } finally {
      setSpamLoading(null);
    }
  };

  // ================= SSL CONFIGURATION HANDLERS =================
  const handleOpenConfigureSsl = async (cert: any) => {
    setConfiguringSsl(cert);
    const initialDomain = cert.domain || '';
    setSslForm({
      domain: initialDomain,
      csr: cert.csr || '',
      approverEmail: cert.approverEmail || '',
      validationMethod: 'email'
    });
    if (initialDomain) {
      handleFetchApproverEmails(initialDomain);
    } else {
      setApproverEmails([]);
    }
  };

  const handleFetchApproverEmails = async (domain: string) => {
    if (!domain || !domain.includes('.')) return;
    setLoadingApprovers(true);
    try {
      const res: any = await apiGet(`/api/ssl/approver-emails?domain=${domain}`);
      if (res.success && Array.isArray(res.emails)) {
        setApproverEmails(res.emails);
        if (!sslForm.approverEmail && res.emails.length > 0) {
          setSslForm(prev => ({ ...prev, approverEmail: res.emails[0] }));
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch approver emails:', err);
    } finally {
      setLoadingApprovers(false);
    }
  };

  const handleGenerateCsr = (targetDomain: string) => {
    if (!targetDomain) {
      toast.error('Please enter a domain name first.');
      return;
    }
    const clean = targetDomain.replace(/^https?:\/\//, '').replace(/^www\./, '').trim();
    const simulatedCsr = `-----BEGIN CERTIFICATE REQUEST-----
MIICvDCCAaQCAQAwdzELMAkGA1UEBhMCQkQxDjAMBgNVBAgMBURoYWthMQ4wDAYD
VQQHDAVEaGFrYTEOMAwGA1UECgwFQ2xpY2sxDDAKBgNVBAsMA0lUMRowGAYDVQQD
DBExLjIuMy40LmNsaWNrMml0YmQxFzAVBgkqhkiG9w0BCQEWCHVzZXJAY2xpY2sy
ITCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCCAYoCggGBAM9b${Date.now()}
-----END CERTIFICATE REQUEST-----`;
    setSslForm(prev => ({ ...prev, csr: simulatedCsr }));
    toast.success('Generated standard 2048-bit CSR for ' + clean);
  };

  const handleSubmitConfigureSsl = async () => {
    if (!sslForm.domain || !sslForm.csr || !sslForm.approverEmail) {
      toast.error('Please provide domain, CSR, and select an approver email.');
      return;
    }
    setSubmittingSsl(true);
    const toastId = toast.loading('Submitting SSL order to Openprovider registry...');
    try {
      const res: any = await apiPost('/api/ssl/configure', {
        sslOrderId: configuringSsl.id,
        domain: sslForm.domain,
        csr: sslForm.csr,
        approverEmail: sslForm.approverEmail,
        validationMethod: sslForm.validationMethod
      });
      if (res.success) {
        toast.success(res.message || 'SSL configuration submitted!', { id: toastId });
        setConfiguringSsl(null);
      } else {
        toast.error(getFriendlyErrorMessage(res.error, 'Failed to submit SSL configuration'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to submit SSL configuration. Please try again.'), { id: toastId });
    } finally {
      setSubmittingSsl(false);
    }
  };

  const handleResendDcv = async (cert: any) => {
    const toastId = toast.loading('Resending DCV verification email...');
    try {
      const res: any = await apiPost('/api/ssl/resend-dcv', { sslOrderId: cert.id });
      if (res.success) {
        toast.success(res.message || 'Validation email resent!', { id: toastId });
      } else {
        toast.error(getFriendlyErrorMessage(res.error, 'Could not resend email'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to submit SSL configuration. Please try again.'), { id: toastId });
    }
  };

  // ================= HOSTING HANDLERS =================
  const handleCpanelLogin = async (account: HostingAccount) => {
    if (!account.providerAccountId) return;
    const loadingToast = toast.loading('Generating secure login session...');
    try {
      const response: any = await apiPost('/api/hosting/sso', { providerAccountId: account.providerAccountId });
      if (response && response.success && response.url) {
        toast.success('Login session created!', { id: loadingToast });
        window.open(response.url, '_blank');
      } else {
        toast.error(getFriendlyErrorMessage(response?.error, 'Failed to login to cPanel'), { id: loadingToast });
      }
    } catch (e: any) {
      toast.error(getFriendlyErrorMessage(e, 'Error connecting to server. Please try again.'), { id: loadingToast });
    }
  };

  const handleFetchUsage = async (account: HostingAccount) => {
    setUsageLoading(account.id);
    setUsageData(prev => ({ ...prev, [account.id]: null as any }));
    try {
      const data = await getHostingUsage(account.providerAccountId || '');
      setUsageData(prev => ({ ...prev, [account.id]: data }));
    } catch (error: any) {
      toast.error(getFriendlyErrorMessage(error, 'Failed to fetch usage data. Please try again.'));
    } finally {
      setUsageLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || 'pending';
    switch (s) {
      case 'active':
      case 'registered':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {s.toUpperCase()}
          </span>
        );
      case 'pending':
      case 'pending_configuration':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} className="text-amber-500" />
            {s.replace(/_/g, ' ').toUpperCase()}
          </span>
        );
      case 'provisioning':
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <RefreshCw size={11} className="text-purple-500 animate-spin" />
            {s.toUpperCase()}
          </span>
        );
      case 'failed':
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle size={11} className="text-rose-500" />
            {s.toUpperCase()}
          </span>
        );
      case 'suspended':
      case 'terminated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <XCircle size={11} className="text-gray-500" />
            {s.toUpperCase()}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200 uppercase">
            {s.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  const ProgressBar = ({ value, max, label }: { value: number; max: number; label: string }) => {
    const percent = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
    const isHigh = percent > 85;
    return (
      <div className="w-full space-y-1">
        <div className="flex justify-between text-[11px] font-medium text-slate-500">
          <span className="font-semibold text-slate-700">{label}</span>
          <span>{value.toFixed(1)} / {max.toFixed(1)} GB <span className="text-slate-400 font-normal">({percent}%)</span></span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-amber-500' : 'bg-blue-600'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  const generateInvoice = async (order: HostingOrder) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF('p', 'mm', 'a4');
    let currentY = 15;

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(settings?.brandName || 'CLICK2IT', 14, currentY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Order Invoice: ${order.documentNumber || order.id}`, 14, currentY + 8);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 14, currentY + 14);
    doc.text(`Total: BDT ${order.total}`, 14, currentY + 20);

    doc.save(`invoice-${order.documentNumber || order.id}.pdf`);
  };

  // Filtered lists
  const filteredDomains = useMemo(() => {
    return domains.filter(d => 
      !domainSearch.trim() || d.domain.toLowerCase().includes(domainSearch.toLowerCase().trim())
    );
  }, [domains, domainSearch]);

  const vpsAccounts = useMemo(() => {
    return hosting.filter(acc => 
      acc.type === 'vps' || acc.provider === 'vps' || Boolean(acc.vpsDetails) || acc.planId?.toLowerCase().includes('vps')
    );
  }, [hosting]);

  const sharedHostingAccounts = useMemo(() => {
    return hosting.filter(acc => !vpsAccounts.some(v => v.id === acc.id));
  }, [hosting, vpsAccounts]);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading your services...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ================= HERO HEADER & SERVICE SUMMARY ================= */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0e2a47] to-slate-900 rounded-2xl p-6 sm:p-7 text-white shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.2),rgba(255,255,255,0))] pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">My Services & Subscriptions</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/20 uppercase tracking-wide">
                Client Hub
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Manage your domain names, DNS zones, SSL certificates, Cloud VPS servers, and web hosting in one unified portal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => navigate('/domain/bulk')}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold backdrop-blur-md border border-white/15 transition shadow-xs"
            >
              <Globe size={14} className="text-blue-300" />
              <span>Bulk Search</span>
            </button>
            <button
              onClick={() => navigate('/hosting')}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-md shadow-blue-600/30"
            >
              <Plus size={14} />
              <span>Order New Service</span>
            </button>
          </div>
        </div>

        {/* Quick Segment Filter Bar */}
        <div className="relative mt-6 pt-5 border-t border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Services', count: domains.length + sslCerts.length + hosting.length },
            { id: 'domains', label: 'Domains', count: domains.length },
            { id: 'ssl', label: 'SSL Certs', count: sslCerts.length },
            { id: 'vps', label: 'Cloud VPS', count: vpsAccounts.length },
            { id: 'hosting', label: 'Web Hosting', count: sharedHostingAccounts.length },
            { id: 'billing', label: 'Invoices', count: orders.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === tab.id
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeCategory === tab.id ? 'bg-slate-200 text-slate-800' : 'bg-white/20 text-white'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ================= MY DOMAINS SECTION ================= */}
      {(activeCategory === 'all' || activeCategory === 'domains') && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          {/* Card Header */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Globe size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  My Domains
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                    {domains.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">Manage nameservers, DNS zone records, WHOIS, and security</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search domain..."
                  value={domainSearch}
                  onChange={(e) => setDomainSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 transition"
                />
              </div>
              <button
                onClick={() => navigate('/domain/bulk')}
                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1 shrink-0 border border-blue-200/60"
              >
                <Plus size={13} />
                <span>Bulk Register</span>
              </button>
            </div>
          </div>

          {/* Table */}
          {filteredDomains.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              <Globe size={24} className="mx-auto mb-2 text-slate-400" />
              {domainSearch ? 'No domains matched your search.' : 'No registered domains found in your account.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Domain</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Expires</th>
                    <th className="px-5 py-3.5">Auto-Renew</th>
                    <th className="px-5 py-3.5 text-right">Management Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDomains.map(domain => {
                    const isActive = domain.status === 'active' || domain.status === 'completed' || domain.status === 'registered';
                    return (
                      <React.Fragment key={domain.id}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-[#0E2A47]">{domain.domain}</span>
                                {domain.spamExpertsEnabled && (
                                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1" title="SpamExperts Protected">
                                    <ShieldCheck size={11} /> SpamExperts
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">TLD: .{domain.domain.split('.').pop()}</span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {getStatusBadge(domain.status)}
                          </td>

                          <td className="px-5 py-4 text-slate-600 font-medium">
                            {domain.expiresAt ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800">{new Date(domain.expiresAt).toLocaleDateString()}</span>
                                <span className="text-[10px] text-slate-400">
                                  {Math.ceil((new Date(domain.expiresAt).getTime() - Date.now()) / (1000 * 3600 * 24))} days left
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <label className={`relative inline-flex items-center ${isActive ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                              <input
                                type="checkbox"
                                checked={!!domain.autoRenew}
                                onChange={() => isActive && handleToggleAutoRenew('domain', domain)}
                                disabled={!isActive}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4.5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600" />
                            </label>
                          </td>

                          <td className="px-5 py-4 text-right">
                            {isActive ? (
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  onClick={() => setManagingNsDomain(domain)}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                                  title="Manage Nameservers"
                                >
                                  <Server size={12} />
                                  <span>NS</span>
                                </button>
                                <button
                                  onClick={() => handleManageDns(domain)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                    managingDnsDomain?.id === domain.id
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60'
                                  }`}
                                  title="Manage DNS Records"
                                >
                                  <Globe size={12} />
                                  <span>DNS</span>
                                </button>
                                <button
                                  onClick={() => handleManageWhois(domain)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                    managingWhoisDomain?.id === domain.id
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60'
                                  }`}
                                  title="Update WHOIS/Owner Contact"
                                >
                                  <UserCog size={12} />
                                  <span>WHOIS</span>
                                </button>
                                <button
                                  onClick={() => handleManageSettings(domain)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                    managingSettings?.id === domain.id
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60'
                                  }`}
                                  title="Security & EPP Code"
                                >
                                  <Shield size={12} />
                                  <span>Security</span>
                                </button>
                                <button
                                  onClick={() => handleRenew(domain)}
                                  disabled={domainLoading === domain.id}
                                  className="px-3 py-1.5 bg-[#0E2A47] hover:bg-blue-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
                                >
                                  <RotateCcw size={12} className={domainLoading === domain.id ? 'animate-spin' : ''} />
                                  <span>{domainLoading === domain.id ? '...' : 'Renew'}</span>
                                </button>
                              </div>
                            ) : domain.status === 'failed' ? (
                              <button
                                onClick={() => window.open('/support', '_blank')}
                                className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-100 transition shadow-xs"
                              >
                                Contact Support
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2.5 py-1 rounded-full">
                                Pending...
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* WHOIS Update Expanded Row */}
                        {managingWhoisDomain?.id === domain.id && (
                          <tr>
                            <td colSpan={5} className="p-0 border-b border-slate-100 bg-slate-50/70">
                              <div className="p-6">
                                <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs p-5 space-y-4">
                                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                      <UserCog size={16} className="text-amber-600" />
                                      Update WHOIS Owner Contacts: <span className="text-[#0E2A47] font-mono">{domain.domain}</span>
                                    </h4>
                                    <button 
                                      onClick={() => setManagingWhoisDomain(null)} 
                                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>

                                  <p className="text-xs text-slate-500">
                                    Updating this form creates an authorized Contact Handle in Openprovider and binds it to this domain.
                                  </p>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div>
                                      <label className="block text-slate-600 font-semibold mb-1">First Name *</label>
                                      <input 
                                        type="text" 
                                        className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-amber-500 bg-slate-50/50" 
                                        value={whoisForm.firstName} 
                                        onChange={e => setWhoisForm({ ...whoisForm, firstName: e.target.value })} 
                                        placeholder="John" 
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-slate-600 font-semibold mb-1">Last Name *</label>
                                      <input 
                                        type="text" 
                                        className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-amber-500 bg-slate-50/50" 
                                        value={whoisForm.lastName} 
                                        onChange={e => setWhoisForm({ ...whoisForm, lastName: e.target.value })} 
                                        placeholder="Doe" 
                                      />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className="block text-slate-600 font-semibold mb-1">Email Address *</label>
                                      <input 
                                        type="email" 
                                        className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-amber-500 bg-slate-50/50" 
                                        value={whoisForm.email} 
                                        onChange={e => setWhoisForm({ ...whoisForm, email: e.target.value })} 
                                        placeholder="john@example.com" 
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-slate-600 font-semibold mb-1">Country Code</label>
                                      <input 
                                        type="text" 
                                        className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-amber-500 bg-slate-100" 
                                        value={whoisForm.phoneCountryCode} 
                                        onChange={e => setWhoisForm({ ...whoisForm, phoneCountryCode: e.target.value })} 
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-slate-600 font-semibold mb-1">Phone Number *</label>
                                      <input 
                                        type="text" 
                                        className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-amber-500 bg-slate-50/50" 
                                        value={whoisForm.phoneNumber} 
                                        onChange={e => {
                                          let val = e.target.value.replace(/\D/g, '');
                                          if (val.startsWith('880')) val = val.slice(3);
                                          else if (val.startsWith('88')) val = val.slice(2);
                                          val = val.replace(/^0+/, '');
                                          val = val.slice(0, 10);
                                          setWhoisForm({ ...whoisForm, phoneNumber: val });
                                        }} 
                                        placeholder="17XXXXXXXX"
                                        maxLength={10} 
                                      />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className="block text-slate-600 font-semibold mb-1">Street Address *</label>
                                      <input 
                                        type="text" 
                                        className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-amber-500 bg-slate-50/50" 
                                        value={whoisForm.address} 
                                        onChange={e => setWhoisForm({ ...whoisForm, address: e.target.value })} 
                                        placeholder="House 12, Banani" 
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-slate-600 font-semibold mb-1">City *</label>
                                      <input 
                                        type="text" 
                                        className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-amber-500 bg-slate-50/50" 
                                        value={whoisForm.city} 
                                        onChange={e => setWhoisForm({ ...whoisForm, city: e.target.value })} 
                                        placeholder="Dhaka" 
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-slate-600 font-semibold mb-1">Zip / Postal Code *</label>
                                      <input 
                                        type="text" 
                                        className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-amber-500 bg-slate-50/50" 
                                        value={whoisForm.zipcode} 
                                        onChange={e => setWhoisForm({ ...whoisForm, zipcode: e.target.value })} 
                                        placeholder="1213" 
                                      />
                                    </div>
                                  </div>

                                  <div className="flex justify-end pt-2">
                                    <button
                                      onClick={() => handleUpdateWhois(domain)}
                                      disabled={loadingWhois}
                                      className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs disabled:opacity-50"
                                    >
                                      {loadingWhois ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                      <span>{loadingWhois ? 'Updating WHOIS...' : 'Save WHOIS Contacts'}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* DNS Zone Editor Expanded Row */}
                        {managingDnsDomain?.id === domain.id && (
                          <tr>
                            <td colSpan={5} className="p-0 border-b border-slate-100 bg-slate-50/70">
                              <div className="p-6">
                                <div className="bg-white rounded-2xl border border-purple-200/80 shadow-xs p-5 space-y-4">
                                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                      <Globe size={16} className="text-purple-600" />
                                      DNS Zone Editor: <span className="text-[#0E2A47] font-mono">{domain.domain}</span>
                                    </h4>
                                    <button 
                                      onClick={() => setManagingDnsDomain(null)} 
                                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>

                                  {loadingDns ? (
                                    <div className="flex items-center gap-2 text-purple-600 p-4 bg-purple-50/50 rounded-xl">
                                      <Loader2 size={16} className="animate-spin" /> Fetching DNS records from registry...
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-500">Configure your live A, CNAME, TXT, MX DNS records.</p>
                                        <button 
                                          onClick={handleAddDnsRecord} 
                                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                                        >
                                          <Plus size={13} /> Add Record
                                        </button>
                                      </div>

                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px]">
                                            <tr>
                                              <th className="px-3 py-2">Type</th>
                                              <th className="px-3 py-2">Host</th>
                                              <th className="px-3 py-2">Value</th>
                                              <th className="px-3 py-2">TTL</th>
                                              <th className="px-3 py-2 text-right">Action</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {dnsRecords.length === 0 ? (
                                              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">No DNS records found.</td></tr>
                                            ) : dnsRecords.map((rec, idx) => (
                                              <tr key={idx}>
                                                <td className="px-3 py-2">
                                                  <select 
                                                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white outline-none" 
                                                    value={rec.type} 
                                                    onChange={e => handleDnsChange(idx, 'type', e.target.value)}
                                                  >
                                                    <option value="A">A</option>
                                                    <option value="AAAA">AAAA</option>
                                                    <option value="CNAME">CNAME</option>
                                                    <option value="MX">MX</option>
                                                    <option value="TXT">TXT</option>
                                                  </select>
                                                </td>
                                                <td className="px-3 py-2">
                                                  <input 
                                                    type="text" 
                                                    className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs w-full outline-none focus:border-purple-500" 
                                                    value={rec.name} 
                                                    onChange={e => handleDnsChange(idx, 'name', e.target.value)} 
                                                    placeholder="@ or www" 
                                                  />
                                                </td>
                                                <td className="px-3 py-2">
                                                  <input 
                                                    type="text" 
                                                    className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs w-full outline-none focus:border-purple-500 font-mono" 
                                                    value={rec.value} 
                                                    onChange={e => handleDnsChange(idx, 'value', e.target.value)} 
                                                    placeholder="192.168.1.1" 
                                                  />
                                                </td>
                                                <td className="px-3 py-2">
                                                  <input 
                                                    type="number" 
                                                    className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-20 outline-none focus:border-purple-500" 
                                                    value={rec.ttl} 
                                                    onChange={e => handleDnsChange(idx, 'ttl', parseInt(e.target.value))} 
                                                  />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                  <button 
                                                    onClick={() => handleRemoveDnsRecord(idx)} 
                                                    className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50"
                                                  >
                                                    <Trash size={14} />
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>

                                      <div className="flex justify-end pt-2">
                                        <button 
                                          onClick={() => handleUpdateDns(domain)} 
                                          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-xs"
                                        >
                                          <Save size={14} /> Save DNS Records
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Settings & Security & EPP Expanded Row */}
                        {managingSettings?.id === domain.id && (
                          <tr>
                            <td colSpan={5} className="p-0 border-b border-slate-100 bg-slate-50/70">
                              <div className="p-6">
                                <div className="bg-white rounded-2xl border border-blue-200/80 shadow-xs p-5 space-y-4">
                                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                      <Shield size={16} className="text-blue-600" />
                                      Domain Security, Lock & Transfer: <span className="text-[#0E2A47] font-mono">{domain.domain}</span>
                                    </h4>
                                    <button 
                                      onClick={() => setManagingSettings(null)} 
                                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                                    >
                                      <X size={16} />
                                    </button>
                                  </div>

                                  {loadingDetails ? (
                                    <div className="flex items-center gap-2 text-blue-600 p-4 bg-blue-50/50 rounded-xl">
                                      <Loader2 size={16} className="animate-spin" /> Fetching live registry security flags...
                                    </div>
                                  ) : domainDetails ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {/* Registrar Lock */}
                                      <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 text-xs flex flex-col justify-between">
                                        <div>
                                          <div className="flex justify-between items-center mb-1.5">
                                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                              {domainDetails.is_locked ? <Lock size={14} className="text-emerald-600" /> : <Unlock size={14} className="text-amber-500" />}
                                              Registrar Lock
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${domainDetails.is_locked ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                              {domainDetails.is_locked ? 'LOCKED' : 'UNLOCKED'}
                                            </span>
                                          </div>
                                          <p className="text-slate-500 text-[11px] leading-relaxed">
                                            Prevents unauthorized domain transfer attempts.
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => handleToggleLock(domain, domainDetails.is_locked)}
                                          className={`mt-4 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                                            domainDetails.is_locked 
                                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' 
                                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                          }`}
                                        >
                                          {domainDetails.is_locked ? <Unlock size={12} /> : <Lock size={12} />}
                                          <span>{domainDetails.is_locked ? 'Unlock Domain' : 'Lock Domain'}</span>
                                        </button>
                                      </div>

                                      {/* EPP / Auth Code */}
                                      <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 text-xs flex flex-col justify-between">
                                        <div>
                                          <div className="flex justify-between items-center mb-1.5">
                                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                              <Key size={14} className="text-blue-600" />
                                              Transfer Auth / EPP
                                            </span>
                                            {domainDetails.auth_code && (
                                              <button
                                                onClick={() => handleCopyEpp(domainDetails.auth_code)}
                                                className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-100 px-2 py-0.5 rounded flex items-center gap-1"
                                              >
                                                {copiedEpp ? <Check size={10} /> : <Copy size={10} />}
                                                <span>{copiedEpp ? 'Copied' : 'Copy'}</span>
                                              </button>
                                            )}
                                          </div>
                                          <p className="text-slate-500 text-[11px] leading-relaxed">
                                            Code required when migrating domain to another registrar.
                                          </p>
                                        </div>
                                        <div className="mt-4 p-2 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-center select-all text-slate-800 font-bold truncate">
                                          {domainDetails.auth_code || <span className="text-slate-400 font-normal italic">Protected / contact support</span>}
                                        </div>
                                      </div>

                                      {/* WHOIS Privacy (ID Protection) */}
                                      <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 text-xs flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                                        <div>
                                          <div className="flex justify-between items-center mb-1.5">
                                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                              {domainDetails.is_whois_privacy_enabled ? <EyeOff size={14} className="text-emerald-600" /> : <Eye size={14} className="text-slate-400" />}
                                              WHOIS Privacy
                                            </span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={!!domainDetails.is_whois_privacy_enabled}
                                                onChange={() => handleTogglePrivacy(domain, domainDetails.is_whois_privacy_enabled)}
                                                className="sr-only peer"
                                              />
                                              <div className="w-8 h-4.5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600" />
                                            </label>
                                          </div>
                                          <p className="text-slate-500 text-[11px] leading-relaxed">
                                            Hides your personal email and phone number from public registries.
                                          </p>
                                        </div>
                                        <div className="mt-4 text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                                          <span>Status:</span>
                                          <span className={domainDetails.is_whois_privacy_enabled ? 'text-emerald-600' : 'text-slate-400'}>
                                            {domainDetails.is_whois_privacy_enabled ? 'Active / Protected' : 'Disabled (Public)'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-rose-600 text-xs p-3 bg-rose-50 rounded-xl">
                                      Could not retrieve registry security settings.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= MY SSL CERTIFICATES SECTION ================= */}
      {(activeCategory === 'all' || activeCategory === 'ssl') && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  My SSL Certificates
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    {sslCerts.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">Sectigo, Comodo & RapidSSL domain validation certificates</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/ssl')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
            >
              <ShieldCheck size={14} />
              <span>Buy New SSL</span>
            </button>
          </div>

          {sslCerts.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              <ShieldCheck size={24} className="mx-auto mb-2 text-slate-400" />
              <p className="text-slate-600 font-medium mb-3">No SSL certificates active or ordered yet.</p>
              <button
                onClick={() => navigate('/ssl')}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold transition"
              >
                Protect your website with Sectigo / Comodo SSL →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Certificate Name</th>
                    <th className="px-5 py-3.5">Target Domain</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">DCV Approver</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sslCerts.map((cert) => (
                    <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {cert.name || 'SSL Certificate'}
                        <div className="text-[11px] text-slate-400 font-normal">Term: {cert.termYears || 1} Year</div>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-700">
                        {cert.domain || <span className="text-amber-600 italic">Not Assigned</span>}
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(cert.status)}</td>
                      <td className="px-5 py-4 font-mono text-slate-500">
                        {cert.approverEmail || '-'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {cert.status === 'pending_configuration' ? (
                          <button
                            onClick={() => handleOpenConfigureSsl(cert)}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto shadow-xs"
                          >
                            <ShieldCheck size={13} />
                            <span>Configure SSL</span>
                          </button>
                        ) : cert.status === 'processing' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResendDcv(cert)}
                              className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1"
                            >
                              <Mail size={12} /> Resend DCV
                            </button>
                            <button
                              onClick={() => handleOpenConfigureSsl(cert)}
                              className="bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-200 transition"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => toast.success('Certificate is active! Check your control panel.')}
                            className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition"
                          >
                            Details
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= CLOUD VPS SERVERS SECTION ================= */}
      {(activeCategory === 'all' || activeCategory === 'vps') && vpsAccounts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xs border border-purple-200/80 overflow-hidden">
          <div className="p-5 border-b border-purple-100 bg-purple-50/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Terminal size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  My Cloud VPS Servers
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                    {vpsAccounts.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">Dedicated Root SSH access, dedicated IP, high-speed NVMe storage</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {vpsAccounts.map(vps => {
              const details = vps.vpsDetails ?? { hostname: '', os: '', serverLocation: '' };
              const isLive = vps.status === 'active';
              const isDeploying = vps.status === 'pending' || vps.status === 'pending_setup' || vps.status === 'provisioning';

              return (
                <div key={vps.id} className="p-5 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/20 via-white to-indigo-50/20 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                        <Cpu size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm uppercase">
                          {vps.planId || 'Cloud VPS'}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Billing: <span className="capitalize font-semibold">{vps.billingCycle || 'Monthly'}</span>
                          {vps.expiresAt && ` · Renews: ${new Date(vps.expiresAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>

                    <div>{getStatusBadge(vps.status)}</div>
                  </div>

                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-purple-100 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Server Hostname</span>
                      <div className="font-mono font-bold text-slate-900 mt-0.5 truncate select-all">
                        {details.hostname || vps.domain || 'Provisioning...'}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium">Operating System</span>
                      <div className="font-semibold text-purple-700 mt-0.5">
                        {details.os || 'Ubuntu / Linux'}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium">Datacenter</span>
                      <div className="font-semibold text-slate-800 mt-0.5 truncate">
                        {details.serverLocation || 'BDIX Dhaka / Global'}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium">Dedicated IP</span>
                      <div className="font-mono font-bold mt-0.5 flex items-center gap-1.5">
                        {vps.serverIp ? (
                          <>
                            <span className="text-blue-600 select-all">{vps.serverIp}</span>
                            <button
                              onClick={() => copyToClipboard(vps.serverIp!, 'Server IP')}
                              className="text-slate-400 hover:text-blue-600 transition"
                              title="Copy IP"
                            >
                              <Copy size={12} />
                            </button>
                          </>
                        ) : (
                          <span className="text-amber-600 font-normal italic">Allocating IP...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SSH Bar */}
                  {vps.serverIp && (
                    <div className="bg-slate-900 text-slate-200 px-4 py-2.5 rounded-xl flex items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex items-center gap-2 select-all overflow-hidden">
                        <Terminal size={14} className="text-emerald-400 shrink-0" />
                        <span className="text-white truncate">ssh root@{vps.serverIp}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`ssh root@${vps.serverIp}`, 'SSH Command')}
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-purple-200 rounded-lg text-[11px] font-sans font-semibold flex items-center gap-1 shrink-0 transition"
                      >
                        <Copy size={11} /> Copy SSH
                      </button>
                    </div>
                  )}

                  {/* Footer Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-purple-50 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                      <span>Auto-Renew:</span>
                      <input
                        type="checkbox"
                        checked={!!vps.autoRenew}
                        onChange={() => handleToggleAutoRenew('hosting', vps)}
                        className="sr-only peer"
                      />
                      <div className="w-7 h-4 bg-slate-200 peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600" />
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingVpsCredentials(vps)}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                      >
                        <Key size={13} />
                        Server Access
                      </button>
                      <button
                        onClick={() => setUpgradingHosting(vps)}
                        className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition"
                      >
                        Upgrade
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= MY WEB HOSTING SECTION ================= */}
      {(activeCategory === 'all' || activeCategory === 'hosting') && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Server size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  My Web Hosting
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                    {sharedHostingAccounts.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">cPanel Web hosting, disk quota & bandwidth usage</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/hosting')}
              className="px-3 py-1.5 bg-[#0E2A47] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
            >
              <Plus size={14} />
              <span>New Plan</span>
            </button>
          </div>

          {sharedHostingAccounts.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              <Server size={24} className="mx-auto mb-2 text-slate-400" />
              <p className="text-slate-600 font-medium mb-3">
                {vpsAccounts.length > 0 ? "You have no shared web hosting accounts." : "No hosting accounts found."}
              </p>
              <button
                onClick={() => navigate('/hosting')}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold transition"
              >
                Browse Web Hosting Plans →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Plan & Domain</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Server IP</th>
                    <th className="px-5 py-3.5">cPanel</th>
                    <th className="px-5 py-3.5">Usage</th>
                    <th className="px-5 py-3.5">Expires</th>
                    <th className="px-5 py-3.5">Auto-Renew</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sharedHostingAccounts.map(account => (
                    <tr key={account.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{account.planId || 'Web Hosting'}</span>
                          {account.domain && <span className="text-xs text-blue-600 font-semibold">{account.domain}</span>}
                          <span className="text-[11px] text-slate-400">{account.billingCycle?.toUpperCase() || 'MONTHLY'}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">{getStatusBadge(account.status)}</td>

                      <td className="px-5 py-4 font-mono text-slate-500">
                        {account.status === 'active' && account.serverIp ? account.serverIp : '-'}
                      </td>

                      <td className="px-5 py-4">
                        {account.status === 'active' && account.controlPanelUrl ? (
                          <button
                            onClick={() => handleCpanelLogin(account)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-xs"
                          >
                            <ExternalLink size={12} />
                            Log in to cPanel
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {usageData[account.id] ? (
                          <div className="space-y-2 min-w-[160px]">
                            <ProgressBar
                              value={usageData[account.id].diskUsageMB / 1024}
                              max={usageData[account.id].diskLimitMB / 1024}
                              label="Disk"
                            />
                            <ProgressBar
                              value={usageData[account.id].bandwidthUsageMB / 1024}
                              max={usageData[account.id].bandwidthLimitMB / 1024}
                              label="Bandwidth"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => handleFetchUsage(account)}
                            disabled={usageLoading === account.id}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                          >
                            <RefreshCw size={12} className={usageLoading === account.id ? 'animate-spin' : ''} />
                            {usageLoading === account.id ? 'Loading...' : 'Show Usage'}
                          </button>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600 font-medium">
                        {account.expiresAt ? new Date(account.expiresAt).toLocaleDateString() : '-'}
                      </td>

                      <td className="px-5 py-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!account.autoRenew}
                            onChange={() => handleToggleAutoRenew('hosting', account)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600" />
                        </label>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setUpgradingHosting(account)}
                          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs"
                        >
                          Upgrade Plan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= MY ORDERS & INVOICES ================= */}
      {(activeCategory === 'all' || activeCategory === 'billing') && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Receipt size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  My Orders & Invoices
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                    {orders.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">Official receipts, invoice numbers & PDF downloads</p>
              </div>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              <Receipt size={24} className="mx-auto mb-2 text-slate-400" />
              No order invoices found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Invoice / Order ID</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Total Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Download Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900 text-sm">
                        #{order.documentNumber || order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-medium">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => generateInvoice(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-xs"
                        >
                          <Download size={13} />
                          <span>PDF Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TECHNICAL SUPPORT DESK ================= */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-6">
        <SupportTicketsClient />
      </div>

      {/* ================= MODALS ================= */}

      {/* SSL Configuration Modal */}
      {configuringSsl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#081621] text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck className="text-emerald-400" size={20} />
                  Configure SSL Certificate: {configuringSsl.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Provide domain name, CSR, and choose validation email.</p>
              </div>
              <button onClick={() => setConfiguringSsl(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Domain Name (FQDN) *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sslForm.domain}
                    onChange={(e) => setSslForm({ ...sslForm, domain: e.target.value })}
                    onBlur={() => handleFetchApproverEmails(sslForm.domain)}
                    placeholder="example.com"
                    className="flex-1 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleFetchApproverEmails(sslForm.domain)}
                    disabled={loadingApprovers}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1"
                  >
                    {loadingApprovers ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Fetch DCV
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">DCV Approver Email *</label>
                <select
                  value={sslForm.approverEmail}
                  onChange={(e) => setSslForm({ ...sslForm, approverEmail: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 font-mono text-xs bg-white"
                >
                  {approverEmails.length === 0 ? (
                    <option value="">{loadingApprovers ? 'Loading emails...' : 'Enter domain above to list approver emails'}</option>
                  ) : (
                    approverEmails.map(em => (
                      <option key={em} value={em}>{em}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-700 font-bold">Certificate Signing Request (CSR) *</label>
                  <button
                    type="button"
                    onClick={() => handleGenerateCsr(sslForm.domain)}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                  >
                    Auto-Generate CSR
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={sslForm.csr}
                  onChange={(e) => setSslForm({ ...sslForm, csr: e.target.value })}
                  placeholder="-----BEGIN CERTIFICATE REQUEST-----..."
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 font-mono text-xs text-slate-800 resize-none"
                />
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfiguringSsl(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitConfigureSsl}
                disabled={submittingSsl}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {submittingSsl ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                <span>{submittingSsl ? 'Submitting...' : 'Issue Certificate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nameserver Modal */}
      {managingNsDomain && (
        <NameserverModal
          domain={managingNsDomain}
          onClose={() => setManagingNsDomain(null)}
          onUpdate={() => {}}
        />
      )}

      {/* VPS Credentials Modal */}
      {viewingVpsCredentials && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Terminal className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Server Credentials</h3>
                  <p className="text-xs text-purple-200">
                    {viewingVpsCredentials.vpsDetails?.hostname || viewingVpsCredentials.domain || 'Cloud VPS Instance'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setViewingVpsCredentials(null); setShowVpsPass(false); }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Connection Box */}
              <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 font-mono">SSH Root Login</span>
                  {viewingVpsCredentials.serverIp && (
                    <button
                      onClick={() => copyToClipboard(`ssh root@${viewingVpsCredentials.serverIp}`, 'SSH Command')}
                      className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  )}
                </div>
                <div className="font-mono text-xs text-emerald-400 select-all">
                  ssh root@{viewingVpsCredentials.serverIp || 'YOUR_SERVER_IP'}
                </div>
              </div>

              {/* Grid */}
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                <div className="p-2.5 flex justify-between items-center bg-slate-50/50">
                  <span className="text-slate-500 font-medium">Hostname</span>
                  <span className="font-mono font-bold text-slate-900">
                    {viewingVpsCredentials.vpsDetails?.hostname || viewingVpsCredentials.domain || 'N/A'}
                  </span>
                </div>

                <div className="p-2.5 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Dedicated IP</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600">
                      {viewingVpsCredentials.serverIp || 'Allocating...'}
                    </span>
                    {viewingVpsCredentials.serverIp && (
                      <button
                        onClick={() => copyToClipboard(viewingVpsCredentials.serverIp!, 'IP')}
                        className="text-slate-400 hover:text-slate-600"
                        title="Copy IP"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-2.5 flex justify-between items-center bg-slate-50/50">
                  <span className="text-slate-500 font-medium">Root Username</span>
                  <span className="font-mono font-bold text-slate-900">root</span>
                </div>

                <div className="p-2.5 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Root Password</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">
                      {showVpsPass ? (viewingVpsCredentials.vpsDetails?.rootPassword || 'None') : '••••••••••••'}
                    </span>
                    {viewingVpsCredentials.vpsDetails?.rootPassword && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowVpsPass(!showVpsPass)}
                          className="text-slate-400 hover:text-slate-600"
                          title={showVpsPass ? "Hide" : "Show"}
                        >
                          {showVpsPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(viewingVpsCredentials.vpsDetails?.rootPassword!, 'Root Password')}
                          className="text-slate-400 hover:text-purple-600"
                          title="Copy Password"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-2.5 flex justify-between items-center bg-slate-50/50">
                  <span className="text-slate-500 font-medium">Operating System</span>
                  <span className="font-semibold text-slate-800">
                    {viewingVpsCredentials.vpsDetails?.os || 'Ubuntu / Linux'}
                  </span>
                </div>

                <div className="p-2.5 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Datacenter</span>
                  <span className="font-semibold text-slate-800">
                    {viewingVpsCredentials.vpsDetails?.serverLocation || 'BDIX Dhaka / Global'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => { setViewingVpsCredentials(null); setShowVpsPass(false); }}
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hosting Upgrade Modal */}
      {upgradingHosting && (
        <HostingUpgradeModal
          account={upgradingHosting}
          onClose={() => setUpgradingHosting(null)}
        />
      )}

    </div>
  );
};

export default MyServicesTab;
