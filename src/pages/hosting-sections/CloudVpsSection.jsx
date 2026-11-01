import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Cpu,
  HardDrive,
  Check,
  ArrowRight,
  Server,
  Globe,
  ShieldCheck,
  LayoutGrid,
  List,
  Network
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

const OsLogo = ({ id, className = 'w-6 h-6' }) => {
  switch (id) {
    case 'ubuntu':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="10" fill="#E95420" />
          <circle cx="12" cy="12" r="4.3" stroke="white" strokeWidth="1.6" />
          <circle cx="6.2" cy="12" r="1.4" fill="#E95420" stroke="white" strokeWidth="1.3" />
          <circle cx="14.9" cy="7.1" r="1.4" fill="#E95420" stroke="white" strokeWidth="1.3" />
          <circle cx="14.9" cy="16.9" r="1.4" fill="#E95420" stroke="white" strokeWidth="1.3" />
        </svg>
      );
    case 'debian':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#A81D33" />
          <path
            d="M13.8 6.5C10.5 6.2 7.8 8.6 7.8 11.9C7.8 15.1 10.4 17.5 13.5 17.5C15.1 17.5 16.4 16.9 17.2 15.9C16.2 16.4 14.9 16.5 13.7 16.1C11.4 15.3 10.2 12.9 10.9 10.7C11.5 9.1 13.2 8.2 14.8 8.7C15.8 9.1 16.4 10.1 16.2 11.2C16 12.2 15 12.8 14 12.6C13.3 12.4 12.9 11.7 13.1 11C13.2 10.6 13.6 10.3 14 10.3"
            stroke="white"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'almalinux':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#0F4266" />
          <path
            d="M12 6L17 16.5H14.5L13.4 14H10.6L9.5 16.5H7L12 6ZM12 9.5L11.1 12H12.9L12 9.5Z"
            fill="#38BDF8"
          />
        </svg>
      );
    case 'windows':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#0078D4" />
          <rect x="6.5" y="6.5" width="5" height="5" rx="0.6" fill="white" />
          <rect x="12.5" y="6.5" width="5" height="5" rx="0.6" fill="white" />
          <rect x="6.5" y="12.5" width="5" height="5" rx="0.6" fill="white" />
          <rect x="12.5" y="12.5" width="5" height="5" rx="0.6" fill="white" />
        </svg>
      );
    default:
      return <Server className={className} />;
  }
};

const OS_OPTIONS = [
  {
    id: 'ubuntu',
    name: 'Ubuntu LTS',
    version: '22.04 / 24.04 LTS',
    fullName: 'Ubuntu 22.04 LTS',
    type: 'Linux x86_64',
    tag: 'Docker, Node.js & Python Ready',
    accessType: 'Full Root SSH Access'
  },
  {
    id: 'debian',
    name: 'Debian Linux',
    version: '12 Bookworm',
    fullName: 'Debian 12 Bookworm',
    type: 'Linux x86_64',
    tag: 'Minimal Footprint & High Stability',
    accessType: 'Full Root SSH Access'
  },
  {
    id: 'almalinux',
    name: 'AlmaLinux OS',
    version: '9.4 Enterprise',
    fullName: 'AlmaLinux 9',
    type: 'RHEL Compatible',
    tag: 'Recommended for cPanel / CyberPanel',
    accessType: 'Full Root SSH Access'
  },
  {
    id: 'windows',
    name: 'Windows Server',
    version: '2022 Datacenter',
    fullName: 'Windows Server 2022',
    type: 'Windows x64',
    tag: 'Remote Desktop (RDP) & IIS Stack',
    accessType: 'Administrator RDP Access'
  }
];

