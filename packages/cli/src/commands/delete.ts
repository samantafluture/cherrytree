/**
 * Delete command — remove a node from an outline.
 *
 * @example
 *   cherrytree delete <outlineId> <nodeId>
 *
 * @consumers src/index.ts
 * @depends utils/
 */

import type { Command } from 'commander';

import { requireAuth } from './helpers';
import { printError } from '../utils';

export function registerDelete(program: Command) {
  program
    .command('delete <outlineId> <nodeId>')
    .description('Delete a node (and its children)')
    .action(async (outlineId: string, nodeId: string) => {
      const api = requireAuth(program);
      const res = await api.nodes.delete(outlineId, nodeId);

      if (res.error) {
        printError(res.error.message);
        process.exit(1);
      }

      console.log('Node deleted.');
    });
}
