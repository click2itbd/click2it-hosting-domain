import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, where, limit, deleteDoc, addDoc } from 'firebase/firestore';
import { formatCurrency, cn } from '../../../lib/utils';
import { toast } from 'react-hot-toast';
import { Server, Search, Eye, EyeOff, X, Globe, Download, Loader2, FileText, CheckCircle, Wallet, AlertTriangle, Clock, Terminal, Copy, Key, Edit3, Check, RefreshCw, Trash2 } from 'lucide-react';
import { HostingOrder, DomainOrder, HostingAccount } from '../../../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSettings } from '../../../context/SettingsContext';
import { sendServiceActivationEmail, getEmailLogsForOrder, EmailLog } from '../../../services/emailService';
import { getApiUrl } from '../../../services/apiClient';
import { Pagination } from '../../../components/common/Pagination';
import { logAudit } from '../../../lib/audit';

export default function HostingOrders() {
  const { settings } = useSettings();
  const [orders, setOrders] = useState<HostingOrder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState<HostingOrder | null>(null);
  const [domainOrders, setDomainOrders] = useState<DomainOrder[]>([]);
  const [hostingAccounts, setHostingAccounts] = useState<HostingAccount[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState<Record<string, boolean>>({});
  
  const [editingAuthCodeId, setEditingAuthCodeId] = useState<string | null>(null);
  const [newAuthCodeVal, setNewAuthCodeVal] = useState<string>('');
  const [savingAuthCode, setSavingAuthCode] = useState(false);

  const [showEmailLogs, setShowEmailLogs] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loadingEmailLogs, setLoadingEmailLogs] = useState(false);

  const [paymentAction, setPaymentAction] = useState<'accept' | 'reject' | null>(null);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(1000));
      const snap = await getDocs(q);
      let fetchedOrders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HostingOrder[];
      
      // Filter orders that contain hosting or domain items
      fetchedOrders = fetchedOrders.filter(order => 
        order.items && order.items.some(item => 
          item.itemType === 'domain' || 
          item.itemType === 'hosting' || 
          item.category === 'Hosting & Domains' ||
          item.isDigital
        )
      );
      
      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Error fetching hosting orders:', error);
      toast.error('Failed to load hosting orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
    setLoadingDetails(true);
    try {
      const domainQ = query(collection(db, 'domainOrders'), where('orderId', '==', orderId));
      const domainSnap = await getDocs(domainQ);
      setDomainOrders(domainSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DomainOrder[]);

      const hostingQ = query(collection(db, 'hostingAccounts'), where('orderId', '==', orderId));
      const hostingSnap = await getDocs(hostingQ);
      setHostingAccounts(hostingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HostingAccount[]);
    } catch (error) {
      console.error('Error fetching details:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewOrder = (order: HostingOrder) => {
    setSelectedOrder(order);
    fetchOrderDetails(order.id);
  };

  const handleViewEmailLogs = async () => {
    if (!selectedOrder) return;
    setShowEmailLogs(true);
    setLoadingEmailLogs(true);
    const logs = await getEmailLogsForOrder(selectedOrder.id);
    setEmailLogs(logs);
    setLoadingEmailLogs(false);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setDomainOrders([]);
    setHostingAccounts([]);
    setShowEmailLogs(false);
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!selectedOrder) return;
    setStatusUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        status: newStatus
      });
      toast.success('Order status updated');
      setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, status: newStatus as any } : o));
      setSelectedOrder({ ...selectedOrder, status: newStatus as any });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Order Error: ' + error.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDeleteOrder = async (order: HostingOrder) => {
    if (!order?.id) return;
    const docNum = order.documentNumber || order.id.slice(0, 8);
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete order ${docNum}? This will remove associated domain, hosting, and ledger records.`);
    if (!confirmDelete) return;

    setStatusUpdating(true);
    const toastId = toast.loading('Deleting order and linked records...');
    try {
      // 1. Delete associated domainOrders
      try {
        const dSnap = await getDocs(query(collection(db, 'domainOrders'), where('orderId', '==', order.id)));
        await Promise.all(dSnap.docs.map(d => deleteDoc(d.ref)));
      } catch (err) {
        console.warn('Error deleting domainOrders:', err);
      }

      // 2. Delete associated hostingAccounts
      try {
        const hSnap = await getDocs(query(collection(db, 'hostingAccounts'), where('orderId', '==', order.id)));
        await Promise.all(hSnap.docs.map(h => deleteDoc(h.ref)));
      } catch (err) {
        console.warn('Error deleting hostingAccounts:', err);
      }

      // 3. Delete linked transactions
      try {
        const tSnap1 = await getDocs(query(collection(db, 'transactions'), where('referenceId', '==', order.id)));
        await Promise.all(tSnap1.docs.map(t => deleteDoc(t.ref)));
        if (order.documentNumber) {
          const tSnap2 = await getDocs(query(collection(db, 'transactions'), where('documentNumber', '==', order.documentNumber)));
          await Promise.all(tSnap2.docs.map(t => deleteDoc(t.ref)));
        }
      } catch (err) {
        console.warn('Error deleting transactions:', err);
      }

      // 4. Delete from orders collection
      await deleteDoc(doc(db, 'orders', order.id));

      // 5. Delete from hostingOrders collection if it exists
      try {
        await deleteDoc(doc(db, 'hostingOrders', order.id));
      } catch {}

      // 6. Log audit
      try {
        await logAudit(
          'DELETE',
          'HostingOrder',
          `Deleted Hosting Order #${docNum} (${order.customerName || 'Customer'}) of amount ৳${order.total || 0}`,
          'Admin',
          { entityId: order.id, previousState: order }
        );
      } catch {}

      // 7. Update UI state
      setOrders(prev => prev.filter(o => o.id !== order.id));
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(null);
      }

      toast.success('Order and associated records deleted successfully', { id: toastId });
    } catch (error: any) {
      console.error('Failed to delete order:', error);
      toast.error('Failed to delete order: ' + error.message, { id: toastId });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleManualPaymentAction = async (action: 'accept' | 'reject') => {
    if (!selectedOrder) return;
    if (action === 'reject') {
      setPaymentAction('reject');
      setRejectionReason('');
      setShowPaymentConfirm(true);
      return;
    }
    setPaymentAction('accept');
    setShowPaymentConfirm(true);
  };

  const confirmPaymentAction = async () => {
    if (!selectedOrder || !paymentAction) return;
    setStatusUpdating(true);
    const now = new Date().toISOString();

    try {
      if (paymentAction === 'accept') {
        // 1. Direct Firestore update guarantees payment acceptance immediately
        const updatePayload: any = {
          paymentStatus: 'verified',
          paymentVerificationStatus: 'verified',
          paymentVerifiedAt: now,
          paidAmount: Number(selectedOrder.total) || 0,
          updatedAt: now,
        };
        if (selectedOrder.status === 'pending' || selectedOrder.status === 'failed') {
          updatePayload.status = 'processing';
          updatePayload.providerStatus = 'processing';
        }

        try {
          await updateDoc(doc(db, 'orders', selectedOrder.id), updatePayload);
        } catch (e) {
          console.warn('Direct order update note:', e);
        }
        try {
          await updateDoc(doc(db, 'hostingOrders', selectedOrder.id), updatePayload);
        } catch (e) {}

        // 2. Record ledger transaction if not present
        try {
          const existingTx = await getDocs(query(collection(db, 'transactions'), where('referenceId', '==', selectedOrder.id)));
          if (existingTx.empty) {
            await addDoc(collection(db, 'transactions'), {
              type: 'payment_received',
              amount: Number(selectedOrder.total),
              date: now,
              description: `Hosting/Domain Payment Verified (${selectedOrder.documentNumber || selectedOrder.id.slice(0, 8)})`,
              entityId: selectedOrder.userId || selectedOrder.customerEmail || selectedOrder.id,
              entityName: selectedOrder.customerName || 'Customer',
              entityType: 'customer',
              paymentMethod: selectedOrder.paymentMethod || 'bkash',
              referenceId: selectedOrder.id,
              documentNumber: selectedOrder.documentNumber || `INV-${selectedOrder.id.slice(0, 6)}`,
              createdAt: now
            });
          }
        } catch (txErr) {
          console.warn('Failed to record transaction:', txErr);
        }

        // 3. Log audit
        try {
          await logAudit(
            'STATUS_CHANGE',
            'HostingOrder',
            `Accepted payment of ৳${selectedOrder.total} for Order #${selectedOrder.documentNumber || selectedOrder.id.slice(0, 8)} (${selectedOrder.customerName})`,
            'Admin',
            { entityId: selectedOrder.id, newState: { paymentStatus: 'verified' } }
          );
        } catch {}

        const updatedOrder = {
          ...selectedOrder,
          ...updatePayload,
        } as HostingOrder;
        setSelectedOrder(updatedOrder);
        setOrders(prev => prev.map(order => order.id === updatedOrder.id ? updatedOrder : order));
        setShowPaymentConfirm(false);
        setPaymentAction(null);
        setRejectionReason('');

        // 4. Try backend fulfillment / notification
        try {
          const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken();
          const response = await fetch(getApiUrl(`/api/orders/admin/${selectedOrder.id}/payment/verify`), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ action: 'accept' }),
          });
          const data = await response.json();
          if (response.ok && data.success) {
            toast.success(data.message || 'Payment accepted and verified successfully!');
            if (data.fulfillmentError) {
              toast('Provisioning note: ' + data.fulfillmentError, { icon: 'ℹ️', duration: 6000 });
            }
          } else {
            toast.success('Payment accepted and verified in system!');
            if (data.error) {
              toast('Provisioning note: ' + data.error, { icon: 'ℹ️', duration: 6000 });
            }
          }
        } catch (apiErr) {
          toast.success('Payment verified successfully in database!');
        }
      } else {
        // Reject payment
        const updatePayload: any = {
          paymentStatus: 'rejected',
          paymentVerificationStatus: 'rejected',
          paymentRejectionReason: rejectionReason || 'Manual verification failed',
          status: 'cancelled',
          providerStatus: 'cancelled',
          updatedAt: now,
        };
        try {
          await updateDoc(doc(db, 'orders', selectedOrder.id), updatePayload);
        } catch (e) {}
        try {
          await updateDoc(doc(db, 'hostingOrders', selectedOrder.id), updatePayload);
        } catch (e) {}

        const updatedOrder = {
          ...selectedOrder,
          ...updatePayload,
        } as HostingOrder;
        setSelectedOrder(updatedOrder);
        setOrders(prev => prev.map(order => order.id === updatedOrder.id ? updatedOrder : order));
        setShowPaymentConfirm(false);
        setPaymentAction(null);
        setRejectionReason('');
        toast.success('Payment rejected');

        try {
          const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken();
          await fetch(getApiUrl(`/api/orders/admin/${selectedOrder.id}/payment/verify`), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ action: 'reject', reason: rejectionReason }),
          });
        } catch {}
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      toast.error('Payment Error: ' + error.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const updateServiceStatus = async (collectionName: 'domainOrders' | 'hostingAccounts', documentId: string, newStatus: string, updates: any = {}) => {
    try {
      await updateDoc(doc(db, collectionName, documentId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        ...updates
      });
      toast.success(`${collectionName === 'domainOrders' ? 'Domain' : 'Hosting account'} updated!`);
      if (collectionName === 'domainOrders') {
        setDomainOrders(prev => prev.map(d => d.id === documentId ? { ...d, status: newStatus, ...updates } : d));
      } else {
        setHostingAccounts(prev => prev.map(h => h.id === documentId ? { ...h, status: newStatus, ...updates } : h));
      }

      if (newStatus === 'active') {
        const wantsEmail = window.confirm("Service is now Active! Do you want to send the Service Activation Email to the customer?");
        if (wantsEmail && selectedOrder) {
          const targetHosting = collectionName === 'hostingAccounts' ? hostingAccounts.find(h => h.id === documentId) : null;
          const isVps = Boolean(targetHosting && (targetHosting.type === 'vps' || targetHosting.provider === 'vps' || targetHosting.vpsDetails || (selectedOrder as any).vpsConfig));
          const vpsDetails = targetHosting?.vpsDetails || (selectedOrder as any).vpsConfig || {};

          const serviceName = collectionName === 'domainOrders' 
            ? domainOrders.find(d => d.id === documentId)?.domain 
            : hostingAccounts.find(h => h.id === documentId)?.planId;
          
          let serverIp = updates.serverIp || hostingAccounts.find(h => h.id === documentId)?.serverIp;
          let controlPanelUrl = updates.controlPanelUrl || hostingAccounts.find(h => h.id === documentId)?.controlPanelUrl;

          toast.loading("Sending email...", { id: 'emailSend' });
          const success = await sendServiceActivationEmail(selectedOrder.id, selectedOrder.customerEmail, {
            domain: isVps ? (vpsDetails.hostname || targetHosting?.planId) : serviceName,
            serverIp,
            controlPanelUrl,
            isVps,
            hostname: vpsDetails.hostname,
            os: vpsDetails.os,
            serverLocation: vpsDetails.serverLocation,
            rootPassword: vpsDetails.rootPassword,
            sshCommand: `ssh root@${serverIp || 'YOUR_SERVER_IP'}`
          });
          if (success) {
            toast.success("Email sent & logged successfully!", { id: 'emailSend' });
          } else {
            toast.error("Failed to send email.", { id: 'emailSend' });
          }
        }
      }
    } catch (error) {
      console.error('Error updating service status:', error);
      toast.error('Service Error: ' + error.message);
    }
  };

  const handleUpdateAuthCode = async (domainOrder: DomainOrder) => {
    if (!newAuthCodeVal.trim()) {
      toast.error('Please enter a valid Auth/EPP Code');
      return;
    }
    setSavingAuthCode(true);
    try {
      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken();
      const res = await fetch(getApiUrl('/api/domains/update-transfer-auth-code'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: domainOrder.orderId,
          domain: domainOrder.domain,
          authCode: newAuthCodeVal.trim(),
          domainOrderId: domainOrder.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Auth/EPP Code updated successfully!');
        setDomainOrders(prev => prev.map(d => d.id === domainOrder.id ? { ...d, authCode: newAuthCodeVal.trim(), eppCode: newAuthCodeVal.trim(), fulfillmentError: undefined } : d));
        setEditingAuthCodeId(null);
        setNewAuthCodeVal('');
      } else {
        toast.error(data.error || 'Failed to update Auth Code');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update Auth Code');
    } finally {
      setSavingAuthCode(false);
    }
  };

  const [syncingTransferId, setSyncingTransferId] = useState<string | null>(null);

  const handleSyncTransferStatus = async (domainOrder: DomainOrder) => {
    setSyncingTransferId(domainOrder.id);
    try {
      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken();
      const res = await fetch(getApiUrl('/api/domains/transfer/sync-status'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: domainOrder.id,
          domain: domainOrder.domain,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Transfer status synced: ${data.data?.status || 'updated'}`);
        setDomainOrders(prev => prev.map(d => d.id === domainOrder.id ? {
          ...d,
          status: data.data.status,
          providerStatus: data.data.providerStatus,
          transferStatus: data.data.transferStatus,
        } : d));
      } else {
        toast.error(data.error || 'Failed to sync transfer status');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to sync transfer status');
    } finally {
      setSyncingTransferId(null);
    }
  };

  const handleProvisionCloudLinux = async (order: HostingOrder) => {
    const ip = prompt("Enter Server IP Address to provision CloudLinux License:");
    if (!ip) return;

    let licenseType = 1; // Default
    const clItem = order.items?.find((i: any) => i.itemType === 'license' && i.name.toLowerCase().includes('cloudlinux'));
    if (clItem) {
      if (clItem.id?.includes('solo')) licenseType = 2; // Solo
      if (clItem.id?.includes('admin')) licenseType = 41; // Admin
      if (clItem.id?.includes('shared')) licenseType = 1; // Shared
    }

    setStatusUpdating(true);
    const toastId = toast.loading('Provisioning CloudLinux License...');
    try {
      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken();
      
      const response = await fetch(getApiUrl('/api/hosting/cloudlinux/license'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ip, type: licenseType })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(`CloudLinux License successfully provisioned for ${ip}`, { id: toastId });
        await updateDoc(doc(db, 'orders', order.id), {
          status: 'completed',
          providerStatus: 'active',
          updatedAt: new Date().toISOString(),
          cloudLinuxIp: ip,
        });
        await updateDoc(doc(db, 'hostingOrders', order.id), {
          status: 'active',
          updatedAt: new Date().toISOString(),
          cloudLinuxIp: ip,
        });
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'active' as any } : o));
        if (selectedOrder?.id === order.id) {
          setSelectedOrder(prev => prev ? { ...prev, status: 'active' as any } : null);
        }
      } else {
        throw new Error(data.error || 'Failed to provision license');
      }
    } catch (e: any) {
      toast.error('CloudLinux Error: ' + e.message, { id: toastId });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAcceptOrder = async (order: HostingOrder) => {
    setStatusUpdating(true);
    const toastId = toast.loading('Accepting payment and provisioning order...');
    const now = new Date().toISOString();
    try {
      // 1. Direct Firestore write to ensure payment verification is persisted immediately
      const updatePayload: any = {
        paymentStatus: 'verified',
        paymentVerificationStatus: 'verified',
        paymentVerifiedAt: now,
        paidAmount: Number(order.total) || 0,
        status: 'processing',
        providerStatus: 'processing',
        updatedAt: now,
      };

      try {
        await updateDoc(doc(db, 'orders', order.id), updatePayload);
      } catch (e) {
        console.warn('Direct order update note:', e);
      }
      try {
        await updateDoc(doc(db, 'hostingOrders', order.id), updatePayload);
      } catch (e) {}

      // 2. Record ledger transaction if not present
      try {
        const txQ = query(collection(db, 'transactions'), where('referenceId', '==', order.id));
        const txSnap = await getDocs(txQ);
        if (txSnap.empty) {
          await addDoc(collection(db, 'transactions'), {
            type: 'payment_received',
            amount: Number(order.total) || 0,
            date: now,
            description: `Hosting/Domain Payment Verified (${order.documentNumber || order.id.slice(0, 8)})`,
            entityId: order.userId || order.customerEmail || order.id,
            entityName: order.customerName || 'Customer',
            entityType: 'customer',
            paymentMethod: order.paymentMethod || 'bkash',
            referenceId: order.id,
            documentNumber: order.documentNumber || `INV-${order.id.slice(0, 6)}`,
            createdAt: now
          });
        }
      } catch (txErr) {
        console.warn('Failed to record transaction:', txErr);
      }

      // 3. Log audit trail
      try {
        await logAudit(
          'STATUS_CHANGE',
          'HostingOrder',
          `Accepted payment of ৳${order.total} for Order #${order.documentNumber || order.id.slice(0, 8)} (${order.customerName})`,
          'Admin',
          { entityId: order.id, newState: { paymentStatus: 'verified', status: 'processing' } }
        );
      } catch {}

      const updatedOrder = { ...order, ...updatePayload } as HostingOrder;
      setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(updatedOrder);
      }

      // 4. Call backend fulfillment / payment verify
      try {
        const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken();
        const response = await fetch(getApiUrl(`/api/orders/admin/${order.id}/payment/verify`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'accept' }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          toast.success(data.message || 'Payment accepted & provisioning started!', { id: toastId });
          if (data.fulfillmentError) {
            toast('Provisioning note: ' + data.fulfillmentError, { icon: 'ℹ️', duration: 6000 });
          }
        } else {
          toast.success('Payment accepted and recorded in database!', { id: toastId });
          if (data.error || data.message) {
            toast('Provisioning notice: ' + (data.error || data.message), { icon: 'ℹ️', duration: 6000 });
          }
        }
      } catch (apiErr: any) {
        toast.success('Payment accepted and recorded in database!', { id: toastId });
      }
    } catch (error: any) {
      console.error('Accept order error:', error);
      toast.error('Error: ' + error.message, { id: toastId });
    } finally {
      setStatusUpdating(false);
      fetchOrders();
      if (selectedOrder?.id === order.id) {
        fetchOrderDetails(order.id);
      }
    }
  };

  const handleMarkCompletedOrder = async (order: HostingOrder) => {
    setStatusUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'completed',
        providerStatus: 'completed',
        updatedAt: new Date().toISOString(),
      });
      try {
        await updateDoc(doc(db, 'hostingOrders', order.id), {
          status: 'completed',
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {}

      // Update linked hosting accounts & domain orders to active
      const hostingQ = query(collection(db, 'hostingAccounts'), where('orderId', '==', order.id));
      const hostingSnap = await getDocs(hostingQ);
      for (const hDoc of hostingSnap.docs) {
        await updateDoc(doc(db, 'hostingAccounts', hDoc.id), {
          status: 'active',
          provisioningStatus: 'completed',
          updatedAt: new Date().toISOString(),
        });
      }

      const domainQ = query(collection(db, 'domainOrders'), where('orderId', '==', order.id));
      const domainSnap = await getDocs(domainQ);
      for (const dDoc of domainSnap.docs) {
        await updateDoc(doc(db, 'domainOrders', dDoc.id), {
          status: 'active',
          updatedAt: new Date().toISOString(),
        });
      }

      toast.success('Order marked as Completed! Account is live.');
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'completed' as any } : o));
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(prev => prev ? { ...prev, status: 'completed' as any } : null);
      }

      const wantsEmail = window.confirm("Service is now Live & Completed! Do you want to send the Service Activation Email to the customer?");
      if (wantsEmail) {
        const firstAccount = hostingSnap.docs[0]?.data();
        await sendServiceActivationEmail(order.id, order.customerEmail, {
          domain: firstAccount?.domain || order.items?.find(i => i.domain)?.domain || 'Hosting Service',
          serverIp: firstAccount?.serverIp || 'Assigned Server',
          controlPanelUrl: firstAccount?.controlPanelUrl || 'https://cpanel.click2itbd.com'
        });
        toast.success("Activation email sent successfully!");
      }
    } catch (error: any) {
      console.error('Mark completed error:', error);
      toast.error('Error: ' + error.message);
    } finally {
      setStatusUpdating(false);
      fetchOrders();
      if (selectedOrder) {
        fetchOrderDetails(selectedOrder.id);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'provisioning': return 'bg-purple-100 text-purple-800 border border-purple-200 animate-pulse';
      case 'processing': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'fulfillment_pending': return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'failed': return 'bg-red-100 text-red-800 border border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border border-gray-200';
      default: return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    }
  };

  const generateInvoice = (order: HostingOrder) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    let currentY = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

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
    doc.text('INVOICE', pageWidth - 14, 20, { align: 'right' });

    currentY += 15;
    doc.setLineWidth(0.5);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Billed To:', 14, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 5;
    
    const startY = currentY;
    const nameLines = doc.splitTextToSize(order.customerName || 'N/A', 120);
    doc.text(nameLines, 14, currentY);
    currentY += (nameLines.length * 5);
    
    const emailLines = doc.splitTextToSize(order.customerEmail || 'N/A', 120);
    doc.text(emailLines, 14, currentY);
    currentY += (emailLines.length * 5);
    
    const phoneLines = doc.splitTextToSize(order.customerPhone || 'N/A', 120);
    doc.text(phoneLines, 14, currentY);
    currentY += (phoneLines.length * 5);
    
    let detailsY = startY;
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Details:', pageWidth - 60, detailsY);
    doc.setFont('helvetica', 'normal');
    detailsY += 5;
    doc.text(`Invoice No: ${order.documentNumber || order.id.slice(0, 8)}`, pageWidth - 60, detailsY);
    detailsY += 5;
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, pageWidth - 60, detailsY);
    detailsY += 5;
    doc.text(`Status: ${order.status.toUpperCase()}`, pageWidth - 60, detailsY);

    currentY += 15;

    const tableBody = (order.items || []).map(item => [
      item.name,
      item.itemType === 'domain' ? `${item.termYears || 1} Year(s)` : (item.billingCycle || 'Monthly'),
      `BDT ${item.price.toLocaleString()}`,
      `BDT ${item.price.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Description', 'Term/Cycle', 'Price', 'Total']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [10, 22, 40] },
      styles: { fontSize: 10 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    const totalX = pageWidth - 60;
    doc.text('Subtotal:', totalX, currentY);
    doc.text(`BDT ${order.total.toLocaleString()}`, pageWidth - 14, currentY, { align: 'right' });
    
    currentY += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Grand Total:', totalX, currentY);
    doc.text(`BDT ${order.total.toLocaleString()}`, pageWidth - 14, currentY, { align: 'right' });

    doc.save(`Invoice_${order.documentNumber || order.id.slice(0, 8)}.pdf`);
    toast.success('Invoice generated successfully!');
  };

  
  const processedOrders = orders.filter(o => 
    o.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalPages = Math.ceil(processedOrders.length / itemsPerPage);
  const currentOrders = processedOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Server className="w-6 h-6 text-blue-600" />
          Hosting & Domain Orders
        </h2>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Order ID & Date</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Customer</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Order Items</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Payment</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : processedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <FileText className="w-10 h-10 mb-3 text-gray-300" />
                      <p className="text-base font-semibold text-gray-600">No hosting orders found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">{order.documentNumber || order.id.slice(0, 8)}</div>
                      <div className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">{order.customerName}</div>
                      <div className="text-xs text-gray-500">{order.customerEmail}</div>
                      {order.customerPhone && <div className="text-xs text-gray-500">{order.customerPhone}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {order.items?.map((item: any, i: number) => (
                          <div key={i} className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded w-fit max-w-[200px] truncate flex items-center gap-1.5">
                            {item.targetType === 'domain' ? (
                              <Globe size={12} className="text-blue-500 shrink-0" />
                            ) : (
                              <Server size={12} className="text-emerald-500 shrink-0" />
                            )}
                            <span className="truncate">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">
                        {`BDT ${order.total.toLocaleString()}`}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={cn("text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded",
                          (order as any).paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        )}>
                          {(order as any).paymentStatus || 'Unpaid'}
                        </span>
                        <span className="text-xs font-medium text-gray-500 capitalize">
                          • {order.paymentMethod || 'Manual'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1.5 rounded-lg text-xs font-bold capitalize flex items-center gap-1.5 w-fit shadow-sm", getStatusColor(order.status))}>
                        {order.status === 'completed' && <CheckCircle className="w-3.5 h-3.5" />}
                        {order.status === 'processing' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {order.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                        {order.status === 'fulfillment_pending' ? 'Awaiting Registrar' : order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        {order.paymentStatus !== 'verified' ? (
                          <button
                            onClick={() => handleAcceptOrder(order)}
                            disabled={statusUpdating}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-200 transition"
                            title="Accept payment and process order"
                          >
                            Accept
                          </button>
                        ) : (
                          <>
                            {(order.status === 'provisioning' || order.status === 'processing' || order.status === 'fulfillment_pending') && (
                              <button
                                onClick={() => handleMarkCompletedOrder(order)}
                                disabled={statusUpdating}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm shadow-emerald-200 transition"
                                title="Mark completed once live"
                              >
                                Complete
                              </button>
                            )}
                            {order.status === 'failed' && (
                              <button
                                onClick={() => handleAcceptOrder(order)}
                                disabled={statusUpdating}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm shadow-amber-200 transition"
                                title="Retry provisioning"
                              >
                                Retry
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 rounded-lg text-xs font-bold transition-colors border border-gray-200 hover:border-blue-200 flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order)}
                          disabled={statusUpdating}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors border border-red-200 flex items-center gap-1"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={processedOrders.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Order {selectedOrder.documentNumber || selectedOrder.id}</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDeleteOrder(selectedOrder)}
                  disabled={statusUpdating}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition flex items-center gap-1.5 border border-red-200"
                  title="Delete Order"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                <button
                  onClick={handleViewEmailLogs}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                >
                  Email History
                </button>
                <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">Customer Details</h4>
                  <div className="text-sm space-y-1 text-gray-600">
                    <p><span className="font-medium text-gray-900">Name:</span> {selectedOrder.customerName}</p>
                    <p><span className="font-medium text-gray-900">Email:</span> {selectedOrder.customerEmail}</p>
                    <p><span className="font-medium text-gray-900">Phone:</span> {selectedOrder.customerPhone}</p>
                    {selectedOrder.company && <p><span className="font-medium text-gray-900">Company:</span> {selectedOrder.company}</p>}
                    <p><span className="font-medium text-gray-900">Address:</span> {selectedOrder.shippingAddress}</p>
                  </div>
                </div>

                                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">Order Items</h4>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                            {item.itemType === 'domain_transfer' && (() => {
                              const relatedDomainOrder = domainOrders.find(d => 
                                String(d.domain || '').toLowerCase() === String(item.domain || item.id?.replace('domain_transfer_', '') || '').toLowerCase()
                              );
                              const code = item.eppCode || item.authCode || relatedDomainOrder?.authCode || relatedDomainOrder?.eppCode;
                              return (
                                <div className="mt-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-yellow-800 flex items-center gap-1">
                                      <Key size={12} /> Auth / EPP Code:
                                    </span>
                                    {code ? (
                                      <div className="flex items-center gap-1.5">
                                        <code className="bg-white px-2 py-0.5 rounded border border-yellow-200 text-yellow-900 font-mono font-bold select-all">{code}</code>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(code);
                                            toast.success('Auth code copied!');
                                          }}
                                          className="p-1 hover:bg-yellow-100 rounded text-yellow-700 transition-colors"
                                          title="Copy Auth Code"
                                        >
                                          <Copy size={12} />
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-red-600 font-semibold italic">Not recorded</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          <p className="font-bold text-blue-600">BDT {item.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b pb-2">Workflow</h4>
                  <div className="text-sm space-y-2 text-gray-600">
                    <p><span className="font-medium text-gray-900">Payment Method:</span> <span className="uppercase font-semibold">{selectedOrder.paymentMethod}</span></p>
                    <p><span className="font-medium text-gray-900">Shipping:</span> {`BDT ${selectedOrder.shippingCost.toLocaleString()}`}</p>
                    <p className="text-lg font-bold text-gray-900">Total: {`BDT ${selectedOrder.total.toLocaleString()}`}</p>
                    
                    <div className="pt-2 flex items-center gap-3">
                      <span className="font-medium text-gray-900">Order Status:</span>
                      <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase", getStatusColor(selectedOrder.status))}>
                        {selectedOrder.status === 'fulfillment_pending' ? 'Awaiting Registrar' : selectedOrder.status}
                      </span>
                    </div>

                    {/* Workflow Quick Action Buttons */}
                    <div className="pt-2">
                      {(() => {
                                                  const hasDomain = selectedOrder.items?.some((i: any) => i.itemType === 'domain' || i.itemType === 'domain_renewal' || i.itemType === 'domain_transfer') || domainOrders.length > 0;
                          const isVpsOrder = selectedOrder.items?.some((i: any) => i.itemType === 'hosting' && (i.planSlug?.startsWith('vps') || i.id?.includes('vps') || i.name?.toLowerCase().includes('vps'))) || hostingAccounts.some(h => h.type === 'vps' || h.provider === 'vps' || Boolean(h.vpsDetails)) || Boolean((selectedOrder as any).vpsConfig);
                          const hasHosting = (selectedOrder.items?.some((i: any) => i.itemType === 'hosting' && !i.planSlug?.startsWith('vps') && !i.id?.includes('vps') && !i.name?.toLowerCase().includes('vps')) || hostingAccounts.some(h => h.type !== 'vps' && h.provider !== 'vps' && !h.vpsDetails)) && !isVpsOrder;
                          const hasCloudLinux = selectedOrder.items?.some((i: any) => i.itemType === 'license' && i.name.toLowerCase().includes('cloudlinux'));
                          
                          let acceptLabel = 'Accept & Process Order';
                          let retryLabel = 'Retry Processing';
                          let ActionIcon = CheckCircle;

                          if (hasCloudLinux) {
                            acceptLabel = 'Accept & Provision CloudLinux';
                            retryLabel = 'Retry CloudLinux Provisioning';
                            ActionIcon = Server;
                          } else if (isVpsOrder) {
                            acceptLabel = 'Accept & Queue VPS Setup';
                            retryLabel = 'Retry VPS Order';
                            ActionIcon = Terminal;
                          } else if (hasDomain && hasHosting) {
                            acceptLabel = 'Accept & Provision Order (Domain + WHM)';
                            retryLabel = 'Retry Provisioning (Domain + WHM)';
                          } else if (hasDomain) {
                            acceptLabel = 'Accept & Provision Domain';
                            retryLabel = 'Retry Domain Registration';
                            ActionIcon = Globe;
                          } else if (hasHosting) {
                            acceptLabel = 'Accept & Provision WHM Account';
                            retryLabel = 'Retry WHM Provisioning';
                            ActionIcon = Server;
                          }

                        return (
                          <>
                            {selectedOrder.status === 'pending' && (
                                                              <button
                                  onClick={() => hasCloudLinux ? handleProvisionCloudLinux(selectedOrder) : handleAcceptOrder(selectedOrder)}
                                  disabled={statusUpdating}
                                  className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                <ActionIcon className="w-4 h-4" />
                                {acceptLabel}
                              </button>
                            )}

                            {(selectedOrder.status === 'provisioning' || selectedOrder.status === 'processing' || selectedOrder.status === 'fulfillment_pending') && (
                              <div className="space-y-2">
                                <button
                                  onClick={() => handleMarkCompletedOrder(selectedOrder)}
                                  disabled={statusUpdating}
                                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Mark Completed (Live)
                                </button>
                                <p className="text-xs text-purple-600 font-medium text-center animate-pulse">
                                  {selectedOrder.status === 'fulfillment_pending'
                                    ? 'Awaiting registrar transfer approval (5-7 days). Click Complete once verified.'
                                    : 'Provisioning in progress. Click Complete once verified.'}
                                </p>
                              </div>
                            )}

                            {selectedOrder.status === 'failed' && (
                              <div className="space-y-2">
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                                  <p className="font-bold">Provisioning Status:</p>
                                  <p>{(selectedOrder as any).provisioningError || (hasDomain ? 'Domain registration pending Openprovider balance or provider approval.' : 'WHM provisioning failed or server timed out.')}</p>
                                </div>
                                                                  <button
                                    onClick={() => hasCloudLinux ? handleProvisionCloudLinux(selectedOrder) : handleAcceptOrder(selectedOrder)}
                                    disabled={statusUpdating}
                                    className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                                  >
                                  <ActionIcon className="w-4 h-4" />
                                  {retryLabel}
                                </button>
                              </div>
                            )}
                            {selectedOrder.status === 'fulfillment_pending' && (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                Openprovider accepted the domain request. Registration is not active yet; this order will not be submitted again automatically.
                              </div>
                            )}
                            {selectedOrder.status === 'manual_review' && (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                A provider result needs manual verification. Check the Openprovider panel and domain request details before retrying to avoid duplicate registration or transfer.
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Manual Payment Verification */}
                {(selectedOrder.paymentMethod?.toLowerCase().includes('bkash') ||
                  selectedOrder.paymentMethod?.toLowerCase().includes('nagad') ||
                  selectedOrder.paymentMethod?.toLowerCase().includes('rocket') ||
                  selectedOrder.paymentMethod?.toLowerCase().includes('manual') ||
                  selectedOrder.paymentMethod?.toLowerCase().includes('bank') ||
                  selectedOrder.transactionId ||
                  selectedOrder.paymentStatus !== 'verified') && (
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-pink-600" />
                      Payment Verification ({selectedOrder.paymentMethod || 'Manual'})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Transaction ID</p>
                        <p className="font-mono font-bold text-gray-900">{selectedOrder.transactionId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Payment Status</p>
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium capitalize", 
                          selectedOrder.paymentStatus === 'verified' ? 'bg-green-100 text-green-800' :
                          selectedOrder.paymentStatus === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                          selectedOrder.paymentStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        )}>
                          {selectedOrder.paymentStatus || 'pending'}
                        </span>
                      </div>
                      {selectedOrder.paymentVerificationStatus && (
                        <div>
                          <p className="text-gray-500">Verification Status</p>
                          <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium capitalize",
                            selectedOrder.paymentVerificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                            selectedOrder.paymentVerificationStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                            selectedOrder.paymentVerificationStatus === 'review' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          )}>
                            {selectedOrder.paymentVerificationStatus}
                          </span>
                        </div>
                      )}
                      {(selectedOrder as any).paymentVerifiedAt && (
                        <div>
                          <p className="text-gray-500">Verified At</p>
                          <p className="text-gray-900">{new Date((selectedOrder as any).paymentVerifiedAt).toLocaleString()}</p>
                        </div>
                      )}
                      {(selectedOrder as any).paymentRejectedAt && (
                        <div>
                          <p className="text-gray-500">Rejected At</p>
                          <p className="text-gray-900">{new Date((selectedOrder as any).paymentRejectedAt).toLocaleString()}</p>
                        </div>
                      )}
                      {(selectedOrder as any).paymentRejectionReason && (
                        <div className="md:col-span-2">
                          <p className="text-gray-500">Rejection Reason</p>
                          <p className="text-red-600">{(selectedOrder as any).paymentRejectionReason}</p>
                        </div>
                      )}
                    </div>
                    
                    {selectedOrder.paymentStatus !== 'verified' && (
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => handleManualPaymentAction('accept')}
                          disabled={statusUpdating}
                          className="flex-1 py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Accept Payment
                        </button>
                        <button
                          onClick={() => handleManualPaymentAction('reject')}
                          disabled={statusUpdating}
                          className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Reject Payment
                        </button>
                      </div>
                    )}

                    {selectedOrder.paymentStatus === 'verified' && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium">Payment Verified</span>
                        </div>
                        {(selectedOrder as any).paymentVerifiedAt && (
                          <p className="text-xs mt-1">Verified at: {new Date((selectedOrder as any).paymentVerifiedAt).toLocaleString()}</p>
                        )}
                      </div>
                    )}

                    {selectedOrder.paymentStatus === 'rejected' && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                        <div className="flex items-center gap-2">
                          <X className="w-4 h-4" />
                          <span className="font-medium">Payment Rejected</span>
                        </div>
                        {(selectedOrder as any).paymentRejectionReason && (
                          <p className="text-xs mt-1">Reason: {(selectedOrder as any).paymentRejectionReason}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {loadingDetails ? (
                <div className="py-8 text-center text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                  Loading provisioning details...
                </div>
              ) : (
                <div className="space-y-6">
                  {domainOrders.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-600" />
                        Domain Registrations
                      </h4>
                      <div className="grid gap-3">
                        {domainOrders.map(domain => (
                          <div key={domain.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-900 text-lg">{domain.domain}</p>
                                  {domain.type === 'transfer' && (
                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      Transfer
                                    </span>
                                  )}
                                  {(domain.type === 'renewal' || domain.action === 'renewal') && (
                                    <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      Renewal
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">{domain.years} Year(s) &bull; {`BDT ${domain.price.toLocaleString()}`}</p>
                              </div>
                              <select
                                value={domain.status}
                                onChange={(e) => updateServiceStatus('domainOrders', domain.id, e.target.value)}
                                className={cn("px-2 py-1 rounded text-xs font-medium uppercase border-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer", domain.status === 'active' || domain.status === 'registered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}
                              >
                                <option value="pending">Pending</option>
                                <option value="registered">Registered</option>
                                <option value="active">Active</option>
                                <option value="expiring">Expiring</option>
                                <option value="expired">Expired</option>
                                <option value="suspended">Suspended</option>
                              </select>
                            </div>
                            {domain.type === 'transfer' && (
                              <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                    <Key size={13} className="text-amber-700" />
                                    <span>Auth / EPP Code:</span>
                                  </div>
                                  {editingAuthCodeId === domain.id ? (
                                    <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                                      <input
                                        type="text"
                                        value={newAuthCodeVal}
                                        onChange={(e) => setNewAuthCodeVal(e.target.value)}
                                        placeholder="Enter updated code"
                                        className="w-full px-2 py-1 text-xs border border-amber-300 rounded font-mono bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                      />
                                      <button
                                        type="button"
                                        disabled={savingAuthCode}
                                        onClick={() => handleUpdateAuthCode(domain)}
                                        className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold flex items-center gap-1 disabled:opacity-50"
                                      >
                                        <Check size={12} /> Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { setEditingAuthCodeId(null); setNewAuthCodeVal(''); }}
                                        className="px-1.5 py-1 text-gray-500 hover:text-gray-700"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      {domain.authCode || domain.eppCode ? (
                                        <>
                                          <code className="bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-950 font-mono font-bold select-all">
                                            {domain.authCode || domain.eppCode}
                                          </code>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              navigator.clipboard.writeText(domain.authCode || domain.eppCode || '');
                                              toast.success('Auth code copied!');
                                            }}
                                            className="p-1 hover:bg-amber-100 rounded text-amber-800 transition-colors"
                                            title="Copy Auth Code"
                                          >
                                            <Copy size={12} />
                                          </button>
                                        </>
                                      ) : (
                                        <span className="text-red-600 italic font-semibold">Not recorded</span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingAuthCodeId(domain.id);
                                          setNewAuthCodeVal(domain.authCode || domain.eppCode || '');
                                        }}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-amber-800 bg-amber-100/80 hover:bg-amber-200 rounded transition-colors ml-1"
                                        title="Update Auth Code"
                                      >
                                        <Edit3 size={11} /> Edit Code
                                      </button>
                                      <button
                                        type="button"
                                        disabled={syncingTransferId === domain.id}
                                        onClick={() => handleSyncTransferStatus(domain)}
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 bg-blue-100/80 hover:bg-blue-200 rounded transition-colors ml-1 disabled:opacity-50"
                                        title="Sync live transfer status from Openprovider"
                                      >
                                        <RefreshCw size={11} className={syncingTransferId === domain.id ? "animate-spin" : ""} />
                                        Sync Status
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <p className="text-[11px] text-amber-800/80">
                                  <strong>Requirement:</strong> Domain must be <strong>unlocked</strong> (Transfer/Registrar Lock disabled) at the previous registrar.
                                </p>
                              </div>
                            )}
                            {(domain.registrationId || domain.providerCode || domain.providerHttpStatus || domain.providerRequestStartedAt || domain.fulfillmentError) && (
                              <div className="mt-2 space-y-1 text-xs text-gray-600">
                                <p>
                                  Openprovider status: {domain.providerStatus || 'not returned'}
                                  {domain.registrationId && ` · Registration ID: ${domain.registrationId}`}
                                </p>
                                {(domain.providerCode || domain.providerHttpStatus) && (
                                  <p>
                                    API code: {domain.providerCode || '-'} · HTTP: {domain.providerHttpStatus || '-'}
                                  </p>
                                )}
                                <p>
                                  Request sent: {domain.providerRequestStartedAt ? new Date(domain.providerRequestStartedAt).toLocaleString() : 'Not recorded'}
                                  {' · '}
                                  Response received: {domain.providerResponseReceivedAt ? new Date(domain.providerResponseReceivedAt).toLocaleString() : 'Not recorded'}
                                </p>
                              </div>
                            )}
                            {domain.fulfillmentError && (
                              <p className="mt-1 text-xs text-amber-700">{domain.fulfillmentError}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {hostingAccounts.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                        <Server className="w-4 h-4 text-blue-600" />
                        Hosting & Cloud VPS Accounts
                      </h4>
                      <div className="grid gap-3">
                        {hostingAccounts.map(hosting => {
                          const isVps = hosting.type === 'vps' || hosting.provider === 'vps' || Boolean(hosting.vpsDetails) || Boolean((selectedOrder as any).vpsConfig);
                          const vps = hosting.vpsDetails || (selectedOrder as any).vpsConfig || {};

                          if (isVps) {
                            return (
                              <div key={hosting.id} className="p-5 bg-gradient-to-br from-purple-50/70 via-indigo-50/30 to-white border border-purple-200 rounded-xl space-y-4 shadow-xs">
                                <div className="flex flex-wrap justify-between items-start gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-700 text-white flex items-center gap-1 shadow-sm">
                                        <Terminal className="w-3 h-3" /> Cloud VPS Instance
                                      </span>
                                      <span className="font-bold text-gray-900 uppercase text-sm">{hosting.planId || 'VPS'}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Billing: <span className="capitalize font-medium">{hosting.billingCycle}</span></p>
                                  </div>
                                  <select
                                    value={hosting.status}
                                    onChange={(e) => updateServiceStatus('hostingAccounts', hosting.id, e.target.value)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-xs font-bold uppercase border-none focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer shadow-sm",
                                      hosting.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                                      hosting.status === 'pending_setup' || hosting.status === 'provisioning' ? 'bg-amber-100 text-amber-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    )}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="pending_setup">Pending Setup</option>
                                    <option value="provisioning">Provisioning</option>
                                    <option value="active">Active (Live)</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="terminated">Terminated</option>
                                  </select>
                                </div>

                                {/* VPS Client Configuration */}
                                <div className="bg-white p-4 rounded-xl border border-purple-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs shadow-xs">
                                  <div>
                                    <span className="text-gray-500 font-medium">Server Hostname:</span>
                                    <div className="font-mono font-bold text-gray-900 mt-0.5 flex items-center gap-1.5">
                                      <span>{vps.hostname || hosting.domain || 'Not configured'}</span>
                                      {vps.hostname && (
                                        <button 
                                          type="button" 
                                          onClick={() => { navigator.clipboard.writeText(vps.hostname); toast.success('Hostname copied'); }}
                                          className="text-gray-400 hover:text-purple-600 transition-colors"
                                          title="Copy Hostname"
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    <span className="text-gray-500 font-medium">Operating System:</span>
                                    <div className="font-semibold text-purple-700 mt-0.5">{vps.os || 'Ubuntu / Linux'}</div>
                                  </div>

                                  <div>
                                    <span className="text-gray-500 font-medium">Datacenter Location:</span>
                                    <div className="font-semibold text-gray-800 mt-0.5">{vps.serverLocation || 'BDIX Dhaka / Singapore'}</div>
                                  </div>

                                  <div>
                                    <span className="text-gray-500 font-medium">Root Password:</span>
                                    <div className="font-mono font-bold text-gray-900 mt-0.5 flex items-center gap-2">
                                      <span>{showAdminPass[hosting.id] ? (vps.rootPassword || 'None') : '••••••••••••'}</span>
                                      {vps.rootPassword && (
                                        <div className="flex items-center gap-1">
                                          <button 
                                            type="button" 
                                            onClick={() => setShowAdminPass(prev => ({ ...prev, [hosting.id]: !prev[hosting.id] }))}
                                            className="text-gray-400 hover:text-gray-700"
                                            title={showAdminPass[hosting.id] ? "Hide Password" : "Show Password"}
                                          >
                                            {showAdminPass[hosting.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                          </button>
                                          <button 
                                            type="button" 
                                            onClick={() => { navigator.clipboard.writeText(vps.rootPassword); toast.success('Password copied'); }}
                                            className="text-gray-400 hover:text-purple-600 transition-colors"
                                            title="Copy Password"
                                          >
                                            <Copy className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {vps.sshKey && (
                                    <div className="sm:col-span-2 pt-1 border-t border-gray-100">
                                      <span className="text-gray-500 font-medium">SSH Public Key:</span>
                                      <div className="mt-1 bg-gray-50 p-2.5 rounded-lg border border-gray-200 font-mono text-[11px] text-gray-700 break-all max-h-24 overflow-y-auto flex justify-between items-start gap-2">
                                        <span className="select-all">{vps.sshKey}</span>
                                        <button 
                                          type="button" 
                                          onClick={() => { navigator.clipboard.writeText(vps.sshKey); toast.success('SSH Key copied'); }}
                                          className="text-gray-400 hover:text-purple-600 shrink-0"
                                          title="Copy SSH Key"
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Admin Assignment Inputs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  <div>
                                    <label className="block text-xs font-bold text-purple-950 mb-1">
                                      Assigned Server Dedicated IP <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                      type="text" 
                                      placeholder="e.g. 103.145.118.52" 
                                      className="w-full text-sm border-purple-200 rounded-lg outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 py-1.5 px-3 border bg-white"
                                      defaultValue={hosting.serverIp || ''}
                                      onBlur={(e) => {
                                        if (e.target.value !== hosting.serverIp) {
                                          updateServiceStatus('hostingAccounts', hosting.id, hosting.status, { serverIp: e.target.value });
                                        }
                                      }}
                                    />
                                    <p className="text-[11px] text-purple-600 mt-0.5">Assigning an IP and marking Active will prompt to email the client.</p>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">SSH Port / Access URL</label>
                                    <input 
                                      type="text" 
                                      placeholder="Default: 22" 
                                      className="w-full text-sm border-gray-300 rounded-lg outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 py-1.5 px-3 border bg-white"
                                      defaultValue={hosting.controlPanelUrl || ''}
                                      onBlur={(e) => {
                                        if (e.target.value !== hosting.controlPanelUrl) {
                                          updateServiceStatus('hostingAccounts', hosting.id, hosting.status, { controlPanelUrl: e.target.value });
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={hosting.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-bold text-gray-900 uppercase">{hosting.planId}</p>
                                  <p className="text-xs text-gray-500">Billing: <span className="capitalize">{hosting.billingCycle}</span></p>
                                </div>
                                <select
                                  value={hosting.status}
                                  onChange={(e) => updateServiceStatus('hostingAccounts', hosting.id, e.target.value)}
                                  className={cn("px-2 py-1 rounded text-xs font-medium uppercase border-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer", hosting.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="provisioning">Provisioning</option>
                                  <option value="active">Active</option>
                                  <option value="suspended">Suspended</option>
                                  <option value="terminated">Terminated</option>
                                </select>
                              </div>
                              
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 mb-1">Server IP</label>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. 192.168.1.1" 
                                    className="w-full text-sm border-gray-300 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-1 px-2 border"
                                    defaultValue={hosting.serverIp || ''}
                                    onBlur={(e) => {
                                      if(e.target.value !== hosting.serverIp) {
                                        updateServiceStatus('hostingAccounts', hosting.id, hosting.status, { serverIp: e.target.value });
                                      }
                                    }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 mb-1">cPanel URL</label>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. https://cpanel.domain.com" 
                                    className="w-full text-sm border-gray-300 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 py-1 px-2 border"
                                    defaultValue={hosting.controlPanelUrl || ''}
                                    onBlur={(e) => {
                                      if(e.target.value !== hosting.controlPanelUrl) {
                                        updateServiceStatus('hostingAccounts', hosting.id, hosting.status, { controlPanelUrl: e.target.value });
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <button 
                onClick={() => generateInvoice(selectedOrder)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Download Invoice
              </button>
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentConfirm && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {paymentAction === 'accept' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                )}
                <h3 className="text-lg font-bold text-gray-900">
                  {paymentAction === 'accept' ? 'Verify this bKash payment?' : 'Reject this payment?'}
                </h3>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm space-y-2">
                <p><span className="font-medium text-gray-500">Order:</span> <span className="font-bold text-gray-900">{selectedOrder.documentNumber || selectedOrder.id.slice(0, 8)}</span></p>
                <p><span className="font-medium text-gray-500">Transaction ID:</span> <span className="font-mono text-gray-900">{selectedOrder.transactionId}</span></p>
                <p><span className="font-medium text-gray-500">Amount:</span> <span className="font-bold text-gray-900">BDT {selectedOrder.total.toLocaleString()}</span></p>
                {paymentAction === 'reject' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-sm"
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPaymentConfirm(false);
                    setPaymentAction(null);
                    setRejectionReason('');
                  }}
                  disabled={statusUpdating}
                  className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPaymentAction}
                  disabled={statusUpdating}
                  className={cn(
                    "flex-1 py-2.5 px-4 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2",
                    paymentAction === 'accept'
                      ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-300'
                      : 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
                  )}
                >
                  {statusUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : paymentAction === 'accept' ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirm Accept
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      Confirm Reject
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEmailLogs && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Email History for {selectedOrder.customerName}</h3>
              <button
                onClick={() => setShowEmailLogs(false)}
                className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {loadingEmailLogs ? (
                <div className="py-8 text-center text-gray-500">Loading emails...</div>
              ) : emailLogs.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No emails have been sent for this order yet.</div>
              ) : (
                <div className="space-y-4">
                  {emailLogs.map((log) => (
                    <div key={log.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900">{log.subject}</h4>
                        <span className={cn("px-2 py-1 text-xs font-semibold rounded-full", log.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                          {log.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Sent on {new Date(log.sentAt).toLocaleString()} to <span className="font-medium text-gray-700">{log.customerEmail}</span>
                      </p>
                      <div className="bg-gray-50 p-3 rounded border border-gray-100 text-sm whitespace-pre-wrap font-mono text-gray-800">
                        {log.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
