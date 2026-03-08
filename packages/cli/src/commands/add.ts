/**
 * Add command — create a new node in an outline.
 *
 * @example
 *   cherrytree add <outlineId> "Buy groceries" --parent <parentId>
 *
 * @consumers src/index.ts
 * @depends utils/
 */

import type { Command } from 'commander';

import { requireAuth } from './helpers';
import { printError, printJson } from '../utils';

export function registerAdd(program: Command) {
  program
    .command('add <outlineId> <content>')
    .description('Add a new node to an outline')
    .option('-p, --parent <id>', 'Parent node ID')
    .option('--pos <n>', 'Position among siblings')
    .option('--format <fmt>', 'Output format: text or json', 'text')
    .action(
      async (
        outlineId: string,
        content: string,
        opts: { parent?: string; pos?: string; format: string },
      ) => {
        const api = requireAuth(program);
        const position = opts.pos ? parseInt(opts.pos, 10) : undefined;
        const res = await api.nodes.create(outlineId, content, opts.parent, position);

        if (res.error || !res.data) {
          printError(res.error?.message ?? 'Failed to add node');
          process.exit(1);
        }

        if (opts.format === 'json') {
          printJson(res.data);
        } else {
          console.log(`Created node ${res.data.id}`);
        }
      },
    );
}
