/**
 * Config file management — reads/writes ~/.cherrytreerc for auth tokens.
 *
 * Token resolution order (first match wins):
 *   1. --token flag (explicit, per-command)
 *   2. CHERRYTREE_TOKEN env var (agent-friendly)
 *   3. ~/.cherrytreerc file (human-friendly, written by `cherrytree login`)
 *
 * @example
 *   const token = resolveToken(cmdOpts);
 *   saveConfig({ token: 'abc', baseUrl: 'http://localhost:3040' });
 *
 * @consumers utils/api-client.ts, commands/
 * @depends node:fs, node:path, node:os
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type Config = {
  token?: string;
  baseUrl?: string;
};

const CONFIG_PATH = path.join(os.homedir(), '.cherrytreerc');

/** Read config from ~/.cherrytreerc. Returns empty object if file doesn't exist. */
export function readConfig(): Config {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as Config;
  } catch {
    return {};
  }
}

/** Write config to ~/.cherrytreerc. Merges with existing values. */
export function saveConfig(updates: Partial<Config>): void {
  const existing = readConfig();
  const merged = { ...existing, ...updates };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2) + '\n', {
    mode: 0o600,
  });
}

/** Delete ~/.cherrytreerc. */
export function clearConfig(): void {
  try {
    fs.unlinkSync(CONFIG_PATH);
  } catch {
    // File doesn't exist — that's fine
  }
}

/** Resolve auth token from flag > env > config file. */
export function resolveToken(cmdToken?: string): string | null {
  if (cmdToken) return cmdToken;
  if (process.env.CHERRYTREE_TOKEN) return process.env.CHERRYTREE_TOKEN;
  const config = readConfig();
  return config.token ?? null;
}

/** Resolve base URL from env > config > default. */
export function resolveBaseUrl(): string {
  if (process.env.CHERRYTREE_URL) return process.env.CHERRYTREE_URL;
  const config = readConfig();
  return config.baseUrl ?? 'http://localhost:3040';
}
