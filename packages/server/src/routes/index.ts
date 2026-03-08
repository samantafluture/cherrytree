/**
 * Route registration barrel.
 *
 * @example
 *   import { registerRoutes } from './routes';
 *   registerRoutes(server);
 *
 * @consumers src/index.ts
 * @depends services/, plugins/
 */

import type { FastifyInstance } from 'fastify';

import { authRoutes } from './auth';
import { nodeRoutes } from './nodes';
import { outlineRoutes } from './outlines';
import { tokenRoutes } from './tokens';

export function registerRoutes(server: FastifyInstance) {
  server.get('/health', async () => {
    return { status: 'ok' };
  });

  server.register(authRoutes);
  server.register(outlineRoutes);
  server.register(nodeRoutes);
  server.register(tokenRoutes);
}
