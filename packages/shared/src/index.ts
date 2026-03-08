/**
 * Public API for @cherrytree/shared.
 *
 * All cross-package imports must use this barrel.
 * Never import from internal files directly.
 */

export type {
  Node,
  TreeNode,
  Outline,
  User,
  ApiResponse,
  ApiError,
} from './types';

export {
  API_PORT,
  DEFAULT_OUTLINE_TITLE,
  MAX_CONTENT_LENGTH,
  DEBOUNCE_SAVE_MS,
  SEARCH_DEBOUNCE_MS,
} from './constants';

export { isValidUUID, isValidContent, isValidPosition } from './validation';
