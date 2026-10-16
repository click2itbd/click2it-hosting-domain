import { Link } from 'react-router-dom';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { Product } from '../../types';
import { Layout } from '../../components/Layout';
import { ProductCard } from '../../components/ProductCard';
import { Filter, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';

import { coreCategories, peripheralCategories } from '../../components/PCBuilder/constants';
import { SEO } from '../../components/SEO';

const containerVariants: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export const CategoryPage: React.FC = () => {
  const { categorySlug, subCategorySlug, subSubCategorySlug } = useParams();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 200000 });
  const [sortBy, setSortBy] = useState('newest');
  const [showInStock, setShowInStock] = useState(true);
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [showDiscountedOnly, setShowDiscountedOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string[]>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const clearFilters = () => {
    setSelectedBrands([]);
    setPriceRange({ min: 0, max: 200000 });
    setShowInStock(true);
    setShowOutOfStock(false);
    setShowDiscountedOnly(false);
    setMinRating(0);
    setSelectedSpecs({});
    setCurrentPage(1);
  };
  const itemsPerPage = 12;

  const [categorySearch, setCategorySearch] = useState('');

  // Find category info for banner
  const categoryInfo = useMemo(() => {
    if (!categorySlug) return null;
    return [...coreCategories, ...peripheralCategories].find(c => c.id === categorySlug) || null;
  }, [categorySlug]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let q = query(collection(db, 'products'));
        const snap = await getDocs(q);
        let productsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        
        if (categorySlug || subCategorySlug) {
          productsData = productsData.filter(p => {
            const prodCat = (p.category || '').toLowerCase();
            const prodSubCat = (p.subCategory || '').toLowerCase();
            
            const catSlug = (categorySlug || '').toLowerCase().replace(/-/g, ' ');
            const subCatSlug = (subCategorySlug || '').toLowerCase().replace(/-/g, ' ');
            const subSubCatSlug = (subSubCategorySlug || '').toLowerCase().replace(/-/g, ' ');
            const prodSubSubCat = (p.subSubCategory || '').toLowerCase();

            const synonyms: Record<string, string[]> = {
              'cpu': ['processor', 'cpu'],
              'ram': ['memory', 'ram'],
              'motherboard': ['mainboard', 'motherboard'],
              'graphics-card': ['gpu', 'vga', 'graphics', 'graphics card'],
              'power-supply': ['psu', 'power supply', 'power'],
              'casing': ['case', 'casing', 'chassis', 'cabinet'],
              'storage': ['ssd', 'hdd', 'nvme', 'hard drive', 'storage', 'pendrive'],
              'cpu-cooler': ['cooler', 'liquid cooling', 'air cooler', 'cpu cooler'],
              'monitor': ['monitor', 'display', 'screen'],
              'ups': ['ups', 'offline', 'online', 'power'],
              'mouse': ['mouse', 'mice'],
              'keyboard': ['keyboard', 'keypad']
            };

            
              if (subSubCatSlug) {
                if (prodSubSubCat.includes(subSubCatSlug)) return true;
                const targetText = prodSubCat || prodCat;
                if (targetText.includes(subSubCatSlug)) return true;
                return false;
              }

              // If a specific subCategory is requested (e.g., /category/components/cpu)
            if (subCatSlug) {
              const targetText = prodSubCat || prodCat; // If product doesn't have subCategory, check its main category just in case
              
              if (targetText.includes(subCatSlug)) return true;
              if (categoryInfo?.name && targetText.includes(categoryInfo.name.toLowerCase().split(' ')[0])) return true;
              
              const checks = synonyms[(subCategorySlug || '').toLowerCase()] || [];
              if (checks.some(word => targetText.includes(word))) return true;
              
              // Also check if the literal prodCat matches subCatSlug (some users might add CPU as a main category)
              if (prodCat.includes(subCatSlug)) return true;
              
              return false; // Did not match the subcategory requested
            }
            
            // If only the main category is requested (e.g., /category/components)
            if (catSlug) {
              if (prodCat.includes(catSlug)) return true;
              
              const checks = synonyms[(categorySlug || '').toLowerCase()] || [];
              if (checks.some(word => prodCat.includes(word))) return true;
            }
            
            return false;
          });
        }

        setProducts(productsData.filter(p => p.showInStore !== false));
      } catch (error) {
        console.error('Error fetching category products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categorySlug, subCategorySlug, subSubCategorySlug]);

  
  const availableSubCategories = useMemo(() => {
    if (subSubCategorySlug) return [];
    
    const items = new Set<string>();
    products.forEach(p => {
      if (subCategorySlug) {
        if (p.subSubCategory) items.add(p.subSubCategory);
      } else if (categorySlug) {
        if (p.subCategory) items.add(p.subCategory);
      }
    });
    return Array.from(items).sort();
  }, [products, categorySlug, subCategorySlug, subSubCategorySlug]);

  const availableBrands = useMemo(() => {
    const brands = products.map(p => p.brand).filter(Boolean);
    return Array.from(new Set(brands)).sort();
  }, [products]);

  const availableSpecs = useMemo<Record<string, string[]>>(() => {
    const specs: Record<string, Set<string>> = {};
    products.forEach(p => {
      if (p.specs) {
        Object.entries(p.specs).forEach(([key, val]) => {
          if (!specs[key]) specs[key] = new Set();
          if (val) specs[key].add(val.toString());
        });
      }
    });
    const formatted: Record<string, string[]> = {};
    Object.keys(specs).forEach(k => {
      formatted[k] = Array.from(specs[k]).sort();
    });
    return formatted;
  }, [products]);


  const filteredProducts = products
    .filter(p => p.price >= priceRange.min && p.price <= priceRange.max)
    .filter(p => {
      if (p.stock > 0) return showInStock;
      return showOutOfStock;
    })
    .filter(p => {
      if (selectedBrands.length === 0) return true;
      return p.brand && selectedBrands.includes(p.brand);
    })
      .filter(p => {
        if (Object.keys(selectedSpecs).length === 0) return true;
        return Object.entries(selectedSpecs).every(([key, allowedVals]) => {
          if (allowedVals.length === 0) return true;
          if (!p.specs || !p.specs[key]) return false;
          return allowedVals.includes(p.specs[key].toString());
        });
      })
    .filter(p => {
      if (!categorySearch.trim()) return true;
      const term = categorySearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        (p.brand || '').toLowerCase().includes(term) ||
        (p.model || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      return 0;
    });

  useEffect(() => {
    setCurrentPage(1);
  }, [priceRange, showInStock, showOutOfStock, selectedBrands, sortBy, categorySlug, subCategorySlug]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const CategoryIcon = categoryInfo?.icon || LayoutGrid;

  const activeName = (subSubCategorySlug || subCategorySlug || categorySlug || 'Products').replace(/-/g, ' ');
  const formattedCategoryName = activeName.charAt(0).toUpperCase() + activeName.slice(1);
  const canonicalCategoryUrl = `https://click2itbd.com/category/${categorySlug}${subCategorySlug ? `/${subCategorySlug}` : ''}${subSubCategorySlug ? `/${subSubCategorySlug}` : ''}`;

  const categoryBreadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://click2itbd.com'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: (categorySlug || 'Category').replace(/-/g, ' '),
        item: `https://click2itbd.com/category/${categorySlug}`
      },
      ...(subCategorySlug ? [{
        '@type': 'ListItem',
        position: 3,
        name: subCategorySlug.replace(/-/g, ' '),
        item: `https://click2itbd.com/category/${categorySlug}/${subCategorySlug}`
      }] : []),
      ...(subSubCategorySlug ? [{
        '@type': 'ListItem',
        position: 4,
        name: subSubCategorySlug.replace(/-/g, ' '),
        item: canonicalCategoryUrl
      }] : [])
    ]
  };

  return (
    <Layout>
      <SEO
        title={`${formattedCategoryName} Price in Bangladesh | CLICK2IT`}
        description={`Explore genuine ${formattedCategoryName} at best price in Bangladesh from CLICK2IT. Check official warranty, authentic specs, user reviews, and fast delivery.`}
        keywords={`${activeName}, ${activeName} price in bd, buy ${activeName} bangladesh, click2it shop`}
        canonical={canonicalCategoryUrl}
        schema={[categoryBreadcrumbsSchema]}
      />
      <div className="bg-[#f8f9fa] min-h-screen pt-4 sm:pt-6 pb-20">
        <div className="w-full mx-auto">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] text-gray-500 mb-4 sm:mb-6 font-medium min-w-0 overflow-x-auto whitespace-nowrap">
            <span className="hover:text-[#F97316] cursor-pointer transition-colors">Home</span>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="capitalize hover:text-[#F97316] cursor-pointer transition-colors">{categorySlug?.replace(/-/g, ' ')}</span>
            {subCategorySlug && (
              <>
                <ChevronRight size={14} className="text-gray-400" />
                <span className={cn("capitalize cursor-pointer transition-colors", subSubCategorySlug ? "hover:text-[#F97316]" : "text-[#081621] font-bold")}>
                  <Link to={`/category/${categorySlug}/${subCategorySlug}`}>{subCategorySlug.replace(/-/g, ' ')}</Link>
                </span>
              </>
            )}
            {subSubCategorySlug && (
              <>
                <ChevronRight size={14} className="text-gray-400" />
                <span className="capitalize text-[#081621] font-bold">{subSubCategorySlug.replace(/-/g, ' ')}</span>
              </>
            )}
          </div>

          

          <button
            type="button"
            aria-expanded={mobileFiltersOpen}
            onClick={() => setMobileFiltersOpen(open => !open)}
            className="lg:hidden w-full mb-3 flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-[#081621] shadow-sm"
          >
            <Filter size={16} />
            {mobileFiltersOpen ? 'Hide Filters' : 'Show Filters'}
          </button>

          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            {/* Filters Sidebar */}
            <motion.aside 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={`w-full lg:w-64 shrink-0 ${mobileFiltersOpen ? 'block' : 'hidden lg:block'}`}
            >
              <div className="max-h-[65vh] overflow-y-auto bg-white p-4 sm:p-5 rounded-md shadow-sm border border-gray-200 lg:max-h-none lg:overflow-visible lg:sticky lg:top-24">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                  <Filter size={18} className="text-[#081621]" />
                    <h2 className="font-bold text-[15px] text-[#081621] flex-1">Filter Options</h2>
                    <button onClick={clearFilters} className="text-xs bg-orange-50 text-[#F97316] px-3 py-1 rounded-full font-bold hover:bg-orange-100 transition-colors">Clear</button>
                </div>

                
                  {availableSubCategories.length > 0 && (
                    <div className="mb-6 border-b border-gray-100 pb-6">
                      <h3 className="text-xs font-bold text-gray-800 mb-3 tracking-wide">CATEGORIES</h3>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                        {availableSubCategories.map(sub => (
                          <Link 
                            key={sub} 
                            to={`/category/${categorySlug}${subCategorySlug ? `/${subCategorySlug}/${sub}` : `/${sub}`}`}
                            className="block text-[13px] text-gray-600 hover:text-[#F97316] hover:bg-orange-50 px-2 py-1.5 rounded transition-colors truncate"
                          >
                            {sub.replace(/-/g, ' ')}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-800 mb-3 tracking-wide flex justify-between items-center">
                      PRICE RANGE
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="relative w-full">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">৳</span>
                        <input 
                          type="number" 
                          value={priceRange.min}
                          onChange={e => setPriceRange({ ...priceRange, min: parseInt(e.target.value) || 0 })}
                          className="w-full pl-7 pr-2 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none transition-all shadow-inner"
                          placeholder="Min"
                        />
                      </div>
                      <span className="text-gray-300 font-black">-</span>
                      <div className="relative w-full">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">৳</span>
                        <input 
                          type="number" 
                          value={priceRange.max}
                          onChange={e => setPriceRange({ ...priceRange, max: parseInt(e.target.value) || 0 })}
                          className="w-full pl-7 pr-2 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none transition-all shadow-inner"
                          placeholder="Max"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-gray-800 mb-3 tracking-wide">BRANDS</h3>
                  {availableBrands.length > 0 ? (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      {availableBrands.map(brand => (
                        <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={selectedBrands.includes(brand)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedBrands([...selectedBrands, brand]);
                              else setSelectedBrands(selectedBrands.filter(b => b !== brand));
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-[#F97316] focus:ring-[#F97316] transition-all cursor-pointer bg-white accent-[#F97316]" 
                          />
                          <span className="text-[13px] text-gray-600 group-hover:text-[#F97316] transition-colors capitalize">{brand}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No brands available</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-800 mb-3 tracking-wide">STOCK STATUS</h3>
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={showInStock}
                        onChange={e => setShowInStock(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-[#F97316] focus:ring-[#F97316] transition-all cursor-pointer bg-white accent-[#F97316]" 
                      />
                      <span className="text-[13px] text-gray-600 group-hover:text-[#F97316] transition-colors">In Stock</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={showOutOfStock}
                        onChange={e => setShowOutOfStock(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-[#F97316] focus:ring-[#F97316] transition-all cursor-pointer bg-white accent-[#F97316]" 
                      />
                      <span className="text-[13px] text-gray-600 group-hover:text-[#F97316] transition-colors">Out of Stock</span>
                    </label>
                  </div>
                </div>

                {Object.entries(availableSpecs).map(([specName, specValues]) => (
                  <div key={specName} className="pt-6 mt-6 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-gray-800 mb-3 tracking-wide flex items-center justify-between">
                      {specName}
                    </h3>
                    <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      {specValues.map(val => (
                        <label key={val} className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-[#F97316] focus:ring-[#F97316] transition-all cursor-pointer bg-white accent-[#F97316]"
                            checked={selectedSpecs[specName]?.includes(val) || false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedSpecs(prev => {
                                const current = prev[specName] || [];
                                if (checked) {
                                  return { ...prev, [specName]: [...current, val] };
                                } else {
                                  const updated = current.filter(v => v !== val);
                                  if (updated.length === 0) {
                                    const next = { ...prev };
                                    delete next[specName];
                                    return next;
                                  }
                                  return { ...prev, [specName]: updated };
                                }
                              });
                            }}
                          />
                          <span className="text-[13px] text-gray-600 group-hover:text-[#F97316] transition-colors">{val}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

              </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-grow min-w-0">
              <div className="bg-white p-3 sm:p-4 rounded-md shadow-sm border border-gray-200 mb-4 sm:mb-6 flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between items-center">
                <div className="relative w-full sm:w-64">
                  <input 
                    type="text" 
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Search in this category..."
                    className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-[13px] focus:border-[#F97316] focus:ring-0 outline-none transition-all"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-[13px] font-medium text-gray-500 whitespace-nowrap">
                    {filteredProducts.length} results
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-gray-500">Sort By:</span>
                    <select 
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                      className="text-[13px] font-medium text-[#081621] border border-gray-200 bg-gray-50 rounded focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] py-1 pl-3 pr-8 cursor-pointer outline-none transition-all"
                    >
                      <option value="newest">Newest First</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                    </select>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-md h-80 animate-pulse border border-gray-200"></div>
                  ))}
                </div>
              ) : paginatedProducts.length > 0 ? (
                <>
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 mb-10"
                  >
                    {paginatedProducts.map(product => (
                      <motion.div key={product.id} variants={itemVariants}>
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </motion.div>
                  
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-8">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-200 rounded-md text-[13px] font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={cn(
                              "w-8 h-8 rounded-md flex items-center justify-center text-[13px] font-bold transition-colors",
                              currentPage === i + 1 
                                ? "bg-[#F97316] text-white border border-[#F97316]" 
                                : "text-gray-600 hover:bg-gray-100 border border-transparent"
                            )}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>

                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-200 rounded-md text-[13px] font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-md border border-gray-200 p-12 text-center shadow-sm">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                    <Filter size={32} className="text-gray-300" />
                  </div>
                  <h3 className="text-lg font-bold text-[#081621] mb-2">No components found</h3>
                  <p className="text-gray-500 text-sm font-medium">Try adjusting your filters or search criteria.</p>
                </div>
              )}

              {/* Recently Viewed Section */}
              <RecentlyViewedSection />
            </main>
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
    <div className="mt-16 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-xl font-bold text-[#081621]">Recently Viewed</h3>
        <div className="h-px bg-gray-200 flex-grow"></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-4">
        {recentlyViewed.slice(0, 4).map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};
