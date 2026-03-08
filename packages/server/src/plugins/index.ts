/**
 * Fastify plugins barrel export.
 *
 * @consumers src/index.ts
 * @depends fastify
 */

export { errorHandler } from './error-handler';
export { authPlugin } from './auth';
