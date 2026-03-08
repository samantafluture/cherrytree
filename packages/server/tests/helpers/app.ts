/**
 * Test app helper — creates a Fastify instance for route testing.
 *
 * @example
 *   import { createTestApp } from '../helpers/app';
 *   const app = await createTestApp();
 *   const res = await app.inject({ method: 'GET', url: '/health' });
 *
 * @consumers tests/routes/
 * @depends plugins/, routes/
 */

import Fastify from 'fastify';

import { authPlugin, errorHandler } from '../../src/plugins';
import { registerRoutes } from '../../src/routes';

export async function createTestApp() {
  const app = Fastify({ logger: false });

  app.register(errorHandler);
  app.register(authPlugin);
  registerRoutes(app);

  await app.ready();
  return app;
}
