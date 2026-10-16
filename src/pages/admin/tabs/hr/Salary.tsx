import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Employee, EmployeeSalary } from '../../../../types';
import { formatCurrency, cn } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { CreditCard, X, Plus, Edit2, Trash2, CheckCircle, Calendar, DollarSign, User, FileText } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';

const SalaryTab: React.FC = () => {
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const [employeeSalaries, setEmployeeSalaries] = useState<EmployeeSalary[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAddingSalary, setIsAddingSalary] = useState(false);
  const [editingSalary, setEditingSalary] = useState<any>(null);
  const [salaryFormData, setSalaryFormData] = useState<any>({ employeeName: '', month: new Date().toISOString().slice(0, 7), baseAmount: 0, deductions: 0, bonus: 0, netPay: 0, status: 'pending', paymentDate: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const salariesQuery = query(collection(db, 'employee_salaries'), orderBy('createdAt', 'desc'));
      const salariesSnapshot = await getDocs(salariesQuery);
      const salariesData = salariesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeeSalary));
      setEmployeeSalaries(salariesData);

      const employeesQuery = query(collection(db, 'employees'), orderBy('name'));
      const employeesSnapshot = await getDocs(employeesQuery);
      const employeesData = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  if (!isAdmin) {
    return null;
  }

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const netPay = (Number(salaryFormData.baseAmount) || 0) + (Number(salaryFormData.bonus) || 0) - (Number(salaryFormData.deductions) || 0);
      const dataToSave = { ...salaryFormData, netPay };
      
      if (editingSalary) {
        await updateDoc(doc(db, 'employee_salaries', editingSalary.id), dataToSave);
        toast.success('Salary updated successfully');
      } else {
        await addDoc(collection(db, 'employee_salaries'), { ...dataToSave, createdAt: new Date().toISOString() });
        toast.success('Salary recorded successfully');
      }
      setIsAddingSalary(false);
      setEditingSalary(null);
      setSalaryFormData({ employeeName: '', month: new Date().toISOString().slice(0, 7), baseAmount: 0, deductions: 0, bonus: 0, netPay: 0, status: 'pending', paymentDate: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (error) {
      console.error('Error saving salary:', error);
      toast.error('Failed to save salary');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <CreditCard className="text-red-500" size={24} />
            </div>
            Payroll Management
          </h2>
          <p className="text-gray-500 mt-1 text-sm">Manage employee salaries, bonuses, and deductions</p>
        </div>
        <button onClick={() => {
          setEditingSalary(null);
          setSalaryFormData({ employeeName: '', month: new Date().toISOString().slice(0, 7), baseAmount: 0, deductions: 0, bonus: 0, netPay: 0, status: 'pending', paymentDate: new Date().toISOString().split('T')[0] });
          setIsAddingSalary(true);
        }} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-all font-medium text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
          <Plus size={18} />
          Process Salary
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Employee</th>
              <th className="px-6 py-4">Month</th>
              <th className="px-6 py-4">Net Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {employeeSalaries.map(sal => (
              <tr key={sal.id} className="hover:bg-gray-50/80 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{sal.employeeName}</div>
                </td>
                <td className="px-6 py-4 text-gray-500">{sal.month}</td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(sal.netPay || 0, settings)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-full border shadow-sm flex inline-flex items-center gap-1.5",
                    sal.status === 'paid' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}>
                    {sal.status === 'paid' && <CheckCircle size={10} className="text-emerald-500" />}
                    {sal.status || 'pending'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {sal.status !== 'paid' && (
                      <button 
                        onClick={() => {updateDoc(doc(db, 'employee_salaries', sal.id), { status: 'paid', paymentDate: new Date().toISOString() }).then(() => { toast.success('Marked as paid'); fetchData(); })}} 
                        className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        title="Mark as Paid"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => { setEditingSalary(sal); setSalaryFormData(sal); setIsAddingSalary(true); }} 
                      className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => { if(window.confirm('Delete salary record?')) deleteDoc(doc(db, 'employee_salaries', sal.id)).then(() => { toast.success('Deleted'); fetchData(); })}} 
                      className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {employeeSalaries.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <FileText size={40} className="text-gray-300" />
                    <p className="text-base font-medium text-gray-900">No salary records found</p>
                    <p className="text-sm">Process a new salary to see it here.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAddingSalary && (
        <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col transform transition-all">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {editingSalary ? <Edit2 className="text-blue-500" size={20} /> : <Plus className="text-emerald-500" size={20} />}
                {editingSalary ? 'Edit Salary Record' : 'Process New Salary'}
              </h2>
              <button onClick={() => setIsAddingSalary(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveSalary} className="p-6 md:p-8 space-y-8 bg-gray-50/30">
              
              {/* Top Section - Employee & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <User size={16} className="text-gray-400" /> Employee
                  </label>
                  <select required className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all shadow-sm" value={salaryFormData.employeeName || ''} onChange={e => {
                    const empName = e.target.value;
                    const emp = employees.find(e => e.name === empName);
                    setSalaryFormData({...salaryFormData, employeeName: empName, baseAmount: emp ? emp.baseSalary || 0 : 0});
                  }}>
                    <option value="">Select Employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.name}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" /> Salary Month
                  </label>
                  <input type="month" required className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all shadow-sm" value={salaryFormData.month || ''} onChange={e => setSalaryFormData({...salaryFormData, month: e.target.value})} />
                </div>
              </div>

              {/* Financial Details Section */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={18} className="text-emerald-500" />
                  <h3 className="font-semibold text-gray-900">Financial Details</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Base Amount</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 sm:text-sm">$</span>
                      </div>
                      <input type="number" required className="w-full pl-8 pr-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none transition-all font-medium tabular-nums" value={salaryFormData.baseAmount || 0} onChange={e => setSalaryFormData({...salaryFormData, baseAmount: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-emerald-600">Bonus Amount</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-emerald-400 sm:text-sm">$</span>
                      </div>
                      <input type="number" className="w-full pl-8 pr-4 py-2.5 border border-emerald-100 bg-emerald-50/30 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-emerald-700 tabular-nums" value={salaryFormData.bonus || 0} onChange={e => setSalaryFormData({...salaryFormData, bonus: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-red-600">Deductions</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-red-400 sm:text-sm">$</span>
                      </div>
                      <input type="number" className="w-full pl-8 pr-4 py-2.5 border border-red-100 bg-red-50/30 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all font-medium text-red-700 tabular-nums" value={salaryFormData.deductions || 0} onChange={e => setSalaryFormData({...salaryFormData, deductions: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                </div>

                <div className="pt-5 border-t border-gray-100 mt-6 flex justify-between items-center bg-gray-50/50 -mx-6 -mb-6 px-6 py-4 rounded-b-2xl">
                  <span className="font-semibold text-gray-500">Calculated Net Pay</span>
                  <span className="text-2xl font-bold text-gray-900 tracking-tight">
                    {formatCurrency((Number(salaryFormData.baseAmount) || 0) + (Number(salaryFormData.bonus) || 0) - (Number(salaryFormData.deductions) || 0), settings)}
                  </span>
                </div>
              </div>

              {/* Status & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Payment Status</label>
                  <select className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all shadow-sm font-medium" value={salaryFormData.status || 'pending'} onChange={e => setSalaryFormData({...salaryFormData, status: e.target.value})}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                 <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Payment Date</label>
                  <input type="date" className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all shadow-sm font-medium text-gray-700" value={salaryFormData.paymentDate || ''} onChange={e => setSalaryFormData({...salaryFormData, paymentDate: e.target.value})} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddingSalary(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg flex items-center gap-2">
                  <CheckCircle size={18} />
                  {editingSalary ? 'Save Changes' : 'Process Salary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryTab;

