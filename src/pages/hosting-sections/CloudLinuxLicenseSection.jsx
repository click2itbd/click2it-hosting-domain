import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, X, ArrowRight, Zap, Layers, Server, Shield, Sparkles, HelpCircle, Minus } from 'lucide-react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const DEFAULT_CLOUDLINUX_PACKAGES = [
  {
    id: 'cloudlinux_solo',
    name: 'CloudLinux OS Solo',
    slug: 'cloudlinux-os-solo',
    category: 'cloudlinux_license',
    order: 11,
    status: 'published',
    badge: 'Single Account',
    popular: false,
    price: 1100,
    pricing: { monthly: 1100, annually: 13200 },
    overridePrice: 1100,
    features: [
      '1 Hosting Account Supported',
      'CageFS Virtualized File System',
      'PHP Selector (Multiple PHP Versions)',
      'Stable & Secure Linux Environment',
      'Instant License Activation'
    ],
    compareValues: {
      price: '৳1,100 /mo',
      max_accounts: '1',
      lve_limits: false,
      cagefs: true,
      mysql_governor: false,
      php_selector: true,
      ruby_selector: null,
      python_selector: null,
      nodejs_selector: null,
      hardened_php: null,
      apache_mod_lsapi_pro: null,
      secure_links: null,
      website_monitoring: null,
      slow_site_analyzer: null,
      php_xray: null,
      centralized_monitoring: false,
      accelerate_wp: null,
      support_247: null
    }
  },
  {
    id: 'cloudlinux_admin',
    name: 'CloudLinux OS Admin',
    slug: 'cloudlinux-os-admin',
    category: 'cloudlinux_license',
    order: 12,
    status: 'published',
    badge: 'Up to 5 Accounts',
    popular: true,
    price: 1800,
    pricing: { monthly: 1800, annually: 21600 },
    overridePrice: 1800,
    features: [
      'Up to 5 Hosting Accounts Supported',
      'CageFS Virtualized File System',
      'PHP Selector (Multiple PHP Versions)',
      'Ideal for Multi-Site Admin Servers',
      'Instant License Activation'
    ],
    compareValues: {
      price: '৳1,800 /mo',
      max_accounts: '5',
      lve_limits: false,
      cagefs: true,
      mysql_governor: false,
      php_selector: true,
      ruby_selector: null,
      python_selector: null,
      nodejs_selector: null,
      hardened_php: null,
      apache_mod_lsapi_pro: null,
      secure_links: null,
      website_monitoring: null,
      slow_site_analyzer: null,
      php_xray: null,
      centralized_monitoring: false,
      accelerate_wp: null,
      support_247: null
    }
  },
  {
    id: 'cloudlinux_shared_pro',
    name: 'CloudLinux OS Shared Pro',
    slug: 'cloudlinux-os-shared-pro',
    category: 'cloudlinux_license',
    order: 13,
    status: 'published',
    badge: 'Unlimited Power',
    popular: false,
    price: 2700,
    pricing: { monthly: 2700, annually: 32400 },
    overridePrice: 2700,
    features: [
      'Unlimited Hosting Accounts',
      'Resource Limits (LVE Manager)',
      'CageFS User Isolation',
      'MySQL Governor (DB Protection)',
      'PHP Selector Support',
      'Centralized Monitoring Dashboard',
      'Enterprise Density & Stability'
    ],
    compareValues: {
      price: '৳2,700 /mo',
      max_accounts: 'Unlimited',
      lve_limits: true,
      cagefs: true,
      mysql_governor: true,
      php_selector: true,
      ruby_selector: null,
      python_selector: null,
      nodejs_selector: null,
      hardened_php: null,
      apache_mod_lsapi_pro: null,
      secure_links: null,
      website_monitoring: null,
      slow_site_analyzer: null,
      php_xray: null,
      centralized_monitoring: true,
      accelerate_wp: null,
      support_247: null
    }
  }
];

const COMPARE_ROWS = [
  { key: 'price', label: 'Price' },
  { key: 'max_accounts', label: 'Maximum amount of hosting accounts' },
  { key: 'lve_limits', label: 'Resources limits (LVE)' },
  { key: 'cagefs', label: 'CageFS' },
  { key: 'mysql_governor', label: 'MySQL Governor' },
  { key: 'php_selector', label: 'PHP Selector' },
  { key: 'ruby_selector', label: 'Ruby Selector' },
  { key: 'python_selector', label: 'Python Selector' },
  { key: 'nodejs_selector', label: 'NodeJS Selector' },
  { key: 'hardened_php', label: 'HardenedPHP' },
  { key: 'apache_mod_lsapi_pro', label: 'Apache mod_lsapi PRO' },
  { key: 'secure_links', label: 'SecureLinks (symlink protection)' },
  { key: 'website_monitoring', label: 'Website monitoring tool' },
  { key: 'slow_site_analyzer', label: 'Slow Site analyzer' },
  { key: 'php_xray', label: 'PHP X-Ray' },
  { key: 'centralized_monitoring', label: 'Centralized Monitoring' },
  { key: 'accelerate_wp', label: 'AccelerateWP' },
  { key: 'support_247', label: 'Support 24/7' }
];

