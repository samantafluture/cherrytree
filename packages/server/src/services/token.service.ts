/**
 * API token management — create, list, revoke, validate tokens for agent auth.
 *
 * @example
 *   const svc = new TokenService(db);
 *   const { token, record } = await svc.create(userId, 'Claude Code', 90);
 *
 * @consumers routes/tokens.ts, plugins/auth.ts
 * @depends db/, bcrypt, crypto
 */

import crypto from 'node:crypto';

import { compare, hash } from 'bcrypt';
import { and, eq, isNull, or, gt } from 'drizzle-orm';

import { type Database, apiTokens } from '../db';

const BCRYPT_ROUNDS = 12;
const TOKEN_BYTES = 24;
const MAX_TOKENS_PER_USER = 5;
const TOKEN_PREFIX = 'ct_';

type TokenRow = typeof apiTokens.$inferSelect;

export class TokenService {
  constructor(private db: Database) {}

  /** Create a new API token. Returns the raw token (shown only once) and the DB record. */
  async create(
    userId: string,
    name: string,
    expiresInDays?: number,
  ): Promise<{ token: string; record: TokenRow }> {
    // Check token limit
    const existing = await this.listActive(userId);
    if (existing.length >= MAX_TOKENS_PER_USER) {
      throw new Error(`Maximum ${MAX_TOKENS_PER_USER} tokens per user`);
    }

    const rawBytes = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    const rawToken = `${TOKEN_PREFIX}${rawBytes}`;
    const tokenHash = await hash(rawToken, BCRYPT_ROUNDS);
    const tokenPrefix = rawToken.slice(0, 7);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 86_400_000)
      : null;

    const [record] = await this.db
      .insert(apiTokens)
      .values({ userId, name, tokenHash, tokenPrefix, expiresAt })
      .returning();

    return { token: rawToken, record };
  }

  /** List all active (non-expired) tokens for a user. */
  async listActive(userId: string): Promise<TokenRow[]> {
    return this.db
      .select()
      .from(apiTokens)
      .where(
        and(
          eq(apiTokens.userId, userId),
          or(isNull(apiTokens.expiresAt), gt(apiTokens.expiresAt, new Date())),
        ),
      );
  }

  /** Revoke a token by ID (must belong to user). Returns true if deleted. */
  async revoke(userId: string, tokenId: string): Promise<boolean> {
    const result = await this.db
      .delete(apiTokens)
      .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, userId)))
      .returning();
    return result.length > 0;
  }

  /** Validate a raw API token. Returns user ID if valid, null otherwise. */
  async validate(rawToken: string): Promise<string | null> {
    if (!rawToken.startsWith(TOKEN_PREFIX)) return null;

    const prefix = rawToken.slice(0, 7);
    const candidates = await this.db
      .select()
      .from(apiTokens)
      .where(
        and(
          eq(apiTokens.tokenPrefix, prefix),
          or(isNull(apiTokens.expiresAt), gt(apiTokens.expiresAt, new Date())),
        ),
      );

    for (const candidate of candidates) {
      const valid = await compare(rawToken, candidate.tokenHash);
      if (valid) {
        // Update last_used_at asynchronously
        this.db
          .update(apiTokens)
          .set({ lastUsedAt: new Date() })
          .where(eq(apiTokens.id, candidate.id))
          .then(() => {});
        return candidate.userId;
      }
    }

    return null;
  }
}
