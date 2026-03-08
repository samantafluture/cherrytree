/**
 * Tests for the outline reducer including undo/redo.
 *
 * @depends context/outline-reducer.ts
 */

import type { Node } from '@cherrytree/shared';
import { describe, expect, it } from 'vitest';

import {
  initialState,
  outlineReducer,
} from '../../src/context/outline-reducer';
import type { OutlineState } from '../../src/context/outline-reducer';

function makeNode(overrides: Partial<Node> = {}): Node {
  return {
    id: 'node-1',
    outlineId: 'outline-1',
    parentId: null,
    content: 'Hello',
    position: 0,
    isCompleted: false,
    isCollapsed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function stateWith(nodes: Node[]): OutlineState {
  return outlineReducer(initialState, {
    type: 'SET_TREE',
    payload: { nodes },
  });
}

describe('outlineReducer', () => {
  describe('SET_TREE', () => {
    it('populates nodes and derives root IDs', () => {
      const n1 = makeNode({ id: 'a', position: 1 });
      const n2 = makeNode({ id: 'b', position: 0 });
      const state = stateWith([n1, n2]);
      expect(state.nodes.size).toBe(2);
      expect(state.rootIds).toEqual(['b', 'a']);
    });
  });

  describe('ADD_NODE', () => {
    it('adds a node to the map', () => {
      const node = makeNode();
      const state = outlineReducer(initialState, {
        type: 'ADD_NODE',
        payload: { node },
      });
      expect(state.nodes.get('node-1')).toBeDefined();
      expect(state.rootIds).toContain('node-1');
    });
  });

  describe('UPDATE_NODE', () => {
    it('updates node fields', () => {
      const base = stateWith([makeNode()]);
      const state = outlineReducer(base, {
        type: 'UPDATE_NODE',
        payload: { id: 'node-1', changes: { content: 'Updated' } },
      });
      expect(state.nodes.get('node-1')!.content).toBe('Updated');
    });

    it('returns same state for unknown node', () => {
      const base = stateWith([makeNode()]);
      const state = outlineReducer(base, {
        type: 'UPDATE_NODE',
        payload: { id: 'unknown', changes: { content: 'x' } },
      });
      expect(state).toBe(base);
    });
  });

  describe('DELETE_NODE', () => {
    it('removes node and descendants', () => {
      const parent = makeNode({ id: 'parent' });
      const child = makeNode({ id: 'child', parentId: 'parent' });
      const base = stateWith([parent, child]);
      const state = outlineReducer(base, {
        type: 'DELETE_NODE',
        payload: { id: 'parent' },
      });
      expect(state.nodes.size).toBe(0);
    });
  });

  describe('MOVE_NODE', () => {
    it('updates parentId and position', () => {
      const n1 = makeNode({ id: 'a', position: 0 });
      const n2 = makeNode({ id: 'b', position: 1 });
      const base = stateWith([n1, n2]);
      const state = outlineReducer(base, {
        type: 'MOVE_NODE',
        payload: { id: 'b', parentId: 'a', position: 0 },
      });
      const moved = state.nodes.get('b')!;
      expect(moved.parentId).toBe('a');
      expect(moved.position).toBe(0);
    });
  });

  describe('ZOOM_TO', () => {
    it('sets zoomed node ID', () => {
      const state = outlineReducer(initialState, {
        type: 'ZOOM_TO',
        payload: { nodeId: 'abc' },
      });
      expect(state.zoomedNodeId).toBe('abc');
    });
  });

  describe('undo/redo', () => {
    it('undoes an ADD_NODE', () => {
      const node = makeNode();
      let state = outlineReducer(initialState, {
        type: 'ADD_NODE',
        payload: { node },
      });
      expect(state.nodes.size).toBe(1);
      expect(state.undoStack.length).toBe(1);

      state = outlineReducer(state, { type: 'UNDO' });
      expect(state.nodes.size).toBe(0);
      expect(state.undoStack.length).toBe(0);
      expect(state.redoStack.length).toBe(1);
    });

    it('redoes after undo', () => {
      const node = makeNode();
      let state = outlineReducer(initialState, {
        type: 'ADD_NODE',
        payload: { node },
      });
      state = outlineReducer(state, { type: 'UNDO' });
      state = outlineReducer(state, { type: 'REDO' });
      expect(state.nodes.size).toBe(1);
    });

    it('undoes an UPDATE_NODE', () => {
      const base = stateWith([makeNode({ content: 'original' })]);
      let state = outlineReducer(base, {
        type: 'UPDATE_NODE',
        payload: { id: 'node-1', changes: { content: 'changed' } },
      });
      expect(state.nodes.get('node-1')!.content).toBe('changed');

      state = outlineReducer(state, { type: 'UNDO' });
      expect(state.nodes.get('node-1')!.content).toBe('original');
    });

    it('undoes a MOVE_NODE', () => {
      const n1 = makeNode({ id: 'a', position: 0 });
      const n2 = makeNode({ id: 'b', position: 1 });
      const base = stateWith([n1, n2]);
      let state = outlineReducer(base, {
        type: 'MOVE_NODE',
        payload: { id: 'b', parentId: 'a', position: 0 },
      });
      expect(state.nodes.get('b')!.parentId).toBe('a');

      state = outlineReducer(state, { type: 'UNDO' });
      expect(state.nodes.get('b')!.parentId).toBeNull();
      expect(state.nodes.get('b')!.position).toBe(1);
    });

    it('clears redo stack on new action', () => {
      const node = makeNode();
      let state = outlineReducer(initialState, {
        type: 'ADD_NODE',
        payload: { node },
      });
      state = outlineReducer(state, { type: 'UNDO' });
      expect(state.redoStack.length).toBe(1);

      const node2 = makeNode({ id: 'node-2' });
      state = outlineReducer(state, {
        type: 'ADD_NODE',
        payload: { node: node2 },
      });
      expect(state.redoStack.length).toBe(0);
    });

    it('does nothing when undo stack is empty', () => {
      const state = outlineReducer(initialState, { type: 'UNDO' });
      expect(state).toBe(initialState);
    });

    it('does nothing when redo stack is empty', () => {
      const state = outlineReducer(initialState, { type: 'REDO' });
      expect(state).toBe(initialState);
    });

    it('does not track non-undoable actions', () => {
      const state = outlineReducer(initialState, {
        type: 'ZOOM_TO',
        payload: { nodeId: 'abc' },
      });
      expect(state.undoStack.length).toBe(0);
    });
  });
});