const CANONICAL_VPS_PLANS = [
  {
    id: 'vps_starter',
    name: 'Cloud VPS 1',
    code: 'c2i.kvm.2c4g',
    cores: '2 vCPU Cores',
    ram: '4 GB DDR4 ECC',
    storage: '60 GB NVMe',
    bandwidth: '2 TB Traffic',
    ipv4: '1 Dedicated IPv4',
    monthlyPrice: 1800,
    popular: false,
    badge: 'Entry Compute',
    features: [
      'Hardware RAID-10 Gen4 NVMe',
      '1 Dedicated Public IPv4',
      '1 Gbps Uplink + BDIX Peering',
      'KVM Kernel Isolation',
      'Automated Weekly Backups',
      'HTML5 VNC Console Access'
    ]
  },
  {
    id: 'vps_standard',
    name: 'Cloud VPS 2',
    code: 'c2i.kvm.4c8g',
    cores: '4 vCPU Cores',
    ram: '8 GB DDR4 ECC',
    storage: '120 GB NVMe',
    bandwidth: '5 TB Traffic',
    ipv4: '1 Dedicated IPv4',
    monthlyPrice: 3500,
    popular: true,
    badge: 'Most Deployed',
    features: [
      'Hardware RAID-10 Gen4 NVMe',
      '1 Dedicated Public IPv4',
      '10 Gbps BDIX + 1 Gbps Global',
      'KVM Kernel Isolation',
      'Automated Daily Snapshots',
      '1-Click OS Reinstall Anytime',
      'Priority Engineering Support'
    ]
  },
  {
    id: 'vps_pro',
    name: 'Cloud VPS 3',
    code: 'c2i.kvm.8c16g',
    cores: '8 vCPU Cores',
    ram: '16 GB DDR4 ECC',
    storage: '240 GB NVMe',
    bandwidth: '10 TB Traffic',
    ipv4: '2 Dedicated IPv4',
    monthlyPrice: 6800,
    popular: false,
    badge: 'Production Grade',
    features: [
      'Hardware RAID-10 Gen4 NVMe',
      '2 Dedicated Public IPv4 Included',
      '10 Gbps Network Port Speed',
      'Dedicated CPU Thread Priority',
      'Automated Daily Snapshots',
      'L3/L4/L7 DDoS Mitigation',
      'Direct DevOps Escalation Line'
    ]
  },
  {
    id: 'vps_ultra',
    name: 'Cloud VPS Pro',
    code: 'c2i.kvm.16c32g',
    cores: '16 vCPU Cores',
    ram: '32 GB DDR4 ECC',
    storage: '480 GB NVMe',
    bandwidth: '15 TB Traffic',
    ipv4: '2 Dedicated IPv4',
    monthlyPrice: 12500,
    popular: false,
    badge: 'High Concurrency',
    features: [
      'Enterprise Gen4 NVMe RAID-10',
      '2 Dedicated Public IPv4 Included',
      '10 Gbps Dedicated Port Speed',
      'Zero Resource Contention',
      'Automated Daily Snapshots',
      'Always-On DDoS Scrubbing',
      'Dedicated WhatsApp Engineer'
    ]
  }
];

