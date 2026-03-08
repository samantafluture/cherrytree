/**
 * Hook for loading an outline's tree and syncing state.
 *
 * @example
 *   const { loading, error } = useOutline(outlineId);
 *
 * @consumers components/OutlineView
 * @depends api/, context/OutlineContext
 */

import { useCallback, useEffect, useState } from 'react';

import { api } from '../api';
import { useOutlineDispatch } from '../context';

export function useOutline(outlineId: string | null) {
  const dispatch = useOutlineDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTree = useCallback(async () => {
    if (!outlineId) return;
    setLoading(true);
    setError(null);

    const res = await api.nodes.getTree(outlineId);
    if (res.error || !res.data) {
      setError(res.error?.message ?? 'Failed to load tree');
      dispatch({ type: 'SET_SYNC_STATUS', payload: { status: 'error' } });
    } else {
      dispatch({ type: 'SET_TREE', payload: { nodes: res.data } });
    }
    setLoading(false);
  }, [outlineId, dispatch]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  return { loading, error, reload: loadTree };
}
