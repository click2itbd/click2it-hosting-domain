import { useState, useCallback } from 'react';
import { checkDomainAvailability, getDomainSuggestions, DomainAvailabilityResult } from '../services/hostingApi';

interface DomainSearchState {
  loading: boolean;
  error: string | null;
  results: DomainAvailabilityResult[];
  suggestions: string[];
}

export function useDomainSearch() {
  const [state, setState] = useState<DomainSearchState>({
    loading: false,
    error: null,
    results: [],
    suggestions: [],
  });

  const search = useCallback(async (domains: string[]) => {
    if (!domains.length) return;
    setState(prev => ({ ...prev, loading: true, error: null, results: [], suggestions: [] }));
    try {
      const apiResults = await checkDomainAvailability(domains);
      const results: DomainAvailabilityResult[] = (apiResults || []).map(res => {
        const domainPrice = res.priceBdt ?? res.price ?? 0;
        return {
          domain: res.domain,
          available: res.available,
          price: domainPrice,
          renewalPrice: res.renewalPrice,
          currency: res.currency,
          originalPrice: domainPrice,
          error: res.error,
        };
      });

      setState(prev => ({ ...prev, loading: false, results }));
    } catch (err: any) {
      console.error('Domain search error:', err);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        results: [], 
        error: 'Domain search service is currently unavailable. Please check your backend connection.' 
      }));
    }
  }, []);

  const fetchSuggestions = useCallback(async (domain: string) => {
    if (!domain) return;
    try {
      const suggestions = await getDomainSuggestions(domain);
      setState(prev => ({ ...prev, suggestions: suggestions || [] }));
    } catch {
      // silently fail suggestions
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, results: [], suggestions: [] });
  }, []);

  return { ...state, search, fetchSuggestions, reset };
}
