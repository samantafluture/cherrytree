/**
 * List command — shows outlines or a node tree.
 *
 * @example
 *   cherrytree list
 *   cherrytree list --outline <id>
 *   cherrytree list --outline <id> --node <id> --depth 2
 *
 * @consumers src/index.ts
 * @depends utils/
 */

import type { Command } from 'commander';

import { requireAuth } from './helpers';
import {
  printError,
  printJson,
  printOutlines,
  printTree,
} from '../utils';

export function registerList(program: Command) {
  program
    .command('list')
    .description('List outlines, or show a node tree for an outline')
    .option('-o, --outline <id>', 'Outline ID to show tree for')
    .option('-n, --node <id>', 'Root node for subtree')
    .option('-d, --depth <n>', 'Max tree depth')
    .option('--format <fmt>', 'Output format: tree or json', 'tree')
    .action(
      async (opts: {
        outline?: string;
        node?: string;
        depth?: string;
        format: string;
      }) => {
        const api = requireAuth(program);

        if (!opts.outline) {
          // List outlines
          const res = await api.outlines.list();
          if (res.error || !res.data) {
            printError(res.error?.message ?? 'Failed to list outlines');
            process.exit(1);
          }
          if (opts.format === 'json') {
            printJson(res.data);
          } else {
            printOutlines(res.data);
          }
          return;
        }

        // Show tree for outline
        const res = await api.nodes.tree(opts.outline);
        if (res.error || !res.data) {
          printError(res.error?.message ?? 'Failed to get tree');
          process.exit(1);
        }

        if (opts.format === 'json') {
          printJson(res.data);
        } else {
          printTree(res.data, program.opts().noColor);
        }
      },
    );
}
