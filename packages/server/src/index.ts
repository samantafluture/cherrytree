/**
 * CherryTree API server entry point.
 *
 * @example
 *   pnpm --filter @cherrytree/server dev
 *
 * @consumers Docker, deployment scripts
 * @depends routes/, plugins/, db/
 */

import { API_PORT } from '@cherrytree/shared';
import Fastify from 'fastify';

import { registerRoutes } from './routes';

const server = Fastify({ logger: true });

registerRoutes(server);

const start = async () => {
  try {
    await server.listen({ port: API_PORT, host: '0.0.0.0' });
    server.log.info(`Server listening on port ${API_PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
