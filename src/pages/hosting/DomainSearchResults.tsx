import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { HostingPromoBanner } from '../../components/hosting/HostingPromoBanner';
import { Search, X, Info, Star, ShoppingCart, Loader2, DollarSign } from 'lucide-react';
import { useDomainSearch } from '../../hooks/useDomainSearch';
import { getDomainPricing, DomainPricing } from '../../services/hostingApi';
import { db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
import { SEO } from '../../components/SEO';
import { DomainCrossSellModal } from '../../components/hosting/DomainCrossSellModal';

export default function DomainSearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
  const [searchInput, setSearchInput] = useState(query);
  const [selectedTld, setSelectedTld] = useState('.com');
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
  const popularTlds = ['.com', '.net', '.org', '.co', '.io', '.online', '.dev', '.tech', '.store', '.me'];

  const toggleFavorite = (domain: string) => {
    setFavorites(prev => {
      const newFavs = prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain];
      localStorage.setItem('domainFavorites', JSON.stringify(newFavs));
      if (newFavs.includes(domain)) toast.success(`${domain} added to favorites`);
      else toast.success(`${domain} removed from favorites`);
      return newFavs;
    });
  };

  const lastSearchRef = React.useRef<string>('');

  useEffect(() => {
    if (searchInput.includes('.')) {
      const ext = searchInput.substring(searchInput.indexOf('.'));
      setSelectedTld(ext);
    }
  }, [searchInput]);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const p = await getDomainPricing();
        if (p && Array.isArray(p)) {
          setPricing(p);
        }
      } catch (e) {
        console.error('Failed to fetch pricing', e);
      }
    };
    fetchPricing();
  }, []);

  useEffect(() => {
    if (query) {
      setSearchInput(query);
      const lowerQuery = query.toLowerCase();
      
      // Determine base name without extension
      let baseName = lowerQuery;
      let searchedTld = '';
      if (lowerQuery.includes('.')) {
        baseName = lowerQuery.substring(0, lowerQuery.indexOf('.'));
        searchedTld = lowerQuery.substring(lowerQuery.indexOf('.'));
      }

      if (pricing.length > 0 && searchedTld) {
        const isSupported = pricing.some(p => {
          const ptld = p.tld.toLowerCase();
          const normalizedPtld = ptld.startsWith('.') ? ptld : `.${ptld}`;
          return searchedTld === normalizedPtld;
        });
        if (!isSupported) {
          toast.error(`The ${searchedTld} extension is currently not supported for registration.`);
          return;
        }
      }
      
      // We will search for the exact query (if it has a TLD), or append .com if none
      const exactDomain = searchedTld ? lowerQuery : `${lowerQuery}.com`;
      
      // Generate alternate domains from available pricing or fallback to popular
      const availableTlds = pricing.length > 0 
        ? pricing.map(p => p.tld.startsWith('.') ? p.tld.toLowerCase() : `.${p.tld.toLowerCase()}`) 
        : popularTlds;
      const alternates = availableTlds
        .filter(tld => tld !== (searchedTld || '.com'))
        .slice(0, 10)
        .map(tld => `${baseName}${tld}`);
        
      const domainsToSearch = [exactDomain, ...alternates];
      const searchKey = domainsToSearch.join(',');
      if (lastSearchRef.current !== searchKey) {
        lastSearchRef.current = searchKey;
        search(domainsToSearch);
      }
    }
  }, [query, search, pricing]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let q = searchInput.trim().toLowerCase();
    if (q) {
      if (!q.includes('.')) {
        q += selectedTld;
      }
      if (pricing.length > 0 && q.includes('.')) {
        const searchedTld = q.substring(q.indexOf('.'));
        const isSupported = pricing.some(p => {
          const ptld = p.tld.toLowerCase();
          const normalizedPtld = ptld.startsWith('.') ? ptld : `.${ptld}`;
          return searchedTld === normalizedPtld;
        });
        if (!isSupported) {
          toast.error(`The ${searchedTld} extension is currently not supported for registration.`);
          return;
        }
      }
      navigate(`/domain/search?q=${encodeURIComponent(q)}`);
    }
  };

  const getPrice = (domainObj: any): number | null => {
    if (domainObj.price && domainObj.price > 0) {
      return domainObj.price;
    }
    return null;
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return 'Price unavailable';
    return `৳${price.toLocaleString()}`;
  };

  const handleAddToCart = (domain: string, price: number) => {
    const tld = domain.split('.').pop() || '';
    const product = {
      id: `domain_${domain}`,
      name: `Domain Registration - ${domain}`,
      description: '1 Year Registration',
      price: price,
      category: 'Hosting & Domains',
      stock: 9999,
      images: [],
      createdAt: new Date().toISOString(),
      itemType: 'domain' as const,
      domainTld: tld,
      termYears: 1,
    };
    addToCart(product as any);
    toast.success(`Domain ${domain} added to cart`);
    setCrossSellDomain({ domain, price });
  };

  const handleMakeOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerAmount || isNaN(Number(offerAmount)) || !offerEmail || !offerPhone) {
      toast.error('Please fill all required fields');
      return;
    }
    setIsSubmittingOffer(true);
    try {
      await addDoc(collection(db, 'domain_offers'), {
        domain: offerDomain,
        amount: Number(offerAmount),
        email: offerEmail,
        phone: offerPhone,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success('Offer of ৳' + offerAmount + ' for ' + offerDomain + ' submitted successfully! We will contact you soon.');
      setOfferDomain(null);
      setOfferAmount('');
      setOfferEmail('');
      setOfferPhone('');
    } catch (error) {
      console.error('Error submitting offer:', error);
      toast.error('Failed to submit offer. Please try again.');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  // Split results into exact match and alternatives
  let exactMatch: any = null;
  let alternatives: any[] = [];
  
  if (results.length > 0) {
    let baseSearch = query;
    if (!query.includes('.')) {
      baseSearch = `${query}.com`;
    }
    exactMatch = results.find(r => r.domain.toLowerCase() === baseSearch.toLowerCase());
    alternatives = results.filter(r => r.domain.toLowerCase() !== baseSearch.toLowerCase());
  }

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
          <div className="bg-white rounded-xl md:rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] overflow-hidden flex items-stretch mb-4 md:mb-6">
            <form onSubmit={handleSearchSubmit} className="flex-grow flex items-stretch">
              <div className="flex items-center pl-3 md:pl-5 text-gray-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Type your domain name here..."
                className="flex-1 px-3 md:px-4 py-4 md:py-5 text-base md:text-lg text-gray-800 outline-none bg-transparent placeholder-gray-400"
              />
              {searchInput && (
                <button type="button" onClick={() => setSearchInput('')} className="flex items-center text-gray-400 hover:text-gray-600 px-2">
                  <X size={16} />
                </button>
              )}
              <div className="flex items-center gap-2 pr-2">
                <select 
                  value={selectedTld}
                  onChange={(e) => {
                    const newTld = e.target.value;
                    setSelectedTld(newTld);
                    if (searchInput.includes('.')) {
                      setSearchInput(searchInput.substring(0, searchInput.indexOf('.')) + newTld);
                    }
                  }}
                  className="hidden md:block text-sm text-gray-600 bg-gray-100 border-0 rounded-lg px-3 py-2 outline-none h-[44px] cursor-pointer">
                  {Array.from(new Set([...popularTlds, selectedTld])).map(tld => (
                    <option key={tld} value={tld}>{tld}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="flex items-center gap-2 text-white font-bold px-5 md:px-7 h-[40px] md:h-[44px] rounded-xl transition-all active:scale-95 hover:opacity-90 my-auto"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea6100)' }}
                >
                  <Search size={16} />
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>
            </form>
          </div>

          {/* Exact Match Result */}
          {error && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mb-4 md:mb-6 text-sm flex items-center justify-between">
              <span>⚠️ {error}</span>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
            {loading ? (
              <div className="flex items-center gap-3 text-gray-500 py-4">
                <Loader2 className="animate-spin" size={20} />
                <span>Checking availability...</span>
              </div>
            ) : exactMatch ? (
              <>
                  <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                    <span className="text-xl md:text-2xl text-gray-700">{exactMatch.domain}</span>
                    {exactMatch.available ? (
                      <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        Available
                      </span>
                    ) : (
                      <span className="bg-[#a4a9ad] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        Registered
                      </span>
                    )}
                    <Info size={14} onClick={() => setInfoDomain(exactMatch)} className="text-gray-400 cursor-pointer hover:text-blue-500 transition-colors" />
                    <Star size={14} onClick={() => toggleFavorite(exactMatch.domain)} className={favorites.includes(exactMatch.domain) ? "text-yellow-400 cursor-pointer" : "text-gray-400 cursor-pointer hover:text-yellow-400 transition-colors"} fill={favorites.includes(exactMatch.domain) ? "currentColor" : "none"} />
                  </div>
                <div>
                  {exactMatch.available ? (
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="text-right">
                        <div className="font-bold text-base md:text-lg">{formatPrice(getPrice(exactMatch))}</div>
                        <div className="text-[10px] md:text-xs text-gray-500">/yr</div>
                      </div>
                      <button 
                        disabled={!getPrice(exactMatch)}
                        onClick={() => {
                          const price = getPrice(exactMatch);
                          if (price) handleAddToCart(exactMatch.domain, price);
                        }}
                        className="bg-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-600 text-white px-4 md:px-6 py-2 md:py-2.5 rounded text-xs md:text-sm font-bold flex items-center gap-2 transition-colors"
                      >
                        <ShoppingCart size={14} /> {getPrice(exactMatch) ? 'Add to cart' : 'Price unavailable'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setOfferDomain(exactMatch.domain)} className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 md:px-6 py-2 md:py-2.5 rounded text-xs md:text-sm font-bold flex items-center gap-2 transition-colors">
                      <DollarSign size={14} /> Make offer
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-gray-500 py-4">No exact match found.</div>
            )}
          </div>

          {/* Results List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-gray-700 font-medium">Results</h3>
            </div>
            
            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="py-12 flex justify-center items-center">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
              ) : alternatives.map((alt, idx) => (
                <div key={idx} className="px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-0 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className={alt.available ? "text-gray-800 text-base md:text-lg" : "text-gray-400 text-base md:text-lg"}>{alt.domain}</span>
                    
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
                  
                  <div className="mt-2 sm:mt-0 flex items-center gap-4 md:gap-6">
                    {alt.available ? (
                      <>
                        <div className="text-right">
                          <div className="text-sm font-bold">{formatPrice(getPrice(alt))}</div>
                          <div className="text-[10px] text-gray-500">Renews at {formatPrice(alt.renewalPrice ?? null)}/yr</div>
                        </div>
                        <button 
                          disabled={!getPrice(alt)}
                          onClick={() => {
                            const price = getPrice(alt);
                            if (price) handleAddToCart(alt.domain, price);
                          }}
                          className="bg-gray-600 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-gray-600 text-white px-3 md:px-4 py-2 rounded text-xs md:text-sm font-bold flex items-center gap-2 transition-colors w-28 md:w-32 justify-center"
                        >
                          <ShoppingCart size={14} /> {getPrice(alt) ? 'Add to cart' : 'Price unavailable'}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setOfferDomain(alt.domain)} className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 md:px-4 py-2 rounded text-xs md:text-sm font-bold flex items-center gap-2 transition-colors w-28 md:w-32 justify-center">
                        <DollarSign size={14} /> Make offer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>

      {offerDomain && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
                    <span className="font-bold text-gray-800">{formatPrice(infoDomain.renewalPrice ?? null)}/yr</span>
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
                <div className="text-sm text-gray-600">
                  This domain is already registered. If you are interested in acquiring it, you can make an offer and our broker team will help negotiate.
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setInfoDomain(null)} className="w-full py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors text-sm">
                Close
              </button>
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
