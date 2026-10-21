import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, UserPermission } from '../types';

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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BOOTSTRAP_ADMIN_EMAILS = ['click2itbd@gmail.com', 'clcik2itbd@gmail.com', 'admin@click2it.bd', 'muntasiralamresti@gmail.com'];

export function isBootstrapAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return BOOTSTRAP_ADMIN_EMAILS.includes(clean) || clean.endsWith('@click2it.bd');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
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

  // Clear any legacy instant-login session storage on mount for security
  useEffect(() => {
    try {
      sessionStorage.removeItem('custom_auth_session');
      localStorage.removeItem('custom_auth_session');
    } catch {
      // ignore
    }
  }, []);

  const logout = async () => {
    try {
      await signOut(auth).catch(() => null);
    } catch {
      // ignore
    }
    setUser(null);
    setProfile(null);
    try {
      sessionStorage.removeItem('custom_auth_session');
      localStorage.removeItem('custom_auth_session');
      sessionStorage.removeItem('impersonated_customer');
    } catch {
      // ignore
    }
  };

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
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 6000);

    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (firebaseUser) {
            setUser(firebaseUser);
            const isBootstrap = isBootstrapAdminEmail(firebaseUser.email);
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || (isBootstrap ? 'Admin' : 'User'),
              role: isBootstrap ? 'admin' : 'user',
              permissions: isBootstrap ? ['all'] : [],
              createdAt: new Date().toISOString(),
            };
            setProfile((prev) => prev || fallbackProfile);

            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid)).catch(() => null);
            if (userDoc && userDoc.exists()) {
              const existingData = userDoc.data() as UserProfile;
              if (isBootstrap && existingData.role !== 'admin') {
                const upgradedProfile: UserProfile = {
                  ...existingData,
                  role: 'admin',
                  permissions: ['all'],
                };
                await setDoc(
                  doc(db, 'users', firebaseUser.uid),
                  { role: 'admin', isAdmin: true, permissions: ['all'] },
                  { merge: true }
                ).catch(() => null);
                setProfile(upgradedProfile);
              } else {
                setProfile(existingData);
              }
            } else {
              await setDoc(doc(db, 'users', firebaseUser.uid), fallbackProfile, { merge: true }).catch(() => null);
              setProfile(fallbackProfile);
            }
          } else {
            setUser(null);
            setProfile(null);
          }
        } catch (error) {
          console.warn('Auth context background listener warning:', error);
        } finally {
          clearTimeout(safetyTimer);
          setLoading(false);
        }
      });
    } catch {
      clearTimeout(safetyTimer);
      setLoading(false);
    }

    return () => {
      clearTimeout(safetyTimer);
      try {
        unsubscribe();
      } catch {
        // ignore
      }
    };
  }, []);

  const isBootstrap = isBootstrapAdminEmail(user?.email || profile?.email);
  const isAdmin = isBootstrap || profile?.role === 'admin' || (profile as any)?.isAdmin === true;
  const isManager = profile?.role === 'manager';
  const isStaff = profile?.role === 'staff' || isAdmin;
  const canAccessAdmin = isAdmin || isManager || isStaff;

  const hasPermission = (permission: UserPermission) => {
    if (isAdmin) return true;
    if (!profile) return false;
    if (profile.permissions && profile.permissions.includes('all')) return true;
    return profile.permissions?.includes(permission) || false;
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
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
