/**
 * Show command — display a single node with its children.
 *
 * @example
 *   cherrytree show <outlineId> <nodeId>
 *
 * @consumers src/index.ts
 * @depends utils/
 */

import type { Command } from 'commander';

import { requireAuth } from './helpers';
import { printError, printJson, printNode } from '../utils';

export function registerShow(program: Command) {
  program
    .command('show <outlineId> <nodeId>')
    .description('Show a single node with its children')
    .option('--format <fmt>', 'Output format: text or json', 'text')
    .action(async (outlineId: string, nodeId: string, opts: { format: string }) => {
      const api = requireAuth(program);
      const res = await api.nodes.get(outlineId, nodeId);

      if (res.error || !res.data) {
        printError(res.error?.message ?? 'Node not found');
        process.exit(1);
      }

      if (opts.format === 'json') {
        printJson(res.data);
      } else {
        const { children, ...node } = res.data;
        printNode(node, children);
      }
    });
}
