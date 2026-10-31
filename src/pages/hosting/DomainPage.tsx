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
  Lock
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
        title="Domain Registration in Bangladesh | Buy .COM, .NET, .BD at Best Price"
        description="Search and register your domain name at lowest price in Bangladesh. Instant activation, free DNS management, WHOIS privacy protection, and 24/7 support at Click2IT."
        keywords="domain registration bangladesh, buy domain bd, cheap domain name, .com domain price bd, click2it domain, website name bd"
        canonical="https://click2it.bd/domain"
      />

      {/* 1. Unified Dark-Navy Glassmorphic Hero Section */}
      <section className="relative bg-[#020b2e] pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
        {/* Background Image & Overlay (matching .BD Hero aesthetic) */}
        <div className="absolute inset-0">
          <img
            src="/assets/domain_hero_bg.jpg"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#020b2e]/80 via-[#050f3a]/65 to-[#020b2e]/95"></div>
        </div>

        {/* Subtle dot grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* Ambient glows */}
        <div
          style={{
            position: 'absolute',
            top: '5%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '750px',
            height: '380px',
            background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.20) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '8%',
            width: '320px',
            height: '320px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)',
            pointerEvents: 'none',
            filter: 'blur(40px)',
          }}
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 border border-blue-400/30 bg-blue-500/10 rounded-full px-4 py-1.5 mb-6 text-xs text-blue-300 font-semibold uppercase tracking-widest">
            <Globe size={14} className="text-blue-400 animate-pulse" />
            <span>Instant Domain Registration &amp; DNS Control</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
            Find Your Perfect{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #60a5fa, #38bdf8, #a78bfa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Domain Name
            </span>
          </h1>

          <p className="text-blue-200/80 text-base sm:text-lg md:text-xl mt-4 max-w-2xl mx-auto leading-relaxed font-normal">
            Search, register, and manage your domain names with ease. Get the perfect web address for your business with free WHOIS privacy.
          </p>

          {/* Glassmorphic Domain Search Box */}
          <div className="max-w-3xl mx-auto mt-8 mb-6">
            <form
              onSubmit={handleSearch}
              className="flex items-center rounded-2xl p-2 shadow-2xl transition-all"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1.5px solid rgba(255, 255, 255, 0.16)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
              }}
            >
              <div className="pl-4 pr-1 text-blue-300 shrink-0 flex items-center">
                <Search size={22} className="shrink-0" />
              </div>
              <input
                type="text"
                placeholder="Type your ideal domain name here (e.g. mybrand.com)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isSearching}
                className="flex-1 min-w-0 px-3 py-3.5 bg-transparent text-white placeholder-blue-200/50 outline-none text-base sm:text-lg font-medium"
              />
              <div className="shrink-0 flex items-center pr-1 pl-2">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="flex items-center justify-center gap-2 text-white font-bold px-6 sm:px-8 py-3.5 rounded-xl transition-all active:scale-95 hover:opacity-95 shadow-lg shadow-orange-500/25 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-70"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea6100)' }}
                >
                  {isSearching ? (
                    <Loader2 size={18} className="animate-spin shrink-0" />
                  ) : (
                    <Search size={18} className="shrink-0" />
                  )}
                  <span className="whitespace-nowrap font-bold text-sm sm:text-base">
                    {isSearching ? 'Checking...' : 'Search Now'}
                  </span>
                </button>
              </div>
            </form>

            {/* Static Popular TLD Pills (without prices) */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5 text-xs select-none">
              <span className="text-blue-300/60 font-semibold uppercase tracking-wider text-[11px] mr-1">
                Popular:
              </span>
              {STATIC_TLD_HIGHLIGHTS.map((tld) => (
                <span
                  key={tld}
                  className="px-3.5 py-1.5 rounded-full text-blue-200 font-mono select-none cursor-default"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
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
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-900/40 transition-all hover:scale-[1.02] border border-emerald-400/30"
            >
              <ShieldCheck size={17} />
              <span>Register .BD Domains in Bangladesh</span>
            </Link>

            <Link
              to="/domain/transfer"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-blue-100 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all border border-white/15 backdrop-blur-sm"
            >
              <RefreshCw size={15} />
              <span>Transfer Existing Domain</span>
            </Link>
          </div>

          {/* Trust Feature Strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 pt-6 border-t border-white/10 max-w-2xl mx-auto text-blue-200/75 text-xs sm:text-sm">
            <span className="flex items-center gap-1.5">
              <Lock size={14} className="text-emerald-400" />
              Free WHOIS Privacy
            </span>
            <span className="flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              Instant Activation
            </span>
            <span className="flex items-center gap-1.5">
              <Headphones size={14} className="text-blue-400" />
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
