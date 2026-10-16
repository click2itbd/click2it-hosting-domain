import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, DiscountCode } from '../types';
import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useSettings } from './SettingsContext';
import { useAuth } from './AuthContext';

const withoutTransferSecrets = <T extends object>(item: T): Omit<T, 'eppCode' | 'authCode'> => {
  const { eppCode: _eppCode, authCode: _authCode, ...safeItem } = item as T & {
    eppCode?: string;
    authCode?: string;
  };
  return safeItem as Omit<T, 'eppCode' | 'authCode'>;
};

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product | any) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateCartItem: (productId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  subtotal: number;
  total: number;
  promoDiscount: number;
  promoMessage: string | null;
  appliedDiscount: DiscountCode | null;
  setAppliedDiscount: (discount: DiscountCode | null) => void;
  isShippingFree: boolean;
  promoSettings: Record<string, any>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved).map(withoutTransferSecrets) : [];
  });

  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(() => {
    const saved = localStorage.getItem('appliedDiscount');
    return saved ? JSON.parse(saved) : null;
  });

  const { settings } = useSettings();

  const [promoSettings, setPromoSettings] = useState<any>({
    isFreeDomainEnabled: false,
    eligibleTlds: [],
    excludeBdDomains: true
  });

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'hostingPromos'), 
      (snap) => {
        if (snap.exists()) {
          setPromoSettings(snap.data() as any);
        }
      },
      (error) => {
        console.warn('Could not load promo settings:', error.message);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (appliedDiscount) {
      localStorage.setItem('appliedDiscount', JSON.stringify(appliedDiscount));
    } else {
      localStorage.removeItem('appliedDiscount');
    }
  }, [appliedDiscount]);

  const addToCart = (product: Product) => {
    const safeProduct = withoutTransferSecrets(product);
    setItems(prev => {
      const existing = prev.find(item => item.id === safeProduct.id);
      if (existing) {
        return prev.map(item =>
          item.id === safeProduct.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...safeProduct, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => setItems(prev => prev.filter(item => item.id !== productId));

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems(prev => prev.map(item => (item.id === productId ? { ...item, quantity } : item)));
  };

  const updateCartItem = (productId: string, updates: Partial<CartItem>) => {
    const safeUpdates = withoutTransferSecrets(updates);
    setItems(prev => prev.map(item => item.id === productId ? { ...item, ...safeUpdates } : item));
  };

  const clearCart = () => {
    setItems([]);
    setAppliedDiscount(null);
  };

  let promoMessage = null;
  const processedItems = items.map(item => {
      const finalPrice = item.discountPrice && item.discountPrice < item.price ? item.discountPrice : item.price;
      return { 
        ...item, 
        originalPrice: item.price !== finalPrice ? item.price : null, 
        price: finalPrice 
      };
    });

  if (promoSettings.isFreeDomainEnabled) {
    let isValid = true;
    const now = new Date();
    if (promoSettings.startDate && new Date(promoSettings.startDate) > now) isValid = false;
    if (promoSettings.endDate && new Date(promoSettings.endDate) < now) isValid = false;

    if (isValid) {
      const eligibleCycles = promoSettings.eligibleBillingCycles || ['yearly'];
      const hasEligibleHosting = processedItems.some(item => item.itemType === 'hosting' && eligibleCycles.includes(item.billingCycle!));
      
      if (hasEligibleHosting) {
        const eligibleDomain = processedItems.find(item => item.itemType === 'domain' && (promoSettings.eligibleTlds || ['.com']).includes('.' + (item.domainTld || '').replace('.', '')));
        if (eligibleDomain && eligibleDomain.price > 0) {
          promoMessage = `100% discount applied on ${eligibleDomain.name} (Promo!)`;
          (eligibleDomain as any).originalPrice = eligibleDomain.price;
          eligibleDomain.price = 0;
        }
      }
    }
  }

  const subtotal = processedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // Exclude .BD domains from promotional discounts based on admin setting
  const discountableSubtotal = processedItems
    .filter(item => {
      const isBdDomain = item.itemType === 'domain' && item.domainTld && item.domainTld.endsWith('.bd');
      if (isBdDomain && promoSettings.excludeBdDomains !== false) return false;
      return true;
    })
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  let promoDiscount = 0;
  
  if (appliedDiscount) {
    if (appliedDiscount.type === 'fixed' && appliedDiscount.fixedAmount) {
      promoDiscount = Math.min(appliedDiscount.fixedAmount, discountableSubtotal);
    } else if (appliedDiscount.type !== 'free_shipping') {
      promoDiscount = (discountableSubtotal * (appliedDiscount.discountPercentage || 0)) / 100;
    }
  }

  const total = Math.max(0, subtotal - promoDiscount);

  let isShippingFree = false;
  if (appliedDiscount && appliedDiscount.type === 'free_shipping') {
    isShippingFree = true;
  }
  if (settings?.freeShippingThreshold && subtotal >= settings.freeShippingThreshold) {
    isShippingFree = true;
  }
  if (processedItems.some(item => item.isFreeShipping)) {
    isShippingFree = true;
  }

  useEffect(() => {
    const syncCart = async () => {
      if (!user) return;
      try {
        if (items.length > 0) {
          await setDoc(doc(db, 'abandoned_carts', user.uid), {
            userId: user.uid,
            userEmail: user.email || '',
            userName: user.displayName || '',
            items: items.map(withoutTransferSecrets),
            total,
            updatedAt: new Date().toISOString()
          });
        } else {
          await deleteDoc(doc(db, 'abandoned_carts', user.uid)).catch(e => {});
        }
      } catch (e) {
        console.error('Failed to sync abandoned cart', e);
      }
    };
    
    const timeout = setTimeout(syncCart, 2000);
    return () => clearTimeout(timeout);
  }, [items, total, user]);

  return (
    <CartContext.Provider value={{ items: processedItems, addToCart, removeFromCart, updateQuantity, updateCartItem, clearCart, subtotal, total, promoDiscount, promoMessage, appliedDiscount, setAppliedDiscount, isShippingFree, promoSettings }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

