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
  ShieldCheck,
  Search,
  Globe,
  Zap,
  Clock,
  HelpCircle,
  ChevronRight
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
      
      <PageHeader 
        title="Transfer Your Domain to Us" 
        subtitle="Move your domain to Click2IT with zero downtime, free WHOIS privacy protection, and a 1-year renewal extension included." 
      />

      {/* Main Transfer Section */}
      <section className="py-10 sm:py-16 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Highlight Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mb-7">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold">
              <RefreshCw size={13} className="text-blue-600" /> +1 Year Free Renewal
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold">
              <Shield size={13} className="text-emerald-600" /> Free WHOIS Privacy
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-xs font-bold">
              <Zap size={13} className="text-amber-600" /> Zero Downtime
            </span>
          </div>

          {/* Clean, Focused Transfer Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-[0_12px_45px_rgba(15,23,42,0.07)] border border-slate-200/90 overflow-hidden">
            {/* Subtle top accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

            <div className="p-6 sm:p-10">
              <div className="mb-7">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Enter Your Domain Details
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Check your domain's transfer eligibility and enter your EPP/Auth code to begin.
                </p>
              </div>

              <form onSubmit={handleTransfer} autoComplete="off" className="space-y-6">
                {/* Hidden trap inputs so browsers never autofill login email/password */}
                <input type="text" name="prevent_autofill_user" className="hidden" tabIndex={-1} autoComplete="off" />
                <input type="password" name="prevent_autofill_pass" className="hidden" tabIndex={-1} autoComplete="new-password" />

                {validationError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-red-700 font-medium">{validationError}</p>
                  </div>
                )}

                {eligibilityError && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-amber-800 font-medium">{eligibilityError}</p>
                  </div>
                )}

                {/* 1. Domain Name Input + Check Button */}
                <div>
                  <label htmlFor="transferDomainInput" className="block text-sm font-bold text-slate-800 mb-2">
                    Domain Name <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                      <input
                        type="text"
                        id="transferDomainInput"
                        name="domain_to_transfer_field"
                        autoComplete="off"
                        spellCheck={false}
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
                        className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none text-base font-medium text-slate-900 placeholder:text-slate-400"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCheckEligibility()}
                      disabled={isChecking || !domainName.trim()}
                      className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
                    >
                      {isChecking ? (
                        <>
                          <RefreshCw className="animate-spin" size={16} />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <Search size={16} />
                          <span>Check Eligibility</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* .BD Notice */}
                {domainName.endsWith('.bd') && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl">🇧🇩</span>
                      <div>
                        <p className="text-sm font-bold text-emerald-950">.BD Domain Detected</p>
                        <p className="text-xs text-emerald-800">.BD domains are transferred via document verification (no EPP code needed).</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBdModal(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm shrink-0"
                    >
                      Start .BD Transfer <ArrowRight size={14} />
                    </button>
                  </div>
                )}

                {/* 2. Live Eligibility & Price Card */}
                {isEligible && (
                  <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" size={22} />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-emerald-950">{domainName}</span>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                              Eligible
                            </span>
                          </div>
                          <p className="text-xs text-emerald-800 mt-0.5">{eligibilityReason}</p>
                        </div>
                      </div>
                      {livePrice !== null && (
                        <div className="sm:text-right shrink-0">
                          <span className="text-xs text-emerald-700 block font-medium">Transfer Fee (+1 Yr)</span>
                          <span className="text-xl sm:text-2xl font-extrabold text-emerald-950">
                            ৳{livePrice.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-emerald-200/70 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-emerald-900 font-semibold">
                      <span className="flex items-center gap-1"><Check size={14} className="text-emerald-600" /> +1 Year Extension Included</span>
                      <span className="flex items-center gap-1"><Check size={14} className="text-emerald-600" /> Free WHOIS Privacy</span>
                      <span className="flex items-center gap-1"><Check size={14} className="text-emerald-600" /> Zero Downtime</span>
                    </div>
                  </div>
                )}

                {/* 3. Authorization / EPP Code Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="eppAuthCodeInput" className="block text-sm font-bold text-slate-800">
                      Authorization / EPP Code <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowHelpModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 hover:underline"
                    >
                      <HelpCircle size={13} /> Where do I get this?
                    </button>
                  </div>

                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <input
                      type="text"
                      id="eppAuthCodeInput"
                      name="epp_authorization_code_field"
                      autoComplete="off"
                      spellCheck={false}
                      style={!showAuthCode && authCode ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties) : undefined}
                      value={authCode}
                      onChange={(e) => {
                        setAuthCode(e.target.value);
                        setValidationError('');
                      }}
                      placeholder="Enter the Auth / EPP code from your current registrar"
                      className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none text-sm sm:text-base font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthCode(!showAuthCode)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      title={showAuthCode ? 'Hide code' : 'Show code'}
                    >
                      {showAuthCode ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
                    <Lock size={12} className="text-emerald-600 shrink-0" />
                    <span>কোডটি নিরাপদে এনক্রিপ্টেড অবস্থায় পাঠানো হবে এবং সাধারণ লগে প্রকাশ করা হবে না।</span>
                  </p>
                </div>

                {/* 4. Terms & Authorization Agreement */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
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
                      আমি নিশ্চিত করছি যে ডোমেনটি পূর্ববর্তী রেজিস্ট্রারে <strong>আনলক (Unlocked)</strong> করা আছে এবং আমি ১ বছরের মেয়াদ বৃদ্ধিসহ ট্রান্সফার অর্ডারের শর্তাবলিতে সম্মতি দিচ্ছি।
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button 
                  type="submit"
                  disabled={isProcessing || isChecking}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex justify-center items-center gap-2 disabled:opacity-70 text-base shadow-lg shadow-blue-600/20 cursor-pointer"
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

          {/* .BD Transfer Assistance Card */}
          <div className="mt-8 bg-white border border-emerald-200/90 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl shrink-0">
                🇧🇩
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 flex flex-wrap items-center gap-2">
                  Transferring a .BD Domain?
                  <span className="text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Managed .BD Transfer
                  </span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  National .BD domains (.bd, .com.bd, etc.) require NID & authorization documents instead of an EPP code. Our team handles the transfer for you.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBdModal(true)}
              className="whitespace-nowrap px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              Apply for .BD Transfer <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Why Transfer With Us - Clean 4-Card Grid */}
      <section className="py-12 sm:py-16 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Why Transfer Your Domain to Click2IT?
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-slate-500">
              Enjoy hassle-free local BDT billing, full DNS control, and enterprise-grade domain security.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-blue-200 hover:bg-white hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-4">
                <RefreshCw size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Free 1-Year Extension</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Every domain transfer adds a full year to your existing expiration date—you never lose remaining time.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-blue-200 hover:bg-white hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center mb-4">
                <Shield size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Free WHOIS Privacy</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Keep your personal name, email, and phone number hidden from public WHOIS directories and spammers.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-blue-200 hover:bg-white hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
                <Zap size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Zero Website Downtime</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Your existing nameservers and DNS records remain intact during the transfer so your site never goes offline.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-blue-200 hover:bg-white hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center mb-4">
                <ShieldCheck size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Easy BDT Renewal</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Pay and renew anytime in BDT via bKash, Nagad, or local cards without needing a dual-currency passport card.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Easy Steps Section */}
      <section className="py-12 sm:py-16 bg-slate-50/60 border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              How to Transfer a Domain in 3 Steps
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-500">
              Prepare your domain at your old provider and start the transfer in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Unlock size={26} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">1. Unlock Your Domain</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Log in to your current registrar's control panel and disable the <strong>Registrar Lock / Transfer Lock</strong>.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Key size={26} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">2. Get Auth / EPP Code</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Copy the <strong>Authorization / EPP Code</strong> provided by your current registrar for your domain.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <CheckCircle2 size={26} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">3. Place Transfer Order</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Enter your domain and EPP code above, complete the checkout, and we'll handle the rest automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Frequently Asked Questions</h2>
          </div>
          
          <div className="space-y-4">
            <div className="bg-slate-50/70 p-5 sm:p-6 rounded-2xl border border-slate-200/80">
              <h4 className="text-base font-bold text-slate-900 mb-1.5">How long does a domain transfer take?</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Depending on your current registrar, a domain transfer typically takes 5 to 7 days to complete. If your current registrar lets you manually approve the outgoing transfer, it can finish within a few hours.
              </p>
            </div>
            
            <div className="bg-slate-50/70 p-5 sm:p-6 rounded-2xl border border-slate-200/80">
              <h4 className="text-base font-bold text-slate-900 mb-1.5">Will my website or email go down during the transfer?</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                No. Your existing nameservers and DNS records remain untouched during the transfer process, so your website and email continue working without interruption.
              </p>
            </div>
            
            <div className="bg-slate-50/70 p-5 sm:p-6 rounded-2xl border border-slate-200/80">
              <h4 className="text-base font-bold text-slate-900 mb-1.5">Do I lose the remaining time on my registration?</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Not at all! When you transfer a domain to Click2IT, we add 1 full year on top of your existing expiration date.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Where do I get my Auth/EPP Code?</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <p>Your Auth/EPP Code is a transfer security key found inside your current domain registrar's control panel:</p>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <strong className="text-slate-900 block">Namecheap:</strong>
                  Domain List &rarr; Manage &rarr; Sharing &amp; Transfer &rarr; Unlock Domain &amp; click Auth Code.
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <strong className="text-slate-900 block">GoDaddy:</strong>
                  Domain Settings &rarr; Turn off Domain Lock &rarr; Transfer domain away from GoDaddy.
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <strong className="text-slate-900 block">Other Providers:</strong>
                  Go to Domain Overview &rarr; Disable Transfer Lock &rarr; Copy the EPP / Auth Code.
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="mt-5 w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors cursor-pointer"
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
