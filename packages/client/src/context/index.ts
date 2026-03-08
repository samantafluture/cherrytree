/**
 * Public API for context module.
 *
 * @consumers App.tsx, components/, hooks/
 * @depends AuthContext.tsx, OutlineContext.tsx, outline-reducer.ts
 */

export { AuthProvider, useAuth } from './AuthContext';
export {
  OutlineProvider,
  useOutlineData,
  useOutlineDispatch,
} from './OutlineContext';
export type { OutlineState, OutlineAction } from './OutlineContext';
export {
  deriveRootIds,
  getChildNodes,
  getSiblings,
  outlineReducer,
} from './outline-reducer';
