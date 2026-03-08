/**
 * Tests for the resolveKeyAction pure function.
 * No DOM or React required — tests the keyboard logic in isolation.
 *
 * @depends hooks/useKeyboard.ts
 */

import type { Node } from '@cherrytree/shared';
import { describe, expect, it } from 'vitest';

import { resolveKeyAction } from '../../src/hooks/useKeyboard';

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

function key(
  k: string,
  mods: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {},
) {
  return {
    key: k,
    ctrlKey: mods.ctrl ?? false,
    shiftKey: mods.shift ?? false,
    altKey: mods.alt ?? false,
  };
}

describe('resolveKeyAction', () => {
  const node = makeNode();
  const sibling = makeNode({ id: 'node-2', position: 1 });
  const siblings = [node, sibling];
  const ctx = { node, siblings, content: 'Hello', hasChildren: false };

  it('returns newSibling on Enter', () => {
    const result = resolveKeyAction(key('Enter'), ctx);
    expect(result).toEqual({ type: 'newSibling', position: 1 });
  });

  it('returns toggleComplete on Ctrl+Enter', () => {
    const result = resolveKeyAction(key('Enter', { ctrl: true }), ctx);
    expect(result).toEqual({ type: 'toggleComplete' });
  });

  it('returns toggleCollapse on Ctrl+.', () => {
    const result = resolveKeyAction(key('.', { ctrl: true }), ctx);
    expect(result).toEqual({ type: 'toggleCollapse' });
  });

  it('returns deleteEmpty on Backspace when content is empty', () => {
    const result = resolveKeyAction(key('Backspace'), { ...ctx, content: '' });
    expect(result).toEqual({ type: 'deleteEmpty' });
  });

  it('returns null on Backspace when content is not empty', () => {
    const result = resolveKeyAction(key('Backspace'), ctx);
    expect(result).toBeNull();
  });

  it('returns indent on Tab when previous sibling exists', () => {
    const secondNode = makeNode({ id: 'node-2', position: 1 });
    const result = resolveKeyAction(key('Tab'), {
      ...ctx,
      node: secondNode,
      siblings: [node, secondNode],
    });
    expect(result).toEqual({ type: 'indent', newParentId: 'node-1' });
  });

  it('returns null on Tab when node is first sibling', () => {
    const result = resolveKeyAction(key('Tab'), ctx);
    expect(result).toBeNull();
  });

  it('returns outdent on Shift+Tab when node has parent', () => {
    const childNode = makeNode({ id: 'child-1', parentId: 'parent-1' });
    const result = resolveKeyAction(key('Tab', { shift: true }), {
      ...ctx,
      node: childNode,
    });
    expect(result).toEqual({ type: 'outdent' });
  });

  it('returns null on Shift+Tab at root level', () => {
    const result = resolveKeyAction(key('Tab', { shift: true }), ctx);
    expect(result).toBeNull();
  });

  it('returns moveUp on Alt+Shift+ArrowUp', () => {
    const secondNode = makeNode({ id: 'node-2', position: 1 });
    const result = resolveKeyAction(
      key('ArrowUp', { alt: true, shift: true }),
      {
        ...ctx,
        node: secondNode,
        siblings: [node, secondNode],
      },
    );
    expect(result).toEqual({ type: 'moveUp', targetPosition: 0 });
  });

  it('returns null on Alt+Shift+ArrowUp for first node', () => {
    const result = resolveKeyAction(
      key('ArrowUp', { alt: true, shift: true }),
      ctx,
    );
    expect(result).toBeNull();
  });

  it('returns moveDown on Alt+Shift+ArrowDown', () => {
    const result = resolveKeyAction(
      key('ArrowDown', { alt: true, shift: true }),
      { ...ctx, siblings },
    );
    expect(result).toEqual({ type: 'moveDown', targetPosition: 1 });
  });

  it('returns zoomIn on Alt+ArrowRight', () => {
    const result = resolveKeyAction(key('ArrowRight', { alt: true }), ctx);
    expect(result).toEqual({ type: 'zoomIn' });
  });

  it('returns zoomOut on Alt+ArrowLeft', () => {
    const result = resolveKeyAction(key('ArrowLeft', { alt: true }), ctx);
    expect(result).toEqual({ type: 'zoomOut' });
  });

  it('returns undo on Ctrl+Z', () => {
    const result = resolveKeyAction(key('z', { ctrl: true }), ctx);
    expect(result).toEqual({ type: 'undo' });
  });

  it('returns redo on Ctrl+Shift+Z', () => {
    const result = resolveKeyAction(key('z', { ctrl: true, shift: true }), ctx);
    expect(result).toEqual({ type: 'redo' });
  });

  it('returns null for unrecognized keys', () => {
    expect(resolveKeyAction(key('a'), ctx)).toBeNull();
    expect(resolveKeyAction(key('Escape'), ctx)).toBeNull();
  });
});
