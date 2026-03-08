import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

import { type Database } from '../../src/db';
import { createTestApp } from '../helpers/app';
import { setupTestDb, teardownTestDb } from '../helpers/db';

describe('Auth Routes', () => {
  let db: Database;
  let app: FastifyInstance;

  beforeAll(async () => {
    db = await setupTestDb();
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  beforeEach(async () => {
    await db.execute(sql`DELETE FROM sessions`);
    await db.execute(sql`DELETE FROM nodes`);
    await db.execute(sql`DELETE FROM outlines`);
    await db.execute(sql`DELETE FROM users`);
  });

  describe('POST /auth/register', () => {
    it('registers a new user and returns token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.user.email).toBe('test@example.com');
      expect(body.data.token).toBeDefined();
      expect(body.error).toBeNull();
    });

    it('rejects duplicate email', async () => {
      // Register once
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'dup@example.com',
          username: 'user1',
          password: 'password123',
        },
      });
      // Register again with same email
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'dup@example.com',
          username: 'user2',
          password: 'password123',
        },
      });
      expect(res.statusCode).toBe(409);
    });

    it('rejects short password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
          username: 'testuser',
          password: 'short',
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns token for valid credentials', async () => {
      // Register first
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'login@example.com',
          username: 'loginuser',
          password: 'password123',
        },
      });
      // Login
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'login@example.com', password: 'password123' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.token).toBeDefined();
    });

    it('rejects invalid password', async () => {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'bad@example.com',
          username: 'baduser',
          password: 'password123',
        },
      });
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'bad@example.com', password: 'wrongpassword' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('invalidates session token', async () => {
      // Register + get token
      const regRes = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'logout@example.com',
          username: 'logoutuser',
          password: 'password123',
        },
      });
      const token = JSON.parse(regRes.body).data.token;

      // Logout
      const logoutRes = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(logoutRes.statusCode).toBe(200);

      // Try to access protected route with old token
      const protectedRes = await app.inject({
        method: 'GET',
        url: '/api/outlines',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(protectedRes.statusCode).toBe(401);
    });
  });

  describe('unauthenticated access', () => {
    it('rejects requests without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/outlines',
      });
      expect(res.statusCode).toBe(401);
    });

    it('allows health check without auth', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
      });
      expect(res.statusCode).toBe(200);
    });
  });
});
