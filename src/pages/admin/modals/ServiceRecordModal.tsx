import React from 'react';
import { X } from 'lucide-react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { ServiceRecord } from '../../../types';
import toast from 'react-hot-toast';

interface ServiceRecordModalProps {
  isAddingService: boolean;
  setIsAddingService: (v: boolean) => void;
  editingService: any;
  setEditingService: (v: any) => void;
  serviceFormData: any;
  setServiceFormData: (v: any) => void;
  printServiceReceipt: (record: ServiceRecord) => void;
  fetchData: () => Promise<void>;
}

export const ServiceRecordModal: React.FC<ServiceRecordModalProps> = ({
  isAddingService, setIsAddingService, editingService, setEditingService,
  serviceFormData, setServiceFormData, printServiceReceipt, fetchData
}) => {
  return (
    <>
      {/* Service Record Modal */}
      {isAddingService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingService ? 'Update Service Ticket' : 'New Service Ticket'}</h2>
              <button onClick={() => { setIsAddingService(false); setEditingService(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto w-full">
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Serial Number</label>
                    <input type="text" value={serviceFormData.serialNumber} onChange={e => setServiceFormData({...serviceFormData, serialNumber: e.target.value})} className="w-full border-gray-200 rounded-md bg-gray-50 focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Name</label>
                    <input type="text" value={serviceFormData.productName} onChange={e => setServiceFormData({...serviceFormData, productName: e.target.value})} className="w-full border-gray-200 rounded-md bg-gray-50 focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Equipment Type</label>
                    <input type="text" placeholder="e.g. Laptop, Desktop, Printer" value={serviceFormData.equipmentType} onChange={e => setServiceFormData({...serviceFormData, equipmentType: e.target.value})} className="w-full border-gray-200 rounded-md bg-gray-50 focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Current Status</label>
                    <select value={serviceFormData.status} onChange={e => setServiceFormData({...serviceFormData, status: e.target.value as any})} className="w-full border-gray-200 rounded-md bg-gray-50 focus:bg-white">
                      <option value="received">Received</option>
                      <option value="in_progress">In Progress</option>
                      <option value="ready">Ready for Pickup</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer Name</label>
                    <input type="text" value={serviceFormData.customerName} onChange={e => setServiceFormData({...serviceFormData, customerName: e.target.value})} className="w-full border-gray-200 rounded-md bg-gray-50 focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer Phone</label>
                    <input type="text" value={serviceFormData.customerPhone} onChange={e => setServiceFormData({...serviceFormData, customerPhone: e.target.value})} className="w-full border-gray-200 rounded-md bg-gray-50 focus:bg-white" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Issue Description</label>
                  <textarea value={serviceFormData.issueDescription} onChange={e => setServiceFormData({...serviceFormData, issueDescription: e.target.value})} className="w-full border-gray-200 rounded-md bg-gray-50 focus:bg-white" rows={3}></textarea>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                   <div className="md:col-span-1">
                    <label className="flex items-center gap-2 mt-6 cursor-pointer">
                      <input type="checkbox" checked={serviceFormData.isWarranty} onChange={e => setServiceFormData({...serviceFormData, isWarranty: e.target.checked})} className="rounded text-[#EF4444] focus:ring-[#EF4444]" />
                      <span className="text-sm font-bold">In Warranty</span>
                    </label>
                   </div>
                   {!serviceFormData.isWarranty && (
                     <>
                       <div className="md:col-span-1">
                         <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Service Charge</label>
                         <input type="number" value={serviceFormData.serviceCharge} onChange={e => setServiceFormData({...serviceFormData, serviceCharge: Number(e.target.value)})} className="w-full border-gray-200 rounded-md" />
                       </div>
                       <div className="md:col-span-1">
                         <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Payment Method</label>
                         <select value={serviceFormData.paymentMethod} onChange={e => setServiceFormData({...serviceFormData, paymentMethod: e.target.value})} className="w-full border-gray-200 rounded-md">
                           <option value="cash">Cash</option>
                           <option value="card">Card</option>
                           <option value="mfs">MFS (bKash/Nagad)</option>
                           <option value="media_payment">Media Payment</option>
                         </select>
                       </div>
                       <div className="md:col-span-1">
                         <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Payment Status</label>
                         <select value={serviceFormData.paymentStatus} onChange={e => setServiceFormData({...serviceFormData, paymentStatus: e.target.value as any})} className="w-full border-gray-200 rounded-md">
                           <option value="pending">Pending</option>
                           <option value="paid">Paid</option>
                         </select>
                       </div>
                       {(serviceFormData.paymentMethod === 'media_payment' || serviceFormData.paymentMethod === 'mfs') && (
                         <div className="col-span-2 md:col-span-4 mt-2 border-t border-gray-200 pt-3">
                           <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                             {serviceFormData.paymentMethod === 'media_payment' ? 'Media Payment Reference' : 'MFS Reference / Phone'}
                           </label>
                           <input type="text" placeholder="TrxID or Reference" value={serviceFormData.medeaPayment} onChange={e => setServiceFormData({...serviceFormData, medeaPayment: e.target.value})} className="w-full border-gray-200 rounded-md bg-white" />
                         </div>
                       )}
                     </>
                   )}
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button type="button" onClick={() => { setIsAddingService(false); setEditingService(null); }} className="px-6 py-2 border border-gray-200 rounded-md text-gray-600 font-bold hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={async () => {
                 try {
                   if (editingService) {
                     await updateDoc(doc(db, 'service_records', editingService.id), {
                       ...serviceFormData,
                       updatedAt: new Date().toISOString()
                     });
                     toast.success('Service record updated');
                   } else {
                     const newRecord = {
                       ...serviceFormData,
                       receivedAt: new Date().toISOString(),
                       createdAt: new Date().toISOString()
                     };
                     const docRef = await addDoc(collection(db, 'service_records'), newRecord);
                     toast.success('Service record created');
                     printServiceReceipt({ id: docRef.id, ...newRecord } as ServiceRecord);
                   }
                   setIsAddingService(false);
                   fetchData();
                 } catch (e) {
                   toast.error('Failed to save service record');
                 }
              }} className="px-6 py-2 bg-[#EF4444] text-white rounded-md font-bold hover:bg-red-600">Save Service Ticket</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
