/**
 * Root node list — renders top-level nodes.
 *
 * @example
 *   <NodeList nodes={rootNodes} outlineId={id} />
 *
 * @consumers components/OutlineView
 * @depends components/NodeItem
 */

import type { Node } from '@cherrytree/shared';

import { NodeItem } from '../NodeItem/NodeItem';

import styles from './NodeList.module.css';

type NodeListProps = {
  nodes: Node[];
  outlineId: string;
};

export function NodeList({ nodes, outlineId }: NodeListProps) {
  if (nodes.length === 0) return null;

  return (
    <div className={styles.nodeList}>
      {nodes.map((node) => (
        <NodeItem key={node.id} node={node} outlineId={outlineId} depth={0} />
      ))}
    </div>
  );
}
