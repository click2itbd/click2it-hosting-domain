import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Sparkles, Server, HardDrive, ShieldCheck, Zap, 
  ArrowRight, X, Sliders, Globe, Lock, Cpu, Mail, Check
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-hot-toast';

interface DomainCrossSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  domainName: string;
  domainPrice?: number;
  onOpenCustomBuilder?: () => void;
}

export function DomainCrossSellModal({
  isOpen,
  onClose,
  domainName,
  domainPrice,
  onOpenCustomBuilder
}: DomainCrossSellModalProps) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [addedOption, setAddedOption] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddHosting = () => {
    const isAnnual = selectedBillingCycle === 'annual';
    const price = isAnnual ? 299 * 10 : 299; // 2 months free on annual
    const product = {
      id: `hosting_starter_bundle_${Date.now()}`,
      name: `cPanel NVMe Hosting (Starter Pro) - Linked to ${domainName}`,
      description: isAnnual ? '1 Year cPanel NVMe Hosting (Annual Promo: 2 Mos Free)' : 'Monthly cPanel NVMe Hosting',
      price: price,
      category: 'Hosting',
      stock: 9999,
      images: [],
      createdAt: new Date().toISOString(),
      itemType: 'hosting' as const,
      domain: domainName,
      billingCycle: selectedBillingCycle,
      tier: 'Starter Pro'
    };
    addToCart(product as any);
    setAddedOption('hosting');
    toast.success(`🎉 cPanel Hosting added to cart for ${domainName}!`);
  };

  const handleAddVps = () => {
    const isAnnual = selectedBillingCycle === 'annual';
    const price = isAnnual ? 999 * 10 : 999; // 2 months free on annual
    const product = {
      id: `vps_cloud_bundle_${Date.now()}`,
      name: `High-Performance Cloud NVMe VPS - Linked to ${domainName}`,
      description: isAnnual ? '1 Year Cloud VPS (2 vCPU, 4GB RAM, 60GB NVMe) - 40% Off' : 'Monthly Cloud VPS (2 vCPU, 4GB RAM, 60GB NVMe)',
      price: price,
      category: 'VPS',
      stock: 9999,
      images: [],
      createdAt: new Date().toISOString(),
      itemType: 'vps' as const,
      domain: domainName,
      billingCycle: selectedBillingCycle,
      tier: 'Cloud NVMe-2'
    };
    addToCart(product as any);
    setAddedOption('vps');
    toast.success(`🚀 Cloud NVMe VPS added to cart for ${domainName}!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Banner */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 text-white px-6 py-6 md:px-8 md:py-8 overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-10 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors"
            title="Close offer"
          >
            <X size={20} />
          </button>

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold tracking-wide uppercase text-cyan-200 mb-3">
              <Sparkles size={14} className="text-yellow-300 animate-pulse" />
              Special Add-on Offer for New Registration
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Power Up <span className="text-cyan-300 underline decoration-cyan-400/60">{domainName}</span> with High-Speed Hosting or VPS
            </h2>
            <p className="mt-2 text-sm sm:text-base text-blue-100 font-normal leading-relaxed">
              A domain needs high-performance server power to go live. Select an optional bundled package now with exclusive instant discounts up to 40% OFF!
            </p>

            {/* Billing Cycle Toggle */}
            <div className="mt-4 inline-flex items-center bg-black/20 p-1 rounded-xl border border-white/15">
              <button
                type="button"
                onClick={() => setSelectedBillingCycle('annual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedBillingCycle === 'annual'
                    ? 'bg-white text-blue-900 shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Annual (Save Extra 2 Months Free) 🔥
              </button>
              <button
                type="button"
                onClick={() => setSelectedBillingCycle('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedBillingCycle === 'monthly'
                    ? 'bg-white text-blue-900 shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        {/* Highlight Offer Cards */}
        <div className="p-6 md:p-8 bg-slate-50/50 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Offer 1: Web Hosting */}
            <div className="relative bg-white rounded-2xl p-6 border-2 border-blue-500/30 hover:border-blue-500 transition-all duration-300 shadow-lg shadow-blue-500/5 flex flex-col justify-between group">
              <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                Most Popular • 35% OFF
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Server size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">cPanel NVMe Web Hosting</h3>
                    <p className="text-xs text-slate-500">Perfect for blogs, business websites & WordPress</p>
                  </div>
                </div>

                <div className="my-4 pb-4 border-b border-slate-100 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    ৳{selectedBillingCycle === 'annual' ? '299' : '299'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ month</span>
                  <span className="text-xs text-slate-400 line-through">৳460/mo</span>
                </div>

                {/* Short Highlight Features */}
                <ul className="space-y-2.5 text-xs text-slate-700 font-medium mb-6">
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check size={11} />
                    </div>
                    <span><strong>10 GB Pure NVMe SSD</strong> Storage (3x faster than SATA)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check size={11} />
                    </div>
                    <span><strong>Official cPanel</strong> Control Panel + Softaculous 1-Click WP</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check size={11} />
                    </div>
                    <span><strong>Free Lifetime SSL</strong> & Automatic DNS Linking for {domainName}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check size={11} />
                    </div>
                    <span><strong>5 Business Emails</strong> (e.g. info@{domainName})</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check size={11} />
                    </div>
                    <span><strong>Imunify360</strong> Anti-Malware & 99.9% Uptime Guarantee</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleAddHosting}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                  addedOption === 'hosting'
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-blue-500/20'
                }`}
              >
                {addedOption === 'hosting' ? (
                  <>
                    <CheckCircle2 size={16} /> Added to Cart!
                  </>
                ) : (
                  <>
                    <Zap size={16} /> Add Web Hosting to Cart
                  </>
                )}
              </button>
            </div>

            {/* Offer 2: Cloud VPS */}
            <div className="relative bg-white rounded-2xl p-6 border-2 border-indigo-500/30 hover:border-indigo-500 transition-all duration-300 shadow-lg shadow-indigo-500/5 flex flex-col justify-between group">
              <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                Developer Choice • 40% OFF
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Cpu size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Cloud NVMe VPS Server</h3>
                    <p className="text-xs text-slate-500">Dedicated vCPU & RAM for web apps, APIs & high traffic</p>
                  </div>
                </div>

                <div className="my-4 pb-4 border-b border-slate-100 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    ৳{selectedBillingCycle === 'annual' ? '999' : '999'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ month</span>
                  <span className="text-xs text-slate-400 line-through">৳1,650/mo</span>
                </div>

                {/* Short Highlight Features */}
                <ul className="space-y-2.5 text-xs text-slate-700 font-medium mb-6">
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check size={11} />
                    </div>
                    <span><strong>2 Dedicated vCPUs</strong> (AMD EPYC™ / Intel Xeon)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check size={11} />
                    </div>
                    <span><strong>4 GB DDR4 ECC RAM</strong> & 60 GB Enterprise NVMe</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check size={11} />
                    </div>
                    <span><strong>Full Root / SSH Access</strong> & Choice of OS (Ubuntu, AlmaLinux, Debian)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check size={11} />
                    </div>
                    <span><strong>1 Dedicated IPv4 Address</strong> + /64 IPv6 Subnet Included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check size={11} />
                    </div>
                    <span><strong>2 Tbps BGP DDoS Shield</strong> & 1 Gbps Unmetered Uplink</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleAddVps}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                  addedOption === 'vps'
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-indigo-500/20'
                }`}
              >
                {addedOption === 'vps' ? (
                  <>
                    <CheckCircle2 size={16} /> Added to Cart!
                  </>
                ) : (
                  <>
                    <Server size={16} /> Add Cloud VPS to Cart
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Option 3: Custom Builder banner */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-900/50 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-cyan-400">
                <Sliders size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Need a specific CPU, RAM, Disk or cPanel Tier?</p>
                <p className="text-xs text-slate-300">Customize every parameter with our live auto-calculated cost engine.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenCustomBuilder) {
                  onOpenCustomBuilder();
                } else {
                  navigate('/hosting?custom=true');
                }
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-colors shrink-0 flex items-center gap-2"
            >
              Open Custom Package Builder <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 md:px-8 bg-white border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 text-xs sm:text-sm font-semibold transition-colors py-2 px-3"
          >
            No thanks, continue with domain only
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/hosting/cart');
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 transition-transform active:scale-95"
          >
            Proceed to Cart & Checkout <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
