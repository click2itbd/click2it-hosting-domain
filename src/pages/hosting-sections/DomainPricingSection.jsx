import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowRight, Loader2 } from 'lucide-react';
import { getDomainPricing } from '../../services/hostingApi';

const POPULAR_TLDS = ['.com', '.net', '.org', '.xyz', '.io', '.co', '.dev', '.online'];

const SkeletonCard = () => (
  <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-6 border border-gray-200 animate-pulse">
    <div className="h-6 sm:h-8 w-14 sm:w-16 bg-gray-200 rounded mb-2 sm:mb-4"></div>
    <div className="h-5 sm:h-6 w-20 sm:w-24 bg-gray-200 rounded mb-1 sm:mb-2"></div>
    <div className="h-3 sm:h-4 w-16 sm:w-20 bg-gray-200 rounded mb-3.5 sm:mb-6"></div>
    <div className="h-8 sm:h-10 w-full bg-gray-200 rounded-lg sm:rounded-xl"></div>
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
    <section className="py-12 sm:py-16 md:py-24 bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-3 sm:px-4 max-w-7xl">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-blue-50 text-blue-600 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-widest mb-3 sm:mb-4 border border-blue-100">
            <Globe size={14} /> Domain Registration
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-gray-900 mb-3 sm:mb-6">
            {title}
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto text-sm sm:text-base md:text-lg leading-relaxed">
            {subtitle}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {tlds.map((tld) => (
              <SkeletonCard key={tld} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {tlds.map((rawTld) => {
              const tld = rawTld.startsWith('.') ? rawTld : `.${rawTld}`;
              const isPopular = POPULAR_TLDS.slice(0, 4).includes(tld);
              const price = getCalculatedPrice(tld);

              if (!price) return null;

              return (
                <button
                  key={tld}
                  onClick={() => handleCardClick(tld)}
                  className={`relative group bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-6 border text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                    isPopular
                      ? 'border-blue-500 shadow-[0_10px_30px_rgba(59,130,246,0.1)]'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-2 sm:right-6 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] sm:text-[10px] font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-md">
                      POPULAR
                    </div>
                  )}

                  <div className="w-full">
                    <div className="mb-2 sm:mb-4">
                      <h3
                        className={`text-xl sm:text-3xl font-black truncate ${
                          isPopular
                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {tld}
                      </h3>
                    </div>

                    <div className="mb-3.5 sm:mb-6 space-y-0.5 sm:space-y-1">
                      <p className="flex items-baseline gap-1 text-gray-900">
                        <span className="text-[11px] sm:text-sm font-medium text-gray-500">Starting at</span>
                      </p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">
                        ৳{price.toLocaleString()}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-1">/ year (Includes Privacy)</p>
                    </div>
                  </div>

                  <div
                    className={`w-full flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      isPopular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span>Register</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
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
