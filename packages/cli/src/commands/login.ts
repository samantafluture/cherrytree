/**
 * Login command — authenticates via email/password and saves session token.
 *
 * @example
 *   cherrytree login
 *
 * @consumers src/index.ts
 * @depends utils/
 */

import { createInterface } from 'node:readline';

import type { Command } from 'commander';

import {
  createApiClient,
  resolveBaseUrl,
  saveConfig,
  printError,
} from '../utils';

function prompt(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    if (hidden && process.stdin.isTTY) {
      process.stdout.write(question);
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      let input = '';
      const onData = (ch: Buffer) => {
        const c = ch.toString();
        if (c === '\n' || c === '\r') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (c === '\u0003') {
          process.exit(0);
        } else if (c === '\u007f') {
          input = input.slice(0, -1);
        } else {
          input += c;
        }
      };
      stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

export function registerLogin(program: Command) {
  program
    .command('login')
    .description('Authenticate with email and password')
    .action(async () => {
      const baseUrl = resolveBaseUrl();
      const email = await prompt('Email: ');
      const password = await prompt('Password: ', true);

      // Use empty token for login request
      const api = createApiClient('', baseUrl);
      const res = await api.auth.login(email, password);

      if (res.error || !res.data) {
        printError(res.error?.message ?? 'Login failed');
        process.exit(1);
      }

      saveConfig({ token: res.data.token, baseUrl });
      console.log(`Logged in as ${res.data.user.username}`);
    });
}
