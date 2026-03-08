/**
 * Single node row — bullet + contenteditable editor + recursive children.
 *
 * @example
 *   <NodeItem node={node} outlineId={id} depth={0} />
 *
 * @consumers components/NodeList
 * @depends components/BulletIcon, hooks/useNodeActions, context/OutlineContext
 */

import type { Node } from '@cherrytree/shared';
import { memo, useCallback, useEffect, useRef } from 'react';

import { useOutlineData, useOutlineDispatch } from '../../context';
import { useNodeActions } from '../../hooks';
import { BulletIcon } from '../BulletIcon/BulletIcon';

import styles from './NodeItem.module.css';

type NodeItemProps = {
  node: Node;
  outlineId: string;
  depth: number;
};

export const NodeItem = memo(function NodeItem({
  node,
  outlineId,
  depth,
}: NodeItemProps) {
  const { focusedNodeId, nodes } = useOutlineData();
  const dispatch = useOutlineDispatch();
  const { createNode, updateNode, deleteNode, toggleComplete, toggleCollapse } =
    useNodeActions(outlineId);
  const editorRef = useRef<HTMLDivElement>(null);

  // Get children for this node
  const childNodes: Node[] = [];
  for (const n of nodes.values()) {
    if (n.parentId === node.id) childNodes.push(n);
  }
  childNodes.sort((a, b) => a.position - b.position);

  const hasChildren = childNodes.length > 0;

  // Focus management
  useEffect(() => {
    if (focusedNodeId === node.id && editorRef.current) {
      editorRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      if (editorRef.current.childNodes.length > 0) {
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      }
      sel?.removeAllRanges();
      sel?.addRange(range);
      dispatch({ type: 'FOCUS_NODE', payload: { nodeId: null } });
    }
  }, [focusedNodeId, node.id, dispatch]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const content = editorRef.current.textContent ?? '';
    updateNode(node.id, content);
  }, [node.id, updateNode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        createNode('', node.parentId, node.position + 1);
      }

      if (e.key === 'Backspace') {
        const content = editorRef.current?.textContent ?? '';
        if (content === '') {
          e.preventDefault();
          deleteNode(node.id);
        }
      }

      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        toggleComplete(node.id, node.isCompleted);
      }
    },
    [node, createNode, deleteNode, toggleComplete],
  );

  const handleBulletClick = useCallback(() => {
    if (hasChildren) {
      toggleCollapse(node.id, node.isCollapsed);
    }
  }, [hasChildren, node.id, node.isCollapsed, toggleCollapse]);

  const contentClass = [
    styles.content,
    node.isCompleted ? styles.completed : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.nodeItem}>
      <div className={styles.row}>
        <BulletIcon
          hasChildren={hasChildren}
          collapsed={node.isCollapsed}
          completed={node.isCompleted}
          onClick={handleBulletClick}
        />
        <div
          ref={editorRef}
          className={contentClass}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          role="textbox"
          aria-label="Node content"
        >
          {node.content}
        </div>
      </div>
      {hasChildren && !node.isCollapsed && (
        <div className={styles.children}>
          {childNodes.map((child) => (
            <NodeItem
              key={child.id}
              node={child}
              outlineId={outlineId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
});
