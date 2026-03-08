/**
 * Database module barrel export.
 *
 * @example
 *   import { db, createDb, users, nodes, outlines, sessions } from '../db';
 *
 * @consumers services/
 * @depends drizzle-orm, postgres, PostgreSQL
 */

export { db, createDb, type Database } from './connection';
export { users, outlines, nodes, sessions, apiTokens } from './schema';
