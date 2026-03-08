/**
 * Undo/redo helpers for outline state — builds inverse actions.
 *
 * @example
 *   const inverse = buildInverse(state, action);
 *
 * @consumers context/outline-reducer.ts
 * @depends @cherrytree/shared
 */

import type { Node } from '@cherrytree/shared';

import type { OutlineAction, OutlineState } from './outline-reducer';

export type UndoEntry = {
  action: OutlineAction;
  inverse: OutlineAction;
};

export const UNDOABLE_TYPES = new Set([
  'ADD_NODE',
  'DELETE_NODE',
  'UPDATE_NODE',
  'MOVE_NODE',
]);

export const MAX_UNDO = 50;

export function buildInverse(
  state: OutlineState,
  action: OutlineAction,
): OutlineAction | null {
  switch (action.type) {
    case 'ADD_NODE':
      return { type: 'DELETE_NODE', payload: { id: action.payload.node.id } };
    case 'DELETE_NODE': {
      const node = state.nodes.get(action.payload.id);
      if (!node) return null;
      return { type: 'ADD_NODE', payload: { node } };
    }
    case 'UPDATE_NODE': {
      const existing = state.nodes.get(action.payload.id);
      if (!existing) return null;
      const changes: Partial<Node> = {};
      for (const key of Object.keys(action.payload.changes) as (keyof Node)[]) {
        (changes as Record<string, unknown>)[key] = existing[key];
      }
      return {
        type: 'UPDATE_NODE',
        payload: { id: action.payload.id, changes },
      };
    }
    case 'MOVE_NODE': {
      const existing = state.nodes.get(action.payload.id);
      if (!existing) return null;
      return {
        type: 'MOVE_NODE',
        payload: {
          id: action.payload.id,
          parentId: existing.parentId,
          position: existing.position,
        },
      };
    }
    default:
      return null;
  }
}
