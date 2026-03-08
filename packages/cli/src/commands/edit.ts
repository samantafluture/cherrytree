/**
 * Edit command — update a node's content.
 *
 * @example
 *   cherrytree edit <outlineId> <nodeId> "New content"
 *
 * @consumers src/index.ts
 * @depends utils/
 */

import type { Command } from 'commander';

import { requireAuth } from './helpers';
import { printError, printJson } from '../utils';

export function registerEdit(program: Command) {
  program
    .command('edit <outlineId> <nodeId> <content>')
    .description('Edit a node\'s content')
    .option('--format <fmt>', 'Output format: text or json', 'text')
    .action(
      async (
        outlineId: string,
        nodeId: string,
        content: string,
        opts: { format: string },
      ) => {
        const api = requireAuth(program);
        const res = await api.nodes.update(outlineId, nodeId, { content });

        if (res.error || !res.data) {
          printError(res.error?.message ?? 'Failed to edit node');
          process.exit(1);
        }

        if (opts.format === 'json') {
          printJson(res.data);
        } else {
          console.log(`Updated node ${res.data.id}`);
        }
      },
    );
}
