/**
 * CRUD operations for outlines, scoped to a user.
 *
 * @example
 *   const service = new OutlineService(db);
 *   const outline = await service.create(userId, 'My Notes');
 *   const all = await service.listByUser(userId);
 *
 * @consumers routes/outlines.ts
 * @depends db/
 */

import { and, eq } from 'drizzle-orm';

import { type Database, outlines } from '../db';

type OutlineRow = typeof outlines.$inferSelect;

export class OutlineService {
  constructor(private db: Database) {}

  /** List all outlines belonging to a user. */
  async listByUser(userId: string): Promise<OutlineRow[]> {
    return this.db
      .select()
      .from(outlines)
      .where(eq(outlines.userId, userId))
      .orderBy(outlines.createdAt);
  }

  /** Get a single outline by ID, scoped to a user. */
  async getById(
    outlineId: string,
    userId: string,
  ): Promise<OutlineRow | undefined> {
    const [outline] = await this.db
      .select()
      .from(outlines)
      .where(and(eq(outlines.id, outlineId), eq(outlines.userId, userId)));
    return outline;
  }

  /** Create a new outline for a user. */
  async create(userId: string, title = 'My Outline'): Promise<OutlineRow> {
    const [outline] = await this.db
      .insert(outlines)
      .values({ userId, title })
      .returning();
    return outline;
  }

  /** Update an outline's title. */
  async update(
    outlineId: string,
    userId: string,
    title: string,
  ): Promise<OutlineRow | undefined> {
    const [outline] = await this.db
      .update(outlines)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(outlines.id, outlineId), eq(outlines.userId, userId)))
      .returning();
    return outline;
  }

  /** Delete an outline and all its nodes (cascade). */
  async delete(outlineId: string, userId: string): Promise<boolean> {
    const result = await this.db
      .delete(outlines)
      .where(and(eq(outlines.id, outlineId), eq(outlines.userId, userId)))
      .returning();
    return result.length > 0;
  }
}
