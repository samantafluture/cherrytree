/**
 * Auth plugin — extracts Bearer token and attaches user to request.
 * Supports both session tokens and API tokens (ct_ prefix).
 *
 * @example
 *   import { authPlugin } from '../plugins';
 *   server.register(authPlugin);
 *
 * @consumers src/index.ts, routes/
 * @depends services/auth.service.ts, services/token.service.ts, utils/errors
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import fp from 'fastify-plugin';

import { db, users } from '../db';
import { AuthService, TokenService } from '../services';
import { UnauthorizedError } from '../utils';

// Extend Fastify's request type to include user
declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      username: string;
    };
  }
}

async function authPluginFn(server: FastifyInstance) {
  const authService = new AuthService(db);
  const tokenService = new TokenService(db);

  server.decorateRequest('user', null);

  server.addHook('onRequest', async (request: FastifyRequest) => {
    // Skip auth for public routes
    const publicPaths = [
      '/health',
      '/auth/login',
      '/auth/register',
      '/auth/github',
      '/auth/github/callback',
    ];
    const isPublic = publicPaths.some((p) => request.url.startsWith(p));
    if (isPublic) return;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError();
    }

    const token = authHeader.slice(7);

    // API token (ct_ prefix) or session token
    if (token.startsWith('ct_')) {
      const userId = await tokenService.validate(token);
      if (!userId) {
        throw new UnauthorizedError('Invalid or expired API token');
      }
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new UnauthorizedError('User not found');
      }
      request.user = {
        id: user.id,
        email: user.email,
        username: user.username,
      };
    } else {
      const user = await authService.validateSession(token);
      if (!user) {
        throw new UnauthorizedError('Invalid or expired session');
      }
      request.user = {
        id: user.id,
        email: user.email,
        username: user.username,
      };
    }
  });
}

export const authPlugin = fp(authPluginFn, {
  name: 'auth',
});
