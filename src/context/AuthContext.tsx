import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, UserPermission } from '../types';
import { resolveApiBaseUrl } from '../services/apiClient';

export interface ImpersonatedCustomer {
  uid: string;
  email: string;
  displayName?: string;
  name?: string;
  balance?: number;
  phone?: string;
  customerId?: string;
}

interface AuthContextType {
  user: User | null;
  effectiveUser: (User | { uid: string; email: string; displayName?: string }) | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  canAccessAdmin: boolean;
  impersonatedCustomer: ImpersonatedCustomer | null;
  isImpersonating: boolean;
  startImpersonation: (customer: ImpersonatedCustomer) => void;
  stopImpersonation: () => void;
  hasPermission: (permission: UserPermission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedCustomer, setImpersonatedCustomer] = useState<ImpersonatedCustomer | null>(() => {
    try {
      const saved = sessionStorage.getItem('impersonated_customer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const startImpersonation = (cust: ImpersonatedCustomer) => {
    setImpersonatedCustomer(cust);
    try {
      sessionStorage.setItem('impersonated_customer', JSON.stringify(cust));
    } catch (e) {
      console.warn('Failed to save impersonated customer:', e);
    }
  };

  const stopImpersonation = () => {
    setImpersonatedCustomer(null);
    try {
      sessionStorage.removeItem('impersonated_customer');
    } catch (e) {
      console.warn('Failed to clear impersonation:', e);
    }
  };

  const effectiveUser = impersonatedCustomer
    ? ({
        ...(user || {}),
        uid: impersonatedCustomer.uid,
        email: impersonatedCustomer.email,
        displayName: impersonatedCustomer.displayName || impersonatedCustomer.name || 'Customer',
      } as any)
    : user;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              role: 'user',
              permissions: [],
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);

            // Send welcome email
            try {
              const token = await firebaseUser.getIdToken();
              const baseUrl = resolveApiBaseUrl();
              await fetch(`${baseUrl}/api/send-welcome-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  email: firebaseUser.email,
                  name: firebaseUser.displayName || 'User',
                }),
              });
            } catch (emailError) {
              console.error('Failed to send welcome email:', emailError);
            }
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Auth context error:", error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager';
  const isStaff = profile?.role === 'staff' || isAdmin;
  const canAccessAdmin = isAdmin || isManager || isStaff;

  const hasPermission = (permission: UserPermission) => {
    const legacyMap: Record<string, string[]> = {
      'manage_inventory': ['inventory', 'menus', 'brands', 'purchases', 'purchase_return', 'vendors', 'vendor_due_list'],
      'manage_orders': ['sales', 'sale_return', 'orders', 'customers', 'quotations', 'customer_due_list'],
      'manage_finances': ['internal_notes', 'payment_accounts', 'ledger', 'manual_income', 'manual_expense', 'tx_categories', 'stock_accounting', 'deposits_withdrawals', 'account_balance', 'account_statement', 'balance_sheet', 'trial_balance', 'transaction_history'],
      'manage_hr': ['users', 'employees', 'leave', 'salary'],
      'manage_services': ['hostingOrders', 'activeHostingAccounts', 'domainPricing', 'hostingPlans', 'domainOffers', 'domainRenewals', 'supportTickets', 'hosting_api_settings', 'hostingBilling', 'services'],
      'manage_marketing': ['campaigns', 'discountCodes', 'reviews'],
      'manage_reports': ['reports', 'all_reports', 'customer_receive_report'],
      'manage_settings': ['crm', 'tasks', 'audit_logs', 'settings']
    };

    if (isAdmin) return true;
    if (!profile?.permissions) return false;
    
    // Exact match
    if (profile.permissions.includes(permission)) return true;
    
    // Check legacy mappings
    for (const [legacyKey, granularPerms] of Object.entries(legacyMap)) {
      if (profile.permissions.includes(legacyKey as UserPermission) && granularPerms.includes(permission)) {
        return true;
      }
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        effectiveUser,
        profile,
        loading,
        isAdmin,
        isManager,
        isStaff,
        canAccessAdmin,
        impersonatedCustomer,
        isImpersonating: !!impersonatedCustomer,
        startImpersonation,
        stopImpersonation,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
