import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { EmployeeLeave, Employee } from '../../../../types';
import { cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  X, 
  CalendarDays, 
  CalendarClock, 
  MoreVertical,
  Check,
  Ban,
  Pencil,
  Trash2,
  CalendarRange,
  AlignLeft,
  User,
  Clock,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

const LeaveTab: React.FC = () => {
  const { isAdmin } = useAuth();
  const [employeeLeaves, setEmployeeLeaves] = useState<EmployeeLeave[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAddingLeave, setIsAddingLeave] = useState(false);
  const [editingLeave, setEditingLeave] = useState<any>(null);
  const [leaveFormData, setLeaveFormData] = useState<any>({ employeeName: '', type: 'casual', startDate: '', endDate: '', reason: '', status: 'pending' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const leavesQuery = query(collection(db, 'employee_leaves'), orderBy('createdAt', 'desc'));
      const leavesSnapshot = await getDocs(leavesQuery);
      const leavesData = leavesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeeLeave));
      setEmployeeLeaves(leavesData);

      const employeesQuery = query(collection(db, 'employees'), orderBy('name'));
      const employeesSnapshot = await getDocs(employeesQuery);
      const employeesData = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load leave records');
    }
  };

  if (!isAdmin) {
    return null;
  }

  const handleSaveLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLeave) {
        await updateDoc(doc(db, 'employee_leaves', editingLeave.id), leaveFormData);
        toast.success('Leave updated successfully');
      } else {
        await addDoc(collection(db, 'employee_leaves'), { ...leaveFormData, createdAt: new Date().toISOString() });
        toast.success('Leave recorded successfully');
      }
      setIsAddingLeave(false);
      setEditingLeave(null);
      setLeaveFormData({ employeeName: '', type: 'casual', startDate: '', endDate: '', reason: '', status: 'pending' });
      fetchData();
    } catch (error) {
      console.error('Error saving leave:', error);
      toast.error('Failed to save leave');
    }
  };

  const handleDeleteLeave = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this leave record?')) {
      try {
        await deleteDoc(doc(db, 'employee_leaves', id));
        toast.success('Leave deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting leave:', error);
        toast.error('Failed to delete leave');
      }
    }
  };

  const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'employee_leaves', id), { status });
      toast.success(`Leave ${status} successfully`);
      fetchData();
    } catch (error) {
      console.error(`Error updating leave status to ${status}:`, error);
      toast.error(`Failed to update leave status`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <Ban className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 capitalize">
        {type || 'casual'}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-600" />
            Leave Management
          </h2>
          <p className="text-slate-500 text-sm mt-1">Track and manage employee leave requests</p>
        </div>
        <button
          onClick={() => {
            setEditingLeave(null);
            setLeaveFormData({ employeeName: '', type: 'casual', startDate: '', endDate: '', reason: '', status: 'pending' });
            setIsAddingLeave(true);
          }}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 font-medium text-sm focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
        >
          <Plus className="w-4 h-4" /> Record Leave
        </button>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Leave Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employeeLeaves.map((leave) => (
                <tr key={leave.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {leave.employeeName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-medium text-slate-700">{leave.employeeName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getTypeBadge(leave.type)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-slate-600 truncate max-w-[200px] sm:max-w-xs" title={leave.reason}>
                      {leave.reason || '-'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(leave.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {leave.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(leave.id, 'approved')}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors tooltip-trigger"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(leave.id, 'rejected')}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors tooltip-trigger"
                            title="Reject"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <div className="w-px h-4 bg-slate-200 mx-1 hidden sm:block"></div>
                      <button
                        onClick={() => {
                          setEditingLeave(leave);
                          setLeaveFormData(leave);
                          setIsAddingLeave(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip-trigger"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLeave(leave.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors tooltip-trigger"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {employeeLeaves.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <CalendarClock className="w-8 h-8 text-slate-300" />
                      </div>
                      <h3 className="text-sm font-medium text-slate-900">No leave records found</h3>
                      <p className="mt-1 text-sm text-slate-500">Get started by creating a new leave request.</p>
                      <button
                        onClick={() => {
                          setEditingLeave(null);
                          setLeaveFormData({ employeeName: '', type: 'casual', startDate: '', endDate: '', reason: '', status: 'pending' });
                          setIsAddingLeave(true);
                        }}
                        className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Record Leave
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leave Form Modal */}
      {isAddingLeave && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col transform transition-all border border-slate-100">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-indigo-600" />
                {editingLeave ? 'Edit Leave Request' : 'New Leave Request'}
              </h2>
              <button
                onClick={() => setIsAddingLeave(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveLeave} className="p-5 sm:p-6 space-y-5">
              <div className="space-y-4">
                {/* Employee Field */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                    <User className="w-4 h-4 text-slate-400" /> Employee
                  </label>
                  <select
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                    value={leaveFormData.employeeName || ''}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, employeeName: e.target.value })}
                  >
                    <option value="">Select Employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Type Field */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                      <ClipboardList className="w-4 h-4 text-slate-400" /> Leave Type
                    </label>
                    <input 
                      list="leave_types_list" 
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all capitalize" 
                      value={leaveFormData.type || 'casual'} 
                      onChange={e => setLeaveFormData({...leaveFormData, type: e.target.value})} 
                    />
                    <datalist id="leave_types_list">
                      <option value="casual" />
                      <option value="sick" />
                      <option value="annual" />
                      <option value="maternity" />
                      <option value="unpaid" />
                    </datalist>
                  </div>

                  {/* Status Field */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                      <MoreVertical className="w-4 h-4 text-slate-400" /> Status
                    </label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                      value={leaveFormData.status || 'pending'}
                      onChange={(e) => setLeaveFormData({ ...leaveFormData, status: e.target.value })}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Reason Field */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                    <AlignLeft className="w-4 h-4 text-slate-400" /> Reason
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Briefly describe the reason for leave..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all resize-none"
                    value={leaveFormData.reason || ''}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingLeave(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors focus:ring-2 focus:ring-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                >
                  {editingLeave ? 'Update Leave' : 'Save Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveTab;
