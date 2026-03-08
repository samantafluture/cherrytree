/**
 * Whoami command — display the current authenticated user.
 *
 * @example
 *   cherrytree whoami
 *
 * @consumers src/index.ts
 * @depends utils/
 */

import type { Command } from 'commander';

import {
  createApiClient,
  resolveBaseUrl,
  resolveToken,
  printError,
} from '../utils';

export function registerWhoami(program: Command) {
  program
    .command('whoami')
    .description('Display current authenticated user')
    .action(async () => {
      const token = resolveToken();
      if (!token) {
        printError('Not logged in. Run `cherrytree login` first.');
        process.exit(1);
      }

      const api = createApiClient(token, resolveBaseUrl());
      // Use outlines list as a lightweight auth check — the auth header returns user info
      const res = await api.outlines.list();
      if (res.error) {
        printError(res.error.message);
        process.exit(1);
      }

      console.log(`Authenticated (token: ${token.slice(0, 12)}...)`);
    });
}
