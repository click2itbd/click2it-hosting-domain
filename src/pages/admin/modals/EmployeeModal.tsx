import React from 'react';
import { X, FileText, Upload } from 'lucide-react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase';

interface EmployeeModalProps {
  isAddingEmployee: boolean;
  setIsAddingEmployee: (v: boolean) => void;
  editingEmployee: any;
  employeeFormData: any;
  setEmployeeFormData: (v: any) => void;
  isUploading: boolean;
  handleFileUpload: (f: File | null) => Promise<string | null>;
  fetchData: () => Promise<void>;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isAddingEmployee, setIsAddingEmployee, editingEmployee,
  employeeFormData, setEmployeeFormData, isUploading, handleFileUpload, fetchData
}) => {
  return (
    <>
      {/* Employee Modal */}
      {isAddingEmployee && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl overflow-y-auto max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#081621] text-white">
              <h2 className="text-xl font-bold">{editingEmployee ? 'Edit Employee' : 'New Employee'}</h2>
              <button onClick={() => setIsAddingEmployee(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (editingEmployee) {
                await updateDoc(doc(db, 'employees', editingEmployee.id), employeeFormData);
              } else {
                await addDoc(collection(db, 'employees'), { ...employeeFormData, createdAt: new Date().toISOString() });
              }
              setIsAddingEmployee(false);
              fetchData();
            }} className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <h3 className="font-bold text-gray-800 border-b pb-2">Basic Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Name</label>
                    <input type="text" required className="w-full border-gray-300 rounded-md" value={employeeFormData.name || ''} onChange={e => setEmployeeFormData({...employeeFormData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                    <input type="email" required className="w-full border-gray-300 rounded-md" value={employeeFormData.email || ''} onChange={e => setEmployeeFormData({...employeeFormData, email: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                    <input type="tel" required className="w-full border-gray-300 rounded-md" value={employeeFormData.phone || ''} onChange={e => setEmployeeFormData({...employeeFormData, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Date of Birth</label>
                    <input type="date" required className="w-full border-gray-300 rounded-md" value={employeeFormData.dateOfBirth || ''} onChange={e => setEmployeeFormData({...employeeFormData, dateOfBirth: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">NID Number</label>
                    <input type="text" required className="w-full border-gray-300 rounded-md" value={employeeFormData.nidNumber || ''} onChange={e => setEmployeeFormData({...employeeFormData, nidNumber: e.target.value})} />
                  </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                      <input 
                        list="employee-roles"
                        className="w-full border-gray-300 rounded-md" 
                        value={employeeFormData.role || ''} 
                        onChange={e => setEmployeeFormData({...employeeFormData, role: e.target.value})}
                        placeholder="e.g. Staff, Manager, Content Writer"
                        required 
                      />
                      <datalist id="employee-roles">
                        <option value="Staff" />
                        <option value="Manager" />
                        <option value="Technician" />
                      </datalist>
                    </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <h3 className="font-bold text-gray-800 border-b pb-2">Employment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Join Date</label>
                    <input type="date" required className="w-full border-gray-300 rounded-md" value={employeeFormData.joinDate || ''} onChange={e => setEmployeeFormData({...employeeFormData, joinDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Confirm Date</label>
                    <input type="date" className="w-full border-gray-300 rounded-md" value={employeeFormData.confirmDate || ''} onChange={e => setEmployeeFormData({...employeeFormData, confirmDate: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Base Salary</label>
                    <input type="number" className="w-full border-gray-300 rounded-md" value={employeeFormData.baseSalary || 0} onChange={e => setEmployeeFormData({...employeeFormData, baseSalary: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                    <select className="w-full border-gray-300 rounded-md" value={employeeFormData.status || 'active'} onChange={e => setEmployeeFormData({...employeeFormData, status: e.target.value})}>
                      <option value="active">Active</option>
                      <option value="on_leave">On Leave</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <h3 className="font-bold text-gray-800 border-b pb-2">Attachments</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Certificate</label>
                    <div className="flex items-center gap-2">
                      <input type="file" id="cert-upload" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={async (e) => {
                        const url = await handleFileUpload(e.target.files?.[0] || null);
                        if (url) setEmployeeFormData({...employeeFormData, certificateUrl: url});
                      }} />
                      <label htmlFor="cert-upload" className="cursor-pointer bg-white px-3 py-2 border border-gray-300 rounded-md text-sm text-center flex-1 hover:bg-gray-50 flex items-center justify-center gap-2">
                        <Upload size={14} /> Upload
                      </label>
                      {employeeFormData.certificateUrl && <a href={employeeFormData.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 bg-blue-50 p-2 rounded" title="View Certificate"><FileText size={16} /></a>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">NID Card</label>
                    <div className="flex items-center gap-2">
                      <input type="file" id="nid-upload" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={async (e) => {
                        const url = await handleFileUpload(e.target.files?.[0] || null);
                        if (url) setEmployeeFormData({...employeeFormData, nidUrl: url});
                      }} />
                      <label htmlFor="nid-upload" className="cursor-pointer bg-white px-3 py-2 border border-gray-300 rounded-md text-sm text-center flex-1 hover:bg-gray-50 flex items-center justify-center gap-2">
                        <Upload size={14} /> Upload
                      </label>
                      {employeeFormData.nidUrl && <a href={employeeFormData.nidUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 bg-blue-50 p-2 rounded" title="View NID"><FileText size={16} /></a>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">CV (Soft Copy)</label>
                    <div className="flex items-center gap-2">
                      <input type="file" id="cv-upload" className="hidden" accept=".pdf,.doc,.docx" onChange={async (e) => {
                        const url = await handleFileUpload(e.target.files?.[0] || null);
                        if (url) setEmployeeFormData({...employeeFormData, cvUrl: url});
                      }} />
                      <label htmlFor="cv-upload" className="cursor-pointer bg-white px-3 py-2 border border-gray-300 rounded-md text-sm text-center flex-1 hover:bg-gray-50 flex items-center justify-center gap-2">
                        <Upload size={14} /> Upload
                      </label>
                      {employeeFormData.cvUrl && <a href={employeeFormData.cvUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 bg-blue-50 p-2 rounded" title="View CV"><FileText size={16} /></a>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsAddingEmployee(false)} className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={isUploading} className="px-4 py-2 text-sm font-bold text-white bg-[#EF4444] rounded-md hover:bg-red-600 disabled:opacity-50">Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
