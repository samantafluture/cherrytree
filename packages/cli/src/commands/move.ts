/**
 * Move/indent/outdent commands — reposition nodes in the tree.
 *
 * @example
 *   cherrytree move <outlineId> <nodeId> --parent <id> --pos 2
 *   cherrytree indent <outlineId> <nodeId>
 *   cherrytree outdent <outlineId> <nodeId>
 *
 * @consumers src/index.ts
 * @depends utils/
 */

import type { Command } from 'commander';

import { requireAuth } from './helpers';
import { printError, printJson } from '../utils';

export function registerMove(program: Command) {
  program
    .command('move <outlineId> <nodeId>')
    .description('Move a node to a new parent/position')
    .option('-p, --parent <id>', 'New parent node ID (omit for root)')
    .option('--pos <n>', 'Position among siblings', '0')
    .option('--format <fmt>', 'Output format: text or json', 'text')
    .action(
      async (
        outlineId: string,
        nodeId: string,
        opts: { parent?: string; pos: string; format: string },
      ) => {
        const api = requireAuth(program);
        const res = await api.nodes.move(
          outlineId,
          nodeId,
          opts.parent ?? null,
          parseInt(opts.pos, 10),
        );

        if (res.error || !res.data) {
          printError(res.error?.message ?? 'Failed to move node');
          process.exit(1);
        }

        if (opts.format === 'json') {
          printJson(res.data);
        } else {
          console.log(`Moved node ${res.data.id}`);
        }
      },
    );

  program
    .command('indent <outlineId> <nodeId>')
    .description('Indent node (make it a child of its previous sibling)')
    .action(async (outlineId: string, nodeId: string) => {
      const api = requireAuth(program);

      // Get the tree to find siblings
      const treeRes = await api.nodes.tree(outlineId);
      if (treeRes.error || !treeRes.data) {
        printError(treeRes.error?.message ?? 'Failed to get tree');
        process.exit(1);
      }

      const node = treeRes.data.find((n) => n.id === nodeId);
      if (!node) {
        printError('Node not found');
        process.exit(1);
      }

      const siblings = treeRes.data
        .filter((n) => n.parentId === node.parentId)
        .sort((a, b) => a.position - b.position);

      const idx = siblings.findIndex((s) => s.id === nodeId);
      if (idx <= 0) {
        printError('Cannot indent — no previous sibling');
        process.exit(1);
      }

      const newParent = siblings[idx - 1];
      const res = await api.nodes.move(outlineId, nodeId, newParent.id, 0);

      if (res.error) {
        printError(res.error.message);
        process.exit(1);
      }

      console.log(`Indented under ${newParent.id}`);
    });

  program
    .command('outdent <outlineId> <nodeId>')
    .description('Outdent node (make it a sibling of its parent)')
    .action(async (outlineId: string, nodeId: string) => {
      const api = requireAuth(program);

      const treeRes = await api.nodes.tree(outlineId);
      if (treeRes.error || !treeRes.data) {
        printError(treeRes.error?.message ?? 'Failed to get tree');
        process.exit(1);
      }

      const node = treeRes.data.find((n) => n.id === nodeId);
      if (!node || !node.parentId) {
        printError('Cannot outdent — node is already at root level');
        process.exit(1);
      }

      const parent = treeRes.data.find((n) => n.id === node.parentId);
      const res = await api.nodes.move(
        outlineId,
        nodeId,
        parent?.parentId ?? null,
        (parent?.position ?? 0) + 1,
      );

      if (res.error) {
        printError(res.error.message);
        process.exit(1);
      }

      console.log(`Outdented node ${nodeId}`);
    });
}
