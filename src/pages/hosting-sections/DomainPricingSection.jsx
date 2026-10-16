import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowRight, Loader2 } from 'lucide-react';
import { getDomainPricing } from '../../services/hostingApi';

const POPULAR_TLDS = ['.com', '.net', '.org', '.xyz', '.io', '.co', '.dev', '.online'];

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse">
    <div className="h-8 w-16 bg-gray-200 rounded mb-4"></div>
    <div className="h-6 w-24 bg-gray-200 rounded mb-2"></div>
    <div className="h-4 w-20 bg-gray-200 rounded mb-6"></div>
    <div className="h-10 w-full bg-gray-200 rounded-xl"></div>
  </div>
);

export default function DomainPricingSection({
  tlds = POPULAR_TLDS,
  title = 'Popular Domains',
  subtitle = 'Register your perfect domain name at transparent pricing. All domains include free WHOIS privacy protection.',
}) {
  const [customOverrides, setCustomOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    getDomainPricing().then((pricing) => {
      const overrides = {};
      pricing.forEach((item) => {
        if (item.tld && item.isActive !== false) {
          const formattedTld = item.tld.startsWith('.') ? item.tld.toLowerCase() : `.${item.tld.toLowerCase()}`;
          overrides[formattedTld] = Number(item.registerPrice) || 0;
        }
      });
      if (isMounted) {
        setCustomOverrides(overrides);
        setLoading(false);
      }
    }).catch((error) => {
      console.error('Failed to load domain pricing:', error);
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, []);

  const handleCardClick = (tld) => {
    const bareTld = String(tld || '').replace(/^\./, '');
    navigate(`/domain?tld=${encodeURIComponent(bareTld)}`);
  };

  // Compute final price for each TLD dynamically from live Openprovider API
  const getCalculatedPrice = (rawTld) => {
    const tld = rawTld.startsWith('.') ? rawTld.toLowerCase() : `.${rawTld.toLowerCase()}`;
    return customOverrides[tld] && customOverrides[tld] > 0 ? customOverrides[tld] : null;
  };

  return (
    <section className="py-16 md:py-24 bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-2 sm:px-4 max-w-7xl">
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-4 border border-blue-100">
            <Globe size={14} /> Domain Registration
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-6">
            {title}
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto text-lg leading-relaxed">
            {subtitle}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {tlds.map((tld) => (
              <SkeletonCard key={tld} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {tlds.map((rawTld) => {
              const tld = rawTld.startsWith('.') ? rawTld : `.${rawTld}`;
              const isPopular = POPULAR_TLDS.slice(0, 4).includes(tld);
              const price = getCalculatedPrice(tld);

              if (!price) return null;

              return (
                <button
                  key={tld}
                  onClick={() => handleCardClick(tld)}
                  className={`relative group bg-white rounded-2xl p-6 border text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isPopular
                      ? 'border-blue-500 shadow-[0_10px_30px_rgba(59,130,246,0.1)]'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-6 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                      POPULAR
                    </div>
                  )}

                  <div className="mb-4">
                    <h3
                      className={`text-3xl font-black ${
                        isPopular
                          ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {tld}
                    </h3>
                  </div>

                  <div className="mb-6 space-y-1">
                    <p className="flex items-baseline gap-1 text-gray-900">
                      <span className="text-sm font-medium text-gray-500">Starting at</span>
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      ৳{price.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">/ year (Includes Privacy)</p>
                  </div>

                  <div
                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                      isPopular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Register
                    <ArrowRight size={16} className="opacity-70 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
