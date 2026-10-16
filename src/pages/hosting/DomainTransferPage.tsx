import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/hosting/PageHeader';
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
  Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { checkTransferEligibility, getTldPricing } from '../../services/domainApi';
import { getDomainPricing } from '../../services/hostingApi';
import { BdTransferModal } from '../../components/hosting/BdTransferModal';

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
      setEligibilityError(msg);
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
        canonical="https://click2itbd.com/domain/transfer"
      />
      
      <PageHeader 
        title="Transfer Your Domain to Us" 
        subtitle="Consolidate your digital assets with automated Openprovider API integration, live transparent wholesale pricing, and 1-year renewal extension." 
      />

      {/* Transfer Form Section */}
      <section className="py-8 sm:py-12 lg:py-16 bg-[#f5f7f9] border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <div className="flex flex-col md:flex-row">
              {/* Left Side: Benefits */}
              <div className="md:w-5/12 bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 p-6 sm:p-8 md:p-10 text-white flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold tracking-wide uppercase mb-4 text-blue-200">
                    <Sparkles size={14} /> Automated Reseller API
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Why transfer to Click2IT?</h3>
                  <ul className="space-y-4 sm:space-y-5">
                    <li className="flex items-start gap-3">
                      <RefreshCw className="text-blue-300 flex-shrink-0 mt-0.5 sm:w-5 sm:h-5" size={18} />
                      <span className="text-sm sm:text-base">Includes a <strong>free 1-year extension</strong> on your current registration date.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Shield className="text-blue-300 flex-shrink-0 mt-0.5 sm:w-5 sm:h-5" size={18} />
                      <span className="text-sm sm:text-base"><strong>Free WHOIS Privacy Protection</strong> keeps your personal contacts safe from spammers.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Lock className="text-blue-300 flex-shrink-0 mt-0.5 sm:w-5 sm:h-5" size={18} />
                      <span className="text-sm sm:text-base"><strong>Zero Downtime</strong>. Your website and email services run uninterrupted throughout.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <ShieldCheck className="text-blue-300 flex-shrink-0 mt-0.5 sm:w-5 sm:h-5" size={18} />
                      <span className="text-sm sm:text-base">Live Openprovider Registry Pricing in BDT. No hidden markup.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-white/15 text-xs text-blue-100/80 flex items-center gap-2">
                  <Lock size={14} className="text-blue-300 shrink-0" />
                  <span>Bank-grade 256-bit encryption for authorization credentials.</span>
                </div>
              </div>
              
              {/* Right Side: Form */}
              <div className="md:w-7/12 p-6 sm:p-8 md:p-10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Transfer Your Domain</h3>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                    Live API Verified
                  </span>
                </div>
                <p className="text-gray-500 mb-6 text-sm sm:text-base">
                  Enter your domain name to verify transfer eligibility and view the live fee before ordering.
                </p>
                 
                <form onSubmit={handleTransfer} className="space-y-5">
                  {validationError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in">
                      <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                      <p className="text-sm text-red-700">{validationError}</p>
                    </div>
                  )}

                  {eligibilityError && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in">
                      <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
                      <p className="text-sm text-amber-700">{eligibilityError}</p>
                    </div>
                  )}

                  {/* 1. Domain Name Input & Quick Check */}
                  <div>
                    <label htmlFor="domainName" className="block text-sm font-semibold text-gray-800 mb-1.5">
                      Domain Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
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
                        placeholder="e.g., yourcompany.com"
                        className="w-full pl-4 pr-32 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm sm:text-base font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleCheckEligibility()}
                        disabled={isChecking || !domainName.trim()}
                        className="absolute right-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        {isChecking ? (
                          <>
                            <RefreshCw className="animate-spin" size={14} />
                            <span>Checking...</span>
                          </>
                        ) : (
                          <>
                            <Search size={14} />
                            <span>Check</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* .BD Notice */}
                  {domainName.endsWith('.bd') && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-start gap-2.5">
                        <span className="text-xl">🇧🇩</span>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-emerald-900">.BD Domain (BTCL) Detected</p>
                          <p className="text-xs text-emerald-700">BTCL domains require official manual paperwork (no EPP code needed).</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowBdModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shrink-0"
                      >
                        Start .BD Transfer <ArrowRight size={14} />
                      </button>
                    </div>
                  )}

                  {/* 2. Live Eligibility & Price Card */}
                  {isEligible && (
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 sm:p-5 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" size={20} />
                          <div>
                            <p className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                              {domainName} <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">Eligible</span>
                            </p>
                            <p className="text-xs text-emerald-800 mt-0.5">{eligibilityReason}</p>
                          </div>
                        </div>
                        {livePrice !== null && (
                          <div className="text-right shrink-0">
                            <span className="text-xs text-emerald-700 block font-medium">Transfer Fee</span>
                            <span className="text-lg sm:text-xl font-extrabold text-emerald-950">৳{livePrice.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-emerald-200/60 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-emerald-900 font-medium">
                        <span className="flex items-center gap-1"><Check size={14} className="text-emerald-600" /> +1 Year Extension Included</span>
                        <span className="flex items-center gap-1"><Check size={14} className="text-emerald-600" /> Free WHOIS Privacy</span>
                        <span className="flex items-center gap-1"><Check size={14} className="text-emerald-600" /> Zero Downtime</span>
                      </div>
                    </div>
                  )}

                  {/* 3. Authorization / EPP Code Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="authCode" className="block text-sm font-semibold text-gray-800">
                        Authorization / EPP Code <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowHelpModal(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline flex items-center gap-1"
                      >
                        <Key size={13} /> Where do I get this?
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showAuthCode ? 'text' : 'password'}
                        id="authCode"
                        value={authCode}
                        onChange={(e) => {
                          setAuthCode(e.target.value);
                          setValidationError('');
                        }}
                        placeholder="Enter the Auth/EPP code from your current registrar"
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm font-mono"
                        required
                      />
                      <Key className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                      <button
                        type="button"
                        onClick={() => setShowAuthCode(!showAuthCode)}
                        className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600"
                        title={showAuthCode ? 'Hide code' : 'Show code'}
                      >
                        {showAuthCode ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1.5">
                      <Lock size={12} className="text-emerald-600 shrink-0" />
                      <span>কোডটি নিরাপদে পাঠানো হবে এবং সাধারণ লগে প্রকাশ করা হবে না।</span>
                    </p>
                  </div>

                  {/* 4. Terms & Authorization Agreement */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 sm:p-4">
                    <label className="flex items-start gap-3 cursor-pointer group select-none">
                      <div className="flex items-center h-5 mt-0.5">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          required
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-700 leading-snug">
                        আমি নিশ্চিত করছি যে ডোমেনটি পূর্ববর্তী রেজিস্ট্রারে <strong>আনলক (Unlocked)</strong> করা আছে এবং আমি ১ বছরের মেয়াদ বৃদ্ধিসহ ট্রান্সফার অর্ডারের শর্তাবলিতে সম্মতি দিচ্ছি।
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit"
                    disabled={isProcessing || isChecking}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 sm:py-4 px-6 rounded-xl transition-all duration-200 flex justify-center items-center gap-2 disabled:opacity-70 text-sm sm:text-base shadow-lg shadow-blue-600/20"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="animate-spin" size={18} />
                        <span>Processing Order...</span>
                      </>
                    ) : isChecking ? (
                      <>
                        <RefreshCw className="animate-spin" size={18} />
                        <span>Verifying Eligibility...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Checkout</span>
                        {livePrice !== null && <span>(৳{livePrice.toLocaleString()})</span>}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* .BD Transfer Assistance Card */}
          <div className="mt-8 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                🇧🇩
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold text-emerald-950 flex flex-wrap items-center gap-2">
                  Transferring a .BD (BTCL) Domain?
                  <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                    Official BTCL Liaison
                  </span>
                </h4>
                <p className="text-xs sm:text-sm text-emerald-800 mt-1 max-w-2xl leading-relaxed">
                  BTCL domains (.bd, .com.bd, .net.bd, etc.) require physical/scanned verification letters, NID copies, and registry coordination. Our dedicated team handles the entire forwarding paperwork for you.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBdModal(true)}
              className="whitespace-nowrap px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 shrink-0"
            >
              Apply for .BD Transfer <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900">
              How to Transfer a Domain
            </h2>
            <p className="mt-3 sm:mt-4 max-w-2xl text-base sm:text-xl text-gray-500 mx-auto">
              Transferring your domain is a simple process. Follow these 3 easy steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 lg:gap-12 relative">
            {/* Desktop connecting line */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gray-100 w-2/3 mx-auto z-0"></div>
            
            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center border-4 border-blue-50 mb-4 sm:mb-6 shadow-xl shadow-blue-500/10">
                <Unlock className="text-blue-500 sm:w-9 sm:h-9" size={28} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">1. Unlock Domain</h3>
              <p className="text-gray-600 px-2 sm:px-4 text-sm sm:text-base">
                Log into your current registrar's control panel and unlock your domain name to allow the transfer.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center border-4 border-blue-50 mb-4 sm:mb-6 shadow-xl shadow-blue-500/10">
                <Key className="text-blue-500 sm:w-9 sm:h-9" size={28} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">2. Get Auth Code</h3>
              <p className="text-gray-600 px-2 sm:px-4 text-sm sm:text-base">
                Request an Authorization Code (also known as EPP code) from your current registrar.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center border-4 border-blue-50 mb-4 sm:mb-6 shadow-xl shadow-blue-500/10">
                <CheckCircle2 className="text-blue-500 sm:w-9 sm:h-9" size={28} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">3. Initiate Transfer</h3>
              <p className="text-gray-600 px-2 sm:px-4 text-sm sm:text-base">
                Enter your domain and auth code above, complete the checkout, and we'll handle the rest!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
              <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2">How long does a domain transfer take?</h4>
              <p className="text-gray-600 text-sm sm:text-base">Depending on your current registrar, a domain transfer usually takes between 5 to 7 days to complete. However, if your current registrar allows you to approve the transfer manually, it can be completed within hours.</p>
            </div>
            
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
              <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Will my website go down during the transfer?</h4>
              <p className="text-gray-600 text-sm sm:text-base">No, your website and emails will remain active and completely unaffected during the entire transfer process.</p>
            </div>
            
            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
              <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Do I lose the remaining time on my registration?</h4>
              <p className="text-gray-600 text-sm sm:text-base">Absolutely not! When you transfer a domain to us, we add a full year of registration on top of your existing expiration date.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Where do I get my Auth/EPP Code?</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-4 text-sm sm:text-base text-gray-600">
              <p>Your Auth/EPP Code is provided by your current domain registrar. You can usually find it in your domain management or transfer settings.</p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Log into your current registrar's control panel, find your domain, and look for "Transfer", "Auth Code", or "EPP Code" options.
                </p>
              </div>
              <p className="text-xs text-gray-500">If you cannot find it, contact your current registrar's support team for assistance.</p>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Got it
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