export default function CloudLinuxLicenseSection() {
  const [packages, setPackages] = useState(DEFAULT_CLOUDLINUX_PACKAGES);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadPlans() {
      try {
        const snap = await getDocs(query(collection(db, 'hostingPlans'), orderBy('order', 'asc')));
        if (!snap.empty) {
          const allPlans = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const licensePlans = allPlans.filter(p => p.category === 'cloudlinux_license' && p.status !== 'draft');
          if (licensePlans.length > 0) {
            // merge with default comparison structure
            const merged = DEFAULT_CLOUDLINUX_PACKAGES.map(def => {
              const fromDb = licensePlans.find(p => p.id === def.id || p.slug === def.slug);
              if (!fromDb) return def;
              return {
                ...def,
                ...fromDb,
                price: fromDb.overridePrice || fromDb.pricing?.monthly || def.price,
                compareValues: {
                  ...def.compareValues,
                  ...(fromDb.comparisonValues || {})
                }
              };
            });
            setPackages(merged);
          }
        }
      } catch (err) {
        console.warn('Using default CloudLinux plans:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  const handleOrder = (pkg) => {
    addItem({
      id: pkg.id,
      name: pkg.name,
      price: pkg.price || pkg.overridePrice || 1100,
      quantity: 1,
      category: 'Hosting & Domains',
      image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=200',
      billingCycle: 'monthly',
      itemType: 'license',
      isDigital: true
    });
    toast.success(`${pkg.name} added to cart!`);
    navigate('/hosting/cart');
  };

  const renderCellValue = (val) => {
    if (val === true) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
          <Check className="w-4 h-4 stroke-[3]" />
        </span>
      );
    }
    if (val === false) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-500 dark:text-rose-400">
          <X className="w-4 h-4 stroke-[2.5]" />
        </span>
      );
    }
    if (val === null || val === undefined || val === '') {
      return <span className="text-gray-400 font-bold text-lg select-none">-</span>;
    }
    return <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{val}</span>;
  };

  return (
    <section id="cloudlinux-license" className="py-20 bg-gradient-to-b from-slate-900 via-[#0a1628] to-slate-900 text-white relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Official Server Addon
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
            CloudLinux OS License Pricing
          </h2>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            Enhance server stability, density, and security. Isolate tenants with CageFS, allocate dedicated LVE limits, and provide flexible Multi-PHP environments.
          </p>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative border ${
                pkg.popular
                  ? 'bg-gradient-to-b from-blue-900/40 via-[#0f213e] to-[#0a1628] border-blue-500 shadow-2xl shadow-blue-500/20 md:-translate-y-2'
                  : 'bg-[#0d1d36]/80 border-gray-800 hover:border-gray-700 hover:bg-[#0d1d36]'
              }`}
            >
              {pkg.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={`text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md ${
                    pkg.popular
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-200 border border-gray-700'
                  }`}>
                    {pkg.badge}
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-2xl ${pkg.popular ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-300'}`}>
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
                    <p className="text-xs text-gray-400">Monthly License</p>
                  </div>
                </div>

                <div className="my-6 pb-6 border-b border-gray-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-white">৳{pkg.price.toLocaleString()}</span>
                    <span className="text-gray-400 text-xs font-semibold">/ Month</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Instant server key issuance</p>
                </div>

                {/* Key Features List */}
                <div className="space-y-3 mb-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Key Specifications:</p>
                  {pkg.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Button */}
              <button
                type="button"
                onClick={() => handleOrder(pkg)}
                className={`w-full py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  pkg.popular
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <span>Order License</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Compare Plan Features Section */}
        <div className="bg-[#0d1d36]/90 border border-gray-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-sm">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              CloudLinux OS License Pricing Compare
            </h3>
            <p className="text-xs sm:text-sm text-gray-400">
              Full feature breakdown across CloudLinux OS Solo, Admin, and Shared Pro editions.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-2/5">
                    Feature / Specification
                  </th>
                  {packages.map((pkg) => (
                    <th key={pkg.id} className="py-4 px-4 text-center text-xs sm:text-sm font-bold text-white">
                      <div className="flex flex-col items-center gap-1">
                        <span className={pkg.popular ? 'text-blue-400 font-extrabold' : 'text-gray-200'}>
                          {pkg.name}
                        </span>
                        <span className="text-xs font-medium text-gray-400">
                          ৳{pkg.price.toLocaleString()} /mo
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-xs sm:text-sm">
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.key} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-gray-300">
                      {row.label}
                    </td>
                    {packages.map((pkg) => {
                      const val = pkg.compareValues?.[row.key];
                      return (
                        <td key={pkg.id} className="py-3.5 px-4 text-center">
                          {renderCellValue(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Bottom CTA Row */}
                <tr className="border-t-2 border-gray-700 bg-white/[0.01]">
                  <td className="py-5 px-4 font-bold text-white text-xs uppercase tracking-wider">
                    Order License
                  </td>
                  {packages.map((pkg) => (
                    <td key={pkg.id} className="py-5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOrder(pkg)}
                        className={`py-2 px-4 rounded-lg font-bold text-xs transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer ${
                          pkg.popular
                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white'
                        }`}
                      >
                        <span>Select</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            * Rows indicated with a dash (-) are currently customizable via the admin panel.
          </div>
        </div>
      </div>
    </section>
  );
}
