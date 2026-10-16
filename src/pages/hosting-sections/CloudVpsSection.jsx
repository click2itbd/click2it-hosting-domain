import React, { useState, useEffect } from 'react';
import { Terminal, Shield, Cpu, HardDrive, Zap, Check, ArrowRight, Server, Monitor, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

const OS_OPTIONS = [
  { 
    id: 'ubuntu', 
    name: 'Ubuntu 22.04', 
    fullName: 'Ubuntu 22.04 LTS',
    type: 'Linux', 
    icon: '🐧', 
    tag: 'Recommended for Node/Python/Docker',
    accessType: 'Full Root SSH Access' 
  },
  { 
    id: 'debian', 
    name: 'Debian 12', 
    fullName: 'Debian 12 Bookworm',
    type: 'Linux', 
    icon: '🌀', 
    tag: 'Ultra Stable & Lightweight',
    accessType: 'Full Root SSH Access' 
  },
  { 
    id: 'almalinux', 
    name: 'AlmaLinux 9', 
    fullName: 'AlmaLinux 9',
    type: 'Linux', 
    icon: '⚡', 
    tag: 'Best for cPanel & Enterprise',
    accessType: 'Full Root SSH Access' 
  },
  { 
    id: 'windows', 
    name: 'Windows 2022', 
    fullName: 'Windows Server 2022',
    type: 'Windows', 
    icon: '🪟', 
    tag: 'Remote Desktop (RDP) & IIS',
    accessType: 'Remote Desktop (RDP) Access' 
  }
];

const CANONICAL_VPS_PLANS = [
  {
    id: 'vps_starter',
    name: 'Cloud VPS 1',
    cores: '2 vCPU Cores',
    ram: '4 GB DDR4 RAM',
    storage: '60 GB NVMe SSD',
    bandwidth: '2 TB Premium Bandwidth',
    ipv4: '1 Dedicated IPv4',
    monthlyPrice: 1800,
    popular: false,
    badge: 'Standard Starter',
    features: [
      'Pure NVMe Storage in RAID 10',
      '1 Dedicated Public IPv4',
      '1Gbps Network Port',
      'KVM Hardware Virtualization',
      'Automated Weekly Backups',
      '24/7 Server Monitoring'
    ]
  },
  {
    id: 'vps_standard',
    name: 'Cloud VPS 2',
    cores: '4 vCPU Cores',
    ram: '8 GB DDR4 RAM',
    storage: '120 GB NVMe SSD',
    bandwidth: '5 TB Premium Bandwidth',
    ipv4: '1 Dedicated IPv4',
    monthlyPrice: 3500,
    popular: true,
    badge: 'Most Popular',
    features: [
      'Pure NVMe Storage in RAID 10',
      '1 Dedicated Public IPv4',
      '1Gbps Network Port',
      'KVM Hardware Virtualization',
      'Automated Daily Snapshots',
      'Free OS Reinstall Anytime',
      '24/7 Priority Ticket Support'
    ]
  },
  {
    id: 'vps_pro',
    name: 'Cloud VPS 3',
    cores: '8 vCPU Cores',
    ram: '16 GB DDR4 RAM',
    storage: '240 GB NVMe SSD',
    bandwidth: '10 TB Premium Bandwidth',
    ipv4: '2 Dedicated IPv4',
    monthlyPrice: 6800,
    popular: false,
    badge: 'Heavy Production',
    features: [
      'Pure NVMe Storage in RAID 10',
      '2 Dedicated Public IPv4 Included',
      '10Gbps Network Port',
      'KVM Hardware Virtualization',
      'Automated Daily Snapshots',
      'DDoS Protection up to 500Gbps',
      'Direct DevOps Phone Support'
    ]
  },
  {
    id: 'vps_ultra',
    name: 'Cloud VPS Pro',
    cores: '16 vCPU Cores',
    ram: '32 GB DDR4 RAM',
    storage: '480 GB Enterprise NVMe',
    bandwidth: '15 TB Unmetered',
    ipv4: '2 Dedicated IPv4',
    monthlyPrice: 12500,
    popular: false,
    badge: 'Enterprise Dedicated',
    features: [
      'Enterprise NVMe in RAID 10',
      '2 Dedicated Public IPv4 Included',
      '10Gbps Network Port',
      'Zero Resource Contention',
      'Automated Daily Snapshots',
      'Enterprise DDoS Mitigation',
      'Direct WhatsApp DevOps Support'
    ]
  }
];

export default function CloudVpsSection() {
  const [selectedOS, setSelectedOS] = useState('Ubuntu 22.04 LTS');
  const [plans, setPlans] = useState(CANONICAL_VPS_PLANS);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const currentOSObj = OS_OPTIONS.find(o => o.fullName === selectedOS || o.name === selectedOS) || OS_OPTIONS[0];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'hostingPlans'), (snapshot) => {
      if (!snapshot.empty) {
        const vpsDocs = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((p) => p.category === 'vps' || p.id.startsWith('vps_') || p.id.startsWith('vps-'))
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        if (vpsDocs.length > 0) {
          const merged = vpsDocs.map((docItem) => {
            const canonical = CANONICAL_VPS_PLANS.find(c => c.id === docItem.id || c.id === `vps_${docItem.slug}`) || {};
            const monthlyPrice = docItem.priceOverride && docItem.overridePrice > 0 
              ? docItem.overridePrice 
              : (docItem.pricing?.monthly || canonical.monthlyPrice || 1800);

            return {
              id: docItem.id,
              name: docItem.name || canonical.name || 'Cloud VPS',
              cores: docItem.cloudLinuxLimits?.cpu ? `${docItem.cloudLinuxLimits.cpu} Cores` : (canonical.cores || '4 vCPU Cores'),
              ram: docItem.cloudLinuxLimits?.pmem ? `${docItem.cloudLinuxLimits.pmem} MB RAM` : (canonical.ram || '8 GB RAM'),
              storage: docItem.comparisonValues?.disk_space || canonical.storage || '120 GB NVMe SSD',
              bandwidth: docItem.comparisonValues?.bandwidth || canonical.bandwidth || '5 TB Premium Bandwidth',
              ipv4: canonical.ipv4 || '1 Dedicated IPv4',
              monthlyPrice: monthlyPrice,
              popular: docItem.popular ?? canonical.popular ?? false,
              badge: docItem.badge || canonical.badge,
              features: docItem.features || canonical.features || [
                'Pure NVMe Storage in RAID 10',
                '1 Dedicated Public IPv4',
                '1Gbps Network Port',
                'KVM Hardware Virtualization',
                'Automated Snapshots'
              ]
            };
          });
          setPlans(merged);
        }
      }
    }, (err) => console.error(err));

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

    toast.success(`${plan.name} configured with ${selectedOS}!`);
    navigate('/hosting/cart');
  };

  return (
    <section id="cloud-vps" className="py-20 bg-gray-50 border-t border-gray-200 scroll-mt-20">
      <div className="container mx-auto px-2 sm:px-4 max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-4">
            <Terminal size={14} className="text-indigo-600" />
            Full Root Access KVM Cloud VPS
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            High Performance Cloud VPS Servers
          </h2>
          <p className="text-gray-600 text-base md:text-lg leading-relaxed">
            Deploy ultra-fast KVM Cloud VPS with NVMe storage, dedicated IPv4, and pre-configured OS templates.
          </p>

          {/* Working OS Selector Bar - Guaranteed Single Row */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center justify-center gap-1.5">
              <Server size={14} className="text-indigo-600" /> Choose Server Operating System:
            </div>
            
            <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {OS_OPTIONS.map((os) => {
                const isSelected = selectedOS === os.fullName || selectedOS === os.name;
                return (
                  <button
                    key={os.id}
                    type="button"
                    onClick={() => {
                      setSelectedOS(os.fullName);
                      toast.success(`Selected ${os.fullName}`);
                    }}
                    className={cn(
                      "py-2.5 px-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
                      isSelected
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <span className="text-sm">{os.icon}</span>
                    <span className="truncate">{os.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Current Active OS Tagline */}
            <div className="mt-3 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-1.5 rounded-full text-xs font-semibold text-indigo-900">
              <Sparkles size={13} className="text-indigo-600" />
              <span>Active Template: <strong>{currentOSObj.fullName}</strong> — {currentOSObj.accessType}</span>
            </div>
          </div>
        </div>

        {/* VPS Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "bg-white rounded-3xl p-6 md:p-7 border flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl relative",
                plan.popular 
                  ? "border-indigo-500 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/20" 
                  : "border-gray-200 hover:border-indigo-300"
              )}
            >
              {plan.badge && (
                <div className={cn(
                  "absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full shadow-sm tracking-wider whitespace-nowrap",
                  plan.popular ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 border border-gray-200"
                )}>
                  {plan.badge}
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 pb-4 mb-4 border-b border-gray-100">
                  <span className="text-3xl md:text-4xl font-black text-gray-900">৳{plan.monthlyPrice.toLocaleString()}</span>
                  <span className="text-xs text-gray-500 font-medium">/ month</span>
                </div>

                {/* OS Badge on Card */}
                <div className="mb-4 bg-gray-50 rounded-xl p-2 border border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Configured OS:</span>
                  <span className="font-bold text-indigo-600 flex items-center gap-1">
                    {currentOSObj.icon} {currentOSObj.name.split(' ')[0]}
                  </span>
                </div>

                {/* Specs Box */}
                <div className="space-y-2 mb-6 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100/60 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-gray-500">vCPU:</span>
                    <span className="text-gray-900 font-bold">{plan.cores}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-gray-500">RAM:</span>
                    <span className="text-indigo-600 font-bold">{plan.ram}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-gray-500">Storage:</span>
                    <span className="text-gray-900 font-bold">{plan.storage}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-gray-500">Bandwidth:</span>
                    <span className="text-gray-900 font-bold">{plan.bandwidth}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold pt-1 border-t border-indigo-100/60">
                    <span className="text-gray-500">IP Address:</span>
                    <span className="text-emerald-600 font-bold">{plan.ipv4}</span>
                  </div>
                </div>

                {/* Feature checklist */}
                <div className="space-y-2.5 mb-8">
                  <div className="flex items-center gap-2 text-xs text-indigo-700 font-bold">
                    <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Check size={11} className="stroke-[2.5]" />
                    </div>
                    <span>{currentOSObj.accessType}</span>
                  </div>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Check size={11} className="stroke-[2.5]" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOrder(plan)}
                className={cn(
                  "w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer",
                  plan.popular
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                    : "bg-gray-900 hover:bg-black text-white"
                )}
              >
                Deploy with {currentOSObj.name.split(' ')[0]}
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

