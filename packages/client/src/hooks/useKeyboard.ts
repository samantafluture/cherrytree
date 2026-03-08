/**
 * Keyboard shortcut handler for outliner interactions.
 *
 * @example
 *   const handler = useKeyboard({ node, outlineId, siblings, ... });
 *   <div onKeyDown={handler} />
 *
 * @consumers components/NodeItem
 * @depends context/OutlineContext (types only)
 */

import type { Node } from '@cherrytree/shared';
import { useCallback } from 'react';

import type { OutlineAction } from '../context';

export type KeyboardContext = {
  node: Node;
  outlineId: string;
  siblings: Node[];
  getContent: () => string;
  dispatch: (action: OutlineAction) => void;
  createNode: (
    content: string,
    parentId: string | null,
    position?: number,
  ) => void;
  deleteNode: (id: string) => void;
  moveNode: (id: string, parentId: string | null, position: number) => void;
};

/** Pure logic: determines the action for a keyboard event. No DOM side effects. */
export function resolveKeyAction(
  e: { key: string; ctrlKey: boolean; shiftKey: boolean; altKey: boolean },
  ctx: {
    node: Node;
    siblings: Node[];
    content: string;
    hasChildren: boolean;
  },
): KeyAction | null {
  const { key, ctrlKey, shiftKey, altKey } = e;
  const { node, siblings, content } = ctx;
  const index = siblings.findIndex((s) => s.id === node.id);

  // Ctrl+Z / Ctrl+Shift+Z — undo/redo
  if (ctrlKey && key === 'z' && !shiftKey) return { type: 'undo' };
  if (ctrlKey && key === 'z' && shiftKey) return { type: 'redo' };
  if (ctrlKey && key === 'Z') return { type: 'redo' };

  // Ctrl+Enter — toggle complete
  if (ctrlKey && key === 'Enter') return { type: 'toggleComplete' };

  // Ctrl+. — toggle collapse
  if (ctrlKey && key === '.') return { type: 'toggleCollapse' };

  // Enter — new sibling
  if (key === 'Enter' && !ctrlKey && !shiftKey) {
    return { type: 'newSibling', position: node.position + 1 };
  }

  // Backspace on empty — delete
  if (key === 'Backspace' && content === '') {
    return { type: 'deleteEmpty' };
  }

  // Tab — indent (become child of previous sibling)
  if (key === 'Tab' && !shiftKey) {
    if (index <= 0) return null;
    const prevSibling = siblings[index - 1];
    return { type: 'indent', newParentId: prevSibling.id };
  }

  // Shift+Tab — outdent (become sibling of parent)
  if (key === 'Tab' && shiftKey) {
    if (!node.parentId) return null;
    return { type: 'outdent' };
  }

  // Alt+Shift+Up — move up among siblings
  if (altKey && shiftKey && key === 'ArrowUp') {
    if (index <= 0) return null;
    return { type: 'moveUp', targetPosition: siblings[index - 1].position };
  }

  // Alt+Shift+Down — move down among siblings
  if (altKey && shiftKey && key === 'ArrowDown') {
    if (index >= siblings.length - 1) return null;
    return {
      type: 'moveDown',
      targetPosition: siblings[index + 1].position,
    };
  }

  // Alt+Right — zoom in
  if (altKey && key === 'ArrowRight') {
    return { type: 'zoomIn' };
  }

  // Alt+Left — zoom out
  if (altKey && key === 'ArrowLeft') {
    return { type: 'zoomOut' };
  }

  return null;
}

export type KeyAction =
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'toggleComplete' }
  | { type: 'toggleCollapse' }
  | { type: 'newSibling'; position: number }
  | { type: 'deleteEmpty' }
  | { type: 'indent'; newParentId: string }
  | { type: 'outdent' }
  | { type: 'moveUp'; targetPosition: number }
  | { type: 'moveDown'; targetPosition: number }
  | { type: 'zoomIn' }
  | { type: 'zoomOut' };

/** React hook that creates a keyDown handler from KeyboardContext. */
export function useKeyboard(ctx: KeyboardContext) {
  const { node, siblings, dispatch, createNode, deleteNode, moveNode } = ctx;

  return useCallback(
    (e: React.KeyboardEvent) => {
      const content = ctx.getContent();
      const hasChildren = false; // determined by caller, not needed for resolve
      const action = resolveKeyAction(e, {
        node,
        siblings,
        content,
        hasChildren,
      });
      if (!action) return;

      e.preventDefault();

      switch (action.type) {
        case 'undo':
          dispatch({ type: 'UNDO' });
          break;
        case 'redo':
          dispatch({ type: 'REDO' });
          break;
        case 'toggleComplete':
          dispatch({
            type: 'UPDATE_NODE',
            payload: {
              id: node.id,
              changes: { isCompleted: !node.isCompleted },
            },
          });
          break;
        case 'toggleCollapse':
          dispatch({
            type: 'UPDATE_NODE',
            payload: {
              id: node.id,
              changes: { isCollapsed: !node.isCollapsed },
            },
          });
          break;
        case 'newSibling':
          createNode('', node.parentId, action.position);
          break;
        case 'deleteEmpty':
          deleteNode(node.id);
          break;
        case 'indent':
          moveNode(node.id, action.newParentId, 0);
          break;
        case 'outdent':
          if (!node.parentId) break;
          moveNode(node.id, null, 0);
          break;
        case 'moveUp':
          moveNode(node.id, node.parentId, action.targetPosition);
          break;
        case 'moveDown':
          moveNode(node.id, node.parentId, action.targetPosition);
          break;
        case 'zoomIn':
          dispatch({ type: 'ZOOM_TO', payload: { nodeId: node.id } });
          break;
        case 'zoomOut':
          dispatch({
            type: 'ZOOM_TO',
            payload: { nodeId: node.parentId },
          });
          break;
      }
    },
    [node, siblings, ctx, dispatch, createNode, deleteNode, moveNode],
  );
}
