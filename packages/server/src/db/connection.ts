/**
 * Database connection using Drizzle ORM and postgres.js driver.
 *
 * @example
 *   import { db, createDb } from '../db';
 *   const tree = await db.select().from(nodes);
 *
 * @consumers services/
 * @depends drizzle-orm, postgres, db/schema.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://cherrytree:cherrytree_dev@localhost:5432/cherrytree';

/** Create a new database connection with a custom URL. */
export function createDb(url: string) {
  const client = postgres(url);
  return drizzle(client, { schema });
}

const client = postgres(DATABASE_URL);

/** Default database instance for the application. */
export const db = drizzle(client, { schema });

export type Database = ReturnType<typeof createDb>;
