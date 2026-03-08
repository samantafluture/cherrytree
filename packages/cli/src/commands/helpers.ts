/**
 * Shared command helpers — auth check, option parsing.
 *
 * @example
 *   const api = requireAuth(program);
 *
 * @consumers commands/*
 * @depends utils/
 */

import type { Command } from 'commander';

import {
  type ApiClient,
  createApiClient,
  resolveBaseUrl,
  resolveToken,
  printError,
} from '../utils';

/** Resolve token and create API client, or exit with error. */
export function requireAuth(program: Command): ApiClient {
  const globalOpts = program.opts() as { token?: string };
  const token = resolveToken(globalOpts.token);
  if (!token) {
    printError('Not logged in. Run `cherrytree login` or set CHERRYTREE_TOKEN.');
    process.exit(1);
  }
  return createApiClient(token, resolveBaseUrl());
}
