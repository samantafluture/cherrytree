/**
 * Outline state context — split into data and dispatch for performance.
 *
 * @example
 *   const { nodes, rootIds } = useOutlineData();
 *   const dispatch = useOutlineDispatch();
 *
 * @consumers components/OutlineView, components/NodeItem
 * @depends @cherrytree/shared
 */

import type { Node } from '@cherrytree/shared';
import { createContext, useContext, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';

export type OutlineState = {
  nodes: Map<string, Node>;
  rootIds: string[];
  zoomedNodeId: string | null;
  focusedNodeId: string | null;
  syncStatus: 'synced' | 'pending' | 'error';
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
    };

const initialState: OutlineState = {
  nodes: new Map(),
  rootIds: [],
  zoomedNodeId: null,
  focusedNodeId: null,
  syncStatus: 'synced',
};

function deriveRootIds(nodes: Map<string, Node>): string[] {
  const roots: Node[] = [];
  for (const node of nodes.values()) {
    if (node.parentId === null) roots.push(node);
  }
  roots.sort((a, b) => a.position - b.position);
  return roots.map((n) => n.id);
}

function outlineReducer(
  state: OutlineState,
  action: OutlineAction,
): OutlineState {
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
      if (!existing) return state;
      const nodes = new Map(state.nodes);
      nodes.set(action.payload.id, { ...existing, ...action.payload.changes });
      return { ...state, nodes };
    }

    case 'DELETE_NODE': {
      const nodes = new Map(state.nodes);
      // Delete the node and all descendants
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
      if (!existing) return state;
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
      return state;
  }
}

const OutlineDataContext = createContext<OutlineState | null>(null);
const OutlineDispatchContext = createContext<Dispatch<OutlineAction> | null>(
  null,
);

export function OutlineProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(outlineReducer, initialState);

  return (
    <OutlineDataContext.Provider value={state}>
      <OutlineDispatchContext.Provider value={dispatch}>
        {children}
      </OutlineDispatchContext.Provider>
    </OutlineDataContext.Provider>
  );
}

export function useOutlineData(): OutlineState {
  const ctx = useContext(OutlineDataContext);
  if (!ctx)
    throw new Error('useOutlineData must be used within OutlineProvider');
  return ctx;
}

export function useOutlineDispatch(): Dispatch<OutlineAction> {
  const ctx = useContext(OutlineDispatchContext);
  if (!ctx)
    throw new Error('useOutlineDispatch must be used within OutlineProvider');
  return ctx;
}
