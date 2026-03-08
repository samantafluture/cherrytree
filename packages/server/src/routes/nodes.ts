/**
 * Node routes — tree operations, CRUD, move, search, export.
 *
 * @example
 *   GET /api/outlines/:id/tree
 *   POST /api/outlines/:id/nodes { content, parent_id, position }
 *
 * @consumers routes/index.ts
 * @depends services/node.service.ts, services/outline.service.ts, utils/errors
 */

import type { FastifyInstance } from 'fastify';

import { db } from '../db';
import { NodeService, OutlineService } from '../services';
import { NotFoundError } from '../utils';

export async function nodeRoutes(server: FastifyInstance) {
  const nodeService = new NodeService(db);
  const outlineService = new OutlineService(db);

  // Helper: verify outline ownership
  async function verifyOutline(outlineId: string, userId: string) {
    const outline = await outlineService.getById(outlineId, userId);
    if (!outline) throw new NotFoundError('Outline not found');
    return outline;
  }

  // GET /api/outlines/:id/tree
  server.get('/api/outlines/:id/tree', async (request) => {
    const { id } = request.params as { id: string };
    await verifyOutline(id, request.user.id);
    const tree = await nodeService.getTree(id);
    return { data: tree, error: null };
  });

  // GET /api/outlines/:id/nodes/:nodeId
  server.get('/api/outlines/:id/nodes/:nodeId', async (request) => {
    const { id, nodeId } = request.params as { id: string; nodeId: string };
    await verifyOutline(id, request.user.id);
    const node = await nodeService.getNode(nodeId);
    if (!node) throw new NotFoundError('Node not found');
    const children = await nodeService.getChildren(nodeId, id);
    return { data: { ...node, children }, error: null };
  });

  // POST /api/outlines/:id/nodes
  server.post('/api/outlines/:id/nodes', {
    schema: {
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string' },
          parent_id: { type: ['string', 'null'] },
          position: { type: 'integer', minimum: 0 },
        },
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      await verifyOutline(id, request.user.id);
      const { content, parent_id, position } = request.body as {
        content: string;
        parent_id?: string | null;
        position?: number;
      };
      const node = await nodeService.createNode(
        id,
        content,
        parent_id ?? null,
        position,
      );
      return reply.status(201).send({ data: node, error: null });
    },
  });

  // PATCH /api/outlines/:id/nodes/:nodeId
  server.patch('/api/outlines/:id/nodes/:nodeId', {
    schema: {
      body: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          is_completed: { type: 'boolean' },
          is_collapsed: { type: 'boolean' },
        },
      },
    },
    handler: async (request) => {
      const { id, nodeId } = request.params as { id: string; nodeId: string };
      await verifyOutline(id, request.user.id);
      const body = request.body as {
        content?: string;
        is_completed?: boolean;
        is_collapsed?: boolean;
      };
      const node = await nodeService.updateNode(nodeId, {
        content: body.content,
        isCompleted: body.is_completed,
        isCollapsed: body.is_collapsed,
      });
      if (!node) throw new NotFoundError('Node not found');
      return { data: node, error: null };
    },
  });

  // DELETE /api/outlines/:id/nodes/:nodeId
  server.delete('/api/outlines/:id/nodes/:nodeId', async (request) => {
    const { id, nodeId } = request.params as { id: string; nodeId: string };
    await verifyOutline(id, request.user.id);
    await nodeService.deleteNode(nodeId);
    return { data: { deleted: true }, error: null };
  });

  // POST /api/outlines/:id/nodes/:nodeId/move
  server.post('/api/outlines/:id/nodes/:nodeId/move', {
    schema: {
      body: {
        type: 'object',
        required: ['parent_id', 'position'],
        properties: {
          parent_id: { type: ['string', 'null'] },
          position: { type: 'integer', minimum: 0 },
        },
      },
    },
    handler: async (request) => {
      const { id, nodeId } = request.params as { id: string; nodeId: string };
      await verifyOutline(id, request.user.id);
      const { parent_id, position } = request.body as {
        parent_id: string | null;
        position: number;
      };
      const node = await nodeService.moveNode(nodeId, parent_id, position);
      if (!node) throw new NotFoundError('Node not found');
      return { data: node, error: null };
    },
  });

  // GET /api/outlines/:id/search?q=term
  server.get('/api/outlines/:id/search', async (request) => {
    const { id } = request.params as { id: string };
    const { q } = request.query as { q?: string };
    await verifyOutline(id, request.user.id);
    if (!q) return { data: [], error: null };
    const results = await nodeService.searchNodes(id, q);
    return { data: results, error: null };
  });

  // GET /api/outlines/:id/export?format=md|json
  server.get('/api/outlines/:id/export', async (request) => {
    const { id } = request.params as { id: string };
    const { format = 'json' } = request.query as { format?: string };
    await verifyOutline(id, request.user.id);
    const tree = await nodeService.getTree(id);

    if (format === 'json') {
      return { data: tree, error: null };
    }

    if (format === 'md') {
      const md = tree
        .map((n: Record<string, unknown>) => {
          const indent = '  '.repeat((n.depth as number) ?? 0);
          return `${indent}- ${n.content}`;
        })
        .join('\n');
      return { data: { markdown: md }, error: null };
    }

    return { data: tree, error: null };
  });
}
