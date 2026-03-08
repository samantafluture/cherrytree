/**
 * CherryTree CLI entry point.
 *
 * @example
 *   cherrytree --version
 *   cherrytree list
 *   cherrytree add "New item" --parent <id>
 *
 * @consumers end users, AI agents
 * @depends commands/, utils/
 */

import { Command } from 'commander';

const program = new Command();

program
  .name('cherrytree')
  .description('CherryTree — an outliner for humans and agents')
  .version('0.1.0');

program.parse();
