import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { 
  Sliders, 
  HardDrive, 
  Globe, 
  Cpu, 
  Database, 
  Mail, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles,
  Layers,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

export default function CustomHostingBuilder() {
  const [rates, setRates] = useState({
    perGbDisk: 50,
    perWebsite: 40,
    perCoreCpu: 120,
    perGbRam: 80,
    perEmail: 2,
    perDatabase: 5,
    basePrice: 100,
    annualDiscountPercent: 20
  });

  const [resources, setResources] = useState({
    disk: 5,         // 5 GB NVMe
    websites: 2,     // 2 Websites
    cpu: 2,          // 2 Cores
    ram: 2,          // 2 GB RAM
    email: 10,       // 10 Emails
    databases: 5,    // 5 DBs
  });

  const [billingCycle, setBillingCycle] = useState('annually');
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'custom_hosting_pricing'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRates({
          perGbDisk: Number(data.perGbDisk) || 50,
          perWebsite: Number(data.perWebsite) || 40,
          perCoreCpu: Number(data.perCoreCpu) || 120,
          perGbRam: Number(data.perGbRam) || 80,
          perEmail: Number(data.perEmail) || 2,
          perDatabase: Number(data.perDatabase) || 5,
          basePrice: Number(data.basePrice) || 100,
          annualDiscountPercent: Number(data.annualDiscountPercent) || 20
        });
      }
    }, (err) => console.error(err));

    return () => unsub();
  }, []);

  // Calculate monthly base price
  const calculateMonthlyPrice = () => {
    let total = rates.basePrice;
    total += resources.disk * rates.perGbDisk;
    total += (resources.websites - 1) * rates.perWebsite;
    total += (resources.cpu - 1) * rates.perCoreCpu;
    total += (resources.ram - 1) * rates.perGbRam;
    total += Math.max(0, resources.email - 5) * rates.perEmail;
    total += Math.max(0, resources.databases - 2) * rates.perDatabase;
    return Math.max(120, Math.round(total));
  };

  const monthlyPrice = calculateMonthlyPrice();
  const isAnnual = billingCycle === 'annually';
  const discountMultiplier = 1 - (rates.annualDiscountPercent / 100);
  const annualPrice = Math.round(monthlyPrice * 12 * discountMultiplier);
  const finalPrice = isAnnual ? annualPrice : monthlyPrice;

  const handleOrder = () => {
    const customPlanName = `Custom Cloud Plan (${resources.disk}GB / ${resources.cpu} Core / ${resources.ram}GB RAM)`;
    
    addToCart({
      id: `custom-hosting-${Date.now()}`,
      name: customPlanName,
      price: finalPrice,
      quantity: 1,
      category: 'Hosting & Domains',
      itemType: 'hosting',
      planSlug: 'custom-package',
      billingCycle: isAnnual ? 'yearly' : 'monthly',
      image: '/images/hosting-icon.png',
      details: {
        disk: `${resources.disk} GB Pure NVMe SSD`,
        websites: `${resources.websites} Website(s)`,
        cpu: `${resources.cpu} vCPU Core(s)`,
        ram: `${resources.ram} GB DDR4 RAM`,
        email: `${resources.email} Email Accounts`,
        databases: `${resources.databases} Databases`,
        cpanel: 'cPanel Control Panel Included',
        ssl: 'Free SSL Certificate',
        litespeed: 'LiteSpeed Web Server'
      }
    });

    toast.success('Custom hosting plan configured & added to cart!');
    navigate('/hosting/cart');
  };

  return (
    <section id="custom-package" className="py-20 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-t border-gray-200 scroll-mt-20">
      <div className="container mx-auto px-2 sm:px-4 max-w-6xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 text-blue-600 border border-blue-200 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-4">
            <Sliders size={14} className="text-blue-600" />
            Build Your Own Custom Hosting
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            Design Your Custom Cloud Package
          </h2>
          <p className="text-gray-600 text-base md:text-lg leading-relaxed">
            Need exact resources for your project? Use our interactive resource calculator to tailor your exact SSD, CPU, and RAM limits at transparent wholesale rates.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 inline-flex items-center bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shadow-inner">
            <button
              onClick={() => setBillingCycle('annually')}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold transition-all",
                isAnnual 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Yearly Plan (Save {rates.annualDiscountPercent}%) 🔥
            </button>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold transition-all",
                !isAnnual 
                  ? "bg-blue-600 text-white shadow-md" 
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Monthly Plan
            </button>
          </div>
        </div>

        {/* Interactive Builder Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sliders Area (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-7">
            
            {/* 1. NVMe Storage Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <HardDrive size={18} className="text-blue-600" />
                  NVMe SSD Storage
                </label>
                <span className="text-base font-extrabold text-blue-600 bg-blue-50 px-3 py-0.5 rounded-lg border border-blue-100">
                  {resources.disk} GB
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="100"
                step="1"
                value={resources.disk}
                onChange={(e) => setResources({ ...resources, disk: Number(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-1 font-medium">
                <span>2 GB</span>
                <span>Rate: ৳{rates.perGbDisk}/GB</span>
                <span>100 GB</span>
              </div>
            </div>

            {/* 2. Websites Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Globe size={18} className="text-indigo-600" />
                  Hosted Websites (Domains)
                </label>
                <span className="text-base font-extrabold text-indigo-600 bg-indigo-50 px-3 py-0.5 rounded-lg border border-indigo-100">
                  {resources.websites} {resources.websites === 1 ? 'Website' : 'Websites'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={resources.websites}
                onChange={(e) => setResources({ ...resources, websites: Number(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-1 font-medium">
                <span>1 Website</span>
                <span>Rate: ৳{rates.perWebsite}/Addon</span>
                <span>30 Websites</span>
              </div>
            </div>

            {/* 3. CPU Cores Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Cpu size={18} className="text-purple-600" />
                  CPU Processing Power
                </label>
                <span className="text-base font-extrabold text-purple-600 bg-purple-50 px-3 py-0.5 rounded-lg border border-purple-100">
                  {resources.cpu} Core{resources.cpu > 1 ? 's' : ''} ({(resources.cpu * 100)}%)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={resources.cpu}
                onChange={(e) => setResources({ ...resources, cpu: Number(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-1 font-medium">
                <span>1 Core</span>
                <span>Rate: ৳{rates.perCoreCpu}/Core</span>
                <span>8 Cores</span>
              </div>
            </div>

            {/* 4. RAM Memory Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Zap size={18} className="text-amber-600" />
                  Physical RAM Memory
                </label>
                <span className="text-base font-extrabold text-amber-600 bg-amber-50 px-3 py-0.5 rounded-lg border border-amber-100">
                  {resources.ram} GB RAM
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="16"
                step="1"
                value={resources.ram}
                onChange={(e) => setResources({ ...resources, ram: Number(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-1 font-medium">
                <span>1 GB</span>
                <span>Rate: ৳{rates.perGbRam}/GB</span>
                <span>16 GB</span>
              </div>
            </div>

            {/* 5. Additional Specs (Email & Databases) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5 flex items-center gap-1.5">
                  <Mail size={14} className="text-gray-500" /> Email Accounts
                </label>
                <select
                  value={resources.email}
                  onChange={(e) => setResources({ ...resources, email: Number(e.target.value) })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-500"
                >
                  <option value={5}>5 Email Accounts (Free)</option>
                  <option value={15}>15 Email Accounts</option>
                  <option value={30}>30 Email Accounts</option>
                  <option value={50}>50 Email Accounts</option>
                  <option value={100}>100 Email Accounts</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5 flex items-center gap-1.5">
                  <Database size={14} className="text-gray-500" /> MySQL Databases
                </label>
                <select
                  value={resources.databases}
                  onChange={(e) => setResources({ ...resources, databases: Number(e.target.value) })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-blue-500"
                >
                  <option value={2}>2 Databases (Free)</option>
                  <option value={5}>5 Databases</option>
                  <option value={10}>10 Databases</option>
                  <option value={25}>25 Databases</option>
                  <option value={50}>50 Databases</option>
                </select>
              </div>
            </div>

          </div>

          {/* Real-time Summary Card (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-b from-gray-900 to-slate-900 rounded-3xl p-7 text-white shadow-xl flex flex-col justify-between border border-gray-800 sticky top-24">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                  Real-time Configuration
                </span>
                <span className="text-xs text-gray-400 font-medium">Instant Setup</span>
              </div>

              <h3 className="text-2xl font-black text-white mb-6">Your Custom Package</h3>

              {/* Price Calculation Display */}
              <div className="pb-6 mb-6 border-b border-gray-800">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-black text-white">৳{finalPrice.toLocaleString()}</span>
                  <span className="text-xs text-gray-400 font-medium">{isAnnual ? '/year' : '/month'}</span>
                </div>
                {isAnnual && (
                  <p className="text-xs text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                    <Sparkles size={13} /> Includes {rates.annualDiscountPercent}% annual prepayment savings
                  </p>
                )}
              </div>

              {/* Resource Checklist */}
              <div className="space-y-3 mb-8 text-xs text-gray-300">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800/60">
                  <span className="text-gray-400">Pure NVMe Storage:</span>
                  <span className="font-bold text-white">{resources.disk} GB</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-gray-800/60">
                  <span className="text-gray-400">Websites Allowed:</span>
                  <span className="font-bold text-white">{resources.websites} Domain(s)</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-gray-800/60">
                  <span className="text-gray-400">CPU Power:</span>
                  <span className="font-bold text-white">{resources.cpu} vCPU ({resources.cpu * 100}%)</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-gray-800/60">
                  <span className="text-gray-400">RAM Memory:</span>
                  <span className="font-bold text-white">{resources.ram} GB DDR4</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-gray-800/60">
                  <span className="text-gray-400">cPanel & LiteSpeed:</span>
                  <span className="font-bold text-emerald-400">Included Free</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Free SSL & Backups:</span>
                  <span className="font-bold text-emerald-400">Included Free</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleOrder}
              className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
            >
              Order Custom Package
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

