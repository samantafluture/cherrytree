/**
 * Handles user registration, login, and session management.
 *
 * @example
 *   const auth = new AuthService(db);
 *   const user = await auth.register('a@b.com', 'alice', 'hunter2');
 *   const token = await auth.login('a@b.com', 'hunter2');
 *   const session = await auth.validateSession(token!);
 *
 * @consumers routes/auth.ts, middleware/auth.ts
 * @depends db/, bcrypt, crypto
 */

import crypto from 'node:crypto';

import { compare, hash } from 'bcrypt';
import { eq } from 'drizzle-orm';

import { type Database, users, sessions } from '../db';

type UserRow = typeof users.$inferSelect;

const BCRYPT_ROUNDS = 12;
const SESSION_BYTES = 64;
const SESSION_TTL_DAYS = 30;

export class AuthService {
  constructor(private db: Database) {}

  /** Register a new user with email/password. Returns the user row. Throws if email/username taken. */
  async register(
    email: string,
    username: string,
    password: string,
  ): Promise<UserRow> {
    const passwordHash = await hash(password, BCRYPT_ROUNDS);

    const [user] = await this.db
      .insert(users)
      .values({ email, username, passwordHash })
      .returning();

    return user;
  }

  /** Authenticate with email/password. Returns session token or null. */
  async login(email: string, password: string): Promise<string | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user?.passwordHash) return null;

    const valid = await compare(password, user.passwordHash);
    if (!valid) return null;

    return this.createSession(user.id);
  }

  /** Find or create a user from GitHub OAuth data. Returns session token. */
  async loginWithGithub(
    githubId: string,
    email: string,
    username: string,
    avatarUrl: string | null,
  ): Promise<string> {
    const [existing] = await this.db
      .select()
      .from(users)
      .where(eq(users.githubId, githubId));

    if (existing) {
      // Update profile fields that may have changed on GitHub
      await this.db
        .update(users)
        .set({ email, username, avatarUrl, updatedAt: new Date() })
        .where(eq(users.id, existing.id));

      return this.createSession(existing.id);
    }

    const [user] = await this.db
      .insert(users)
      .values({ email, username, githubId, avatarUrl })
      .returning();

    return this.createSession(user.id);
  }

  /** Validate a session token. Returns user or null if expired/invalid. */
  async validateSession(token: string): Promise<UserRow | null> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token));

    if (!session || session.expiresAt < new Date()) return null;

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, session.userId));

    return user ?? null;
  }

  /** Create a session for a user. Returns the token. */
  private async createSession(userId: string): Promise<string> {
    const token = crypto.randomBytes(SESSION_BYTES).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

    await this.db.insert(sessions).values({ userId, token, expiresAt });

    return token;
  }

  /** Destroy a session by token. */
  async logout(token: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.token, token));
  }
}
