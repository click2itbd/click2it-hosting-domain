import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Layout } from '../components/Layout';
import { getHostingUsage, HostingUsageStats } from '../services/hostingApi';
import { 
  RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, HardDrive, Wifi, 
  Server, Globe, Receipt, Download, ExternalLink, ChevronRight, LayoutDashboard, 
  Ticket, Terminal, Copy, Eye, EyeOff, Cpu, Key, X, Share2, Shield, 
  Sparkles, Plus, Search, Activity, Layers, ArrowUpRight, UserCheck, Loader2
} from 'lucide-react';
import { HostingOrder } from '../types';

import { useSettings } from '../context/SettingsContext';
import { formatCurrency } from '../lib/utils';
import { SupportTicketsClient } from '../components/hosting/SupportTicketsClient';
import { NameserverModal } from '../components/hosting/NameserverModal';
import { DomainSecurityModal } from '../components/hosting/DomainSecurityModal';
import { DomainOwnershipModal } from '../components/hosting/DomainOwnershipModal';
import { UserAffiliateTab } from '../components/hosting/UserAffiliateTab';
import { HostingUpgradeModal } from '../components/hosting/HostingUpgradeModal';
import { apiPost } from '../services/apiClient';
import { getFriendlyErrorMessage } from '../utils/errorUtils';

interface DomainOrder {
  id: string;
  domain: string;
  status: string;
  type?: 'register' | 'renewal' | 'transfer';
  expiresAt?: string;
  autoRenew?: boolean;
  price?: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

interface BdDomainApp {
  id: string;
  domain: string;
  status: string;
  createdAt: string;
  [key: string]: any;
}

interface HostingAccount {
  id: string;
  planId?: string;
  providerAccountId?: string;
  type?: string;
  provider?: string;
  vpsDetails?: {
    hostname?: string;
    os?: string;
    serverLocation?: string;
    rootPassword?: string;
    sshKey?: string;
    cores?: string;
    ram?: string;
    storage?: string;
    bandwidth?: string;
    notes?: string;
  };
  status: string;
  serverIp?: string;
  controlPanelUrl?: string;
  diskUsageGb?: number;
  bandwidthUsageGb?: number;
  expiresAt?: string;
  autoRenew?: boolean;
  billingCycle?: string;
  domain?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

function formatExpiryDate(dateStr?: string): string {
  if (!dateStr) return 'Active Subscription';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const MyServices: React.FC = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();

  // State
  const [domains, setDomains] = useState<DomainOrder[]>([]);
  const [hosting, setHosting] = useState<HostingAccount[]>([]);
  const [bdDomains, setBdDomains] = useState<BdDomainApp[]>([]);
  const [orders, setOrders] = useState<HostingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainLoading, setDomainLoading] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<Record<string, HostingUsageStats>>({});
  const [usageLoading, setUsageLoading] = useState<string | null>(null);
  const [ssoLoading, setSsoLoading] = useState<string | null>(null);

  // Auto-fetch usage for active hosting accounts on mount
  useEffect(() => {
    const activeAccounts = hosting.filter(h => h.status === 'active');
    activeAccounts.forEach(acc => {
      if (acc.id && !usageData[acc.id]) {
        getHostingUsage(acc.providerAccountId || acc.domain || '').then(data => {
          if (data) {
            setUsageData(prev => ({ ...prev, [acc.id]: data }));
          }
        }).catch(() => {});
      }
    });
  }, [hosting.length]);

  const handleCpanelSso = async (account: HostingAccount) => {
    setSsoLoading(account.id);
    const toastId = toast.loading('Generating secure 1-click cPanel session...');
    try {
      const res: any = await apiPost('/api/hosting/sso', {
        hostingAccountId: account.id,
        providerAccountId: account.providerAccountId,
        domain: account.domain
      });
      if (res && res.success && res.url) {
        toast.success('Redirecting to cPanel...', { id: toastId });
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else {
        const fallbackUrl = account.controlPanelUrl || account.cPanelUrl || (account.domain ? `https://${account.domain}:2083` : null);
        if (fallbackUrl) {
          toast.success('Opening cPanel login...', { id: toastId });
          window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        } else {
          toast.error(getFriendlyErrorMessage(res?.error, 'Failed to launch cPanel session'), { id: toastId });
        }
      }
    } catch (err: any) {
      const fallbackUrl = account.controlPanelUrl || account.cPanelUrl || (account.domain ? `https://${account.domain}:2083` : null);
      if (fallbackUrl) {
        toast.success('Opening cPanel login...', { id: toastId });
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast.error(getFriendlyErrorMessage(err, 'Failed to connect to cPanel'), { id: toastId });
      }
    } finally {
      setSsoLoading(null);
    }
  };
  const [activeTab, setActiveTab] = useState<'overview' | 'domains' | 'hosting' | 'billing' | 'support' | 'affiliate'>('overview');
  
  // Modals
  const [managingNsDomain, setManagingNsDomain] = useState<DomainOrder | null>(null);
  const [managingSecurityDomain, setManagingSecurityDomain] = useState<DomainOrder | null>(null);
  const [managingOwnershipDomain, setManagingOwnershipDomain] = useState<DomainOrder | null>(null);
  const [upgradingHosting, setUpgradingHosting] = useState<HostingAccount | null>(null);
  const [selectedVpsModal, setSelectedVpsModal] = useState<HostingAccount | null>(null);
  const [showVpsModalPass, setShowVpsModalPass] = useState(false);

  // Search & Filter state
  const [domainSearch, setDomainSearch] = useState('');
  const [hostingFilter, setHostingFilter] = useState<'all' | 'shared' | 'vps'>('all');
  const [hostingSearch, setHostingSearch] = useState('');
  const [billingSearch, setBillingSearch] = useState('');

  const isVpsAccount = (acc: HostingAccount) => {
    return (
      acc.type === 'vps' ||
      acc.provider === 'vps' ||
      Boolean(acc.vpsDetails) ||
      Boolean(acc.planId?.toLowerCase().includes('vps'))
    );
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${fieldName} copied!`);
  };

  useEffect(() => {
    if (!user) return;

    const qDomains = query(collection(db, 'domainOrders'), where('userId', '==', user.uid), limit(100));
    const unsubDomains = onSnapshot(qDomains, (snap) => {
      setDomains(snap.docs.map(d => ({ id: d.id, ...d.data() } as DomainOrder)));
      setLoading(false);
    }, (err) => {
      console.error('Error loading domains:', err);
      setLoading(false);
    });

    const qHosting = query(collection(db, 'hostingAccounts'), where('userId', '==', user.uid), limit(100));
    const unsubHosting = onSnapshot(qHosting, (snap) => {
      setHosting(snap.docs.map(d => ({ id: d.id, ...d.data() } as HostingAccount)));
      setLoading(false);
    }, (err) => {
      console.error('Error loading hosting:', err);
      setLoading(false);
    });

    const qBdDomains = query(collection(db, 'bd_domain_applications'), where('email', '==', user.email || ''), limit(50));
    const unsubBdDomains = onSnapshot(qBdDomains, (snap) => {
      setBdDomains(snap.docs.map(d => ({ id: d.id, ...d.data() } as BdDomainApp)));
    }, (err) => {
      console.error('Error loading bd domains:', err);
    });

    const qOrders = query(collection(db, 'orders'), where('userId', '==', user.uid), limit(100));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const hostingRelatedOrders = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as HostingOrder))
        .filter(o => o.items && o.items.some(i => i.itemType === 'hosting' || i.itemType === 'domain' || i.category === 'Hosting & Domains'))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(hostingRelatedOrders);
    }, (err) => {
      console.error('Error loading orders:', err);
    });

    return () => {
      unsubDomains();
      unsubHosting();
      unsubBdDomains();
      unsubOrders();
    };
  }, [user]);

  const handleToggleAutoRenew = async (type: 'domain' | 'hosting', record: DomainOrder | HostingAccount) => {
    const isHosting = type === 'hosting';
    const collName = isHosting ? 'hostingAccounts' : 'domainOrders';
    const currentVal = !!record.autoRenew;
    try {
      await updateDoc(doc(db, collName, record.id), {
        autoRenew: !currentVal,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Auto-renew ` + (!currentVal ? 'enabled' : 'disabled'));
    } catch (err: any) {
      toast.error(getFriendlyErrorMessage(err, 'Failed to update auto-renew status. Please try again.'));
    }
  };

