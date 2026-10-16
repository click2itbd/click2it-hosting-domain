import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, doc, query, getDocs, getDoc, orderBy, where, deleteDoc, increment } from 'firebase/firestore';
import { db, auth } from '../../../../firebase';
import { Product, Customer, DiscountCode, SiteSettings, PaymentAccount } from '../../../../types';
import { formatCurrency, cn, addWarranty, formatWarranty } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { generatePDF } from '../../../../lib/pdf';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag, Barcode, ScanLine,
  Cpu,
  X,
  Search,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  UserCheck,
  User,
  PackagePlus,
} from 'lucide-react';
import { generateDocumentNumber } from '../../../../lib/numbering';
import { CustomProductPurchaseModal } from '../../modals/CustomProductPurchaseModal';
import { sendEmail } from '../../../../services/emailService';
import { logAudit } from '../../../../lib/audit';

interface SalesFormProps {
  users?: any[];
  editingOrder?: any;
  onCancelEdit?: () => void;
  products: Product[];
  customers: Customer[];
  transactions?: any[];
  discountCodes: DiscountCode[];
  settings: SiteSettings;
  formatCurrency: (amount: number, settings?: SiteSettings) => string;
  cn: (...inputs: any[]) => string;
  toast: any;
  fetchData: () => Promise<void>;
  checkLowStock: (productName: string, newStock: number) => Promise<void>;
  setActiveTab: (tab: string) => void;
  setIsAddingCustomer: (val: boolean) => void;
}

