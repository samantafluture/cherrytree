/**
 * Logout command — destroys session and clears config.
 *
 * @example
 *   cherrytree logout
 *
 * @consumers src/index.ts
 * @depends utils/
 */

import type { Command } from 'commander';

import {
  clearConfig,
  createApiClient,
  resolveBaseUrl,
  resolveToken,
} from '../utils';

export function registerLogout(program: Command) {
  program
    .command('logout')
    .description('Log out and clear saved credentials')
    .action(async () => {
      const token = resolveToken();
      if (token) {
        const api = createApiClient(token, resolveBaseUrl());
        await api.auth.logout();
      }
      clearConfig();
      console.log('Logged out.');
    });
}
