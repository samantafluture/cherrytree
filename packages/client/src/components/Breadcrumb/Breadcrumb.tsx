/**
 * Zoom path breadcrumb — each segment clickable to zoom out.
 *
 * @example
 *   <Breadcrumb outlineTitle="My Outline" />
 *
 * @consumers components/OutlineView
 * @depends context/OutlineContext
 */

import { useOutlineData, useOutlineDispatch } from '../../context';

import styles from './Breadcrumb.module.css';

type BreadcrumbProps = {
  outlineTitle: string;
};

export function Breadcrumb({ outlineTitle }: BreadcrumbProps) {
  const { zoomedNodeId, nodes } = useOutlineData();
  const dispatch = useOutlineDispatch();

  // Build the path from root to zoomed node
  const path: { id: string | null; label: string }[] = [
    { id: null, label: outlineTitle },
  ];

  if (zoomedNodeId) {
    const segments: { id: string; label: string }[] = [];
    let current = nodes.get(zoomedNodeId);
    while (current) {
      segments.unshift({
        id: current.id,
        label: current.content.slice(0, 40) || '(empty)',
      });
      current = current.parentId ? nodes.get(current.parentId) : undefined;
    }
    path.push(...segments);
  }

  if (path.length <= 1) return null;

  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      {path.map((segment, i) => (
        <span key={segment.id ?? 'root'} className={styles.segment}>
          {i > 0 && <span className={styles.separator}>/</span>}
          {i < path.length - 1 ? (
            <button
              className={styles.link}
              onClick={() =>
                dispatch({ type: 'ZOOM_TO', payload: { nodeId: segment.id } })
              }
            >
              {segment.label}
            </button>
          ) : (
            <span className={styles.current}>{segment.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
