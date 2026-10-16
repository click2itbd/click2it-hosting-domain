import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface WishlistContextType {
  wishlist: Product[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem('wishlist');
    if (saved) {
      try {
        setWishlist(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse wishlist', e);
      }
    }
  }, []);

  // Sync wishlist to Firestore for logged-in users (powers admin Wishlist Analytics)
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => {
      setDoc(doc(db, 'wishlists', user.uid), {
        userId: user.uid,
        userEmail: user.email || '',
        items: wishlist.map(p => ({
          productId: p.id,
          name: p.name,
          imageUrl: (p as any).images?.[0] || (p as any).imageUrl || '',
          price: p.price || 0
        })),
        updatedAt: new Date().toISOString()
      }).catch(err => console.error('Wishlist sync failed', err));
    }, 800);
    return () => clearTimeout(t);
  }, [wishlist, user]);

  const addToWishlist = (product: Product) => {
    setWishlist(prev => {
      if (prev.some(p => p.id === product.id)) return prev;
      const updated = [...prev, product];
      localStorage.setItem('wishlist', JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromWishlist = (productId: string) => {
    setWishlist(prev => {
      const updated = prev.filter(p => p.id !== productId);
      localStorage.setItem('wishlist', JSON.stringify(updated));
      return updated;
    });
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some(p => p.id === productId);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
