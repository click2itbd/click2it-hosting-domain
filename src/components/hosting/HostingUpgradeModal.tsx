import React, { useState, useEffect } from 'react';
import { X, Server, ArrowRight } from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { HostingAccount } from '../../types';

interface HostingUpgradeModalProps {
  account: HostingAccount;
  onClose: () => void;
}

export const HostingUpgradeModal: React.FC<HostingUpgradeModalProps> = ({ account, onClose }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    toast.error('The payment gateway and checkout flow for upgrades are currently under construction.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#081621] text-white shrink-0">
          <h3 className="font-bold flex items-center gap-2">
            <Server size={18} /> Upgrade Hosting Plan
          </h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <p className="text-sm text-gray-600 mb-6">
            You are currently on the <strong>{account.planId || 'Basic'}</strong> plan for <strong className="text-gray-900">{account.domain}</strong>. Select a higher plan below to upgrade.
          </p>

          {loading ? (
            <div className="flex justify-center py-8"><span className="animate-pulse">Loading plans...</span></div>
          ) : plans.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No higher plans available at the moment.</p>
          ) : (
            <div className="grid gap-4">
              {plans.map(plan => (
                <div key={plan.id} className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-300 transition-colors bg-gray-50">
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{plan.name}</h4>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-blue-600 text-lg">৳{plan.monthlyPrice}/mo</div>
                    </div>
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition flex items-center gap-1"
                    >
                      Select <ArrowRight size={16} />
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
