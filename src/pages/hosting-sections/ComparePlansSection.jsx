import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useSettings } from '../../context/SettingsContext';

export default function ComparePlansSection() {
  const { settings } = useSettings();
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  const calculatePlanPrice = (plan) => {
    if (!plan) return { monthly: 0, annually: 0 };
    
    const licenseCostUsd = plan.pricing?.licenseCostUsd || 0;
    const exchangeRate = settings.apiSettings?.usdToBdtRate || settings.usdToBdtRate || 120;
    const markupPercent = settings.apiSettings?.hostingMarkupPercent || settings.hostingMarkupPercent || 35;
    
    const calculatedMonthly = Math.round(licenseCostUsd * exchangeRate * (1 + markupPercent / 100));
    const calculatedAnnually = Math.round(calculatedMonthly * 12 * 0.8);
    
    if (plan.priceOverride && plan.overridePrice > 0) {
      return { monthly: plan.overridePrice, annually: Math.round(plan.overridePrice * 12 * 0.8) };
    }
    
    return { monthly: calculatedMonthly, annually: calculatedAnnually };
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const [plansSnap, featsSnap] = await Promise.all([
          getDocs(query(collection(db, 'hostingPlans'), orderBy('order', 'asc'))),
          getDocs(query(collection(db, 'hosting_features'), orderBy('order', 'asc')))
        ]);
        const fetchedPlans = plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => p.status === 'published');
        const fetchedFeatures = featsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (fetchedPlans.length > 0) {
          setPlans(fetchedPlans);
          setFeatures(fetchedFeatures);
        } else {
          setPlans([
            {
              id: 'plan_starter',
              name: 'Starter',
              pricing: { monthly: 150, annually: 1440 },
              priceOverride: true,
              overridePrice: 150,
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
              pricing: { monthly: 350, annually: 3360 },
              priceOverride: true,
              overridePrice: 350,
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
              pricing: { monthly: 650, annually: 6240 },
              priceOverride: true,
              overridePrice: 650,
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
              pricing: { monthly: 1200, annually: 11520 },
              priceOverride: true,
              overridePrice: 1200,
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
          ]);
          setFeatures([
            { id: 'disk_space', name: 'Storage Space' },
            { id: 'bandwidth', name: 'Bandwidth' },
            { id: 'addon_domains', name: 'Addon Domains' },
            { id: 'subdomains', name: 'Subdomains' },
            { id: 'emails', name: 'Email Accounts' },
            { id: 'databases', name: 'MySQL Databases' },
            { id: 'free_ssl', name: 'Free SSL Certificate' },
            { id: 'litespeed', name: 'LiteSpeed Web Server' },
            { id: 'daily_backup', name: 'Daily Backup' },
            { id: 'cpanel', name: 'cPanel Control Panel' },
            { id: 'softaculous', name: 'Softaculous' }
          ]);
        }
      } catch (error) {
        console.error("Error fetching compare plans", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  if (loading || plans.length === 0) return null;

  const allFeatureIds = features.map(f => f.id);

  return (
    <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900 uppercase tracking-tight">Compare Plan Features</h2>
        <p className="mt-3 text-base text-gray-600">A detailed breakdown of CloudLinux resources, limits, and server features.</p>
      </div>
      
      <div className="overflow-x-auto shadow-xl rounded-2xl ring-1 ring-gray-200 bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-5 px-6 font-semibold text-gray-900 min-w-[140px] sm:min-w-[220px]">Feature</th>
              {plans.map((plan, idx) => {
                const price = calculatePlanPrice(plan);
                const isPopular = plan.popular || plan.slug === 'standard';
                return (
                  <th key={plan.id} className={`py-5 px-6 font-bold text-gray-900 text-center min-w-[120px] sm:min-w-[160px] ${isPopular ? 'bg-blue-50/70 border-x border-blue-200' : ''}`}>
                    <div className="uppercase tracking-wider">{plan.name}</div>
                    <div className="text-sm font-semibold text-blue-600 mt-1">
                      {price.monthly > 0 ? `৳${price.monthly.toLocaleString()}/mo` : 'Custom'}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {allFeatureIds.map((featureId) => {
              const feature = features.find(f => f.id === featureId);
              return (
                <tr key={featureId} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-4 px-6 text-gray-800 font-medium">{feature?.name || featureId}</td>
                  {plans.map((plan, pIdx) => {
                    const value = plan.comparisonValues?.[featureId];
                    const isBool = typeof value === 'boolean' || value === 'true' || value === 'false' || value === 'yes' || value === 'no';
                    const isPositive = value === true || value === 'true' || value === 'yes';
                    const isPopular = plan.popular || plan.slug === 'standard';
                    
                    return (
                      <td key={plan.id} className={`py-4 px-6 text-center border-r border-gray-100 last:border-0 ${isPopular ? 'bg-blue-50/20' : ''}`}>
                        {isBool ? (
                          isPositive ? (
                            <span className="inline-flex items-center justify-center p-1 bg-emerald-50 text-emerald-600 rounded-full">
                              <Check size={16} strokeWidth={2.5} />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center p-1 bg-gray-100 text-gray-400 rounded-full">
                              <X size={16} strokeWidth={2.5} />
                            </span>
                          )
                        ) : (
                          <span className="font-semibold text-gray-800">{value !== undefined && value !== null ? value : '-'}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
