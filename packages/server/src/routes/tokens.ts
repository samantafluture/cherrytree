/**
 * API token management routes — create, list, revoke tokens.
 *
 * @example
 *   POST /api/tokens { name, expires_in_days? }
 *   GET  /api/tokens
 *   DELETE /api/tokens/:id
 *
 * @consumers routes/index.ts
 * @depends services/token.service.ts
 */

import type { FastifyInstance } from 'fastify';

import { db } from '../db';
import { TokenService } from '../services';
import { ValidationError } from '../utils';

export async function tokenRoutes(server: FastifyInstance) {
  const tokenService = new TokenService(db);

  /** List active tokens for the current user. */
  server.get('/api/tokens', async (request) => {
    const tokens = await tokenService.listActive(request.user.id);
    return {
      data: tokens.map((t) => ({
        id: t.id,
        name: t.name,
        token_prefix: t.tokenPrefix,
        expires_at: t.expiresAt,
        last_used_at: t.lastUsedAt,
        created_at: t.createdAt,
      })),
    };
  });

  /** Create a new API token. Returns the raw token once. */
  server.post('/api/tokens', async (request, reply) => {
    const { name, expires_in_days } = request.body as {
      name?: string;
      expires_in_days?: number;
    };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('Token name is required');
    }

    const { token, record } = await tokenService.create(
      request.user.id,
      name.trim(),
      expires_in_days,
    );

    return reply.status(201).send({
      data: {
        id: record.id,
        name: record.name,
        token,
        token_prefix: record.tokenPrefix,
        expires_at: record.expiresAt,
        created_at: record.createdAt,
      },
    });
  });

  /** Revoke (delete) an API token. */
  server.delete('/api/tokens/:id', async (request) => {
    const { id } = request.params as { id: string };
    const deleted = await tokenService.revoke(request.user.id, id);
    if (!deleted) {
      return { data: null, error: { code: 'NOT_FOUND', message: 'Token not found' } };
    }
    return { data: { deleted: true } };
  });
}
