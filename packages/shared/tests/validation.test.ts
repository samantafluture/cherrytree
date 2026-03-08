import { describe, expect, it } from 'vitest';

import { isValidContent, isValidPosition, isValidUUID } from '../src';

describe('validation', () => {
  describe('isValidUUID', () => {
    it('accepts valid UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('rejects invalid strings', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('isValidContent', () => {
    it('accepts content within limit', () => {
      expect(isValidContent('Hello world')).toBe(true);
    });

    it('rejects content exceeding limit', () => {
      expect(isValidContent('x'.repeat(10_001))).toBe(false);
    });
  });

  describe('isValidPosition', () => {
    it('accepts non-negative integers', () => {
      expect(isValidPosition(0)).toBe(true);
      expect(isValidPosition(5)).toBe(true);
    });

    it('rejects negative numbers', () => {
      expect(isValidPosition(-1)).toBe(false);
    });

    it('rejects non-integers', () => {
      expect(isValidPosition(1.5)).toBe(false);
    });
  });
});
