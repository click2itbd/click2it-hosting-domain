import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { formatCurrency, cn } from '../../../lib/utils';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingsContext';
import { Server, Edit, Trash2, Plus, X } from 'lucide-react';

const SpecialPlansTab: React.FC = () => {
  const { isAdmin, hasPermission } = useAuth();
  const { settings } = useSettings();

  const [specialPlans, setSpecialPlans] = useState<any[]>([]);
  const [isAddingSpecialPlan, setIsAddingSpecialPlan] = useState(false);
  const [editingSpecialPlan, setEditingSpecialPlan] = useState<any>(null);
  const [hostingPlanFormData, setSpecialPlanFormData] = useState({
    serviceId: 'default-service',
    name: '',
    price: 0,
    billingCycle: '',
    features: [] as (string | { name: string; value: string })[],
    popular: false,
    order: 0,
  });

  const fetchData = async () => {
    try {
      const specialPlansSnap = await getDocs(query(collection(db, 'specialPlans'), orderBy('order', 'asc')));
      setSpecialPlans(specialPlansSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching hosting plans:', error);
      toast.error('Failed to load hosting plans');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSpecialPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const planData = {
        ...hostingPlanFormData,
        createdAt: new Date().toISOString(),
      };

      if (editingSpecialPlan) {
        await updateDoc(doc(db, 'specialPlans', editingSpecialPlan.id), planData);
        toast.success('Plan updated successfully');
      } else {
        await addDoc(collection(db, 'specialPlans'), planData);
        toast.success('Plan added successfully');
      }

      setIsAddingSpecialPlan(false);
      setEditingSpecialPlan(null);
      setSpecialPlanFormData({ serviceId: 'default-service', name: '', price: 0, billingCycle: '', features: [], popular: false, order: 0 });
      fetchData();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    }
  };

  const handleDeleteSpecialPlan = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'specialPlans', id));
      toast.success('Plan deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Server className="text-[#EF4444]" />
                <h2 className="text-xl font-bold">Special Plans</h2>
              </div>
              <button
                onClick={() => setIsAddingSpecialPlan(true)}
                className="bg-[#EF4444] text-white px-4 py-2 rounded-md font-bold flex items-center gap-2 transition-all hover:bg-red-600"
              >
                <Plus size={18} /> Add Plan
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#081621] text-white text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Plan Name</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Billing Cycle</th>
                    <th className="px-6 py-4">Order</th>
                    <th className="px-6 py-4">Popular</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {specialPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold">{plan.name}</td>
                      <td className="px-6 py-4 text-[#EF4444] font-bold">{formatCurrency(plan.price, settings)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{plan.billingCycle}</td>
                      <td className="px-6 py-4">
                         <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">#{plan.order}</span>
                      </td>
                      <td className="px-6 py-4">
                         {plan.popular ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold w-fit">Popular</span> : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingSpecialPlan(plan);
                              setSpecialPlanFormData({
                                serviceId: plan.serviceId || 'default-service',
                                name: plan.name,
                                price: plan.price,
                                billingCycle: plan.billingCycle,
                                features: plan.features || [],
                                popular: plan.popular || false,
                                order: plan.order || 0
                              });
                              setIsAddingSpecialPlan(true);
                            }}
                            className="bg-gray-100 p-2 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Plan"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteSpecialPlan(plan.id)}
                            className="bg-gray-100 p-2 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Plan"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {specialPlans.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">No hosting plans created yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {isAddingSpecialPlan && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg w-full max-w-2xl">
                  <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">
                      {editingSpecialPlan ? 'Edit Special Plan' : 'Add Special Plan'}
                    </h3>
                    <button onClick={() => {
                      setIsAddingSpecialPlan(false);
                      setEditingSpecialPlan(null);
                      setSpecialPlanFormData({ serviceId: 'default-service', name: '', price: 0, billingCycle: '', features: [], popular: false, order: 0 });
                    }} className="text-gray-400 hover:text-gray-600">
                      <X size={24} />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSaveSpecialPlan} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                        <input
                          type="text"
                          required
                          value={hostingPlanFormData.name}
                          onChange={(e) => setSpecialPlanFormData({ ...hostingPlanFormData, name: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                        <input
                          type="number"
                          required
                          value={hostingPlanFormData.price}
                          onChange={(e) => setSpecialPlanFormData({ ...hostingPlanFormData, price: parseFloat(e.target.value) })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. /mo or /year"
                          value={hostingPlanFormData.billingCycle}
                          onChange={(e) => setSpecialPlanFormData({ ...hostingPlanFormData, billingCycle: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                        <input
                          type="number"
                          value={hostingPlanFormData.order}
                          onChange={(e) => setSpecialPlanFormData({ ...hostingPlanFormData, order: parseInt(e.target.value) })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Features *</label>
                          <div className="space-y-3">
                            {hostingPlanFormData.features.map((feature: any, index: number) => {
                               // Handle legacy string features
                               const fName = typeof feature === 'string' ? feature : feature.name;
                               const fValue = typeof feature === 'string' ? 'yes' : feature.value;
                               return (
                                 <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                  <input
                                    type="text"
                                    placeholder="Feature Name (e.g., Storage)"
                                    value={fName}
                                    onChange={(e) => {
                                      const newFeatures = [...hostingPlanFormData.features];
                                      newFeatures[index] = { name: e.target.value, value: fValue };
                                      setSpecialPlanFormData({ ...hostingPlanFormData, features: newFeatures });
                                    }}
                                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Value (e.g., 10 GB SSD, yes, no)"
                                    value={fValue}
                                    onChange={(e) => {
                                      const newFeatures = [...hostingPlanFormData.features];
                                      newFeatures[index] = { name: fName, value: e.target.value };
                                      setSpecialPlanFormData({ ...hostingPlanFormData, features: newFeatures });
                                    }}
                                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newFeatures = [...hostingPlanFormData.features];
                                      newFeatures.splice(index, 1);
                                      setSpecialPlanFormData({ ...hostingPlanFormData, features: newFeatures });
                                    }}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                               );
                            })}
                            <button
                              type="button"
                              onClick={() => setSpecialPlanFormData({
                                ...hostingPlanFormData,
                                features: [...hostingPlanFormData.features, { name: '', value: '' }]
                              })}
                              className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700"
                            >
                              <Plus size={16} /> Add Feature
                            </button>
                          </div>
                        </div>

                      <div className="md:col-span-2">
                         <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                           <input
                             type="checkbox"
                             checked={hostingPlanFormData.popular}
                             onChange={(e) => setSpecialPlanFormData({ ...hostingPlanFormData, popular: e.target.checked })}
                             className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                           />
                           Mark as Popular Plan
                         </label>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSpecialPlan(false);
                          setEditingSpecialPlan(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#EF4444] text-white rounded-md hover:bg-red-600"
                      >
                        {editingSpecialPlan ? 'Update Plan' : 'Save Plan'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
  );
};

export default SpecialPlansTab;
