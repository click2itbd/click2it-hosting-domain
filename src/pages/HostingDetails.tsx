import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { HostingPlan, HostingService } from '../types';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import HostingPlanCard from '../components/hosting/HostingPlanCard';
import HostingPlanComparison from '../components/hosting/HostingPlanComparison';

export const HostingDetails: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
  const [service, setService] = useState<HostingService | null>(null);
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const fetchData = async () => {
      if (!serviceId) return;
      try {
        setLoading(true);
        const serviceRef = doc(db, 'hostingServices', serviceId);
        const serviceSnap = await getDoc(serviceRef);
        if (serviceSnap.exists()) {
          setService({ id: serviceSnap.id, ...serviceSnap.data() } as HostingService);
        }

        const q = query(
          collection(db, 'hostingPlans'),
          where('serviceId', '==', serviceId)
        );
        const querySnapshot = await getDocs(q);
        const plansData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HostingPlan[];
        
        plansData.sort((a, b) => (a.order || 0) - (b.order || 0));
        setPlans(plansData);
      } catch (error) {
        console.error("Error fetching hosting details", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [serviceId]);

  const handleAddToCart = (plan: HostingPlan) => {
    if (!service) return;
    const cycleLabel = billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
    const product = {
      id: `hosting_${plan.id}`,
      name: `${service.title} - ${plan.name} (${cycleLabel})`,
      description: plan.features.join(', '),
      price: billingCycle === 'yearly' ? plan.price * 10 : plan.price,
      category: 'Hosting & Domains',
      stock: 9999,
      images: [],
      createdAt: new Date().toISOString()
    };
    addToCart(product as any);
    toast.success(`${plan.name} plan added to cart`);
    navigate('/hosting/cart');
  };

  return (
    <Layout>
      <div className="bg-[#081621] text-white py-16">
        <div className="container mx-auto px-2 sm:px-4">
          <button 
            onClick={() => navigate('/hosting')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Services
          </button>
          
          {loading ? (
             <div className="animate-pulse flex space-x-4">
               <div className="flex-1 space-y-6 py-1">
                 <div className="h-8 bg-gray-700 rounded w-1/4"></div>
                 <div className="space-y-3">
                   <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                 </div>
               </div>
             </div>
          ) : service ? (
            <>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center gap-4">
                {service.iconPath && <span className="text-5xl">{service.iconPath}</span>}
                {service.title}
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl">{service.description}</p>
            </>
          ) : (
            <h1 className="text-4xl font-bold text-red-500">Service Not Found</h1>
          )}
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-16">
        <div className="flex items-center justify-center gap-4 mb-12">
          <h2 className="text-3xl font-bold text-center">Choose Your Plan</h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white shadow text-[#EF4444]' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${billingCycle === 'yearly' ? 'bg-white shadow text-[#EF4444]' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Yearly
            </button>
          </div>
        </div>

        {loading ? (
            <div className="flex justify-center text-gray-500">Loading plans...</div>
        ) : plans.length > 0 ? (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {plans.map(plan => (
                      <div key={plan.id}>
                        <HostingPlanCard 
                          plan={plan} 
                          billingCycle={billingCycle}
                          onAddToCart={() => handleAddToCart(plan)}
                        />
                      </div>
                  ))}
              </div>

              <div>
                <h3 className="text-2xl font-bold text-center mb-8">Compare Plans</h3>
                <HostingPlanComparison 
                  plans={plans} 
                  billingCycle={billingCycle}
                  onSelectPlan={(planId) => {
                    const plan = plans.find(p => p.id === planId);
                    if (plan) handleAddToCart(plan);
                  }}
                />
              </div>
            </div>
        ) : (
            <div className="text-center text-gray-500">No hosting plans available for this service right now.</div>
        )}
      </div>
    </Layout>
  );
};
