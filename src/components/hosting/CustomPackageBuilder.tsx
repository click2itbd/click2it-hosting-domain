import React, { useState, useEffect, useMemo } from 'react';
import { 
  Server, Cpu, HardDrive, Wifi, Globe, Shield, Terminal, Zap, Check, Plus, Minus,
  Sparkles, Layers, Sliders, ArrowRight, DollarSign, Wallet, ShoppingCart, RefreshCw,
  Info, CheckCircle2, AlertCircle, Copy, User, Lock, Mail, Database
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { 
  loadPricingScales, 
  calculateVpsPrice, 
  calculateCpanelPrice, 
  VpsCustomSpecs, 
  CpanelCustomSpecs, 
  PackagePricingScales, 
  DEFAULT_PRICING_SCALES 
} from '../../services/packageCostEngine';

interface CustomPackageBuilderProps {
  initialType?: 'vps' | 'cpanel';
  targetUser?: {
    id: string;
    uid?: string;
    name?: string;
    displayName?: string;
    email?: string;
    balance?: number;
  } | null;
  isAdminMode?: boolean;
  onPackageCreated?: (newPackage: any) => void;
  className?: string;
}

export const CustomPackageBuilder: React.FC<CustomPackageBuilderProps> = ({
  initialType = 'vps',
  targetUser = null,
  isAdminMode = false,
  onPackageCreated,
  className = ''
}) => {
  const { user, isAdmin } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [activeType, setActiveType] = useState<'vps' | 'cpanel'>(initialType);
  const [pricingScales, setPricingScales] = useState<PackagePricingScales>(DEFAULT_PRICING_SCALES);
  const [loadingScales, setLoadingScales] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Selected User for Admin Assignment
  const [assignedUser, setAssignedUser] = useState<any>(targetUser || null);

  // Custom Package Name Override
  const [customPackageName, setCustomPackageName] = useState<string>('');

  // VPS Specs State
  const [vpsSpecs, setVpsSpecs] = useState<VpsCustomSpecs>({
    cores: 4,
    ramGb: 8,
    storageGb: 100,
    bandwidthTb: 5,
    ips: 1,
    os: 'ubuntu',
    controlPanel: 'cpanel_solo',
    backup: 'weekly',
    ddos: 'standard',
    location: 'bd_dhaka',
    supportLevel: 'unmanaged',
    billingCycle: 'monthly'
  });

  // cPanel Specs State
  const [cpanelSpecs, setCpanelSpecs] = useState<CpanelCustomSpecs>({
    diskGb: 10,
    bandwidthGb: 100,
    cpuCores: 2,
    ramGb: 2,
    websites: 2,
    emails: 15,
    databases: 5,
    litespeed: true,
    cloudlinux: true,
    imunify360: false,
    dedicatedIp: false,
    acronisBackup: false,
    billingCycle: 'annually'
  });

  // Load Admin Pricing Scales
  useEffect(() => {
    let mounted = true;
    loadPricingScales().then(scales => {
      if (mounted) {
        setPricingScales(scales);
        setLoadingScales(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Sync assignedUser if targetUser prop changes
  useEffect(() => {
    if (targetUser) {
      setAssignedUser(targetUser);
    }
  }, [targetUser]);

  // Price Calculations
  const vpsPriceResult = useMemo(() => {
    return calculateVpsPrice(vpsSpecs, pricingScales);
  }, [vpsSpecs, pricingScales]);

  const cpanelPriceResult = useMemo(() => {
    return calculateCpanelPrice(cpanelSpecs, pricingScales);
  }, [cpanelSpecs, pricingScales]);

  const currentResult = activeType === 'vps' ? vpsPriceResult : cpanelPriceResult;

  // OS List Options
  const osList = [
    { id: 'ubuntu', name: 'Ubuntu 22.04 LTS', icon: '🐧', tag: 'Linux / Docker' },
    { id: 'almalinux', name: 'AlmaLinux 9', icon: '⚡', tag: 'cPanel Ready' },
    { id: 'debian', name: 'Debian 12 Bookworm', icon: '🌀', tag: 'Ultra Stable' },
    { id: 'rocky', name: 'Rocky Linux 9', icon: '🪨', tag: 'RHEL Enterprise' },
    { id: 'windows2022', name: 'Windows Server 2022', icon: '🪟', tag: '+৳1,400/mo' },
  ];

  // Control Panel Options
  const cpList = [
    { id: 'none', name: 'None (Root SSH)', tag: 'Free', fee: 0 },
    { id: 'cpanel_solo', name: 'cPanel Solo (1 Account)', tag: '+৳1,750/mo', fee: 1750 },
    { id: 'cpanel_admin', name: 'cPanel Admin (5 Accounts)', tag: '+৳2,650/mo', fee: 2650 },
    { id: 'cpanel_pro', name: 'cPanel Pro (30 Accounts)', tag: '+৳3,600/mo', fee: 3600 },
    { id: 'cpanel_premier', name: 'cPanel Premier (100 Accounts)', tag: '+৳4,800/mo', fee: 4800 },
    { id: 'plesk_webadmin', name: 'Plesk Web Admin (10 Domains)', tag: '+৳1,100/mo', fee: 1100 },
    { id: 'cyberpanel', name: 'CyberPanel OpenLiteSpeed', tag: 'Free', fee: 0 },
    { id: 'directadmin', name: 'DirectAdmin Standard', tag: '+৳800/mo', fee: 800 },
  ];

  // Locations
  const locationList = [
    { id: 'bd_dhaka', name: 'Dhaka, Bangladesh (BDIX Peering)', flag: '🇧🇩', sub: 'Low Latency 1ms' },
    { id: 'sg_singapore', name: 'Singapore (Equinix APAC)', flag: '🇸🇬', sub: '+৳180/mo' },
    { id: 'de_frankfurt', name: 'Frankfurt, Germany (EU Hub)', flag: '🇩🇪', sub: '+৳150/mo' },
    { id: 'us_east', name: 'New York, USA (Global Backbone)', flag: '🇺🇸', sub: '+৳120/mo' },
  ];

  // Handle Add To Cart (Customer Mode)
  const handleAddToCart = () => {
    const isVps = activeType === 'vps';
    const selectedOsObj = osList.find(o => o.id === vpsSpecs.os);
    const selectedCpObj = cpList.find(c => c.id === vpsSpecs.controlPanel);
    const selectedLocObj = locationList.find(l => l.id === vpsSpecs.location);

    const name = customPackageName || (isVps 
      ? `Custom KVM VPS (${vpsSpecs.cores} vCPU, ${vpsSpecs.ramGb}GB RAM, ${vpsSpecs.storageGb}GB NVMe)`
      : `Custom Cloud cPanel Plan (${cpanelSpecs.diskGb}GB NVMe, ${cpanelSpecs.cpuCores || 2} Core, ${cpanelSpecs.ramGb || 2}GB RAM)`
    );

    const description = isVps
      ? `${vpsSpecs.cores} vCPU Cores • ${vpsSpecs.ramGb}GB DDR4 RAM • ${vpsSpecs.storageGb}GB NVMe Storage • ${vpsSpecs.bandwidthTb}TB Bandwidth • ${vpsSpecs.ips} IPv4 • OS: ${selectedOsObj?.name || vpsSpecs.os} • Panel: ${selectedCpObj?.name || vpsSpecs.controlPanel} • Location: ${selectedLocObj?.name || vpsSpecs.location}`
      : `${cpanelSpecs.diskGb}GB NVMe SSD • ${cpanelSpecs.cpuCores || 2} vCPU Cores • ${cpanelSpecs.ramGb || 2}GB RAM • ${cpanelSpecs.bandwidthGb}GB Bandwidth • ${cpanelSpecs.websites} Website(s) • ${cpanelSpecs.emails} Emails • ${cpanelSpecs.databases} MySQL DBs`;

    const cycle = currentResult.billingCycle;
    const mappedBillingCycle = cycle === 'annually' ? 'yearly' : cycle;

    const cartItem = {
      id: `custom_${activeType}_${Date.now()}`,
      name,
      description,
      details: isVps
        ? {
            cores: `${vpsSpecs.cores} vCPU`,
            ram: `${vpsSpecs.ramGb} GB DDR4`,
            storage: `${vpsSpecs.storageGb} GB NVMe`,
            bandwidth: `${vpsSpecs.bandwidthTb} TB`,
            ipv4: `${vpsSpecs.ips} Dedicated IPv4`,
            os: selectedOsObj?.name || 'Ubuntu 22.04 LTS',
            controlPanel: selectedCpObj?.name || 'None (Root SSH)',
            serverLocation: selectedLocObj?.name || 'Dhaka, Bangladesh (BDIX Peering)'
          }
        : {
            disk: `${cpanelSpecs.diskGb} GB Pure NVMe SSD`,
            websites: `${cpanelSpecs.websites} Website(s)`,
            cpu: `${cpanelSpecs.cpuCores || 2} vCPU Core(s)`,
            ram: `${cpanelSpecs.ramGb || 2} GB DDR4 RAM`,
            bandwidth: `${cpanelSpecs.bandwidthGb} GB Bandwidth`,
            email: `${cpanelSpecs.emails} Email Accounts`,
            databases: `${cpanelSpecs.databases} MySQL Databases`,
            addons: [
              cpanelSpecs.litespeed ? 'LiteSpeed Enterprise' : null,
              cpanelSpecs.cloudlinux ? 'CloudLinux LVE' : null,
              cpanelSpecs.imunify360 ? 'Imunify360 Security' : null,
              cpanelSpecs.acronisBackup ? 'Acronis Daily Backup' : null,
              cpanelSpecs.dedicatedIp ? 'Dedicated IPv4' : null,
            ].filter(Boolean).join(', ')
          },
      price: currentResult.totalPrice,
      monthlyPrice: currentResult.monthlyRate,
      baseMonthlyPrice: currentResult.monthlyRate,
      billingCycle: mappedBillingCycle,
      termYears: cycle === 'annually' ? 1 : 0,
      planSlug: isVps ? 'custom-vps' : 'custom-package',
      itemType: isVps ? 'vps' : 'hosting',
      category: 'Hosting & Domains',
      isCustomPackage: true,
      customSpecs: isVps ? vpsSpecs : cpanelSpecs,
      priceBreakdown: currentResult.breakdown,
      quantity: 1,
      image: '/logo.png'
    };

    addToCart(cartItem as any);
    toast.success(`Custom ${isVps ? 'KVM VPS' : 'Cloud Hosting'} package added to cart!`);
    navigate('/hosting/cart');
  };

  // Handle Admin Direct Add & Assign Package to User
  const handleAdminAddPackageForUser = async () => {
    if (!assignedUser) {
      toast.error('Please specify which customer to assign this custom package to.');
      return;
    }

    setSubmitting(true);
    const isVps = activeType === 'vps';
    const targetUid = assignedUser.id || assignedUser.uid;
    const customerEmail = assignedUser.email || '';
    const customerName = assignedUser.displayName || assignedUser.name || 'Customer';

    const defaultTitle = isVps
      ? `Custom VPS (${vpsSpecs.cores} vCPU / ${vpsSpecs.ramGb}GB RAM)`
      : `Custom cPanel Hosting (${cpanelSpecs.diskGb}GB NVMe)`;

    const packageName = customPackageName.trim() || `${defaultTitle} - ${customerName}`;

    const packageRecord = {
      id: `custom_pkg_${Date.now()}`,
      userId: targetUid,
      customerEmail,
      customerName,
      name: packageName,
      title: packageName,
      type: isVps ? 'vps' : 'cpanel',
      category: isVps ? 'vps' : 'shared',
      status: 'active',
      isCustomPackage: true,
      specs: isVps ? vpsSpecs : cpanelSpecs,
      pricing: {
        monthly: currentResult.monthlyRate,
        total: currentResult.totalPrice,
        billingCycle: currentResult.billingCycle,
        discountPercent: currentResult.discountPercent,
      },
      priceBreakdown: currentResult.breakdown,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedByAdmin: user?.email || 'admin',
    };

    try {
      // 1. Save to hostingPlans (custom plan tier)
      await setDoc(doc(db, 'hostingPlans', packageRecord.id), packageRecord);

      // 2. Also register in orders so it shows in customer billing & services
      const orderRef = doc(collection(db, 'orders'));
      await setDoc(orderRef, {
        id: orderRef.id,
        userId: targetUid,
        customerEmail,
        customerName,
        total: currentResult.totalPrice,
        status: 'pending',
        paymentStatus: 'pending',
        items: [{
          id: packageRecord.id,
          name: packageName,
          price: currentResult.totalPrice,
          monthlyPrice: currentResult.monthlyRate,
          billingCycle: currentResult.billingCycle,
          category: isVps ? 'VPS' : 'Hosting & Domains',
          itemType: isVps ? 'vps' : 'hosting',
          isCustomPackage: true,
          specs: isVps ? vpsSpecs : cpanelSpecs
        }],
        notes: `Custom auto-scaled ${activeType.toUpperCase()} package configured by Admin for ${customerName}`,
        createdAt: new Date().toISOString()
      });

      toast.success(`Successfully created & assigned custom package for ${customerName}!`);
      if (onPackageCreated) {
        onPackageCreated(packageRecord);
      }
    } catch (err: any) {
      console.error('Failed to create custom package for user:', err);
      toast.error(err.message || 'Failed to save package for user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden font-sans", className)}>
      
      {/* Top Header / Mode Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2 border border-blue-400/30">
              <Sparkles size={14} className="text-cyan-400" /> Auto-Scaling Package Configurator
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Custom VPS & cPanel Package Builder
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-medium">
              Configure every computing, storage, networking, licensing, and security option. Prices auto-calculate in real time based on active cost scales.
            </p>
          </div>

          {/* Builder Type Toggle */}
          <div className="flex items-center bg-slate-950/70 p-1.5 rounded-2xl border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setActiveType('vps')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all",
                activeType === 'vps' 
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Server size={15} /> Custom KVM VPS
            </button>
            <button
              type="button"
              onClick={() => setActiveType('cpanel')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all",
                activeType === 'cpanel' 
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-105" 
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Zap size={15} /> Custom cPanel Hosting
            </button>
          </div>
        </div>

        {/* Admin Assignment Target Indicator */}
        {isAdminMode && (
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                <User size={18} />
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 block">
                  Admin Target Customer Mode
                </span>
                <span className="text-sm font-bold text-white">
                  {assignedUser ? `${assignedUser.displayName || assignedUser.name || 'Customer'} (${assignedUser.email})` : 'No customer selected'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Optional custom package title"
                value={customPackageName}
                onChange={e => setCustomPackageName(e.target.value)}
                className="bg-slate-900 border border-white/20 text-xs text-white px-3.5 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 w-64 font-medium"
              />
              <button
                type="button"
                onClick={handleAdminAddPackageForUser}
                disabled={submitting || !assignedUser}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                Add Package for User
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Controls on Left, Sticky Real-Time Price Matrix on Right */}
      <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ================= LEFT CONTROLS (8 COLS) ================= */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* SECTION 1: VPS BUILDER */}
          {activeType === 'vps' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* Computing Core Specs Sliders */}
              <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-200 space-y-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Cpu size={16} className="text-blue-600" /> 1. Dedicated Compute & Storage Resources
                </h3>

                {/* CPU Cores */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Cpu size={14} className="text-indigo-600" /> vCPU Dedicated Cores
                    </span>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-900 rounded-lg font-mono font-black text-sm">
                      {vpsSpecs.cores} vCPU {vpsSpecs.cores > 1 ? 'Cores' : 'Core'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="32"
                    step="1"
                    value={vpsSpecs.cores}
                    onChange={e => setVpsSpecs({ ...vpsSpecs, cores: parseInt(e.target.value) || 1 })}
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>1 Core</span>
                    <span>4 Cores</span>
                    <span>8 Cores</span>
                    <span>16 Cores</span>
                    <span>32 Cores</span>
                  </div>
                </div>

                {/* RAM Memory */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Zap size={14} className="text-blue-600" /> RAM Memory (DDR4 / DDR5 ECC)
                    </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-lg font-mono font-black text-sm">
                      {vpsSpecs.ramGb} GB RAM
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="128"
                    step="1"
                    value={vpsSpecs.ramGb}
                    onChange={e => setVpsSpecs({ ...vpsSpecs, ramGb: parseInt(e.target.value) || 1 })}
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>1 GB</span>
                    <span>8 GB</span>
                    <span>16 GB</span>
                    <span>32 GB</span>
                    <span>64 GB</span>
                    <span>128 GB</span>
                  </div>
                </div>

                {/* NVMe Storage */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <HardDrive size={14} className="text-emerald-600" /> Pure NVMe PCIe Gen4 Storage
                    </span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-lg font-mono font-black text-sm">
                      {vpsSpecs.storageGb} GB NVMe
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="1000"
                    step="10"
                    value={vpsSpecs.storageGb}
                    onChange={e => setVpsSpecs({ ...vpsSpecs, storageGb: parseInt(e.target.value) || 20 })}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>20 GB</span>
                    <span>100 GB</span>
                    <span>250 GB</span>
                    <span>500 GB</span>
                    <span>1000 GB (1TB)</span>
                  </div>
                </div>

                {/* Bandwidth & IPs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1"><Wifi size={13} className="text-cyan-600" /> Uplink Bandwidth</span>
                      <span className="text-blue-700 font-mono font-bold">{vpsSpecs.bandwidthTb} TB / mo</span>
                    </label>
                    <select
                      value={vpsSpecs.bandwidthTb}
                      onChange={e => setVpsSpecs({ ...vpsSpecs, bandwidthTb: parseInt(e.target.value) || 1 })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="1">1 TB Premium Traffic</option>
                      <option value="2">2 TB Premium Traffic</option>
                      <option value="5">5 TB Premium Traffic</option>
                      <option value="10">10 TB High-Volume Bandwidth</option>
                      <option value="20">20 TB Enterprise Bandwidth</option>
                      <option value="50">50 TB Ultra Bandwidth</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1"><Globe size={13} className="text-blue-600" /> Dedicated IPv4 Addresses</span>
                      <span className="text-blue-700 font-mono font-bold">{vpsSpecs.ips} Dedicated IP</span>
                    </label>
                    <select
                      value={vpsSpecs.ips}
                      onChange={e => setVpsSpecs({ ...vpsSpecs, ips: parseInt(e.target.value) || 1 })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="1">1 Dedicated IPv4 (Included)</option>
                      <option value="2">2 Dedicated IPv4 (+1 Additional)</option>
                      <option value="4">4 Dedicated IPv4 Subnet</option>
                      <option value="8">8 Dedicated IPv4 Subnet</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Operating System & Control Panel */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Terminal size={16} className="text-purple-600" /> 2. Operating System & Control Panel
                </h3>

                {/* OS Selector Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {osList.map(os => {
                    const isSelected = vpsSpecs.os === os.id;
                    return (
                      <button
                        key={os.id}
                        type="button"
                        onClick={() => setVpsSpecs({ ...vpsSpecs, os: os.id })}
                        className={cn(
                          "p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between",
                          isSelected 
                            ? "border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-500/20" 
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        )}
                      >
                        <div className="text-2xl mb-1">{os.icon}</div>
                        <div className="font-extrabold text-xs text-slate-900 leading-tight">{os.name}</div>
                        <div className="text-[10px] text-slate-500 font-medium mt-1">{os.tag}</div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Control Panel Dropdown / Selection */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Management Control Panel (Auto-Installed & Activated)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {cpList.map(cp => {
                      const isSelected = vpsSpecs.controlPanel === cp.id;
                      return (
                        <button
                          key={cp.id}
                          type="button"
                          onClick={() => setVpsSpecs({ ...vpsSpecs, controlPanel: cp.id })}
                          className={cn(
                            "p-3 rounded-2xl border text-left transition-all relative",
                            isSelected 
                              ? "border-indigo-600 bg-indigo-50/60 shadow-md ring-2 ring-indigo-500/20" 
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          )}
                        >
                          <div className="font-bold text-xs text-slate-900">{cp.name}</div>
                          <div className="text-[11px] font-mono font-bold text-indigo-700 mt-0.5">{cp.tag}</div>
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Data Center Location & Add-ons */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Globe size={16} className="text-emerald-600" /> 3. Data Center Location & Disaster Recovery
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {locationList.map(loc => {
                    const isSelected = vpsSpecs.location === loc.id;
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => setVpsSpecs({ ...vpsSpecs, location: loc.id })}
                        className={cn(
                          "p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between",
                          isSelected 
                            ? "border-emerald-600 bg-emerald-50/60 shadow-md ring-2 ring-emerald-500/20" 
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{loc.flag}</span>
                          <span className="font-extrabold text-xs text-slate-900">{loc.name}</span>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-bold">{loc.sub}</span>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Backups & DDoS Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Cloud Backups</label>
                    <select
                      value={vpsSpecs.backup}
                      onChange={e => setVpsSpecs({ ...vpsSpecs, backup: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="none">No Automated Backups (Manual)</option>
                      <option value="weekly">Weekly Cloud Snapshots (+৳350/mo)</option>
                      <option value="daily_cloud">Daily Offsite Cloud Backups (+৳650/mo)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">DDoS Mitigation</label>
                    <select
                      value={vpsSpecs.ddos}
                      onChange={e => setVpsSpecs({ ...vpsSpecs, ddos: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="standard">Standard Anti-DDoS (Free)</option>
                      <option value="advanced_1tbps">Advanced 1Tbps+ Mitigation (+৳450/mo)</option>
                      <option value="enterprise_3tbps">Enterprise 3Tbps Multi-Layer (+৳1,200/mo)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Support & Administration</label>
                    <select
                      value={vpsSpecs.supportLevel}
                      onChange={e => setVpsSpecs({ ...vpsSpecs, supportLevel: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="unmanaged">Unmanaged / Self-Managed (Free)</option>
                      <option value="basic">Basic Managed Support (+৳450/mo)</option>
                      <option value="managed_vip">24/7 Fully Managed VIP (+৳1,500/mo)</option>
                    </select>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* SECTION 2: CPANEL WEB HOSTING BUILDER */}
          {activeType === 'cpanel' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* cPanel Core Capacity Sliders */}
              <div className="bg-slate-50/70 p-6 rounded-3xl border border-slate-200 space-y-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={16} className="text-emerald-600" /> 1. cPanel Web Space & Quota Limits
                </h3>

                {/* Disk Space */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <HardDrive size={14} className="text-emerald-600" /> NVMe SSD Web Disk Space
                    </span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-lg font-mono font-black text-sm">
                      {cpanelSpecs.diskGb} GB NVMe
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={cpanelSpecs.diskGb}
                    onChange={e => setCpanelSpecs({ ...cpanelSpecs, diskGb: parseInt(e.target.value) || 1 })}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>1 GB</span>
                    <span>10 GB</span>
                    <span>25 GB</span>
                    <span>50 GB</span>
                    <span>100 GB</span>
                  </div>
                </div>

                {/* Monthly Traffic */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Wifi size={14} className="text-blue-600" /> Monthly Data Transfer Bandwidth
                    </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-lg font-mono font-black text-sm">
                      {cpanelSpecs.bandwidthGb} GB Bandwidth
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={cpanelSpecs.bandwidthGb}
                    onChange={e => setCpanelSpecs({ ...cpanelSpecs, bandwidthGb: parseInt(e.target.value) || 10 })}
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>10 GB</span>
                    <span>100 GB</span>
                    <span>250 GB</span>
                    <span>500 GB</span>
                    <span>1000 GB (1TB)</span>
                  </div>
                </div>

                {/* CPU & RAM Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Cpu size={14} className="text-purple-600" /> CPU Processing Power
                      </span>
                      <span className="px-2.5 py-0.5 bg-purple-100 text-purple-900 rounded-lg font-mono font-black text-xs">
                        {cpanelSpecs.cpuCores || 2} Core{(cpanelSpecs.cpuCores || 2) > 1 ? 's' : ''} ({(cpanelSpecs.cpuCores || 2) * 100}%)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      step="1"
                      value={cpanelSpecs.cpuCores || 2}
                      onChange={e => setCpanelSpecs({ ...cpanelSpecs, cpuCores: parseInt(e.target.value) || 1 })}
                      className="w-full accent-purple-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>1 Core</span>
                      <span>4 Cores</span>
                      <span>8 Cores</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Zap size={14} className="text-amber-600" /> Physical RAM Memory
                      </span>
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-lg font-mono font-black text-xs">
                        {cpanelSpecs.ramGb || 2} GB DDR4 RAM
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="16"
                      step="1"
                      value={cpanelSpecs.ramGb || 2}
                      onChange={e => setCpanelSpecs({ ...cpanelSpecs, ramGb: parseInt(e.target.value) || 1 })}
                      className="w-full accent-amber-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>1 GB</span>
                      <span>8 GB</span>
                      <span>16 GB</span>
                    </div>
                  </div>
                </div>

                {/* Websites, Inboxes, Databases */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex justify-between">
                      <span>Hosted Websites</span>
                      <span className="text-emerald-700 font-mono">{cpanelSpecs.websites} Domains</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={cpanelSpecs.websites}
                      onChange={e => setCpanelSpecs({ ...cpanelSpecs, websites: parseInt(e.target.value) || 1 })}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex justify-between">
                      <span>Email Inboxes</span>
                      <span className="text-blue-700 font-mono">{cpanelSpecs.emails} Inboxes</span>
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={cpanelSpecs.emails}
                      onChange={e => setCpanelSpecs({ ...cpanelSpecs, emails: parseInt(e.target.value) || 5 })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex justify-between">
                      <span>MySQL Databases</span>
                      <span className="text-purple-700 font-mono">{cpanelSpecs.databases} DBs</span>
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={cpanelSpecs.databases}
                      onChange={e => setCpanelSpecs({ ...cpanelSpecs, databases: parseInt(e.target.value) || 5 })}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>
                </div>

              </div>

              {/* cPanel Enterprise Add-ons Toggles */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Shield size={16} className="text-blue-600" /> 2. Enterprise Add-ons & Performance Features
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* LiteSpeed Web Server */}
                  <label className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3",
                    cpanelSpecs.litespeed ? "border-emerald-500 bg-emerald-50/50" : "border-slate-200 bg-white"
                  )}>
                    <input
                      type="checkbox"
                      checked={cpanelSpecs.litespeed}
                      onChange={e => setCpanelSpecs({ ...cpanelSpecs, litespeed: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                        <Zap size={14} className="text-amber-500" /> LiteSpeed Web Server + LSCache
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Up to 84x faster TTFB with native HTTP/3 & QUIC protocol support.
                      </p>
                    </div>
                  </label>

                  {/* CloudLinux OS Isolation */}
                  <label className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3",
                    cpanelSpecs.cloudlinux ? "border-blue-500 bg-blue-50/50" : "border-slate-200 bg-white"
                  )}>
                    <input
                      type="checkbox"
                      checked={cpanelSpecs.cloudlinux}
                      onChange={e => setCpanelSpecs({ ...cpanelSpecs, cloudlinux: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                        <Shield size={14} className="text-blue-500" /> CloudLinux OS LVE Isolation
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Guaranteed 100% CPU, 2GB physical memory and isolated CageFS file system.
                      </p>
                    </div>
                  </label>

                  {/* Imunify360 Anti-Malware */}
                  <label className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3",
                    cpanelSpecs.imunify360 ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 bg-white"
                  )}>
                    <input
                      type="checkbox"
                      checked={cpanelSpecs.imunify360}
                      onChange={e => setCpanelSpecs({ ...cpanelSpecs, imunify360: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                        <Lock size={14} className="text-indigo-500" /> Imunify360 Proactive Defense
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Real-time AI malware scanning, WAF ruleset, and automated cleanup.
                      </p>
                    </div>
                  </label>

                  {/* Dedicated Static IP */}
                  <label className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3",
                    cpanelSpecs.dedicatedIp ? "border-purple-500 bg-purple-50/50" : "border-slate-200 bg-white"
                  )}>
                    <input
                      type="checkbox"
                      checked={cpanelSpecs.dedicatedIp}
                      onChange={e => setCpanelSpecs({ ...cpanelSpecs, dedicatedIp: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                        <Globe size={14} className="text-purple-500" /> Dedicated Static IPv4
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Isolate email sender reputation from shared pool.
                      </p>
                    </div>
                  </label>

                  {/* Acronis Backups */}
                  <label className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 sm:col-span-2",
                    cpanelSpecs.acronisBackup ? "border-emerald-500 bg-emerald-50/50" : "border-slate-200 bg-white"
                  )}>
                    <input
                      type="checkbox"
                      checked={cpanelSpecs.acronisBackup}
                      onChange={e => setCpanelSpecs({ ...cpanelSpecs, acronisBackup: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                        <Database size={14} className="text-emerald-500" /> Acronis Daily Offsite Cloud Backups
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Automated disaster recovery point-in-time restore right from cPanel interface.
                      </p>
                    </div>
                  </label>

                </div>
              </div>

            </div>
          )}

        </div>

        {/* ================= RIGHT STICKY COST MATRIX CARD (4 COLS) ================= */}
        <div className="lg:col-span-4 sticky top-6 space-y-6">
          <div className="bg-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-2xl border border-slate-800 space-y-6 relative overflow-hidden">
            
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* Billing Cycle Switcher */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                Select Billing Cycle
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    if (activeType === 'vps') setVpsSpecs({ ...vpsSpecs, billingCycle: 'monthly' });
                    else setCpanelSpecs({ ...cpanelSpecs, billingCycle: 'monthly' });
                  }}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-center transition-all",
                    currentResult.billingCycle === 'monthly'
                      ? "bg-blue-600 text-white border-blue-500 shadow-md"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750"
                  )}
                >
                  Monthly
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (activeType === 'vps') setVpsSpecs({ ...vpsSpecs, billingCycle: 'semi-annually' });
                    else setCpanelSpecs({ ...cpanelSpecs, billingCycle: 'semi-annually' });
                  }}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-center transition-all relative",
                    currentResult.billingCycle === 'semi-annually'
                      ? "bg-blue-600 text-white border-blue-500 shadow-md"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750"
                  )}
                >
                  6 Months
                  <span className="text-[9px] bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded font-black ml-1">10% OFF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (activeType === 'vps') setVpsSpecs({ ...vpsSpecs, billingCycle: 'annually' });
                    else setCpanelSpecs({ ...cpanelSpecs, billingCycle: 'annually' });
                  }}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-center transition-all col-span-2 relative",
                    currentResult.billingCycle === 'annually'
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/40"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750"
                  )}
                >
                  12 Months (Annual - Recommended)
                  <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-black ml-2 shadow-xs">20% OFF</span>
                </button>
              </div>
            </div>

            {/* Total Auto-Calculated Price Display */}
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Calculated Rate:</span>
                <span className="font-mono">৳{currentResult.monthlyRate.toLocaleString()} / month</span>
              </div>

              {currentResult.discountPercent > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-400 font-bold">
                  <span>Discount Applied ({currentResult.discountPercent}%):</span>
                  <span className="font-mono">-৳{currentResult.discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="border-t border-white/10 pt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-white tracking-tight">
                    ৳{currentResult.totalPrice.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-medium ml-1">
                    / {currentResult.billingCycle}
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-lg text-[10px] font-black uppercase">
                  BDIX Ready
                </span>
              </div>
            </div>

            {/* Itemized Specification Breakdown */}
            <div className="space-y-2 text-xs">
              <span className="font-black text-slate-300 uppercase tracking-wider block text-[10px]">
                Specification Cost Scale Breakdown
              </span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin text-slate-300 font-medium text-[11px]">
                {currentResult.breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="truncate pr-2">{item.item}</span>
                    <span className="font-mono font-bold text-slate-200 shrink-0">৳{item.cost}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {isAdminMode ? (
                <button
                  type="button"
                  onClick={handleAdminAddPackageForUser}
                  disabled={submitting || !assignedUser}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black py-3.5 rounded-2xl shadow-xl shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Add Package for This Customer
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3.5 rounded-2xl shadow-xl shadow-blue-900/40 transition-all flex items-center justify-center gap-2 text-sm hover:scale-[1.02]"
                  >
                    <ShoppingCart size={16} /> Deploy & Add to Cart
                  </button>

                  <p className="text-[11px] text-center text-slate-400">
                    Instant provisioning • Pay via bKash, Card or Wallet Balance
                  </p>
                </>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
