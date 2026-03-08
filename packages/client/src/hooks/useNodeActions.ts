/**
 * Hook for node CRUD operations with optimistic updates.
 *
 * @example
 *   const { createNode, updateNode, deleteNode } = useNodeActions(outlineId);
 *
 * @consumers components/NodeItem, components/OutlineView
 * @depends api/, context/OutlineContext
 */

import { DEBOUNCE_SAVE_MS } from '@cherrytree/shared';
import { useCallback, useRef } from 'react';

import { api } from '../api';
import { useOutlineDispatch } from '../context';

export function useNodeActions(outlineId: string) {
  const dispatch = useOutlineDispatch();
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const createNode = useCallback(
    async (content: string, parentId: string | null, position?: number) => {
      dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'pending' } });
      const res = await api.nodes.create(
        outlineId,
        content,
        parentId,
        position,
      );
      if (res.data) {
        dispatch({ type: 'ADD_NODE', payload: { node: res.data } });
        dispatch({ type: 'FOCUS_NODE', payload: { nodeId: res.data.id } });
        dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'synced' } });
        return res.data;
      }
      dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'error' } });
      return null;
    },
    [outlineId, dispatch],
  );

  const updateNode = useCallback(
    (nodeId: string, content: string) => {
      // Optimistic update
      dispatch({
        type: 'UPDATE_NODE',
        payload: { id: nodeId, changes: { content } },
      });

      // Debounced save
      const existing = saveTimers.current.get(nodeId);
      if (existing) clearTimeout(existing);

      saveTimers.current.set(
        nodeId,
        setTimeout(async () => {
          saveTimers.current.delete(nodeId);
          dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'pending' } });
          const res = await api.nodes.update(outlineId, nodeId, { content });
          dispatch({
            type: 'SET_SYNC_STATUS',
            payload: { status: res.error ? 'error' : 'synced' },
          });
        }, DEBOUNCE_SAVE_MS),
      );
    },
    [outlineId, dispatch],
  );

  const deleteNode = useCallback(
    async (nodeId: string) => {
      dispatch({ type: 'DELETE_NODE', payload: { id: nodeId } });
      dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'pending' } });
      const res = await api.nodes.delete(outlineId, nodeId);
      dispatch({
        type: 'SET_SYNC_STATUS',
        payload: { status: res.error ? 'error' : 'synced' },
      });
    },
    [outlineId, dispatch],
  );

  const toggleComplete = useCallback(
    async (nodeId: string, current: boolean) => {
      dispatch({
        type: 'UPDATE_NODE',
        payload: { id: nodeId, changes: { isCompleted: !current } },
      });
      dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'pending' } });
      const res = await api.nodes.update(outlineId, nodeId, {
        is_completed: !current,
      });
      dispatch({
        type: 'SET_SYNC_STATUS',
        payload: { status: res.error ? 'error' : 'synced' },
      });
    },
    [outlineId, dispatch],
  );

  const toggleCollapse = useCallback(
    async (nodeId: string, current: boolean) => {
      dispatch({
        type: 'UPDATE_NODE',
        payload: { id: nodeId, changes: { isCollapsed: !current } },
      });
      const res = await api.nodes.update(outlineId, nodeId, {
        is_collapsed: !current,
      });
      dispatch({
        type: 'SET_SYNC_STATUS',
        payload: { status: res.error ? 'error' : 'synced' },
      });
    },
    [outlineId, dispatch],
  );

  return { createNode, updateNode, deleteNode, toggleComplete, toggleCollapse };
}
