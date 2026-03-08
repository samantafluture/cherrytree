/**
 * Output formatting — tree view and JSON for CLI display.
 *
 * @example
 *   printTree(nodes);
 *   printJson(data);
 *
 * @consumers commands/
 * @depends @cherrytree/shared
 */

import type { Node, Outline } from '@cherrytree/shared';

const INDENT = '  ';
const BULLET = '• ';
const CHECK = '✓ ';
const COLLAPSED = '▸ ';

/** Print data as formatted JSON. */
export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/** Print a list of outlines in human-readable format. */
export function printOutlines(outlines: Outline[]): void {
  if (outlines.length === 0) {
    console.log('No outlines found.');
    return;
  }
  for (const o of outlines) {
    console.log(`${o.id}  ${o.title}`);
  }
}

/** Print a tree of nodes with indentation. */
export function printTree(nodes: Node[], noColor = false): void {
  if (nodes.length === 0) {
    console.log('(empty)');
    return;
  }

  // Build parent→children map
  const childMap = new Map<string | null, Node[]>();
  for (const n of nodes) {
    const key = n.parentId;
    if (!childMap.has(key)) childMap.set(key, []);
    childMap.get(key)!.push(n);
  }

  // Sort children by position
  for (const children of childMap.values()) {
    children.sort((a, b) => a.position - b.position);
  }

  function walk(parentId: string | null, depth: number) {
    const children = childMap.get(parentId) ?? [];
    for (const node of children) {
      const prefix = INDENT.repeat(depth);
      const bullet = node.isCompleted
        ? CHECK
        : node.isCollapsed
          ? COLLAPSED
          : BULLET;
      const content = node.content || '(empty)';
      const dim = node.isCompleted && !noColor ? '\x1b[2m' : '';
      const reset = dim ? '\x1b[0m' : '';
      console.log(`${prefix}${bullet}${dim}${content}${reset}`);
      walk(node.id, depth + 1);
    }
  }

  walk(null, 0);
}

/** Print a single node with its ID and content. */
export function printNode(node: Node, children: Node[] = []): void {
  const status = node.isCompleted ? ' [done]' : '';
  console.log(`${node.id}${status}`);
  console.log(`  ${node.content || '(empty)'}`);
  if (children.length > 0) {
    console.log(`  Children: ${children.length}`);
    for (const c of children) {
      console.log(`    ${BULLET}${c.content || '(empty)'}  (${c.id})`);
    }
  }
}

/** Format an error for display. */
export function printError(message: string): void {
  console.error(`Error: ${message}`);
}
