import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Loader2, CheckCircle2, XCircle, Copy, AlertTriangle } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { searchDomain } from '../../services/domainApi';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils';
import { SEO } from '../../components/SEO';

export const BulkDomainSearch = () => {
  const navigate = useNavigate();
  const { addToCart, items } = useCart();
  
  const [bulkText, setBulkText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleBulkSearch = async () => {
    // Extract domains from text (separated by comma, space, or newline)
    const rawDomains = bulkText.split(/[\s,]+/).filter(d => d.trim().length > 0);
    
    // Basic validation to add .com if no extension is provided
    const processDomain = (d: string) => {
      let clean = d.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
      if (!clean.includes('.')) clean += '.com';
      return clean;
    };
    
    const domainsToSearch = Array.from(new Set(rawDomains.map(processDomain))).slice(0, 20); // Max 20
    
    if (domainsToSearch.length === 0) {
      toast.error('Please enter at least one domain to search.');
      return;
    }
    
    setIsSearching(true);
    setResults([]);
    setProgress({ current: 0, total: domainsToSearch.length });
    
    const searchResults = [];
    
    for (let i = 0; i < domainsToSearch.length; i++) {
      const domain = domainsToSearch[i];
      setProgress({ current: i + 1, total: domainsToSearch.length });
      
      try {
        const res: any = await searchDomain(domain);
        if (res.success || res.status) {
          // the api returns { status: 'available', price: ... } or { success: true, data: { status... } }
          searchResults.push(res.data || res);
        } else {
          searchResults.push({ domain, status: 'error', reason: res.error });
        }
      } catch (err: any) {
        searchResults.push({ domain, status: 'error', reason: err.message });
      }
    }
    
    setResults(searchResults);
    setIsSearching(false);
  };

  const handleAddToCart = (domainObj: any) => {
    const isAlreadyInCart = items.some(i => i.itemType === 'domain' && i.name.includes(domainObj.domain));
    if (isAlreadyInCart) {
      toast.error('This domain is already in your cart!');
      return;
    }

    addToCart({
      id: `dom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Domain Registration - ${domainObj.domain}`,
      description: '1 Year Registration',
      price: domainObj.price,
      category: 'Hosting & Domains',
      stock: 9999,
      images: [],
      createdAt: new Date().toISOString(),
      itemType: 'domain',
      domainTld: domainObj.extension,
      termYears: 1
    } as any);

    toast.success(`${domainObj.domain} added to cart!`);
  };

  const handleAddAllAvailable = () => {
    const available = results.filter(r => r.available === true);
    let added = 0;
    
    available.forEach(domainObj => {
      const isAlreadyInCart = items.some(i => i.itemType === 'domain' && i.name.includes(domainObj.domain));
      if (!isAlreadyInCart) {
        addToCart({
          id: `dom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: `Domain Registration - ${domainObj.domain}`,
          description: '1 Year Registration',
          price: domainObj.price,
          category: 'Hosting & Domains',
          stock: 9999,
          images: [],
          createdAt: new Date().toISOString(),
          itemType: 'domain',
          domainTld: domainObj.extension,
          termYears: 1
        } as any);
        added++;
      }
    });
    
    if (added > 0) {
      toast.success(`${added} domains added to cart!`);
    } else {
      toast('No new available domains to add.');
    }
  };

  return (
    <Layout>
      <SEO
        title="Bulk Domain Search & Registration in Bangladesh | Click2IT"
        description="Search up to 20 domains at once and register multiple domain names with ease. Protect your brand across .com, .net, .org, and more at Click2IT."
        keywords="bulk domain search, mass domain check bd, register multiple domains, cheap bulk domains"
        canonical="https://click2itbd.com/domain/bulk"
      />
      <div className="bg-[#081621] text-white pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Bulk Domain Search</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Search and register up to 20 domains at once. Perfect for protecting your brand across multiple extensions.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10 mb-20">
        <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 border border-gray-100">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Enter Domain Names (separated by comma, space, or new line)
          </label>
          <textarea
            className="w-full h-40 border-2 border-gray-200 rounded-xl p-4 text-gray-800 outline-none focus:border-blue-500 font-mono resize-none transition-colors"
            placeholder="example.com\nexample.net\nexample.org"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            disabled={isSearching}
          ></textarea>
          
          <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              <AlertTriangle size={14} className="inline mr-1 text-orange-500" />
              Maximum 20 domains per search.
            </p>
            <button
              onClick={handleBulkSearch}
              disabled={isSearching || bulkText.trim() === ''}
              className="w-full md:w-auto bg-[#EF4444] text-white px-8 py-3 rounded-lg font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Searching ({progress.current}/{progress.total})
                </>
              ) : (
                <>
                  <Search size={20} />
                  Search Domains
                </>
              )}
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800">Search Results</h2>
              
              {results.some(r => r.available === true) && (
                <button
                  onClick={handleAddAllAvailable}
                  className="bg-[#081621] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors"
                >
                  <ShoppingCart size={16} /> Add All Available to Cart
                </button>
              )}
            </div>

            <div className="space-y-3">
              {results.map((res, idx) => {
                const inCart = items.some(i => i.itemType === 'domain' && i.name.includes(res.domain));
                
                return (
                  <div key={idx} className="flex flex-col md:flex-row items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all bg-gray-50/50">
                    <div className="flex items-center gap-3 w-full md:w-auto mb-3 md:mb-0">
                      {res.available === true ? (
                        <CheckCircle2 className="text-emerald-500" size={24} />
                      ) : res.error ? (
                        <AlertTriangle className="text-orange-500" size={24} />
                      ) : (
                        <XCircle className="text-gray-400" size={24} />
                      )}
                      
                      <div>
                        <div className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          {res.domain}
                          {res.isPremium && (
                            <span className="text-[10px] uppercase tracking-wider bg-gradient-to-r from-amber-500 to-purple-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                              ⭐ Premium
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {res.available === true ? (res.isPremium ? 'Available (Premium Domain)' : 'Available') : res.error ? 'Error' : 'Taken'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                      {res.available === true && res.price && (
                        <div className="font-bold text-xl text-gray-800">
                          {formatCurrency(res.price)}<span className="text-sm text-gray-500 font-normal">/yr</span>
                        </div>
                      )}
                      
                      {res.available === true ? (
                        <button
                          onClick={() => handleAddToCart(res)}
                          disabled={inCart}
                          className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                            inCart 
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {inCart ? (
                            <>In Cart</>
                          ) : (
                            <><ShoppingCart size={16} /> Add</>
                          )}
                        </button>
                      ) : res.error ? (
                        <span className="text-xs text-orange-500 max-w-[200px] text-right">{res.reason}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BulkDomainSearch;
