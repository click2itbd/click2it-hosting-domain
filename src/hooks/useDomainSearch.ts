import { useState, useCallback, useRef } from 'react';
import { checkDomainAvailability, getDomainSuggestions, DomainAvailabilityResult } from '../services/hostingApi';

interface DomainSearchState {
  loading: boolean;
  alternativesLoading: boolean;
  error: string | null;
  results: DomainAvailabilityResult[];
  suggestions: string[];
}

// Client-side high-speed RAM cache (5-minute TTL)
const clientDomainCache = new Map<string, { result: DomainAvailabilityResult; expiresAt: number }>();

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
    
    // Check client-side memory cache first
    const now = Date.now();
    const cachedResults: DomainAvailabilityResult[] = [];
    const uncachedDomains: string[] = [];

    for (const d of domains) {
      const clean = d.trim().toLowerCase();
      const hit = clientDomainCache.get(clean);
      if (hit && hit.expiresAt > now) {
        cachedResults.push(hit.result);
      } else {
        uncachedDomains.push(clean);
      }
    }

    if (uncachedDomains.length === 0) {
      // 100% Instant Cache Hit!
      setState(prev => ({ ...prev, loading: false, alternativesLoading: false, results: cachedResults, error: null }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      alternativesLoading: false, 
      error: null, 
      results: cachedResults, 
      suggestions: [] 
    }));

    try {
      const apiResults = await checkDomainAvailability(uncachedDomains);
      if (searchVersionRef.current !== currentVersion) return;
      const freshResults = mapApiResults(apiResults);
      for (const r of freshResults) {
        if (r && r.domain) {
          clientDomainCache.set(r.domain.toLowerCase(), { result: r, expiresAt: Date.now() + 300_000 });
        }
      }
      setState(prev => ({ ...prev, loading: false, results: mergeUniqueResults(cachedResults, freshResults) }));
    } catch (err: any) {
      console.error('Domain search error:', err);
      if (searchVersionRef.current !== currentVersion) return;
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        results: cachedResults, 
        error: cachedResults.length > 0 ? null : 'Unable to check domain availability right now. Please try again.' 
      }));
    }
  }, []);

  // Progressive search: checks primary domain + streams alternatives concurrently in parallel
  const searchProgressive = useCallback(async (exactDomain: string, alternateDomains: string[]) => {
    if (!exactDomain && !alternateDomains.length) return;
    const currentVersion = ++searchVersionRef.current;
    const now = Date.now();

    // 1. Check instant client RAM cache
    let exactHit: DomainAvailabilityResult | null = null;
    if (exactDomain) {
      const hit = clientDomainCache.get(exactDomain.trim().toLowerCase());
      if (hit && hit.expiresAt > now) {
        exactHit = hit.result;
      }
    }

    const cachedAlternates: DomainAvailabilityResult[] = [];
    const uncachedAlternates: string[] = [];
    for (const alt of alternateDomains) {
      const clean = alt.trim().toLowerCase();
      const hit = clientDomainCache.get(clean);
      if (hit && hit.expiresAt > now) {
        cachedAlternates.push(hit.result);
      } else {
        uncachedAlternates.push(clean);
      }
    }

    const initialResults: DomainAvailabilityResult[] = [];
    if (exactHit) initialResults.push(exactHit);
    initialResults.push(...cachedAlternates);

    setState(prev => ({
      ...prev,
      loading: !exactHit, // if exactHit is in cache, loading is INSTANTLY false (0ms)!
      alternativesLoading: uncachedAlternates.length > 0,
      error: null,
      results: initialResults,
      suggestions: [],
    }));

    try {
      // 2. Launch exact match request (if not cached)
      const exactPromise = (async () => {
        if (!exactHit && exactDomain) {
          try {
            const exactApiRes = await checkDomainAvailability([exactDomain]);
            if (searchVersionRef.current !== currentVersion) return;
            const exactMapped = mapApiResults(exactApiRes);
            for (const r of exactMapped) {
              if (r && r.domain) clientDomainCache.set(r.domain.toLowerCase(), { result: r, expiresAt: Date.now() + 300_000 });
            }
            setState(prev => ({
              ...prev,
              loading: false,
              results: mergeUniqueResults(prev.results, exactMapped),
            }));
          } catch (exactErr) {
            console.warn('[DomainSearch] Exact domain fetch error:', exactErr);
            if (searchVersionRef.current !== currentVersion) return;
            setState(prev => ({ ...prev, loading: false }));
          }
        }
      })();

      // 3. Launch uncached alternatives concurrently in parallel chunks (not sequential!)
      const altPromises = (async () => {
        if (uncachedAlternates.length > 0) {
          const CHUNK_SIZE = 7;
          const chunks: string[][] = [];
          for (let i = 0; i < uncachedAlternates.length; i += CHUNK_SIZE) {
            chunks.push(uncachedAlternates.slice(i, i + CHUNK_SIZE));
          }

          // True parallel fetch across all chunks simultaneously
          await Promise.allSettled(
            chunks.map(async (chunk) => {
              try {
                const chunkApiRes = await checkDomainAvailability(chunk);
                if (searchVersionRef.current !== currentVersion) return;
                const chunkMapped = mapApiResults(chunkApiRes);
                for (const r of chunkMapped) {
                  if (r && r.domain) clientDomainCache.set(r.domain.toLowerCase(), { result: r, expiresAt: Date.now() + 300_000 });
                }
                setState(prev => ({
                  ...prev,
                  results: mergeUniqueResults(prev.results, chunkMapped),
                }));
              } catch (chunkErr) {
                console.warn('[DomainSearch] Chunk fetch error:', chunkErr);
              }
            })
          );
        }
      })();

      // Wait for all in-flight requests concurrently
      await Promise.allSettled([exactPromise, altPromises]);
    } catch (err: any) {
      console.error('Progressive search fatal error:', err);
      if (searchVersionRef.current !== currentVersion) return;
      setState(prev => ({
        ...prev,
        error: prev.results.length > 0 ? null : 'Unable to check domain availability right now. Please try again.'
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
