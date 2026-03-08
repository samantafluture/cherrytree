/**
 * Search hook — debounced query with results from the API.
 *
 * @example
 *   const { query, setQuery, results, isSearching } = useSearch(outlineId);
 *
 * @consumers components/SearchBar
 * @depends api/
 */

import type { Node } from '@cherrytree/shared';
import { SEARCH_DEBOUNCE_MS } from '@cherrytree/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../api';

export function useSearch(outlineId: string) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Node[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    timerRef.current = setTimeout(async () => {
      const res = await api.nodes.search(outlineId, query.trim());
      setResults(res.data ?? []);
      setIsSearching(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, outlineId]);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return { query, setQuery, results, isSearching, clear };
}
