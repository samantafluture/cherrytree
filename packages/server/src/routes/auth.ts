/**
 * Authentication routes — register, login, logout, GitHub OAuth.
 *
 * @example
 *   POST /auth/register { email, username, password }
 *   POST /auth/login { email, password }
 *   POST /auth/logout (authenticated)
 *
 * @consumers routes/index.ts
 * @depends services/auth.service.ts
 */

import type { FastifyInstance } from 'fastify';

import { db } from '../db';
import { AuthService } from '../services';

export async function authRoutes(server: FastifyInstance) {
  const authService = new AuthService(db);

  server.post('/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'username', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string', minLength: 1, maxLength: 100 },
          password: { type: 'string', minLength: 8 },
        },
      },
    },
    handler: async (request, reply) => {
      const { email, username, password } = request.body as {
        email: string;
        username: string;
        password: string;
      };

      try {
        const user = await authService.register(email, username, password);
        const token = await authService.login(email, password);
        return reply.status(201).send({
          data: {
            user: { id: user.id, email: user.email, username: user.username },
            token,
          },
          error: null,
        });
      } catch (err) {
        return reply.status(409).send({
          data: null,
          error: { code: 'CONFLICT', message: (err as Error).message },
        });
      }
    },
  });

  server.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { email, password } = request.body as {
        email: string;
        password: string;
      };

      const token = await authService.login(email, password);
      if (!token) {
        return reply.status(401).send({
          data: null,
          error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
        });
      }

      const user = await authService.validateSession(token);
      return reply.send({
        data: {
          user: user
            ? { id: user.id, email: user.email, username: user.username }
            : null,
          token,
        },
        error: null,
      });
    },
  });

  server.post('/auth/logout', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      await authService.logout(authHeader.slice(7));
    }
    return reply.send({ data: { message: 'Logged out' }, error: null });
  });

  // GitHub OAuth stubs (full implementation requires client ID/secret)
  server.get('/auth/github', async (_request, reply) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return reply.status(501).send({
        data: null,
        error: {
          code: 'NOT_CONFIGURED',
          message: 'GitHub OAuth not configured',
        },
      });
    }
    return reply.redirect(
      `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email`,
    );
  });

  server.get('/auth/github/callback', async (_request, reply) => {
    // Full implementation requires exchanging code for token with GitHub API
    return reply.status(501).send({
      data: null,
      error: {
        code: 'NOT_CONFIGURED',
        message: 'GitHub OAuth callback not yet implemented',
      },
    });
  });
}
