import React, { useState, useEffect } from 'react';
import { Search, Loader2, ShieldCheck, Zap, Headphones, X, ArrowRight, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

const POPULAR_TLDS = ['.com', '.net', '.org', '.com.bd', '.xyz', '.store', '.online'];

export default function HeroSection({ hasDomainInCart, bundleDiscount = 10 }) {
  const [query, setQuery] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();
  const { setAppliedDiscount } = useCart();

  useEffect(() => {
    // Trigger popup notification exactly 10 seconds after page entry
    const dismissed = sessionStorage.getItem('c2i_bundle_popup_dismissed');
    if (dismissed === 'true') return;

    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleDismissPopup = () => {
    setShowPopup(false);
    sessionStorage.setItem('c2i_bundle_popup_dismissed', 'true');
  };

  const handleClaimOffer = () => {
    const discountPct = Number(bundleDiscount) || 10;
    const discountObj = {
      code: 'HOSTING10',
      discountPercentage: discountPct,
      type: 'percentage',
      description: `Special ${discountPct}% Hosting & Bundle Discount`
    };

    // 1. Activate in CartContext and persistent storages
    setAppliedDiscount(discountObj);
    localStorage.setItem('c2i_claimed_discount', JSON.stringify(discountObj));
    localStorage.setItem('appliedDiscount', JSON.stringify(discountObj));
    sessionStorage.setItem('c2i_bundle_popup_dismissed', 'true');
    setShowPopup(false);

    // 2. Friendly confirmation toast
    toast.success(`🎉 ${discountPct}% Discount Activated! Promo code HOSTING10 has been applied to your checkout.`, {
      duration: 6000,
      icon: '🎁'
    });

    // 3. Smooth scroll down to hosting packages
    const plansEl = document.getElementById('shared-hosting') || document.getElementById('hosting-plans');
    if (plansEl) {
      plansEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/pricing');
    }
  };

  const handleSearch = () => {
    const clean = query.trim();
    if (!clean) return;
    navigate(`/domain/search?q=${encodeURIComponent(clean)}`);
  };

  return (
    <section
      style={{
        background: 'linear-gradient(160deg, #020b2e 0%, #050f3a 55%, #0b1a5c 100%)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background ambient glows */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '700px',
        height: '350px',
        background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        top: '30%',
        right: '10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
        filter: 'blur(40px)',
      }} />

      <div className="container mx-auto relative z-10 pt-28 pb-10">

        {/* Heading */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            High-Performance Web Hosting{' '}
            <span style={{
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              &amp; Domains
            </span>
          </h1>
          <p className="text-blue-200/80 text-lg sm:text-xl mt-4 font-normal max-w-2xl mx-auto">
            Ultra-fast NVMe cPanel hosting, instant domain registration, and automated WordPress Cloud powered by BDIX.
          </p>
        </div>

        {/* Domain Search Box */}
        <div className="max-w-3xl mx-auto px-4 mb-6">
          <div
            className="flex items-center rounded-2xl p-2 shadow-2xl transition-all"
            style={{
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1.5px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            }}
          >
            <div className="pl-4 text-blue-300">
              <Search size={22} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search your ideal domain name..."
              className="w-full px-4 py-4 bg-transparent text-white placeholder-blue-300/50 outline-none text-base sm:text-lg font-medium"
            />
            <div className="flex items-center gap-2 pr-2">
              <button
                onClick={handleSearch}
                className="flex items-center gap-2 text-white font-bold px-7 py-3.5 rounded-xl transition-all active:scale-95 hover:opacity-90 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea6100)' }}
              >
                <Search size={18} />
                <span className="hidden sm:inline">Search Domain</span>
                <span className="sm:hidden">Search</span>
              </button>
            </div>
          </div>

          {/* Popular TLD pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
            <span className="text-blue-300/60 font-semibold uppercase tracking-wider text-[11px] mr-1">Popular:</span>
            {POPULAR_TLDS.map((tld) => (
              <button
                key={tld}
                onClick={() => {
                  const base = query ? query.split('.')[0] : 'mybrand';
                  navigate(`/domain/search?q=${encodeURIComponent(base + tld)}`);
                }}
                className="px-3 py-1 rounded-full text-blue-200/80 hover:text-white transition-all font-mono font-medium hover:scale-105"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                {tld}
              </button>
            ))}
          </div>
        </div>

        {/* Server image centered */}
        <div className="flex justify-center mt-4">
          <div className="relative w-full max-w-[520px] hover:scale-[1.02] transition-transform duration-700">
            <img
              src="/server-light.png"
              alt="High Performance Cloud Infrastructure"
              className="w-full h-auto object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.6)]"
              style={{
                filter: 'drop-shadow(0 0 40px rgba(59,130,246,0.3))',
              }}
            />
          </div>
        </div>

      </div>

      {/* Wave divider (Original Design Preserved) */}
      <div className="relative z-10" style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
          <path d="M0 60 C360 0 1080 0 1440 60 L1440 60 L0 60 Z" fill="#f9fafb" />
        </svg>
      </div>

      {/* 10-Second Entry Popup Notification */}
      {showPopup && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full mx-4 sm:mx-0 animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="bg-gradient-to-r from-slate-900 via-gray-900 to-slate-900 border border-orange-500/40 p-5 rounded-2xl shadow-2xl shadow-black/80 relative overflow-hidden backdrop-blur-xl">
            {/* Ambient orange glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-orange-500/20 rounded-full blur-xl pointer-events-none" />

            {/* Close button */}
            <button
              type="button"
              onClick={handleDismissPopup}
              className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Close notification"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-3.5 pr-6">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 text-xl shadow-sm">
                🎉
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                    Special Offer
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    <Tag size={10} /> HOSTING10
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white tracking-tight">
                  Add hosting now and save {bundleDiscount}%!
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Combine high-speed NVMe hosting with your domain to enjoy exclusive instant savings today.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={handleDismissPopup}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white font-medium transition-colors cursor-pointer"
              >
                Later
              </button>
              <button
                type="button"
                onClick={handleClaimOffer}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <span>Claim {bundleDiscount}% Off</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
