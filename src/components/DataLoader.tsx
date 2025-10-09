import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

export const DataLoader = () => {
  const { loadProducts, products, loading } = useStore();
  const hasLoaded = useRef(false);

  useEffect(() => {
    // Load products on app initialization only once
    if (products.length === 0 && !loading && !hasLoaded.current) {
      hasLoaded.current = true;
      loadProducts();
    }
  }, [loadProducts, products.length, loading]);

  return null; // This component doesn't render anything
}; 