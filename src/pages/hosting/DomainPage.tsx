import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { SEO } from '../../components/SEO';
import DomainPricingSection from '../hosting-sections/DomainPricingSection';
import {
  Search,
  Shield,
  ShieldCheck,
  Settings,
  RefreshCw,
  ArrowRight,
  Loader2,
  Zap,
  Headphones,
  Globe,
  HelpCircle,
  ChevronDown,
  Lock,
  Sparkles,
  CheckCircle2,
  Server
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const STATIC_TLD_HIGHLIGHTS = [
  '.com',
  '.net',
  '.org',
  '.com.bd',
  '.xyz',
  '.store',
  '.online',
];

const DOMAIN_FAQS = [
  {
    question: 'How quickly is my domain activated after purchase? (ডোমেন কেনার পর কতক্ষণে অ্যাক্টিভ হয়?)',
    answer:
      'International domains (.com, .net, .org, .xyz, .store, etc.) are registered and activated instantly within seconds of completing your payment via bKash, Nagad, or Card. You immediately receive full DNS and Nameserver management inside your Client Area. (আন্তর্জাতিক ডোমেন পেমেন্ট সম্পন্ন করার সাথে সাথেই ইনস্ট্যান্টলি অ্যাক্টিভ হয়ে যায়।)'
  },
  {
    question: 'What documents are required for .BD or .com.bd domains? (.BD ডোমেনের জন্য কী কী ডকুমেন্ট লাগে?)',
    answer:
      'For business extensions like .com.bd or .net.bd, a Trade License and National ID (NID) are required. For personal .bd or .info.bd domains, only your National ID (NID) card is needed. You can submit your application first even without documents on hand—our team will guide you through the entire process. (ব্যক্তিগত .bd ডোমেনের জন্য শুধু NID কার্ড এবং ব্যবসায়িক .com.bd ডোমেনের জন্য ট্রেড লাইসেন্স ও NID প্রয়োজন হয়।)'
  },
  {
    question: 'How can I transfer my existing domain to Click2IT? (পুরাতন ডোমেন কীভাবে Click2IT-তে ট্রান্সফার করব?)',
    answer:
      'Simply unlock your domain at your current provider, copy the EPP / Authorization Code, and submit it on our Domain Transfer page. Your website and emails will experience zero downtime, and your domain validity will automatically be extended by 1 full year! (পুরাতন প্রোভাইডার থেকে ডোমেন আনলক করে EPP কোড দিয়ে আমাদের ট্রান্সফার পেজে আবেদন করলেই ১ বছরের মেয়াদ বৃদ্ধিসহ সহজেই ট্রান্সফার হয়ে যাবে।)'
  },
  {
    question: 'Can I connect my domain to hosting for free? (ডোমেনের সাথে হোস্টিং ফ্রিতে কানেক্ট করা যায় কি?)',
    answer:
      'Yes, 100% free! Every domain comes with a full-featured DNS Management panel where you can update Nameservers or configure A, CNAME, MX, and TXT records at no cost. If you buy Click2IT Hosting alongside your domain, our system links them automatically and gives you an extra 10% bundle discount! (হ্যাঁ, সম্পূর্ণ ফ্রিতে যেকোনো হোস্টিংয়ের সাথে DNS ও Nameserver কানেক্ট করতে পারবেন।)'
  },
  {
    question: 'Is WHOIS Privacy Protection included for free? (ডোমেন প্রাইভেসি প্রোটেকশন কি ফ্রি?)',
    answer:
      'Absolutely! We include Free Lifetime WHOIS Privacy Protection with every eligible domain registration so your personal name, phone number, and email address remain hidden from public spammers and scrapers.'
  }
];

const DomainPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTld = searchParams.get('tld') || '';

  const [searchQuery, setSearchQuery] = useState(
    preselectedTld ? `.${preselectedTld.replace(/^\./, '')}` : ''
  );
  const [isSearching] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    if (preselectedTld) {
      const tld = preselectedTld.startsWith('.') ? preselectedTld : `.${preselectedTld}`;
      setSearchQuery(tld);
    }
  }, [preselectedTld]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      toast.error('Please enter a domain name');
      return;
    }

    navigate(`/domain/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <Layout fullWidth>
      <SEO
        title="Domain Name Registration - Cheap .COM, .NET, .ORG & .BD Domains | Click2IT"
        description="Search and register domain names with instant DNS management, free WHOIS privacy protection, domain locking, and 24/7 support. Fast activation for .COM, .NET, .ORG, and .BD."
        keywords="buy domain, domain registration, domain name search, cheap com domain, .net domain, .bd domain registration, domain transfer"
        canonical="https://click2it.bd/domain"
      />

      {/* Custom Keyframe Animations for Hero Vibe */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(10px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.45; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.75; transform: translateX(-50%) scale(1.06); }
        }
      `}</style>

      {/* 1. Unified Dark-Navy Glassmorphic Hero Section */}
      <section className="relative bg-[#020b2e] pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        {/* Background Image & Vibrant Cyber Overlay */}
        <div className="absolute inset-0">
          <img
            src="/assets/domain_hero_bg.jpg"
            alt=""
            className="w-full h-full object-cover object-bottom scale-105 transition-transform duration-1000"
            style={{ filter: 'saturate(1.35) contrast(1.1) brightness(1.08)' }}
          />
          {/* Balanced multi-stop overlay so the glowing globe & fiber lines pop through */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#020b2e]/70 via-[#04103a]/35 to-[#020b2e]/80"></div>
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 62%, rgba(6, 182, 212, 0.22) 0%, rgba(59, 130, 246, 0.14) 35%, rgba(2, 11, 46, 0.65) 80%)',
            }}
          />
        </div>

        {/* Subtle cyber grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage:
              'linear-gradient(to right, rgba(56, 189, 248, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.05) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 35%, transparent 80%)',
          }}
        />

        {/* Animated Top & Center Aurora Glows */}
        <div
          style={{
            position: 'absolute',
            top: '8%',
            left: '50%',
            width: '850px',
            height: '420px',
            background:
              'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.26) 0%, rgba(99, 102, 241, 0.14) 45%, transparent 72%)',
            pointerEvents: 'none',
            filter: 'blur(30px)',
            animation: 'pulseGlow 7s ease-in-out infinite',
          }}
        />

        {/* Floating Decorative Glass Cards (Desktop Vibe Elements) */}
        <div
          className="hidden xl:flex items-center gap-3 absolute left-[5%] top-[34%] z-10 px-4 py-3 rounded-2xl border border-cyan-400/25 bg-[#061540]/65 backdrop-blur-md shadow-2xl shadow-cyan-500/10 select-none pointer-events-none"
          style={{ animation: 'floatSlow 5s ease-in-out infinite' }}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30">
            <CheckCircle2 size={18} />
          </div>
          <div className="text-left">
            <div className="text-[11px] uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Instant Lookup
            </div>
            <div className="text-xs font-extrabold text-white font-mono">yourbrand.com</div>
          </div>
        </div>

        <div
          className="hidden xl:flex items-center gap-3 absolute right-[5%] top-[32%] z-10 px-4 py-3 rounded-2xl border border-indigo-400/25 bg-[#061540]/65 backdrop-blur-md shadow-2xl shadow-indigo-500/10 select-none pointer-events-none"
          style={{ animation: 'floatReverse 5.5s ease-in-out infinite' }}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
            <Server size={18} />
          </div>
          <div className="text-left">
            <div className="text-[11px] uppercase tracking-wider text-indigo-300 font-bold">
              Anycast DNS
            </div>
            <div className="text-xs font-extrabold text-white">99.99% Uptime SLA</div>
          </div>
        </div>

        <div
          className="hidden xl:flex items-center gap-2.5 absolute left-[8%] bottom-[20%] z-10 px-3.5 py-2 rounded-xl border border-emerald-400/25 bg-[#061540]/60 backdrop-blur-md shadow-xl select-none pointer-events-none"
          style={{ animation: 'floatReverse 6s ease-in-out infinite' }}
        >
          <ShieldCheck size={16} className="text-emerald-400" />
          <span className="text-xs font-bold text-emerald-100">DNSSEC &amp; Theft Lock</span>
        </div>

        <div
          className="hidden xl:flex items-center gap-2.5 absolute right-[8%] bottom-[20%] z-10 px-3.5 py-2 rounded-xl border border-amber-400/25 bg-[#061540]/60 backdrop-blur-md shadow-xl select-none pointer-events-none"
          style={{ animation: 'floatSlow 6.5s ease-in-out infinite' }}
        >
          <Sparkles size={16} className="text-amber-400" />
          <span className="text-xs font-bold text-amber-100">500+ Global Extensions</span>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 border border-cyan-400/35 bg-cyan-500/10 backdrop-blur-md rounded-full px-4 py-1.5 mb-6 text-xs text-cyan-200 font-semibold uppercase tracking-widest shadow-lg shadow-cyan-950/50">
            <Globe size={14} className="text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
            <span>Instant Domain Registration &amp; DNS Control</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            Find Your Perfect{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #38bdf8 0%, #60a5fa 50%, #c084fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 25px rgba(56,189,248,0.35))',
              }}
            >
              Domain Name
            </span>
          </h1>

          <p className="text-blue-100/90 text-base sm:text-lg md:text-xl mt-4 max-w-2xl mx-auto leading-relaxed font-normal drop-shadow">
            Search, register, and manage your domain names with ease. Get the perfect web address for your business with free WHOIS privacy.
          </p>

          {/* Glassmorphic Domain Search Box with Glowing Aura */}
          <div className="max-w-3xl mx-auto mt-9 mb-6 relative group">
            {/* Glowing neon aura behind search bar */}
            <div
              className="absolute -inset-1 rounded-3xl opacity-70 group-hover:opacity-100 transition duration-500 blur-xl pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, rgba(56,189,248,0.35), rgba(59,130,246,0.45), rgba(249,115,22,0.35))',
              }}
            />

            <form
              onSubmit={handleSearch}
              className="relative flex items-center rounded-2xl p-1.5 sm:p-2 shadow-2xl transition-all"
              style={{
                background: 'rgba(8, 20, 62, 0.72)',
                border: '1.5px solid rgba(125, 211, 252, 0.30)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,255,255,0.18)',
              }}
            >
              <div className="pl-3 sm:pl-4 pr-1 text-cyan-300 shrink-0 flex items-center">
                <Search size={20} className="shrink-0 sm:w-[22px] sm:h-[22px]" />
              </div>
              <input
                type="text"
                placeholder="Search domain name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isSearching}
                className="flex-1 min-w-0 px-2 sm:px-3 py-2.5 sm:py-3.5 bg-transparent text-white placeholder-blue-200/60 outline-none text-sm sm:text-base md:text-lg font-medium"
              />
              <div className="shrink-0 flex items-center pr-0.5 sm:pr-1 pl-1 sm:pl-2">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 text-white font-bold px-3.5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl transition-all active:scale-95 hover:brightness-110 shadow-lg shadow-orange-500/30 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-70 text-xs sm:text-base"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                >
                  {isSearching ? (
                    <Loader2 size={16} className="animate-spin shrink-0 sm:w-[18px] sm:h-[18px]" />
                  ) : (
                    <Search size={16} className="shrink-0 sm:w-[18px] sm:h-[18px]" />
                  )}
                  <span className="hidden sm:inline font-bold">
                    {isSearching ? 'Checking...' : 'Search Now'}
                  </span>
                  <span className="sm:hidden font-bold">
                    {isSearching ? '...' : 'Search'}
                  </span>
                </button>
              </div>
            </form>

            {/* Static Popular TLD Pills (without prices) */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5 text-xs select-none relative z-10">
              <span className="text-cyan-300/80 font-bold uppercase tracking-wider text-[11px] mr-1">
                Popular:
              </span>
              {STATIC_TLD_HIGHLIGHTS.map((tld) => (
                <span
                  key={tld}
                  className="px-3.5 py-1.5 rounded-full text-white font-mono font-semibold select-none cursor-default backdrop-blur-md shadow-sm"
                  style={{
                    background: 'rgba(14, 35, 94, 0.65)',
                    border: '1px solid rgba(125, 211, 252, 0.24)',
                  }}
                >
                  {tld}
                </span>
              ))}
            </div>
          </div>

          {/* Action Links & Trust Strip */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/domain/bd"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-6 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-900/50 transition-all hover:scale-[1.02] border border-emerald-300/40"
            >
              <ShieldCheck size={17} />
              <span>Register .BD Domains in Bangladesh</span>
            </Link>

            <Link
              to="/domain/transfer"
              className="inline-flex items-center justify-center gap-2 bg-[#0a1d56]/70 hover:bg-[#0f2975]/80 text-blue-100 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all border border-cyan-400/25 backdrop-blur-md shadow-lg"
            >
              <RefreshCw size={15} className="text-cyan-300" />
              <span>Transfer Existing Domain</span>
            </Link>
          </div>

          {/* Trust Feature Strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 pt-6 border-t border-cyan-400/15 max-w-2xl mx-auto text-blue-100/90 text-xs sm:text-sm font-medium">
            <span className="flex items-center gap-1.5">
              <Lock size={14} className="text-emerald-400" />
              Free WHOIS Privacy
            </span>
            <span className="flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              Instant Activation
            </span>
            <span className="flex items-center gap-1.5">
              <Headphones size={14} className="text-cyan-400" />
              24/7 Local Support
            </span>
          </div>
        </div>
      </section>

      {/* 2. Domain Pricing Section */}
      <DomainPricingSection />

      {/* 3. Why Register With Us Section */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-900">
              Why Register With Us?
            </h2>
            <p className="mt-3 md:mt-4 max-w-2xl text-base md:text-lg text-gray-500 mx-auto">
              Everything you need to manage your domains effectively and securely.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
            {/* Card 1 */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full blur-2xl transition-transform group-hover:scale-110"></div>
              <div className="bg-white/20 backdrop-blur-sm w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-4 md:mb-6 relative z-10">
                <Shield className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3 relative z-10">
                Free Domain Privacy
              </h3>
              <p className="text-blue-100 relative z-10 text-sm md:text-base leading-relaxed">
                Keep your personal information safe. We include free WHOIS privacy protection with every eligible domain registration.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full blur-2xl transition-transform group-hover:scale-110"></div>
              <div className="bg-white/20 backdrop-blur-sm w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-4 md:mb-6 relative z-10">
                <Settings className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3 relative z-10">
                Easy DNS Management
              </h3>
              <p className="text-blue-100 relative z-10 text-sm md:text-base leading-relaxed">
                Route your domain to any website, email service, or hosting provider with our powerful, intuitive DNS control panel.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full blur-2xl transition-transform group-hover:scale-110"></div>
              <div className="bg-white/20 backdrop-blur-sm w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-4 md:mb-6 relative z-10">
                <RefreshCw className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3 relative z-10">
                Auto-Renewal Protection
              </h3>
              <p className="text-blue-100 relative z-10 text-sm md:text-base leading-relaxed">
                Never lose your domain. Set up auto-renewal and expiry alerts to ensure your web address stays yours year after year.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Domain FAQ Section (Frequently Asked Questions) */}
      <section className="py-14 md:py-20 bg-slate-50 border-t border-slate-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold uppercase tracking-wider mb-3">
              <HelpCircle size={14} /> Domain Knowledgebase
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-500 max-w-xl mx-auto">
              Common questions about domain registration, instant activation, .BD requirements, and free DNS management.
            </p>
          </div>

          <div className="space-y-4">
            {DOMAIN_FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? 'border-blue-500/40 shadow-md shadow-blue-500/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isOpen
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <HelpCircle size={17} />
                      </div>
                      <span className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                        {faq.question}
                      </span>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 ml-11">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Domain Transfer Banner */}
      <section className="py-10 md:py-14 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-blue-700 rounded-2xl md:rounded-3xl p-6 md:p-12 lg:flex lg:items-center lg:justify-between shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 md:w-80 md:h-80 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-48 h-48 md:w-64 md:h-64 bg-blue-400 rounded-full opacity-20 blur-3xl"></div>

            <div className="relative z-10 lg:w-0 lg:flex-1 mb-6 lg:mb-0">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white">
                Already have a domain?
              </h2>
              <p className="mt-3 md:mt-4 max-w-3xl text-sm sm:text-base md:text-lg text-blue-100">
                Transfer to us and save! Enjoy lower renewal rates, free privacy protection, and a consolidated dashboard for all your assets.
              </p>
            </div>
            <div className=" lg:ml-8 relative z-10 flex-shrink-0">
              <button
                onClick={() => navigate('/domain/transfer')}
                className="bg-white hover:bg-gray-50 text-blue-600 font-bold py-3.5 px-6 md:py-4 md:px-8 rounded-full shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2 w-full sm:w-auto justify-center cursor-pointer"
              >
                Transfer Domain Now <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default DomainPage;
