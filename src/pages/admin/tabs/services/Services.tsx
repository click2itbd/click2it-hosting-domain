import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where, limit } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { logAudit } from '../../../../lib/audit';
import { formatCurrency, cn } from '../../../../lib/utils';
import { useAuth } from '../../../../context/AuthContext';
import { useSettings } from '../../../../context/SettingsContext';
import {  ShieldCheck, Search, Filter, Wrench, Printer, RefreshCw, X, Plus, Settings, FileText, Download, Edit2, Truck, CheckCircle, Clock, AlertCircle, Package, MessageCircle, ShoppingCart , Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ServiceRecord {
  id: string;
  serialNumber: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  issueDescription: string;
  isWarranty: boolean;
  serviceCharge: number;
  status: string;
  receivedAt: string;
  equipmentType?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  
  // RMA Fields
  serviceType?: 'in_house' | 'rma';
  vendorId?: string;
  rmaStatus?: 'Pending Vendor' | 'Sent to Vendor' | 'Received from Vendor' | 'Delivered';
  newSerialNumber?: string;
  outsourceCost?: number;
  outsourcePaidAmount?: number;
  outsourcePaymentMethod?: string;
  outsourceTxPurchaseId?: string;
  outsourceTxPaymentId?: string;
  isOutsourced?: boolean;
}

interface SoldSerial {
  id: string;
  serial: string;
  productName: string;
  customerName: string;
  customerPhone: string;
  warrantyEndDate: string;
  soldAt: string;
  orderId: string;
}

interface ServicesProps {
  setActiveTab?: (tab: string) => void;
}

const Services: React.FC<ServicesProps> = ({ setActiveTab }) => {
  const { isAdmin, hasPermission, profile } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [soldSerials, setSoldSerials] = useState<SoldSerial[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [vendors, setVendors] = useState<{id: string; name: string}[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  
  const defaultFormData: any = {
    serialNumber: '',
    customerName: '',
    customerPhone: '',
    productName: '',
    issueDescription: '',
    isWarranty: false,
    serviceCharge: 0,
    status: 'received',
    equipmentType: 'Laptop',
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    serviceType: 'in_house' as 'in_house' | 'rma',
    vendorId: '',
    rmaStatus: 'Pending Vendor' as any,
    newSerialNumber: '',
  };
  
  const [serviceFormData, setServiceFormData] = useState(defaultFormData);
  const [ledgerView, setLedgerView] = useState<'ledger' | 'products'>('products');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      // 1. Query sold_serials directly
      const serialsSnap = await getDocs(query(collection(db, 'sold_serials'), orderBy('soldAt', 'desc')));
      const serials: SoldSerial[] = serialsSnap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          serial: data.serial || '',
          productName: data.productName || 'Product',
          customerName: data.customerName || 'Walk-in Customer',
          customerPhone: data.customerPhone || '',
          warrantyEndDate: data.warrantyEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          soldAt: data.soldAt || new Date().toISOString(),
          orderId: data.orderId || data.orderDocumentNumber || docSnap.id,
        };
      });

      // 2. Also check recent orders for any items with selectedSerials
      const ordersSnap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100)));
      ordersSnap.forEach(orderDoc => {
        const orderData = orderDoc.data();
        if (orderData.items && Array.isArray(orderData.items)) {
          orderData.items.forEach((itm: any) => {
            if (itm.selectedSerials && Array.isArray(itm.selectedSerials)) {
              itm.selectedSerials.forEach((ser: string) => {
                if (!serials.some(s => s.serial.toLowerCase() === ser.toLowerCase())) {
                  const months = itm.warrantyMonths || 12;
                  const soldDate = orderData.createdAt || new Date().toISOString();
                  const endD = new Date(new Date(soldDate).getTime() + months * 30 * 24 * 60 * 60 * 1000).toISOString();
                  serials.push({
                    id: `${orderDoc.id}-${ser}`,
                    serial: ser,
                    productName: itm.name || 'Product',
                    customerName: orderData.customerName || 'Customer',
                    customerPhone: orderData.customerPhone || '',
                    warrantyEndDate: endD,
                    soldAt: soldDate,
                    orderId: orderData.documentNumber || orderDoc.id,
                  });
                }
              });
            }
          });
        }
      });

        setSoldSerials(serials);
  
        // 3. Fetch Service Records
        const servicesSnap = await getDocs(query(collection(db, 'services'), orderBy('receivedAt', 'desc')));
        setServiceRecords(servicesSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            serviceType: data.serviceType || 'in_house',
            vendorId: data.vendorId || '',
            rmaStatus: data.rmaStatus || 'Pending Vendor',
            newSerialNumber: data.newSerialNumber || '',
          } as ServiceRecord;
        }));
        
        // 4. Fetch Vendors
        const vendorsSnap = await getDocs(query(collection(db, 'vendors'), orderBy('name')));
        setVendors(vendorsSnap.docs.map(v => ({ id: v.id, name: v.data().name })));
        const custSnap = await getDocs(query(collection(db, 'customers')));
        setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const accSnap = await getDocs(query(collection(db, 'payment_accounts')));
        setPaymentAccounts(accSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (err) {
        console.error(err);
        toast.error('Failed to load service data');
      }
    };
  
    useEffect(() => {
    fetchData();
  }, []);

  // Global Barcode Scanner for Warranty Check
  useEffect(() => {
    let barcode = "";
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is already typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === "Enter") {
        if (barcode.trim().length > 0) {
          setLedgerSearchQuery(barcode.trim());
          setLedgerView("ledger");
        }
        barcode = "";
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcode += e.key;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          barcode = "";
        }, 200);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeout);
    };
  }, []);

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this service record?')) return;
    try {
      await deleteDoc(doc(db, 'services', id));
      const deletedService = serviceRecords.find((s: any) => s.id === id);
      await logAudit('DELETE', 'Service', `Deleted service ticket #${deletedService?.serialNumber || id} for ${deletedService?.customerName}`, profile?.displayName || profile?.email || 'Admin');
      toast.success('Service record deleted successfully');
    } catch (err) {
      console.error('Error deleting service:', err);
      toast.error('Failed to delete service record');
    }
  };

  const printServiceReceipt = async (record: ServiceRecord) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 20;

      // TOP LEFT: SERVICE RECEIPT
      doc.setFontSize(26);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("SERVICE RECEIPT", 14, currentY + 10);

      // TOP RIGHT: COMPANY INFO
      try {
        const urlsToTry = [settings?.logoUrl, "/logo.png", "/logo.jpeg"].filter(Boolean);
        let dataUrl = "";
        let loadedImg: any = null;

        for (const url of urlsToTry) {
          if (!url) continue;
          try {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            await new Promise((resolve, reject) => {
              img.onload = () => resolve(true);
              img.onerror = () => reject(new Error("Load failed"));
              img.src = url as string;
            });
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              dataUrl = canvas.toDataURL("image/png");
              loadedImg = img;
              break; 
            }
          } catch (e) {
            console.warn(`Failed to load logo from ${url}`);
          }
        }

        const businessNameText = settings?.businessName || settings?.brandName || "CLICK2IT BD";
        
        if (loadedImg && dataUrl) {
          const textWidth = doc.getTextWidth(businessNameText);
          const logoHeight = 16;
          const logoWidth = (loadedImg.width / loadedImg.height) * logoHeight;
          doc.addImage(
            dataUrl,
            "PNG",
            pageWidth - 14 - textWidth - logoWidth - 5,
            currentY - 11,
            logoWidth,
            logoHeight,
          );
        }
      } catch (err) {
        console.error("Error in logo processing for PDF", err);
      }

      doc.setFontSize(14);
      doc.text(settings?.businessName || settings?.brandName || "CLICK2IT BD", pageWidth - 14, currentY, { align: "right" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105); // slate-600
      
      let finalAddress = settings?.address || "Shop No. 1072, Level 10, Multiplan Center\n69-71, New Elephant Road, Dhaka-1205";
      if (finalAddress.trim() === 'Dhaka, Bangladesh') {
         finalAddress = "Shop No. 1072, Level 10, Multiplan Center\n69-71, New Elephant Road, Dhaka-1205";
      }
      const addressLines = doc.splitTextToSize(finalAddress, 80);
      addressLines.forEach((line: string) => {
        currentY += 5;
        doc.text(line, pageWidth - 14, currentY, { align: "right" });
      });
      
      const finalPhones = settings?.contactPhone ? (settings.contactPhone.includes('+880') ? settings.contactPhone : `+8809640887777, +8801729887777`) : "+8809640887777, +8801729887777";
      currentY += 5;
      doc.text(finalPhones, pageWidth - 14, currentY, { align: "right" });
      
      currentY += 5;
      doc.text("www.click2itbd.com", pageWidth - 14, currentY, { align: "right" });

      currentY += 15;

      // CUSTOMER & TICKET DETAILS BOX
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(14, currentY, pageWidth - 28, 35, "F");
      
      // Vertical separator line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(pageWidth / 2, currentY + 5, pageWidth / 2, currentY + 30);

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139); // slate-500
      
      let boxY = currentY + 8;
      doc.text("Customer Information:", 20, boxY);
      doc.text("Ticket Details:", (pageWidth / 2) + 6, boxY);

      boxY += 8;
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(record.customerName || "Walk-in Customer", 20, boxY);
      
      doc.setFontSize(10);
      doc.text(`Ticket No: `, (pageWidth / 2) + 6, boxY);
      doc.text(record.id.slice(-6).toUpperCase(), (pageWidth / 2) + 26, boxY);

      boxY += 7;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(`Phone: ${record.customerPhone || "N/A"}`, 20, boxY);
      doc.text(`Date: ${new Date(record.receivedAt).toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' })}`, (pageWidth / 2) + 6, boxY);

      boxY += 7;
      doc.text(`Status: ${record.status.toUpperCase()}`, (pageWidth / 2) + 6, boxY);

      currentY += 45;

      // TABLE
      autoTable(doc, {
        startY: currentY,
        head: [['S.N.', 'Product Details', 'Information']],
        body: [
          ['1', 'Product Name', record.productName || ''],
          ['2', 'Serial / IMEI', record.serialNumber || ''],
          ['3', 'Equipment Type', record.equipmentType || 'Laptop'],
          ['4', 'Service Type', record.isWarranty ? 'Warranty Service' : 'Paid Service'],
          ['5', 'Issue Description', record.issueDescription || '']
        ],
        theme: 'plain',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: 255,
          fontStyle: 'bold',
          cellPadding: 4
        },
        bodyStyles: {
          textColor: [15, 23, 42],
          cellPadding: 6,
          fontSize: 10
        },
        columnStyles: {
          0: { cellWidth: 15, fontStyle: 'normal' },
          1: { cellWidth: 70 },
          2: { cellWidth: 'auto' }
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255]
        }
      });

      let finalY = (doc as any).lastAutoTable.finalY + 40;
      
      if (finalY > 260) {
        doc.addPage();
        finalY = 40;
      }

      // SIGNATURES
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      
      // Authorized Signature
      doc.line(14, finalY, 70, finalY);
      doc.text("Authorized Signature", 14, finalY + 5);
      
      // Customer Signature
      doc.line(pageWidth - 70, finalY, pageWidth - 14, finalY);
      doc.text("Customer Signature", pageWidth - 14, finalY + 5, { align: "right" });

      finalY += 15;
      
      // Note
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("* Note: There is no warranty in case of Burning or Physical Damages.", 14, finalY);

      finalY += 15;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("THANK YOU FOR YOUR BUSINESS", pageWidth / 2, finalY, { align: "center" });

      doc.save(`Service_Receipt_${record.id.slice(-6)}.pdf`);
      toast.success('Receipt generated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate receipt');
    }
  };

  const printServiceBill = async (record: ServiceRecord) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 20;

      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(settings?.brandName || 'CLICK2IT', 14, currentY);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      currentY += 6;
      doc.text(settings?.contactEmail || '', 14, currentY);
      currentY += 5;
      doc.text(settings?.contactPhone || '', 14, currentY);
      
      doc.setFontSize(24);
      doc.setTextColor(0);
      doc.text('SERVICE BILL', pageWidth - 14, 25, { align: 'right' });

      currentY += 10;
      doc.setLineWidth(0.5);
      doc.line(14, currentY, pageWidth - 14, currentY);
      currentY += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Customer Information:', 14, currentY);
      doc.setFont('helvetica', 'normal');
      currentY += 6;
      doc.text(`Name: ${record.customerName}`, 14, currentY);
      currentY += 5;
      doc.text(`Phone: ${record.customerPhone}`, 14, currentY);

      let rightColY = currentY - 11;
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice Details:', pageWidth - 60, rightColY);
      doc.setFont('helvetica', 'normal');
      rightColY += 6;
      doc.text(`Invoice No: BILL-${record.id.slice(-6).toUpperCase()}`, pageWidth - 60, rightColY);
      rightColY += 5;
      doc.text(`Date: ${new Date(record.receivedAt).toLocaleDateString()}`, pageWidth - 60, rightColY);

      currentY = Math.max(currentY, rightColY) + 15;

      autoTable(doc, {
        startY: currentY,
        head: [['Description', 'Amount']],
        body: [
          [`Service charge for ${record.productName} (SN: ${record.serialNumber})`, formatCurrency(record.serviceCharge, settings)],
          ['Issue: ' + record.issueDescription, ''],
        ],
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68] }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Due: ${formatCurrency(record.serviceCharge, settings)}`, pageWidth - 14, finalY, { align: 'right' });
      
      doc.setFontSize(10);
      doc.text(`Payment Status: ${record.paymentStatus?.toUpperCase() || 'PENDING'}`, 14, finalY);

      doc.save(`Service_Bill_${record.id.slice(-6)}.pdf`);
      toast.success('Bill generated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate bill');
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const serviceData = {
        ...serviceFormData,
        receivedAt: new Date().toISOString(),
      };

      if (editingService) {
          await updateDoc(doc(db, 'services', editingService.id), serviceData);
          await logAudit('EDIT', 'Service', `Edited service ticket #${serviceData.serialNumber || editingService.id} (${serviceData.status})`, profile?.displayName || profile?.email || 'Admin');
          toast.success('Service updated successfully');
        } else {
        await addDoc(collection(db, 'services'), serviceData);
        toast.success('Service added successfully');
      }

      setIsAddingService(false);
      setEditingService(null);
      setServiceFormData(defaultFormData);
      fetchData();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Failed to save service');
    }
  };

  const handleDeliverToPOS = (record: ServiceRecord) => {
    if (record.serviceCharge > 0 && !record.isWarranty) {
      if (window.confirm('Do you want to send this service charge to the Sales form for billing?')) {
        const pendingServiceItem = {
          id: `svc-${record.id}`,
          name: `Service: ${record.productName} (Ticket: ${record.serialNumber || record.id.slice(-6).toUpperCase()})`,
          price: record.serviceCharge,
          costPrice: 0,
          stock: 999,
          quantity: 1,
          isCustomService: true,
          hasSerialTracking: false,
          hasWarranty: false,
          selectedSerials: [],
        };
        localStorage.setItem('pos_pending_service_item', JSON.stringify(pendingServiceItem));
        if (setActiveTab) {
          setActiveTab('sales');
        } else {
          navigate('/pos');
        }
      }
    }
  };

  const updateRmaStatus = async (record: ServiceRecord, newStatus: string, newSerial?: string) => {
    try {
      const updates: any = { rmaStatus: newStatus };
      if (newSerial) {
        updates.newSerialNumber = newSerial;
      }
      if (newStatus === 'Delivered') {
        updates.status = 'delivered'; // Also update the generic status
      }
      await updateDoc(doc(db, 'services', record.id), updates);
      toast.success(`RMA Status updated to ${newStatus}`);
      fetchData();

      if (newStatus === 'Delivered') {
        handleDeliverToPOS(record);
      }
    } catch (error) {
      console.error('Error updating RMA status:', error);
      toast.error('Failed to update status');
    }
  };

  const updateServiceStatus = async (record: ServiceRecord, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'services', record.id), { status: newStatus });
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      fetchData();

      if (newStatus === 'delivered') {
        handleDeliverToPOS(record);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings className="text-[#EF4444]" /> Warranty & Service
        </h2>
        <div className="flex bg-gray-100 p-1 rounded-md">
          <button
            onClick={() => setLedgerView('ledger')}
            className={cn(
              "px-4 py-2 text-sm font-bold rounded-sm transition-all",
              ledgerView === 'ledger' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Warranty Check
          </button>
          <button
            onClick={() => setLedgerView('products')}
            className={cn(
              "px-4 py-2 text-sm font-bold rounded-sm transition-all",
              ledgerView === 'products' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Service Tracking
          </button>
        </div>
        <button
          onClick={() => {
            setServiceFormData(defaultFormData);
            setEditingService(null);
            setIsAddingService(true);
            if (ledgerView !== 'products') setLedgerView('products');
          }}
          className="bg-[#EF4444] text-white px-4 py-2 rounded-md font-bold text-sm hover:bg-red-600 transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Receive Product for Service
        </button>
      </div>

      {isAddingService && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-100 font-bold text-lg">
              {editingService ? 'Edit Service Record' : 'Add New Service Record'}
            </div>
            <form onSubmit={handleSaveService} className="p-6 bg-gray-50 border-b border-gray-100 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
              {/* Service Type Selection */}
              <div className="flex items-center gap-6 p-4 bg-white rounded-lg border border-gray-200">
                <div className="font-bold text-gray-700">Service Type:</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="serviceType" value="in_house" checked={serviceFormData.serviceType === 'in_house'} onChange={() => setServiceFormData({...serviceFormData, serviceType: 'in_house'})} className="text-[#EF4444] focus:ring-[#EF4444]" />
                  <span>In-House Repair</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="serviceType" value="outsourced" checked={serviceFormData.serviceType === 'outsourced'} onChange={() => setServiceFormData({...serviceFormData, serviceType: 'outsourced'})} className="text-[#EF4444] focus:ring-[#EF4444]" />
                  <span>Outsourced Repair</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="serviceType" value="rma" checked={serviceFormData.serviceType === 'rma'} onChange={() => setServiceFormData({...serviceFormData, serviceType: 'rma'})} className="text-[#EF4444] focus:ring-[#EF4444]" />
                    <span>Warranty / RMA</span>
                </label>
              </div>

              
                {/* Outsourcing Checkbox (Only for In-House Repair) */}
                {serviceFormData.serviceType === 'in_house' && (
                  <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <input 
                      type="checkbox" 
                      id="isOutsourced"
                      checked={serviceFormData.isOutsourced}
                      onChange={(e) => setServiceFormData({...serviceFormData, isOutsourced: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="isOutsourced" className="font-bold text-gray-700 cursor-pointer">
                      Did you outsource this repair to a 3rd party vendor?
                    </label>
                  </div>
                )}

                {(serviceFormData.serviceType === 'rma' || serviceFormData.isOutsourced) && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-blue-800 uppercase mb-1">
                      {serviceFormData.serviceType === 'rma' ? 'Select Supplier / Dealer' : 'Select Outsourced Mechanic / Vendor'}
                    </label>
                    <select
                      value={serviceFormData.vendorId}
                      onChange={e => setServiceFormData({ ...serviceFormData, vendorId: e.target.value })}
                      className="w-full border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required={serviceFormData.serviceType === 'rma' || serviceFormData.isOutsourced}
                    >
                      <option value="">-- Select Vendor --</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Repair Cost (Tk)</label>
                      <input
                        type="number"
                        min={0}
                        value={serviceFormData.outsourceCost || ''}
                        onChange={e => setServiceFormData({ ...serviceFormData, outsourceCost: Number(e.target.value) || 0 })}
                        className="w-full border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. 500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Paid to Vendor (Tk)</label>
                      <input
                        type="number"
                        min={0}
                        value={serviceFormData.outsourcePaidAmount || ''}
                        onChange={e => setServiceFormData({ ...serviceFormData, outsourcePaidAmount: Number(e.target.value) || 0 })}
                        className="w-full border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. 500"
                      />
                      {(serviceFormData.outsourceCost || 0) > (serviceFormData.outsourcePaidAmount || 0) && serviceFormData.outsourceCost > 0 && (
                        <p className="text-[10px] text-red-600 mt-1 font-bold">Unpaid: {(serviceFormData.outsourceCost || 0) - (serviceFormData.outsourcePaidAmount || 0)} Tk will go to vendor due.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Paid From Account</label>
                      <select
                        value={serviceFormData.outsourcePaymentMethod}
                        onChange={e => setServiceFormData({ ...serviceFormData, outsourcePaymentMethod: e.target.value })}
                        className="w-full border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        disabled={!(serviceFormData.outsourcePaidAmount > 0)}
                      >
                        <option value="cash">Cash</option>
                        {paymentAccounts?.map((acc: any) => (
                          <option key={acc.id} value={acc.type || acc.name}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Serial Number</label>
                  <input
                    type="text"
                    required
                    value={serviceFormData.serialNumber}
                    onChange={e => setServiceFormData({ ...serviceFormData, serialNumber: e.target.value })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  />
                </div>
                  <div className="relative">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer Name</label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={serviceFormData.customerName}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                      onChange={e => {
                        const cName = e.target.value;
                        const c = customers.find((x: any) => x.name === cName);
                        setServiceFormData({ 
                          ...serviceFormData, 
                          customerName: cName,
                          customerPhone: c ? c.phone : serviceFormData.customerPhone
                        });
                      }}
                      className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                      placeholder="Type to search or add new..."
                    />
                    {showCustomerDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {customers.filter((c: any) => c.name.toLowerCase().includes(serviceFormData.customerName.toLowerCase())).length > 0 ? (
                          customers.filter((c: any) => c.name.toLowerCase().includes(serviceFormData.customerName.toLowerCase())).map((c: any) => (
                            <div 
                              key={c.id} 
                              className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-50 last:border-0"
                              onClick={() => {
                                setServiceFormData({
                                  ...serviceFormData, 
                                  customerName: c.name, 
                                  customerPhone: c.phone || serviceFormData.customerPhone
                                });
                                setShowCustomerDropdown(false);
                              }}
                            >
                              <div className="font-bold text-sm text-gray-800">{c.name}</div>
                              {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-gray-500 italic">
                            No match found. Will be saved as new.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={serviceFormData.productName}
                    onChange={e => setServiceFormData({ ...serviceFormData, productName: e.target.value })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Issue Description</label>
                  <textarea
                    required
                    value={serviceFormData.issueDescription}
                    onChange={e => setServiceFormData({ ...serviceFormData, issueDescription: e.target.value })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                    rows={3}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Customer Phone</label>
                  <input
                    type="tel"
                    required
                    value={serviceFormData.customerPhone}
                    onChange={e => setServiceFormData({ ...serviceFormData, customerPhone: e.target.value })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Service Charge</label>
                  <input
                    type="number"
                    value={serviceFormData.serviceCharge}
                    onChange={e => setServiceFormData({ ...serviceFormData, serviceCharge: Number(e.target.value) || 0 })}
                    className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                  />
                </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prepared By</label>
                    <input
                      type="text"
                      value={serviceFormData.preparedBy || ''}
                      onChange={e => setServiceFormData({ ...serviceFormData, preparedBy: e.target.value })}
                      className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                      placeholder="Staff name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                    <input
                      type="date"
                      value={serviceFormData.receivedAt?.split('T')[0] || ''}
                      onChange={e => setServiceFormData({ ...serviceFormData, receivedAt: e.target.value })}
                      className="w-full border-gray-200 rounded-md focus:ring-[#EF4444] focus:border-[#EF4444]"
                    />
                  </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-[#EF4444] text-white py-2 rounded-md font-bold hover:bg-red-600 transition-all"
                  >
                    {editingService ? 'Update Service' : 'Save Service'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingService(false); setEditingService(null); }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md font-bold hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {ledgerView === 'ledger' && (
        <div className="p-8 bg-gray-50/30 min-h-[60vh] flex flex-col items-center">
          <div className="max-w-3xl w-full space-y-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center p-4 bg-blue-100 text-blue-600 rounded-full mb-2 shadow-sm">
                <ShieldCheck size={40} />
              </div>
              <h3 className="font-bold text-3xl text-gray-800 tracking-tight">Warranty Checker</h3>
              <p className="text-gray-500 text-lg">Scan barcode or enter serial number to verify warranty validity.</p>
              
              <div className="relative max-w-xl mx-auto mt-6 shadow-sm rounded-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                <input
                  type="text"
                  placeholder="Scan or type serial number..."
                  value={ledgerSearchQuery}
                  onChange={(e) => setLedgerSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-lg transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-4">
              {(ledgerSearchQuery ? soldSerials.filter(s => s.serial.toLowerCase().includes(ledgerSearchQuery.toLowerCase())) : soldSerials.slice(0, 10))
                .map(record => {
                  const wEndDate = new Date(record.warrantyEndDate);
                  const isExpired = wEndDate < new Date();
                  const daysLeft = Math.ceil((wEndDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                  return (
                    <div key={record.id} className="bg-white border-2 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-500 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-lg">{record.productName}</h4>
                          <p className="font-mono text-sm text-gray-500">SN: {record.serial}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 shadow-sm",
                            isExpired ? "bg-red-100 text-red-700 border border-red-200" : "bg-green-100 text-green-700 border border-green-200"
                          )}>
                            {isExpired ? <X size={16} /> : <CheckCircle size={16} />}
                            {isExpired ? 'Warranty Expired' : 'Active Warranty'}
                          </span>
                          {!isExpired && (
                            <span className="text-xs text-gray-500 font-medium">
                              {daysLeft} days remaining
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-4 border-t border-gray-100 pt-4">
                        <div>
                          <span className="text-gray-500 block mb-1">Customer</span>
                          <span className="font-medium">{record.customerName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-1">Sold Date</span>
                          <span className="font-medium">{new Date(record.soldAt).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-1">Warranty Ends</span>
                          <span className="font-medium">{wEndDate.toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block mb-1">Order Ref</span>
                          <span className="font-medium">{record.orderId}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={() => {
                            setServiceFormData({
                              serialNumber: record.serial,
                              customerName: record.customerName,
                              customerPhone: record.customerPhone,
                              productName: record.productName,
                              issueDescription: '',
                              isWarranty: !isExpired,
                              serviceCharge: isExpired ? 500 : 0,
                              status: 'received',
                              equipmentType: 'Laptop',
                              paymentMethod: 'cash',
                              paymentStatus: 'pending',
                              serviceType: 'in_house',
                              vendorId: '',
                              rmaStatus: 'Pending Vendor',
                              newSerialNumber: '',
                            });
                            setEditingService(null);
                            setIsAddingService(true);
                            setLedgerView('products');
                          }}
                          className="text-sm bg-[#EF4444] hover:bg-red-600 text-white font-bold py-2 px-6 rounded-md transition-all shadow-sm"
                        >
                          Receive Product for Service
                        </button>
                      </div>
                    </div>
                  );
                })}
              {ledgerSearchQuery && soldSerials.filter(s => s.serial.toLowerCase().includes(ledgerSearchQuery.toLowerCase())).length === 0 && (
                <div className="text-center p-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <ShieldCheck size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="font-bold text-gray-700 text-lg">No warranty records found</p>
                  <p className="text-sm mt-1">The serial number doesn't match any sold product.</p>
                </div>
              )}
              {!ledgerSearchQuery && soldSerials.length > 0 && (
                <div className="text-center text-xs text-gray-400 mt-6 font-medium">
                  Showing {Math.min(10, soldSerials.length)} most recent sales. Type or scan a barcode to search.
                </div>
              )}
              {!ledgerSearchQuery && soldSerials.length === 0 && (
                <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 mt-4">
                  <p className="font-bold text-gray-700">No sold items with serial numbers found.</p>
                  <p className="text-sm mt-1">Make sure you scan serial numbers during POS checkout to enable warranty tracking.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {ledgerView === 'products' && (
        <div className="flex flex-col bg-gray-50/30">
          {/* Dashboard Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-gray-100 bg-white">
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl shadow-sm flex items-center gap-4">
              <div className="bg-amber-100 p-3 rounded-lg text-amber-600"><Clock size={24} /></div>
              <div>
                <p className="text-sm text-amber-800 font-medium">Pending</p>
                <h4 className="text-2xl font-bold text-amber-900">{serviceRecords.filter(r => r.status === 'received' || r.rmaStatus === 'Pending Vendor').length}</h4>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl shadow-sm flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><Wrench size={24} /></div>
              <div>
                <p className="text-sm text-blue-800 font-medium">In Repair</p>
                <h4 className="text-2xl font-bold text-blue-900">{serviceRecords.filter(r => r.status === 'in_progress' || r.rmaStatus === 'Sent to Vendor').length}</h4>
              </div>
            </div>
            <div className="bg-green-50 border border-green-100 p-4 rounded-xl shadow-sm flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg text-green-600"><CheckCircle size={24} /></div>
              <div>
                <p className="text-sm text-green-800 font-medium">Ready</p>
                <h4 className="text-2xl font-bold text-green-900">{serviceRecords.filter(r => r.status === 'ready' || r.rmaStatus === 'Received from Vendor').length}</h4>
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl shadow-sm flex items-center gap-4">
              <div className="bg-purple-100 p-3 rounded-lg text-purple-600"><Package size={24} /></div>
              <div>
                <p className="text-sm text-purple-800 font-medium">Delivered</p>
                <h4 className="text-2xl font-bold text-purple-900">{serviceRecords.filter(r => r.status === 'delivered' || r.rmaStatus === 'Delivered').length}</h4>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="p-4 bg-white border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
              {['All', 'Pending', 'In Progress', 'Ready', 'Delivered', 'RMA'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border",
                    filterStatus === f 
                      ? "bg-gray-900 text-white border-gray-900 shadow-sm" 
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search ticket, customer, SN..."
                value={serviceSearchQuery}
                onChange={(e) => setServiceSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-0 text-sm transition-all"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-4">Ticket / Date</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Product / SN</th>
                  <th className="px-6 py-4">Status & Type</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {serviceRecords
                  .filter(r => {
                    const searchLower = serviceSearchQuery.toLowerCase();
                    const matchesSearch = r.serialNumber?.toLowerCase().includes(searchLower) || 
                                          r.customerName?.toLowerCase().includes(searchLower) ||
                                          r.id.toLowerCase().includes(searchLower);
                    if (!matchesSearch) return false;
                    
                    if (filterStatus === 'All') return true;
                    if (filterStatus === 'Pending') return r.status === 'received' || r.rmaStatus === 'Pending Vendor';
                    if (filterStatus === 'In Progress') return r.status === 'in_progress' || r.rmaStatus === 'Sent to Vendor';
                    if (filterStatus === 'Ready') return r.status === 'ready' || r.rmaStatus === 'Received from Vendor';
                    if (filterStatus === 'Delivered') return r.status === 'delivered' || r.rmaStatus === 'Delivered';
                    if (filterStatus === 'RMA') return r.serviceType === 'rma';
                    
                    return true;
                  })
                  .map((record) => (
                  <tr key={record.id} className="bg-white border-b hover:bg-gray-50 transition-all">
                    <td className="px-6 py-4">
                      <div className="font-bold">{record.id.slice(-6).toUpperCase()}</div>
                      <div className="text-xs text-gray-500">{new Date(record.receivedAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold">{record.customerName}</div>
                      <div className="text-xs text-gray-500">{record.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold line-clamp-1">{record.productName}</div>
                      <div className="text-xs font-mono text-gray-500">
                        {record.serialNumber}
                        {record.newSerialNumber && (
                          <span className="text-green-600 block mt-0.5">
                            ↳ Replaced: {record.newSerialNumber}
                          </span>
                        )}
                      </div>
                      {record.equipmentType && <div className="text-[10px] bg-gray-100 px-2 py-0.5 rounded inline-block mt-1">{record.equipmentType}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {record.serviceType === 'rma' ? (
                          <>
                            <span className="px-2 py-1 rounded text-[10px] font-bold w-fit bg-indigo-100 text-indigo-800 flex items-center gap-1 border border-indigo-200">
                              <ShieldCheck size={12} /> VENDOR RMA
                            </span>
                            <span className={cn(
                              "px-2 py-1 rounded text-[10px] font-bold w-fit",
                              record.rmaStatus === 'Pending Vendor' ? "bg-amber-100 text-amber-800" :
                              record.rmaStatus === 'Sent to Vendor' ? "bg-blue-100 text-blue-800" :
                              record.rmaStatus === 'Received from Vendor' ? "bg-green-100 text-green-800" :
                              "bg-gray-100 text-gray-800"
                            )}>
                              {record.rmaStatus?.toUpperCase()}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className={cn(
                              "px-2 py-1 rounded text-[10px] font-bold w-fit",
                              record.status === 'received' ? "bg-amber-100 text-amber-800" :
                              record.status === 'in_progress' ? "bg-blue-100 text-blue-800" :
                              record.status === 'ready' ? "bg-green-100 text-green-800" :
                              "bg-gray-100 text-gray-800"
                            )}>
                              {record.status.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className={cn(
                              "px-2 py-1 rounded text-[10px] font-bold w-fit",
                              record.isWarranty ? "bg-purple-100 text-purple-800" : "bg-orange-100 text-orange-800"
                            )}>
                              {record.isWarranty ? "WARRANTY" : `PAID SERVICE`}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {!record.isWarranty ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-bold text-sm text-gray-900">{formatCurrency(record.serviceCharge, settings)}</span>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase",
                              record.paymentStatus === 'paid' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            )}>
                              {record.paymentStatus || 'pending'}
                            </span>
                            {(record.paymentMethod) && (
                              <span className="text-[9px] text-gray-500 bg-gray-100 py-0.5 px-1.5 rounded-[4px] uppercase">{record.paymentMethod.replace('_', ' ')}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Free (Warranty)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end">
                       {record.serviceType === 'rma' ? (
                         <>
                           {record.rmaStatus === 'Pending Vendor' && (
                             <button onClick={() => updateRmaStatus(record, 'Sent to Vendor')} className="text-orange-500 hover:text-orange-700 mx-1 bg-orange-50 hover:bg-orange-100 p-1.5 rounded shadow-sm transition-all" title="Send to Vendor">
                               <Truck size={16} />
                             </button>
                           )}
                           {record.rmaStatus === 'Sent to Vendor' && (
                             <button onClick={() => {
                               const newSerial = prompt('Enter new Serial Number if replaced (or leave blank if same):');
                               if (newSerial !== null) {
                                 updateRmaStatus(record, 'Received from Vendor', newSerial);
                               }
                             }} className="text-blue-500 hover:text-blue-700 mx-1 bg-blue-50 hover:bg-blue-100 p-1.5 rounded shadow-sm transition-all" title="Receive from Vendor">
                               <RefreshCw size={16} />
                             </button>
                           )}
                           {record.rmaStatus === 'Received from Vendor' && (
                             <button onClick={() => updateRmaStatus(record, 'Delivered')} className="text-green-600 hover:text-green-800 mx-1 bg-green-50 hover:bg-green-100 p-1.5 rounded shadow-sm transition-all" title="Deliver to Customer">
                               <CheckCircle size={16} />
                             </button>
                           )}
                         </>
                       ) : (
                         <div className="flex flex-wrap items-center gap-1.5">
                           {record.status === 'received' && (
                             <button onClick={() => updateServiceStatus(record, 'in_progress')} className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded transition-colors" title="Mark In Progress">
                               <Wrench size={12} /> Start Repair
                             </button>
                           )}
                           {record.status === 'in_progress' && (
                             <button onClick={() => updateServiceStatus(record, 'ready')} className="flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2 py-1 rounded transition-colors" title="Mark Ready">
                               <CheckCircle size={12} /> Mark Ready
                             </button>
                           )}
                           {record.status === 'ready' && (
                             <button onClick={() => updateServiceStatus(record, 'delivered')} className="flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-1 rounded transition-colors" title="Mark Delivered">
                               <Package size={12} /> Deliver
                             </button>
                           )}
                           {record.status === 'delivered' && (
                             <button onClick={() => updateServiceStatus(record, 'received')} className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded transition-colors" title="Revert to Pending">
                               <RefreshCw size={12} /> Mark Pending
                             </button>
                           )}
                         </div>
                       )}

                       <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-gray-100 w-full">
                         {record.customerPhone && (
                           <a href={`https://wa.me/${record.customerPhone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-green-500 hover:text-green-700 bg-green-50 hover:bg-green-100 p-1.5 rounded shadow-sm transition-all" title="Message on WhatsApp">
                             <MessageCircle size={14} />
                           </a>
                         )}
                         <button onClick={() => printServiceReceipt(record)} className="text-gray-500 hover:text-blue-700 bg-gray-50 hover:bg-blue-50 p-1.5 rounded shadow-sm transition-all" title="Print Receipt">
                           <FileText size={14} />
                         </button>
                         {!record.isWarranty && record.serviceCharge > 0 && (
                           <button onClick={() => printServiceBill(record)} className="text-gray-500 hover:text-green-700 bg-gray-50 hover:bg-green-50 p-1.5 rounded shadow-sm transition-all" title="Print Bill">
                             <Download size={14} />
                           </button>
                         )}
                         {!record.isWarranty && record.serviceCharge > 0 && (record.status === 'delivered' || record.rmaStatus === 'Delivered') && (
                           <button onClick={() => handleDeliverToPOS(record)} className="text-gray-500 hover:text-purple-700 bg-gray-50 hover:bg-purple-50 p-1.5 rounded shadow-sm transition-all" title="Send to Sales">
                             <ShoppingCart size={14} />
                           </button>
                         )}
                         <button onClick={() => { setEditingService(record); setServiceFormData({...record, receivedAt: record.receivedAt ? record.receivedAt.split('T')[0] : new Date().toISOString().split('T')[0], serviceType: record.serviceType || 'in_house', vendorId: record.vendorId || '', rmaStatus: record.rmaStatus || 'Pending Vendor', equipmentType: record.equipmentType || 'Laptop', paymentMethod: record.paymentMethod || 'cash', paymentStatus: record.paymentStatus || 'pending', medeaPayment: (record as any).medeaPayment || '', outsourceCost: record.outsourceCost || 0, outsourcePaidAmount: record.outsourcePaidAmount || 0, outsourcePaymentMethod: record.outsourcePaymentMethod || 'cash', isOutsourced: record.isOutsourced || (record.outsourceCost > 0)}); setIsAddingService(true); }} className="text-gray-500 hover:text-amber-700 bg-gray-50 hover:bg-amber-50 p-1.5 rounded shadow-sm transition-all ml-auto" title="Edit Service/Payment">
                           <Edit2 size={14} />
                         </button>
                          <button onClick={() => handleDeleteService(record.id)} className="text-gray-500 hover:text-red-700 bg-gray-50 hover:bg-red-50 p-1.5 rounded shadow-sm transition-all" title="Delete Service">
                            <Trash2 size={14} />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
