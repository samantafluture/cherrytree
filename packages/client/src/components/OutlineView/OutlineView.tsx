/**
 * Main outline view — fetches tree, renders breadcrumb + search + node list.
 *
 * @example
 *   <OutlineView outlineId={id} outlineTitle={title} />
 *
 * @consumers App.tsx
 * @depends hooks/, context/, components/NodeList, components/Breadcrumb, components/SearchBar
 */

import type { Node } from '@cherrytree/shared';
import { DEBOUNCE_SAVE_MS } from '@cherrytree/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { api } from '../../api';
import { useOutlineData } from '../../context';
import { useNodeActions, useOutline } from '../../hooks';
import { Breadcrumb } from '../Breadcrumb/Breadcrumb';
import { NodeList } from '../NodeList/NodeList';
import { SearchBar } from '../SearchBar/SearchBar';

import styles from './OutlineView.module.css';

type OutlineViewProps = {
  outlineId: string;
  outlineTitle: string;
  onBack: () => void;
  onTitleChange: (title: string) => void;
};

export function OutlineView({
  outlineId,
  outlineTitle,
  onBack,
  onTitleChange,
}: OutlineViewProps) {
  const { loading, error } = useOutline(outlineId);
  const { nodes, rootIds, zoomedNodeId, syncStatus } = useOutlineData();
  const { createNode } = useNodeActions(outlineId);
  const [searchOpen, setSearchOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (titleRef.current && titleRef.current.textContent !== outlineTitle) {
      titleRef.current.textContent = outlineTitle;
    }
  }, [outlineTitle]);

  const handleTitleInput = useCallback(() => {
    const newTitle = titleRef.current?.textContent?.trim() ?? '';
    if (!newTitle) return;
    onTitleChange(newTitle);
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    titleTimerRef.current = setTimeout(() => {
      api.outlines.update(outlineId, newTitle);
    }, DEBOUNCE_SAVE_MS);
  }, [outlineId, onTitleChange]);

  // Global Ctrl+/ to open search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const visibleNodes: Node[] = useMemo(() => {
    if (zoomedNodeId) {
      const children: Node[] = [];
      for (const node of nodes.values()) {
        if (node.parentId === zoomedNodeId) children.push(node);
      }
      children.sort((a, b) => a.position - b.position);
      return children;
    }
    return rootIds.map((id) => nodes.get(id)!).filter(Boolean);
  }, [nodes, rootIds, zoomedNodeId]);

  const handleAddRoot = useCallback(() => {
    createNode('', zoomedNodeId);
  }, [createNode, zoomedNodeId]);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.outlineView}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          ← Outlines
        </button>
        <h1
          ref={titleRef}
          className={styles.title}
          contentEditable
          suppressContentEditableWarning
          onInput={handleTitleInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
        />
        <button
          className={styles.searchToggle}
          onClick={() => setSearchOpen(!searchOpen)}
          aria-label="Search"
        >
          /
        </button>
        <span className={styles.syncStatus} data-status={syncStatus}>
          {syncStatus === 'pending'
            ? 'Saving...'
            : syncStatus === 'error'
              ? 'Error'
              : ''}
        </span>
      </div>
      {searchOpen && (
        <SearchBar outlineId={outlineId} onClose={() => setSearchOpen(false)} />
      )}
      <Breadcrumb outlineTitle={outlineTitle} />
      <div className={styles.tree}>
        <NodeList nodes={visibleNodes} outlineId={outlineId} />
        <button className={styles.addButton} onClick={handleAddRoot}>
          + Add item
        </button>
      </div>
    </div>
  );
}
