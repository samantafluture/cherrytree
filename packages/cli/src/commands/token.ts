/**
 * Token management commands — create, list, revoke API tokens.
 *
 * @example
 *   cherrytree token create "Claude Code" --expires 90
 *   cherrytree token list
 *   cherrytree token revoke <id>
 *
 * @consumers src/index.ts
 * @depends utils/
 */

import type { Command } from 'commander';

import { requireAuth } from './helpers';
import { printError, printJson } from '../utils';

export function registerToken(program: Command) {
  const tokenCmd = program
    .command('token')
    .description('Manage API tokens for agent authentication');

  tokenCmd
    .command('create <name>')
    .description('Create a new API token (shown only once)')
    .option('--expires <days>', 'Token expiry in days (default: 90)', '90')
    .option('--no-expiry', 'Create a token that never expires')
    .option('--format <fmt>', 'Output format: text or json', 'text')
    .action(async (name: string, opts: { expires: string; expiry: boolean; format: string }) => {
      const api = requireAuth(program);
      const days = opts.expiry ? parseInt(opts.expires, 10) : undefined;
      const res = await api.tokens.create(name, days);

      if (res.error || !res.data) {
        printError(res.error?.message ?? 'Failed to create token');
        process.exit(1);
      }

      if (opts.format === 'json') {
        printJson(res.data);
      } else {
        console.log(`Token created: ${res.data.token}`);
        console.log('Save this token — it will not be shown again.');
      }
    });

  tokenCmd
    .command('list')
    .description('List active API tokens')
    .option('--format <fmt>', 'Output format: text or json', 'text')
    .action(async (opts: { format: string }) => {
      const api = requireAuth(program);
      const res = await api.tokens.list();

      if (res.error) {
        printError(res.error.message);
        process.exit(1);
      }

      const tokens = res.data as Array<{
        id: string;
        name: string;
        token_prefix: string;
        expires_at: string | null;
        last_used_at: string | null;
      }>;

      if (opts.format === 'json') {
        printJson(tokens);
        return;
      }

      if (!tokens || tokens.length === 0) {
        console.log('No active tokens.');
        return;
      }

      for (const t of tokens) {
        const expiry = t.expires_at
          ? `expires ${new Date(t.expires_at).toLocaleDateString()}`
          : 'no expiry';
        const used = t.last_used_at
          ? `last used ${new Date(t.last_used_at).toLocaleDateString()}`
          : 'never used';
        console.log(`${t.id}  ${t.token_prefix}...  ${t.name}  (${expiry}, ${used})`);
      }
    });

  tokenCmd
    .command('revoke <id>')
    .description('Revoke an API token')
    .action(async (id: string) => {
      const api = requireAuth(program);
      const res = await api.tokens.revoke(id);

      if (res.error) {
        printError(res.error.message);
        process.exit(1);
      }

      console.log('Token revoked.');
    });
}
