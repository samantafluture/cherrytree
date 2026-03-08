/**
 * Application-wide constants.
 *
 * @example
 *   import { DEFAULT_OUTLINE_TITLE, API_PORT } from '@cherrytree/shared';
 *
 * @consumers packages/server, packages/client, packages/cli
 * @depends nothing — leaf module
 */

export const API_PORT = 3040;
export const DEFAULT_OUTLINE_TITLE = 'My Outline';
export const MAX_CONTENT_LENGTH = 10_000;
export const DEBOUNCE_SAVE_MS = 300;
export const SEARCH_DEBOUNCE_MS = 200;
