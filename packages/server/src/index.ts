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
import cors from '@fastify/cors';
import Fastify from 'fastify';

import { authPlugin, errorHandler } from './plugins';
import { registerRoutes } from './routes';

const server = Fastify({ logger: true });

server.register(cors, { origin: true });
server.register(errorHandler);
server.register(authPlugin);
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

export { server };
