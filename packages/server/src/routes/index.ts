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

export function registerRoutes(server: FastifyInstance) {
  server.get('/health', async () => {
    return { status: 'ok' };
  });
}
