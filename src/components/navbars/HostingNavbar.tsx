import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  User,
  LayoutDashboard,
  LogOut,
  Phone,
  Mail,
  ShoppingCart,
  ChevronDown,
  Globe,
  Tag,
  Shield,
  Layers,
  Terminal,
  Lock,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useSettings } from "../../context/SettingsContext";
import { auth } from "../../firebase";
import { signOut } from "firebase/auth";
import { setSiteContext } from "../../hooks/useSiteContext";

export const HostingNavbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMobileDropdown, setExpandedMobileDropdown] = useState<string | null>(null);

  const { user, canAccessAdmin } = useAuth();
  const { items } = useCart();
  const cartCount = items.filter(
    (i) => i.category === "Hosting & Domains",
  ).length;
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const loginHref = location.pathname !== '/login' && location.pathname !== '/'
    ? `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`
    : '/login';

  useEffect(() => {
    // Mark that the user is in the hosting context
    setSiteContext('hosting');
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setExpandedMobileDropdown(null);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    {
      name: "Pricing",
      path: "/pricing",
      subLinks: [
        { name: "Shared cPanel Hosting", path: "/pricing#shared-hosting", icon: Layers },
        { name: "WordPress Cloud", path: "/pricing#wordpress-cloud", icon: Shield },
        { name: "Cloud VPS Servers", path: "/pricing#cloud-vps", icon: Terminal },
        { name: "CloudLinux License", path: "/pricing#cloudlinux-license", icon: Globe },
        { name: "Custom Package Builder", path: "/pricing#custom-package", icon: Tag },
        { name: "Compare All Features", path: "/pricing#compare-plans", icon: Layers },
      ],
    },
    { name: "Cloud VPS", path: "/vps" },
    {
      name: "Domain",
      path: "/domain",
      subLinks: [
        { name: "Domain Registration", path: "/domain", icon: Globe },
        { name: "Domain Transfer", path: "/domain/transfer", icon: Globe },
        { name: "Domain Lock & Security", path: "/domain/security", icon: Lock },
        { name: "Domain Renewal", path: "/domain-renewal", icon: Globe },
        { name: "Bulk Domain Search", path: "/domain/bulk", icon: Globe },
        { name: "SSL Certificates", path: "/ssl", icon: Shield },
        { name: ".BD Domain Registration", path: "/domain/bd", icon: Globe },
      ],
    },
    { name: "Support", path: "/support" },
    { name: "Status", path: "/status" },
  ];

  const isActive = (path: string) => {
    if (path.includes("#")) {
      return location.hash === path.split("#")[1];
    }
    return location.pathname === path;
  };

  const toggleMobileDropdown = (name: string) => {
    setExpandedMobileDropdown((prev) => (prev === name ? null : name));
  };

  const handleNavClick = (path: string) => {
    setIsMobileMenuOpen(false);
    if (path.includes("#")) {
      const hash = path.split("#")[1];
      const el = document.getElementById(hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
  };

  return (
    <header
      className="sticky top-0 left-0 right-0 z-50 w-full transition-all duration-300"
    >
      {/* Top Bar - Desktop */}
      <div className="bg-[#060d1f] text-gray-300 text-xs py-1.5 px-4 sm:px-10 hidden sm:block">
        <div className="w-full max-w-[1440px] mx-auto px-2 sm:px-4 md:px-[50px] flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Phone size={12} className="text-blue-400" />
              <span>{settings?.contactPhone || "+880 1886-920755"}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Mail size={12} className="text-blue-400" />
              <span>{settings?.contactEmail || "info@click2it.bd"}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  <User size={12} />
                  <span>My Account</span>
                </Link>
                {canAccessAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center space-x-1 hover:text-white transition-colors text-amber-400"
                  >
                    <LayoutDashboard size={12} />
                    <span>Admin</span>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 hover:text-red-400 transition-colors"
                >
                  <LogOut size={12} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <Link
                to={loginHref}
                className="flex items-center space-x-1 hover:text-white transition-colors"
              >
                <User size={12} />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div
        className={`transition-all duration-300 ${
          isScrolled
            ? "bg-[#0a1628]/95 backdrop-blur-md shadow-lg py-2.5 sm:py-3"
            : "bg-[#0a1628] py-3 sm:py-4"
        }`}
      >
        <div className="w-full max-w-[1440px] mx-auto px-2 sm:px-4 md:px-[50px] sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              {settings?.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Click2IT Logo"
                  className="h-8 md:h-10 object-contain"
                />
              ) : (
                <>
                  <img
                    src="/logo.png"
                    alt="Click2IT Logo"
                    className="h-8 md:h-10 object-contain"
                  />
                  <span className="text-white font-bold text-base sm:text-lg tracking-tight group-hover:text-blue-400 transition-colors">
                    CLICK2IT
                  </span>
                </>
              )}
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center space-x-6">
              <nav className="flex items-center space-x-1">
                {navLinks.map((link) =>
                  link.subLinks ? (
                    <div key={link.name} className="relative group">
                      <button
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                          isActive(link.path) ||
                          link.subLinks.some((sub) => isActive(sub.path))
                            ? "text-blue-400 bg-blue-500/10"
                            : "text-gray-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {link.name}
                        <ChevronDown
                          size={14}
                          className="group-hover:rotate-180 transition-transform duration-200"
                        />
                      </button>
                      <div className="absolute top-full left-0 mt-2 w-56 bg-[#0d1d36] rounded-xl shadow-2xl border border-gray-700/60 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform translate-y-2 group-hover:translate-y-0 overflow-hidden">
                        <div className="p-2 space-y-1">
                          {link.subLinks.map((sub) => {
                            const IconComponent = sub.icon;
                            return (
                              <Link
                                key={sub.name}
                                to={sub.path}
                                onClick={() => handleNavClick(sub.path)}
                                className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-blue-600/20 rounded-lg transition-colors font-medium"
                              >
                                <IconComponent size={14} className="text-blue-400" />
                                <span>{sub.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link
                      key={link.name}
                      to={link.path}
                      onClick={() => handleNavClick(link.path)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive(link.path)
                          ? "text-blue-400 bg-blue-500/10"
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {link.name}
                    </Link>
                  ),
                )}
              </nav>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-3">
              <Link
                to="/hosting/cart"
                className="relative p-2 text-gray-300 hover:text-white transition-colors"
                title="View Hosting Cart"
              >
                <ShoppingCart size={22} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-[#0a1628]">
                    {cartCount}
                  </span>
                )}
              </Link>
              {user ? (
                <>
                  {canAccessAdmin && (
                    <Link
                      to="/admin"
                      className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                      title="Hosting Admin Dashboard"
                    >
                      <LayoutDashboard size={14} /> Admin
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                  >
                    <User size={14} /> Client Area
                  </Link>
                </>
              ) : (
                <Link
                  to={loginHref}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5"
                >
                  <User size={14} /> Client Login
                </Link>
              )}
            </div>

            {/* Mobile Header Icons: Cart + Hamburger */}
            <div className="md:hidden flex items-center space-x-2">
              <Link
                to="/hosting/cart"
                className="relative p-2 text-gray-300 hover:text-white"
                title="Cart"
              >
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-[#0a1628]">
                    {cartCount}
                  </span>
                )}
              </Link>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-300 hover:text-white p-2 rounded-lg bg-white/5 border border-white/10"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Slide-down with Collapsible Accordions */}
      {isMobileMenuOpen && (
        <div className="md:hidden w-full bg-[#0a1628] border-t border-gray-800 shadow-2xl max-h-[calc(100vh-70px)] overflow-y-auto">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) =>
              link.subLinks ? (
                <div key={link.name} className="border-b border-gray-800/60 pb-1">
                  {/* Parent Dropdown Button */}
                  <button
                    type="button"
                    onClick={() => toggleMobileDropdown(link.name)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-200 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <span>{link.name}</span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform duration-200 ${
                        expandedMobileDropdown === link.name ? "rotate-180 text-blue-400" : ""
                      }`}
                    />
                  </button>

                  {/* Collapsible Sublinks */}
                  {expandedMobileDropdown === link.name && (
                    <div className="pl-3 pr-1 py-1 space-y-1 bg-[#060d1f]/60 rounded-lg mt-1 mb-2 border border-gray-800">
                      {link.subLinks.map((sub) => {
                        const IconComp = sub.icon;
                        return (
                          <Link
                            key={sub.name}
                            to={sub.path}
                            onClick={() => handleNavClick(sub.path)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-gray-300 hover:text-white hover:bg-blue-600/20 transition-colors"
                          >
                            <IconComp size={14} className="text-blue-400" />
                            <span>{sub.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => handleNavClick(link.path)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-semibold border-b border-gray-800/60 transition-colors ${
                    isActive(link.path)
                      ? "text-blue-400 bg-blue-500/10"
                      : "text-gray-200 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.name}
                </Link>
              ),
            )}

            {/* Mobile Actions: Cart & Profile & Auth */}
            <div className="pt-3 pb-2 space-y-2">
              <Link
                to="/hosting/cart"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold bg-white/5 border border-gray-800 text-gray-200 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-orange-400" />
                  <span>Shopping Cart</span>
                </span>
                {cartCount > 0 && (
                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {cartCount} items
                  </span>
                )}
              </Link>

              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-blue-600/10 border border-blue-500/20 text-blue-300 hover:text-white"
                  >
                    <User size={16} />
                    <span>My Profile & Services</span>
                  </Link>

                  {canAccessAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:text-white"
                    >
                      <LayoutDashboard size={16} />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="pt-2">
                  <Link
                    to={loginHref}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full text-center bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-2.5 px-4 rounded-lg text-sm shadow-md"
                  >
                    Login / Create Account
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default HostingNavbar;


