import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, getDocs, orderBy } from 'firebase/firestore';
import { db, storage } from '../../../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Employee } from '../../../../types';
import { formatCurrency, cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { 
  Briefcase, User, X, Upload, FileText, Plus, Search, 
  Edit2, Trash2, Mail, Phone, Calendar, CreditCard, Shield 
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

const EmployeesTab: React.FC = () => {
  const { isAdmin, hasPermission } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [employeeFormData, setEmployeeFormData] = useState<any>({ 
    name: '', email: '', phone: '', role: 'Staff', baseSalary: 0, 
    status: 'active', joinDate: '', confirmDate: '', dateOfBirth: '', 
    nidNumber: '', certificateUrl: '', nidUrl: '', cvUrl: '' 
  });
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleFileUpload = async (file: File | null) => {
    if (!file) return null;
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `hr/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setIsUploading(false);
      return url;
    } catch (err) {
      setIsUploading(false);
      toast.error('File upload failed');
      return null;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const q = query(collection(db, 'employees'), orderBy('name'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  if (!isAdmin) {
    return null;
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Active</span>;
      case 'on_leave':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">On Leave</span>;
      case 'terminated':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">Terminated</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20">{status || 'Active'}</span>;
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Team Members</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your team members and their employment details.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search members..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-64 transition-all"
            />
          </div>
          <button 
            onClick={() => {
              setEditingEmployee(null);
              setEmployeeFormData({ name: '', email: '', phone: '', role: 'Staff', baseSalary: 0, status: 'active', joinDate: '', confirmDate: '', dateOfBirth: '', nidNumber: '', certificateUrl: '', nidUrl: '', cvUrl: '' });
              setIsAddingEmployee(true);
            }} 
            className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium whitespace-nowrap shadow-sm"
          >
             <Plus className="w-4 h-4" /> Add Member
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/50 border-b border-gray-200 text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Member</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 flex items-center justify-center font-semibold text-sm ring-1 ring-black/5 shrink-0">
                        {getInitials(emp.name)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{emp.name}</div>
                        <div className="text-gray-500 text-xs mt-0.5">Joined {new Date(emp.joinDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">{emp.email}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{emp.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{emp.role}</td>
                  <td className="px-6 py-4">{getStatusBadge(emp.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingEmployee(emp); setEmployeeFormData(emp); setIsAddingEmployee(true); }} 
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit member"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { 
                          if(window.confirm('Are you sure you want to remove this team member?')) 
                            deleteDoc(doc(db, 'employees', emp.id)).then(() => fetchData())
                        }} 
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Briefcase className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-base font-medium text-gray-900">No members found</p>
                      <p className="text-sm mt-1">Try adjusting your search or add a new team member.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isAddingEmployee && (
        <div className="fixed inset-0 z-[100] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col my-auto max-h-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingEmployee ? 'Edit Team Member' : 'Add New Member'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Fill in the information below to {editingEmployee ? 'update' : 'create'} the employee profile.</p>
              </div>
              <button 
                onClick={() => setIsAddingEmployee(false)} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (editingEmployee) {
                await updateDoc(doc(db, 'employees', editingEmployee.id), employeeFormData);
              } else {
                await addDoc(collection(db, 'employees'), { ...employeeFormData, createdAt: new Date().toISOString() });
              }
              setIsAddingEmployee(false);
              fetchData();
              toast.success(`Employee successfully ${editingEmployee ? 'updated' : 'added'}`);
            }} className="overflow-y-auto">
              
              <div className="p-6 space-y-8">
                
                {/* Basic Info Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" /> Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-rose-500">*</span></label>
                      <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all" value={employeeFormData.name || ''} onChange={e => setEmployeeFormData({...employeeFormData, name: e.target.value})} placeholder="e.g. Jane Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-rose-500">*</span></label>
                      <input type="email" required className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all" value={employeeFormData.email || ''} onChange={e => setEmployeeFormData({...employeeFormData, email: e.target.value})} placeholder="jane@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number <span className="text-rose-500">*</span></label>
                      <input type="tel" required className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all" value={employeeFormData.phone || ''} onChange={e => setEmployeeFormData({...employeeFormData, phone: e.target.value})} placeholder="+1 (555) 000-0000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth <span className="text-rose-500">*</span></label>
                      <input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all text-gray-700" value={employeeFormData.dateOfBirth || ''} onChange={e => setEmployeeFormData({...employeeFormData, dateOfBirth: e.target.value})} />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Employment Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" /> Employment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Role</label>
                      <input list="roles_list" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all" value={employeeFormData.role || 'Staff'} onChange={e => setEmployeeFormData({...employeeFormData, role: e.target.value})} />
                      <datalist id="roles_list">
                        <option value="Admin" />
                        <option value="Manager" />
                        <option value="Staff" />
                        <option value="Technician" />
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Employment Status</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all bg-white" value={employeeFormData.status || 'active'} onChange={e => setEmployeeFormData({...employeeFormData, status: e.target.value})}>
                        <option value="active">Active</option>
                        <option value="on_leave">On Leave</option>
                        <option value="terminated">Terminated</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Join Date <span className="text-rose-500">*</span></label>
                      <input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all text-gray-700" value={employeeFormData.joinDate || ''} onChange={e => setEmployeeFormData({...employeeFormData, joinDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmation Date</label>
                      <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all text-gray-700" value={employeeFormData.confirmDate || ''} onChange={e => setEmployeeFormData({...employeeFormData, confirmDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Base Salary</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                        <input type="number" className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all" value={employeeFormData.baseSalary || ''} onChange={e => setEmployeeFormData({...employeeFormData, baseSalary: parseFloat(e.target.value) || 0})} placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">NID Number <span className="text-rose-500">*</span></label>
                      <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all" value={employeeFormData.nidNumber || ''} onChange={e => setEmployeeFormData({...employeeFormData, nidNumber: e.target.value})} placeholder="National ID" />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Documents Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" /> Documents & Attachments
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Upload Card 1 */}
                    <div className="border border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-medium text-gray-900 mb-1">Certificate</p>
                      <p className="text-xs text-gray-500 mb-3">PDF, JPG up to 5MB</p>
                      <input type="file" id="cert-upload" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={async (e) => {
                        const url = await handleFileUpload(e.target.files?.[0] || null);
                        if (url) setEmployeeFormData({...employeeFormData, certificateUrl: url});
                      }} />
                      <div className="flex w-full gap-2">
                        <label htmlFor="cert-upload" className="cursor-pointer bg-white px-3 py-2 border border-gray-200 shadow-sm rounded-lg text-sm text-center flex-1 hover:border-gray-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 font-medium">
                          <Upload className="w-4 h-4" /> Upload
                        </label>
                        {employeeFormData.certificateUrl && (
                          <a href={employeeFormData.certificateUrl} target="_blank" rel="noopener noreferrer" className="bg-indigo-50 text-indigo-600 p-2 rounded-lg hover:bg-indigo-100 transition-colors" title="View Document">
                            <FileText className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Upload Card 2 */}
                    <div className="border border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-medium text-gray-900 mb-1">NID Card</p>
                      <p className="text-xs text-gray-500 mb-3">PDF, JPG up to 5MB</p>
                      <input type="file" id="nid-upload" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={async (e) => {
                        const url = await handleFileUpload(e.target.files?.[0] || null);
                        if (url) setEmployeeFormData({...employeeFormData, nidUrl: url});
                      }} />
                      <div className="flex w-full gap-2">
                        <label htmlFor="nid-upload" className="cursor-pointer bg-white px-3 py-2 border border-gray-200 shadow-sm rounded-lg text-sm text-center flex-1 hover:border-gray-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 font-medium">
                          <Upload className="w-4 h-4" /> Upload
                        </label>
                        {employeeFormData.nidUrl && (
                          <a href={employeeFormData.nidUrl} target="_blank" rel="noopener noreferrer" className="bg-indigo-50 text-indigo-600 p-2 rounded-lg hover:bg-indigo-100 transition-colors" title="View Document">
                            <FileText className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Upload Card 3 */}
                    <div className="border border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-medium text-gray-900 mb-1">Resume / CV</p>
                      <p className="text-xs text-gray-500 mb-3">PDF, DOC up to 5MB</p>
                      <input type="file" id="cv-upload" className="hidden" accept=".pdf,.doc,.docx" onChange={async (e) => {
                        const url = await handleFileUpload(e.target.files?.[0] || null);
                        if (url) setEmployeeFormData({...employeeFormData, cvUrl: url});
                      }} />
                      <div className="flex w-full gap-2">
                        <label htmlFor="cv-upload" className="cursor-pointer bg-white px-3 py-2 border border-gray-200 shadow-sm rounded-lg text-sm text-center flex-1 hover:border-gray-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 font-medium">
                          <Upload className="w-4 h-4" /> Upload
                        </label>
                        {employeeFormData.cvUrl && (
                          <a href={employeeFormData.cvUrl} target="_blank" rel="noopener noreferrer" className="bg-indigo-50 text-indigo-600 p-2 rounded-lg hover:bg-indigo-100 transition-colors" title="View Document">
                            <FileText className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 sticky bottom-0 z-10 rounded-b-2xl">
                <button 
                  type="button" 
                  onClick={() => setIsAddingEmployee(false)} 
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isUploading} 
                  className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUploading ? 'Uploading...' : (editingEmployee ? 'Save Changes' : 'Add Member')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesTab;