export const SalesForm: React.FC<SalesFormProps> = ({
  users = [], editingOrder, onCancelEdit,
  products,
  customers: initialCustomers,
  discountCodes,
  settings,
  formatCurrency,
  cn,
  toast,
  fetchData,
  checkLowStock,
  setActiveTab,
    transactions = [],
  }) => {
  const { profile } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>(initialCustomers || []);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  // Searchable customer picker state
  const [customerQuery, setCustomerQuery] = useState('');
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [customerHighlight, setCustomerHighlight] = useState(0);
  const customerBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (customerBoxRef.current && !customerBoxRef.current.contains(e.target as Node)) {
        setIsCustomerOpen(false);
        setCustomerQuery('');
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

    const [saleData, setSaleData] = useState(() => {
    const saved = localStorage.getItem('sales_form_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      } catch (e) {}
    }
    return {
      customerId: '',
      customerName: '',
      workOrderNumber: '',
      customerPhone: '',
      customerEmail: '',
      shippingAddress: '',
      createdBy: '',
      date: new Date().toISOString().split('T')[0],
      items: [] as any[],
      type: 'invoice' as 'invoice' | 'challan' | 'quotation',
      paymentMethod: '',
      paymentAccountId: '',
      saleSource: 'in_store' as 'in_store' | 'online',
      paidAmount: 0,
      discountAmount: 0,
      appliedDiscountPercentage: 0,
      appliedDiscountCode: '',
      notes: '',
    };
  });

  useEffect(() => {
    localStorage.setItem('sales_form_draft', JSON.stringify(saleData));
  }, [saleData]);

  const [saleDiscountCodeInput, setSaleDiscountCodeInput] = useState('');
  const [showPCBuilderModal, setShowPCBuilderModal] = useState(false);
  const [servicePresets, setServicePresets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('service_presets');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [
      'Motherboard Problem Fix',
      'Power Supply Fix',
      'Screen / Display Repair',
      'Keyboard Repair',
      'OS Installation / Reinstall',
      'Data Recovery',
      'Cooling Fan Replacement',
      'RAM Upgrade',
      'Battery Replacement',
      'Charging Port Fix',
      'Virus Removal',
      'Repair / Servicing',
    ];
  });
  const [editingPresets, setEditingPresets] = useState(false);
  const [newPresetText, setNewPresetText] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingOrder) {
      setSaleData({
        ...saleData,
        type: editingOrder.type || 'invoice',
        customerId: editingOrder.customerId || '',
        customerName: editingOrder.customerName || '',
        customerPhone: editingOrder.customerPhone || '',
        customerEmail: editingOrder.customerEmail || '',
        shippingAddress: editingOrder.shippingAddress || editingOrder.customerAddress || '',
        items: editingOrder.items || [],
        discountType: 'flat',
        discountValue: editingOrder.discountAmount || 0,
        taxRate: editingOrder.taxAmount ? (editingOrder.taxAmount / (editingOrder.subtotal || 1) * 100) : 0,
        shippingCost: editingOrder.shippingCost || 0,
        paidAmount: editingOrder.paidAmount || editingOrder.amountPaid || 0,
        paymentMethod: editingOrder.paymentMethod || '',
        paymentAccountId: '',
        notes: editingOrder.notes || '',
      });
    }
  }, [editingOrder]);

  // Robustly identify if a transaction belongs to the order currently being edited
  const isTransactionLinkedToEditingOrder = (t: any) => {
    if (!editingOrder) return false;
    const editingId = String(editingOrder.id || '').trim();
    const editingDocNum = String(editingOrder.documentNumber || '').trim();
    const editingInvNum = String(editingOrder.invoiceNumber || '').trim();

    // Check referenceId against editing order id or document numbers
    if (editingId && t.referenceId === editingId) return true;
    if (editingDocNum && t.referenceId === editingDocNum) return true;
    if (editingInvNum && t.referenceId === editingInvNum) return true;

    // Check documentNumber against editing order document numbers or id
    if (editingDocNum && t.documentNumber === editingDocNum) return true;
    if (editingId && t.documentNumber === editingId) return true;
    if (editingInvNum && t.documentNumber === editingInvNum) return true;

    // Check description for document number
    if (editingDocNum && typeof t.description === 'string' && t.description.includes(editingDocNum)) return true;
    if (editingInvNum && typeof t.description === 'string' && t.description.includes(editingInvNum)) return true;

    return false;
  };

  // Calculate actual previous due for a customer excluding the order currently being edited
  const getCustomerPreviousDue = (customerId: string) => {
    if (!customerId || !transactions) return 0;
    let due = 0;
    transactions.forEach(t => {
      if (t.entityId === customerId && !isTransactionLinkedToEditingOrder(t)) {
        if (t.type === 'sale' || t.type === 'opening_balance') due += Number(t.amount) || 0;
        else if (t.type === 'payment_received' || t.type === 'return' || t.type === 'sale_return') due -= Number(t.amount) || 0;
      }
    });
    return due > 0 ? due : 0;
  };

  const [showCustomProductModal, setShowCustomProductModal] = useState(false);

  const [heldSales, setHeldSales] = useState<{ id: string; time: string; saleData: any }[]>(() => {
    try {
      const saved = localStorage.getItem('sales_form_held');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const holdCurrentSale = () => {
    if (saleData.items.length === 0) {
      toast.error('Cart is empty!');
      return;
    }
    const newHold = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      saleData,
    };
    const updated = [newHold, ...heldSales];
    setHeldSales(updated);
    localStorage.setItem('sales_form_held', JSON.stringify(updated));
    setSaleData({
      ...saleData,
      customerId: '',
      customerName: '',
      workOrderNumber: '',
      customerPhone: '',
      customerEmail: '',
      shippingAddress: '',
      items: [],
      type: 'invoice',
      paymentMethod: '',
      paymentAccountId: '',
      paidAmount: 0,
      discountAmount: 0,
    });
    setSaleDiscountCodeInput('');
    toast.success('Sale put on hold!');
  };

  const restoreSale = (id) => {
    const toRestore = heldSales.find(h => h.id === id);
    if (toRestore) {
      if (saleData.items.length > 0) {
        holdCurrentSale(); // Auto-hold current if non-empty
      }
      setSaleData(toRestore.saleData);
      const updated = heldSales.filter(h => h.id !== id);
      setHeldSales(updated);
      localStorage.setItem('sales_form_held', JSON.stringify(updated));
      toast.success('Sale restored!');
    }
  };


  // Sync customers and fetch accounts
  const loadData = async () => {
    try {
      const [custSnap, accSnap] = await Promise.all([
        getDocs(query(collection(db, 'customers'), orderBy('name'))),
        getDocs(query(collection(db, 'payment_accounts'), orderBy('name'))),
      ]);
      const fetchedCusts = custSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
      setCustomers(fetchedCusts);

      const accs = accSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentAccount));
      setPaymentAccounts(accs);
      
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    const pendingService = localStorage.getItem('pos_pending_service_item');
    if (pendingService) {
      try {
        const parsedService = JSON.parse(pendingService);
        setSaleData(prev => ({
          ...prev,
          items: [...prev.items, parsedService]
        }));
        localStorage.removeItem('pos_pending_service_item');
        toast.success(`Added ${parsedService.name} to invoice`);
      } catch (e) {
        console.error('Failed to parse pending service item', e);
      }
    }
  }, []);

  // Global Barcode Scanner Logic for SalesForm
  useEffect(() => {
    let barcode = '';
    let timeout: NodeJS.Timeout;

    const playBeep = (type: 'success' | 'error') => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (type === 'success') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        } else {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(250, ctx.currentTime);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }
      } catch (e) {}
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 'Enter') {
        if (barcode.trim().length > 0) {
          const scanValue = barcode.trim();
          const searchLower = scanValue.toLowerCase();
          
          let matchedSerial: string | undefined = undefined;

          const exactMatches = products.filter(p => {
            if (
              p.id.toLowerCase() === searchLower || 
              (p.sku || '').toLowerCase() === searchLower || 
              (p.model || '').toLowerCase() === searchLower || 
              p.name.toLowerCase() === searchLower
            ) {
              return true;
            }
            const foundSerial = (p.availableSerials || []).find((s: string) => s.toLowerCase() === searchLower);
            if (foundSerial) {
              matchedSerial = foundSerial;
              return true;
            }
            return false;
          });
          
          const partialMatches = products.filter(p => p.name.toLowerCase().includes(searchLower) || (p.sku || '').toLowerCase().includes(searchLower));
          
          const bestMatch = exactMatches.length === 1 ? exactMatches[0] : (partialMatches.length === 1 ? partialMatches[0] : null);

          if (bestMatch) {
            if (bestMatch.hasSerialTracking && !matchedSerial) {
              playBeep('error');
              toast.error('This product requires a Serial Number! Please scan the S/N instead.', { duration: 4000 });
            } else {
              addItemToSale(bestMatch, matchedSerial);
              setProductSearch('');
              playBeep('success');
              toast.success(`Scanned: ${bestMatch.name}`);
            }
          } else if (exactMatches.length > 1 || partialMatches.length > 1) {
            playBeep('error');
            toast.success(`Found multiple items. Please select manually.`);
          } else {
            playBeep('error');
            toast.error('No matching product found for scan');
          }
        }
        barcode = '';
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcode += e.key;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          barcode = '';
        }, 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]);

  // Subtotal & Total Calculations
  const subtotal = saleData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const effectiveDiscount = saleData.appliedDiscountPercentage > 0
    ? (subtotal * saleData.appliedDiscountPercentage) / 100
    : (saleData.discountAmount || 0);
  const netTotal = Math.max(0, subtotal - effectiveDiscount);

  // Net total computed
  const handleCustomerChange = (customerId: string) => {
    const selected = customers.find(c => c.id === customerId);
    if (selected) {
      setSaleData(prev => ({
        ...prev,
        customerId: selected.id,
        customerName: selected.name,
        customerPhone: selected.phone || '',
        customerEmail: selected.email || '',
        shippingAddress: selected.address || '',
      }));
    } else {
      setSaleData(prev => ({
        ...prev,
        customerId: '',
        customerName: '',
        workOrderNumber: '',
        customerPhone: '',
        customerEmail: '',
        shippingAddress: '',
      }));
    }
  };

  // Create new customer modal submission
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'customers'), {
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim(),
        email: newCustomerForm.email.trim(),
        address: newCustomerForm.address.trim(),
        createdAt: new Date().toISOString(),
      });

      const newlyAdded: Customer = {
        id: docRef.id,
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim(),
        email: newCustomerForm.email.trim(),
        address: newCustomerForm.address.trim(),
        createdAt: new Date().toISOString(),
      };

      setCustomers(prev => [...prev, newlyAdded]);
      // Auto select the newly added customer
      setSaleData(prev => ({
        ...prev,
        customerId: newlyAdded.id,
        customerName: newlyAdded.name,
        customerPhone: newlyAdded.phone || '',
        customerEmail: newlyAdded.email || '',
        shippingAddress: newlyAdded.address || '',
      }));

      setIsAddingNewCustomer(false);
      setNewCustomerForm({ name: '', phone: '', email: '', address: '' });
      toast.success(`Customer "${newlyAdded.name}" added and selected!`);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add customer');
    }
  };

  const handleApplySaleDiscountCode = () => {
    if (!saleDiscountCodeInput.trim()) return;
    const foundCode = discountCodes.find(
      c => c.code.toUpperCase() === saleDiscountCodeInput.toUpperCase() && c.isActive
    );
    if (foundCode) {
      if (new Date(foundCode.expiryDate) < new Date()) {
        toast.error('Discount code expired');
        return;
      }
      setSaleData({
        ...saleData,
        appliedDiscountPercentage: foundCode.discountPercentage,
        appliedDiscountCode: foundCode.code,
        discountAmount: 0,
      });
      toast.success(`Discount code applied: ${foundCode.discountPercentage}% off`);
    } else {
      toast.error('Invalid discount code');
    }
  };

  const addItemToSale = (product: Product, scannedSerial?: string) => {
    if (product.stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    setSaleData(prev => {
      const existing = prev.items.find(i => i.id === product.id);
      
      // Auto-select a serial if none was scanned but the product has serials available
      let serialToSelect = scannedSerial;
      if (!serialToSelect && product.hasSerialTracking && product.availableSerials && product.availableSerials.length > 0) {
        // Find the first available serial that hasn't been selected yet
        const currentlySelected = existing ? (existing.selectedSerials || []) : [];
        const firstUnselected = product.availableSerials.find((s: string) => !currentlySelected.includes(s));
        if (firstUnselected) {
          serialToSelect = firstUnselected;
        }
      }

      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Maximum available stock is ${product.stock}`);
          return prev;
        }
        return {
          ...prev,
          items: prev.items.map(i => i.id === product.id ? { 
            ...i, 
            quantity: i.quantity + 1,
            selectedSerials: serialToSelect && !i.selectedSerials?.includes(serialToSelect) 
              ? [...(i.selectedSerials || []), serialToSelect] 
              : (i.selectedSerials || [])
          } : i),
        };
      }
      return {
        ...prev,
        items: [...prev.items, { ...product, quantity: 1, selectedSerials: serialToSelect ? [serialToSelect] : [] }],
      };
    });
    toast.success(`Added ${product.name}`);
  };

  const updateItemQty = (productId: string, newQty: number) => {
    const itemInCart = saleData.items.find(i => i.id === productId);
    if (!itemInCart) return;

    if (newQty <= 0) {
      setSaleData(prev => ({
        ...prev,
        items: prev.items.filter(i => i.id !== productId),
      }));
      return;
    }

    if (!itemInCart.isCustomService) {
      const product = products.find(p => p.id === productId);
      if (product && newQty > product.stock) {
        toast.error(`Maximum available stock is ${product.stock}`);
        return;
      }
      
      // Auto-select serials if qty increases
      if (product && product.hasSerialTracking && product.availableSerials && newQty > itemInCart.quantity) {
        let newSelectedSerials = [...(itemInCart.selectedSerials || [])];
        let diff = newQty - itemInCart.quantity;
        
        for (const serial of product.availableSerials) {
          if (diff <= 0) break;
          if (!newSelectedSerials.includes(serial)) {
            newSelectedSerials.push(serial);
            diff--;
          }
        }
        
        setSaleData(prev => ({
          ...prev,
          items: prev.items.map(i => i.id === productId ? { ...i, quantity: newQty, selectedSerials: newSelectedSerials } : i),
        }));
        return;
      }
    }

    setSaleData(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === productId ? { 
        ...i, 
        quantity: newQty,
        // Trim selected serials if qty decreases
        selectedSerials: newQty < (i.selectedSerials?.length || 0) 
          ? (i.selectedSerials || []).slice(0, newQty) 
          : (i.selectedSerials || [])
      } : i),
    }));
  };

  const updateItemPrice = (productId: string, newPrice: number) => {
    if (newPrice < 0) return;
    setSaleData(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === productId ? { ...i, price: newPrice } : i),
    }));
  };

  const updateItemCostPrice = (productId: string, newCostPrice: number) => {
    if (newCostPrice < 0) return;
    setSaleData(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === productId ? { ...i, costPrice: newCostPrice } : i),
    }));
  };

  const updateItemName = (productId: string, newName: string) => {
    setSaleData(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === productId ? { ...i, name: newName } : i),
    }));
  };

  const handleAddCustomService = () => {
    const serviceId = 'service-' + Date.now();
    setSaleData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: serviceId,
          name: 'Repair / Servicing',
          price: 0,
          costPrice: 0,
          quantity: 1,
          isCustomService: true,
          hasSerialTracking: false,
          hasWarranty: false,
          selectedSerials: [],
        }
      ],
    }));
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saleData.type !== 'quotation' && saleData.paidAmount > 0 && !saleData.paymentAccountId) {
      toast.error('Please select a payment account to receive the paid amount');
      return;
    }

    // MUST HAVE A REGISTERED CUSTOMER SELECTED
    if (!saleData.customerId || !saleData.customerName) {
      toast.error('Please select a registered customer for this sale');
      return;
    }

    if (saleData.items.length === 0) {
      toast.error('Please add at least one product to the sale');
      return;
    }

    try {
      setSubmitting(true);

      // Verify Serials if tracking enabled
      for (const item of saleData.items) {
        if (item.hasSerialTracking) {
          if (!item.selectedSerials || item.selectedSerials.length !== item.quantity) {
            toast.error(`Please select exactly ${item.quantity} serial(s) for ${item.name}`);
            setSubmitting(false);
            return;
          }
        }
      }

      const docType = saleData.type === 'quotation' ? 'QUO' : (saleData.type === 'challan' ? 'CHA' : 'INV');
        const docNumber = editingOrder ? (editingOrder.documentNumber || editingOrder.id) : await generateDocumentNumber(docType);

      const processedItems = saleData.items.map(item => {
          const currentProduct = products.find(p => p.id === item.id);
        if (item.isCustomService) {
          return {
            productId: item.id,
            name: item.name,
            price: Number(item.price),
            costPrice: 0,
            quantity: Number(item.quantity),
            unit: (item as any).unit || currentProduct?.unit || 'pcs',
            hasWarranty: false,
            warrantyMonths: 0,
            selectedSerials: [],
            itemType: 'service',
          };
        }
        

        const wMonths = item.hasWarranty ? (item.warrantyMonths || currentProduct?.warrantyMonths || 0) : (currentProduct?.warrantyMonths || 0);
        return {
          productId: item.id,
          name: item.name,
          price: Number(item.price),
          costPrice: Number(currentProduct?.costPrice) || 0,
          quantity: Number(item.quantity),
            unit: (item as any).unit || currentProduct?.unit || 'pcs',
          hasWarranty: Boolean(item.hasWarranty),
            warrantyMonths: wMonths,
            warrantyUnit: currentProduct?.warrantyUnit || 'months',
            brand: currentProduct?.brand || (item as any).brand || '',
            warranty: wMonths > 0 ? formatWarranty(wMonths, currentProduct?.warrantyUnit) : '',
          selectedSerials: item.selectedSerials || [],
        };
      });

      const previousDue = getCustomerPreviousDue(saleData.customerId);

      const totalCost = processedItems.reduce((acc, i) => acc + (i.costPrice * i.quantity), 0);
      const profit = netTotal - totalCost;

      const paid = saleData.type === 'quotation' ? 0 : (Number(saleData.paidAmount) || 0);
      const paymentStatus = paid >= (netTotal + previousDue) ? 'paid' : (paid > 0 ? 'partial' : 'unpaid');
      const createdAt = new Date(saleData.date || new Date()).toISOString();

      const orderData = {
        previousDue: previousDue > 0 ? previousDue : 0,
        documentNumber: docNumber,
        type: saleData.type,
        saleSource: saleData.saleSource,
          createdBy: saleData.createdBy || profile?.displayName || profile?.email || 'Admin',
        customerId: saleData.customerId,
        customerName: saleData.customerName,
        workOrderNumber: saleData.workOrderNumber,
        customerPhone: saleData.customerPhone || '',
        customerEmail: saleData.customerEmail || '',
        shippingAddress: saleData.shippingAddress || '',
        items: processedItems,
        subtotal,
        discountAmount: effectiveDiscount,
        appliedDiscountPercentage: saleData.appliedDiscountPercentage,
        appliedDiscountCode: saleData.appliedDiscountCode,
        total: netTotal,
        totalCost,
        profit,
        paidAmount: paid,
        paymentStatus,
        paymentMethod: saleData.paymentMethod || 'cash',
        paymentAccountId: saleData.paymentAccountId || '',
        status: saleData.type === 'quotation' ? 'pending' : 'delivered',
        userId: 'admin',
        notes: saleData.notes || '',
        createdAt,
      };

      let orderRefId = '';
        if (editingOrder) {
          orderRefId = editingOrder.id;
          await updateDoc(doc(db, 'orders', editingOrder.id), orderData);
          
          // REVERT OLD STOCK
          if (editingOrder.type === 'invoice' || editingOrder.type === 'challan') {
            for (const oldItem of editingOrder.items || []) {
              if (oldItem.isCustomService) continue;
              const prodRef = doc(db, 'products', oldItem.productId || oldItem.id);
              const pSnap = await getDoc(prodRef);
              if (pSnap.exists()) {
                const currentProd = pSnap.data();
                const updates: any = {};
                updates.stock = increment(oldItem.quantity || 0);
                
                // UPDATE LOCAL STATE SO THE DEDUCT LOGIC USES IT
                const localProd = products.find(p => p.id === (oldItem.productId || oldItem.id));
                if (localProd) {
                   localProd.stock = updates.stock;
                   if (oldItem.selectedSerials) {
                      localProd.availableSerials = [...(localProd.availableSerials || []), ...oldItem.selectedSerials];
                   }
                }
                if (oldItem.selectedSerials && oldItem.selectedSerials.length > 0) {
                   updates.availableSerials = [...(currentProd.availableSerials || []), ...oldItem.selectedSerials];
                }
                await updateDoc(prodRef, updates);
              }
            }
            
            // DELETE OLD SOLD SERIALS
            const oldSerialsSnap = await getDocs(query(collection(db, 'sold_serials'), where('orderId', '==', editingOrder.id)));
            await Promise.all(oldSerialsSnap.docs.map(d => deleteDoc(doc(db, 'sold_serials', d.id))));
          }
          
          // DELETE OLD TRANSACTIONS (by referenceId AND by documentNumber to ensure complete cleanup)
          const txDocsToDelete = new Map<string, any>();
          const oldTxSnap1 = await getDocs(query(collection(db, 'transactions'), where('referenceId', '==', editingOrder.id)));
          oldTxSnap1.docs.forEach(d => txDocsToDelete.set(d.id, d.ref));
          if (editingOrder.documentNumber) {
            const oldTxSnap2 = await getDocs(query(collection(db, 'transactions'), where('documentNumber', '==', editingOrder.documentNumber)));
            oldTxSnap2.docs.forEach(d => txDocsToDelete.set(d.id, d.ref));
            const oldTxSnap3 = await getDocs(query(collection(db, 'transactions'), where('referenceId', '==', editingOrder.documentNumber)));
            oldTxSnap3.docs.forEach(d => txDocsToDelete.set(d.id, d.ref));
          }
          await Promise.all(Array.from(txDocsToDelete.values()).map(ref => deleteDoc(ref)));
          
        } else {
          const orderRef = await addDoc(collection(db, 'orders'), orderData);
          orderRefId = orderRef.id;
        }

      // Deduct stock and record serial warranties if invoice/challan
      if (saleData.type === 'invoice' || saleData.type === 'challan') {
        for (const item of saleData.items) {
          if (item.isCustomService) continue;
          const productRef = doc(db, 'products', item.id);
          const currentProduct = products.find(p => p.id === item.id);
          if (currentProduct) {
            const updates: any = {};
            updates.stock = increment(-item.quantity);

            if (currentProduct.hasSerialTracking && item.selectedSerials) {
              const remainingSerials = (currentProduct.availableSerials || []).filter(
                (s: string) => !item.selectedSerials.includes(s)
              );
              updates.availableSerials = remainingSerials;

              const warrantyEndDate = new Date();
              const wMonths = item.hasWarranty ? (item.warrantyMonths || currentProduct.warrantyMonths || 0) : (currentProduct.warrantyMonths || 0);
              warrantyEndDate.setTime(addWarranty(warrantyEndDate, wMonths).getTime());

              for (const serial of item.selectedSerials) {
                await addDoc(collection(db, 'sold_serials'), {
                  serial,
                  productId: currentProduct.id,
                  productName: currentProduct.name,
                  orderId: orderRefId,
                  documentNumber: docNumber,
                  customerName: saleData.customerName,
                  customerPhone: saleData.customerPhone,
                  soldAt: createdAt,
                  warrantyEndDate: warrantyEndDate.toISOString(),
                  status: 'active',
                });
              }
            }

            await updateDoc(productRef, updates);
            checkLowStock(currentProduct.name, Math.max(0, currentProduct.stock - item.quantity));
          }
        }

        // Record Cash/Bank Inflow Transaction in Firestore
        // Always record the full sale amount to update the customer ledger (Receivable)
        await addDoc(collection(db, 'transactions'), {
          type: 'sale',
          amount: netTotal,
          date: createdAt,
          description: `Sale to ${saleData.customerName} (#${docNumber})`,
          entityId: saleData.customerId,
          entityName: saleData.customerName,
          entityType: 'customer',
          referenceId: orderRefId,
          documentNumber: docNumber,
          paymentAccountId: '', // No payment account for the sale itself
          paymentMethod: '',
          createdAt,
        });

        // If any amount was paid, record the payment transaction
        if (paid > 0) {
          const selectedAcc = paymentAccounts.find(a => a.id === saleData.paymentAccountId);
          await addDoc(collection(db, 'transactions'), {
            type: 'payment_received',
            amount: paid,
            date: createdAt,
            description: `Payment for Invoice #${docNumber}`,
            entityId: saleData.customerId,
            entityName: saleData.customerName,
            entityType: 'customer',
            referenceId: orderRefId,
            documentNumber: docNumber,
            paymentAccountId: selectedAcc?.id || '',
            paymentMethod: selectedAcc?.type || selectedAcc?.name || saleData.paymentMethod || 'cash',
            createdAt,
          });
        }
      }

      const typeStr = saleData.type === 'quotation' ? 'Quotation' : (saleData.type === 'challan' ? 'Challan' : 'Invoice');
      
      // Send email invoice (non-blocking - never prevents sale from saving)
      if (saleData.customerEmail) {
        try {
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2>${settings?.brandName || 'Click2IT'}</h2>
                <h3>${typeStr} #${docNumber}</h3>
              </div>
              <p>Dear <strong>${saleData.customerName}</strong>,</p>
              <p>Thank you for your business. Please find the details of your recent ${typeStr.toLowerCase()} below:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Item</th>
                    <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Qty</th>
                    <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Price</th>
                    <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${processedItems.map((item: any) => `
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e5e7eb;">${item.name}</td>
                      <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${item.quantity}</td>
                      <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(item.price, settings)}</td>
                      <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(item.price * item.quantity, settings)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div style="margin-top: 20px; text-align: right;">
                <p><strong>Subtotal:</strong> ${formatCurrency(subtotal, settings)}</p>
                ${effectiveDiscount > 0 ? `<p><strong>Discount:</strong> -${formatCurrency(effectiveDiscount, settings)}</p>` : ''}
                <p style="font-size: 1.2em;"><strong>Net Total:</strong> ${formatCurrency(netTotal, settings)}</p>
                ${saleData.type === 'invoice' ? `
                <p><strong>Paid:</strong> ${formatCurrency(paid, settings)}</p>
                <p><strong>Due:</strong> ${formatCurrency(Math.max(0, netTotal - paid), settings)}</p>
                ` : ''}
              </div>
              
              <p style="margin-top: 30px; font-size: 0.9em; color: #6b7280; text-align: center;">
                If you have any questions, please contact us.<br>
                ${settings?.brandName || 'Store Team'}
              </p>
            </div>
          `;
          
          sendEmail({
            to: saleData.customerEmail,
            subject: `${typeStr} #${docNumber} from ${settings?.brandName || 'Our Store'}`,
            html: emailHtml,
            orderId: orderRefId,
            category: saleData.type
          }).then(() => {
            toast.success(`Email sent to ${saleData.customerEmail}`);
          }).catch((emailErr: any) => {
            console.error("Failed to send email", emailErr);
          });
        } catch (emailBuildErr) {
          console.error("Email build error", emailBuildErr);
        }
      }

      toast.success(`${typeStr} #${docNumber} created successfully!`);

      // Log sale to Audit Trail
      await logAudit(
        editingOrder ? 'EDIT' : 'CREATE',
        'Sale',
        `${editingOrder ? 'Updated' : 'Created'} ${typeStr} #${docNumber} for ${saleData.customerName} (Net Total: ৳${netTotal}, Paid: ৳${paid}, Items: ${saleData.items.length})`,
        saleData.preparedBy || profile?.displayName || profile?.email || 'Admin',
        {
          entityId: orderRefId,
          newState: { documentNumber: docNumber, type: saleData.type, netTotal, paid, customerName: saleData.customerName, itemsCount: saleData.items.length }
        }
      );

      // Auto-print invoice/challan/quotation
      try {
        const savedOrder = { id: orderRefId, ...orderData, _autoPrint: true };
        generatePDF(savedOrder as any, saleData.type as any, settings);
      } catch (err) {
        console.error('Failed to auto-print PDF', err);
      }

      // Reset form
      setSaleData({
        customerId: '',
        customerName: '',
        workOrderNumber: '',
        customerPhone: '',
        customerEmail: '',
        shippingAddress: '',
        items: [],
        type: 'invoice',
        paymentMethod: '',
        paymentAccountId: '',
        saleSource: 'in_store',
        paidAmount: 0,
        discountAmount: 0,
        appliedDiscountPercentage: 0,
        appliedDiscountCode: '',
        notes: '',
      });
      setSaleDiscountCodeInput('');
        localStorage.removeItem('sales_form_draft');
      fetchData();
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error('Failed to record sale');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products on the right catalog
  const filteredProducts = products.filter(product => {
    if (selectedCategory !== 'all' && product.category !== selectedCategory) return false;
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      const matchesName = product.name.toLowerCase().includes(q);
      const matchesCategory = (product.category || '').toLowerCase().includes(q);
      const matchesBrand = (product.brand || '').toLowerCase().includes(q);
      const matchesModel = (product.model || '').toLowerCase().includes(q);
      const matchesSku = (product.sku || '').toLowerCase().includes(q) || (product.id || '').toLowerCase().includes(q);
      const matchesSerial = (product.availableSerials || []).some((s: string) => s.toLowerCase().includes(q));
      if (!matchesName && !matchesCategory && !matchesBrand && !matchesModel && !matchesSku && !matchesSerial) return false;
    }
    return true;
  });

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* --- LEFT: SALES ORDER INVOICE FORM (7 COLS) --- */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingBag className="text-[#EF4444]" />
                {editingOrder ? (
                  <span>Editing Invoice <span className="text-blue-600 font-black">#{editingOrder.documentNumber || editingOrder.id}</span></span>
                ) : (
                  <span>Create Sale & Invoice</span>
                )}
              </h2>
              {editingOrder && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    Editing Mode
                  </span>
                  {onCancelEdit && (
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 underline"
                    >
                      Cancel & Exit Edit
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddCustomService}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all border border-indigo-200"
              >
                <Plus size={14} /> Add Service/Repair
              </button>
              <button
                type="button"
                onClick={() => setShowPCBuilderModal(true)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Cpu size={14} className="text-[#EF4444]" /> PC Builder
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateSale} className="space-y-6 text-xs">
            {/* Document Type & Customer Selection */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    value={saleData.date || ''}
                    onChange={e => setSaleData({ ...saleData, date: e.target.value })}
                    className="w-full h-[42px] border border-gray-200 rounded-lg px-3 font-bold text-gray-800 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Prepared By</label>
                  <select
                    value={saleData.createdBy || ''}
                    onChange={e => setSaleData({ ...saleData, createdBy: e.target.value })}
                    className="w-full h-[42px] border border-gray-200 rounded-lg px-3 font-bold text-gray-800 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer"
                  >
                    <option value="">-- Select --</option>
                    {users
                      .filter(u => u.role === 'admin' || u.role === 'staff' || u.role === 'manager' || u.permissions?.length > 0)
                      .map(u => (
                      <option key={u.uid} value={u.displayName || u.email}>{u.displayName || u.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Work Order #</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={saleData.workOrderNumber || ''}
                      onChange={e => setSaleData({ ...saleData, workOrderNumber: e.target.value })}
                      className="w-full h-[42px] border border-gray-200 rounded-lg px-3 font-bold text-gray-800 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1">Document Type</label>
                  <select
                    value={saleData.type}
                    onChange={e => setSaleData({ ...saleData, type: e.target.value as any })}
                    className="w-full h-[42px] border border-gray-200 rounded-lg px-3 font-bold text-gray-800"
                  >
                    <option value="invoice">Invoice</option>
                    <option value="challan">Challan</option>
                    <option value="quotation">Quotation</option>
                  </select>
                </div>
              </div>
              <div>
                {(() => {
                    const due = getCustomerPreviousDue(saleData.customerId);
                    return (
                      <label className="block font-bold text-gray-700 uppercase mb-1 flex justify-between">
                        <span>Customer <span className="text-red-500">*</span></span>
                        {saleData.customerId && due > 0 && (
                          <span className="text-red-600 font-black text-xs px-2 py-0.5 bg-red-50 border border-red-200 rounded-full">
                            Previous Due: {formatCurrency(due, settings)}
                          </span>
                        )}
                      </label>
                    );
                })()}
                <div className="flex gap-2">
                  {(() => {
                    const q = customerQuery.trim().toLowerCase();
                    const qDigits = q.replace(/\D/g, '');
                    const matches = customers
                      .filter((cu: any) => {
                        if (!q) return true;
                        return (
                          (cu.name || '').toLowerCase().includes(q) ||
                          (cu.email || '').toLowerCase().includes(q) ||
                          (qDigits.length > 0 && String(cu.phone || '').replace(/\D/g, '').includes(qDigits))
                        );
                      })
                      .slice(0, 50);
                    const selectCustomer = (id: string) => {
                      handleCustomerChange(id);
                      setCustomerQuery('');
                      setIsCustomerOpen(false);
                    };
                    return (
                      <div className="relative w-full" ref={customerBoxRef}>
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          autoComplete="off"
                          value={isCustomerOpen ? customerQuery : (saleData.customerId ? `${saleData.customerName}${saleData.customerPhone ? ` (${saleData.customerPhone})` : ''}` : '')}
                          placeholder="Type customer name or phone number..."
                          onFocus={() => { setIsCustomerOpen(true); setCustomerQuery(''); setCustomerHighlight(0); }}
                          onChange={e => { setCustomerQuery(e.target.value); setIsCustomerOpen(true); setCustomerHighlight(0); }}
                          onKeyDown={e => {
                            if (e.key === 'ArrowDown') { e.preventDefault(); setIsCustomerOpen(true); setCustomerHighlight(h => Math.min(h + 1, matches.length - 1)); }
                            else if (e.key === 'ArrowUp') { e.preventDefault(); setCustomerHighlight(h => Math.max(h - 1, 0)); }
                            else if (e.key === 'Enter') { if (isCustomerOpen) { e.preventDefault(); if (matches[customerHighlight]) selectCustomer(matches[customerHighlight].id); } }
                            else if (e.key === 'Escape') { setIsCustomerOpen(false); setCustomerQuery(''); }
                          }}
                          className={cn(
                            "w-full h-[42px] border rounded-lg pl-9 pr-9 font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                            saleData.customerId ? "border-green-300 bg-green-50/40" : "border-gray-200"
                          )}
                        />
                        {saleData.customerId && (
                          <button
                            type="button"
                            title="Clear customer"
                            onClick={() => { handleCustomerChange(''); setCustomerQuery(''); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 rounded"
                          >
                            <X size={15} />
                          </button>
                        )}
                        {isCustomerOpen && (
                          <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                            {matches.length === 0 ? (
                              <div className="p-4 text-center text-sm text-gray-500">
                                No customer found{customerQuery ? ` for "${customerQuery}"` : ''}.
                                <button
                                  type="button"
                                  onClick={() => { setIsCustomerOpen(false); setIsAddingNewCustomer(true); }}
                                  className="block mx-auto mt-2 text-blue-600 font-bold hover:underline"
                                >
                                  + Add as new customer
                                </button>
                              </div>
                            ) : (
                              matches.map((cu: any, idx: number) => (
                                <button
                                  key={cu.id}
                                  type="button"
                                  onMouseEnter={() => setCustomerHighlight(idx)}
                                  onClick={() => selectCustomer(cu.id)}
                                  className={cn(
                                    "w-full text-left px-3 py-2 flex items-center justify-between gap-3 border-b border-gray-50 last:border-0",
                                    idx === customerHighlight ? "bg-blue-50" : "bg-white",
                                    cu.id === saleData.customerId && "font-black"
                                  )}
                                >
                                  <span className="text-sm font-bold text-gray-900 truncate">{cu.name}</span>
                                  <span className="text-xs text-gray-500 shrink-0">{cu.phone || cu.email || ''}</span>
                                </button>
                              ))
                            )}
                            {customers.length > matches.length && matches.length === 50 && (
                              <div className="px-3 py-1.5 text-[11px] text-gray-400 text-center bg-gray-50">Showing first 50 � keep typing to narrow down</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCustomer(true)}
                    className="bg-[#081621] hover:bg-[#EF4444] text-white px-4 h-[42px] rounded-lg font-bold flex items-center gap-1.5 transition-all shrink-0"
                    title="Add New Customer"
                  >
                    <Plus size={16} /> New Customer
                  </button>
                </div>
              </div>
            </div>

            {!saleData.customerId && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center gap-2.5 text-amber-800 text-xs">
                <AlertCircle size={16} className="shrink-0 text-amber-600" />
                <span>
                  Please select an existing customer from the dropdown above, or click <strong>&quot;+ New&quot;</strong> to register one.
                </span>
              </div>
            )}

            {/* Cart Items Table */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-bold text-gray-700 uppercase tracking-wider">
                  Selected Items ({saleData.items.length})
                </label>
                {saleData.items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSaleData({ ...saleData, items: [] })}
                    className="text-red-500 hover:text-red-700 text-[11px]"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {saleData.items.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                  <ShoppingBag size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="font-medium">No items selected yet.</p>
                  <p className="text-[11px]">Click items from the product catalog on the right to add them to this sale.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {saleData.items.map((item, idx) => {
                    const originalProd = products.find(p => p.id === item.id);
                    return (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex-1 min-w-[280px] break-words">
                            {item.isCustomService ? (
                              <div className="flex flex-col gap-1 w-full mb-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <label className="text-[10px] uppercase font-bold text-indigo-500">Service Description</label>
                                  <button type="button" onClick={() => setEditingPresets(ep => !ep)} className="text-[9px] text-indigo-400 hover:text-indigo-600 underline">{editingPresets ? 'Done' : 'Edit Options'}</button>
                                </div>
                                <div className="flex gap-1">
                                  <select
                                    value={servicePresets.includes(item.name) ? item.name : '__custom__'}
                                    onChange={e => {
                                      if (e.target.value !== '__custom__') updateItemName(item.id, e.target.value);
                                    }}
                                    className="border border-indigo-200 bg-indigo-50/30 rounded py-1 px-2 font-semibold text-xs focus:ring-indigo-500 flex-1"
                                  >
                                    {servicePresets.map(p => <option key={p} value={p}>{p}</option>)}
                                    {!servicePresets.includes(item.name) && <option value="__custom__">{item.name || 'Custom...'}</option>}
                                  </select>
                                </div>
                                <textarea 
                                    value={item.name} 
                                    onChange={e => updateItemName(item.id, e.target.value)}
                                    placeholder="Or type custom description..."
                                    rows={2}
                                    className="w-full border border-indigo-200 bg-white rounded py-1.5 px-2 text-xs text-gray-900 focus:ring-indigo-500 mt-1 shadow-sm resize-y"
                                  />
                                {editingPresets && (
                                  <div className="mt-2 p-2 bg-indigo-50 rounded-lg border border-indigo-200 space-y-1">
                                    <p className="text-[10px] font-bold text-indigo-600 uppercase">Manage Presets</p>
                                    {servicePresets.map((p, pi) => (
                                      <div key={pi} className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          value={p}
                                          onChange={e => {
                                            const updated = [...servicePresets];
                                            updated[pi] = e.target.value;
                                            setServicePresets(updated);
                                            localStorage.setItem('service_presets', JSON.stringify(updated));
                                          }}
                                          className="flex-1 border border-indigo-200 rounded px-2 py-0.5 text-xs"
                                        />
                                        <button type="button" onClick={() => {
                                          const updated = servicePresets.filter((_, i) => i !== pi);
                                          setServicePresets(updated);
                                          localStorage.setItem('service_presets', JSON.stringify(updated));
                                        }} className="text-red-400 hover:text-red-600 p-1 rounded" title="Delete preset"><Trash2 size={12} /></button>
                                      </div>
                                    ))}
                                    <div className="flex gap-1 mt-1">
                                      <input
                                        type="text"
                                        value={newPresetText}
                                        onChange={e => setNewPresetText(e.target.value)}
                                        placeholder="Add new option..."
                                        className="flex-1 border border-indigo-300 rounded px-2 py-0.5 text-xs"
                                        onKeyDown={e => {
                                          if (e.key === 'Enter' && newPresetText.trim()) {
                                            const updated = [...servicePresets, newPresetText.trim()];
                                            setServicePresets(updated);
                                            localStorage.setItem('service_presets', JSON.stringify(updated));
                                            setNewPresetText('');
                                          }
                                        }}
                                      />
                                      <button type="button" onClick={() => {
                                        if (newPresetText.trim()) {
                                          const updated = [...servicePresets, newPresetText.trim()];
                                          setServicePresets(updated);
                                          localStorage.setItem('service_presets', JSON.stringify(updated));
                                          setNewPresetText('');
                                        }
                                      }} className="bg-indigo-600 text-white rounded px-2 py-0.5 text-xs">+ Add</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="font-bold text-gray-900 block text-xs">{item.name}{(item as any).variantName ? " - " + (item as any).variantName : ""}</span>
                            )}
                            
                            {!item.isCustomService && (
                              <span className="text-[10px] text-gray-400">
                                Stock: {originalProd?.stock || 0} | <span className="text-amber-600 font-bold">Buy Price: {formatCurrency(originalProd?.costPrice || 0, settings)}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-4 shrink-0">
{/* Editable Cost Price (Custom Service Only) */}
                          {item.isCustomService && (
                            <div className="flex flex-col items-center">
                              <label className="text-[9px] font-bold text-amber-500 uppercase">Cost Price</label>
                              <input
                                type="number"
                                min={0}
                                value={item.costPrice || 0}
                                onChange={e => updateItemCostPrice(item.id, Number(e.target.value))}
                                className="w-24 text-center border border-amber-200 bg-amber-50/50 rounded py-0.5 font-bold text-amber-900 focus:ring-amber-500"
                                placeholder="0"
                                title="Not visible to customer. Used for profit calculation."
                              />
                            </div>
                          )}
                          
                          {/* Editable Sale Price */}
                          <div className="flex flex-col items-center">
                            <label className="text-[9px] font-bold text-blue-500 uppercase">Sale Price</label>
                            <input
                              type="number"
                              min={0}
                              value={item.price}
                              onChange={e => updateItemPrice(item.id, Number(e.target.value))}
                              className="w-24 text-center border border-blue-200 bg-blue-50/50 rounded py-0.5 font-bold text-blue-900 focus:ring-blue-500"
                            />
                          </div>

                          {/* Quantity Controls */}
                            <div className="flex flex-col items-center gap-1">
                              <label className="text-[9px] font-bold text-gray-500 uppercase">Qty & Unit</label>
                              <div className="flex items-stretch">
                                <button
                                  type="button"
                                  onClick={() => updateItemQty(item.id, item.quantity - 1)}
                                  className="px-1.5 bg-white border border-gray-200 rounded-l hover:bg-gray-100 flex items-center justify-center"
                                >
                                  <Minus size={12} />
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  max={originalProd?.stock || 9999}
                                  value={item.quantity}
                                  onChange={e => updateItemQty(item.id, Number(e.target.value))}
                                  className="w-10 text-center border-y border-x-0 border-gray-200 py-0.5 font-bold text-xs focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateItemQty(item.id, item.quantity + 1)}
                                  className="px-1.5 bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center"
                                >
                                  <Plus size={12} />
                                </button>
                                <select
                                  value={(item as any).unit || originalProd?.unit || 'pcs'}
                                  onChange={e => {
                                    setSaleData(prev => ({
                                      ...prev,
                                      items: prev.items.map(i => i.id === item.id ? { ...i, unit: e.target.value } : i)
                                    }));
                                  }}
                                  className="w-16 border-y border-r border-l border-gray-200 rounded-r py-0.5 px-0.5 text-[10px] font-bold bg-gray-50 text-gray-700 outline-none cursor-pointer"
                                >
                                  <option value="pcs">pcs</option>
                                  <option value="nos">nos</option>
                                  <option value="meter">meter</option>
                                  <option value="kg">kg</option>
                                  <option value="gm">gm</option>
                                  <option value="litre">litre</option>
                                  <option value="box">box</option>
                                  <option value="pack">pack</option>
                                  <option value="chop">chop</option>
                                </select>
                              </div>
                            </div>

                            {/* Item Total */}
                          <div className="text-right min-w-20">
                            <span className="font-black text-gray-900 text-sm block">
                              {formatCurrency(item.price * item.quantity, settings)}
                            </span>
                          </div>

                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => setSaleData(prev => ({
                              ...prev,
                              items: prev.items.filter(i => i.id !== item.id),
                            }))}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
</div>
                        </div>

                        {/* Serial Numbers (if applicable) */}
                        {item.hasSerialTracking && (
                          <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <p className={cn(
                              "text-[10px] font-bold uppercase mb-1.5 flex items-center justify-between",
                              (item.selectedSerials?.length || 0) !== item.quantity ? "text-red-500" : "text-green-600"
                            )}>
                              <span>Select Serial Numbers (Required: {item.quantity} | Selected: {item.selectedSerials?.length || 0})</span>
                              {(item.selectedSerials?.length || 0) !== item.quantity && (
                                <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Must Select!</span>
                              )}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(originalProd?.availableSerials || []).length === 0 ? (
                                <span className="text-xs text-red-500 font-bold">No serials in stock!</span>
                              ) : (originalProd?.availableSerials || []).map((serial: string) => {
                                const isSelected = (item.selectedSerials || []).includes(serial);
                                return (
                                  <button
                                    type="button"
                                    key={serial}
                                    onClick={() => {
                                      let newSelected = [...(item.selectedSerials || [])];
                                      if (isSelected) {
                                        newSelected = newSelected.filter(s => s !== serial);
                                      } else if (newSelected.length < item.quantity) {
                                        newSelected.push(serial);
                                      } else {
                                        toast.error(`Already selected ${item.quantity} serial(s)`);
                                      }
                                      setSaleData(prev => ({
                                        ...prev,
                                        items: prev.items.map(i => i.id === item.id ? { ...i, selectedSerials: newSelected } : i),
                                      }));
                                    }}
                                    className={cn(
                                      "px-2 py-0.5 text-[11px] rounded border font-mono transition-all",
                                      isSelected ? "bg-[#EF4444] text-white border-[#EF4444]" : "bg-white text-gray-700 border-gray-300 hover:border-red-300"
                                    )}
                                  >
                                    {serial}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Discounts & Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              {/* Left: Discounts */}
              <div className="space-y-3 bg-gray-50/50 p-3.5 rounded-xl border border-gray-200">
                <span className="font-bold text-gray-700 uppercase block">Discounts & Coupons</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon Code"
                    value={saleDiscountCodeInput}
                    onChange={e => setSaleDiscountCodeInput(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg p-2 uppercase font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleApplySaleDiscountCode}
                    className="bg-gray-800 text-white px-3 py-2 rounded-lg font-bold hover:bg-black"
                  >
                    Apply
                  </button>
                </div>
                {saleData.appliedDiscountCode && (
                  <div className="flex justify-between items-center bg-green-50 p-2 rounded-lg border border-green-200">
                    <span className="text-green-700 font-bold text-[11px]">
                      {saleData.appliedDiscountCode} ({saleData.appliedDiscountPercentage}% OFF)
                    </span>
                    <button
                      type="button"
                      onClick={() => setSaleData({ ...saleData, appliedDiscountCode: '', appliedDiscountPercentage: 0 })}
                      className="text-red-500 font-bold text-[11px] hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Manual Discount</label>
                  <input
                    type="number"
                    min={0}
                    disabled={saleData.appliedDiscountPercentage > 0}
                    value={saleData.discountAmount || ''}
                    onChange={e => setSaleData({ ...saleData, discountAmount: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-lg p-2"
                  />
                </div>
              </div>

              {/* Right: Payment Method & Paid Amount */}
              {saleData.type !== 'quotation' && (
                <div className="space-y-3 bg-gray-50/50 p-3.5 rounded-xl border border-gray-200">
                  <span className="font-bold text-gray-700 uppercase block">Payment Collection</span>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Receive In Account</label>
                    <select
                      value={saleData.paymentAccountId}
                      onChange={e => {
                        const acc = paymentAccounts.find(a => a.id === e.target.value);
                        setSaleData({
                          ...saleData,
                          paymentAccountId: e.target.value,
                          paymentMethod: acc?.type || 'cash',
                        });
                      }}
                      className="w-full border border-gray-200 rounded-lg p-2 font-medium"
                    >
                      <option value="">-- Select Account --</option>
                      {paymentAccounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                      Sale Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={saleData.notes}
                      onChange={e => setSaleData({ ...saleData, notes: e.target.value })}
                      placeholder="e.g. Courier via SA Paribahan, handle with care..."
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">
                        Paid Amount (Leave 0 for Due)
                      </label>
                      <button
                        type="button"
                        onClick={() => setSaleData({ ...saleData, paidAmount: 0 })}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Keep Full Due
                      </button>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={saleData.paidAmount || ''}
                      onChange={e => setSaleData({ ...saleData, paidAmount: Number(e.target.value) || 0 })}
                      className="w-full border border-gray-200 rounded-lg p-2 font-black text-gray-900 text-sm"
                      placeholder="Enter amount (0 for Full Due)"
                    />
                  </div>

                  {/* Due preview */}
                    {(() => {
                        const prevDue = getCustomerPreviousDue(saleData.customerId);
                        const totalDueNow = netTotal + (prevDue > 0 ? prevDue : 0) - (Number(saleData.paidAmount) || 0);
                        if (totalDueNow > 0) {
                            return (
                              <div className="flex justify-between items-center text-xs font-bold text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                <span>Remaining Due Balance:</span>
                                <span>{formatCurrency(totalDueNow, settings)}</span>
                              </div>
                            );
                        }
                        return null;
                    })()}
                </div>
              )}
            </div>

            {/* Total Summary Footer */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, settings)}</span>
              </div>
              {effectiveDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span>Discount</span>
                  <span>- {formatCurrency(effectiveDiscount, settings)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
                  <span>Current Bill Total</span>
                  <span className="text-xl text-gray-800">{formatCurrency(netTotal, settings)}</span>
                </div>
                {(() => {
                  const prevDue = getCustomerPreviousDue(saleData.customerId);
                  if (prevDue > 0) {
                      return (
                        <>
                          <div className="flex justify-between text-red-500 font-bold pt-1">
                            <span>Previous Due</span>
                            <span>+ {formatCurrency(prevDue, settings)}</span>
                          </div>
                          <div className="flex justify-between text-xl font-black text-gray-900 pt-2 border-t border-gray-300">
                            <span>Grand Total Payable</span>
                            <span className="text-2xl text-[#EF4444]">{formatCurrency(netTotal + prevDue, settings)}</span>
                          </div>
                        </>
                      );
                  } else {
                      return (
                          <div className="flex justify-between text-xl font-black text-gray-900 pt-2 border-t border-transparent hidden">
                            <span>Grand Total Payable</span>
                            <span className="text-2xl text-[#EF4444]">{formatCurrency(netTotal, settings)}</span>
                          </div>
                      );
                  }
                })()}
            </div>

            {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={holdCurrentSale}
                  disabled={saleData.items.length === 0}
                  className="w-full bg-amber-100 hover:bg-amber-200 text-amber-900 disabled:opacity-50 py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 border border-amber-300"
                >
                  <Plus size={18} />
                  Hold Sale
                </button>
                <button
              type="submit"
              disabled={submitting || saleData.items.length === 0 || !saleData.customerId}
              className="w-full bg-[#081621] hover:bg-[#EF4444] disabled:opacity-50 text-white py-3.5 rounded-xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              {submitting ? 'Generating Document...' : (editingOrder ? 'Update & Save Changes' : `Confirm & Save ${saleData.type.toUpperCase()}`)}
                </button>
              </div>
          </form>
        </div>
      </div>

      {/* --- RIGHT: PRODUCT CATALOG & QUICK SELECT (5 COLS) --- */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-4">
            {heldSales.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <h4 className="text-xs font-bold text-amber-800 uppercase mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Held Sales ({heldSales.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {heldSales.map(hold => (
                    <button
                      key={hold.id}
                      type="button"
                      onClick={() => restoreSale(hold.id)}
                      className="bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                    >
                      {hold.saleData.customerName || 'Walk-in'} � {hold.time}
                      <span className="bg-amber-200 text-amber-800 px-1.5 rounded-md text-[10px]">
                        {hold.saleData.items.length} items
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider">Product Catalog</h3>
            <span className="text-xs text-gray-500">{filteredProducts.length} Items</span>
          </div>

          {/* Search & Category Filter */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between mb-2"><button onClick={() => setShowCustomProductModal(true)} className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-100 transition-colors border border-indigo-200"><PackagePlus size={14} /> Custom Product</button></div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Scan Barcode or Search (SKU/Name)..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const currentValue = e.currentTarget.value.trim();
                    if (!currentValue) return;
                    
                    const searchLower = currentValue.toLowerCase();
                    
                    let matchedSerial: string | undefined = undefined;
                    const exactMatches = products.filter(p => {
                      if (p.id.toLowerCase() === searchLower || 
                          (p.sku || '').toLowerCase() === searchLower ||
                          (p.model || '').toLowerCase() === searchLower || 
                          p.name.toLowerCase() === searchLower) {
                        return true;
                      }
                      const foundSerial = (p.availableSerials || []).find((s: string) => s.toLowerCase() === searchLower);
                      if (foundSerial) {
                        matchedSerial = foundSerial;
                        return true;
                      }
                      return false;
                    });
                    
                    const bestMatch = exactMatches.length === 1 ? exactMatches[0] : 
                                      (filteredProducts.length === 1 ? filteredProducts[0] : null);

                    if (bestMatch) {
                      addItemToSale(bestMatch, matchedSerial);
                      setProductSearch('');
                    } else if (exactMatches.length > 1 || filteredProducts.length > 1) {
                      toast.success('Found multiple items. Please select manually.');
                    } else {
                      toast.error('No matching product found for scan');
                    }
                  }
                }}
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-100"
              />
              <ScanLine className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            </div>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full py-1.5 px-3 border border-gray-200 rounded-lg outline-none font-medium"
            >
              <option value="all">-- All Categories --</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Product Items List */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No products match your search.
              </div>
            ) : (
              filteredProducts.map(product => {
                const isOutOfStock = product.stock <= 0;
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "flex items-center justify-between p-3 border rounded-xl transition-all",
                      isOutOfStock ? "bg-gray-50/70 border-gray-200 opacity-60" : "bg-white border-gray-200 hover:border-[#EF4444] shadow-xs"
                    )}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <span className="font-bold text-xs text-gray-900 block truncate">{product.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-black text-[#EF4444]">
                          {formatCurrency(product.price, settings)}
                        </span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded font-bold uppercase",
                          product.stock > 5 ? "bg-green-100 text-green-700" :
                          product.stock > 0 ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          Stock: {product.stock}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addItemToSale(product)}
                      className={cn(
                        "p-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1",
                        isOutOfStock ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#081621] hover:bg-[#EF4444] text-white shadow-xs"
                      )}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {isAddingNewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 bg-[#081621] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <User size={16} className="text-[#EF4444]" /> Add & Select New Customer
              </h3>
              <button onClick={() => setIsAddingNewCustomer(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shakib Al Hasan"
                  value={newCustomerForm.name}
                  onChange={e => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={newCustomerForm.phone}
                  onChange={e => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={newCustomerForm.email}
                  onChange={e => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Address</label>
                <input
                  type="text"
                  placeholder="House, Road, City"
                  value={newCustomerForm.address}
                  onChange={e => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#EF4444] hover:bg-red-600 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={14} /> Add & Select Customer
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingNewCustomer(false)}
                  className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showCustomProductModal && (
        <CustomProductPurchaseModal 
          onClose={() => setShowCustomProductModal(false)} 
          onSuccess={(product) => {
            setShowCustomProductModal(false);
            addItemToSale(product);
          }} 
        />
      )}
    </div>
  );
};
