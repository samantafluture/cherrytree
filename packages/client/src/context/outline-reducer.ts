/**
 * Pure reducer logic for outline state — includes undo/redo.
 *
 * @example
 *   const newState = outlineReducer(state, { type: 'UNDO' });
 *
 * @consumers context/OutlineContext.tsx
 * @depends @cherrytree/shared, outline-undo.ts
 */

import type { Node } from '@cherrytree/shared';

import type { UndoEntry } from './outline-undo';
import { MAX_UNDO, UNDOABLE_TYPES, buildInverse } from './outline-undo';

export type OutlineState = {
  nodes: Map<string, Node>;
  rootIds: string[];
  zoomedNodeId: string | null;
  focusedNodeId: string | null;
  syncStatus: 'synced' | 'pending' | 'error';
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
};

export type OutlineAction =
  | { type: 'SET_TREE'; payload: { nodes: Node[] } }
  | { type: 'ADD_NODE'; payload: { node: Node } }
  | { type: 'UPDATE_NODE'; payload: { id: string; changes: Partial<Node> } }
  | { type: 'DELETE_NODE'; payload: { id: string } }
  | {
      type: 'MOVE_NODE';
      payload: { id: string; parentId: string | null; position: number };
    }
  | { type: 'ZOOM_TO'; payload: { nodeId: string | null } }
  | { type: 'FOCUS_NODE'; payload: { nodeId: string | null } }
  | {
      type: 'SET_SYNC_STATUS';
      payload: { status: OutlineState['syncStatus'] };
    }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export const initialState: OutlineState = {
  nodes: new Map(),
  rootIds: [],
  zoomedNodeId: null,
  focusedNodeId: null,
  syncStatus: 'synced',
  undoStack: [],
  redoStack: [],
};

export function deriveRootIds(nodes: Map<string, Node>): string[] {
  const roots: Node[] = [];
  for (const node of nodes.values()) {
    if (node.parentId === null) roots.push(node);
  }
  roots.sort((a, b) => a.position - b.position);
  return roots.map((n) => n.id);
}

export function getChildNodes(
  nodes: Map<string, Node>,
  parentId: string,
): Node[] {
  const children: Node[] = [];
  for (const node of nodes.values()) {
    if (node.parentId === parentId) children.push(node);
  }
  children.sort((a, b) => a.position - b.position);
  return children;
}

export function getSiblings(
  nodes: Map<string, Node>,
  parentId: string | null,
): Node[] {
  const siblings: Node[] = [];
  for (const node of nodes.values()) {
    if (node.parentId === parentId) siblings.push(node);
  }
  siblings.sort((a, b) => a.position - b.position);
  return siblings;
}

function applyAction(
  state: OutlineState,
  action: OutlineAction,
): OutlineState | null {
  switch (action.type) {
    case 'SET_TREE': {
      const nodes = new Map<string, Node>();
      for (const node of action.payload.nodes) {
        nodes.set(node.id, node);
      }
      return {
        ...state,
        nodes,
        rootIds: deriveRootIds(nodes),
        syncStatus: 'synced',
      };
    }
    case 'ADD_NODE': {
      const nodes = new Map(state.nodes);
      nodes.set(action.payload.node.id, action.payload.node);
      return { ...state, nodes, rootIds: deriveRootIds(nodes) };
    }
    case 'UPDATE_NODE': {
      const existing = state.nodes.get(action.payload.id);
      if (!existing) return null;
      const nodes = new Map(state.nodes);
      nodes.set(action.payload.id, { ...existing, ...action.payload.changes });
      return { ...state, nodes };
    }
    case 'DELETE_NODE': {
      const nodes = new Map(state.nodes);
      const toDelete = [action.payload.id];
      while (toDelete.length > 0) {
        const id = toDelete.pop()!;
        nodes.delete(id);
        for (const node of nodes.values()) {
          if (node.parentId === id) toDelete.push(node.id);
        }
      }
      return { ...state, nodes, rootIds: deriveRootIds(nodes) };
    }
    case 'MOVE_NODE': {
      const existing = state.nodes.get(action.payload.id);
      if (!existing) return null;
      const nodes = new Map(state.nodes);
      nodes.set(action.payload.id, {
        ...existing,
        parentId: action.payload.parentId,
        position: action.payload.position,
      });
      return { ...state, nodes, rootIds: deriveRootIds(nodes) };
    }
    case 'ZOOM_TO':
      return { ...state, zoomedNodeId: action.payload.nodeId };
    case 'FOCUS_NODE':
      return { ...state, focusedNodeId: action.payload.nodeId };
    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.payload.status };
    default:
      return null;
  }
}

export function outlineReducer(
  state: OutlineState,
  action: OutlineAction,
): OutlineState {
  if (action.type === 'UNDO') {
    const entry = state.undoStack[state.undoStack.length - 1];
    if (!entry) return state;
    const result = applyAction(state, entry.inverse);
    if (!result) return state;
    return {
      ...result,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, entry].slice(-MAX_UNDO),
    };
  }

  if (action.type === 'REDO') {
    const entry = state.redoStack[state.redoStack.length - 1];
    if (!entry) return state;
    const result = applyAction(state, entry.action);
    if (!result) return state;
    return {
      ...result,
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, entry].slice(-MAX_UNDO),
    };
  }

  const result = applyAction(state, action);
  if (!result) return state;

  if (UNDOABLE_TYPES.has(action.type)) {
    const inverse = buildInverse(state, action);
    if (inverse) {
      return {
        ...result,
        undoStack: [...state.undoStack, { action, inverse }].slice(-MAX_UNDO),
        redoStack: [],
      };
    }
  }

  return result;
}
