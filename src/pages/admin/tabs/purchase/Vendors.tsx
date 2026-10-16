import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Vendor } from '../../../../types';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { Pagination } from '../../../../components/common/Pagination';
import {
  Briefcase,
  Plus,
  Trash2,
  Edit2,
  FileText,
} from 'lucide-react';

interface VendorsProps {
  setSelectedLedgerEntity?: (entity: { id: string; name: string; type: 'customer' | 'vendor' }) => void;
  setActiveTab?: (tab: string) => void;
}

const Vendors: React.FC<VendorsProps> = ({
  setSelectedLedgerEntity,
  setActiveTab,
}) => {
  const { isAdmin, hasPermission } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [vendorFormData, setVendorFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    category: 'General',
  });

  const fetchVendors = async () => {
    try {
      const q = query(collection(db, 'vendors'), orderBy('name'));
      const snap = await getDocs(q);
      setVendors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load vendors');
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const vendorData = {
        ...vendorFormData,
        createdAt: new Date().toISOString(),
      };

      if (editingVendor) {
        await updateDoc(doc(db, 'vendors', editingVendor.id), vendorData);
        toast.success('Vendor updated successfully');
      } else {
        await addDoc(collection(db, 'vendors'), vendorData);
        toast.success('Vendor added successfully');
      }

      setIsAddingVendor(false);
      setEditingVendor(null);
      setVendorFormData({ name: '', email: '', phone: '', address: '', category: 'General' });
      fetchVendors();
    } catch (error) {
      console.error('Error saving vendor:', error);
      toast.error('Failed to save vendor');
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'vendors', id));
      toast.success('Vendor deleted');
      fetchVendors();
    } catch (error) {
      toast.error('Failed to delete vendor');
    }
  };

  const handleViewLedger = (vendor: Vendor) => {
    if (setSelectedLedgerEntity) {
      setSelectedLedgerEntity({ id: vendor.id, name: vendor.name, type: 'vendor' });
    }
    if (setActiveTab) {
      setActiveTab('ledger');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Briefcase className="text-[#EF4444]" /> Vendor Management
        </h2>
        {hasPermission('manage_inventory') && (
          <button
            onClick={() => setIsAddingVendor(true)}
            className="bg-[#081621] text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-[#EF4444] transition-all font-bold text-sm"
          >
            <Plus size={18} /> Add Vendor
          </button>
        )}
      </div>

      {(isAddingVendor || editingVendor) && (
        <form onSubmit={handleSaveVendor} className="p-6 bg-gray-50 border-b border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company / Vendor Name</label>
              <input
                type="text"
                required
                value={vendorFormData.name}
                onChange={e => setVendorFormData({ ...vendorFormData, name: e.target.value })}
                className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
              <input
                type="email"
                value={vendorFormData.email}
                onChange={e => setVendorFormData({ ...vendorFormData, email: e.target.value })}
                className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
              <input
                type="tel"
                value={vendorFormData.phone}
                onChange={e => setVendorFormData({ ...vendorFormData, phone: e.target.value })}
                className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
              <select
                value={vendorFormData.category}
                onChange={e => setVendorFormData({ ...vendorFormData, category: e.target.value })}
                className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
              >
                <option value="General">General</option>
                <option value="Hardware">Hardware</option>
                <option value="Software">Software</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
              <input
                type="text"
                required
                value={vendorFormData.address}
                onChange={e => setVendorFormData({ ...vendorFormData, address: e.target.value })}
                className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-[#EF4444] text-white py-2 rounded-md font-bold hover:bg-red-600 transition-all"
              >
                {editingVendor ? 'Update Vendor' : 'Save Vendor'}
              </button>
              <button
                type="button"
                onClick={() => { setIsAddingVendor(false); setEditingVendor(null); }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md font-bold hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
            <tr>
              <th className="px-6 py-4">Vendor Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vendors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(vendor => (
              <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleViewLedger(vendor)}
                    className="font-medium text-sm text-[#EF4444] hover:underline text-left"
                  >
                    {vendor.name}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{vendor.category}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-600">{vendor.email}</span>
                    <span className="text-xs text-gray-400">{vendor.phone}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleViewLedger(vendor)}
                      className="p-2 text-[#EF4444] hover:bg-red-50 rounded-md transition-all"
                      title="View Ledger"
                    >
                      <FileText size={18} />
                    </button>
                    {hasPermission('manage_inventory') && (
                      <button
                        onClick={() => { setEditingVendor(vendor); setVendorFormData({ ...vendor }); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        title="Edit Vendor"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteVendor(vendor.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={vendors.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};

export default Vendors;
