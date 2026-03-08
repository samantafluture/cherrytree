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

import {
  registerLogin,
  registerLogout,
  registerWhoami,
  registerToken,
  registerList,
  registerShow,
  registerAdd,
  registerEdit,
  registerDelete,
  registerMove,
  registerComplete,
  registerSearch,
  registerExport,
} from './commands';

const program = new Command();

program
  .name('cherrytree')
  .description('CherryTree — an outliner for humans and agents')
  .version('0.1.0')
  .option('--token <token>', 'Auth token (overrides env/config)')
  .option('--no-color', 'Disable color output');

// Auth commands
registerLogin(program);
registerLogout(program);
registerWhoami(program);
registerToken(program);

// Core commands
registerList(program);
registerShow(program);
registerAdd(program);
registerEdit(program);
registerDelete(program);
registerMove(program);
registerComplete(program);
registerSearch(program);
registerExport(program);

program.parse();
