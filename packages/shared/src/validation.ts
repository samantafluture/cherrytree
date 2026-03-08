/**
 * Shared validation utilities for input sanitization.
 *
 * @example
 *   import { isValidContent, isValidUUID } from '@cherrytree/shared';
 *   if (!isValidContent(input)) throw new Error('Invalid content');
 *
 * @consumers packages/server (routes), packages/cli (commands)
 * @depends constants.ts
 */

import { MAX_CONTENT_LENGTH } from './constants';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isValidContent(value: string): boolean {
  return value.length <= MAX_CONTENT_LENGTH;
}

export function isValidPosition(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}