  const handleRenewDomain = async (domain: DomainOrder) => {
    setDomainLoading(domain.id);
    try {
      const token = await user?.getIdToken();
      const res = await apiPost('/api/domain/renew', {
        domain: domain.domain,
        years: 1,
      }, token);
      
      if ((res as any).success) {
        const renewalProduct = {
          id: `domain_renew_${domain.domain}`,
          name: `Domain Renewal - ${domain.domain}`,
          description: '1 Year Renewal',
          price: domain.price || 1000,
          category: 'Hosting & Domains',
          stock: 9999,
          images: [],
          createdAt: new Date().toISOString(),
          itemType: 'domain' as const,
          domainTld: domain.domain.split('.').pop() || '',
          termYears: 1,
        };
        addToCart(renewalProduct as any);
        navigate('/hosting/checkout');
      } else {
        toast.error(getFriendlyErrorMessage((res as any).error || (res as any).message, 'Domain renewal request could not be processed. Please try again.'));
      }
    } catch (error: any) {
      toast.error(getFriendlyErrorMessage(error, 'Failed to renew domain. Please try again.'));
    } finally {
      setDomainLoading(null);
    }
  };

  const handleFetchUsage = async (account: HostingAccount) => {
    if (!account.providerAccountId) {
      toast.error('Hosting account is being provisioned. Please check back shortly.');
      return;
    }
    
    setUsageLoading(account.id);
    try {
      const res = await getHostingUsage(account.providerAccountId);
      if (res) {
        setUsageData(prev => ({
          ...prev,
          [account.id]: res
        }));
      } else {
        toast.error(getFriendlyErrorMessage(null, 'Failed to fetch usage data'));
      }
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err, 'Error fetching usage data'));
    } finally {
      setUsageLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || 'pending';
    switch (s) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={11} className="text-amber-500" />
            Pending
          </span>
        );
      case 'pending_setup':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RefreshCw size={11} className="text-blue-500 animate-spin" />
            Setting Up
          </span>
        );
      case 'provisioning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <RefreshCw size={11} className="text-purple-500 animate-spin" />
            Provisioning
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle size={11} className="text-rose-500" />
            Suspended
          </span>
        );
      case 'terminated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <XCircle size={11} className="text-gray-500" />
            Terminated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 capitalize">
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
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(settings?.brandName || 'CLICK2IT', 14, currentY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    currentY += 6;
    doc.text(settings?.contactEmail || '', 14, currentY);
    currentY += 5;
    doc.text(settings?.contactPhone || '', 14, currentY);
    
    // INVOICE text
    doc.setFontSize(24);
    doc.setTextColor(0);
    doc.text('INVOICE', pageWidth - 14, 20, { align: 'right' });

    currentY += 15;
    doc.setLineWidth(0.5);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 10;

    // Customer Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Billed To:', 14, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 5;
    
    const startY = currentY;
    const nameLines = doc.splitTextToSize(order.customerName || 'N/A', 120);
    doc.text(nameLines, 14, currentY);
    currentY += (nameLines.length * 5);
    
    const emailLines = doc.splitTextToSize(order.customerEmail || 'N/A', 120);
    doc.text(emailLines, 14, currentY);
    currentY += (emailLines.length * 5);
    
    const phoneLines = doc.splitTextToSize(order.customerPhone || 'N/A', 120);
    doc.text(phoneLines, 14, currentY);
    currentY += (phoneLines.length * 5);
    
    // Invoice details
    let detailsY = startY;
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Details:', pageWidth - 60, detailsY);
    doc.setFont('helvetica', 'normal');
    detailsY += 5;
    doc.text(`Invoice No: ${order.documentNumber || order.id.slice(0, 8)}`, pageWidth - 60, detailsY);
    detailsY += 5;
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, pageWidth - 60, detailsY);
    detailsY += 5;
    doc.text(`Status: ${order.status.toUpperCase()}`, pageWidth - 60, detailsY);

    currentY += 15;

    // Table
    const tableBody = (order.items || []).map(item => [
      item.name,
      item.itemType === 'domain' ? `${item.termYears || 1} Year(s)` : (item.billingCycle || 'Monthly'),
      formatCurrency(item.price, settings as any),
      formatCurrency(item.price, settings as any)
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Description', 'Term/Cycle', 'Price', 'Total']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [8, 22, 33] },
      styles: { fontSize: 9 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${formatCurrency(order.total, settings as any)}`, pageWidth - 14, finalY, { align: 'right' });

    doc.save(`Invoice_${order.documentNumber || order.id.slice(0, 8)}.pdf`);
  };

  // Filtered lists
  const filteredDomains = useMemo(() => {
    return domains.filter(d => 
      !domainSearch.trim() || d.domain.toLowerCase().includes(domainSearch.toLowerCase().trim())
    );
  }, [domains, domainSearch]);

  const filteredHosting = useMemo(() => {
    return hosting.filter(h => {
      const isVps = isVpsAccount(h);
      if (hostingFilter === 'vps' && !isVps) return false;
      if (hostingFilter === 'shared' && isVps) return false;
      if (hostingSearch.trim()) {
        const query = hostingSearch.toLowerCase().trim();
        const matchPlan = h.planId?.toLowerCase().includes(query);
        const matchDomain = h.domain?.toLowerCase().includes(query);
        const matchIp = h.serverIp?.toLowerCase().includes(query);
        const matchHost = h.vpsDetails?.hostname?.toLowerCase().includes(query);
        if (!matchPlan && !matchDomain && !matchIp && !matchHost) return false;
      }
      return true;
    });
  }, [hosting, hostingFilter, hostingSearch]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (!billingSearch.trim()) return true;
      const q = billingSearch.toLowerCase().trim();
      const num = (o.documentNumber || o.id).toLowerCase();
      return num.includes(q) || o.status.toLowerCase().includes(q);
    });
  }, [orders, billingSearch]);

  // Statistics
  const activeDomainsCount = domains.filter(d => d.status === 'active').length;
  const activeHostingCount = hosting.filter(h => h.status === 'active' && !isVpsAccount(h)).length;
  const activeVpsCount = hosting.filter(h => h.status === 'active' && isVpsAccount(h)).length;
  const paidOrdersCount = orders.filter(o => o.status === 'completed' || (o as any).paymentStatus === 'paid').length;

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-600 border-t-transparent" />
            <p className="text-sm font-medium text-slate-500">Loading your client portal...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/60 pb-16">
        
        {/* Modern Top Hero & Profile Banner */}
        <div className="relative bg-gradient-to-r from-slate-950 via-[#0a1f38] to-slate-900 text-white overflow-hidden border-b border-slate-800 shadow-sm">
          {/* Subtle background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.18),rgba(255,255,255,0))] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 relative">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              
              {/* User greeting & client status */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-blue-500/20 ring-2 ring-white/10 shrink-0">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                      {user?.displayName || 'Client Portal'}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Shield size={12} className="text-emerald-400" /> Verified
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                    <span>{user?.email || 'Logged in account'}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-blue-300/80">Manage services, cloud servers & billing</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <button
                  onClick={() => navigate('/domain')}
                  className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold backdrop-blur-md border border-white/15 transition-all shadow-sm hover:scale-[1.02]"
                >
                  <Globe size={15} className="text-blue-400" />
                  <span>Register Domain</span>
                </button>
                <button
                  onClick={() => navigate('/hosting')}
                  className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 hover:scale-[1.02]"
                >
                  <Plus size={15} />
                  <span>Order Hosting / VPS</span>
                </button>
              </div>

            </div>

            {/* Quick Metrics Bar in Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/10 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Globe size={16} />
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Domains</div>
                  <div className="text-base font-bold text-white">{domains.length} <span className="text-slate-400 text-xs font-normal">({activeDomainsCount} Active)</span></div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Server size={16} />
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Web Hosting</div>
                  <div className="text-base font-bold text-white">{activeHostingCount} <span className="text-slate-400 text-xs font-normal">Active</span></div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Terminal size={16} />
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Cloud VPS</div>
                  <div className="text-base font-bold text-white">{activeVpsCount} <span className="text-slate-400 text-xs font-normal">Active</span></div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Receipt size={16} />
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Invoices</div>
                  <div className="text-base font-bold text-white">{orders.length} <span className="text-slate-400 text-xs font-normal">({paidOrdersCount} Paid)</span></div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Mobile Horizontal Tab Navigation */}
        <div className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-20 px-3 py-2 overflow-x-auto flex gap-1.5 no-scrollbar shadow-xs">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'domains', label: 'Domains', icon: Globe, count: domains.length },
            { id: 'hosting', label: 'Hosting & VPS', icon: Server, count: hosting.length },
            { id: 'billing', label: 'Invoices', icon: Receipt, count: orders.length },
            { id: 'support', label: 'Support', icon: Ticket },
            { id: 'affiliate', label: 'Affiliate', icon: Share2 },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive ? 'bg-[#0E2A47] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Layout */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="flex flex-col md:flex-row gap-6">
            
            {/* Desktop Sidebar Navigation */}
            <div className="hidden md:block w-64 shrink-0">
              <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-3 sticky top-24 space-y-1">
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Navigation
                </div>

                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'overview' 
                      ? 'bg-blue-50 text-blue-900 border border-blue-100 shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard size={17} className={activeTab === 'overview' ? 'text-blue-600' : 'text-slate-400'} />
                    <span>Dashboard Overview</span>
                  </div>
                  <ChevronRight size={14} className={activeTab === 'overview' ? 'text-blue-600' : 'text-slate-300'} />
                </button>

                <button 
                  onClick={() => setActiveTab('domains')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'domains' 
                      ? 'bg-blue-50 text-blue-900 border border-blue-100 shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Globe size={17} className={activeTab === 'domains' ? 'text-blue-600' : 'text-slate-400'} />
                    <span>My Domains</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    activeTab === 'domains' ? 'bg-blue-200/70 text-blue-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {domains.length}
                  </span>
                </button>

                <button 
                  onClick={() => setActiveTab('hosting')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'hosting' 
                      ? 'bg-blue-50 text-blue-900 border border-blue-100 shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Server size={17} className={activeTab === 'hosting' ? 'text-blue-600' : 'text-slate-400'} />
                    <span>Hosting & VPS</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    activeTab === 'hosting' ? 'bg-blue-200/70 text-blue-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {hosting.length}
                  </span>
                </button>

                <button 
                  onClick={() => setActiveTab('billing')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'billing' 
                      ? 'bg-blue-50 text-blue-900 border border-blue-100 shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Receipt size={17} className={activeTab === 'billing' ? 'text-blue-600' : 'text-slate-400'} />
                    <span>Invoices & Billing</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    activeTab === 'billing' ? 'bg-blue-200/70 text-blue-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {orders.length}
                  </span>
                </button>

                <button 
                  onClick={() => setActiveTab('support')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'support' 
                      ? 'bg-blue-50 text-blue-900 border border-blue-100 shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Ticket size={17} className={activeTab === 'support' ? 'text-blue-600' : 'text-slate-400'} />
                    <span>Support Tickets</span>
                  </div>
                  <ChevronRight size={14} className={activeTab === 'support' ? 'text-blue-600' : 'text-slate-300'} />
                </button>

                <div className="pt-2 border-t border-slate-100 mt-2">
                  <button 
                    onClick={() => setActiveTab('affiliate')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'affiliate' 
                        ? 'bg-amber-50 text-amber-900 border border-amber-200/70 shadow-xs' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Share2 size={17} className={activeTab === 'affiliate' ? 'text-amber-600' : 'text-slate-400'} />
                      <span>Affiliate Program</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                      Earn
                    </span>
                  </button>
                </div>

                {/* Helpful Quick Link Card */}
                <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-slate-900 to-[#0E2A47] text-white text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-blue-200">
                    <Sparkles size={14} className="text-yellow-400" />
                    <span>Need Help?</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Our technical team is available 24/7 to help resolve your domain, server, or configuration issues.
                  </p>
                  <button
                    onClick={() => setActiveTab('support')}
                    className="w-full py-1.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1"
                  >
                    <span>Open a Ticket</span>
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 space-y-6">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Active Domains Card */}
                    <div 
                      onClick={() => setActiveTab('domains')}
                      className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Domains</span>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Globe size={20} />
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-2xl font-black text-slate-900">{domains.length}</div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <span className="font-semibold text-emerald-600">{activeDomainsCount} Active</span>
                          <span>• Manage DNS & renewal</span>
                        </p>
                      </div>
                    </div>

                    {/* Web Hosting Card */}
                    <div 
                      onClick={() => { setActiveTab('hosting'); setHostingFilter('shared'); }}
                      className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Web Hosting</span>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Server size={20} />
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-2xl font-black text-slate-900">{hosting.filter(h => !isVpsAccount(h)).length}</div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <span className="font-semibold text-emerald-600">{activeHostingCount} Active</span>
                          <span>• cPanel Web accounts</span>
                        </p>
                      </div>
                    </div>

                    {/* Cloud VPS Card */}
                    <div 
                      onClick={() => { setActiveTab('hosting'); setHostingFilter('vps'); }}
                      className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Cloud VPS</span>
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Terminal size={20} />
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-2xl font-black text-slate-900">{hosting.filter(h => isVpsAccount(h)).length}</div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <span className="font-semibold text-purple-600">{activeVpsCount} Online</span>
                          <span>• Dedicated Root instances</span>
                        </p>
                      </div>
                    </div>

                    {/* Invoices Card */}
                    <div 
                      onClick={() => setActiveTab('billing')}
                      className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Invoices</span>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Receipt size={20} />
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-2xl font-black text-slate-900">{orders.length}</div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <span className="font-semibold text-amber-600">{paidOrdersCount} Paid</span>
                          <span>• View & download PDF</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Live cPanel Server Resources Widget */}
                  {activeHostingCount > 0 && (
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm border border-slate-700/50">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                            <Server size={20} />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                              Live Server Resources & cPanel Stats
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Live Sync</span>
                            </h3>
                            <p className="text-xs text-slate-400">Real-time disk quota, bandwidth usage, and instant SSO login</p>
                          </div>
                        </div>
                        {(() => {
                          const primaryAccount = hosting.find(h => h.status === 'active' && !isVpsAccount(h));
                          if (!primaryAccount) return null;
                          return (
                            <button
                              type="button"
                              onClick={() => handleCpanelSso(primaryAccount)}
                              disabled={ssoLoading === primaryAccount.id}
                              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
                            >
                              {ssoLoading === primaryAccount.id ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                              <span>1-Click Login to cPanel</span>
                            </button>
                          );
                        })()}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                        {(() => {
                          const primaryAccount = hosting.find(h => h.status === 'active' && !isVpsAccount(h)) || hosting[0];
                          if (!primaryAccount) return null;
                          const usage = usageData[primaryAccount.id];
                          const diskUsedGb = usage ? (usage.diskUsageMB / 1024) : 1.2;
                          const diskLimitGb = usage ? (usage.diskLimitMB / 1024) : 5.0;
                          const diskPercent = diskLimitGb > 0 ? Math.min(Math.round((diskUsedGb / diskLimitGb) * 100), 100) : 24;

                          const bwUsedGb = usage ? (usage.bandwidthUsageMB / 1024) : 3.4;
                          const bwLimitGb = usage ? (usage.bandwidthLimitMB / 1024) : 50.0;
                          const bwPercent = bwLimitGb > 0 ? Math.min(Math.round((bwUsedGb / bwLimitGb) * 100), 100) : 7;

                          return (
                            <>
                              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-slate-300">Disk Quota ({primaryAccount.domain})</span>
                                  <span className="font-bold text-cyan-400 font-mono">{diskUsedGb.toFixed(1)} GB / {diskLimitGb.toFixed(1)} GB ({diskPercent}%)</span>
                                </div>
                                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${diskPercent >= 85 ? 'bg-rose-500' : diskPercent >= 70 ? 'bg-amber-400' : 'bg-cyan-400'}`}
                                    style={{ width: `${diskPercent}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                                  <span>You used {diskUsedGb.toFixed(1)} GB of {diskLimitGb.toFixed(1)} GB ({diskPercent}%)</span>
                                  {diskPercent >= 75 ? (
                                    <button onClick={() => setUpgradingHosting(primaryAccount)} className="text-amber-400 font-bold hover:underline">
                                      Upgrade Disk &rarr;
                                    </button>
                                  ) : (
                                    <span className="text-slate-500">Optimal</span>
                                  )}
                                </div>
                              </div>

                              <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-slate-300">Bandwidth Usage (Monthly)</span>
                                  <span className="font-bold text-emerald-400 font-mono">{bwUsedGb.toFixed(1)} GB / {bwLimitGb.toFixed(1)} GB ({bwPercent}%)</span>
                                </div>
                                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${bwPercent >= 85 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                                    style={{ width: `${bwPercent}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                                  <span>Monthly transfer: {bwUsedGb.toFixed(1)} GB consumed</span>
                                  <button onClick={() => handleFetchUsage(primaryAccount)} className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]">
                                    <RefreshCw size={11} className={usageLoading === primaryAccount.id ? 'animate-spin' : ''} /> Refresh
                                  </button>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Empty state if user has completely zero services */}
                  {domains.length === 0 && hosting.length === 0 && (
                    <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center shadow-xs">
                      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                        <Sparkles size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">Welcome to your Client Portal!</h3>
                      <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                        You don't have any active domain or hosting accounts yet. Start by registering your dream domain or choosing a hosting plan.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={() => navigate('/domain')}
                          className="px-5 py-2.5 rounded-xl bg-[#0E2A47] hover:bg-blue-900 text-white font-bold text-xs transition"
                        >
                          Find a Domain
                        </button>
                        <button
                          onClick={() => navigate('/hosting')}
                          className="px-5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition"
                        >
                          Browse Hosting Plans
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Recent Services Quick View */}
                  {(domains.length > 0 || hosting.length > 0) && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers size={18} className="text-[#0E2A47]" />
                          <h2 className="text-sm font-bold text-slate-900">Your Active Services Overview</h2>
                        </div>
                        <span className="text-xs font-medium text-slate-400">
                          {domains.length + hosting.length} Total Registered
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {/* Domain rows preview */}
                        {domains.slice(0, 3).map(dom => (
                          <div key={dom.id} className="p-4 sm:px-6 hover:bg-slate-50/70 transition flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Globe size={18} />
                              </div>
                              <div className="truncate">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm truncate">{dom.domain}</span>
                                  {dom.type === 'transfer' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                      Transfer
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500">
                                  Expires: {dom.expiresAt ? new Date(dom.expiresAt).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {getStatusBadge(dom.status)}
                              <button
                                onClick={() => setActiveTab('domains')}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                              >
                                Manage →
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Hosting rows preview */}
                        {hosting.slice(0, 3).map(acc => {
                          const isVps = isVpsAccount(acc);
                          return (
                            <div key={acc.id} className="p-4 sm:px-6 hover:bg-slate-50/70 transition flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  isVps ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                  {isVps ? <Terminal size={18} /> : <Server size={18} />}
                                </div>
                                <div className="truncate">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-sm truncate">
                                      {acc.vpsDetails?.hostname || acc.domain || acc.planId || 'Hosting Plan'}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      isVps ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {isVps ? 'Cloud VPS' : 'cPanel Web'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    IP: {acc.serverIp || 'Provisioning...'} • Billing: {acc.billingCycle || 'Monthly'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {getStatusBadge(acc.status)}
                                <button
                                  onClick={() => setActiveTab('hosting')}
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                                >
                                  Manage →
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                        <button
                          onClick={() => setActiveTab('hosting')}
                          className="text-xs font-bold text-[#0E2A47] hover:underline"
                        >
                          View all services in detail →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Transfer Status Notice (If any domain is in transfer) */}
                  {domains.some(d => d.type === 'transfer' && (d.status === 'pending' || (d as any).providerStatus === 'REQ')) && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 text-amber-900 flex items-start gap-3 shadow-xs">
                      <Clock size={22} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <h4 className="font-bold text-sm text-amber-950">Domain Transfer In Progress (ICANN 5–7 Days Window)</h4>
                        <p className="text-amber-800 leading-relaxed">
                          Your transfer request has been initiated with the global registry. The current registrar will email the original domain owner for transfer approval. Once approved (or after 5–7 business days according to ICANN regulations), your domain will automatically become active in your account.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DOMAINS */}
              {activeTab === 'domains' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    {/* Header & Search */}
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Globe size={18} className="text-[#0E2A47]" />
                          My Domains ({domains.length})
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">Manage nameservers, auto-renewal, and renewals</p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-60">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search domains..."
                            value={domainSearch}
                            onChange={(e) => setDomainSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 transition"
                          />
                        </div>
                        <button
                          onClick={() => navigate('/domain')}
                          className="px-3 py-1.5 bg-[#0E2A47] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
                        >
                          <Plus size={14} />
                          <span>New</span>
                        </button>
                      </div>
                    </div>

                    {/* Domains Table */}
                    {filteredDomains.length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                          <Globe size={24} />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm">
                          {domainSearch ? 'No domains matched your search' : 'No Domains Found'}
                        </h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                          {domainSearch ? 'Try a different domain name or clear the search input.' : 'You have not registered or transferred any domain yet.'}
                        </p>
                        <button 
                          onClick={() => navigate('/domain')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                        >
                          Register a Domain
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3.5">Domain Name</th>
                              <th className="px-6 py-3.5">Status</th>
                              <th className="px-6 py-3.5">Expiration Date</th>
                              <th className="px-6 py-3.5">Auto-Renew</th>
                              <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredDomains.map(domain => (
                              <tr key={domain.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-[#0E2A47]">{domain.domain}</span>
                                      {domain.type === 'transfer' && (
                                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                          Transfer In
                                        </span>
                                      )}
                                    </div>
                                    {domain.type === 'transfer' && (domain.status === 'pending' || (domain as any).providerStatus === 'REQ') && (
                                      <span className="text-[11px] font-medium text-amber-700 flex items-center gap-1">
                                        <Clock size={11} /> 5–7 days ICANN approval period in progress. Check admin email.
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  {getStatusBadge(domain.status)}
                                </td>

                                <td className="px-6 py-4 text-slate-600 font-medium">
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

                                <td className="px-6 py-4">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={!!domain.autoRenew} 
                                      onChange={() => handleToggleAutoRenew('domain', domain)} 
                                      className="sr-only peer" 
                                    />
                                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600" />
                                  </label>
                                </td>

                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end items-center gap-2">
                                    <button 
                                      onClick={() => setManagingOwnershipDomain(domain)} 
                                      className="text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 border border-purple-200/60"
                                      title="Push Domain to User or Update WHOIS Legal Registrant"
                                    >
                                      <UserCheck size={12} /> Ownership
                                    </button>
                                    <button 
                                      onClick={() => setManagingSecurityDomain(domain)} 
                                      className="text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 border border-blue-200/60"
                                      title="Domain Lock, Auth Code & Transfer Protection"
                                    >
                                      <Shield size={12} /> Lock & Security
                                    </button>
                                    <button 
                                      onClick={() => setManagingNsDomain(domain)} 
                                      className="text-slate-700 hover:text-[#0E2A47] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                    >
                                      Nameservers
                                    </button>
                                    <button 
                                      onClick={() => handleRenewDomain(domain)} 
                                      disabled={domainLoading === domain.id} 
                                      className="bg-[#0E2A47] hover:bg-blue-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50"
                                    >
                                      {domainLoading === domain.id ? 'Renewing...' : 'Renew'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* BD Domain Applications Section */}
                  {bdDomains.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 bg-emerald-50/40 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Globe size={18} className="text-emerald-700" />
                          .BD Domain Applications ({bdDomains.length})
                        </h2>
                        <span className="text-xs text-emerald-800 font-semibold">BTCL Automated Processing</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3.5">BD Domain</th>
                              <th className="px-6 py-3.5">Application Status</th>
                              <th className="px-6 py-3.5">Application Date</th>
                              <th className="px-6 py-3.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bdDomains.map(app => (
                              <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-emerald-900 text-sm">
                                  {app.domain || app.domainName}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                                    {(app.status || 'submitted').replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-medium">
                                  {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {app.status === 'payment_pending' ? (
                                    <button 
                                      onClick={() => navigate('/checkout?bd_domain=' + encodeURIComponent(app.domain || app.domainName) + '&app_id=' + app.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-colors shadow-xs"
                                    >
                                      Pay Now
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 text-xs">Under Review</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: HOSTING & CLOUD VPS */}
              {activeTab === 'hosting' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    {/* Header with Type Segments & Search */}
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Server size={18} className="text-[#0E2A47]" />
                          Hosting & Cloud VPS ({hosting.length})
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">Control panels, dedicated IP addresses, specs and server credentials</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {/* Segment pill toggles */}
                        <div className="flex bg-slate-200/70 p-0.5 rounded-xl text-xs font-semibold">
                          <button
                            onClick={() => setHostingFilter('all')}
                            className={`px-3 py-1 rounded-lg transition ${
                              hostingFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            All ({hosting.length})
                          </button>
                          <button
                            onClick={() => setHostingFilter('shared')}
                            className={`px-3 py-1 rounded-lg transition ${
                              hostingFilter === 'shared' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Shared ({hosting.filter(h => !isVpsAccount(h)).length})
                          </button>
                          <button
                            onClick={() => setHostingFilter('vps')}
                            className={`px-3 py-1 rounded-lg transition ${
                              hostingFilter === 'vps' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            VPS ({hosting.filter(h => isVpsAccount(h)).length})
                          </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search server/domain..."
                            value={hostingSearch}
                            onChange={(e) => setHostingSearch(e.target.value)}
                            className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 w-36 sm:w-44 transition"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    {filteredHosting.length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                          <Server size={24} />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm">No hosting accounts found</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                          {hostingSearch ? 'No services match your query.' : 'You do not have any active web hosting or Cloud VPS plans yet.'}
                        </p>
                        <button 
                          onClick={() => navigate('/hosting')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                        >
                          Browse Hosting Plans
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3.5">Service & Details</th>
                              <th className="px-6 py-3.5">Status & Dedicated IP</th>
                              <th className="px-6 py-3.5">Specs / Usage</th>
                              <th className="px-6 py-3.5">Billing & Cycle</th>
                              <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredHosting.map(account => {
                              const isLicense = account.type === 'license' || account.provider === 'cloudlinux';
                              const isVps = !isLicense && isVpsAccount(account);
                              const vps = account.vpsDetails || {};
                              const hostname = vps.hostname || account.domain || account.planId || 'Cloud VPS Instance';

                              if (isLicense) {
                                const licenseIp = account.serverIp || (account.domain !== 'CloudLinux License' ? account.domain : '') || '';
                                return (
                                  <tr key={account.id} className="hover:bg-indigo-50/30 transition-colors bg-indigo-50/5">
                                    <td className="px-6 py-4">
                                      <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                                          <Shield size={18} />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 text-sm">{account.planName || account.planId || 'CloudLinux OS License'}</span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wide">
                                              OS License
                                            </span>
                                          </div>
                                          <p className="text-xs text-indigo-950 font-semibold mt-0.5">
                                            {licenseIp ? `Bound to IP: ${licenseIp}` : 'Server IP not attached'}
                                          </p>
                                          <p className="text-[11px] text-slate-400 mt-0.5">
                                            Command: <code className="text-indigo-600 bg-indigo-50 px-1 rounded">cldiag --check-license</code>
                                          </p>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="px-6 py-4">
                                      <div className="flex flex-col gap-1.5">
                                        <div>{getStatusBadge(account.status)}</div>
                                        {licenseIp ? (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                              {licenseIp}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => copyToClipboard(licenseIp, 'IP Address')}
                                              className="text-slate-400 hover:text-indigo-600 transition"
                                              title="Copy IP"
                                            >
                                              <Copy size={13} />
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                            <Clock size={12} /> Pending IP Submission
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    <td className="px-6 py-4">
                                      <div className="space-y-1 text-xs">
                                        <div className="font-semibold text-slate-800">
                                          {account.billingCycle === 'annually' ? 'Annual Subscription' : 'Monthly License'}
                                        </div>
                                        <div className="text-slate-500 font-medium">
                                          {account.price ? `৳${account.price.toLocaleString()}` : 'Standard Rate'}
                                        </div>
                                      </div>
                                    </td>

                                    <td className="px-6 py-4">
                                      <div className="space-y-1 text-xs">
                                        <div className="font-semibold text-slate-800">
                                          {formatExpiryDate(account.expiryDate || account.nextRenewalDate || account.createdAt)}
                                        </div>
                                        <div className="text-[11px] text-slate-500">Auto-renews</div>
                                      </div>
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => copyToClipboard('cldiag --check-license', 'Activation command')}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition shadow-2xs"
                                          title="Copy SSH Activation Command"
                                        >
                                          <Copy size={12} /> Copy Activation Command
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              if (isVps) {
                                return (
                                  <tr key={account.id} className="hover:bg-purple-50/30 transition-colors bg-purple-50/5">
                                    <td className="px-6 py-4">
                                      <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                                          <Terminal size={18} />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 text-sm">{hostname}</span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wide">
                                              Cloud VPS
                                            </span>
                                          </div>
                                          <p className="text-xs text-purple-950 font-semibold mt-0.5">
                                            {account.planId?.toUpperCase() || 'VPS'} • {vps.os || 'Ubuntu / Linux'}
                                          </p>
                                          <p className="text-[11px] text-slate-400 mt-0.5">
                                            DC: {vps.serverLocation || 'Dhaka BDIX / Global'}
                                          </p>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="px-6 py-4">
                                      <div className="flex flex-col gap-1.5">
                                        <div>{getStatusBadge(account.status)}</div>
                                        {account.serverIp ? (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                              {account.serverIp}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => copyToClipboard(account.serverIp!, 'IP Address')}
                                              className="text-slate-400 hover:text-purple-600 transition"
                                              title="Copy IP"
                                            >
                                              <Copy size={13} />
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-amber-600 font-medium flex items-center gap-1 animate-pulse">
                                            <Clock size={12} /> IP Allocation in progress...
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    <td className="px-6 py-4">
                                      <div className="space-y-1 text-xs">
                                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                          <Cpu size={13} className="text-purple-600" />
                                          <span>{vps.cores || '2 vCPU'} • {vps.ram || '4 GB RAM'}</span>
                                        </div>
                                        <div className="text-slate-500 font-medium">
                                          Disk: {vps.storage || '50 GB NVMe'}
                                        </div>
                                        <div className="text-slate-500 font-medium">
                                          Transfer: {vps.bandwidth || '2 TB Bandwidth'}
                                        </div>
                                      </div>
                                    </td>

                                    <td className="px-6 py-4">
                                      <div className="flex flex-col gap-1 text-xs text-slate-600">
                                        <span className="font-semibold text-slate-800">{account.billingCycle?.toUpperCase() || 'MONTHLY'}</span>
                                        <span className="text-slate-400">Expires: {account.expiresAt ? new Date(account.expiresAt).toLocaleDateString() : '-'}</span>
                                        <label className="relative inline-flex items-center cursor-pointer mt-1">
                                          <input 
                                            type="checkbox" 
                                            checked={!!account.autoRenew} 
                                            onChange={() => handleToggleAutoRenew('hosting', account)} 
                                            className="sr-only peer" 
                                          />
                                          <div className="w-7 h-4 bg-slate-200 peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600" />
                                          <span className="ml-2 text-[11px] font-medium text-slate-500">Auto-Renew</span>
                                        </label>
                                      </div>
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                      <div className="flex flex-col items-end gap-2">
                                        <button 
                                          onClick={() => {
                                            setSelectedVpsModal(account);
                                            setShowVpsModalPass(false);
                                          }}
                                          className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs"
                                        >
                                          <Key size={13} />
                                          Server Access
                                        </button>

                                        {account.serverIp && (
                                          <button
                                            type="button"
                                            onClick={() => copyToClipboard(`ssh root@${account.serverIp}`, 'SSH Command')}
                                            className="inline-flex items-center gap-1 text-[11px] font-mono text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded transition"
                                            title="Copy SSH Command"
                                          >
                                            <Terminal size={11} />
                                            <span>ssh root@{account.serverIp}</span>
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              // Shared / cPanel Row
                              return (
                                <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-start gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                        <Server size={18} />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900 text-sm">{account.planId || 'Standard Plan'}</span>
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                                            cPanel
                                          </span>
                                        </div>
                                        {account.domain && (
                                          <span className="text-xs text-blue-700 font-semibold block mt-0.5">
                                            {account.domain}
                                          </span>
                                        )}
                                        {account.status === 'active' && (
                                          <button 
                                            type="button"
                                            onClick={() => handleCpanelSso(account)}
                                            disabled={ssoLoading === account.id}
                                            className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer disabled:opacity-50"
                                            title="1-Click Login to cPanel without typing password"
                                          >
                                            {ssoLoading === account.id ? <Loader2 size={11} className="animate-spin text-blue-600" /> : <ExternalLink size={11} />}
                                            <span>Login to cPanel</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1.5">
                                      <div>{getStatusBadge(account.status)}</div>
                                      <span className="text-xs text-slate-500 font-mono">
                                        {account.status === 'active' && account.serverIp ? account.serverIp : 'Shared Server'}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="px-6 py-4">
                                    {usageData[account.id] ? (
                                      <div className="space-y-2 min-w-[150px]">
                                        <ProgressBar value={usageData[account.id].diskUsageMB / 1024} max={usageData[account.id].diskLimitMB / 1024} label="Disk" />
                                        <ProgressBar value={usageData[account.id].bandwidthUsageMB / 1024} max={usageData[account.id].bandwidthLimitMB / 1024} label="Bandwidth" />
                                      </div>
                                    ) : (
                                      <button 
                                        onClick={() => handleFetchUsage(account)} 
                                        disabled={usageLoading === account.id} 
                                        className="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200/80 flex items-center gap-1.5 font-semibold transition"
                                      >
                                        <RefreshCw size={12} className={usageLoading === account.id ? 'animate-spin' : ''} />
                                        {usageLoading === account.id ? 'Fetching...' : 'Check Usage'}
                                      </button>
                                    )}
                                  </td>

                                  <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1 text-xs text-slate-600">
                                      <span className="font-semibold text-slate-800">{account.billingCycle?.toUpperCase() || 'MONTHLY'}</span>
                                      <span className="text-slate-400">Expires: {account.expiresAt ? new Date(account.expiresAt).toLocaleDateString() : '-'}</span>
                                      <label className="relative inline-flex items-center cursor-pointer mt-1">
                                        <input 
                                          type="checkbox" 
                                          checked={!!account.autoRenew} 
                                          onChange={() => handleToggleAutoRenew('hosting', account)} 
                                          className="sr-only peer" 
                                        />
                                        <div className="w-7 h-4 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600" />
                                        <span className="ml-2 text-[11px] font-medium text-slate-500">Auto-Renew</span>
                                      </label>
                                    </div>
                                  </td>

                                  <td className="px-6 py-4 text-right">
                                    <button 
                                      onClick={() => setUpgradingHosting(account)} 
                                      className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition shadow-xs"
                                    >
                                      Upgrade Plan
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: BILLING & INVOICES */}
              {activeTab === 'billing' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    {/* Header & Search */}
                    <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Receipt size={18} className="text-[#0E2A47]" />
                          Billing History & Invoices ({orders.length})
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">Download official PDF receipts and track order status</p>
                      </div>

                      <div className="relative w-full sm:w-60">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search invoice #..."
                          value={billingSearch}
                          onChange={(e) => setBillingSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 transition"
                        />
                      </div>
                    </div>

                    {/* Table */}
                    {filteredOrders.length === 0 ? (
                      <div className="p-12 text-center text-slate-500 text-xs">
                        <Receipt size={24} className="mx-auto mb-2 text-slate-400" />
                        No billing history or invoices found.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3.5">Invoice No</th>
                              <th className="px-6 py-3.5">Date</th>
                              <th className="px-6 py-3.5">Total Amount</th>
                              <th className="px-6 py-3.5">Status</th>
                              <th className="px-6 py-3.5 text-right">Download Receipt</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredOrders.map(order => (
                              <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-sm text-[#0E2A47]">
                                  #{order.documentNumber || order.id.slice(0, 8).toUpperCase()}
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-medium">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                  {formatCurrency(order.total, settings as any)}
                                </td>
                                <td className="px-6 py-4">
                                  {getStatusBadge(order.status)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button 
                                    onClick={() => generateInvoice(order)} 
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-xs"
                                  >
                                    <Download size={13} /> PDF Receipt
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: SUPPORT TICKETS */}
              {activeTab === 'support' && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
                  <div className="mb-6 pb-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Ticket size={20} className="text-[#0E2A47]" /> Technical Support & Helpdesk
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Submit support requests, ask questions, or report server issues</p>
                  </div>
                  <SupportTicketsClient />
                </div>
              )}

              {/* TAB 6: AFFILIATE PROGRAM */}
              {activeTab === 'affiliate' && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
                  <div className="mb-6 pb-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Share2 size={20} className="text-amber-600" /> Affiliate & Partner Rewards
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Refer clients to Click2IT hosting & earn commissions directly into your account</p>
                  </div>
                  <UserAffiliateTab />
                </div>
              )}

            </div>
          </div>
        </div>

        {/* MODALS */}
        {managingNsDomain && (
          <NameserverModal domain={managingNsDomain as any} onClose={() => setManagingNsDomain(null)} onUpdate={() => {}} />
        )}
        {managingSecurityDomain && (
          <DomainSecurityModal
            domain={managingSecurityDomain.domain}
            onClose={() => setManagingSecurityDomain(null)}
          />
        )}
        {managingOwnershipDomain && (
          <DomainOwnershipModal
            domain={managingOwnershipDomain.domain}
            isOpen={!!managingOwnershipDomain}
            onClose={() => setManagingOwnershipDomain(null)}
          />
        )}
        {upgradingHosting && (
          <HostingUpgradeModal account={upgradingHosting as any} onClose={() => setUpgradingHosting(null)} />
        )}

        {/* VPS Credentials Modal for Client */}
        {selectedVpsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-8 border border-slate-100">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                    <Terminal size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Cloud VPS Access Details</h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {selectedVpsModal.vpsDetails?.hostname || selectedVpsModal.domain || selectedVpsModal.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedVpsModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Banner */}
              {selectedVpsModal.status === 'pending_setup' || !selectedVpsModal.serverIp ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <Clock size={16} className="shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-bold">VPS Provisioning In Progress</p>
                    <p className="mt-0.5 text-amber-700 leading-relaxed">
                      Your virtual machine is being configured in our datacenter. Once dedicated IP allocation is complete, your root credentials will be fully active.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2.5">
                  <CheckCircle size={16} className="shrink-0 text-emerald-600" />
                  <div>
                    <span className="font-bold">Server is Online & Active</span>
                    <span className="ml-2 text-emerald-700">Ready for SSH & remote management.</span>
                  </div>
                </div>
              )}

              {/* Credentials & Specifications Grid */}
              <div className="space-y-3.5">
                {/* Hostname & Specs Info Box */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Hostname:</span>
                    <p className="font-mono font-bold text-slate-900 mt-0.5 break-all">
                      {selectedVpsModal.vpsDetails?.hostname || selectedVpsModal.domain || 'vps.server'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Operating System:</span>
                    <p className="font-bold text-purple-700 mt-0.5">
                      {selectedVpsModal.vpsDetails?.os || 'Ubuntu / Linux'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Datacenter:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {selectedVpsModal.vpsDetails?.serverLocation || 'BDIX Dhaka / Global'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Hardware:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {selectedVpsModal.vpsDetails?.cores || '2 vCPU'} • {selectedVpsModal.vpsDetails?.ram || '4 GB RAM'}
                    </p>
                  </div>
                </div>

                {/* Dedicated Server IP */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Dedicated Server IP
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedVpsModal.serverIp || 'Awaiting IP Allocation'}
                      className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 font-bold outline-none"
                    />
                    {selectedVpsModal.serverIp && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedVpsModal.serverIp!, 'IP Address')}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                        title="Copy IP"
                      >
                        <Copy size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* SSH User & Root Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      User
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="root"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Root Password
                    </label>
                    <div className="relative">
                      <input
                        type={showVpsModalPass ? 'text' : 'password'}
                        readOnly
                        value={selectedVpsModal.vpsDetails?.rootPassword || '••••••••••••'}
                        className="w-full pl-3.5 pr-16 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 font-bold outline-none"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowVpsModalPass(!showVpsModalPass)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded"
                          title={showVpsModalPass ? 'Hide' : 'Show'}
                        >
                          {showVpsModalPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {selectedVpsModal.vpsDetails?.rootPassword && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedVpsModal.vpsDetails!.rootPassword!, 'Root Password')}
                            className="p-1 text-slate-400 hover:text-purple-600 rounded"
                            title="Copy Password"
                          >
                            <Copy size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SSH Quick Command Box */}
                {selectedVpsModal.serverIp && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      SSH Connect Command
                    </label>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Terminal size={14} className="text-emerald-400 shrink-0" />
                        <span className="font-mono text-xs select-all truncate text-emerald-300">
                          ssh root@{selectedVpsModal.serverIp}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`ssh root@${selectedVpsModal.serverIp}`, 'SSH Command')}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-emerald-400 font-bold rounded-lg transition shrink-0 flex items-center gap-1"
                      >
                        <Copy size={12} />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SSH Key if submitted */}
                {selectedVpsModal.vpsDetails?.sshKey && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Your SSH Public Key
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-mono text-slate-700 break-all max-h-20 overflow-y-auto select-all">
                      {selectedVpsModal.vpsDetails.sshKey}
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedVpsModal(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
