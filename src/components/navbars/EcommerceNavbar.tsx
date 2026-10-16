import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X, LogOut, LayoutDashboard, ChevronDown, ChevronRight, Cpu, Server, CalendarDays, GitCompare, Heart, Trash2 , Camera } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCompare } from '../../context/CompareContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { auth, db } from '../../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, orderBy, limit, doc, setDoc, increment } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { NavigationMenu, Product, SubCategory } from '../../types';
import { setSiteContext } from '../../hooks/useSiteContext';

export const EcommerceNavbar: React.FC = () => {
    const { items } = useCart();
  const { compareItems } = useCompare();
  const { wishlist } = useWishlist();
  const { user, canAccessAdmin } = useAuth();
  const { settings } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [mobileCategorySearch, setMobileCategorySearch] = useState('');
  const [expandedMobileCategories, setExpandedMobileCategories] = useState<string[]>([]);
  const [expandedMobileSubCategories, setExpandedMobileSubCategories] = useState<string[]>([]);
  const [menus, setMenus] = useState<NavigationMenu[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const navigate = useNavigate();
  const saveSearch = (query: string) => {
    if(!query.trim()) return;
    const updated = [query, ...recentSearches.filter(q => q !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchFocused(false);
      saveSearch(searchQuery.trim());
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  useEffect(() => {
    // Mark that the user is in the e-commerce context
    setSiteContext('ecommerce');
    const fetchMenus = async () => {
      try {
        const q = query(collection(db, 'menus'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        setMenus(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as NavigationMenu[]);
      } catch (error) {
        console.error('Error fetching menus:', error);
      }
    };
    fetchMenus();
    const fetchProducts = async () => {
      try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const active = snap.docs.map(d => ({id: d.id, ...d.data()})) as Product[];
        setProducts(active);
        setTrendingProducts(active.slice(0, 5));
      } catch(err) {
        console.error(err);
      }
    };
    fetchProducts();
    
    const saved = localStorage.getItem('recentSearches');
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const pcBuilderCategories = [
    { id: 'cpu', name: 'CPU', slug: 'cpu' },
    { id: 'cooler', name: 'CPU Cooler', slug: 'cpu-cooler' },
    { id: 'motherboard', name: 'Motherboard', slug: 'motherboard' },
    { id: 'ram', name: 'RAM', slug: 'ram' },
    { id: 'storage', name: 'Storage', slug: 'storage' },
    { id: 'gpu', name: 'Graphics Card', slug: 'graphics-card' },
    { id: 'psu', name: 'Power Supply', slug: 'power-supply' },
    { id: 'casing', name: 'Casing', slug: 'casing' },
    { id: 'monitor', name: 'Monitor', slug: 'monitor' },
    { id: 'casing_cooler', name: 'Casing Cooler', slug: 'casing-cooler' },
    { id: 'keyboard', name: 'Keyboard', slug: 'keyboard' },
    { id: 'mouse', name: 'Mouse', slug: 'mouse' },
    { id: 'speaker', name: 'Speaker & Home Theater', slug: 'speaker' },
    { id: 'headphone', name: 'Headphone', slug: 'headphone' },
    { id: 'wifi', name: 'Wifi Adapter / LAN Card', slug: 'wifi-adapter' },
    { id: 'antivirus', name: 'Anti Virus', slug: 'anti-virus' },
    { id: 'ups', name: 'UPS', slug: 'ups' }
  ];
  const mobileCategoryQuery = mobileCategorySearch.trim().toLowerCase();
  const mobileMenus = menus
    .filter(menu => menu.name.toLowerCase() !== 'hosting')
    .map(menu => {
      const menuMatches = menu.name.toLowerCase().includes(mobileCategoryQuery);
      const subCategories = (menu.subCategories || []).filter(sub =>
        !mobileCategoryQuery ||
        (!menuMatches &&
          (sub.name.toLowerCase().includes(mobileCategoryQuery) ||
            sub.subCategories?.some(subSub => subSub.name.toLowerCase().includes(mobileCategoryQuery))))
      );
      return { menu, subCategories, menuMatches };
    })
    .filter(({ menu, subCategories }) =>
      !mobileCategoryQuery || menu.name.toLowerCase().includes(mobileCategoryQuery) || subCategories.length > 0
    );

  return (
    <header className="sticky top-0 z-50 w-full shadow-md bg-black">
      <div className="hidden lg:block bg-[#111] text-gray-300 text-xs py-1.5 border-b border-gray-800">
        <div className="w-full max-w-[1440px] mx-auto px-2 sm:px-4 md:px-[50px] flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><span className="text-[#F97316]">Phone:</span> {settings.contactPhone}</span>
            <span className="flex items-center gap-1"><span className="text-[#F97316]">Email:</span> {settings.contactEmail}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/used-items" className="hover:text-[#F97316] transition-colors font-bold text-green-400">Pre-Owned</Link>
              <Link to="/track-order" className="hover:text-[#F97316] transition-colors">Track Order</Link>
            <Link to="/blog" className="hover:text-[#F97316] transition-colors">Blog</Link>
            <Link to="/about" className="hover:text-[#F97316] transition-colors">About Us</Link>
            <Link to="/contact" className="hover:text-[#F97316] transition-colors">Contact</Link>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1440px] mx-auto px-2 sm:px-4 md:px-[50px]">
        <div className="flex py-3 items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <Link to="/shop" className="flex items-center gap-2 shrink-0">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.brandName} className="h-10 w-auto max-w-[135px] sm:max-w-[180px]" referrerPolicy="no-referrer" />
            ) : (
              <img src="/logo.png" alt={settings.brandName || "Click2IT BD"} className="h-10 md:h-12 w-auto max-w-[135px] sm:max-w-[180px] object-contain" />
            )}
          </Link>

          {/* Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-2xl relative">
            <form onSubmit={handleSearch} className="flex w-full items-center bg-[#333333] rounded-full overflow-hidden border border-[#444] focus-within:border-gray-400 transition-all px-4">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full border-none bg-transparent py-2.5 px-3 focus:outline-none focus:ring-0 text-white placeholder-gray-400 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              />
            </form>
            {isSearchFocused && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-[850px] mt-3 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex overflow-hidden text-left" style={{ minHeight: '400px', maxHeight: '550px' }}>
                {/* Left Sidebar */}
                <div className="w-[30%] bg-white border-r border-gray-100 p-6 overflow-y-auto">
                  {recentSearches.length > 0 && (
                    <div className="mb-8">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 text-[15px]">Recent Searches</h3>
                        <button onMouseDown={(e) => { e.preventDefault(); clearRecentSearches(); }} className="text-gray-500 hover:text-red-500 text-xs flex items-center gap-1 font-medium">
                          <Trash2 size={14} /> Clear
                        </button>
                      </div>
                      <ul className="space-y-3">
                        {recentSearches.map(rs => (
                          <li key={rs}>
                            <button
                              onMouseDown={(e) => { e.preventDefault(); setSearchQuery(rs); saveSearch(rs); navigate(`/search?q=${encodeURIComponent(rs)}`); setIsSearchFocused(false); }}
                              className="text-gray-500 hover:text-gray-900 text-sm text-left w-full truncate transition-colors"
                            >
                              {rs}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="font-bold text-gray-800 text-[15px] mb-4">Trending Search</h3>
                    <ul className="space-y-3">
                      {['S25 Ultra', 'OnePlus Buds 4', 'Z Fold7', '16 Pro Max', 'Gaming Mouse'].map(ts => (
                        <li key={ts}>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); setSearchQuery(ts); saveSearch(ts); navigate(`/search?q=${encodeURIComponent(ts)}`); setIsSearchFocused(false); }}
                            className="text-gray-500 hover:text-gray-900 text-sm text-left w-full truncate transition-colors"
                          >
                            {ts}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Right Content */}
                <div className="w-[70%] p-6 overflow-y-auto bg-[#fcfcfc] custom-scrollbar">
                  {searchQuery.trim().length === 0 ? (
                    <>
                      <h3 className="font-bold text-gray-800 mb-5 text-[15px]">Trending Products</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {trendingProducts?.slice(0, 6).map(p => {
                          const price = p.discountPrice || p.price;
                          const oldPrice = p.discountPrice ? p.price : null;
                          const discount = oldPrice ? oldPrice - price : 0;
                          return (
                            <Link
                              key={p.id}
                              to={`/product/${p.id}`}
                              onMouseDown={(e) => { e.preventDefault(); if(searchQuery) saveSearch(searchQuery); navigate(`/product/${p.id}`); setIsSearchFocused(false); }}
                              className="border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-all group flex flex-col h-full bg-white relative"
                            >
                              <div className="aspect-square bg-white rounded-xl flex items-center justify-center p-2 mb-4">
                                <img src={p.images?.[0] || '/placeholder.png'} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                              </div>
                              <p className="text-[14px] font-bold text-gray-800 line-clamp-2 mb-3 flex-grow">{p.name}</p>
                              <div className="mt-auto">
                                 <div className="text-[15px] font-bold text-gray-900">৳ {price.toLocaleString()}</div>
                                 {oldPrice && (
                                   <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                     <span className="text-[12px] text-gray-400 line-through">৳ {oldPrice.toLocaleString()}</span>
                                     <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">৳ {discount.toLocaleString()} OFF</span>
                                   </div>
                                 )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                       <h3 className="font-bold text-gray-800 mb-5 text-[15px]">Search Results for "{searchQuery}"</h3>
                       <div className="grid grid-cols-3 gap-4">
                          {products
                            ?.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand?.toLowerCase().includes(searchQuery.toLowerCase()))
                            .slice(0, 6)
                            .map(p => {
                              const price = p.discountPrice || p.price;
                              const oldPrice = p.discountPrice ? p.price : null;
                              const discount = oldPrice ? oldPrice - price : 0;
                              return (
                                <Link
                                  key={p.id}
                                  to={`/product/${p.id}`}
                                  onMouseDown={(e) => { e.preventDefault(); if(searchQuery) saveSearch(searchQuery); navigate(`/product/${p.id}`); setIsSearchFocused(false); }}
                                  className="border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-all group flex flex-col h-full bg-white relative"
                                >
                                  <div className="aspect-square bg-white rounded-xl flex items-center justify-center p-2 mb-4">
                                    <img src={p.images?.[0] || 'https://via.placeholder.com/150'} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                                  </div>
                                  <p className="text-[14px] font-bold text-gray-800 line-clamp-2 mb-3 flex-grow">{p.name}</p>
                                  <div className="mt-auto">
                                     <div className="text-[15px] font-bold text-gray-900">৳ {price.toLocaleString()}</div>
                                     {oldPrice && (
                                       <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                         <span className="text-[12px] text-gray-400 line-through">৳ {oldPrice.toLocaleString()}</span>
                                         <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">৳ {discount.toLocaleString()} OFF</span>
                                       </div>
                                     )}
                                  </div>
                                </Link>
                              );
                            })}
                       </div>
                       <div className="text-center mt-8 pt-4 border-t border-gray-100">
                         <button onMouseDown={(e) => { e.preventDefault(); saveSearch(searchQuery); navigate(`/search?q=${encodeURIComponent(searchQuery)}`); setIsSearchFocused(false); }} className="text-gray-900 font-bold hover:underline text-sm flex items-center justify-center gap-1 mx-auto">
                           View All Results &rarr;
                         </button>
                       </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6">
            
            <Link to="/pre-book" className="relative text-[#F97316] hover:text-[#e06612] transition-colors hidden lg:flex items-center gap-1.5" title="Pre-Book a Product">
                <CalendarDays size={24} />
                <span className="text-sm font-bold hidden md:block">Pre-Book</span>
              </Link>

            <Link to="/compare" className="relative text-[#F97316] hover:text-[#e06612] transition-colors hidden lg:flex">
              <GitCompare size={24} />
              {compareItems?.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#F97316] text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-[#0E2A47]">
                  {compareItems.length}
                </span>
              )}
            </Link>

            <Link to="/wishlist" className="relative text-[#F97316] hover:text-[#e06612] transition-colors hidden lg:flex">
              <Heart size={24} />
              {wishlist?.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#F97316] text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-[#0E2A47]">
                  {wishlist.length}
                </span>
              )}
            </Link>

            <Link to="/cart" className="relative text-[#F97316] hover:text-[#e06612] transition-colors flex">
              <ShoppingCart size={24} />
              {items?.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#F97316] text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-[#0E2A47]">
                  {items.length}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-5 ml-2">
                <Link to="/profile" className="text-white hover:text-[#F97316] transition-colors hidden lg:flex">
                  <User size={24} />
                </Link>
                <button onClick={handleLogout} className="text-white hover:text-[#EF4444] transition-colors hidden lg:flex">
                  <LogOut size={24} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-5 ml-2">
                <Link to="/login" className="text-white hover:text-[#F97316] transition-colors hidden lg:flex">
                  <User size={24} />
                </Link>
              </div>
            )}

            <button aria-label={isMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={isMenuOpen} className="lg:hidden p-2 text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      <div className="lg:hidden px-3 pb-3">
        <form onSubmit={handleSearch} className="flex w-full items-center bg-[#333333] rounded-full overflow-hidden border border-[#444] focus-within:border-gray-400 transition-all px-4">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full min-w-0 border-none bg-transparent py-2.5 px-3 focus:outline-none focus:ring-0 text-white placeholder-gray-400 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden lg:block bg-white border-b border-gray-200">
          <div className="w-full max-w-[1440px] mx-auto px-2 sm:px-4 md:px-[50px]">
            <div className="flex items-center justify-between h-12">
              <ul className="flex items-center gap-4 xl:gap-6 h-full">
            {menus.filter(m => m.name.toLowerCase() !== 'hosting').map((menu, menuIdx, arr) => {
              const subs = menu.subCategories || [];
              const isNearRightEdge = menuIdx >= arr.length - 3;

              // Split subcategories into columns of max 10 items
              const CHUNK_SIZE = 10;
              const columns: SubCategory[][] = [];
              for (let i = 0; i < subs.length; i += CHUNK_SIZE) {
                columns.push(subs.slice(i, i + CHUNK_SIZE));
              }

              return (
              <li key={menu.id} className="relative group h-full">
                <Link 
                  to={`/category/${menu.slug}`} 
                  className="flex items-center gap-1 h-full text-[13px] font-bold transition-colors whitespace-nowrap"
                  style={{ color: 'inherit' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = settings.accentColor}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
                >
                  {menu.name}
                  {subs.length > 0 && <ChevronDown size={14} />}
                </Link>
                
                {subs.length > 0 && (
                  <div className={`absolute top-full left-0 bg-white shadow-2xl border border-gray-100 rounded-b-md opacity-0 invisible translate-y-2 group-hover:translate-y-0 group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-2 flex divide-x divide-gray-100 ${
                    columns.length === 1 ? 'w-60' : columns.length === 2 ? 'w-[500px]' : 'w-[750px]'
                  }`}>
                    {columns.map((colSubs, colIdx) => (
                      <ul key={colIdx} className="flex-1 flex flex-col min-w-[240px]">
                        {colSubs.map((sub, rowIdx) => {
                          const subSubs = sub.subCategories || [];
                          const hasSubSubs = subSubs.length > 0;
                          const isLastCol = colIdx === columns.length - 1;
                          
                          // Flyout direction: if last column & not near screen right edge -> right, else left
                          const flyoutToRight = !isNearRightEdge && isLastCol;
                          // Vertical positioning: flip upwards if near bottom of column so it never cuts off
                          const flyoutVertical = rowIdx >= 6 ? 'bottom-0' : 'top-0';

                          return (
                            <li key={sub.id} className="relative group/sub">
                              <Link 
                                to={`/category/${menu.slug}/${sub.slug}`} 
                                className="flex items-center justify-between px-4 py-2 hover:bg-orange-50 text-gray-900 hover:text-[#F97316] transition-colors text-[13px] font-medium"
                              >
                                <span className="truncate">{sub.name}</span>
                                {hasSubSubs && (
                                  <ChevronRight size={13} className="text-gray-400 group-hover/sub:text-[#F97316] shrink-0 ml-2" />
                                )}
                              </Link>

                              {/* Sub-Sub-Category Flyout */}
                              {hasSubSubs && (
                                <div className={`absolute ${flyoutVertical} ${flyoutToRight ? 'left-full ml-1' : 'right-full mr-1'} bg-white shadow-2xl border border-gray-100 rounded-md py-1.5 min-w-[210px] opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible transition-all duration-150 z-[60]`}>
                                  <div className="px-3.5 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 mb-1">
                                    {sub.name}
                                  </div>
                                  <ul className="flex flex-col py-0.5">
                                    {subSubs.map(subSub => (
                                      <li key={subSub.id}>
                                        <Link 
                                          to={`/category/${menu.slug}/${sub.slug}/${subSub.slug}`} 
                                          className="block px-3.5 py-1.5 text-xs text-gray-700 hover:text-[#F97316] hover:bg-orange-50/80 transition-colors"
                                        >
                                          {subSub.name}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                  <div className="border-t border-gray-100 mt-1 pt-1 px-3.5">
                                    <Link 
                                      to={`/category/${menu.slug}/${sub.slug}`} 
                                      className="block text-[11px] font-bold text-[#F97316] hover:underline py-1"
                                    >
                                      All {sub.name} &rarr;
                                    </Link>
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ))}
                  </div>
                )}
              </li>
            )})}
            </ul>
              <div className="flex items-center gap-6 h-full">
                <Link to="/pc-build" className="flex items-center gap-1.5 h-full text-[14px] text-gray-900 font-bold hover:text-[#F97316] transition-colors">
                  <Cpu size={18} /> PC Builder
                </Link>
                  <Link to="/projects" className="flex items-center gap-1.5 h-full text-[14px] text-gray-900 font-bold hover:text-[#F97316] transition-colors">
                    <Camera size={18} /> Our Projects
                  </Link>
                <Link to="/pricing" className="flex items-center gap-1.5 h-full text-[14px] text-gray-900 font-bold hover:text-[#F97316] transition-colors">
                  <Server size={18} /> Domain & Hosting
                </Link>
              </div>
            </div>
          </div>
        </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-gray-700 p-4 bg-black max-h-[calc(100dvh-116px)] overflow-y-auto">
          <div className="flex flex-col gap-4 text-gray-100">
            <div className="flex flex-wrap gap-4 border-b border-gray-700 pb-4 text-sm font-semibold">
              <Link to="/pre-book" onClick={() => setIsMenuOpen(false)} className="text-[#F97316]">Pre-Book</Link>
              <Link to="/compare" onClick={() => setIsMenuOpen(false)} className="text-[#F97316]">Compare ({compareItems.length})</Link>
              <Link to="/wishlist" onClick={() => setIsMenuOpen(false)} className="text-[#F97316]">Wishlist ({wishlist.length})</Link>
            </div>
            {canAccessAdmin && (
              <Link to="/admin" className="flex items-center gap-2 py-2 text-gray-100" onClick={() => setIsMenuOpen(false)}>
                <LayoutDashboard size={20} /> Admin Dashboard
                </Link>
              )}
              <Link to="/projects" className="flex items-center gap-2 py-2 text-gray-100" onClick={() => setIsMenuOpen(false)}>
                <Camera size={20} /> Our Projects
              </Link>
              <Link to="/pc-build" className="flex items-center gap-2 py-2 text-gray-100" onClick={() => setIsMenuOpen(false)}>
                <Cpu size={20} /> PC Builder
              </Link>
              <Link to="/pricing" className="flex items-center gap-2 py-2 text-blue-400 font-semibold" onClick={() => setIsMenuOpen(false)}>
                <Server size={20} /> Domain & Hosting
              </Link>
            
            {/* Dynamic Menus in Mobile */}
            <div className="border-t border-gray-700 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Browse categories</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">Find products by category</p>
                </div>
                <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-gray-400">
                  {mobileMenus.length} categories
                </span>
              </div>
              <label className="relative mb-3 block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="search"
                  value={mobileCategorySearch}
                  onChange={e => setMobileCategorySearch(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full rounded-xl border border-gray-700 bg-[#141414] py-3 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 outline-none transition-colors focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
                />
              </label>
              <div className="space-y-2.5">
              {mobileMenus.map(({ menu, subCategories, menuMatches }) => {
                const isExpanded = mobileCategoryQuery
                  ? !menuMatches && subCategories.length > 0
                  : expandedMobileCategories.includes(menu.id);
                return (
                <div
                  key={menu.id}
                  className={`overflow-hidden rounded-xl border transition-colors ${
                    isExpanded ? 'border-[#F97316]/50 bg-[#100d0a]' : 'border-gray-800 bg-[#090909]'
                  }`}
                >
                  <div className="flex items-center">
                    <Link
                      to={`/category/${menu.slug}`}
                      className={`flex min-h-12 flex-1 items-center justify-between gap-2 px-3.5 text-sm font-bold transition-colors ${
                        isExpanded ? 'text-white' : 'text-gray-200 hover:text-white'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {menu.name}
                      {subCategories.length > 0 && (
                        <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                          {subCategories.length}
                        </span>
                      )}
                    </Link>
                    {subCategories.length > 0 && (
                      <button
                        type="button"
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${menu.name}`}
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedMobileCategories(current =>
                          current.includes(menu.id) ? current.filter(id => id !== menu.id) : [...current, menu.id]
                        )}
                        className="flex h-12 w-12 items-center justify-center text-gray-400 transition-colors hover:text-[#F97316]"
                      >
                        <ChevronDown size={17} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-[#F97316]' : ''}`} />
                      </button>
                    )}
                  </div>
                  {isExpanded && subCategories.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 border-t border-gray-800/80 p-2">
                      {subCategories.map(sub => {
                        const subSubs = (sub.subCategories || []).filter(subSub =>
                          !mobileCategoryQuery ||
                          menuMatches ||
                          sub.name.toLowerCase().includes(mobileCategoryQuery) ||
                          subSub.name.toLowerCase().includes(mobileCategoryQuery)
                        );
                        const subKey = `${menu.id}/${sub.id}`;
                        const subExpanded = mobileCategoryQuery
                          ? subSubs.length > 0
                          : expandedMobileSubCategories.includes(subKey);
                        return (
                          <div key={sub.id} className="min-w-0 rounded-lg border border-gray-800/70 bg-black/30">
                            <div className="flex items-center">
                              <Link
                                to={`/category/${menu.slug}/${sub.slug}`}
                                className="flex min-h-10 min-w-0 flex-1 items-center px-2.5 text-xs font-medium leading-tight text-gray-200 transition-colors hover:text-[#F97316]"
                                onClick={() => setIsMenuOpen(false)}
                              >
                                <span className="line-clamp-2">{sub.name}</span>
                              </Link>
                              {subSubs.length > 0 && (
                                <button
                                  type="button"
                                  aria-label={`${subExpanded ? 'Collapse' : 'Expand'} ${sub.name}`}
                                  aria-expanded={subExpanded}
                                  onClick={() => setExpandedMobileSubCategories(current =>
                                    current.includes(subKey) ? current.filter(key => key !== subKey) : [...current, subKey]
                                  )}
                                  className="flex h-10 w-9 shrink-0 items-center justify-center text-gray-500 hover:text-[#F97316]"
                                >
                                  <ChevronDown size={15} className={`transition-transform ${subExpanded ? 'rotate-180' : ''}`} />
                                </button>
                              )}
                            </div>
                            {subExpanded && subSubs.length > 0 && (
                              <div className="col-span-2 mx-2 mb-2 ml-3 space-y-0.5 border-l border-gray-700 py-1 pl-3">
                                {subSubs.map(subSub => (
                                  <Link
                                    key={subSub.id}
                                    to={`/category/${menu.slug}/${sub.slug}/${subSub.slug}`}
                                    className="block min-h-9 py-2 text-xs text-gray-300 transition-colors hover:text-[#F97316]"
                                    onClick={() => setIsMenuOpen(false)}
                                  >
                                    {subSub.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )})}
              {mobileMenus.length === 0 && (
                <p className="py-3 text-sm text-gray-400">No categories match your search.</p>
              )}
              </div>
            </div>

            {user ? (
              <div className="flex flex-col gap-2">
                <Link to="/profile" className="flex items-center gap-2 py-2 text-gray-100" onClick={() => setIsMenuOpen(false)}>
                  <User size={20} /> My Profile
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2 py-2 text-left text-gray-100">
                  <LogOut size={20} /> Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-2 py-2 text-gray-100" onClick={() => setIsMenuOpen(false)}>
                <User size={20} /> Login / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
