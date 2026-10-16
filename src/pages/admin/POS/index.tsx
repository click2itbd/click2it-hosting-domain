import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  getDocs,
  where,
  orderBy,
  limit,
  addDoc,
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { Product, ProductVariant, Customer, PaymentAccount } from "../../../types";
import toast from "react-hot-toast";
import { useSettings } from "../../../context/SettingsContext";
import { useAuth } from "../../../context/AuthContext";
import { formatCurrency, formatWarranty, addWarranty } from "../../../lib/utils";
import { generateDocumentNumber } from "../../../lib/numbering";
import { logoBase64 } from "../../../lib/logoBase64";
import { POSHeader } from "./components/POSHeader";
import { POSCartArea } from "./components/POSCartArea";
import { POSSidebar } from "./components/POSSidebar";
import { POSModals } from "./components/POSModals";
import { logAudit } from "../../../lib/audit";

export const RetailPOS = () => {
  const { settings } = useSettings();
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const [cart, setCart] = useState<
    {
      cartItemId: string;
      product: Product;
      quantity: number;
      hasWarranty?: boolean;
      warrantyMonths?: number;
      selectedSerials?: string[];
      selectedVariant?: any;
    }[]
  >([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [showSerialModal, setShowSerialModal] = useState(false);
  const [activeSerialItemIdx, setActiveSerialItemIdx] = useState<number | null>(
    null,
  );

  const [isPaymentView, setIsPaymentView] = useState(false);

  const [discountType, setDiscountType] = useState<"flat" | "percentage">(
    "flat",
  );
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0);

  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const [heldCarts, setHeldCarts] = useState<
    { id: string; time: string; cart: any[]; customer: any }[]
  >([]);
  const [showHeldCarts, setShowHeldCarts] = useState(false);

  const [payments, setPayments] = useState<
    { accountId: string; amount: number }[]
  >([]);
  const [receivedAmount, setReceivedAmount] = useState<number | "">("");
  const [saleSource, setSaleSource] = useState<"in_store" | "online">(
    "in_store",
  );

  useEffect(() => {
    const stored = localStorage.getItem("pos_held_carts");
    if (stored) {
      try {
        setHeldCarts(JSON.parse(stored));
      } catch (e) {}
    }

    // Check for pending service item from Warranty/Services tab
    const pendingService = localStorage.getItem("pos_pending_service_item");
    if (pendingService) {
      try {
        const parsedService = JSON.parse(pendingService);
        // Add to cart directly
        setCart((prev) => [
          ...prev,
          {
            cartItemId: Date.now().toString() + Math.random().toString(),
            product: parsedService,
            quantity: 1,
            selectedSerials: [],
            selectedVariant: null,
          },
        ]);
        localStorage.removeItem("pos_pending_service_item");
        toast.success(`Added ${parsedService.name} to cart`);
      } catch (e) {
        console.error("Failed to parse pending service item", e);
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodSnap, custSnap, paySnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "products"),
              orderBy("createdAt", "desc"),
              limit(500),
            ),
          ),
          getDocs(
            query(
              collection(db, "customers"),
              orderBy("createdAt", "desc"),
              limit(200),
            ),
          ),
          getDocs(query(collection(db, "payment_accounts"), orderBy("name"))),
        ]);
        setProducts(
          prodSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[],
        );
        setCustomers(
          custSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Customer[],
        );
        setPaymentAccounts(
          paySnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as PaymentAccount[],
        );
      } catch (err) {
        console.error("Failed to load POS data", err);
        toast.error("Failed to load POS data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let barcode = "";
    let timeout: NodeJS.Timeout;

    const playBeep = (type: "success" | "error") => {
      try {
        const ctx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (type === "success") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        } else {
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(250, ctx.currentTime);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }
      } catch (e) {}
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Enter") {
        if (barcode.trim().length > 0) {
          const scanValue = barcode.trim();
          const searchLower = scanValue.toLowerCase();

          let matchedSerial: string | undefined = undefined;
          let matchedVariant: ProductVariant | undefined;

          const exactMatches = products.filter((p) => {
            const foundVariant = p.variants?.find(variant =>
              variant.id.toLowerCase() === searchLower ||
              variant.sku.toLowerCase() === searchLower ||
              variant.name.toLowerCase() === searchLower
            );
            if (foundVariant) {
              matchedVariant = foundVariant;
              return true;
            }
            if (
              p.id.toLowerCase() === searchLower ||
              (p.sku || "").toLowerCase() === searchLower ||
              (p.model || "").toLowerCase() === searchLower ||
              p.name.toLowerCase() === searchLower
            ) {
              return true;
            }
            const foundSerial = (p.availableSerials || []).find(
              (s: string) => s.toLowerCase() === searchLower,
            );
            if (foundSerial) {
              matchedSerial = foundSerial;
              return true;
            }
            return false;
          });

          const partialMatches = products.filter(
            (p) =>
              p.name.toLowerCase().includes(searchLower) ||
              (p.sku || "").toLowerCase().includes(searchLower),
          );
          const bestMatch =
            exactMatches.length === 1
              ? exactMatches[0]
              : partialMatches.length === 1
                ? partialMatches[0]
                : null;

          if (bestMatch) {
            if (bestMatch.hasSerialTracking && !matchedSerial) {
              playBeep("error");
              toast.error(
                "This product requires a Serial Number! Please scan the S/N instead.",
                { duration: 4000 },
              );
            } else {
              addToCart(bestMatch, matchedSerial, matchedVariant);
              setSearchQuery("");
              playBeep("success");
              toast.success(`Scanned: ${bestMatch.name}`);
            }
          } else if (exactMatches.length > 1 || partialMatches.length > 1) {
            playBeep("error");
            toast.success(`Found multiple items. Please select manually.`);
          } else {
            playBeep("error");
            toast.error("No matching product found for scan");
          }
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
  }, [products]);

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, "customers"), {
        ...customerFormData,
        createdAt: new Date().toISOString(),
      });
      const newC = {
        id: docRef.id,
        ...customerFormData,
        createdAt: new Date().toISOString(),
      } as Customer;
      setCustomers([newC, ...customers]);
      setSelectedCustomer(newC);
      setIsAddingCustomer(false);
      setCustomerFormData({ name: "", phone: "", email: "", address: "" });
      toast.success("Customer added seamlessly!");
    } catch (err) {
      toast.error("Failed to add customer");
    }
  };

  const holdCurrentCart = () => {
    if (cart.length === 0) return;
    const newHold = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      cart,
      customer: selectedCustomer,
    };
    const updated = [newHold, ...heldCarts];
    setHeldCarts(updated);
    localStorage.setItem("pos_held_carts", JSON.stringify(updated));
    setCart([]);
    setSelectedCustomer(null);
    toast.success("Cart held!");
  };

  const restoreCart = (id: string) => {
    const toRestore = heldCarts.find((h) => h.id === id);
    if (toRestore) {
      if (cart.length > 0) holdCurrentCart();
      setCart(toRestore.cart);
      setSelectedCustomer(toRestore.customer);
      const updated = heldCarts.filter((h) => h.id !== id);
      setHeldCarts(updated);
      localStorage.setItem("pos_held_carts", JSON.stringify(updated));
      setShowHeldCarts(false);
      toast.success("Cart restored");
    }
  };

  const deleteHeldCart = (id: string) => {
    const updated = heldCarts.filter((h) => h.id !== id);
    setHeldCarts(updated);
    localStorage.setItem("pos_held_carts", JSON.stringify(updated));
  };

  const addToCart = (product: Product, scannedSerial?: string, scannedVariant?: ProductVariant) => {
    const availableStock = scannedVariant?.stock ?? product.stock;
    if (availableStock <= 0) {
      toast.error("Item is out of stock");
      return;
    }

    setCart((prev) => {
      const hasVariants = product.variants && product.variants.length > 0;
      const existingIdx = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          (!hasVariants
            ? !item.selectedVariant
            : item.selectedVariant?.id === scannedVariant?.id),
      );

      if (existingIdx >= 0 && (!hasVariants || scannedVariant)) {
        const newCart = [...prev];
        if (newCart[existingIdx].quantity < availableStock) {
          newCart[existingIdx].quantity += 1;
          if (
            scannedSerial &&
            !newCart[existingIdx].selectedSerials?.includes(scannedSerial)
          ) {
            newCart[existingIdx].selectedSerials = [
              ...(newCart[existingIdx].selectedSerials || []),
              scannedSerial,
            ];
          }
        } else {
          toast.error("Cannot exceed available stock");
        }
        return newCart;
      }

      return [
        ...prev,
        {
          cartItemId: Date.now().toString() + Math.random().toString(),
          product: scannedVariant ? { ...product, price: scannedVariant.price } : product,
          quantity: 1,
          selectedSerials: scannedSerial ? [scannedSerial] : [],
          selectedVariant: scannedVariant || null,
        },
      ];
    });
  };

  const changeVariant = (cartItemId: string, variantId: string) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item.cartItemId === cartItemId && item.product.variants) {
          const v = item.product.variants.find((x: any) => x.id === variantId);
          if (v) {
            return {
              ...item,
              selectedVariant: v,
              product: { ...item.product, price: v.price },
            };
          }
        }
        return item;
      });
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const adjustQty = (cartItemId: string, qty: number) => {
    if (qty < 1) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) => {
      return prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          const currentStockLimit =
            item.selectedVariant && item.selectedVariant.stock > 0
              ? item.selectedVariant.stock
              : item.product.stock;
          if (qty > currentStockLimit) {
            toast.error("Cannot exceed available stock");
            return item;
          }
          return { ...item, quantity: qty };
        }
        return item;
      });
    });
  };

  const openSerialModal = (idx: number) => {
    setActiveSerialItemIdx(idx);
    setShowSerialModal(true);
  };

  const toggleSerialSelection = (serial: string) => {
    if (activeSerialItemIdx === null) return;

    setCart((prev) => {
      const newCart = [...prev];
      const item = newCart[activeSerialItemIdx];
      const currentSerials = item.selectedSerials || [];

      if (currentSerials.includes(serial)) {
        item.selectedSerials = currentSerials.filter((s) => s !== serial);
      } else {
        if (currentSerials.length >= item.quantity) {
          toast.error(`You only need ${item.quantity} serial(s)`);
          return prev;
        }
        item.selectedSerials = [...currentSerials, serial];
      }
      return newCart;
    });
  };

  const [isRedeemingPoints, setIsRedeemingPoints] = useState(false);
  const subtotal = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0,
  );
  let calculatedDiscount =
    discountType === "percentage"
      ? (subtotal * discountValue) / 100
      : discountValue;
  if (isRedeemingPoints) calculatedDiscount += 40;
  const subtotalAfterDiscount = Math.max(0, subtotal - calculatedDiscount);
  const calculatedTax = (subtotalAfterDiscount * taxPercent) / 100;
  const total = subtotalAfterDiscount + calculatedTax;

  useEffect(() => {
    if (isPaymentView && paymentAccounts.length > 0 && payments.length === 0) {
      setPayments([{ accountId: paymentAccounts[0].id, amount: total }]);
    }
  }, [isPaymentView, total, paymentAccounts]);

  const handleCheckoutClick = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    for (const item of cart) {
      if (
        item.product.variants &&
        item.product.variants.length > 0 &&
        !item.selectedVariant
      ) {
        toast.error(`Please select a variant for ${item.product.name}`);
        return;
      }
    }

    setIsPaymentView(true);
  };

  const processPaymentAndOrder = async () => {
    try {
      if (cart.length === 0) {
        toast.error("Cart is empty");
        return;
      }

      for (const item of cart) {
        if (
          item.product.variants &&
          item.product.variants.length > 0 &&
          !item.selectedVariant
        ) {
          toast.error(`Please select a variant for ${item.product.name}`);
          return;
        }
      }

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(totalPaid - total) > 0.01) {
        toast.error(
          `Payment amount (${formatCurrency(totalPaid, settings)}) does not match total (${formatCurrency(total, settings)})`,
        );
        return;
      }

      setIsProcessing(true);
      const createdAt = new Date().toISOString();
      const docNumber = await generateDocumentNumber("invoice");

      const processedItems = cart.map((c) => {
        const itemName = c.selectedVariant
          ? `${c.product.name} (${c.selectedVariant.name})`
          : c.product.name;
        return {
          id: c.product.id,
          productId: c.product.id,
          variantId: c.selectedVariant?.id || null,
          name: itemName,
          price: c.product.price,
          costPrice: c.product.costPrice || 0,
          quantity: c.quantity,
          hasSerialTracking: c.product.hasSerialTracking || false,
          selectedSerials: c.selectedSerials || [],
          hasWarranty: c.hasWarranty || false,
          warrantyMonths: c.warrantyMonths || c.product.warrantyMonths || 0,
          warrantyUnit: c.product.warrantyUnit || 'months',
          brand: c.product.brand || '',
          warranty: (c.warrantyMonths || c.product.warrantyMonths) ? formatWarranty(c.warrantyMonths || c.product.warrantyMonths || 0, c.product.warrantyUnit) : '',
        };
      });

      const totalCost = processedItems.reduce(
        (acc, i) => acc + i.costPrice * i.quantity,
        0,
      );
      const profit = total - totalCost;

      const methodsUsed = payments
        .map((p) => {
          const acc = paymentAccounts.find((a) => a.id === p.accountId);
          return acc ? acc.name : "Unknown";
        })
        .join(", ");

      const orderData = {
        documentNumber: docNumber,
        type: "pos_sale",
        saleSource,
        customerId: selectedCustomer?.id || "general",
        customerName: selectedCustomer
          ? selectedCustomer.name
          : "General Customer",
        customerPhone: selectedCustomer?.phone || "",
        customerEmail: selectedCustomer?.email || "",
        customerAddress: selectedCustomer?.address || "",
        items: processedItems,
        subtotal,
        discountAmount: calculatedDiscount,
        taxAmount: calculatedTax,
        totalCost,
        profit,
        total,
        paidAmount: total,
        paymentStatus: "paid",
        paymentMethod: methodsUsed,
        splitPayments: payments,
        status: "delivered",
        userId: user?.uid || "admin",
        createdBy: user?.displayName || user?.email || "Admin",
        createdAt,
      };

      let orderRefId = "";
      try {
        const orderRef = await addDoc(collection(db, "orders"), orderData);
        orderRefId = orderRef.id;
      } catch (e) {
        console.error("Failed adding to orders:", e);
        throw new Error("orders");
      }

      for (const item of cart) {
        if (item.product.isCustomService) continue;
        const prodRef = doc(db, "products", item.product.id);
        const updates: any = {};

        updates.stock = increment(-item.quantity);

        if (item.selectedVariant && item.product.variants) {
          updates.variants = item.product.variants.map((v: any) =>
            v.id === item.selectedVariant!.id
              ? { ...v, stock: Math.max(0, v.stock - item.quantity) }
              : v,
          );
        }

        if (item.product.hasSerialTracking) {
          const serialsToUse =
            item.selectedSerials &&
            item.selectedSerials.length === item.quantity
              ? item.selectedSerials
              : (item.product.availableSerials || []).slice(0, item.quantity);

          const remainingSerials = (item.product.availableSerials || []).filter(
            (s: string) => !serialsToUse.includes(s),
          );
          updates.availableSerials = remainingSerials;

          const warrantyEndDate = new Date();
          const wMonths = item.hasWarranty
            ? item.warrantyMonths || item.product.warrantyMonths || 0
            : item.product.warrantyMonths || 0;
          warrantyEndDate.setTime(addWarranty(warrantyEndDate, wMonths).getTime());

          for (const serial of serialsToUse) {
            try {
              await addDoc(collection(db, "sold_serials"), {
                serial,
                productId: item.product.id,
                productName: item.product.name,
                orderId: orderRefId,
                documentNumber: docNumber,
                customerName: orderData.customerName,
                customerPhone: orderData.customerPhone,
                soldAt: createdAt,
                warrantyEndDate: warrantyEndDate.toISOString(),
                status: "active",
              });
            } catch (e) {
              console.error("Failed adding to sold_serials:", e);
              throw new Error("sold_serials");
            }
          }
        }

        try {
          await updateDoc(prodRef, updates);
        } catch (e) {
          console.error("Failed updating product:", e);
          throw new Error("products");
        }
      }

      // Always record the full sale amount to update the customer ledger (Receivable)
      try {
        await addDoc(collection(db, "transactions"), {
          type: "sale",
          amount: orderData.total,
          date: createdAt.split("T")[0],
          description: `POS Sale - ${docNumber}`,
          entityId: selectedCustomer?.id || "general",
          entityName: orderData.customerName,
          entityType: "customer",
          paymentMethod: "",
          paymentAccountId: "",
          referenceId: orderRefId,
          createdAt,
        });
      } catch (e) {
        console.error("Failed adding primary sale transaction:", e);
        throw new Error("transactions");
      }

      for (const p of payments) {
        if (p.amount <= 0) continue;
        const paymentAcc = paymentAccounts.find((a) => a.id === p.accountId);
        if (!paymentAcc) continue;

        try {
          await addDoc(collection(db, "transactions"), {
            type: "payment_received",
            amount: p.amount,
            date: createdAt.split("T")[0],
            description: `Payment for POS Sale - ${docNumber}`,
            entityId: selectedCustomer?.id || "general",
            entityName: orderData.customerName,
            entityType: "customer",
            paymentMethod: paymentAcc.type || "cash",
            paymentAccountId: paymentAcc.id,
            paymentAccountName: paymentAcc.name,
            referenceId: orderRefId,
            createdAt,
          });
        } catch (e) {
          console.error("Failed adding transaction:", e);
          throw new Error("transactions");
        }
      }

      const pointsRedeemed = isRedeemingPoints ? 100 : 0;
      const pointsEarned = Math.floor(total / 100);

      toast.success("Sale completed successfully!");

      // Log sale to Audit Trail
      await logAudit(
        "CREATE",
        "Sale",
        `POS Sale #${docNumber} completed (Total: ৳${total}, Customer: ${orderData.customerName}, Items: ${cart.length})`,
        user?.displayName || user?.email || "POS Operator",
        {
          entityId: orderRefId,
          newState: { documentNumber: docNumber, total, customerName: orderData.customerName, itemsCount: cart.length }
        }
      );

      if (selectedCustomer) {
        try {
          const custRef = doc(db, "customers", selectedCustomer.id);
          const newPoints =
            (selectedCustomer.loyaltyPoints || 0) -
            pointsRedeemed +
            pointsEarned;
          await updateDoc(custRef, {
            loyaltyPoints: newPoints,
          });
          setSelectedCustomer({
            ...selectedCustomer,
            loyaltyPoints: newPoints,
          });
        } catch (e) {
          console.error("Failed to update loyalty points", e);
          // Don't throw here to avoid failing checkout for just loyalty points
        }
      }

      setCart([]);
      setSelectedCustomer(null);
      setIsPaymentView(false);
      setIsRedeemingPoints(false);
      setReceivedAmount("");
      setPayments([]);

      const prodSnap = await getDocs(
        query(
          collection(db, "products"),
          orderBy("createdAt", "desc"),
          limit(500),
        ),
      );
      setProducts(
        prodSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[],
      );

      printReceipt(orderData);
    } catch (err: any) {
      console.error("Checkout failed:", err);
      toast.error("Checkout failed: " + (err.message || "Permissions error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const printReceipt = (orderData: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let itemsHtml = "";
    const isThermal = settings?.receiptPrinterType === "Thermal Printer";

    if (isThermal) {
      orderData.items.forEach((item: any) => {
        itemsHtml += `
          <tr>
            <td style="padding: 4px 0;">
              <div><strong>${item.name}</strong></div>
              ${item.selectedSerials?.length > 0 ? `<div style="font-size: 10px; color: #555;">SN: ${item.selectedSerials.join(", ")}</div>` : ""}
            </td>
            <td style="text-align: center; padding: 4px 0;">${item.quantity}</td>
            <td style="text-align: right; padding: 4px 0;">${formatCurrency(item.price * item.quantity, settings)}</td>
          </tr>
        `;
      });
    } else {
      orderData.items.forEach((item: any, index: number) => {
        itemsHtml += `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td>
              <strong>${item.name}</strong>
              ${item.selectedSerials?.length > 0 ? `<br><span style="color: #666; font-size: 12px;">Serial Numbers: ${item.selectedSerials.join(", ")}</span>` : ""}
              ${item.hasWarranty ? `<br><span style="color: #666; font-size: 12px;">Warranty: ${formatWarranty(item.warrantyMonths || item.product.warrantyMonths || 0, item.product.warrantyUnit) || '0 Months'}</span>` : ""}
            </td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">${formatCurrency(item.price, settings)}</td>
            <td style="text-align: right;">${formatCurrency(item.price * item.quantity, settings)}</td>
          </tr>
        `;
      });
    }

    const html = isThermal
      ? `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${orderData.documentNumber}</title>
          <style>
            body { font-family: monospace; margin: 0; padding: 10px; color: #000; width: 80mm; font-size: 12px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .header h1 { font-size: 18px; margin: 0 0 5px 0; }
            .header p { margin: 2px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th { border-bottom: 1px dashed #000; padding: 4px 0; text-align: left; }
            .totals { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
            .totals-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-weight: bold; }
            .footer { text-align: center; font-size: 10px; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${settings?.brandName || "Click2IT"}</h1>
            <p>${settings?.address || ""}</p>
            <p>Phone: ${settings?.phone || ""}</p>
            <p><strong>Receipt: ${orderData.documentNumber}</strong></p>
            <p>Date: ${new Date(orderData.createdAt).toLocaleString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="totals">
            <div class="totals-row"><span>Subtotal:</span><span>${formatCurrency(orderData.subtotal, settings)}</span></div>
            ${orderData.discountAmount > 0 ? `<div class="totals-row"><span>Discount:</span><span>-${formatCurrency(orderData.discountAmount, settings)}</span></div>` : ""}
            <div class="totals-row" style="font-size: 14px; margin-top: 5px;"><span>Total:</span><span>${formatCurrency(orderData.total, settings)}</span></div>
            <div class="totals-row"><span>Paid:</span><span>${formatCurrency(orderData.paidAmount, settings)}</span></div>
          </div>
          <div class="footer">
            <p>Thank you for shopping with us!</p>
            <p>Powered by Click2IT</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              ${settings?.posFastMode === "Yes" ? "setTimeout(() => window.close(), 500);" : ""}
            };
          </script>
        </body>
      </html>
    `
      : `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${orderData.documentNumber}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 40px; color: #333; max-width: 210mm; margin: 0 auto; background: #fff; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; margin-bottom: 30px; }
            .brand-info h1 { font-size: 28px; font-weight: 800; color: #2563eb; margin: 0 0 5px 0; }
            .brand-info p { margin: 2px 0; font-size: 13px; color: #6b7280; }
            .invoice-details { text-align: right; }
            .invoice-details h2 { font-size: 24px; color: #111827; margin: 0 0 10px 0; letter-spacing: 1px; }
            .invoice-details p { margin: 2px 0; font-size: 13px; color: #4b5563; }
            .customer-info { margin-bottom: 30px; padding: 20px; background: #f9fafb; border-radius: 8px; }
            .customer-info h3 { margin: 0 0 10px 0; font-size: 14px; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #374151; letter-spacing: 0.5px; }
            td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
            .totals-container { display: flex; justify-content: flex-end; }
            .totals { width: 300px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
            .totals-row.final { border-bottom: none; border-top: 2px solid #111827; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 800; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand-info">
              <img src="${logoBase64}" alt="Logo" style="max-height: 40px; margin-bottom: 10px;" />
              <p style="font-weight: bold; color: #111;">Shop No. 1072, Level-10, Multiplan Center</p>
              <p>69-71, New Elephant Road, Dhaka-1205, Bangladesh.</p>
              <p>Phone: +8809640887777, +8801729887777 | Web: click2itbd.com</p>
            </div>
            <div class="invoice-details">
              <h2>INVOICE</h2>
              <p><strong>Receipt #:</strong> ${orderData.documentNumber}</p>
              <p><strong>Date:</strong> ${new Date(orderData.createdAt).toLocaleDateString()}</p>
              <p><strong>Status:</strong> <span style="text-transform: capitalize;">${orderData.paymentStatus}</span></p>
            </div>
          </div>
          
          <div class="customer-info">
            <h3>Bill To:</h3>
            <p><strong>${orderData.customerName || "Walk-in Customer"}</strong></p>
            ${orderData.customerPhone ? `<p>Phone: ${orderData.customerPhone}</p>` : ""}
            ${orderData.customerEmail ? `<p>Email: ${orderData.customerEmail}</p>` : ""}
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">#</th>
                <th>Description</th>
                <th style="width: 80px; text-align: center;">Qty</th>
                <th style="width: 120px; text-align: right;">Unit Price</th>
                <th style="width: 120px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="totals-container">
            <div class="totals">
              <div class="totals-row">
                <span>Subtotal</span>
                <span>${formatCurrency(orderData.subtotal, settings)}</span>
              </div>
              ${orderData.discountAmount > 0 ? `<div class="totals-row" style="color: #059669;"><span>Discount</span><span>-${formatCurrency(orderData.discountAmount, settings)}</span></div>` : ""}
              <div class="totals-row final">
                <span>Total</span>
                <span>${formatCurrency(orderData.total, settings)}</span>
              </div>
              <div class="totals-row">
                <span>Paid</span>
                <span>${formatCurrency(orderData.paidAmount, settings)}</span>
              </div>
              <div class="totals-row" style="color: #dc2626;">
                <span>Due Balance</span>
                <span>${formatCurrency(Math.max(0, orderData.total - orderData.paidAmount), settings)}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Powered by Click2IT - Advanced Retail POS System</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              ${settings?.posFastMode === "Yes" ? "setTimeout(() => window.close(), 500);" : ""}
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeSerialItem =
    activeSerialItemIdx !== null ? cart[activeSerialItemIdx] : null;

  const categories = [
    "All",
    ...Array.from(new Set(products.map((p) => p.category))),
  ];

  const filteredProducts = products.filter((p) => {
    const sq = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(sq) ||
      (p.category || "").toLowerCase().includes(sq) ||
      (p.model || "").toLowerCase().includes(sq) ||
      (p as any).sku?.toLowerCase().includes(sq) ||
      p.id.toLowerCase().includes(sq) ||
      (p.availableSerials || []).some((s: string) =>
        s.toLowerCase().includes(sq),
      );
    const matchesCategory =
      activeCategory === "All" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <POSHeader
          heldCarts={heldCarts}
          showHeldCarts={showHeldCarts}
          setShowHeldCarts={setShowHeldCarts}
          restoreCart={restoreCart}
          deleteHeldCart={deleteHeldCart}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          products={products}
          filteredProducts={filteredProducts}
          addToCart={addToCart}
          settings={settings}
        />

        <POSCartArea
          cart={cart}
          setCart={setCart}
          settings={settings}
          adjustQty={adjustQty}
          changeVariant={changeVariant}
          removeFromCart={removeFromCart}
          openSerialModal={openSerialModal}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          customers={customers}
          setIsAddingCustomer={setIsAddingCustomer}
        />
      </div>

      <POSSidebar
        isPaymentView={isPaymentView}
        setIsPaymentView={setIsPaymentView}
        payments={payments}
        setPayments={setPayments}
        paymentAccounts={paymentAccounts}
        receivedAmount={receivedAmount}
        setReceivedAmount={setReceivedAmount}
        total={total}
        subtotal={subtotal}
        discountType={discountType}
        setDiscountType={setDiscountType}
        discountValue={discountValue}
        setDiscountValue={setDiscountValue}
        taxPercent={taxPercent}
        setTaxPercent={setTaxPercent}
        holdCurrentCart={holdCurrentCart}
        processPaymentAndOrder={processPaymentAndOrder}
        cart={cart}
        isProcessing={isProcessing}
        settings={settings}
        isRedeemingPoints={isRedeemingPoints}
        setIsRedeemingPoints={setIsRedeemingPoints}
        selectedCustomer={selectedCustomer}
      />

      <POSModals
        showSerialModal={showSerialModal}
        activeSerialItem={activeSerialItem}
        setShowSerialModal={setShowSerialModal}
        setActiveSerialItemIdx={setActiveSerialItemIdx}
        toggleSerialSelection={toggleSerialSelection}
        isAddingCustomer={isAddingCustomer}
        setIsAddingCustomer={setIsAddingCustomer}
        customerFormData={customerFormData}
        setCustomerFormData={setCustomerFormData}
        handleQuickAddCustomer={handleQuickAddCustomer}
      />
    </div>
  );
};
