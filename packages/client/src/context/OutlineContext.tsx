/**
 * Outline state context — split into data and dispatch for performance.
 *
 * @example
 *   const { nodes, rootIds } = useOutlineData();
 *   const dispatch = useOutlineDispatch();
 *
 * @consumers components/OutlineView, components/NodeItem
 * @depends outline-reducer.ts
 */

import { createContext, useContext, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';

import { initialState, outlineReducer } from './outline-reducer';
import type { OutlineAction, OutlineState } from './outline-reducer';

export type { OutlineAction, OutlineState };

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
