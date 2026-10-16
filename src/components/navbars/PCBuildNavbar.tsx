import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X, LogOut, ChevronRight, Zap, Target, Server, Loader2, Moon, Sun } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { auth, db } from '../../firebase';
import { signOut } from 'firebase/auth';
import { setSiteContext } from '../../hooks/useSiteContext';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { Product } from '../../types';

export const PCBuildNavbar: React.FC = () => {
  const { items } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Live Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('pcb-theme') === 'dark');

  useEffect(() => {
    const handler = (e) => setIsDarkMode(e.detail);
    window.addEventListener('pcb-theme-change', handler);
    return () => window.removeEventListener('pcb-theme-change', handler);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    window.dispatchEvent(new CustomEvent('pcb-theme-toggle', { detail: newTheme }));
  };

  useEffect(() => {
    setSiteContext('pc-build');
    
    // Fetch all products once for fast client-side searching
    const fetchProducts = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'products'), limit(500)));
        const prods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setAllProducts(prods);
      } catch (err) {
        console.error("Failed to load products for search", err);
      }
    };
    fetchProducts();
  }, []);

  // Handle outside click for search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search logic
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      setIsSearching(true);
      setShowSearchDropdown(true);
      
      const delay = setTimeout(() => {
        const queryLower = searchQuery.toLowerCase();
        const results = allProducts.filter(p => 
          p.name?.toLowerCase().includes(queryLower) || 
          p.category?.toLowerCase().includes(queryLower)
        ).slice(0, 5); // Max 5 results
        
        setSearchResults(results);
        setIsSearching(false);
      }, 300); // 300ms debounce
      
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  }, [searchQuery, allProducts]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchDropdown(false);
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const cartItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-[100] w-full text-slate-900 bg-white/70 backdrop-blur-2xl border-b border-slate-200/60 shadow-[0_1px_15px_rgba(0,0,0,0.03)]">
      
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-[50px] relative">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-2 sm:gap-6">
          {/* Logo */}
          <Link to="/pc-build" className="flex items-center gap-2 shrink-0 group relative">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.brandName} className="h-10 sm:h-12 w-auto max-w-[150px] sm:max-w-none relative z-10 transition-transform group-hover:scale-105 duration-300" referrerPolicy="no-referrer" />
            ) : (
              <img src="/logo.png" alt={settings.brandName || "Click2IT BD"} className="h-10 sm:h-12 w-auto max-w-[150px] sm:max-w-none object-contain relative z-10 transition-transform group-hover:scale-105 duration-300" />
            )}
          </Link>

          {/* Nav Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link to="/shop" className="text-slate-500 hover:text-slate-900 font-semibold transition-colors flex items-center gap-1.5 group">
              <Target size={16} className="text-slate-500 group-hover:text-cyan-400 transition-colors"/> Shop
            </Link>
            <Link to="/pc-build" className="text-violet-400 font-bold transition-colors flex items-center gap-1.5 relative group">
              <Zap size={16} className="fill-violet-400 animate-pulse"/> PC Builder
              <div className="absolute -bottom-7 left-0 right-0 h-[2px] bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.8)] rounded-t-full"></div>
            </Link>
            <a href="https://click2it.bd" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-900 font-semibold transition-colors flex items-center gap-1.5 group">
              <Server size={16} className="text-slate-500 group-hover:text-amber-400 transition-colors"/> Hosting
            </a>
          </nav>

          {/* Search Bar - Live */}
          <div className="hidden lg:flex flex-1 max-w-md relative group z-50" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => { if(searchQuery.length > 1) setShowSearchDropdown(true) }}
                placeholder="Search gaming gear..."
                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl py-3 pl-5 pr-10 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:bg-white text-slate-900 placeholder-slate-500 transition-all shadow-inner"
              />
              <button type="submit" className="absolute right-3 text-slate-500 hover:text-violet-400 transition-colors">
                {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              </button>
            </form>

            {/* Live Search Dropdown */}
            {showSearchDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-100 border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {searchResults.length > 0 ? (
                  <div className="flex flex-col">
                    {searchResults.map(prod => (
                      <Link 
                        key={prod.id} 
                        to={`/product/${prod.id}`}
                        onClick={() => setShowSearchDropdown(false)}
                        className="flex items-center gap-3 p-3 hover:bg-slate-200 transition-colors border-b border-slate-200/50 last:border-0 group/item"
                      >
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 shrink-0 group-hover/item:shadow-lg transition-shadow">
                          <img src={prod.images?.[0] || '/placeholder.png'} className="w-full h-full object-contain mix-blend-multiply" alt={prod.name} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-700 truncate group-hover/item:text-violet-400 transition-colors">{prod.name}</h4>
                          <p className="text-xs text-slate-500 capitalize">{prod.category?.replace(/-/g, ' ')}</p>
                        </div>
                        <div className="text-sm font-bold text-cyan-400 shrink-0">
                          ৳{prod.discountPrice || prod.price}
                        </div>
                      </Link>
                    ))}
                    <Link 
                      to={`/shop?search=${encodeURIComponent(searchQuery)}`}
                      onClick={() => setShowSearchDropdown(false)}
                      className="p-3 text-center text-xs font-bold text-violet-400 hover:text-slate-900 hover:bg-violet-600 transition-all"
                    >
                      View All Results &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    No products found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-5 shrink-0">
            <Link to="/cart" className="relative p-2 text-slate-500 hover:text-slate-900 transition-colors group">
              <ShoppingCart size={22} className="relative z-10 group-hover:scale-110 transition-transform" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center bg-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.5)] z-20">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="hidden sm:flex items-center gap-4 border-l border-slate-200 pl-5">
                
              <button 
                onClick={toggleTheme}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Toggle Dark Mode"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
  
              <Link to="/profile" className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-violet-500/30">
                  <User size={16} className="text-violet-400" /> Profile
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-rose-400 transition-colors">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="hidden sm:flex items-center gap-2 text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]">
                <User size={18} /> Login
              </Link>
            )}

            <button aria-label={isMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={isMenuOpen} className="lg:hidden p-2 text-slate-600 hover:text-violet-400" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-slate-100 border-t border-slate-200 shadow-2xl absolute w-full max-h-[calc(100dvh-64px)] overflow-y-auto">
          <div className="px-4 py-4 space-y-4">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-10 text-slate-900 focus:outline-none focus:border-violet-500"
              />
              <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"><Search size={18}/></button>
            </form>
            <nav className="flex flex-col space-y-1">
              <Link to="/shop" className="text-slate-600 py-3 px-2 border-b border-slate-200 flex items-center justify-between hover:bg-slate-50 rounded-lg">Shop <ChevronRight size={16}/></Link>
              <Link to="/pc-build" className="text-violet-400 py-3 px-2 border-b border-slate-200 flex items-center justify-between font-bold bg-violet-500/10 rounded-lg">PC Builder <ChevronRight size={16}/></Link>
              <a href="https://click2it.bd" target="_blank" rel="noopener noreferrer" className="text-slate-600 py-3 px-2 border-b border-slate-200 flex items-center justify-between hover:bg-slate-50 rounded-lg">Hosting <ChevronRight size={16}/></a>
              {user ? (
                <>
                  <Link to="/profile" className="text-slate-600 py-3 px-2 border-b border-slate-200 flex items-center justify-between hover:bg-slate-50 rounded-lg">My Profile <User size={16}/></Link>
                  <button onClick={handleLogout} className="text-rose-400 py-3 px-2 flex items-center justify-between w-full text-left hover:bg-rose-500/10 rounded-lg">Logout <LogOut size={16}/></button>
                </>
              ) : (
                <Link to="/login" className="text-violet-400 py-3 px-2 flex items-center justify-between w-full font-bold mt-2 border border-violet-500/30 rounded-lg bg-violet-500/10">Login <User size={16}/></Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};