export default function CloudVpsSection({ hideHeader = false }) {
  const [selectedOS, setSelectedOS] = useState('Ubuntu 22.04 LTS');
  const [viewMode, setViewMode] = useState('grid');
  const [plans, setPlans] = useState(CANONICAL_VPS_PLANS);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const currentOSObj =
    OS_OPTIONS.find((o) => o.fullName === selectedOS || o.name === selectedOS) || OS_OPTIONS[0];

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'hostingPlans'),
      (snapshot) => {
        if (!snapshot.empty) {
          const vpsDocs = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter(
              (p) => p.category === 'vps' || p.id.startsWith('vps_') || p.id.startsWith('vps-')
            )
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          if (vpsDocs.length > 0) {
            const merged = vpsDocs.map((docItem, index) => {
              const canonical =
                CANONICAL_VPS_PLANS.find(
                  (c) => c.id === docItem.id || c.id === `vps_${docItem.slug}`
                ) || CANONICAL_VPS_PLANS[index % CANONICAL_VPS_PLANS.length] || {};
              const monthlyPrice =
                docItem.priceOverride && docItem.overridePrice > 0
                  ? docItem.overridePrice
                  : docItem.pricing?.monthly || canonical.monthlyPrice || 1800;

              return {
                id: docItem.id,
                name: docItem.name || canonical.name || 'Cloud VPS',
                code: canonical.code || `c2i.kvm.tier${index + 1}`,
                cores: docItem.cloudLinuxLimits?.cpu
                  ? `${docItem.cloudLinuxLimits.cpu} vCPU Cores`
                  : canonical.cores || '4 vCPU Cores',
                ram: docItem.cloudLinuxLimits?.pmem
                  ? `${docItem.cloudLinuxLimits.pmem} MB RAM`
                  : canonical.ram || '8 GB DDR4 ECC',
                storage:
                  docItem.comparisonValues?.disk_space || canonical.storage || '120 GB NVMe',
                bandwidth:
                  docItem.comparisonValues?.bandwidth || canonical.bandwidth || '5 TB Traffic',
                ipv4: canonical.ipv4 || '1 Dedicated IPv4',
                monthlyPrice: monthlyPrice,
                popular: docItem.popular ?? canonical.popular ?? false,
                badge: docItem.badge || canonical.badge,
                features: docItem.features ||
                  canonical.features || [
                    'Hardware RAID-10 Gen4 NVMe',
                    '1 Dedicated Public IPv4',
                    '1Gbps Network Port',
                    'KVM Kernel Isolation',
                    'Automated Snapshots'
                  ]
              };
            });
            setPlans(merged);
          }
        }
      },
      (err) => console.error(err)
    );

    return () => unsub();
  }, []);

  const handleOrder = (plan) => {
    addToCart({
      id: `${plan.id}_monthly`,
      name: `${plan.name} (${selectedOS})`,
      price: plan.monthlyPrice,
      billingCycle: 'monthly',
      category: 'Hosting & Domains',
      itemType: 'hosting',
      planSlug: plan.id,
      quantity: 1,
      image: '/images/vps-icon.png',
      details: {
        os: selectedOS,
        cores: plan.cores,
        ram: plan.ram,
        storage: plan.storage,
        bandwidth: plan.bandwidth,
        ipv4: plan.ipv4,
        access: currentOSObj.accessType
      }
    });

    toast.success(`${plan.name} configured with ${selectedOS}`);
    navigate('/hosting/cart');
  };

  return (
    <section
      id="cloud-vps"
      className={cn(
        ' bg-slate-50/80 border-t border-slate-200/80 scroll-mt-20',
        hideHeader ? 'py-14 md:py-20' : 'py-20'
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Optional Standalone Section Header (used on /pricing, hidden on /vps where Hero already exists) */}
        {!hideHeader && (
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 bg-slate-900 text-cyan-400 rounded-full px-4 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider mb-4">
              <Terminal size={13} />
              KVM NVMe Compute Instances
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
              High Performance Cloud VPS Servers
            </h2>
            <p className="text-slate-600 text-base md:text-lg leading-relaxed">
              Select your preferred Linux or Windows Server image and deploy isolated KVM compute instances in under 60 seconds.
            </p>
          </div>
        )}

        {/* Step 1: Human-Designed OS Image Selector */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                01
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Select Operating System Image
              </h3>
              <span className="hidden md:inline-block text-xs text-slate-500 font-normal">
                — Pre-hardened cloud-init templates with instant root/administrator credentials
              </span>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Selected Image:</span>
              <strong className="text-slate-900 font-mono">{currentOSObj.fullName}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {OS_OPTIONS.map((os) => {
              const isSelected = selectedOS === os.fullName || selectedOS === os.name;
              return (
                <button
                  key={os.id}
                  type="button"
                  onClick={() => {
                    setSelectedOS(os.fullName);
                    toast.success(`OS Image set to ${os.fullName}`);
                  }}
                  className={cn(
                    'text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer flex items-start gap-3.5 relative group',
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/10'
                      : 'bg-white border-slate-200/90 text-slate-900 hover:border-slate-300 hover:bg-slate-50/50'
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    <OsLogo id={os.id} className="w-9 h-9" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'font-bold text-sm truncate',
                          isSelected ? 'text-white' : 'text-slate-900'
                        )}
                      >
                        {os.name}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-mono px-2 py-0.5 rounded font-semibold shrink-0',
                          isSelected
                            ? 'bg-white/15 text-cyan-300'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {os.version}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'text-xs mt-1 truncate',
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      )}
                    >
                      {os.tag}
                    </p>
                    <div
                      className={cn(
                        'text-[11px] font-mono mt-2 flex items-center gap-1.5',
                        isSelected ? 'text-emerald-400' : 'text-slate-500'
                      )}
                    >
                      <Check size={12} className="shrink-0" />
                      <span>{os.accessType}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2 Header + View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
              02
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Choose Compute Instance Size
            </h3>
            <span className="hidden md:inline-block text-xs text-slate-500">
              — Dedicated resources, BDIX 10Gbps local peering, instant vertical scaling
            </span>
          </div>

          <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer',
                viewMode === 'grid'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <LayoutGrid size={13} />
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer',
                viewMode === 'table'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <List size={13} />
              Spec Table
            </button>
          </div>
        </div>

        {/* View Mode 1: Clean Technical Cards */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'bg-white rounded-2xl p-6 border flex flex-col justify-between transition-all duration-200 relative',
                  plan.popular
                    ? 'border-blue-600 shadow-xl shadow-blue-950/5 ring-1 ring-blue-600'
                    : 'border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md'
                )}
              >
                <div>
                  {/* Card Top Metadata */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-[11px] font-semibold text-slate-400">
                      {plan.code}
                    </span>
                    {plan.badge && (
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md',
                          plan.popular
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  {/* Instance Title & Price */}
                  <div className="flex items-baseline justify-between pb-4 mb-4 border-b border-slate-100">
                    <div>
                      <h4 className="text-lg font-extrabold text-slate-900">{plan.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                        <OsLogo id={currentOSObj.id} className="w-3.5 h-3.5" />
                        <span>{currentOSObj.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                        ৳{plan.monthlyPrice.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">per month</div>
                    </div>
                  </div>

                  {/* 2x2 Hardware Spec Matrix */}
                  <div className="grid grid-cols-2 gap-2.5 mb-5">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                        <Cpu size={11} className="text-slate-500" /> Compute
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">{plan.cores}</div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                        <Server size={11} className="text-slate-500" /> Memory
                      </div>
                      <div className="text-xs font-bold text-blue-700 mt-0.5">{plan.ram}</div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                        <HardDrive size={11} className="text-slate-500" /> NVMe Disk
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">{plan.storage}</div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                        <Network size={11} className="text-slate-500" /> Network
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">
                        {plan.bandwidth}
                      </div>
                    </div>
                  </div>

                  {/* Dedicated IP Pill */}
                  <div className="mb-5 px-3 py-2 rounded-lg bg-emerald-50/70 border border-emerald-200/60 flex items-center justify-between text-xs">
                    <span className="text-emerald-900 font-medium flex items-center gap-1.5">
                      <Globe size={13} className="text-emerald-600" />
                      Public Network
                    </span>
                    <span className="font-mono font-bold text-emerald-700">{plan.ipv4}</span>
                  </div>

                  {/* Feature List */}
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-xs text-slate-800 font-semibold">
                      <Check size={14} className="text-blue-600 shrink-0 stroke-[2.5]" />
                      <span>{currentOSObj.accessType}</span>
                    </li>
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                        <Check size={14} className="text-emerald-600 shrink-0 stroke-[2.2]" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleOrder(plan)}
                  className={cn(
                    'w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer',
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  )}
                >
                  <span>Deploy {plan.name}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* View Mode 2: Developer Spec Comparison Table (like Hetzner / DigitalOcean) */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 text-[11px] font-mono uppercase tracking-wider">
                    <th className="py-3.5 px-5">Instance</th>
                    <th className="py-3.5 px-4">vCPU</th>
                    <th className="py-3.5 px-4">ECC Memory</th>
                    <th className="py-3.5 px-4">Gen4 NVMe</th>
                    <th className="py-3.5 px-4">Bandwidth</th>
                    <th className="py-3.5 px-4">IPv4</th>
                    <th className="py-3.5 px-4">OS Image</th>
                    <th className="py-3.5 px-5 text-right">Monthly</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                  {plans.map((plan) => (
                    <tr
                      key={plan.id}
                      className={cn(
                        'transition-colors hover:bg-slate-50',
                        plan.popular && 'bg-blue-50/30'
                      )}
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{plan.name}</span>
                          {plan.popular && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-600 text-white">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">{plan.code}</div>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-800">{plan.cores}</td>
                      <td className="py-4 px-4 font-bold text-blue-700">{plan.ram}</td>
                      <td className="py-4 px-4 font-semibold text-slate-800">{plan.storage}</td>
                      <td className="py-4 px-4 text-slate-600">{plan.bandwidth}</td>
                      <td className="py-4 px-4 font-mono text-xs text-emerald-700 font-semibold">
                        {plan.ipv4}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <OsLogo id={currentOSObj.id} className="w-4 h-4" />
                          {currentOSObj.name}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right font-mono font-extrabold text-slate-900 text-base">
                        ৳{plan.monthlyPrice.toLocaleString()}
                        <span className="text-[11px] text-slate-400 font-normal">/mo</span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOrder(plan)}
                          className={cn(
                            'px-4 py-2 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer',
                            plan.popular
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          )}
                        >
                          Deploy <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Included Baseline Guarantees Bar */}
        <div className="mt-8 bg-white rounded-xl border border-slate-200/90 p-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Every KVM Instance Includes:</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" /> Full Root SSH / Administrator RDP
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" /> Reverse DNS (PTR) Configuration
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" /> Out-of-Band VNC Emergency Console
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" /> 99.99% Power &amp; Network Uptime SLA
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
