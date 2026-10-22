import React, { useState, useEffect } from 'react';
import { X, Server, ArrowRight, Zap, Check } from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { HostingAccount } from '../../types';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';

interface HostingUpgradeModalProps {
  account: HostingAccount;
  onClose: () => void;
}

export const HostingUpgradeModal: React.FC<HostingUpgradeModalProps> = ({ account, onClose }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'hostingPlans'), orderBy('order', 'asc')));
        if (!snap.empty) {
          const dbPlans = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPlans(dbPlans.filter(p => p.id !== account.planId));
        }
      } catch (err) {
        console.error('Failed to fetch hosting plans', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [account]);

  const handleSelectPlan = (plan: any) => {
    const upgradeCost = Math.max(Number(plan.monthlyPrice || plan.price || 500), 100);
    const cartProduct: any = {
      id: `upgrade_${account.id}_${plan.id}`,
      name: `Hosting Upgrade: ${account.domain} to ${plan.name}`,
      description: `Upgrade hosting package for ${account.domain} to ${plan.name} plan.`,
      price: upgradeCost,
      category: 'Hosting & Domains',
      stock: 9999,
      images: [],
      createdAt: new Date().toISOString(),
      itemType: 'hosting_upgrade',
      hostingAccountId: account.id,
      domain: account.domain,
      newPlanId: plan.id,
      newPlanName: plan.name,
      newPlanCode: plan.packageSlug || plan.slug || plan.whmPackage || plan.id,
      termYears: 1
    };

    addToCart(cartProduct);
    toast.success(`Upgrade invoice for ${plan.name} generated and added to cart!`);
    onClose();
    navigate('/hosting/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#081621] text-white shrink-0">
          <h3 className="font-bold flex items-center gap-2">
            <Zap className="text-amber-400" size={18} /> Upgrade Hosting Plan
          </h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              You are currently on the <strong>{account.planId || 'Basic'}</strong> plan for <strong className="text-blue-950 font-bold">{account.domain}</strong>.
              Select a higher tier plan below to automatically generate an upgrade invoice. Your package will be updated seamlessly upon payment.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><span className="animate-pulse text-gray-500 font-medium">Loading available hosting packages...</span></div>
          ) : plans.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No higher tier plans available at the moment.</p>
          ) : (
            <div className="grid gap-4">
              {plans.map(plan => (
                <div key={plan.id} className="border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-400 hover:shadow-md transition-all bg-white">
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      {plan.name}
                      {plan.popular && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase">Popular</span>
                      )}
                    </h4>
                    {plan.description && <p className="text-xs text-gray-500 mt-1">{plan.description}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                      {plan.features?.slice(0, 3).map((f: string, i: number) => (
                        <span key={i} className="flex items-center gap-1">
                          <Check size={12} className="text-emerald-600" /> {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 sm:border-l sm:pl-5 border-gray-100">
                    <div className="text-right">
                      <div className="font-black text-blue-600 text-xl">৳{plan.monthlyPrice || plan.price || 0}</div>
                      <span className="text-[11px] text-gray-400">/ billing cycle</span>
                    </div>
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm shadow-blue-200 cursor-pointer"
                    >
                      Upgrade <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
