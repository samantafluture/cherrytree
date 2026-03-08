/**
 * Search command — find nodes matching a query.
 *
 * @example
 *   cherrytree search <outlineId> "groceries"
 *
 * @consumers src/index.ts
 * @depends utils/
 */

import type { Command } from 'commander';

import { requireAuth } from './helpers';
import { printError, printJson } from '../utils';

export function registerSearch(program: Command) {
  program
    .command('search <outlineId> <query>')
    .description('Search nodes in an outline')
    .option('--format <fmt>', 'Output format: text or json', 'text')
    .action(async (outlineId: string, query: string, opts: { format: string }) => {
      const api = requireAuth(program);
      const res = await api.nodes.search(outlineId, query);

      if (res.error || !res.data) {
        printError(res.error?.message ?? 'Search failed');
        process.exit(1);
      }

      if (opts.format === 'json') {
        printJson(res.data);
        return;
      }

      if (res.data.length === 0) {
        console.log('No results found.');
        return;
      }

      for (const node of res.data) {
        const status = node.isCompleted ? ' [done]' : '';
        console.log(`${node.id}  ${node.content}${status}`);
      }
    });
}
