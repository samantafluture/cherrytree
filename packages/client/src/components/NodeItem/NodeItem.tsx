/**
 * Single node row — bullet + contenteditable editor + recursive children.
 *
 * @example
 *   <NodeItem node={node} outlineId={id} depth={0} />
 *
 * @consumers components/NodeList
 * @depends components/BulletIcon, hooks/, context/
 */

import type { Node } from '@cherrytree/shared';
import { memo, useCallback, useEffect, useRef } from 'react';

import { getSiblings, useOutlineData, useOutlineDispatch } from '../../context';
import { useDragDrop } from '../../hooks/useDragDrop';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useNodeActions } from '../../hooks/useNodeActions';
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
  const actions = useNodeActions(outlineId);
  const editorRef = useRef<HTMLDivElement>(null);
  // Track whether the user is actively editing to avoid React clobbering the DOM
  const isEditingRef = useRef(false);

  // Sync content from props only when it changes externally (e.g. undo, SET_TREE)
  useEffect(() => {
    if (isEditingRef.current) return;
    if (editorRef.current && editorRef.current.textContent !== node.content) {
      editorRef.current.textContent = node.content;
    }
  }, [node.content]);

  const childNodes: Node[] = [];
  for (const n of nodes.values()) {
    if (n.parentId === node.id) childNodes.push(n);
  }
  childNodes.sort((a, b) => a.position - b.position);
  const hasChildren = childNodes.length > 0;
  const siblings = getSiblings(nodes, node.parentId);

  const { dragOver, handlers: dragHandlers } = useDragDrop(
    node,
    actions.moveNode,
  );

  const getContent = useCallback(
    () => editorRef.current?.textContent ?? '',
    [],
  );

  const handleKeyDown = useKeyboard({
    node,
    outlineId,
    siblings,
    getContent,
    dispatch,
    createNode: actions.createNode,
    deleteNode: actions.deleteNode,
    moveNode: actions.moveNode,
  });

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
      // Defer clearing so REPLACE_NODE can transfer focusedNodeId before it's nulled
      requestAnimationFrame(() => {
        dispatch({ type: 'FOCUS_NODE', payload: { nodeId: null } });
      });
    }
  }, [focusedNodeId, node.id, dispatch]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isEditingRef.current = true;
    actions.updateNode(node.id, editorRef.current.textContent ?? '');
    // Allow external sync again after a tick (debounced save will fire later)
    requestAnimationFrame(() => {
      isEditingRef.current = false;
    });
  }, [node.id, actions]);

  const handleBulletClick = useCallback(() => {
    if (hasChildren) {
      actions.toggleCollapse(node.id, node.isCollapsed);
    } else {
      dispatch({ type: 'ZOOM_TO', payload: { nodeId: node.id } });
    }
  }, [hasChildren, node.id, node.isCollapsed, actions, dispatch]);

  const rowClass = [
    styles.row,
    dragOver === 'above' ? styles.dropAbove : '',
    dragOver === 'below' ? styles.dropBelow : '',
    dragOver === 'child' ? styles.dropChild : '',
  ]
    .filter(Boolean)
    .join(' ');

  const contentClass = [
    styles.content,
    node.isCompleted ? styles.completed : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.nodeItem}>
      <div
        className={rowClass}
        onDragOver={dragHandlers.onDragOver}
        onDragLeave={dragHandlers.onDragLeave}
        onDrop={dragHandlers.onDrop}
      >
        <div
          draggable
          onDragStart={dragHandlers.onDragStart}
          className={styles.dragHandle}
        >
          <BulletIcon
            hasChildren={hasChildren}
            collapsed={node.isCollapsed}
            completed={node.isCompleted}
            onClick={handleBulletClick}
          />
        </div>
        <div
          ref={editorRef}
          className={contentClass}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          role="textbox"
          aria-label="Node content"
        />
        {hasChildren && node.isCollapsed && (
          <span className={styles.childCount}>{childNodes.length}</span>
        )}
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
