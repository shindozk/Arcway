import { useCallback, useEffect, useRef, useState } from 'react';
import type { Package } from '../types/package';
import { searchPackages as apiSearchPackages } from '../api/packages';
import { DEBOUNCE_DELAY } from '../utils/constants';
import { createLogger } from '../utils/logger';

const log = createLogger('search');

export function useSearch() {
  const [results, setResults] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    log.debug(`debounced search: "${query}" (${DEBOUNCE_DELAY}ms)`);

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        log.info(`searching: "${query}"`);
        const data = await apiSearchPackages(query);
        log.info(`results: ${data.length} packages`);
        setResults(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Search failed';
        log.error(`search failed: ${msg}`);
        setError(msg);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_DELAY);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { results, loading, error, search };
}
