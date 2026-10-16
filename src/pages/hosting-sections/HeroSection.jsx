import React, { useState, useEffect } from 'react';
import { Search, Loader2, ShieldCheck, Zap, Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const POPULAR_TLDS = ['.com', '.net', '.org', '.com.bd', '.xyz', '.store', '.online'];

export default function HeroSection({ hasDomainInCart, bundleDiscount }) {
  const [query, setQuery] = useState('');
  const [selectedTld, setSelectedTld] = useState('.com');
  const navigate = useNavigate();

  const handleSearch = () => {
    if (!query.trim()) return;
    let finalQuery = query.trim();
    if (!finalQuery.includes('.')) {
      finalQuery += selectedTld;
    }
    navigate(`/domain/search?q=${encodeURIComponent(finalQuery)}`);
  };

  const handlePillClick = (tld) => {
    setSelectedTld(tld);
    if (query.trim()) {
      let finalQuery = query.trim();
      if (finalQuery.includes('.')) {
        finalQuery = finalQuery.substring(0, finalQuery.lastIndexOf('.')) + tld;
      } else {
        finalQuery += tld;
      }
      navigate(`/domain/search?q=${encodeURIComponent(finalQuery)}`);
    }
  };

  return (
    <section
      style={{
        background: 'linear-gradient(160deg, #020b2e 0%, #050f3a 55%, #0b1a5c 100%)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Dot grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }} />

      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: 0, left: '25%',
        width: '80vw', maxWidth: 600, height: 400, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, rgba(56,100,240,0.18) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />

      <div className="container mx-auto  relative z-10 pt-28 pb-10">

        {/* Heading */}
        <div className="text-center max-w-4xl mx-auto mb-10">

          <div className="inline-flex items-center gap-2 border border-blue-500/30 bg-blue-500/10 rounded-full px-4 py-1.5 mb-6 text-xs text-blue-300 font-semibold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Bangladesh's Fastest Hosting
          </div>

          <h1 className="font-black text-white leading-tight tracking-tight mb-5"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 6vw, 4.5rem)' }}>
            Find Your Perfect<br />
            <span style={{
              background: 'linear-gradient(90deg, #60a5fa 0%, #38bdf8 50%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Domain Name
            </span>
          </h1>

          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Search, register &amp; host — all in one place. Instant activation with 99.9% uptime guarantee.
          </p>

          {/* Search bar */}
          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.4)] overflow-hidden flex items-stretch max-w-3xl mx-auto mb-6">
            <div className="flex items-center pl-5 text-gray-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              id="domainSearchInput"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Type your domain name here..."
              className="flex-1 px-4 py-5 text-lg text-gray-800 outline-none bg-transparent placeholder-gray-400"
            />
            <div className="flex items-center gap-2 pr-2">
              <select 
                value={selectedTld}
                onChange={e => setSelectedTld(e.target.value)}
                className="hidden md:block text-sm text-gray-600 bg-gray-100 border-0 rounded-lg px-3 py-2 outline-none cursor-pointer">
                {POPULAR_TLDS.map(tld => (
                  <option key={tld} value={tld}>{tld}</option>
                ))}
              </select>
              <button
                onClick={handleSearch}
                className="flex items-center gap-2 text-white font-bold px-7 py-3.5 rounded-xl transition-all active:scale-95 hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #f97316, #ea6100)' }}
              >
                <Search size={18} />
                <span className="hidden sm:inline">Search Now</span>
              </button>
            </div>
          </div>

          {/* TLD selector pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {POPULAR_TLDS.slice(0, 7).map((tld, i) => {
              const selected = selectedTld === tld;
              return (
                <span
                  key={i}
                  onClick={() => handlePillClick(tld)}
                  className="cursor-pointer select-none px-4 py-1.5 rounded-full text-sm font-semibold transition-all border hover:border-blue-400"
                  style={selected
                    ? { background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }
                    : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)' }
                  }
                >
                  <span className="font-bold">{tld}</span>
                </span>
              );
            })}
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-gray-500 text-sm">
            {[{ Icon: ShieldCheck, t: 'Free SSL' }, { Icon: Zap, t: 'Instant Activation' }, { Icon: Headphones, t: '24/7 Support' }].map(({ Icon, t }, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <Icon size={14} className="text-blue-400" />{t}
              </span>
            ))}
          </div>
        </div>


        {/* Server image centered */}
        <div className="flex justify-center mt-4">
          <div className="relative w-full max-w-[520px] hover:scale-[1.02] transition-transform duration-700">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-16 blur-3xl rounded-full"
              style={{ background: 'rgba(56,100,240,0.35)' }} />
            <img
              src="/assets/hero_server.jpg"
              alt="Server Infrastructure"
              className="relative w-full h-auto rounded-2xl"
              style={{ boxShadow: '0 0 60px rgba(56,100,240,0.25)' }}
            />
          </div>
        </div>

      </div>

      {/* Wave divider */}
      <div className="relative z-10" style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
          <path d="M0 60 C360 0 1080 0 1440 60 L1440 60 L0 60 Z" fill="#f9fafb" />
        </svg>
      </div>

      {hasDomainInCart && bundleDiscount > 0 && (
        <div className="absolute bottom-20 left-0 right-0 z-20 text-center">
          <span className="inline-block bg-orange-500/90 backdrop-blur text-white py-2 px-6 rounded-full text-sm font-bold">
            🎉 Add hosting now and save {bundleDiscount}%!
          </span>
        </div>
      )}
    </section>
  );
}
