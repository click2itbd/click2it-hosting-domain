import React, { useState, useMemo } from 'react';
import { Product } from '../../types';
import { BuilderCategory } from './constants';
import { getCompatibility } from './utils';
import { formatCurrency, cn } from '../../lib/utils';
import { X, Search, AlertTriangle, CheckCircle2, Filter, ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BuilderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: BuilderCategory | null;
  products: Product[];
  selectedComponents: Record<string, Product>;
  onSelect: (product: Product) => void;
}

type SortOption = 'default' | 'price_asc' | 'price_desc';

export const BuilderSelectionModal: React.FC<BuilderSelectionModalProps> = ({
  isOpen,
  onClose,
  category,
  products,
  selectedComponents,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedSocket, setSelectedSocket] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOption>('default');

  const { filteredProducts, availableBrands, availableSockets } = useMemo(() => {
    if (!category) return { filteredProducts: [], availableBrands: [], availableSockets: [] };
    
    // Normalize string by removing spaces and dashes for lenient matching
    const normalize = (str: string) => str.toLowerCase().replace(/[- ]/g, '');
    const catIdNorm = normalize(category.id);
    const catNameNorm = normalize(category.name || '');

    let baseList = products.filter(p => {
      const pCatNorm = normalize(p.category);
      const pNameNorm = normalize(p.name);
      
      const matchesCat = pCatNorm.includes(catIdNorm) || pCatNorm.includes(catNameNorm) || 
                         pNameNorm.includes(catIdNorm) || pNameNorm.includes(catNameNorm) ||
                         // Special case: 'gpu' for 'graphics-card', 'psu' for 'power-supply'
                         (catIdNorm === 'graphicscard' && (pCatNorm.includes('gpu') || pNameNorm.includes('gpu'))) ||
                         (catIdNorm === 'powersupply' && (pCatNorm.includes('psu') || pNameNorm.includes('psu'))) ||
                         (catIdNorm === 'cpu' && (pCatNorm.includes('processor') || pNameNorm.includes('processor')));
                         
      return matchesCat;
    });

    // Extract dynamic filters from the base list before applying user filters
    const brands = Array.from(new Set(baseList.map(p => p.brand).filter(Boolean))) as string[];
    const sockets = Array.from(new Set(baseList.map(p => p.socketType || p.ramType).filter(Boolean))) as string[];

    // 1. Search Filter
    if (searchQuery) {
      baseList = baseList.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // 2. Brand Filter
    if (selectedBrand !== 'all') {
      baseList = baseList.filter(p => p.brand === selectedBrand);
    }

    // 3. Socket/RAM Filter
    if (selectedSocket !== 'all') {
      baseList = baseList.filter(p => p.socketType === selectedSocket || p.ramType === selectedSocket);
    }

    // 4. Sort
    if (sortOrder === 'price_asc') {
      baseList.sort((a, b) => a.price - b.price);
    } else if (sortOrder === 'price_desc') {
      baseList.sort((a, b) => b.price - a.price);
    }

    return { filteredProducts: baseList, availableBrands: brands, availableSockets: sockets };
  }, [products, category, searchQuery, selectedBrand, selectedSocket, sortOrder]);

  if (!isOpen || !category) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative bg-white rounded-[2rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_20px_60px_rgba(15,23,42,0.15)]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Select {category.name}</h2>
            <p className="text-sm text-slate-500 mt-1">Choose a component for your build</p>
          </div>
          <button 
            onClick={onClose} 
            className="h-10 w-10 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar (Search + Filter Toggle) */}
        <div className="p-4 sm:px-8 border-b border-slate-100 bg-slate-50/50 shrink-0 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200/80 rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border transition-colors shadow-sm",
                showFilters || selectedBrand !== 'all' || selectedSocket !== 'all' 
                  ? "bg-violet-50 text-violet-700 border-violet-200" 
                  : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50"
              )}
            >
              <Filter size={16} /> Filters
            </button>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOption)}
              className="appearance-none bg-white border border-slate-200/80 text-slate-600 text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:border-violet-500 cursor-pointer shadow-sm"
            >
              <option value="default">Sort by</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Expanded Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-slate-100 bg-white overflow-hidden shrink-0"
            >
              <div className="p-4 sm:px-8 flex flex-wrap gap-6">
                {availableBrands.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Brand</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedBrand('all')}
                        className={cn("px-3 py-1.5 rounded-xl text-xs font-bold transition-colors", selectedBrand === 'all' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
                      >
                        All Brands
                      </button>
                      {availableBrands.map(brand => (
                        <button
                          key={brand}
                          onClick={() => setSelectedBrand(brand)}
                          className={cn("px-3 py-1.5 rounded-xl text-xs font-bold transition-colors", selectedBrand === brand ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {availableSockets.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Socket / Type</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedSocket('all')}
                        className={cn("px-3 py-1.5 rounded-xl text-xs font-bold transition-colors", selectedSocket === 'all' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
                      >
                        All Types
                      </button>
                      {availableSockets.map(socket => (
                        <button
                          key={socket}
                          onClick={() => setSelectedSocket(socket)}
                          className={cn("px-3 py-1.5 rounded-xl text-xs font-bold transition-colors", selectedSocket === socket ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
                        >
                          {socket}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product List */}
        <div className="flex-grow overflow-y-auto p-6 sm:p-8 bg-slate-50/50 custom-scrollbar">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Search size={32} className="text-slate-300" />
              </div>
              <p className="font-medium">No components found matching your filters.</p>
              {(selectedBrand !== 'all' || selectedSocket !== 'all' || searchQuery) && (
                <button 
                  onClick={() => { setSearchQuery(''); setSelectedBrand('all'); setSelectedSocket('all'); }}
                  className="text-violet-600 font-bold hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <motion.div 
              initial="hidden" 
              animate="show" 
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-5"
            >
              {filteredProducts.map(product => {
                const { isCompatible, reason } = getCompatibility(category.id, product, selectedComponents);
                const isSelected = selectedComponents[category.id]?.id === product.id;

                return (
                  <motion.div 
                    variants={{
                      hidden: { opacity: 0, scale: 0.95 },
                      show: { opacity: 1, scale: 1 }
                    }}
                    whileHover={{ y: -4 }}
                    key={product.id} 
                    className={cn(
                    "bg-white border rounded-3xl p-5 flex gap-5 transition-all group hover:shadow-[0_8px_30px_rgba(15,23,42,0.06)]",
                    product.stock <= 0 ? "opacity-60 grayscale-[0.5]" : "",
                    isSelected ? "border-violet-300 ring-1 ring-violet-200 shadow-sm" : isCompatible ? "border-slate-200 hover:border-slate-300" : "border-red-200 bg-red-50/30"
                  )}>
                    <div className="h-24 w-24 bg-slate-50 rounded-2xl p-3 shrink-0 flex items-center justify-center">
                      <img src={product.images?.[0] || '/placeholder.png'} alt="" className="w-full h-full object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                    </div>
                    
                    <div className="flex-grow flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug">{product.name}</h4>
                          {isSelected && <CheckCircle2 className="text-violet-600 shrink-0" size={20} />}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <p className="text-lg font-black text-slate-900">{formatCurrency(product.price)}</p>
                          {product.socketType && <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">{product.socketType}</span>}
                          {product.ramType && <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">{product.ramType}</span>}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {!isCompatible ? (
                          <div className="flex-grow flex items-start gap-1.5 text-[11px] text-red-600 font-medium bg-red-50 px-3 py-2 rounded-xl">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{reason}</span>
                          </div>
                        ) : product.stock <= 0 ? (
                           <div className="flex-grow flex items-center gap-1.5 text-[11px] text-amber-600 font-medium bg-amber-50 px-3 py-2 rounded-xl">
                            <AlertTriangle size={14} className="shrink-0" />
                            <span>Out of Stock</span>
                          </div>
                        ) : (
                          <div className="flex-grow"></div>
                        )}

                        {product.stock <= 0 ? (
                          <button
                            onClick={() => {
                              // Find Alternative Logic
                              const alt = products.find(p => 
                                p.category.toLowerCase().includes(category.id.toLowerCase()) && 
                                p.id !== product.id && 
                                p.stock > 0 &&
                                getCompatibility(category.id, p, selectedComponents).isCompatible &&
                                Math.abs(p.price - product.price) < (product.price * 0.2) // Within 20% price range
                              );
                              if (alt) {
                                onSelect(alt);
                                onClose();
                              } else {
                                alert("No exact alternative found in stock.");
                              }
                            }}
                            className="px-4 py-2 text-sm font-bold rounded-xl transition-all shrink-0 bg-amber-100 text-amber-700 hover:bg-amber-200"
                          >
                            Find Alternative
                          </button>
                        ) : (
                          <button
                            disabled={!isCompatible}
                            onClick={() => {
                              onSelect(product);
                              onClose();
                            }}
                            className={cn(
                              "px-5 py-2.5 text-sm font-bold rounded-xl transition-all shrink-0 flex items-center justify-center",
                              isSelected ? "bg-violet-600 text-white shadow-md shadow-violet-600/20" : isCompatible 
                                ? "bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white" 
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            )}
                          >
                            {isSelected ? 'Selected' : isCompatible ? 'Select' : 'Incompatible'}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
