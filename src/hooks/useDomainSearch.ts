import { useState, useCallback, useRef } from 'react';
import { checkDomainAvailability, getDomainSuggestions, DomainAvailabilityResult } from '../services/hostingApi';

interface DomainSearchState {
  loading: boolean;
  alternativesLoading: boolean;
  error: string | null;
  results: DomainAvailabilityResult[];
  suggestions: string[];
}

function mapApiResults(apiResults: any[]): DomainAvailabilityResult[] {
  return (apiResults || []).map(res => {
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
}

function mergeUniqueResults(existing: DomainAvailabilityResult[], incoming: DomainAvailabilityResult[]): DomainAvailabilityResult[] {
  const map = new Map<string, DomainAvailabilityResult>();
  for (const item of existing) {
    if (item && item.domain) {
      map.set(item.domain.toLowerCase(), item);
    }
  }
  for (const item of incoming) {
    if (item && item.domain) {
      map.set(item.domain.toLowerCase(), item);
    }
  }
  return Array.from(map.values());
}

export function useDomainSearch() {
  const [state, setState] = useState<DomainSearchState>({
    loading: false,
    alternativesLoading: false,
    error: null,
    results: [],
    suggestions: [],
  });

  const searchVersionRef = useRef<number>(0);

  const search = useCallback(async (domains: string[]) => {
    if (!domains.length) return;
    const currentVersion = ++searchVersionRef.current;
    setState(prev => ({ ...prev, loading: true, alternativesLoading: false, error: null, results: [], suggestions: [] }));
    try {
      const apiResults = await checkDomainAvailability(domains);
      if (searchVersionRef.current !== currentVersion) return;
      const results = mapApiResults(apiResults);
      setState(prev => ({ ...prev, loading: false, results }));
    } catch (err: any) {
      console.error('Domain search error:', err);
      if (searchVersionRef.current !== currentVersion) return;
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        results: [], 
        error: 'Unable to check domain availability right now. Please try again.' 
      }));
    }
  }, []);

  // Progressive search: checks primary domain first (instant rendering), then streams alternatives in fast chunks
  const searchProgressive = useCallback(async (exactDomain: string, alternateDomains: string[]) => {
    if (!exactDomain && !alternateDomains.length) return;
    const currentVersion = ++searchVersionRef.current;

    setState(prev => ({
      ...prev,
      loading: true,
      alternativesLoading: alternateDomains.length > 0,
      error: null,
      results: [],
      suggestions: [],
    }));

    try {
      // 1. Fetch exact match domain first (lightning fast sub-second rendering)
      if (exactDomain) {
        try {
          const exactApiRes = await checkDomainAvailability([exactDomain]);
          if (searchVersionRef.current !== currentVersion) return;
          const exactMapped = mapApiResults(exactApiRes);
          setState(prev => ({
            ...prev,
            loading: false, // exact match is now available to the user!
            results: exactMapped,
          }));
        } catch (exactErr) {
          console.warn('[DomainSearch] Exact domain fetch failed:', exactErr);
          if (searchVersionRef.current !== currentVersion) return;
          setState(prev => ({ ...prev, loading: false }));
        }
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }

      // 2. Fetch alternatives progressively in lightweight parallel chunks (6 domains per batch)
      if (alternateDomains.length > 0) {
        const BATCH_SIZE = 6;
        const batches: string[][] = [];
        for (let i = 0; i < alternateDomains.length; i += BATCH_SIZE) {
          batches.push(alternateDomains.slice(i, i + BATCH_SIZE));
        }

        for (const batch of batches) {
          if (searchVersionRef.current !== currentVersion) return;
          try {
            const batchApiRes = await checkDomainAvailability(batch);
            if (searchVersionRef.current !== currentVersion) return;
            const batchMapped = mapApiResults(batchApiRes);
            setState(prev => ({
              ...prev,
              results: mergeUniqueResults(prev.results, batchMapped),
            }));
          } catch (batchErr) {
            console.warn('[DomainSearch] Alternate batch fetch error:', batchErr);
          }
        }
      }
    } catch (err: any) {
      console.error('Progressive search fatal error:', err);
      if (searchVersionRef.current !== currentVersion) return;
      setState(prev => ({
        ...prev,
        error: 'Unable to check domain availability right now. Please try again.'
      }));
    } finally {
      if (searchVersionRef.current === currentVersion) {
        setState(prev => ({ ...prev, loading: false, alternativesLoading: false }));
      }
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
    searchVersionRef.current++;
    setState({ loading: false, alternativesLoading: false, error: null, results: [], suggestions: [] });
  }, []);

  return { ...state, search, searchProgressive, fetchSuggestions, reset };
}
