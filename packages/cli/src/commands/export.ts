/**
 * Export command — export an outline as Markdown or JSON.
 *
 * @example
 *   cherrytree export <outlineId> --format md
 *   cherrytree export <outlineId> --format json
 *
 * @consumers src/index.ts
 * @depends utils/
 */

import type { Command } from 'commander';

import { requireAuth } from './helpers';
import { printError, printJson } from '../utils';

export function registerExport(program: Command) {
  program
    .command('export <outlineId>')
    .description('Export an outline to stdout')
    .option('--format <fmt>', 'Export format: md or json', 'md')
    .action(async (outlineId: string, opts: { format: string }) => {
      const api = requireAuth(program);
      const format = opts.format === 'json' ? 'json' : 'md';
      const res = await api.nodes.export(outlineId, format);

      if (res.error || !res.data) {
        printError(res.error?.message ?? 'Export failed');
        process.exit(1);
      }

      if (format === 'json') {
        printJson(res.data);
      } else {
        // Markdown export returns string content
        console.log(typeof res.data === 'string' ? res.data : JSON.stringify(res.data));
      }
    });
}
