import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Monitor, Server, Check, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-hot-toast';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

const CANONICAL_PLANS = [
  {
    id: 'plan_student',
    name: 'Student',
    slug: 'student',
    order: 0,
    pricing: { monthly: 75, annually: 720 },
    priceOverride: true,
    overridePrice: 75,
    overrideAnnualPrice: 720,
    features: [
      '2 GB NVMe SSD Storage',
      '50 GB Bandwidth',
      '0 Addon Domain (1 Website)',
      '3 Subdomains',
      '2 Email Accounts',
      '2 MySQL Databases',
      'Free SSL Certificate',
      'LiteSpeed Web Server',
      'cPanel Control Panel',
      'Softaculous 1-Click'
    ],
    comparisonValues: {
      disk_space: '2 GB NVMe SSD',
      bandwidth: '50 GB',
      addon_domains: '0',
      subdomains: '3',
      emails: '2',
      databases: '2',
      free_ssl: true,
      litespeed: true,
      daily_backup: false,
      cpanel: true,
      softaculous: true
    }
  },
  {
    id: 'plan_starter',
    name: 'Starter',
    slug: 'starter',
    order: 1,
    pricing: { monthly: 150, annually: 1440 },
    priceOverride: true,
    overridePrice: 150,
    overrideAnnualPrice: 1440,
    features: [
      '5 GB NVMe SSD Storage',
      '100 GB Bandwidth',
      '0 Addon Domain (1 Website)',
      'Unlimited Subdomains',
      '5 Email Accounts',
      '5 MySQL Databases',
      'Free SSL Certificate',
      'LiteSpeed Web Server',
      'cPanel Control Panel',
      'Softaculous 1-Click'
    ],
    comparisonValues: {
      disk_space: '5 GB NVMe SSD',
      bandwidth: '100 GB',
      addon_domains: '0',
      subdomains: 'Unlimited',
      emails: '5',
      databases: '5',
      free_ssl: true,
      litespeed: true,
      daily_backup: false,
      cpanel: true,
      softaculous: true
    }
  },
  {
    id: 'plan_standard',
    name: 'Standard',
    slug: 'standard',
    popular: true,
    order: 2,
    pricing: { monthly: 350, annually: 3360 },
    priceOverride: true,
    overridePrice: 350,
    overrideAnnualPrice: 3360,
    features: [
      '10 GB NVMe SSD Storage',
      'Unlimited Bandwidth',
      '3 Addon Domains',
      'Unlimited Subdomains',
      '20 Email Accounts',
      '20 MySQL Databases',
      'Free SSL Certificate',
      'LiteSpeed Web Server',
      'Daily Backup Included',
      'cPanel Control Panel',
      'Softaculous 1-Click'
    ],
    comparisonValues: {
      disk_space: '10 GB NVMe SSD',
      bandwidth: 'Unlimited',
      addon_domains: '3',
      subdomains: 'Unlimited',
      emails: '20',
      databases: '20',
      free_ssl: true,
      litespeed: true,
      daily_backup: true,
      cpanel: true,
      softaculous: true
    }
  },
  {
    id: 'plan_professional',
    name: 'Professional',
    slug: 'professional',
    order: 3,
    pricing: { monthly: 650, annually: 6240 },
    priceOverride: true,
    overridePrice: 650,
    overrideAnnualPrice: 6240,
    features: [
      '20 GB NVMe SSD Storage',
      'Unlimited Bandwidth',
      '10 Addon Domains',
      'Unlimited Subdomains',
      'Unlimited Email Accounts',
      'Unlimited MySQL Databases',
      'Free SSL Certificate',
      'LiteSpeed Web Server',
      'Daily Backup Included',
      'cPanel Control Panel',
      'Softaculous 1-Click'
    ],
    comparisonValues: {
      disk_space: '20 GB NVMe SSD',
      bandwidth: 'Unlimited',
      addon_domains: '10',
      subdomains: 'Unlimited',
      emails: 'Unlimited',
      databases: 'Unlimited',
      free_ssl: true,
      litespeed: true,
      daily_backup: true,
      cpanel: true,
      softaculous: true
    }
  },
  {
    id: 'plan_premium',
    name: 'Premium',
    slug: 'premium',
    order: 4,
    pricing: { monthly: 1200, annually: 11520 },
    priceOverride: true,
    overridePrice: 1200,
    overrideAnnualPrice: 11520,
    features: [
      '50 GB NVMe SSD Storage',
      'Unlimited Bandwidth',
      'Unlimited Addon Domains',
      'Unlimited Subdomains',
      'Unlimited Email Accounts',
      'Unlimited MySQL Databases',
      'Free SSL Certificate',
      'LiteSpeed Web Server',
      'Daily Backup Included',
      'cPanel Control Panel',
      'Softaculous 1-Click'
    ],
    comparisonValues: {
      disk_space: '50 GB NVMe SSD',
      bandwidth: 'Unlimited',
      addon_domains: 'Unlimited',
      subdomains: 'Unlimited',
      emails: 'Unlimited',
      databases: 'Unlimited',
      free_ssl: true,
      litespeed: true,
      daily_backup: true,
      cpanel: true,
      softaculous: true
    }
  }
];

