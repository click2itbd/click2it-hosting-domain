import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Server, X } from 'lucide-react';
import { HostingService } from '../../../types';

export const HostingServicesManager: React.FC = () => {
  const [hostingServices, setHostingServices] = useState<HostingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingHostingService, setIsAddingHostingService] = useState(false);
  const [editingHostingService, setEditingHostingService] = useState<HostingService | null>(null);
  const [hostingServiceFormData, setHostingServiceFormData] = useState({
    title: '',
    description: '',
    iconPath: '',
    startingPrice: 0,
    billingCycle: '/mo',
    currency: 'BDT',
    order: 0,
    isActive: true,
  });
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string; message: string; onConfirm: () => void } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'hostingServices'), orderBy('order', 'asc'), limit(100)));
      setHostingServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as HostingService)));
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveHostingService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const serviceData = {
        ...hostingServiceFormData,
      };

      if (editingHostingService) {
        await updateDoc(doc(db, 'hostingServices', editingHostingService.id), serviceData);
        toast.success('Service updated successfully');
      } else {
        await addDoc(collection(db, 'hostingServices'), serviceData);
        toast.success('Service added successfully');
      }

      setIsAddingHostingService(false);
      setEditingHostingService(null);
      setHostingServiceFormData({ title: '', description: '', iconPath: '', startingPrice: 0, billingCycle: '/mo', currency: 'BDT', order: 0, isActive: true });
      fetchData();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Failed to save service');
    }
  };

  const handleDeleteHostingService = async (id: string) => {
    setConfirmDelete({
      id,
      title: 'Delete Hosting Service',
      message: 'Are you sure you want to delete this service category?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'hostingServices', id));
          toast.success('Service deleted');
          fetchData();
        } catch (error) {
          console.error('Error deleting service:', error);
          toast.error('Failed to delete service');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Server className="text-[#EF4444]" />
            <h2 className="text-xl font-bold">Hosting Services</h2>
          </div>
          <button
            onClick={() => {
              setEditingHostingService(null);
              setHostingServiceFormData({ title: '', description: '', iconPath: '', startingPrice: 0, billingCycle: '/mo', currency: 'BDT', order: 0, isActive: true });
              setIsAddingHostingService(true);
            }}
            className="bg-[#EF4444] text-white px-4 py-2 rounded-md font-bold flex items-center gap-2 transition-all hover:bg-red-600"
          >
            <Plus size={18} /> Add Service Category
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#081621] text-white text-xs uppercase">
              <tr>
                <th className="px-6 py-4">Icon/Title</th>
                <th className="px-6 py-4">Starting Price</th>
                <th className="px-6 py-4">Order</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hostingServices.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold">{service.title}</span>
                      <span className="text-xs text-gray-500">{service.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#EF4444] font-bold">
                    {service.startingPrice} {service.currency || 'BDT'} {service.billingCycle}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600">#{service.order}</span>
                  </td>
                  <td className="px-6 py-4">
                    {service.isActive ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Active</span> : <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Inactive</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingHostingService(service);
                          setHostingServiceFormData({
                            title: service.title,
                            description: service.description,
                            iconPath: service.iconPath,
                            startingPrice: service.startingPrice,
                            billingCycle: service.billingCycle,
                            currency: service.currency || 'BDT',
                            order: service.order || 0,
                            isActive: service.isActive,
                          });
                          setIsAddingHostingService(true);
                        }}
                        className="bg-gray-100 p-2 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit Service"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteHostingService(service.id)}
                        className="bg-gray-100 p-2 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Service"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {hostingServices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No hosting services created yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Hosting Service Modal */}
      {isAddingHostingService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingHostingService ? 'Edit' : 'Create'} Hosting Service</h2>
              <button onClick={() => { setIsAddingHostingService(false); setEditingHostingService(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveHostingService} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service Title</label>
                <input
                  type="text"
                  required
                  value={hostingServiceFormData.title}
                  onChange={e => setHostingServiceFormData({ ...hostingServiceFormData, title: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  placeholder="e.g. Domain, VPS"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  value={hostingServiceFormData.description}
                  onChange={e => setHostingServiceFormData({ ...hostingServiceFormData, description: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  placeholder="Short description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Starting Price</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={hostingServiceFormData.startingPrice}
                    onChange={e => setHostingServiceFormData({ ...hostingServiceFormData, startingPrice: Number(e.target.value) })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Billing Cycle</label>
                  <input
                    type="text"
                    required
                    value={hostingServiceFormData.billingCycle}
                    onChange={e => setHostingServiceFormData({ ...hostingServiceFormData, billingCycle: e.target.value })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                    placeholder="e.g. /Year"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Icon Path (optional)</label>
                <input
                  type="text"
                  value={hostingServiceFormData.iconPath}
                  onChange={e => setHostingServiceFormData({ ...hostingServiceFormData, iconPath: e.target.value })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  placeholder="e.g. /icons/hosting.svg or lucide icon name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Order</label>
                <input
                  type="number"
                  required
                  value={hostingServiceFormData.order}
                  onChange={e => setHostingServiceFormData({ ...hostingServiceFormData, order: Number(e.target.value) })}
                  className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  placeholder="e.g. 1"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={hostingServiceFormData.isActive}
                  onChange={e => setHostingServiceFormData({ ...hostingServiceFormData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-[#EF4444] focus:ring-[#EF4444]"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
              </div>
              <button
                type="submit"
                className="w-full bg-[#EF4444] text-white py-3 rounded-md font-bold hover:bg-red-600 transition-all"
              >
                {editingHostingService ? 'Update Service' : 'Create Service'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{confirmDelete.title}</h3>
            <p className="text-gray-600 leading-relaxed mb-6">{confirmDelete.message}</p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDelete.onConfirm();
                  setConfirmDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
