// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { Product } from '../../types';
import { Layout } from '../../components/Layout';
import { ProductCard } from '../../components/ProductCard';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageLoader } from '../../components/Loading';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { SEO } from '../../components/SEO';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [priceRange, setPriceRange] = useState({ min: 0, max: 200000 });
  const [sortBy, setSortBy] = useState('newest');
  const [showInStock, setShowInStock] = useState(true);
  const [showOutOfStock, setShowOutOfStock] = useState(true);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string[]>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    const fetchProducts = async () => {
      if (!q.trim()) {
        setProducts([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const productQuery = query(collection(db, 'products'));
        const snap = await getDocs(productQuery);
        let productsData = (snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]).filter(p => p.showInStore !== false);
        
        const searchTerm = q.toLowerCase();
        productsData = productsData.filter(p => {
          const matchName = p.name?.toLowerCase().includes(searchTerm);
          const matchBrand = p.brand?.toLowerCase().includes(searchTerm);
          const matchCategory = p.category?.toLowerCase().includes(searchTerm);
          const matchSubCategory = p.subCategory?.toLowerCase().includes(searchTerm);
          
          return matchName || matchBrand || matchCategory || matchSubCategory;
        });
        
        setProducts(productsData.filter(p => p.isActive !== false));
        setCurrentPage(1);
      } catch (error) {
        console.error('Error fetching search results:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [q]);

  // Derived state
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    products.forEach(p => {
      if (p.brand) brands.add(p.brand);
    });
    return Array.from(brands).sort();
  }, [products]);

  const availableSpecs = useMemo(() => {
    const specs = {};
    products.forEach(p => {
      if (p.specs) {
        Object.entries(p.specs).forEach(([key, val]) => {
          if (!specs[key]) specs[key] = new Set();
          if (val) specs[key].add(val.toString());
        });
      }
    });
    const formatted = {};
    Object.keys(specs).forEach(k => {
      formatted[k] = Array.from(specs[k]).sort();
    });
    return formatted;
  }, [products]);


  // Filtered and sorted products
  const processedProducts = useMemo(() => {
    return products
      .filter(p => {
        const pPrice = p.discountPrice || p.price;
        if (pPrice < priceRange.min || pPrice > priceRange.max) return false;
        
        if (!showInStock && p.stock > 0) return false;
        if (!showOutOfStock && p.stock <= 0) return false;
        
        if (selectedBrands.length > 0 && p.brand) {
          if (!selectedBrands.includes(p.brand)) return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        const priceA = a.discountPrice || a.price;
        const priceB = b.discountPrice || b.price;
        switch (sortBy) {
          case 'price-asc': return priceA - priceB;
          case 'price-desc': return priceB - priceA;
          case 'name-asc': return a.name.localeCompare(b.name);
          case 'name-desc': return b.name.localeCompare(a.name);
          default: return 0;
        }
      });
  }, [products, priceRange, showInStock, showOutOfStock, sortBy, selectedBrands]);

  const totalPages = Math.ceil(processedProducts.length / itemsPerPage);
  const currentItems = processedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
    setCurrentPage(1);
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Layout>
      <SEO
        title={q ? `Search results for "${q}" | CLICK2IT` : "Search Products | CLICK2IT"}
        description={`Search products, laptops, components, and electronics at CLICK2IT.`}
        noindex={true}
      />
      <div className="bg-gray-50 min-h-screen pb-16">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 py-8">
          <div className="container mx-auto px-2 sm:px-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Search Results</h1>
            <p className="text-gray-600 flex items-center gap-2">
              <Search size={16} />
              Showing results for <span className="font-bold text-[#F97316]">"{q}"</span> ({processedProducts.length} items)
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters */}
            <div className="w-full lg:w-64 shrink-0 space-y-6">
              {/* Availability */}
              <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
                <h3 className="font-bold text-[#081621] mb-4">Availability</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={showInStock} onChange={(e) => { setShowInStock(e.target.checked); setCurrentPage(1); }} className="w-4 h-4 text-[#F97316] rounded border-gray-300 focus:ring-[#F97316]" />
                    <span className="text-sm text-gray-700">In Stock</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={showOutOfStock} onChange={(e) => { setShowOutOfStock(e.target.checked); setCurrentPage(1); }} className="w-4 h-4 text-[#F97316] rounded border-gray-300 focus:ring-[#F97316]" />
                    <span className="text-sm text-gray-700">Out of Stock</span>
                  </label>
                </div>
              </div>

              {/* Price Range */}
              <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
                <h3 className="font-bold text-[#081621] mb-4">Price Range</h3>
                <div className="flex items-center gap-2 mb-4">
                  <input type="number" value={priceRange.min} onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#F97316]" placeholder="Min" />
                  <span className="text-gray-400">-</span>
                  <input type="number" value={priceRange.max} onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#F97316]" placeholder="Max" />
                </div>
              </div>

              {/* Brands */}
              {availableBrands.length > 0 && (
                <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-[#081621] mb-4">Brands</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {availableBrands.map(brand => (
                      <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)} className="w-4 h-4 text-[#F97316] rounded border-gray-300 focus:ring-[#F97316]" />
                        <span className="text-sm text-gray-700 group-hover:text-[#F97316] transition-colors">{brand}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
                <span className="text-sm text-gray-600">Showing {currentItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, processedProducts.length)} of {processedProducts.length} products</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border-gray-200 rounded-md text-sm focus:ring-[#F97316] focus:border-[#F97316]">
                  <option value="newest">Sort by: Default</option>
                  <option value="price-asc">Price (Low to High)</option>
                  <option value="price-desc">Price (High to Low)</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
              </div>

              {processedProducts.length === 0 ? (
                <div className="bg-white p-12 rounded-lg border border-gray-100 text-center flex flex-col items-center">
                  <Search size={48} className="text-gray-300 mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No matching products found</h3>
                  <p className="text-gray-500">We couldn't find any products matching "{q}". Try checking your spelling or using more general terms.</p>
                </div>
              ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 sm:gap-2 sm:gap-6">
                  <AnimatePresence>
                    {currentItems.map(product => (
                      <motion.div key={product.id} variants={itemVariants} layoutId={`product-${product.id}`}>
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center gap-2">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setCurrentPage(idx + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={cn(
                        "w-10 h-10 rounded-md font-bold text-sm transition-colors",
                        currentPage === idx + 1 ? "bg-[#F97316] text-white" : "bg-white text-gray-600 hover:bg-orange-50 border border-gray-200"
                      )}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-16">
            <RecentlyViewedSection />
          </div>
        </div>
      </div>
    </Layout>
  );
};


const RecentlyViewedSection = () => {
  const { recentlyViewed } = useRecentlyViewed();
  
  if (!recentlyViewed || recentlyViewed.length === 0) return null;
  
  return (
    <div className="mt-16 bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
      <h2 className="text-xl font-bold text-[#081621] mb-6 flex items-center gap-2">
        Recently Viewed
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        {recentlyViewed.slice(0, 4).map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

