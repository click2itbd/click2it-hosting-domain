import React, { useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../../firebase';
import toast from 'react-hot-toast';
import { Order, OrderStatus, Product, SoldSerial } from '../../../types';
import { formatCurrency } from '../../../lib/utils';
import { generateDocumentNumber } from '../../../lib/numbering';
import { getApiUrl } from '../../../services/apiClient';

export function useOrdersLogic({ setConfirmModal, fetchData, settings, customers, vendors, products, discountCodes, checkLowStock }: any) {

    const [orders, setOrders] = useState<Order[]>([]);
    const [serialSelectionModal, setSerialSelectionModal] = useState<{
    isOpen: boolean;
    orderId: string;
    newStatus: OrderStatus;
    items: { productId: string; productName: string; quantity: number; availableSerials: string[]; selectedSerials: string[]; warrantyMonths: number }[];
  } | null>(null);
    const [isCreatingSale, setIsCreatingSale] = useState(false);
    const [isCreatingPurchase, setIsCreatingPurchase] = useState(false);
    const [showPCBuilderModal, setShowPCBuilderModal] = useState(false);
    const [purchaseStartDate, setPurchaseStartDate] = useState('');
    const [purchaseEndDate, setPurchaseEndDate] = useState('');
    const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [orderSort, setOrderSort] = useState<'date_desc' | 'date_asc' | 'total_desc' | 'total_asc'>('date_desc');
    const [orderSearchQuery, setOrderSearchQuery] = useState('');
    const [orderStartDate, setOrderStartDate] = useState('');
    const [orderEndDate, setOrderEndDate] = useState('');
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
    const [isBulkEditing, setIsBulkEditing] = useState(false);
    const [bulkEditData, setBulkEditData] = useState({
    price: '',
    stock: '',
    category: '',
    vendorId: '',
    socketType: '',
    ramType: '',
  });
    const [saleData, setSaleData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    shippingAddress: '',
    items: [] as any[],
    type: 'invoice' as any,
    discountAmount: 0,
    appliedDiscountPercentage: 0,
    appliedDiscountCode: '',
  });
    const [saleDiscountCodeInput, setSaleDiscountCodeInput] = useState('');
    const [purchaseData, setPurchaseData] = useState({
    vendorId: '',
    vendorName: '',
    items: [] as any[],
    description: '',
  });
    const [soldSerials, setSoldSerials] = useState<SoldSerial[]>([]);

    const [isRecordingPayment, setIsRecordingPayment] = useState(false);
    const [paymentFormData, setPaymentFormData] = useState({ amount: 0, description: '', date: new Date().toISOString().split('T')[0] });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    const handleApplySaleDiscountCode = () => {
    if (!saleDiscountCodeInput) return;
    const foundCode = discountCodes.find(c => c.code.toUpperCase() === saleDiscountCodeInput.toUpperCase() && c.isActive);
    if (foundCode) {
      if (new Date(foundCode.expiryDate) < new Date()) {
        toast.error("Discount code expired");
        return;
      }
      setSaleData({
        ...saleData,
        appliedDiscountPercentage: foundCode.discountPercentage,
        appliedDiscountCode: foundCode.code,
        discountAmount: 0 
      });
      toast.success(`Discount code applied: ${foundCode.discountPercentage}% off`);
    } else {
      toast.error("Invalid discount code");
    }
  };

    const handleConfirmSerialSelection = async () => {
    if (!serialSelectionModal) return;
    
    // Validate
    const invalidItems = serialSelectionModal.items.filter(i => i.selectedSerials.length !== i.quantity);
    if (invalidItems.length > 0) {
      toast.error(`Please select exactly ${invalidItems[0].quantity} serials for ${invalidItems[0].productName}`);
      return;
    }

    try {
      const order = orders.find(o => o.id === serialSelectionModal.orderId);
      if (!order) return;

      const updatedItems = [...order.items];

      for (const modalItem of serialSelectionModal.items) {
        const itemIndex = updatedItems.findIndex(i => i.id === modalItem.productId);
        if (itemIndex >= 0) {
          updatedItems[itemIndex].selectedSerials = modalItem.selectedSerials;
        }

        const product = products.find(p => p.id === modalItem.productId);
        if (product) {
          const remainingSerials = (product.availableSerials || []).filter(s => !modalItem.selectedSerials.includes(s));
          await updateDoc(doc(db, 'products', product.id), {
            availableSerials: remainingSerials
          });

          // Add to sold_serials
          const warrantyEndDate = new Date();
          warrantyEndDate.setMonth(warrantyEndDate.getMonth() + modalItem.warrantyMonths);
          
          for (const serial of modalItem.selectedSerials) {
             await addDoc(collection(db, 'sold_serials'), {
               serial,
               productId: product.id,
               productName: product.name,
               orderId: order.id,
               customerName: order.customerName,
               customerPhone: order.customerPhone || '',
               soldAt: new Date().toISOString(),
               warrantyEndDate: warrantyEndDate.toISOString(),
               status: 'active'
             });
          }
        }
      }

      await updateDoc(doc(db, 'orders', order.id), { items: updatedItems });
      
      // Continue update order status but skip the check this time
      const statusToApply = serialSelectionModal.newStatus;
      setSerialSelectionModal(null); // Clear first to unblock UI
      await updateDoc(doc(db, 'orders', order.id), { status: statusToApply });
    } catch (err) {
      toast.error('Failed to save serials');
    }
  };

    const updateOrderDiscount = async (orderId: string, discountAmount: number) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      
      const subtotal = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const newTotal = subtotal - discountAmount;
      
      await updateDoc(doc(db, 'orders', orderId), { 
        discountAmount,
        total: Math.max(0, newTotal)
      });
      toast.success('Discount updated');
      fetchData();
    } catch (error) {
      console.error('Error updating discount:', error);
      toast.error('Failed to update discount');
    }
  };

    const handleBulkDeleteOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Delete Orders',
      message: `Are you sure you want to delete ${selectedOrderIds.length} orders? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          for (const id of selectedOrderIds) {
            batch.delete(doc(db, 'orders', id));
          }
          await batch.commit();
          toast.success(`${selectedOrderIds.length} orders deleted`);
          setSelectedOrderIds([]);
          fetchData();
        } catch (error) {
          toast.error('Failed to delete some orders');
        }
      }
    });
  };

    const handleBulkReturnOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Return Orders',
      message: `Are you sure you want to mark ${selectedOrderIds.length} selected orders as "RETURNED"?`,
      confirmText: 'Mark Returned',
      confirmColor: 'bg-yellow-600 hover:bg-yellow-700',
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          const returnPromises: Promise<unknown>[] = [];
          
          for (const id of selectedOrderIds) {
            const order = orders.find(o => o.id === id);
            batch.update(doc(db, 'orders', id), { status: 'returned' });
            
            if (order) {
              returnPromises.push(
                addDoc(collection(db, 'transactions'), {
                  type: 'return',
                  amount: -(order?.total || 0),
                  date: new Date().toISOString(),
                  description: `Return for order ${order?.documentNumber || id}`,
                  entityId: 'system',
                  entityName: 'Sales Return',
                  referenceId: id,
                  createdAt: new Date().toISOString(),
                })
              );
            }
          }
          
          await batch.commit();
          await Promise.all(returnPromises);
          toast.success(`${selectedOrderIds.length} orders marked as returned`);
          setSelectedOrderIds([]);
          fetchData();
        } catch (error) {
          console.error('Error returning orders:', error);
          toast.error('Failed to return some orders');
        }
      }
    });
  };

    const handleBulkUpdateOrderStatus = (status: OrderStatus) => {
    if (selectedOrderIds.length === 0) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Bulk Update Order Status',
      message: `Are you sure you want to update the status of ${selectedOrderIds.length} selected orders to "${status.toUpperCase()}"?`,
      confirmText: 'Update Status',
      confirmColor: 'bg-[#081621] hover:bg-black shadow-gray-200',
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          const emailPromises: Promise<void>[] = [];
          
          for (const id of selectedOrderIds) {
            batch.update(doc(db, 'orders', id), { status });
            const order = orders.find(o => o.id === id);
            if (order && order.customerEmail) {
              emailPromises.push(
                fetch(getApiUrl('/api/send-email/order-status-update'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    orderId: order.documentNumber || order.id,
                    customerName: order.customerName,
                    customerEmail: order.customerEmail,
                    status: status
                  }),
                }).then(res => { if (!res.ok) throw new Error('Failed to send status update email'); })
              );
            }
          }
          
          await batch.commit();
          await Promise.all(emailPromises);
          toast.success(`${selectedOrderIds.length} orders updated to ${status}`);
          setSelectedOrderIds([]);
          fetchData();
        } catch (error) {
          console.error('Error bulk updating orders:', error);
          toast.error('Failed to update some orders');
        }
      }
    });
  };

    const handleDownloadCSVTemplate = () => {
    const headers = ['Name', 'Category', 'Price', 'Stock', 'Description', 'SocketType', 'RamType', 'Chipset', 'Images'];
    const sampleData = ['Sample Product', 'Laptop', '50000', '10', 'A great laptop', 'AM4', 'DDR4', 'B450', 'https://example.com/image.jpg'];
    const csvContent = [headers.join(','), sampleData.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'product_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOrders = orders.filter(o => true); // computed inline
    const handleExportFilteredOrders = () => {
    const headers = ['Order ID', 'Customer Name', 'Phone', 'Total', 'Status', 'Date'];
    const csvContent = [
      headers.join(','),
      ...filteredOrders.map(o => [
        o.id,
        `"${o.customerName}"`,
        `"${o.customerPhone}"`,
        o.total,
        o.status,
        o.createdAt
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

    const handleBulkExportOrders = () => {
    if (selectedOrderIds.length === 0) return;
    const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
    
    const headers = ['Order ID', 'Customer Name', 'Phone', 'Total', 'Status', 'Date'];
    const csvContent = [
      headers.join(','),
      ...selectedOrders.map(o => [
        o.id,
        `"${(o.customerName || '').replace(/"/g, '""')}"`,
        `"${(o.customerPhone || '').replace(/"/g, '""')}"`,
        o.total,
        o.status,
        o.createdAt
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `selected_orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${selectedOrderIds.length} orders`);
  };

    const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseData.items.length === 0 || !purchaseData.vendorId) {
      toast.error('Please select a vendor and add products');
      return;
    }

    try {
      const totalAmount = purchaseData.items.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);

      // 1. Update Product Stock
      for (const item of purchaseData.items) {
        const productRef = doc(db, 'products', item.id);
        const currentProduct = products.find(p => p.id === item.id);
        if (currentProduct) {
          const updates: any = {
            stock: currentProduct.stock + item.quantity
          };
          
          if (item.hasWarranty) {
            updates.warrantyMonths = (item.warrantyYears || 0) * 12;
          }

          if (currentProduct.hasSerialTracking && item.newSerials) {
             const addedSerials = Array.isArray(item.newSerials) ? item.newSerials.filter((s: string) => s.trim()) : item.newSerials.split('\n').map((s: string) => s.trim()).filter((s: string) => s);
             updates.availableSerials = [...(currentProduct.availableSerials || []), ...addedSerials];
          }

          await updateDoc(productRef, updates);
        }
      }

      // 2. Create Purchase Transaction
      const transactionData = {
        type: 'purchase',
        amount: totalAmount,
        date: new Date().toISOString(),
        description: purchaseData.description || `Purchase from ${purchaseData.vendorName}`,
        entityId: purchaseData.vendorId,
        entityName: purchaseData.vendorName,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'transactions'), transactionData);
      
      toast.success('Purchase recorded and inventory updated');
      setIsCreatingPurchase(false);
      setPurchaseData({ vendorId: '', vendorName: '', items: [], description: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating purchase:', error);
      toast.error('Failed to create purchase');
    }
  };

    const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saleData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      for (const item of saleData.items) {
        if (item.hasSerialTracking) {
          if (!item.selectedSerials || item.selectedSerials.length !== item.quantity) {
            toast.error(`Please select exactly ${item.quantity} serial(s) for ${item.name}`);
            return;
          }
        }
      }

      const docType = saleData.type === 'quotation' ? 'QUO' : (saleData.type === 'challan' ? 'CHA' : 'INV');
      const docNumber = await generateDocumentNumber(docType);

      const subtotal = saleData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const effectiveDiscount = saleData.appliedDiscountPercentage > 0 
        ? (subtotal * saleData.appliedDiscountPercentage) / 100 
        : (saleData.discountAmount || 0);
      const total = subtotal - effectiveDiscount;
      const processedItems = saleData.items.map(item => {
        const currentProduct = products.find(p => p.id === item.id);
        const wMonths = item.hasWarranty ? (item.warrantyYears || 0) * 12 : (currentProduct?.warrantyMonths || 0);
        return { ...item, warrantyMonths: wMonths };
      });

      const orderData = {
        ...saleData,
        items: processedItems,
        discountAmount: effectiveDiscount,
        documentNumber: docNumber,
        total: Math.max(0, total),
        status: 'delivered',
        userId: 'admin',
        createdAt: new Date().toISOString(),
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Update Stock for Invoice/Challan
      if (saleData.type === 'invoice' || saleData.type === 'challan') {
        for (const item of saleData.items) {
          const productRef = doc(db, 'products', item.id);
          const currentProduct = products.find(p => p.id === item.id);
          if (currentProduct) {
            const updates: any = {};
            const newStock = Math.max(0, currentProduct.stock - item.quantity);
            updates.stock = newStock;
            
            if (currentProduct.hasSerialTracking && item.selectedSerials) {
              const remainingSerials = (currentProduct.availableSerials || []).filter(s => !item.selectedSerials.includes(s));
              updates.availableSerials = remainingSerials;
              
              // Add to sold_serials collection
              const warrantyEndDate = new Date();
              const wMonths = item.hasWarranty ? (item.warrantyYears || 0) * 12 : (currentProduct.warrantyMonths || 0);
              warrantyEndDate.setMonth(warrantyEndDate.getMonth() + wMonths);
              
              for (const serial of item.selectedSerials) {
                await addDoc(collection(db, 'sold_serials'), {
                  serial,
                  productId: currentProduct.id,
                  productName: currentProduct.name,
                  orderId: orderRef.id,
                  customerName: saleData.customerName,
                  customerPhone: saleData.customerPhone,
                  soldAt: new Date().toISOString(),
                  warrantyEndDate: warrantyEndDate.toISOString(),
                  status: 'active'
                });
              }
            }

            await updateDoc(productRef, updates);
            checkLowStock(currentProduct.name, newStock);
          }
        }
      }

      // Record Transaction
      const customer = customers.find(c => c.name === saleData.customerName);
      await addDoc(collection(db, 'transactions'), {
        type: 'sale',
        amount: Math.max(0, total),
        date: new Date().toISOString(),
        description: `Sale to ${saleData.customerName} (#${docNumber})`,
        entityId: customer?.id || 'unknown',
        entityName: saleData.customerName,
        entityType: 'customer',
        referenceId: orderRef.id,
        documentNumber: docNumber,
        createdAt: new Date().toISOString(),
      });

      toast.success('Sale recorded successfully');
      setIsCreatingSale(false);
      setSaleData({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        shippingAddress: '',
        items: [],
        type: 'invoice',
        discountAmount: 0,
        appliedDiscountPercentage: 0,
        appliedDiscountCode: '',
      });
      setSaleDiscountCodeInput('');
      fetchData();
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error('Failed to record sale');
    }
  };

    const addItemToSale = (product: Product) => {
    setSaleData(prev => {
      const existing = prev.items.find(i => i.id === product.id);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        };
      }
      return {
        ...prev,
        items: [...prev.items, { ...product, quantity: 1 }]
      };
    });
    toast.success(`Added ${product.name} to sale`);
  };

    const addItemToPurchase = (product: Product) => {
    setPurchaseData(prev => {
      const existing = prev.items.find(i => i.id === product.id);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        };
      }
      return {
        ...prev,
        items: [...prev.items, { ...product, quantity: 1, purchasePrice: product.price * 0.8 }] // Default purchase price 80% of selling price
      };
    });
    toast.success(`Added ${product.name} to purchase list`);
  };

  return {
    orders, setOrders,
    serialSelectionModal, setSerialSelectionModal,
    isCreatingSale, setIsCreatingSale,
    isCreatingPurchase, setIsCreatingPurchase,
    showPCBuilderModal, setShowPCBuilderModal,
    purchaseStartDate, setPurchaseStartDate,
    purchaseEndDate, setPurchaseEndDate,
    purchaseSearchQuery, setPurchaseSearchQuery,
    orderStatusFilter, setOrderStatusFilter,
    orderSort, setOrderSort,
    orderSearchQuery, setOrderSearchQuery,
    orderStartDate, setOrderStartDate,
    orderEndDate, setOrderEndDate,
    selectedOrderIds, setSelectedOrderIds,
    isBulkEditing, setIsBulkEditing,
    bulkEditData, setBulkEditData,
    saleData, setSaleData,
    saleDiscountCodeInput, setSaleDiscountCodeInput,
    purchaseData, setPurchaseData,
    soldSerials, setSoldSerials,
    isRecordingPayment, setIsRecordingPayment,
    paymentFormData, setPaymentFormData,
    selectedCustomerId, setSelectedCustomerId,
    handleApplySaleDiscountCode,
    handleConfirmSerialSelection,
    updateOrderDiscount,
    handleBulkDeleteOrders,
    handleBulkReturnOrders,
    handleBulkUpdateOrderStatus,
    handleDownloadCSVTemplate,
    handleExportFilteredOrders,
    handleBulkExportOrders,
    handleCreatePurchase,
    handleCreateSale,
    addItemToSale,
    addItemToPurchase,
  };
}
