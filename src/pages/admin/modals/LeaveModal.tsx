import React from 'react';
import { X } from 'lucide-react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase';

interface LeaveModalProps {
  isAddingLeave: boolean;
  setIsAddingLeave: (v: boolean) => void;
  editingLeave: any;
  employees: any[];
  leaveFormData: any;
  setLeaveFormData: (v: any) => void;
  fetchData: () => Promise<void>;
}

export const LeaveModal: React.FC<LeaveModalProps> = ({
  isAddingLeave, setIsAddingLeave, editingLeave,
  employees, leaveFormData, setLeaveFormData, fetchData
}) => {
  return (
    <>
      {/* Leave Modal */}
      {isAddingLeave && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#081621] text-white">
              <h2 className="text-xl font-bold">{editingLeave ? 'Edit Leave Request' : 'New Leave Request'}</h2>
              <button onClick={() => setIsAddingLeave(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (editingLeave) {
                await updateDoc(doc(db, 'employee_leaves', editingLeave.id), leaveFormData);
              } else {
                await addDoc(collection(db, 'employee_leaves'), { ...leaveFormData, createdAt: new Date().toISOString() });
              }
              setIsAddingLeave(false);
              fetchData();
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Employee</label>
                <select required className="w-full border-gray-300 rounded-md" value={leaveFormData.employeeName || ''} onChange={e => setLeaveFormData({...leaveFormData, employeeName: e.target.value})}>
                  <option value="">Select Employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Start Date</label>
                  <input type="date" required className="w-full border-gray-300 rounded-md" value={leaveFormData.startDate || ''} onChange={e => setLeaveFormData({...leaveFormData, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">End Date</label>
                  <input type="date" required className="w-full border-gray-300 rounded-md" value={leaveFormData.endDate || ''} onChange={e => setLeaveFormData({...leaveFormData, endDate: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                    <input 
                      list="leave-types"
                      className="w-full border-gray-300 rounded-md" 
                      value={leaveFormData.type || ''} 
                      onChange={e => setLeaveFormData({...leaveFormData, type: e.target.value.toLowerCase()})}
                      placeholder="e.g. casual, sick, maternity"
                      required
                    />
                    <datalist id="leave-types">
                      <option value="casual" />
                      <option value="sick" />
                      <option value="annual" />
                    </datalist>
                  </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                  <select className="w-full border-gray-300 rounded-md" value={leaveFormData.status || 'pending'} onChange={e => setLeaveFormData({...leaveFormData, status: e.target.value})}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Reason</label>
                <textarea required rows={3} className="w-full border-gray-300 rounded-md" value={leaveFormData.reason || ''} onChange={e => setLeaveFormData({...leaveFormData, reason: e.target.value})}></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsAddingLeave(false)} className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-[#EF4444] rounded-md hover:bg-red-600">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
