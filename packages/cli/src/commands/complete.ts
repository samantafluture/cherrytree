/**
 * Complete and collapse commands — toggle node states.
 *
 * @example
 *   cherrytree complete <outlineId> <nodeId>
 *   cherrytree collapse <outlineId> <nodeId>
 *
 * @consumers src/index.ts
 * @depends utils/
 */

import type { Command } from 'commander';

import { requireAuth } from './helpers';
import { printError } from '../utils';

export function registerComplete(program: Command) {
  program
    .command('complete <outlineId> <nodeId>')
    .description('Toggle node completion status')
    .action(async (outlineId: string, nodeId: string) => {
      const api = requireAuth(program);

      const getRes = await api.nodes.get(outlineId, nodeId);
      if (getRes.error || !getRes.data) {
        printError(getRes.error?.message ?? 'Node not found');
        process.exit(1);
      }

      const current = getRes.data.isCompleted;
      const res = await api.nodes.update(outlineId, nodeId, {
        is_completed: !current,
      });

      if (res.error) {
        printError(res.error.message);
        process.exit(1);
      }

      console.log(`Node ${!current ? 'completed' : 'uncompleted'}.`);
    });

  program
    .command('collapse <outlineId> <nodeId>')
    .description('Toggle node collapse status')
    .action(async (outlineId: string, nodeId: string) => {
      const api = requireAuth(program);

      const getRes = await api.nodes.get(outlineId, nodeId);
      if (getRes.error || !getRes.data) {
        printError(getRes.error?.message ?? 'Node not found');
        process.exit(1);
      }

      const current = getRes.data.isCollapsed;
      const res = await api.nodes.update(outlineId, nodeId, {
        is_collapsed: !current,
      });

      if (res.error) {
        printError(res.error.message);
        process.exit(1);
      }

      console.log(`Node ${!current ? 'collapsed' : 'expanded'}.`);
    });
}