export default function HostingPlansSection({
  billingCycle = 'monthly',
  onBillingCycleChange,
  onNavigate,
}) {
  const { addToCart } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [plans, setPlans] = useState(CANONICAL_PLANS);
  const [loading, setLoading] = useState(true);

  const calculatePlanPrice = (plan) => {
    if (!plan) return { monthly: 0, annually: 0 };
    
    if (plan.priceOverride && plan.overridePrice > 0) {
      const monthly = plan.overridePrice;
      const annually = plan.overrideAnnualPrice || Math.round(monthly * 12 * 0.8);
      return { monthly, annually };
    }

    const licenseCostUsd = plan.licenseCostUsd || plan.pricing?.licenseCostUsd || 0;
    if (licenseCostUsd > 0) {
      const exchangeRate = settings.apiSettings?.usdToBdtRate || settings.usdToBdtRate || 120;
      const markupPercent = settings.apiSettings?.hostingMarkupPercent || settings.hostingMarkupPercent || 35;
      const monthly = Math.round(licenseCostUsd * exchangeRate * (1 + markupPercent / 100));
      const annually = Math.round(monthly * 12 * 0.8);
      return { monthly, annually };
    }
    
    const monthly = plan.pricing?.monthly || plan.price || 0;
    const annually = plan.pricing?.annually || plan.annualPrice || Math.round(monthly * 12 * 0.8);
    return { monthly, annually };
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const q = query(collection(db, 'hostingPlans'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
          const allPlans = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const fetchedPlans = allPlans.filter((p) => (p.category === 'shared' || !p.category || p.id.startsWith('plan_')) && p.category !== 'wordpress' && p.category !== 'vps');
          
          if (fetchedPlans.length > 0) {
            const hasStudent = fetchedPlans.some(p => p.slug === 'student' || p.id === 'plan_student' || p.name?.toLowerCase().includes('student'));
            if (!hasStudent) {
              setPlans([CANONICAL_PLANS[0], ...fetchedPlans]);
            } else {
              setPlans(fetchedPlans);
            }
          } else {
            setPlans(CANONICAL_PLANS);
          }
      } catch (error) {
        console.error('Error fetching hosting plans:', error);
        setPlans(CANONICAL_PLANS);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleBuyNow = (plan) => {
    const priceObj = calculatePlanPrice(plan);
    const price = billingCycle === 'yearly' || billingCycle === 'annually' ? priceObj.annually : priceObj.monthly;
    
    if (price <= 0) {
      toast.error('Price unavailable for this plan. Please contact us.');
      return;
    }

    addToCart({
      id: `hosting-${plan.slug || plan.id}-${billingCycle}`,
      name: `${plan.name} Hosting Plan`,
      price: price,
      quantity: 1,
      category: 'Hosting & Domains',
      itemType: 'hosting',
      planId: plan.slug || plan.id,
      planSlug: plan.slug || 'starter',
      image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=200',
      billingCycle: billingCycle
    });
    toast.success(`${plan.name} added to cart!`);
    if (onNavigate) {
      onNavigate('/hosting/cart');
    } else {
      navigate('/hosting/cart');
    }
  };

  const getPlanFeatureList = (plan) => {
    if (plan.features && Array.isArray(plan.features) && plan.features.length > 0) {
      return plan.features;
    }
    const cv = plan.comparisonValues || {};
    const list = [];
    if (cv.disk_space) list.push(`${cv.disk_space} Storage`);
    if (cv.bandwidth) list.push(`${cv.bandwidth} Bandwidth`);
    if (cv.addon_domains !== undefined) list.push(`${cv.addon_domains === '0' ? '1 Website (0 Addon)' : cv.addon_domains + ' Addon Domains'}`);
    if (cv.subdomains) list.push(`${cv.subdomains} Subdomains`);
    if (cv.emails) list.push(`${cv.emails} Email Accounts`);
    if (cv.databases) list.push(`${cv.databases} MySQL Databases`);
    if (cv.free_ssl) list.push('Free SSL Certificate');
    if (cv.litespeed) list.push('LiteSpeed Web Server');
    if (cv.daily_backup) list.push('Daily Backup Included');
    if (cv.cpanel) list.push('cPanel Control Panel');
    if (cv.softaculous) list.push('Softaculous 1-Click');
    return list.length > 0 ? list : ['Fast NVMe SSD Storage', 'cPanel & LiteSpeed', 'Free SSL & Daily Backup'];
  };

  return (
    <section id="shared-hosting" className="py-12 bg-gray-50 border-t border-gray-100 scroll-mt-20">
      <div className="container mx-auto px-2 sm:px-4 max-w-7xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-4 border border-blue-100">
            <Zap className="w-3.5 h-3.5" /> High Performance cPanel Hosting
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 uppercase tracking-tight">OUR BEST PRICING</h2>
          <p className="text-gray-500 max-w-2xl mx-auto mt-3 text-sm sm:text-base">
            NVMe SSD powered web hosting backed by CloudLinux, LiteSpeed web server, and 24/7 dedicated support.
          </p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-white rounded-full p-1.5 border border-gray-200 shadow-sm">
            <button
              onClick={() => onBillingCycleChange && onBillingCycleChange('yearly')}
              className={cn(
                "px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all uppercase tracking-wide",
                (billingCycle === 'yearly' || billingCycle === 'annually') ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              Yearly Plan (Save 20%)
            </button>
            <button
              onClick={() => onBillingCycleChange && onBillingCycleChange('monthly')}
              className={cn(
                "px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all uppercase tracking-wide",
                billingCycle === 'monthly' ? "bg-blue-600 text-white shadow-md" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              Monthly Plan
            </button>
          </div>
        </div>

        <div className={cn(
          "grid items-stretch gap-4 sm:gap-5",
          plans.length >= 5 
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5" 
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        )}>
          {plans.map((plan, idx) => {
            const priceObj = calculatePlanPrice(plan);
            const isYearly = billingCycle === 'yearly' || billingCycle === 'annually';
            const displayPrice = isYearly ? priceObj.annually : priceObj.monthly;
            const featureList = getPlanFeatureList(plan);
            const isPopular = plan.popular || plan.slug === 'standard';

            return (
              <div 
                key={plan.id || idx} 
                className={cn(
                  "relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 group",
                  isPopular 
                    ? "bg-white text-gray-900 shadow-[0_20px_50px_rgba(37,99,235,0.12)] border-2 border-blue-500 transform lg:-translate-y-2" 
                    : "bg-white text-gray-900 border border-gray-200 hover:border-gray-300 hover:shadow-xl"
                )}
              >
                {isPopular && (
                  <div className="absolute top-0 inset-x-0 flex justify-center -mt-3.5">
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-widest shadow-md">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-3 rounded-2xl", isPopular ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-700")}>
                      <Server size={28} strokeWidth={1.75} />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 uppercase tracking-wider">
                      {plan.slug || 'Tier ' + (idx + 1)}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold uppercase mb-2 tracking-wide text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mb-6">Best for growing projects & business websites.</p>
                  
                  <div className="mb-6 pb-6 border-b border-gray-100">
                    <p className="text-xs uppercase tracking-wider mb-1 text-gray-400 font-semibold">Starting at</p>
                    <div className="flex items-baseline">
                      <span className="text-2xl font-bold text-gray-500 mr-1">৳</span>
                      <span className={cn("text-4xl sm:text-5xl font-extrabold tracking-tight", isPopular ? "text-blue-600" : "text-gray-900")}>
                        {displayPrice.toLocaleString()}
                      </span>
                      <span className="text-gray-500 text-sm font-medium ml-1.5">
                        /{isYearly ? 'yr' : 'mo'}
                      </span>
                    </div>
                    {isYearly && (
                      <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Includes 20% annual discount
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 text-left">
                    {featureList.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-600">
                        <Check size={16} className={cn("shrink-0 mt-0.5", isPopular ? "text-blue-600" : "text-emerald-500")} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button 
                  onClick={() => handleBuyNow(plan)}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-widest transition-all",
                    isPopular 
                      ? "bg-blue-600 text-white shadow-lg hover:shadow-blue-500/25 hover:bg-blue-700" 
                      : "bg-gray-900 text-white hover:bg-black hover:shadow-md"
                  )}
                >
                  <span>Buy Now</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
