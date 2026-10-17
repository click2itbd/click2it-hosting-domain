import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
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
  setLocalSession: (userObj: any, profileObj: UserProfile) => void;
  logout: () => Promise<void>;
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

  // Restore local session fallback if stored
  useEffect(() => {
    try {
      const savedSession = sessionStorage.getItem('custom_auth_session') || localStorage.getItem('custom_auth_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed?.user && parsed?.profile) {
          setUser(parsed.user);
          setProfile(parsed.profile);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const setLocalSession = (userObj: any, profileObj: UserProfile) => {
    setUser(userObj);
    setProfile(profileObj);
    try {
      const payload = JSON.stringify({ user: userObj, profile: profileObj });
      sessionStorage.setItem('custom_auth_session', payload);
      localStorage.setItem('custom_auth_session', payload);
    } catch (e) {
      console.warn('Failed to save custom auth session:', e);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth).catch(() => null);
    } catch (e) {
      // ignore
    }
    setUser(null);
    setProfile(null);
    try {
      sessionStorage.removeItem('custom_auth_session');
      localStorage.removeItem('custom_auth_session');
      sessionStorage.removeItem('impersonated_customer');
    } catch (e) {
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid)).catch(() => null);
          if (userDoc && userDoc.exists()) {
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
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile).catch(() => null);
            setProfile(newProfile);
          }
        }
      } catch (error) {
        console.warn("Auth context background listener warning:", error);
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
        setLocalSession,
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
