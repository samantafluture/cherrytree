/**
 * Search bar — Ctrl+/ to open, debounced results, click to zoom.
 *
 * @example
 *   <SearchBar outlineId={id} />
 *
 * @consumers components/OutlineView
 * @depends hooks/useSearch, context/OutlineContext
 */

import { useEffect, useRef } from 'react';

import { useOutlineDispatch } from '../../context';
import { useSearch } from '../../hooks';

import styles from './SearchBar.module.css';

type SearchBarProps = {
  outlineId: string;
  onClose: () => void;
};

export function SearchBar({ outlineId, onClose }: SearchBarProps) {
  const { query, setQuery, results, isSearching, clear } = useSearch(outlineId);
  const dispatch = useOutlineDispatch();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clear();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [clear, onClose]);

  const handleResultClick = (nodeId: string) => {
    dispatch({ type: 'ZOOM_TO', payload: { nodeId } });
    dispatch({ type: 'FOCUS_NODE', payload: { nodeId } });
    clear();
    onClose();
  };

  return (
    <div className={styles.searchBar}>
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="Search nodes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </div>
      {(results.length > 0 || isSearching) && (
        <div className={styles.results}>
          {isSearching && <div className={styles.loading}>Searching...</div>}
          {results.map((node) => (
            <button
              key={node.id}
              className={styles.result}
              onClick={() => handleResultClick(node.id)}
            >
              <Highlight text={node.content} query={query} />
            </button>
          ))}
          {!isSearching && query && results.length === 0 && (
            <div className={styles.empty}>No results</div>
          )}
        </div>
      )}
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className={styles.highlight}>
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
