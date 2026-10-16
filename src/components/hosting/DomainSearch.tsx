import React, { useState, useEffect } from 'react';
import { Search, Server, Loader2 } from 'lucide-react';
import { collection, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useDomainSearch } from '../../hooks/useDomainSearch';
import { getDomainPricing, DomainAvailabilityResult, DomainPricing } from '../../services/hostingApi';
import { DomainResultCard } from './DomainResultCard';
import { ErrorState } from '../ui/ErrorState';
import { cn } from '../../lib/utils';

interface DomainSearchProps {
  onAddToCart?: (domain: string, price: number) => void;
}

export const DomainSearch: React.FC<DomainSearchProps> = ({ onAddToCart }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedTlds, setSelectedTlds] = useState<string[]>(['.com', '.net', '.org', '.com.bd', '.xyz', '.online', '.dev']);
  const [pricing, setPricing] = useState<DomainPricing[]>([]);
  const { loading, error, results, suggestions, search, fetchSuggestions, reset } = useDomainSearch();

  useEffect(() => {
    getDomainPricing().then(setPricing).catch(console.error);
  }, []);

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    const domains = selectedTlds.map(tld => `${searchText.trim()}${tld}`);
    await search(domains);
    await fetchSuggestions(searchText.trim());
  };

  const handleSearchWithDomain = async (domain: string) => {
    const baseName = domain.replace(/\.[^.]+$/, '');
    setSearchText(baseName);
    const domains = selectedTlds.map(tld => `${baseName}${tld}`);
    await search(domains);
    await fetchSuggestions(baseName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleTld = (tld: string) => {
    setSelectedTlds(prev =>
      prev.includes(tld) ? prev.filter(t => t !== tld) : [...prev, tld]
    );
  };

  const getPriceForTld = (tld: string) => {
    const normalized = tld.startsWith('.') ? tld : `.${tld}`;
    return pricing.find(p => p.tld === normalized);
  };

  return (
    <div id="domain-search" className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 transition-all hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]">
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find your perfect domain..."
            className="flex-1 p-4 text-lg rounded-xl border border-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c2i-red)] focus-visible:border-[var(--c2i-red)] transition-all"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-[var(--c2i-red)] text-white px-8 py-4 rounded-xl font-bold hover:bg-[var(--c2i-red-deep)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 w-full md:w-auto active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            {loading ? 'Checking...' : 'Search'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {pricing.filter(p => p.isActive).map((p, idx) => {
            const tld = p.tld.startsWith('.') ? p.tld : `.${p.tld}`;
            const isSelected = selectedTlds.includes(tld);
            return (
              <button
                key={idx}
                onClick={() => toggleTld(tld)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c2i-red)] focus-visible:ring-offset-2 active:scale-95',
                  isSelected
                    ? 'bg-[var(--c2i-red)] text-white border-[var(--c2i-red)]'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                )}
              >
                {p.tld} — ৳{p.registerPrice}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorState message={error} onRetry={handleSearch} />
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-8 space-y-3">
          <h3 className="text-sm font-bold text-[var(--c2i-ink-soft)] uppercase tracking-wider">Search Results</h3>
          {results.map((result, idx) => (
            <DomainResultCard
              key={idx}
              result={result}
              pricing={getPriceForTld(result.domain.split('.').pop() || '')}
              onSearchAlternative={(domain) => handleSearchWithDomain(domain)}
            />
          ))}
        </div>
      )}

      {suggestions.length > 0 && results.every(r => !r.available) && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-[var(--c2i-ink-soft)] uppercase tracking-wider mb-3">Alternative Suggestions</h3>
          <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearchWithDomain(suggestion)}
                  className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-full text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c2i-red)] focus-visible:ring-offset-2 active:scale-95"
                >
                  {suggestion}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
