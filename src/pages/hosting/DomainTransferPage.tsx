import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { Layout } from '../../components/Layout';
import { SEO } from '../../components/SEO';
import {
  ArrowRight,
  Lock,
  Unlock,
  Key,
  RefreshCw,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  ShieldCheck,
  Search,
  Globe,
  Zap,
  Clock,
  HelpCircle,
  ChevronRight,
  Server,
  Award
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { checkTransferEligibility, getTldPricing } from '../../services/domainApi';
import { getDomainPricing } from '../../services/hostingApi';
import { BdTransferModal } from '../../components/hosting/BdTransferModal';
import { getFriendlyErrorMessage } from '../../utils/errorUtils';

const DomainTransferPage = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
  const [domainName, setDomainName] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [showAuthCode, setShowAuthCode] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showBdModal, setShowBdModal] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [eligibilityError, setEligibilityError] = useState('');
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [eligibilityReason, setEligibilityReason] = useState('');
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [supportedTlds, setSupportedTlds] = useState<string[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    getDomainPricing().then(pricing => {
      if (!isMounted) return;
      if (pricing && pricing.length > 0) {
        setSupportedTlds(pricing.map(p => {
          const ptld = p.tld.toLowerCase();
          return ptld.startsWith('.') ? ptld : `.${ptld}`;
        }));
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const normalizeDomain = (input: string): string => {
    return input.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '');
  };

  const isValidDomain = (domain: string): boolean => {
    const regex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return regex.test(domain);
  };

  const handleCheckEligibility = async (targetDomain?: string): Promise<boolean> => {
    const raw = targetDomain || domainName;
    setValidationError('');
    setEligibilityError('');
    setIsEligible(null);

    if (!raw.trim()) {
      setValidationError('Please enter the domain name you want to transfer');
      return false;
    }

    const normalized = normalizeDomain(raw);
    if (!isValidDomain(normalized)) {
      setValidationError('Please enter a valid domain name (e.g., example.com)');
      return false;
    }

    if (normalized.endsWith('.bd')) {
      setShowBdModal(true);
      return false;
    }

    setIsChecking(true);
    try {
      const eligibilityResult = await checkTransferEligibility(normalized);
      if (!eligibilityResult.eligible) {
        setIsEligible(false);
        setEligibilityError(eligibilityResult.reason || 'This domain is not eligible for transfer.');
        return false;
      }

      const tld = normalized.split('.').pop() || '';
      let transferPrice = 0;
      try {
        const pricing = await getTldPricing(tld);
        transferPrice = pricing?.transferPrice || 0;
      } catch (e) {
        console.warn('Failed to get transfer price from getTldPricing:', e);
      }

      if (transferPrice <= 0) {
        try {
          const allPricing = await getDomainPricing();
          const found = allPricing.find(p => p.tld.replace(/^\./, '').toLowerCase() === tld.toLowerCase());
          if (found && found.transferPrice > 0) {
            transferPrice = found.transferPrice;
          }
        } catch (e) {
          console.warn('Failed to get transfer price from getDomainPricing:', e);
        }
      }

      setIsEligible(true);
      setLivePrice(transferPrice > 0 ? transferPrice : 1480);
      setEligibilityReason(eligibilityResult.reason || 'Domain is active on registry and eligible for transfer.');
      toast.success(`${normalized} is eligible! Enter your Auth/EPP Code.`);
      return true;
    } catch (error: any) {
      const msg = error?.message?.includes('fetch failed')
        ? 'Network request failed. Please check your internet connection or verify the domain is unlocked.'
        : error?.message || 'Failed to verify transfer eligibility.';
      setEligibilityError(getFriendlyErrorMessage(error, 'Unable to verify transfer eligibility with the registry at this time. Please ensure the domain is active and unlocked.'));
      setIsEligible(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!domainName.trim()) {
      setValidationError('Please enter the domain name you want to transfer');
      return;
    }

    const normalized = normalizeDomain(domainName);
    if (!isValidDomain(normalized)) {
      setValidationError('Please enter a valid domain name (e.g., example.com)');
      return;
    }

    if (normalized.endsWith('.bd')) {
      setShowBdModal(true);
      return;
    }

    if (!isEligible) {
      const ok = await handleCheckEligibility(normalized);
      if (!ok) return;
    }

    if (!authCode.trim() || authCode.trim().length < 3) {
      setValidationError('Please enter your valid Authorization / EPP Code from your current registrar.');
      return;
    }

    if (!termsAccepted) {
      setValidationError('Please confirm that your domain is unlocked and accept the transfer authorization.');
      return;
    }

    setIsProcessing(true);
    try {
      const tld = normalized.split('.').pop() || '';
      const finalPrice = livePrice || 1480;

      const transferProduct = {
        id: `domain_transfer_${normalized}`,
        name: `Domain Transfer — ${normalized}`,
        description: 'Includes 1 Year Extension & Free WHOIS Privacy',
        price: finalPrice,
        category: 'Hosting & Domains',
        stock: 9999,
        images: [],
        createdAt: new Date().toISOString(),
        itemType: 'domain_transfer' as const,
        domain: normalized,
        domainTld: tld,
        authCode: authCode.trim(),
        eppCode: authCode.trim(),
        termYears: 1,
      };
      
      addToCart(transferProduct as any);
      toast.success(`${normalized} transfer added to cart!`);
      navigate('/hosting/checkout');
    } catch (error: any) {
      setValidationError(error?.message || 'Failed to process transfer. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout fullWidth>
      <SEO 
        title="Domain Transfer to Click2IT | Free 1-Year Extension"
        description="Transfer your existing domain to Click2IT seamlessly without downtime. Get free 1-year extension, free WHOIS privacy, and low renewal prices in Bangladesh."
        keywords="domain transfer bangladesh, transfer domain bd, move domain to click2it, cheap domain renewal bd"
        canonical="https://click2it.bd/domain/transfer"
      />
      
      {/* Premium Enterprise Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#060E1E] via-[#0A172E] to-[#0F2142] text-white pt-14 pb-24 sm:pt-20 sm:pb-32">
        {/* Background Ambient Glows & Subtle Grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-blue-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-10 w-[400px] h-[260px] bg-indigo-500/15 rounded-full blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
              backgroundSize: '28px 28px',
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/25 text-blue-300 text-xs sm:text-sm font-semibold tracking-wide mb-6 shadow-inner">
            <Sparkles size={15} className="text-blue-400" />
            <span>Seamless Domain Migration &bull; +1 Year Free Renewal Included</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white">
            Transfer Your Domain to{' '}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              Click2IT
            </span>
          </h1>

          <p className="mt-4 sm:mt-5 max-w-2xl mx-auto text-sm sm:text-lg text-slate-300 leading-relaxed">
            Consolidate your domains under one reliable roof with transparent BDT renewal pricing, zero website downtime, and complimentary WHOIS privacy protection.
          </p>

          {/* Hero Trust Pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-sm text-xs sm:text-sm text-slate-200 font-medium">
              <RefreshCw size={15} className="text-cyan-400 shrink-0" />
              <span>Free +1 Year Extension</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-sm text-xs sm:text-sm text-slate-200 font-medium">
              <Zap size={15} className="text-amber-400 shrink-0" />
              <span>100% Zero Downtime</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-sm text-xs sm:text-sm text-slate-200 font-medium">
              <Shield size={15} className="text-emerald-400 shrink-0" />
              <span>Free WHOIS Privacy</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 backdrop-blur-sm text-xs sm:text-sm text-slate-200 font-medium">
              <Award size={15} className="text-blue-400 shrink-0" />
              <span>Full DNS Control</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Transfer Console Section (Overlapping Hero) */}
      <section className="relative z-10 -mt-14 sm:-mt-20 pb-16 sm:pb-24 bg-[#F8FAFC] border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12)] overflow-hidden border border-slate-200/90">
            <div className="flex flex-col lg:flex-row">
              
              {/* Left Side: Enterprise Benefits & Checklist */}
              <div className="lg:w-5/12 bg-gradient-to-br from-[#0F244A] via-[#132E5E] to-[#1E3A8A] p-7 sm:p-9 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-[11px] font-bold tracking-wider uppercase mb-5 text-cyan-200">
                    <Globe size={13} /> Why Switch to Us
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                    Effortless Domain Management
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-200/85 mb-7 leading-relaxed">
                    Everything you need to keep your brand online, secure, and simple to renew in local currency.
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.06] border border-white/10">
                      <div className="w-9 h-9 rounded-xl bg-cyan-400/15 border border-cyan-400/30 flex items-center justify-center shrink-0 mt-0.5">
                        <RefreshCw className="text-cyan-300" size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">+1 Year Renewal Included</h4>
                        <p className="text-xs text-blue-100/80 mt-0.5 leading-relaxed">
                          We add 1 full year on top of your existing expiry date—you never lose remaining time.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.06] border border-white/10">
                      <div className="w-9 h-9 rounded-xl bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Shield className="text-emerald-300" size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Free ID & WHOIS Privacy</h4>
                        <p className="text-xs text-blue-100/80 mt-0.5 leading-relaxed">
                          Shield your personal name, email, and phone number from public WHOIS scrapers.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.06] border border-white/10">
                      <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Server className="text-amber-300" size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Uninterrupted DNS & Email</h4>
                        <p className="text-xs text-blue-100/80 mt-0.5 leading-relaxed">
                          Your existing nameservers stay intact during transfer so your website and email never go offline.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.06] border border-white/10">
                      <div className="w-9 h-9 rounded-xl bg-blue-400/15 border border-blue-400/30 flex items-center justify-center shrink-0 mt-0.5">
                        <ShieldCheck className="text-blue-300" size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Pay Easily in BDT</h4>
                        <p className="text-xs text-blue-100/80 mt-0.5 leading-relaxed">
                          Renew anytime using bKash, Nagad, Rocket, or local bank cards without USD endorsement hassle.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 mt-8 pt-5 border-t border-white/15 flex items-center justify-between gap-3 text-xs text-blue-200/90">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-emerald-300 shrink-0" />
                    <span>256-Bit Encrypted EPP Transfer</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-[11px] font-semibold text-white">
                    ICANN Compliant
                  </span>
                </div>
              </div>
              
              {/* Right Side: Interactive Transfer Console */}
              <div className="lg:w-7/12 p-6 sm:p-9 lg:p-11 flex flex-col justify-between">
                <div>
                  {/* Mini Step Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-5 mb-6 border-b border-slate-100">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-0.5">
                        Domain Transfer Console
                      </span>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                        Start Your Domain Transfer
                      </h2>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                      <Clock size={13} className="text-blue-600" />
                      <span>Takes ~2 mins</span>
                    </div>
                  </div>
                  
                  <form onSubmit={handleTransfer} className="space-y-6">
                    {validationError && (
                      <div className="bg-red-50/90 border border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                          <XCircle className="text-red-600" size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-red-800 mb-0.5">Action Required</p>
                          <p className="text-sm text-red-700 font-medium">{validationError}</p>
                        </div>
                      </div>
                    )}

                    {eligibilityError && (
                      <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                          <AlertCircle className="text-amber-600" size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-0.5">Transfer Eligibility Notice</p>
                          <p className="text-sm text-amber-800 font-medium">{eligibilityError}</p>
                        </div>
                      </div>
                    )}

                    {/* Step 1: Domain Name Input & Quick Check */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 transition-all focus-within:bg-white focus-within:border-blue-300 focus-within:shadow-md focus-within:shadow-blue-500/5">
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="domainName" className="flex items-center gap-2 text-sm font-bold text-slate-800">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold inline-flex items-center justify-center">
                            1
                          </span>
                          <span>Domain Name to Transfer <span className="text-red-500">*</span></span>
                        </label>
                        {isEligible && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 size={12} /> Ready to Transfer
                          </span>
                        )}
                      </div>

                      <div className="relative flex items-center mt-2">
                        <Globe className="absolute left-3.5 text-slate-400 pointer-events-none" size={18} />
                        <input
                          type="text"
                          id="domainName"
                          value={domainName}
                          onChange={(e) => {
                            setDomainName(normalizeDomain(e.target.value));
                            setIsEligible(null);
                            setLivePrice(null);
                            setValidationError('');
                            setEligibilityError('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isEligible) {
                              e.preventDefault();
                              handleCheckEligibility();
                            }
                          }}
                          placeholder="example.com"
                          className="w-full pl-10 pr-36 py-3.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm sm:text-base font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleCheckEligibility()}
                          disabled={isChecking || !domainName.trim()}
                          className="absolute right-1.5 px-4 py-2.5 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          {isChecking ? (
                            <>
                              <RefreshCw className="animate-spin" size={14} />
                              <span>Checking...</span>
                            </>
                          ) : (
                            <>
                              <Search size={14} />
                              <span>Check Domain</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Enter your domain without <code className="text-slate-700 bg-slate-200/70 px-1 py-0.5 rounded">www</code> or <code className="text-slate-700 bg-slate-200/70 px-1 py-0.5 rounded">https://</code> to check transfer status & price.
                      </p>
                    </div>

                    {/* .BD Notice */}
                    {domainName.endsWith('.bd') && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl bg-white w-10 h-10 rounded-xl border border-emerald-200 flex items-center justify-center shrink-0 shadow-sm">
                            🇧🇩
                          </span>
                          <div>
                            <p className="text-sm font-bold text-emerald-950">.BD National Domain Detected</p>
                            <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                              .BD domains are transferred via official document verification (no EPP code required).
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowBdModal(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shrink-0"
                        >
                          Start .BD Transfer <ArrowRight size={14} />
                        </button>
                      </div>
                    )}

                    {/* Live Eligibility & Price Card */}
                    {isEligible && (
                      <div className="bg-gradient-to-br from-emerald-50 via-teal-50/70 to-emerald-50 border border-emerald-200/90 rounded-2xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/20">
                              <CheckCircle2 size={22} />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base font-extrabold text-emerald-950">{domainName}</span>
                                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                                  Eligible for Transfer
                                </span>
                              </div>
                              <p className="text-xs text-emerald-800 mt-1">{eligibilityReason}</p>
                            </div>
                          </div>
                          {livePrice !== null && (
                            <div className="sm:text-right bg-white/90 border border-emerald-200/80 px-4 py-2.5 rounded-xl shrink-0">
                              <span className="text-[11px] uppercase tracking-wider text-emerald-700 block font-bold">
                                Transfer + 1 Yr Renewal
                              </span>
                              <span className="text-xl sm:text-2xl font-black text-emerald-950">
                                ৳{livePrice.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3.5 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-emerald-900 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Check size={14} className="text-emerald-600 shrink-0" /> +1 Year Free Extension
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Check size={14} className="text-emerald-600 shrink-0" /> Free WHOIS Privacy
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Check size={14} className="text-emerald-600 shrink-0" /> No Website Downtime
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Authorization / EPP Code Input */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 transition-all focus-within:bg-white focus-within:border-blue-300 focus-within:shadow-md focus-within:shadow-blue-500/5">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <label htmlFor="authCode" className="flex items-center gap-2 text-sm font-bold text-slate-800">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold inline-flex items-center justify-center">
                            2
                          </span>
                          <span>Authorization / EPP Code <span className="text-red-500">*</span></span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowHelpModal(true)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <HelpCircle size={13} /> Where do I find my EPP code?
                        </button>
                      </div>

                      <div className="relative mt-2">
                        <Key className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" size={18} />
                        <input
                          type={showAuthCode ? 'text' : 'password'}
                          id="authCode"
                          value={authCode}
                          onChange={(e) => {
                            setAuthCode(e.target.value);
                            setValidationError('');
                          }}
                          placeholder="Enter your Auth / EPP secret key"
                          className="w-full pl-10 pr-12 py-3.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm font-mono text-slate-900"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowAuthCode(!showAuthCode)}
                          className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                          title={showAuthCode ? 'Hide code' : 'Show code'}
                        >
                          {showAuthCode ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
                        <Lock size={13} className="text-emerald-600 shrink-0" />
                        <span>কোডটি সম্পূর্ণ এনক্রিপ্টেড অবস্থায় পাঠানো হবে এবং সাধারণ লগে প্রকাশ করা হবে না।</span>
                      </div>
                    </div>

                    {/* Step 3: Terms & Domain Unlock Confirmation */}
                    <div className="bg-blue-50/50 border border-blue-200/70 rounded-2xl p-4 transition-colors hover:bg-blue-50/80">
                      <label className="flex items-start gap-3.5 cursor-pointer select-none">
                        <div className="flex items-center h-5 mt-0.5">
                          <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            required
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                          />
                        </div>
                        <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                          আমি নিশ্চিত করছি যে ডোমেনটি পূর্ববর্তী রেজিস্ট্রারে <strong className="text-slate-900">আনলক (Registrar Lock OFF)</strong> করা আছে এবং আমি ১ বছরের মেয়াদ বৃদ্ধিসহ ট্রান্সফার অর্ডারের শর্তাবলিতে সম্মতি দিচ্ছি।
                        </span>
                      </label>
                    </div>

                    {/* Primary CTA Submit Button */}
                    <button 
                      type="submit"
                      disabled={isProcessing || isChecking}
                      className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 flex justify-center items-center gap-2.5 disabled:opacity-70 text-sm sm:text-base shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="animate-spin" size={18} />
                          <span>Processing Transfer Order...</span>
                        </>
                      ) : isChecking ? (
                        <>
                          <RefreshCw className="animate-spin" size={18} />
                          <span>Verifying Domain Eligibility...</span>
                        </>
                      ) : (
                        <>
                          <span>Continue to Secure Checkout</span>
                          {livePrice !== null && (
                            <span className="px-2.5 py-0.5 rounded-lg bg-white/20 text-white text-xs sm:text-sm font-extrabold">
                              ৳{livePrice.toLocaleString()}
                            </span>
                          )}
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Pre-Transfer Checklist Banner */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Unlock size={20} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">1. Disable Registrar Lock</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Turn off "Transfer Lock" or "Domain Theft Protection" at your current provider.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">2. 60-Day ICANN Rule</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Ensure the domain was registered or last transferred more than 60 days ago.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Key size={20} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">3. Valid EPP / Auth Code</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Copy the exact EPP code from your old registrar to authorize the move.
                </p>
              </div>
            </div>
          </div>

          {/* .BD Transfer Assistance Card */}
          <div className="mt-8 bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start gap-4 sm:gap-5 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-3xl shrink-0 shadow-inner">
                🇧🇩
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h4 className="text-lg sm:text-xl font-extrabold text-white">
                    Transferring a .BD or .COM.BD Domain?
                  </h4>
                  <span className="text-[11px] uppercase font-bold tracking-wider px-3 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-200">
                    BTCL Managed Transfer
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-100/85 mt-1.5 max-w-2xl leading-relaxed">
                  National .BD domains (.bd, .com.bd, .net.bd, .org.bd) are transferred through BTCL document verification (NID & authorization letter) instead of an EPP code. Our dedicated specialists handle the entire paperwork for you.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBdModal(true)}
              className="relative z-10 whitespace-nowrap px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              Apply for .BD Transfer <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* How It Works - 3 Step Visual Workflow */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full">
              Simple 3-Step Process
            </span>
            <h2 className="mt-4 text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              How Domain Transfer Works
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-500 leading-relaxed">
              Moving your domain to Click2IT is automated and completely safe. Follow these three steps to complete your migration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Step 1 */}
            <div className="group relative bg-slate-50/70 hover:bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/80 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
                  <Unlock size={26} />
                </div>
                <span className="text-3xl font-black text-slate-200 group-hover:text-blue-100 transition-colors">
                  01
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2.5">
                Unlock Your Domain
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Log in to your current registrar (e.g., Namecheap, GoDaddy, Hostinger) and turn off the <strong>Registrar Lock / Transfer Lock</strong> option.
              </p>
            </div>

            {/* Step 2 */}
            <div className="group relative bg-slate-50/70 hover:bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/80 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                  <Key size={26} />
                </div>
                <span className="text-3xl font-black text-slate-200 group-hover:text-indigo-100 transition-colors">
                  02
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2.5">
                Get Auth / EPP Code
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Request your secret <strong>Authorization / EPP Code</strong> from your old provider and paste it into Step 2 of the transfer console above.
              </p>
            </div>

            {/* Step 3 */}
            <div className="group relative bg-slate-50/70 hover:bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/80 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                  <CheckCircle2 size={26} />
                </div>
                <span className="text-3xl font-black text-slate-200 group-hover:text-emerald-100 transition-colors">
                  03
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2.5">
                Complete Checkout & Relax
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Complete your payment at checkout. Our system automatically initiates the registry transfer and adds <strong>1 full year</strong> to your domain expiry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-24 bg-[#F8FAFC] border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3.5 py-1.5 rounded-full">
              Got Questions?
            </span>
            <h2 className="mt-4 text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-slate-500">
              Everything you need to know before transferring your domain to Click2IT.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 hover:border-blue-200 transition-colors">
              <h4 className="text-base font-bold text-slate-900 mb-2 flex items-start gap-2.5">
                <ChevronRight size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <span>How long does a domain transfer take?</span>
              </h4>
              <p className="text-slate-600 text-sm leading-relaxed pl-6">
                Depending on your current registrar, a domain transfer typically completes within 5 to 7 days. If your old registrar allows manual transfer approval, it can finish within a few hours.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 hover:border-blue-200 transition-colors">
              <h4 className="text-base font-bold text-slate-900 mb-2 flex items-start gap-2.5">
                <ChevronRight size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <span>Will my website or email go down?</span>
              </h4>
              <p className="text-slate-600 text-sm leading-relaxed pl-6">
                No. Your existing DNS records and nameservers remain unchanged during the transfer, so your website and business emails continue working without any interruption.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 hover:border-blue-200 transition-colors">
              <h4 className="text-base font-bold text-slate-900 mb-2 flex items-start gap-2.5">
                <ChevronRight size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <span>Do I lose my remaining registration period?</span>
              </h4>
              <p className="text-slate-600 text-sm leading-relaxed pl-6">
                Never! When you transfer your domain to Click2IT, 1 full year is added directly on top of your current expiration date.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 hover:border-blue-200 transition-colors">
              <h4 className="text-base font-bold text-slate-900 mb-2 flex items-start gap-2.5">
                <ChevronRight size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <span>Can I transfer an expired domain?</span>
              </h4>
              <p className="text-slate-600 text-sm leading-relaxed pl-6">
                Yes, as long as the domain is still within its standard grace period and has not entered Redemption status, you can unlock it and transfer it using your EPP code.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Upgraded Help Modal with Registrar Quick Guide */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-100">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    Where do I get my Auth / EPP Code?
                  </h3>
                  <p className="text-xs text-slate-500">Quick guide for popular domain registrars</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <XCircle size={22} />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <p className="leading-relaxed">
                Your <strong>Auth/EPP Code</strong> is a security key provided by your current domain registrar to verify that you are the rightful owner authorizing the transfer.
              </p>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <p className="text-xs font-bold text-slate-900">Namecheap</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Domain List &rarr; Manage &rarr; <strong>Sharing &amp; Transfer</strong> tab &rarr; Unlock Domain &rarr; Click <strong>Auth Code</strong>.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <p className="text-xs font-bold text-slate-900">GoDaddy</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Domain Settings &rarr; Turn off <strong>Domain Lock</strong> &rarr; Click <strong>Transfer domain away from GoDaddy</strong> to get the code.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <p className="text-xs font-bold text-slate-900">Hostinger / Other Providers</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Open Domain Overview &rarr; Disable <strong>Transfer Lock</strong> &rarr; Copy the <strong>EPP / Secret Key</strong> shown on screen or sent to your email.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3.5 text-xs text-blue-900">
                <strong>Need help?</strong> If you can't locate your EPP code, contact your current registrar's support or reach out to our team for free migration assistance.
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="mt-6 w-full bg-slate-900 hover:bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm transition-colors cursor-pointer"
            >
              Got It, Back to Transfer
            </button>
          </div>
        </div>
      )}

      {/* BTCL .BD Manual Transfer Modal */}
      <BdTransferModal
        isOpen={showBdModal}
        onClose={() => setShowBdModal(false)}
        initialDomain={domainName}
      />
    </Layout>
  );
};

export default DomainTransferPage;
