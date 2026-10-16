import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X, LogOut, LayoutDashboard, ChevronDown, Cpu, Server } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { NavigationMenu, SubCategory } from '../types';

export const Header: React.FC = () => {
  const { items } = useCart();
  const { user, canAccessAdmin } = useAuth();
  const { settings } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [menus, setMenus] = useState<NavigationMenu[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const q = query(collection(db, 'menus'), orderBy('order', 'asc'), limit(100));
        const snap = await getDocs(q);
        setMenus(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as NavigationMenu[]);
      } catch (error) {
        console.error('Error fetching menus:', error);
      }
    };
    fetchMenus();
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

  return (
    <header className="sticky top-0 z-50 w-full text-white shadow-md" style={{ backgroundColor: settings.primaryColor }}>
      <div className="w-full max-w-[1440px] mx-auto px-2 sm:px-4 md:px-[50px]">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={settings.brandName} className="h-10 w-auto" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-xl italic" style={{ backgroundColor: settings.accentColor }}>
                {settings.brandShortName}
              </div>
            )}
            <span className="hidden sm:block text-xl font-bold tracking-tight uppercase">{settings.brandName}</span>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl relative">
            <input
              type="text"
              placeholder="Search products..."
              className="w-full border-none rounded-md py-2 px-4 focus:ring-2 transition-all"
              style={{ backgroundColor: settings.secondaryColor, color: 'white' }}
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
              <Search size={20} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <Link to="/cart" className="relative group">
              <ShoppingCart className="transition-colors" style={{ color: 'white' }} />
              {items.length > 0 && (
                <span className="absolute -top-2 -right-2 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2" style={{ backgroundColor: settings.accentColor, borderColor: settings.primaryColor }}>
                  {items.length}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/account/services" className="hidden sm:flex items-center gap-1 hover:text-[#EF4444] transition-colors">
                  <Server size={20} />
                  <span className="text-sm font-medium">My Services</span>
                </Link>
                {canAccessAdmin && (
                  <Link to="/admin" className="hidden sm:flex items-center gap-1 hover:text-[#EF4444] transition-colors">
                    <LayoutDashboard size={20} />
                    <span className="text-sm font-medium">Admin</span>
                  </Link>
                )}
                <button onClick={handleLogout} className="hidden sm:flex items-center gap-1 hover:text-[#EF4444] transition-colors">
                  <LogOut size={20} />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-1 hover:text-[#EF4444] transition-colors">
                <User size={20} />
                <span className="hidden sm:block text-sm font-medium">Login</span>
              </Link>
            )}

            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white text-[#081621] border-b border-gray-200">
        <div className="w-full max-w-[1440px] mx-auto px-2 sm:px-4 md:px-[50px]">
          <ul className="flex items-center gap-8 h-12">
            {menus.map(menu => {
              const isComponents = menu.name.toLowerCase() === 'components';
              const menuSubs: SubCategory[] = menu.subCategories || [];
              const subs: SubCategory[] = isComponents
                ? [
                    ...menuSubs,
                    ...pcBuilderCategories.filter(pc => !menuSubs.some(sub => sub.slug.toLowerCase() === pc.slug.toLowerCase()))
                  ]
                : menuSubs;

              return (
              <li key={menu.id} className="relative group h-full">
                <Link 
                  to={`/category/${menu.slug}`} 
                  className="flex items-center gap-1 h-full text-sm font-bold transition-colors"
                  style={{ color: 'inherit' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = settings.accentColor}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
                >
                  {menu.name}
                  {subs.length > 0 && <ChevronDown size={14} />}
                </Link>
                
                {subs.length > 0 && (
                  <div className="absolute top-full left-0 w-56 bg-white shadow-xl border border-gray-100 rounded-b-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <ul className="py-2">
                      {subs.map(sub => (
                        <li key={sub.id}>
                          <Link 
                            to={`/category/${menu.slug}/${sub.slug}`}
                            className="block px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                            style={{ color: 'inherit' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = settings.accentColor}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
                          >
                            {sub.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            )})}
            <li className="h-full">
              <Link to="/pc-builder" className="flex items-center gap-2 h-full text-sm font-bold hover:underline" style={{ color: settings.accentColor }}>
                <Cpu size={16} /> PC Builder
              </Link>
            </li>
            <li className="h-full">
              <Link to="/hosting" className="flex items-center gap-2 h-full text-sm font-bold hover:underline" style={{ color: settings.accentColor }}>
                 Domain & Hosting
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-700 p-4" style={{ backgroundColor: settings.secondaryColor }}>
          <div className="flex flex-col gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full border-none rounded-md py-2 px-4"
                style={{ backgroundColor: settings.primaryColor }}
              />
              <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
            </div>
            {canAccessAdmin && (
              <Link to="/admin" className="flex items-center gap-2 py-2" onClick={() => setIsMenuOpen(false)}>
                <LayoutDashboard size={20} /> Admin Dashboard
              </Link>
            )}
            
            {/* Dynamic Menus in Mobile */}
            <div className="border-t border-gray-700 pt-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Categories</p>
              {menus.map(menu => {
                const isComponents = menu.name.toLowerCase() === 'components';
                const menuSubs: SubCategory[] = menu.subCategories || [];
                const subs: SubCategory[] = isComponents
                  ? [
                      ...menuSubs,
                      ...pcBuilderCategories.filter(pc => !menuSubs.some(sub => sub.slug.toLowerCase() === pc.slug.toLowerCase()))
                    ]
                  : menuSubs;

                return (
                <div key={menu.id} className="flex flex-col">
                  <Link 
                    to={`/category/${menu.slug}`} 
                    className="flex items-center justify-between py-2 text-sm font-bold"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {menu.name}
                  </Link>
                  {subs.length > 0 && (
                    <div className="pl-4 flex flex-col border-l border-gray-700">
                      {subs.map(sub => (
                          <div key={sub.id} className="flex flex-col">
                            <Link 
                              to={`/category/${menu.slug}/${sub.slug}`}
                              className="py-1.5 text-xs text-gray-400 hover:text-[#EF4444]"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              {sub.name}
                            </Link>
                            {sub.subCategories && sub.subCategories.length > 0 && (
                              <div className="pl-3 flex flex-col border-l border-gray-600/50">
                                {sub.subCategories.map((subSub: any) => (
                                  <Link 
                                    key={subSub.id}
                                    to={`/category/${menu.slug}/${sub.slug}/${subSub.slug}`}
                                    className="py-1.5 text-[11px] text-gray-500 hover:text-[#EF4444]"
                                    onClick={() => setIsMenuOpen(false)}
                                  >
                                    - {subSub.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )})}
            </div>

            {user ? (
              <div className="flex flex-col gap-2">
                <Link to="/account/services" className="flex items-center gap-2 py-2" onClick={() => setIsMenuOpen(false)}>
                  <Server size={20} /> My Services
                </Link>
                {canAccessAdmin && (
                  <Link to="/admin" className="flex items-center gap-2 py-2" onClick={() => setIsMenuOpen(false)}>
                    <LayoutDashboard size={20} /> Admin Dashboard
                  </Link>
                )}
                <button onClick={handleLogout} className="flex items-center gap-2 py-2 text-left">
                  <LogOut size={20} /> Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-2 py-2" onClick={() => setIsMenuOpen(false)}>
                <User size={20} /> Login / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
