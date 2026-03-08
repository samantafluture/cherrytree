/**
 * Error handling plugin — maps AppError subclasses to HTTP responses.
 *
 * @example
 *   import { errorHandler } from '../plugins';
 *   server.register(errorHandler);
 *
 * @consumers src/index.ts
 * @depends utils/errors
 */

import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { AppError } from '../utils';

async function errorHandlerPlugin(server: FastifyInstance) {
  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        data: null,
        error: { code: error.code, message: error.message },
      });
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        data: null,
        error: { code: 'VALIDATION_ERROR', message: error.message },
      });
    }

    // Unknown errors
    server.log.error(error);
    return reply.status(500).send({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });
}

export const errorHandler = fp(errorHandlerPlugin, {
  name: 'error-handler',
});
