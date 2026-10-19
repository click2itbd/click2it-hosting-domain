import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { HostingPromoBanner } from '../../components/hosting/HostingPromoBanner';
import { Search, X, Info, Star, ShoppingCart, Loader2, DollarSign, RefreshCw } from 'lucide-react';
import { useDomainSearch } from '../../hooks/useDomainSearch';
import { getDomainPricing, DomainPricing, submitDomainOffer } from '../../services/hostingApi';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
import { SEO } from '../../components/SEO';
import { DomainCrossSellModal } from '../../components/hosting/DomainCrossSellModal';

function cleanDomainInput(raw: string): string {
  let domain = raw.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, '');
  domain = domain.replace(/\/.*$/, '');
  domain = domain.replace(/^www\./, '');
  domain = domain.replace(/[^a-z0-9.-]/g, '');
  domain = domain.replace(/\.{2,}/g, '.');
  return domain;
}

export default function DomainSearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const { addToCart, items } = useCart();
  
  const [searchInput, setSearchInput] = useState(query);
  const [activeFilter, setActiveFilter] = useState<'all' | 'available' | 'registered' | 'favorites'>('all');
  const [pricing, setPricing] = useState<DomainPricing[]>([]);
  const [offerDomain, setOfferDomain] = useState<string | null>(null);
  const [offerAmount, setOfferAmount] = useState<string>('');
  const [offerEmail, setOfferEmail] = useState('');
  const [offerPhone, setOfferPhone] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [infoDomain, setInfoDomain] = useState<any | null>(null);
  const [crossSellDomain, setCrossSellDomain] = useState<{ domain: string; price: number } | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('domainFavorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const { loading, results, search, error } = useDomainSearch();
  
  // A base list of popular TLDs to check
  const popularTlds = [
    '.com', '.net', '.org', '.xyz', '.co', '.io', '.online', '.dev', '.tech', '.store',
    '.site', '.app', '.ai', '.info', '.biz', '.shop', '.pro', '.me', '.live', '.cloud',
    '.digital', '.space', '.agency', '.link', '.club', '.website'
  ];

  const toggleFavorite = (domain: string) => {
    setFavorites(prev => {
      const isFav = prev.includes(domain);
      const newFavs = isFav ? prev.filter(d => d !== domain) : [...prev, domain];
      try {
        localStorage.setItem('domainFavorites', JSON.stringify(newFavs));
      } catch {}

      // Fire toast once with unique ID so React StrictMode or double render cannot duplicate it
      const toastId = `fav_${domain}`;
      if (!isFav) {
        toast.success(`${domain} added to favorites`, { id: toastId });
      } else {
        toast.success(`${domain} removed from favorites`, { id: toastId });
      }

      return newFavs;
    });
  };

  const lastSearchRef = React.useRef<string>('');

  // Term years state for exact match
  const [selectedYears, setSelectedYears] = useState<number>(1);

  // Sync searchInput when query URL parameter changes
  useEffect(() => {
    if (query) {
      setSearchInput(query);
    }
  }, [query]);

  // Lock body scroll when a modal is open
  useEffect(() => {
    if (offerDomain || infoDomain) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [offerDomain, infoDomain]);

  // Fast single fetch of pricing
  useEffect(() => {
    let isMounted = true;
    getDomainPricing()
      .then(p => {
        if (isMounted && Array.isArray(p)) {
          setPricing(p);
        }
      })
      .catch(e => console.error('Failed to fetch pricing', e));
    return () => { isMounted = false; };
  }, []);

  // Safe and fast domain search trigger (only runs once per query change)
  useEffect(() => {
    const clean = cleanDomainInput(query);
    if (!clean) return;

    const lastDotIndex = clean.lastIndexOf('.');
    const hasExtension = lastDotIndex > 0 && lastDotIndex < clean.length - 1;

    const baseName = hasExtension ? clean.substring(0, lastDotIndex) : clean;
    const searchedTld = hasExtension ? clean.substring(lastDotIndex) : '.com';
    const exactDomain = hasExtension ? clean : `${clean}.com`;

    const alternates = popularTlds
      .filter(tld => tld !== searchedTld)
      .slice(0, 19) // 1 exact + 19 alternates = 20 domains total (optimal for speed & chunking)
      .map(tld => `${baseName}${tld}`);

    const domainsToSearch = [exactDomain, ...alternates];
    const searchKey = `${clean}_${domainsToSearch.join(',')}`;

    if (lastSearchRef.current !== searchKey) {
      lastSearchRef.current = searchKey;
      search(domainsToSearch);
    }
  }, [query, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = cleanDomainInput(searchInput);
    if (!raw) return;

    const lastDot = raw.lastIndexOf('.');
    const hasExt = lastDot > 0 && lastDot < raw.length - 1;
    const finalDomain = hasExt ? raw : `${raw}.com`;

    navigate(`/domain/search?q=${encodeURIComponent(finalDomain)}`);
  };

  const isDomainInCart = (domain: string) => {
    const lower = domain.toLowerCase();
    return items.some(item => 
      item.id?.toLowerCase().startsWith(`domain_${lower}_`) || 
      (item as any).domainName?.toLowerCase() === lower ||
      item.name?.toLowerCase().includes(lower)
    );
  };

  const getPrice = (domainObj: any): number | null => {
    if (domainObj.price && domainObj.price > 0) {
      return domainObj.price;
    }
    const parts = String(domainObj.domain || '').split('.');
    const tld = parts.length > 1 ? `.${parts.slice(1).join('.')}` : '';
    const match = pricing.find(p => p.tld.toLowerCase() === tld.toLowerCase());
    if (match && match.registerPrice > 0) {
      return match.registerPrice;
    }
    return null;
  };

  const getRenewalPrice = (domainObj: any): number | null => {
    if (domainObj.renewalPrice && domainObj.renewalPrice > 0) {
      return domainObj.renewalPrice;
    }
    const parts = String(domainObj.domain || '').split('.');
    const tld = parts.length > 1 ? `.${parts.slice(1).join('.')}` : '';
    const match = pricing.find(p => p.tld.toLowerCase() === tld.toLowerCase());
    if (match && match.renewPrice > 0) {
      return match.renewPrice;
    }
    return getPrice(domainObj);
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return 'Price unavailable';
    return `৳${price.toLocaleString()}`;
  };

  const handleAddToCart = (domain: string, price: number, years: number = 1) => {
    const parts = domain.split('.');
    const tld = parts.length > 1 ? parts.slice(1).join('.') : '';
    const totalPrice = price * years;
    const product = {
      id: `domain_${domain}_${years}yr`,
      name: `Domain Registration - ${domain} (${years} ${years === 1 ? 'Year' : 'Years'})`,
      description: `${years} Year${years > 1 ? 's' : ''} Registration (Includes WHOIS Privacy)`,
      price: totalPrice,
      category: 'Hosting & Domains',
      stock: 9999,
      images: [],
      createdAt: new Date().toISOString(),
      itemType: 'domain' as const,
      domainTld: tld,
      termYears: years,
      baseAnnualPrice: price,
    };
    addToCart(product as any);
    toast.success(`Domain ${domain} (${years} Year${years > 1 ? 's' : ''}) added to cart!`, { id: `cart_${domain}` });
    setCrossSellDomain({ domain, price });
  };

  const handleMakeOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerAmount || isNaN(Number(offerAmount)) || !offerEmail || !offerPhone || !offerDomain) {
      toast.error('Please fill all required fields');
      return;
    }
    setIsSubmittingOffer(true);
    try {
      await submitDomainOffer({
        domain: offerDomain,
        amount: Number(offerAmount),
        email: offerEmail,
        phone: offerPhone,
      });
      toast.success('Offer of ৳' + offerAmount + ' for ' + offerDomain + ' submitted successfully! We will contact you soon.');
      setOfferDomain(null);
      setOfferAmount('');
      setOfferEmail('');
      setOfferPhone('');
    } catch (error: any) {
      console.error('Error submitting offer:', error);
      toast.error(error?.message || 'Failed to submit offer. Please try again.');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  // Split results into exact match and alternatives
  let exactMatch: any = null;
  let alternatives: any[] = [];
  
  if (results.length > 0) {
    const rawQuery = cleanDomainInput(query);
    const hasDot = rawQuery.includes('.');
    const targetDomain = hasDot ? rawQuery : `${rawQuery}.com`;
    
    exactMatch = results.find(r => r.domain.toLowerCase() === targetDomain) || results[0];
    const matchName = exactMatch?.domain?.toLowerCase();
    alternatives = results.filter(r => r.domain.toLowerCase() !== matchName);
  }

  const filteredAlternatives = alternatives.filter(alt => {
    if (activeFilter === 'available') return alt.available;
    if (activeFilter === 'registered') return !alt.available;
    if (activeFilter === 'favorites') return favorites.includes(alt.domain);
    return true;
  });

  return (
    <Layout fullWidth>
      <SEO
        title={query ? `Domain Search Results for "${query}" | Click2IT` : "Domain Search Results | Click2IT"}
        description="Search domain availability and register your ideal domain at Click2IT."
        noindex={true}
      />
      <HostingPromoBanner />
      <div className="bg-[#f5f7f9] min-h-screen py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Main Search Bar */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] overflow-hidden flex items-stretch mb-4 md:mb-6 border border-gray-100">
            <form onSubmit={handleSearchSubmit} className="flex-grow flex items-stretch">
              <div className="flex items-center pl-3 md:pl-5 text-gray-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Type your domain name here (e.g. yourbrand.com)..."
                className="flex-1 px-3 md:px-4 py-4 md:py-5 text-base md:text-lg text-gray-800 outline-none bg-transparent placeholder-gray-400"
              />
              {searchInput && (
                <button type="button" onClick={() => setSearchInput('')} className="flex items-center text-gray-400 hover:text-gray-600 px-2">
                  <X size={16} />
                </button>
              )}
              <div className="flex items-center gap-2 pr-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 text-white font-bold px-5 md:px-7 h-[40px] md:h-[44px] rounded-xl transition-all active:scale-95 hover:opacity-90 my-auto shadow-md"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea6100)' }}
                >
                  <Search size={16} />
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>
            </form>
          </div>

          {!query ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12 text-center max-w-2xl mx-auto my-6">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={30} />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Find your perfect domain name</h2>
              <p className="text-sm md:text-base text-gray-600 mb-6">
                Search across .com, .net, .org, .xyz, and 20+ top-level extensions with instant availability and best pricing in BDT.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-gray-500 font-bold uppercase mr-1">Popular extensions:</span>
                {['.com', '.net', '.org', '.xyz', '.co', '.io', '.online', '.site'].map(ext => (
                  <button
                    key={ext}
                    type="button"
                    onClick={() => {
                      const sample = `mybrand${ext}`;
                      setSearchInput(sample);
                      navigate(`/domain/search?q=${encodeURIComponent(sample)}`);
                    }}
                    className="bg-gray-50 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 text-gray-700 border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                  >
                    {ext}
                  </button>
                ))}
              </div>
            </div>
          ) : error && !exactMatch && !loading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12 mb-6 text-center max-w-xl mx-auto">
              <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-100">
                <Search size={26} />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Unable to Verify Domain Availability</h3>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                We could not verify availability for this domain at the moment. Please verify your spelling or click below to try searching again.
              </p>
              <button
                type="button"
                onClick={() => {
                  lastSearchRef.current = '';
                  const clean = cleanDomainInput(query);
                  if (clean) {
                    const targetDomain = clean.includes('.') ? clean : `${clean}.com`;
                    const parts = clean.split('.');
                    const base = parts[0];
                    const alternates = popularTlds.map(tld => `${base}${tld}`);
                    search([targetDomain, ...alternates]);
                  }
                }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-md hover:from-orange-600 hover:to-orange-700 active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw size={16} /> Try Searching Again
              </button>
            </div>
          ) : (
            <>

              {/* Exact Match Result Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                {loading ? (
                  <div className="flex items-center gap-3 text-gray-500 py-3">
                    <Loader2 className="animate-spin text-orange-500" size={24} />
                    <span className="text-base font-medium">Checking live domain availability...</span>
                  </div>
                ) : exactMatch ? (
                  <>
                    <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                      <span className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{exactMatch.domain}</span>
                      {exactMatch.available ? (
                        <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                          Available
                        </span>
                      ) : (
                        <span className="bg-gray-400 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                          Registered
                        </span>
                      )}
                      <Info size={16} onClick={() => setInfoDomain(exactMatch)} className="text-gray-400 cursor-pointer hover:text-blue-500 transition-colors" />
                      <Star size={16} onClick={() => toggleFavorite(exactMatch.domain)} className={favorites.includes(exactMatch.domain) ? "text-yellow-400 cursor-pointer" : "text-gray-400 cursor-pointer hover:text-yellow-400 transition-colors"} fill={favorites.includes(exactMatch.domain) ? "currentColor" : "none"} />
                    </div>

                    <div>
                      {exactMatch.available ? (
                        <div className="flex flex-wrap items-center gap-3 md:gap-5">
                          {/* Term selector */}
                          <select
                            value={selectedYears}
                            onChange={(e) => setSelectedYears(Number(e.target.value))}
                            className="bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold px-3 py-2.5 rounded-xl outline-none cursor-pointer hover:border-gray-300 transition-colors"
                          >
                            <option value={1}>1 Year</option>
                            <option value={2}>2 Years</option>
                            <option value={3}>3 Years</option>
                            <option value={4}>4 Years</option>
                            <option value={5}>5 Years</option>
                          </select>

                          <div className="text-right">
                            <div className="font-extrabold text-xl md:text-2xl text-gray-900">
                              {getPrice(exactMatch) ? `৳${((getPrice(exactMatch) || 0) * selectedYears).toLocaleString()}` : 'Price unavailable'}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              for {selectedYears} {selectedYears === 1 ? 'year' : 'years'}
                            </div>
                          </div>

                          {isDomainInCart(exactMatch.domain) ? (
                            <button
                              onClick={() => navigate('/cart')}
                              className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
                            >
                              ✓ In Cart (View Cart)
                            </button>
                          ) : (
                            <button 
                              disabled={!getPrice(exactMatch)}
                              onClick={() => {
                                const price = getPrice(exactMatch);
                                if (price) handleAddToCart(exactMatch.domain, price, selectedYears);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
                            >
                              <ShoppingCart size={16} /> {getPrice(exactMatch) ? 'Add to cart' : 'Price unavailable'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <button onClick={() => setOfferDomain(exactMatch.domain)} className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                          <DollarSign size={16} /> Make offer
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-gray-500 py-3 text-sm">No exact match found.</div>
                )}
              </div>

              {/* Results List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-gray-800 font-bold text-sm md:text-base">Extension Alternatives</h3>
                  
                  <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setActiveFilter('all')}
                      className={`px-3 py-1 rounded-lg transition-all ${activeFilter === 'all' ? 'bg-white text-gray-900 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                      All ({alternatives.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('available')}
                      className={`px-3 py-1 rounded-lg transition-all ${activeFilter === 'available' ? 'bg-emerald-600 text-white shadow-sm font-bold' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                      Available ({alternatives.filter(a => a.available).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('registered')}
                      className={`px-3 py-1 rounded-lg transition-all ${activeFilter === 'registered' ? 'bg-gray-600 text-white shadow-sm font-bold' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                      Registered ({alternatives.filter(a => !a.available).length})
                    </button>
                    {favorites.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveFilter('favorites')}
                        className={`px-3 py-1 rounded-lg transition-all ${activeFilter === 'favorites' ? 'bg-amber-500 text-white shadow-sm font-bold' : 'text-gray-500 hover:text-gray-800'}`}
                      >
                        ★ ({alternatives.filter(a => favorites.includes(a.domain)).length})
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {loading ? (
                    <div className="py-12 flex justify-center items-center">
                      <Loader2 className="animate-spin text-blue-500" size={32} />
                    </div>
                  ) : filteredAlternatives.length > 0 ? (
                    filteredAlternatives.map((alt, idx) => (
                      <div key={idx} className="px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-0 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-2 md:gap-3">
                          <span className={alt.available ? "text-gray-800 text-base md:text-lg font-medium" : "text-gray-400 text-base md:text-lg"}>{alt.domain}</span>
                          
                          {alt.available ? (
                            <span className="bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Available
                            </span>
                          ) : (
                            <span className="bg-[#a4a9ad] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Registered
                            </span>
                          )}
                          
                          <Info size={14} onClick={() => setInfoDomain(alt)} className="text-gray-300 hover:text-blue-500 cursor-pointer transition-colors" />
                          <Star size={14} onClick={() => toggleFavorite(alt.domain)} className={favorites.includes(alt.domain) ? "text-yellow-400 cursor-pointer" : "text-gray-300 cursor-pointer hover:text-yellow-400 transition-colors"} fill={favorites.includes(alt.domain) ? "currentColor" : "none"} />
                        </div>
                        
                        <div className="mt-2 sm:mt-0 flex items-center justify-between sm:justify-end gap-3 md:gap-6">
                          {alt.available ? (
                            <>
                              <div className="text-left sm:text-right">
                                <div className="text-sm font-bold text-gray-900">{formatPrice(getPrice(alt))}</div>
                                {getRenewalPrice(alt) ? (
                                  <div className="text-[10px] text-gray-500">Renews at {formatPrice(getRenewalPrice(alt))}/yr</div>
                                ) : (
                                  <div className="text-[10px] text-gray-400">Standard renewal rate</div>
                                )}
                              </div>
                              {isDomainInCart(alt.domain) ? (
                                <button
                                  onClick={() => navigate('/cart')}
                                  className="bg-gray-800 hover:bg-gray-900 text-white px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 w-28 md:w-32 justify-center"
                                >
                                  ✓ In Cart
                                </button>
                              ) : (
                                <button 
                                  disabled={!getPrice(alt)}
                                  onClick={() => {
                                    const price = getPrice(alt);
                                    if (price) handleAddToCart(alt.domain, price, 1);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 text-white px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 w-28 md:w-32 justify-center"
                                >
                                  <ShoppingCart size={14} /> {getPrice(alt) ? 'Add to cart' : 'Price unavailable'}
                                </button>
                              )}
                            </>
                          ) : (
                            <button onClick={() => setOfferDomain(alt.domain)} className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 md:px-4 py-2 rounded text-xs md:text-sm font-bold flex items-center gap-2 transition-colors w-28 md:w-32 justify-center">
                              <DollarSign size={14} /> Make offer
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-gray-500 text-sm">
                      {activeFilter === 'all' 
                        ? 'No alternative domain extensions found.' 
                        : `No ${activeFilter} domains found in results.`}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          
        </div>
      </div>

      {offerDomain && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setOfferDomain(null); }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <form onSubmit={handleMakeOffer}>
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Make an Offer</h3>
                <button type="button" onClick={() => setOfferDomain(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 md:p-6 space-y-4">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                    The domain <strong>{offerDomain}</strong> is already registered. Submit your offer and our brokers will attempt to negotiate on your behalf.
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-gray-500 mb-1 uppercase">Your Offer Amount (BDT)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">৳</span>
                        <input
                          type="number"
                          required
                          min="1000"
                          value={offerAmount}
                          onChange={e => setOfferAmount(e.target.value)}
                          placeholder="e.g. 50000"
                          className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7B61FF] outline-none text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-gray-500 mb-1 uppercase">Email Address</label>
                      <input
                        type="email"
                        required
                        value={offerEmail}
                        onChange={e => setOfferEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3 md:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7B61FF] outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] md:text-xs font-bold text-gray-500 mb-1 uppercase">Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={offerPhone}
                        onChange={e => setOfferPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-3 md:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#7B61FF] outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="pt-2 flex gap-2 md:gap-3">
                  <button type="button" onClick={() => setOfferDomain(null)} className="flex-1 py-2 md:py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors text-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmittingOffer} className="flex-1 py-2 md:py-3 bg-[#7B61FF] text-white font-bold rounded-lg hover:bg-[#6A52E5] transition-colors disabled:opacity-50 text-sm">
                    {isSubmittingOffer ? 'Submitting...' : 'Submit Offer'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {infoDomain && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setInfoDomain(null); }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Domain Information</h3>
              <button onClick={() => setInfoDomain(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                <span className="text-sm text-gray-500 font-medium">Domain Name</span>
                <span className="font-bold text-gray-800">{infoDomain.domain}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                <span className="text-sm text-gray-500 font-medium">Status</span>
                {infoDomain.available ? (
                  <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Available</span>
                ) : (
                  <span className="bg-[#a4a9ad] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Registered</span>
                )}
              </div>
              {infoDomain.available && (
                <>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                    <span className="text-sm text-gray-500 font-medium">Registration Price</span>
                    <span className="font-bold text-gray-800">{formatPrice(getPrice(infoDomain))}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                    <span className="text-sm text-gray-500 font-medium">Renewal Price</span>
                    <span className="font-bold text-gray-800">{getRenewalPrice(infoDomain) ? `${formatPrice(getRenewalPrice(infoDomain))}/yr` : 'Standard renewal rate'}</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2 block">Included for free:</span>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✓ WHOIS Privacy Protection</li>
                      <li>✓ DNS Management</li>
                      <li>✓ Domain Theft Protection</li>
                      <li>✓ 24/7 Expert Support</li>
                    </ul>
                  </div>
                </>
              )}
              {!infoDomain.available && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-gray-50 rounded-xl text-xs md:text-sm text-gray-600 border border-gray-100 leading-relaxed">
                    This domain is already registered. If you are interested in acquiring it, our domain broker team can negotiate on your behalf.
                  </div>
                  <button
                    onClick={() => {
                      const d = infoDomain.domain;
                      setInfoDomain(null);
                      setOfferDomain(d);
                    }}
                    className="w-full py-2.5 bg-[#7B61FF] hover:bg-[#6A52E5] text-white font-bold rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <DollarSign size={15} /> Make an Offer for {infoDomain.domain}
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button onClick={() => setInfoDomain(null)} className="flex-1 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors text-xs md:text-sm">
                Close
              </button>
              {infoDomain.available && getPrice(infoDomain) && (
                isDomainInCart(infoDomain.domain) ? (
                  <button
                    onClick={() => {
                      setInfoDomain(null);
                      navigate('/cart');
                    }}
                    className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl transition-colors text-xs md:text-sm flex items-center justify-center gap-2"
                  >
                    ✓ In Cart (View Cart)
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const price = getPrice(infoDomain);
                      if (price) {
                        handleAddToCart(infoDomain.domain, price, 1);
                        setInfoDomain(null);
                      }
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-xs md:text-sm flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={15} /> Add to Cart
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Domain Cross-Sell Offer Modal (Hosting & VPS) */}
      {crossSellDomain && (
        <DomainCrossSellModal
          isOpen={!!crossSellDomain}
          onClose={() => setCrossSellDomain(null)}
          domainName={crossSellDomain.domain}
          domainPrice={crossSellDomain.price}
          onOpenCustomBuilder={() => {
            setCrossSellDomain(null);
            navigate('/hosting?custom=true');
          }}
        />
      )}
    </Layout>
  );
}
