import React, { useState, useEffect } from 'react';
import { Check, ArrowRight, X, Server, Database, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCart } from '../../context/CartContext';
import { useSettings } from '../../context/SettingsContext';
import { toast } from 'react-hot-toast';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import CustomHostingBuilder from './CustomHostingBuilder';

export default function DynamicHostingPlansSection({
  billingCycle,
  onBillingCycleChange,
  onNavigate,
}) {
  const { addToCart } = useCart();
  const { settings } = useSettings();
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  const calculatePlanPrice = (plan) => {
    if (!plan) return { monthly: 0, annually: 0, isOverridden: false };
    
    const licenseCostUsd = plan.pricing?.licenseCostUsd || 0;
    const exchangeRate = settings.apiSettings?.usdToBdtRate || settings.usdToBdtRate || 120;
    const markupPercent = settings.apiSettings?.hostingMarkupPercent || settings.hostingMarkupPercent || 35;
    
    const calculatedMonthly = Math.round(licenseCostUsd * exchangeRate * (1 + markupPercent / 100));
    const calculatedAnnually = Math.round(calculatedMonthly * 12 * 0.8);
    
    if (plan.priceOverride && plan.overridePrice > 0) {
      return { monthly: plan.overridePrice, annually: Math.round(plan.overridePrice * 12 * 0.8), isOverridden: true };
    }
    
    return { monthly: calculatedMonthly, annually: calculatedAnnually, isOverridden: false };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansSnap, featsSnap] = await Promise.all([
          getDocs(query(collection(db, 'hostingPlans'), orderBy('order', 'asc'), limit(100))),
          getDocs(query(collection(db, 'hosting_features'), orderBy('order', 'asc'), limit(100)))
        ]);
        setPlans(plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => p.status === 'published'));
        setFeatures(featsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching dynamic plans:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleBuyNow = (plan) => {
    const calculated = calculatePlanPrice(plan);
    const price = billingCycle === 'annually' ? calculated.annually : calculated.monthly;
    
    if (price <= 0) {
      toast.error('Price unavailable for this plan. Please contact us.');
      return;
    }
    
    addToCart({
      id: `dynamic-hosting-${plan.id}-${billingCycle}`,
      name: plan.name,
      price: price,
      quantity: 1,
      category: 'Hosting & Domains',
      image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=200',
      billingCycle: billingCycle
    });
    toast.success(`${plan.name} added to cart!`);
    onNavigate('/hosting/cart');
  };

  if (loading || plans.length === 0) return null;

  return (
    <section className="py-24 bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-2 sm:px-4 max-w-7xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-[#7B61FF]/10 text-[#7B61FF] rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-4">
            CloudLinux LVE Powered
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 uppercase tracking-tight">Enterprise Grade Hosting</h2>
          <p className="text-gray-500 max-w-2xl mx-auto mt-4">
            Built on robust CloudLinux technology for maximum isolation, stability and performance.
          </p>
          
          <div className="mt-8 flex justify-center gap-2">
            <button onClick={() => onBillingCycleChange('monthly')} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-colors", billingCycle === 'monthly' ? "bg-gray-900 text-white" : "bg-white text-gray-600 shadow-sm border border-gray-200 hover:bg-gray-50")}>Monthly</button>
            <button onClick={() => onBillingCycleChange('annually')} className={cn("px-6 py-2 rounded-full text-sm font-bold transition-colors", billingCycle === 'annually' ? "bg-gray-900 text-white" : "bg-white text-gray-600 shadow-sm border border-gray-200 hover:bg-gray-50")}>Annually (Save 20%)</button>
          </div>
        </div>

        {/* Package Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start mb-20">
          {plans.map((plan, idx) => {
            const calculated = calculatePlanPrice(plan);
            const price = billingCycle === 'annually' ? calculated.annually : calculated.monthly;
            
            return (
            <div key={plan.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-xl hover:border-[#7B61FF] transition-all relative overflow-hidden group">
              <div className="absolute top-0 inset-x-0 h-1 bg-[#7B61FF] transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              
              <h3 className="text-xl font-bold uppercase mb-2 tracking-wide text-gray-900">{plan.name}</h3>
              
              <div className="mb-6">
                {price > 0 ? (
                  <div className="flex items-baseline font-bold text-gray-900">
                    <span className="text-lg mr-1">৳</span>
                    <span className="text-4xl tracking-tighter">{price}</span>
                    <span className="text-gray-500 ml-1 text-sm font-normal">/{billingCycle === 'annually' ? 'yr' : 'mo'}</span>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm py-2">Price unavailable</div>
                )}
                {calculated.isOverridden && (
                  <p className="text-xs text-yellow-600 font-medium mt-1">Manually overridden</p>
                )}
              </div>

              {/* CloudLinux Highlight Box */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center"><Server size={14} className="mr-1"/> CPU Limit</span>
                  <span className="font-bold text-gray-900">{plan.cloudLinuxLimits?.cpu}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center"><Activity size={14} className="mr-1"/> Phys. Memory</span>
                  <span className="font-bold text-gray-900">{plan.cloudLinuxLimits?.pmem} MB</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 flex items-center"><Database size={14} className="mr-1"/> IO Usage</span>
                  <span className="font-bold text-gray-900">{plan.cloudLinuxLimits?.io} MB/s</span>
                </div>
              </div>

              <button 
                onClick={() => handleBuyNow(plan)} 
                disabled={price <= 0}
                className="w-full py-3 rounded-lg font-bold uppercase tracking-wider text-xs transition-all bg-[#7B61FF] text-white hover:bg-purple-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {price > 0 ? 'Order Now' : 'Contact Us'}
              </button>
            </div>
          )})}
        </div>

        {/* Compare Table */}
        {features.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-20">
            <div className="p-6 bg-gray-50 border-b border-gray-200 text-center">
              <h3 className="text-xl font-bold uppercase tracking-wide">Detailed Feature Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b">
                    <th className="p-4 min-w-[120px] sm:min-w-[200px] border-r border-gray-100">Features</th>
                    {plans.map(plan => (
                       <th key={plan.id} className="p-4 text-center font-bold text-lg min-w-[100px] sm:min-w-[150px] border-r border-gray-100 last:border-0">{plan.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {features.map((f, i) => (
                    <tr key={f.id} className={cn("border-b border-gray-100", i % 2 === 0 ? "bg-gray-50/50" : "bg-white")}>
                      <td className="p-4 text-sm font-medium text-gray-700 border-r border-gray-100">{f.name}</td>
                      {plans.map(plan => {
                        const val = plan.comparisonValues?.[f.id];
                        return (
                          <td key={plan.id} className="p-4 text-center border-r border-gray-100 last:border-0">
                            {f.type === 'boolean' ? (
                              val === true ? <Check size={18} className="mx-auto text-green-500" /> : <X size={18} className="mx-auto text-gray-300" />
                            ) : (
                              <span className="text-sm font-bold text-gray-800">{val || '-'}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Custom Builder */}
        <CustomHostingBuilder />
        
      </div>
    </section>
  );
}
