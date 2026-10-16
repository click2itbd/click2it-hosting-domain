import { useState, useEffect } from 'react';
import { Product } from '../types';

export const useRecentlyViewed = () => {
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('recentlyViewed');
    if (stored) {
      try {
        setRecentlyViewed(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing recently viewed', e);
      }
    }
  }, []);

  const addRecentlyViewed = (product: Product) => {
    try {
      const stored = localStorage.getItem('recentlyViewed');
      let current: Product[] = [];
      if (stored) {
        current = JSON.parse(stored);
      }
      
      // Remove if already exists to move it to the front
      current = current.filter(p => p.id !== product.id);
      
      // Add to front
      current.unshift(product);
      
      // Keep only last 8 items
      current = current.slice(0, 8);
      
      localStorage.setItem('recentlyViewed', JSON.stringify(current));
      setRecentlyViewed(current);
    } catch (error) {
      console.error('Error saving recently viewed', error);
    }
  };

  return { recentlyViewed, addRecentlyViewed };
};
