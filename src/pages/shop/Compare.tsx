import React from 'react';
import { useCompare } from '../../context/CompareContext';
import { Layout } from '../../components/Layout';
import { useCart } from '../../context/CartContext';
import { formatCurrency, cn, formatWarranty } from '../../lib/utils';
import { useState } from 'react';
import { X, ShoppingCart, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEO } from '../../components/SEO';

export const ComparePage: React.FC = () => {
  const { compareItems, removeFromCompare, clearCompare } = useCompare();
  const { addToCart } = useCart();
  const [highlightDiff, setHighlightDiff] = useState(false);
  const [hideSimilar, setHideSimilar] = useState(false);
  const [collapsedMobileProducts, setCollapsedMobileProducts] = useState<string[]>([]);
  const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table'>('table');

  const isDifferent = (key, isBasic) => {
    if (compareItems.length <= 1) return false;
    const values = compareItems.map(p => {
      if (isBasic) {
        if (key === 'stock') return p.stock > 0 ? 'instock' : 'outofstock';
        if (key === 'warrantyMonths') return formatWarranty(p.warrantyMonths, p.warrantyUnit).toLowerCase();
        return String(p[key] || '').toLowerCase();
      }
      return String(p.specs?.[key] || '').toLowerCase();
    });
    return !values.every(v => v === values[0]);
  };


  if (compareItems.length === 0) {
    return (
      <Layout>
        <SEO
          title="Compare Products & Tech Specs | CLICK2IT"
          description="Compare laptops, PC components, and gadgets side-by-side. Check detailed specifications, prices, and features to make the best buying decision at CLICK2IT."
          canonical="https://click2itbd.com/compare"
        />
        <div className="bg-gray-50 min-h-[60vh] flex flex-col items-center justify-center p-4">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-200">
            <GitCompareIcon size={48} className="text-gray-300" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#081621] mb-3 text-center">No Products to Compare</h1>
          <p className="max-w-md text-center text-gray-500 mb-8 font-medium">Add products from our catalog to compare their specifications side-by-side.</p>
          <Link to="/shop" className="inline-flex items-center justify-center gap-2 bg-[#F97316] text-white px-8 py-3.5 rounded-md font-bold hover:bg-[#e06612] transition-colors shadow-sm">
            Browse Products
          </Link>
        </div>
      </Layout>
    );
  }

  // Get all unique spec keys across all compare items from the 'specs' field
  const allSpecKeys = Array.from(new Set(compareItems.flatMap(item => 
    item.specs ? Object.keys(item.specs) : []
  )));

  const mainSpecLabels = [
    { key: 'brand', label: 'Brand' },
    { key: 'category', label: 'Category' },
    { key: 'stock', label: 'Stock Status' },
    { key: 'warrantyMonths', label: 'Warranty' }
  ];

  return (
    <Layout>
      <SEO
        title="Compare Products & Tech Specs | CLICK2IT"
        description="Compare laptops, PC components, and gadgets side-by-side. Check detailed specifications, prices, and features to make the best buying decision at CLICK2IT."
        canonical="https://click2itbd.com/compare"
      />
      <div className="bg-gray-50 min-h-screen py-4 sm:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
            <Link to="/" className="hover:text-[#F97316]">Home</Link>
            <ChevronRight size={14} />
            <span className="text-gray-800 font-bold">Compare</span>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 sm:mb-6 gap-4 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100"
          >
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-orange-50 text-[#F97316] rounded-xl flex items-center justify-center">
                  <GitCompareIcon size={20} />
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-[#081621]">Product Comparison</h1>
              </div>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">Comparing {compareItems.length} selected products side-by-side</p>
            </div>
            
            <div className="flex w-full lg:w-auto flex-wrap items-center gap-2 sm:gap-3">
              {/* Mobile View Toggle */}
              <div className="lg:hidden flex items-center bg-gray-100 p-1 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
                <button
                  type="button"
                  onClick={() => setMobileViewMode('table')}
                  className={cn(
                    "flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-center",
                    mobileViewMode === 'table' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Side-by-Side Table
                </button>
                <button
                  type="button"
                  onClick={() => setMobileViewMode('cards')}
                  className={cn(
                    "flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-center",
                    mobileViewMode === 'cards' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Card View
                </button>
              </div>

              <label className="flex min-h-10 flex-1 sm:flex-none items-center gap-2 cursor-pointer text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors">
                <input type="checkbox" checked={highlightDiff} onChange={e => setHighlightDiff(e.target.checked)} className="rounded text-[#F97316] focus:ring-[#F97316]" />
                <span className="whitespace-nowrap">Highlight Diff</span>
              </label>
              <label className="flex min-h-10 flex-1 sm:flex-none items-center gap-2 cursor-pointer text-xs sm:text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors">
                <input type="checkbox" checked={hideSimilar} onChange={e => setHideSimilar(e.target.checked)} className="rounded text-[#F97316] focus:ring-[#F97316]" />
                <span className="whitespace-nowrap">Hide Similar</span>
              </label>
              <button 
                onClick={clearCompare}
                className="min-h-10 text-xs sm:text-sm text-red-500 hover:text-white border border-red-200 hover:bg-red-500 hover:border-red-500 font-bold transition-all px-4 py-2 rounded-xl shrink-0"
              >
                Clear All
              </button>
            </div>
          </motion.div>

          {/* Mobile Card View */}
          {mobileViewMode === 'cards' && (
            <div className="lg:hidden space-y-4 mb-8">
              {compareItems.map(product => {
                const isExpanded = !collapsedMobileProducts.includes(product.id);
                const rows = [
                  ...mainSpecLabels.map(spec => ({
                    key: spec.key,
                    label: spec.label,
                    value: spec.key === 'stock'
                      ? product.stock > 0 ? 'In Stock' : 'Out of Stock'
                      : spec.key === 'warrantyMonths'
                        ? product.warrantyMonths ? formatWarranty(product.warrantyMonths, product.warrantyUnit) : 'No Warranty'
                        : product[spec.key] || '-',
                    different: isDifferent(spec.key, true),
                  })),
                  ...allSpecKeys.map(specKey => ({
                    key: specKey,
                    label: specKey,
                    value: product.specs?.[specKey] || '-',
                    different: isDifferent(specKey, false),
                  })),
                ].filter(row => !hideSimilar || row.different);

                return (
                  <article key={product.id} className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-xs">
                    <div className="flex gap-3.5 p-3.5 sm:p-4">
                      <Link to={`/product/${product.id}`} className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 p-2">
                        <img
                          src={product.images?.[0] || undefined}
                          alt={product.name}
                          className="max-h-full max-w-full object-contain mix-blend-multiply"
                        />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <Link to={`/product/${product.id}`} className="line-clamp-2 text-sm font-bold leading-snug text-[#081621] hover:text-[#F97316]">
                            {product.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeFromCompare(product.id)}
                            aria-label={`Remove ${product.name} from comparison`}
                            className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          >
                            <X size={17} />
                          </button>
                        </div>
                        <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                          {product.discountPrice ? (
                            <>
                              <span className="text-base font-black text-[#EF4444]">{formatCurrency(product.discountPrice)}</span>
                              <span className="text-xs font-medium text-gray-400 line-through">{formatCurrency(product.price)}</span>
                            </>
                          ) : (
                            <span className="text-base font-black text-[#EF4444]">{formatCurrency(product.price)}</span>
                          )}
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            onClick={() => setCollapsedMobileProducts(current =>
                              current.includes(product.id)
                                ? current.filter(id => id !== product.id)
                                : [...current, product.id]
                            )}
                            className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-gray-600 hover:text-[#F97316]"
                          >
                            {isExpanded ? 'Hide specs' : 'View specs'}
                            <ChevronDown size={15} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => addToCart(product)}
                            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[#081621] px-3.5 text-xs font-bold text-white transition-colors hover:bg-[#F97316]"
                          >
                            <ShoppingCart size={14} /> Add to Cart
                          </button>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <dl className="border-t border-gray-100">
                        {rows.map(row => (
                          <div
                            key={row.key}
                            className={cn(
                              "grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 border-b border-gray-100 px-3.5 py-2.5 text-xs last:border-b-0 sm:px-4",
                              row.different && highlightDiff ? "bg-amber-50/70" : "bg-white"
                            )}
                          >
                            <dt className="font-bold text-gray-500">{row.label}</dt>
                            <dd className="break-words text-right font-medium text-gray-800">
                              {row.key === 'stock'
                                ? <span className={product.stock > 0 ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{row.value}</span>
                                : row.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* Side-by-Side Comparison Table (Available on desktop and on mobile when table mode is selected) */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "overflow-x-auto pb-4 custom-scrollbar",
              mobileViewMode === 'cards' ? "hidden lg:block" : "block"
            )}
          >
            <div className="min-w-[680px] sm:min-w-[800px] lg:min-w-[900px] bg-white rounded-2xl shadow-sm border border-gray-200 flex overflow-hidden">
              
              {/* Labels Column (Sticky on Horizontal Scroll) */}
              <div className="w-[140px] sm:w-[180px] lg:w-[220px] shrink-0 bg-gray-50 border-r border-gray-200 sticky left-0 z-20 shadow-xs">
                <div className="h-[320px] sm:h-[360px] border-b border-gray-200 flex flex-col justify-center px-4 sm:px-6 bg-white">
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold text-[#081621]">Product Details</h3>
                </div>
                
                <div className="p-4 border-b border-gray-200 min-h-[64px] flex items-center bg-gray-50">
                  <span className="font-bold text-gray-700 text-sm">Price</span>
                </div>
                
                {/* Basic Details */}
                {mainSpecLabels.map(spec => {
                  const diff = isDifferent(spec.key, true);
                  if (hideSimilar && !diff) return null;
                  return (
                    <div key={spec.key} className={cn("px-6 py-4 border-b border-gray-200 min-h-[64px] flex items-center transition-colors", diff && highlightDiff ? "bg-yellow-50/80" : "bg-gray-50")}>
                      <span className="font-bold text-gray-700 text-sm">{spec.label}</span>
                    </div>
                  );
                })}

                {/* Dynamic Technical Specs */}
                {allSpecKeys.length > 0 && (
                  <>
                    <div className="p-4 border-b border-gray-200 bg-[#081621] text-white">
                      <span className="font-bold text-sm tracking-wider uppercase">Technical Specs</span>
                    </div>
                    {allSpecKeys.map(specKey => {
                      const diff = isDifferent(specKey, false);
                      if (hideSimilar && !diff) return null;
                      return (
                        <div key={specKey} className={cn("px-6 py-4 border-b border-gray-200 min-h-[64px] flex items-center transition-colors", diff && highlightDiff ? "bg-yellow-50/80" : "bg-gray-50")}>
                          <span className="font-bold text-gray-700 text-sm">{specKey}</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Products Columns */}
              {compareItems.map((product, idx) => (
                <div key={product.id} className={cn(
                  "flex-1 min-w-[240px] group transition-colors relative",
                  idx !== compareItems.length - 1 && "border-r border-gray-200"
                )}>
                  {/* Top Card Area */}
                  <div className="h-[320px] sm:h-[360px] p-4 sm:p-6 border-b border-gray-200 flex flex-col items-center text-center relative bg-white transition-colors">
                    <button 
                      onClick={() => removeFromCompare(product.id)}
                      className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                      title="Remove from comparison"
                    >
                      <X size={18} />
                    </button>
                    
                    <div className="h-40 w-full mb-4 flex items-center justify-center p-2">
                      <img 
                        src={product.images?.[0] || undefined} 
                        alt={product.name} 
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                      />
                    </div>
                    
                    <Link to={`/product/${product.id}`} className="font-bold text-[#081621] hover:text-[#F97316] transition-colors line-clamp-3 mb-4 text-sm leading-tight px-2">
                      {product.name}
                    </Link>
                    
                    <button 
                      onClick={() => addToCart(product)}
                      className="mt-auto w-full bg-[#F2F4F8] text-[#081621] hover:bg-[#F97316] hover:text-white py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <ShoppingCart size={16} /> Add to Cart
                    </button>
                  </div>
                  
                  {/* Price Row */}
                  <div className="p-4 border-b border-gray-200 min-h-[64px] flex items-center justify-center bg-white text-center">
                    <span className="text-lg font-black text-[#EF4444]">
                      {product.discountPrice ? (
                        <div className="flex flex-col items-center">
                          <span className="text-sm line-through text-gray-400 font-bold">{formatCurrency(product.price)}</span>
                          <span>{formatCurrency(product.discountPrice)}</span>
                        </div>
                      ) : formatCurrency(product.price)}
                    </span>
                  </div>
                  
                  {/* Basic Details Rows */}
                  {(!hideSimilar || isDifferent('brand', true)) && (
                    <div className={cn("p-4 border-b border-gray-200 min-h-[64px] flex items-center justify-center text-gray-700 text-sm text-center transition-colors", isDifferent('brand', true) && highlightDiff ? "bg-yellow-50/50" : "bg-white")}>
                      <span className="font-bold capitalize">{product.brand || '-'}</span>
                    </div>
                  )}
                  {(!hideSimilar || isDifferent('category', true)) && (
                    <div className={cn("p-4 border-b border-gray-200 min-h-[64px] flex items-center justify-center text-gray-700 text-sm text-center transition-colors", isDifferent('category', true) && highlightDiff ? "bg-yellow-50/50" : "bg-white")}>
                      <span className="uppercase tracking-wider text-xs font-bold">{product.category || '-'}</span>
                    </div>
                  )}
                  {(!hideSimilar || isDifferent('stock', true)) && (
                    <div className={cn("p-4 border-b border-gray-200 min-h-[64px] flex items-center justify-center text-sm text-center transition-colors", isDifferent('stock', true) && highlightDiff ? "bg-yellow-50/50" : "bg-white")}>
                      {product.stock > 0 
                        ? <span className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full">In Stock</span> 
                        : <span className="text-red-500 font-bold bg-red-50 px-3 py-1 rounded-full">Out of Stock</span>
                      }
                    </div>
                  )}
                  {(!hideSimilar || isDifferent('warrantyMonths', true)) && (
                    <div className={cn("p-4 border-b border-gray-200 min-h-[64px] flex items-center justify-center text-gray-700 text-sm text-center transition-colors", isDifferent('warrantyMonths', true) && highlightDiff ? "bg-yellow-50/50" : "bg-white")}>
                      <span className="font-medium">{product.warrantyMonths ? `${formatWarranty(product.warrantyMonths, product.warrantyUnit)}` : 'No Warranty'}</span>
                    </div>
                  )}

                  {/* Dynamic Technical Specs Rows */}
                  {allSpecKeys.length > 0 && (
                    <>
                      <div className="p-4 border-b border-gray-200 min-h-[53px] bg-white"></div>
                      {allSpecKeys.map(specKey => {
                        const val = product.specs?.[specKey];
                        const diff = isDifferent(specKey, false);
                        if (hideSimilar && !diff) return null;
                        return (
                          <div key={specKey} className={cn("px-4 py-4 border-b border-gray-200 min-h-[64px] flex items-center justify-center text-center transition-colors", diff && highlightDiff ? "bg-yellow-50/50" : "bg-white")}>
                            <span className={cn(
                              "text-sm font-medium",
                              val ? "text-gray-800" : "text-gray-300"
                            )}>
                              {val || '-'}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

// Simple GitCompare Icon since it was omitted
const GitCompareIcon = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="16 3 21 3 21 8"></polyline>
    <line x1="4" y1="20" x2="21" y2="3"></line>
    <polyline points="21 16 21 21 16 21"></polyline>
    <line x1="15" y1="15" x2="21" y2="21"></line>
    <line x1="4" y1="4" x2="9" y2="9"></line>
  </svg>
);
