/**
 * Test database helper — creates an isolated database connection for tests.
 *
 * @example
 *   import { setupTestDb, teardownTestDb } from '../helpers/db';
 *   let db: Database;
 *   beforeAll(async () => { db = await setupTestDb(); });
 *   afterAll(async () => { await teardownTestDb(); });
 *
 * @consumers tests/services/
 * @depends db/connection.ts, db/schema.ts
 */

import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { type Database } from '../../src/db';
import * as schema from '../../src/db/schema';

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://cherrytree:cherrytree_dev@localhost:5432/cherrytree';

let client: ReturnType<typeof postgres>;
let testDb: Database;

export async function setupTestDb(): Promise<Database> {
  client = postgres(TEST_DATABASE_URL);
  testDb = drizzle(client, { schema });

  // Clean tables in correct order (respect FK constraints)
  await testDb.execute(sql`DELETE FROM nodes`);
  await testDb.execute(sql`DELETE FROM sessions`);
  await testDb.execute(sql`DELETE FROM outlines`);
  await testDb.execute(sql`DELETE FROM users`);

  return testDb;
}

export async function teardownTestDb(): Promise<void> {
  if (client) {
    await client.end();
  }
}

/** Create a test user and return the user row. */
export async function createTestUser(db: Database, suffix = '') {
  const [user] = await db
    .insert(schema.users)
    .values({
      email: `test${suffix}@example.com`,
      username: `testuser${suffix}`,
    })
    .returning();
  return user;
}

/** Create a test outline and return the outline row. */
export async function createTestOutline(
  db: Database,
  userId: string,
  title = 'Test Outline',
) {
  const [outline] = await db
    .insert(schema.outlines)
    .values({ userId, title })
    .returning();
  return outline;
}
