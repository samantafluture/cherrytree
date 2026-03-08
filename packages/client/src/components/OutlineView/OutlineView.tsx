/**
 * Main outline view — fetches tree, renders breadcrumb + node list.
 *
 * @example
 *   <OutlineView outlineId={id} outlineTitle={title} />
 *
 * @consumers App.tsx
 * @depends hooks/useOutline, context/OutlineContext, components/NodeList, components/Breadcrumb
 */

import type { Node } from '@cherrytree/shared';
import { useCallback, useMemo } from 'react';

import { useOutlineData } from '../../context';
import { useNodeActions, useOutline } from '../../hooks';
import { Breadcrumb } from '../Breadcrumb/Breadcrumb';
import { NodeList } from '../NodeList/NodeList';

import styles from './OutlineView.module.css';

type OutlineViewProps = {
  outlineId: string;
  outlineTitle: string;
  onBack: () => void;
};

export function OutlineView({
  outlineId,
  outlineTitle,
  onBack,
}: OutlineViewProps) {
  const { loading, error } = useOutline(outlineId);
  const { nodes, rootIds, zoomedNodeId, syncStatus } = useOutlineData();
  const { createNode } = useNodeActions(outlineId);

  // Determine visible nodes based on zoom
  const visibleNodes: Node[] = useMemo(() => {
    if (zoomedNodeId) {
      // Show children of zoomed node
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
        <h1 className={styles.title}>{outlineTitle}</h1>
        <span className={styles.syncStatus} data-status={syncStatus}>
          {syncStatus === 'pending'
            ? 'Saving...'
            : syncStatus === 'error'
              ? 'Error'
              : ''}
        </span>
      </div>
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
