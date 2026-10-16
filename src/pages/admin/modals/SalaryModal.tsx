import React from 'react';
import { X } from 'lucide-react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatCurrency } from '../../../lib/utils';
import { useSettings } from '../../../context/SettingsContext';

interface SalaryModalProps {
  isAddingSalary: boolean;
  setIsAddingSalary: (v: boolean) => void;
  editingSalary: any;
  employees: any[];
  salaryFormData: any;
  setSalaryFormData: (v: any) => void;
  fetchData: () => Promise<void>;
}

export const SalaryModal: React.FC<SalaryModalProps> = ({
  isAddingSalary, setIsAddingSalary, editingSalary,
  employees, salaryFormData, setSalaryFormData, fetchData
}) => {
  const { settings } = useSettings();

  return (
    <>
      {/* Salary Modal */}
      {isAddingSalary && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#081621] text-white">
              <h2 className="text-xl font-bold">{editingSalary ? 'Edit Salary Record' : 'Process Salary'}</h2>
              <button onClick={() => setIsAddingSalary(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const netPay = (Number(salaryFormData.baseAmount) || 0) + (Number(salaryFormData.bonus) || 0) - (Number(salaryFormData.deductions) || 0);
              const dataToSave = { ...salaryFormData, netPay };
              if (editingSalary) {
                await updateDoc(doc(db, 'employee_salaries', editingSalary.id), dataToSave);
              } else {
                await addDoc(collection(db, 'employee_salaries'), { ...dataToSave, createdAt: new Date().toISOString() });
              }
              setIsAddingSalary(false);
              fetchData();
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Employee</label>
                  <select required className="w-full border-gray-300 rounded-md" value={salaryFormData.employeeName || ''} onChange={e => {
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
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Month</label>
                  <input type="month" required className="w-full border-gray-300 rounded-md" value={salaryFormData.month || ''} onChange={e => setSalaryFormData({...salaryFormData, month: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Base Amount</label>
                  <input type="number" required className="w-full border-gray-300 rounded-md" value={salaryFormData.baseAmount || 0} onChange={e => setSalaryFormData({...salaryFormData, baseAmount: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Bonus</label>
                  <input type="number" className="w-full border-gray-300 rounded-md text-green-600" value={salaryFormData.bonus || 0} onChange={e => setSalaryFormData({...salaryFormData, bonus: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Deductions</label>
                  <input type="number" className="w-full border-gray-300 rounded-md text-red-600" value={salaryFormData.deductions || 0} onChange={e => setSalaryFormData({...salaryFormData, deductions: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                <span className="font-bold text-gray-700">Calculated Net Pay:</span>
                <span className="text-xl font-bold text-[#EF4444]">
                  {formatCurrency((Number(salaryFormData.baseAmount) || 0) + (Number(salaryFormData.bonus) || 0) - (Number(salaryFormData.deductions) || 0), settings)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
                  <select className="w-full border-gray-300 rounded-md" value={salaryFormData.status || 'pending'} onChange={e => setSalaryFormData({...salaryFormData, status: e.target.value})}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Payment Date</label>
                  <input type="date" className="w-full border-gray-300 rounded-md" value={salaryFormData.paymentDate || ''} onChange={e => setSalaryFormData({...salaryFormData, paymentDate: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsAddingSalary(false)} className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-[#EF4444] rounded-md hover:bg-red-600">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
