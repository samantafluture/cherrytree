/**
 * Outline CRUD routes — list, create, get, delete.
 *
 * @example
 *   GET /api/outlines
 *   POST /api/outlines { title }
 *
 * @consumers routes/index.ts
 * @depends services/outline.service.ts, utils/errors
 */

import type { FastifyInstance } from 'fastify';

import { db } from '../db';
import { OutlineService } from '../services';
import { NotFoundError } from '../utils';

export async function outlineRoutes(server: FastifyInstance) {
  const outlineService = new OutlineService(db);

  server.get('/api/outlines', async (request) => {
    const outlines = await outlineService.listByUser(request.user.id);
    return { data: outlines, error: null };
  });

  server.post('/api/outlines', {
    schema: {
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
        },
      },
    },
    handler: async (request, reply) => {
      const { title } = (request.body as { title?: string }) ?? {};
      const outline = await outlineService.create(request.user.id, title);
      return reply.status(201).send({ data: outline, error: null });
    },
  });

  server.get('/api/outlines/:id', async (request) => {
    const { id } = request.params as { id: string };
    const outline = await outlineService.getById(id, request.user.id);
    if (!outline) throw new NotFoundError('Outline not found');
    return { data: outline, error: null };
  });

  server.delete('/api/outlines/:id', async (request) => {
    const { id } = request.params as { id: string };
    const deleted = await outlineService.delete(id, request.user.id);
    if (!deleted) throw new NotFoundError('Outline not found');
    return { data: { deleted: true }, error: null };
  });
}
