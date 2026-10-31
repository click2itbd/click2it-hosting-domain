import React, { useState, useEffect } from 'react';
import { Check, ArrowRight, Rocket } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { collection, onSnapshot, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const CANONICAL_WP_PLANS = [
  {
    id: 'wp_starter',
    slug: 'wp-starter',
    name: 'WP Starter',
    badge: 'Student & Blogger',
    description: 'Optimized Turbo WordPress hosting with NVMe SSD for fast loading blogs & portfolios.',
    pricing: { monthly: 250, annually: 2400 },
    space: '10 GB NVMe SSD',
    cpu: '2 vCPU Cores',
    ram: '2 GB RAM',
    websites: '1 Website',
    bandwidth: '100 GB Bandwidth',
    features: [
      '10 GB NVMe SSD Storage',
      '1 Hosted Website',
      '2 vCPU & 2 GB RAM',
      'LiteSpeed Web Server + LSCache',
      'CloudLinux LVE CageFS',
      'Free SSL Certificate',
      'Daily Automated Backups',
      '1-Click WordPress Setup',
      '24/7 Priority Support'
    ],
  },
  {
    id: 'wp_pro',
    slug: 'wp-pro-turbo',
    name: 'WP Pro Turbo',
    badge: 'Most Popular',
    popular: true,
    description: 'High-speed WordPress hosting with Dedicated Redis cache for professional blogs & agencies.',
    pricing: { monthly: 500, annually: 4800 },
    space: '25 GB NVMe SSD',
    cpu: '4 vCPU Cores',
    ram: '4 GB RAM',
    websites: '5 Websites',
    bandwidth: 'Unlimited Bandwidth',
    features: [
      '25 GB NVMe SSD Storage',
      '5 Hosted Websites',
      '4 vCPU & 4 GB RAM',
      'LiteSpeed + Redis Cache',
      'CloudLinux LVE CageFS',
      'Free SSL Certificate',
      'Daily Automated Backups',
      'Malware Scanner & Protection',
      '24/7 Priority Support'
    ],
  },
  {
    id: 'wp_ecom',
    slug: 'wp-ecom-ultra',
    name: 'E-Commerce Ultra',
    badge: 'WooCommerce Boosted',
    popular: false,
    description: 'Turbocharged for WooCommerce online stores with high database concurrency & order surges.',
    pricing: { monthly: 950, annually: 9120 },
    space: '50 GB NVMe SSD',
    cpu: '6 vCPU Cores',
    ram: '8 GB RAM',
    websites: '10 Websites',
    bandwidth: 'Unlimited Bandwidth',
    features: [
      '50 GB NVMe SSD Storage',
      '10 Hosted Websites',
      '6 vCPU & 8 GB RAM',
      'WooCommerce Optimized Engine',
      'LiteSpeed + Redis Cache',
      'Free SSL Certificate',
      'Daily Automated Backups',
      'Real-time DDoS Protection',
      '24/7 VIP Support'
    ],
  },
  {
    id: 'wp_mega',
    slug: 'wp-mega-portal',
    name: 'Mega Portal Cloud',
    badge: 'Enterprise WP',
    popular: false,
    description: 'Maximum cloud power for large news portals, multivendor marketplaces, and heavy traffic.',
    pricing: { monthly: 1800, annually: 17280 },
    space: '100 GB Enterprise NVMe',
    cpu: '8 vCPU Cores',
    ram: '16 GB RAM',
    websites: 'Unlimited Websites',
    bandwidth: 'Unlimited Bandwidth',
    features: [
      '100 GB NVMe SSD Storage',
      'Unlimited Websites',
      '8 vCPU & 16 GB RAM',
      'Dedicated IP Address',
      'LiteSpeed Enterprise + Redis',
      'Free SSL Certificate',
      'Real-time Backups',
      'Dedicated Account Manager',
      '24/7 VIP Priority Support'
    ],
  }
];

export default function WordPressCloudSection() {
  const [billingCycle, setBillingCycle] = useState('annually');
  const [plans, setPlans] = useState(CANONICAL_WP_PLANS);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Silent cleanup of legacy dummy cloud packages from Firestore
    const legacyIds = [
      'cl_shared_starter', 'cl_shared_standard', 'cl_shared_advanced', 'cl_shared_turbo',
      'starter_cloud', 'standard_cloud', 'advanced_cloud', 'turbo_cloud',
      'starter-cloud', 'standard-cloud', 'advanced-cloud', 'turbo-cloud',
      'plan_starter_cloud', 'plan_standard_cloud', 'plan_advanced_cloud', 'plan_turbo_cloud'
    ];

    legacyIds.forEach(async (legId) => {
      try {
        await deleteDoc(doc(db, 'hostingPlans', legId));
      } catch (e) {}
    });

    // 2. Ensure canonical WP plans are present in Firestore
    CANONICAL_WP_PLANS.forEach(async (p, idx) => {
      try {
        await setDoc(doc(db, 'hostingPlans', p.id), {
          id: p.id,
          slug: p.slug,
          name: p.name,
          category: 'wordpress',
          whmPackageName: p.id,
          order: idx + 6,
          status: 'published',
          badge: p.badge,
          popular: p.popular || false,
          pricing: p.pricing,
          priceOverride: true,
          overridePrice: p.pricing.monthly,
          overrideAnnualPrice: p.pricing.annually,
          features: p.features
        }, { merge: true });
      } catch (e) {}
    });

    // 3. Listen to hostingPlans collection with strict canonical filtering
    const unsub = onSnapshot(collection(db, 'hostingPlans'), (snapshot) => {
      if (!snapshot.empty) {
        const allDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Delete any legacy documents returned
        allDocs.forEach((d) => {
          const nameLower = (d.name || '').toLowerCase().trim();
          const isLegacy = legacyIds.includes(d.id) || 
            ['starter cloud', 'standard cloud', 'advanced cloud', 'turbo cloud'].includes(nameLower);
          if (isLegacy) {
            try { deleteDoc(doc(db, 'hostingPlans', d.id)); } catch (e) {}
          }
        });

        // Always resolve strictly based on CANONICAL_WP_PLANS
        const resolvedPlans = CANONICAL_WP_PLANS.map((canonical) => {
          const match = allDocs.find(d => 
            (d.id === canonical.id || d.slug === canonical.slug || d.id === `plan_${canonical.slug}`) &&
            !['starter cloud', 'standard cloud', 'advanced cloud', 'turbo cloud'].includes((d.name || '').toLowerCase().trim())
          );

          if (!match) return canonical;

          const monthlyPrice = match.priceOverride && match.overridePrice > 0 
            ? match.overridePrice 
            : (match.pricing?.monthly || canonical.pricing.monthly);
          const annualPrice = match.priceOverride && match.overrideAnnualPrice > 0 
            ? match.overrideAnnualPrice 
            : (match.pricing?.annually || canonical.pricing.annually || Math.round(monthlyPrice * 12 * 0.8));

          return {
            ...canonical,
            badge: match.badge || canonical.badge,
            popular: match.popular ?? canonical.popular,
            pricing: {
              monthly: monthlyPrice,
              annually: annualPrice
            },
            cpu: match.cloudLinuxLimits?.cpu 
              ? (typeof match.cloudLinuxLimits.cpu === 'string' && match.cloudLinuxLimits.cpu.includes('Core') 
                  ? match.cloudLinuxLimits.cpu 
                  : `${match.cloudLinuxLimits.cpu}% vCPU`) 
              : canonical.cpu,
            ram: match.cloudLinuxLimits?.pmem ? `${match.cloudLinuxLimits.pmem} MB RAM` : canonical.ram,
            space: match.comparisonValues?.disk_space || canonical.space,
            features: match.features || canonical.features
          };
        });

        setPlans(resolvedPlans);
      } else {
        setPlans(CANONICAL_WP_PLANS);
      }
    }, (err) => {
      console.error(err);
      setPlans(CANONICAL_WP_PLANS);
    });

    return () => unsub();
  }, []);

  const handleOrder = (plan) => {
    const isAnnual = billingCycle === 'annually';
    const price = isAnnual ? plan.pricing.annually : plan.pricing.monthly;
    
    addToCart({
      id: `${plan.id}_${billingCycle}`,
      name: `${plan.name} (WordPress Cloud)`,
      price: price,
      billingCycle: isAnnual ? 'yearly' : 'monthly',
      category: 'Hosting & Domains',
      itemType: 'hosting',
      planSlug: plan.slug || plan.id,
      quantity: 1,
      image: '/images/hosting-icon.png',
      details: {
        cpu: plan.cpu,
        ram: plan.ram,
        space: plan.space,
        features: plan.features
      }
    });
    
    toast.success(`${plan.name} added to cart!`);
    navigate('/hosting/cart');
  };

  return (
    <section id="wordpress-hosting" className="py-20 bg-gray-900 text-white relative overflow-hidden border-t border-b border-gray-800">
      {/* Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Rocket size={14} className="text-blue-400" />
            Managed WordPress Cloud
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">
            Turbo WordPress & WooCommerce Hosting
          </h2>
          <p className="text-gray-400 text-sm md:text-base leading-relaxed">
            High-performance WordPress hosting powered by LiteSpeed, dedicated Redis Cache, and isolated CloudLinux resources.
          </p>

          {/* Billing Switcher */}
          <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-gray-800/80 border border-gray-700/80 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                billingCycle === 'monthly'
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                  : "text-gray-400 hover:text-white"
              )}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annually')}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                billingCycle === 'annually'
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/25"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <span>Annual Prepay</span>
              <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isAnnual = billingCycle === 'annually';
            const price = isAnnual ? plan.pricing.annually : plan.pricing.monthly;

            return (
              <div
                key={plan.id}
                className={cn(
                  "bg-gray-800/60 backdrop-blur-xl border rounded-3xl p-6 md:p-7 flex flex-col justify-between transition-all duration-300 relative group hover:-translate-y-1.5 hover:shadow-2xl",
                  plan.popular 
                    ? "border-blue-500/80 shadow-lg shadow-blue-500/10 bg-gradient-to-b from-blue-950/40 via-gray-800/80 to-gray-900" 
                    : "border-gray-700/60 hover:border-gray-600"
                )}
              >
                {plan.badge && (
                  <div className={cn(
                    "absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-md tracking-wider whitespace-nowrap",
                    plan.popular ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-500/30" : "bg-gray-700 text-gray-300"
                  )}>
                    {plan.badge}
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-white mb-1.5">{plan.name}</h3>
                  <p className="text-xs text-gray-400 mb-5 min-h-[32px] leading-relaxed">{plan.description}</p>

                  {/* Price Block */}
                  <div className="pb-5 mb-6 border-b border-gray-700/60">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl md:text-4xl font-black text-white">৳ {price.toLocaleString()}</span>
                      <span className="text-xs text-gray-400 font-medium">{isAnnual ? '/year' : '/month'}</span>
                    </div>
                    {isAnnual && (
                      <span className="inline-block mt-1 text-[11px] text-emerald-400 font-semibold">
                        Includes 20% annual discount
                      </span>
                    )}
                  </div>

                  {/* Hardware Specs Highlights */}
                  <div className="grid grid-cols-2 gap-2 mb-6 bg-gray-900/60 p-3 rounded-2xl border border-gray-700/40 text-center">
                    <div>
                      <span className="block text-[10px] text-gray-400 font-medium">Storage Quota</span>
                      <span className="text-xs font-bold text-blue-400">{plan.space}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 font-medium">Memory RAM</span>
                      <span className="text-xs font-bold text-emerald-400">{plan.ram}</span>
                    </div>
                  </div>

                  {/* Feature list */}
                  <div className="space-y-2.5 mb-8">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-xs text-gray-300">
                        <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
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
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  )}
                >
                  Buy WordPress Now
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
