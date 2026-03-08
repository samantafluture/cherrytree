import { sql } from 'drizzle-orm';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

import { type Database } from '../../src/db';
import { OutlineService } from '../../src/services';
import { setupTestDb, teardownTestDb, createTestUser } from '../helpers/db';

describe('OutlineService', () => {
  let db: Database;
  let service: OutlineService;
  let user: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    db = await setupTestDb();
    service = new OutlineService(db);
    user = await createTestUser(db, '-outline');
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await db.execute(sql`DELETE FROM nodes`);
    await db.execute(sql`DELETE FROM outlines`);
  });

  describe('create', () => {
    it('creates an outline with default title', async () => {
      const outline = await service.create(user.id);

      expect(outline).toBeDefined();
      expect(outline.title).toBe('My Outline');
      expect(outline.userId).toBe(user.id);
      expect(outline.id).toBeDefined();
    });

    it('creates an outline with custom title', async () => {
      const outline = await service.create(user.id, 'Custom Title');

      expect(outline.title).toBe('Custom Title');
      expect(outline.userId).toBe(user.id);
    });
  });

  describe('listByUser', () => {
    it('returns empty array when no outlines', async () => {
      const outlines = await service.listByUser(user.id);

      expect(outlines).toEqual([]);
    });

    it('returns only outlines belonging to the user', async () => {
      const otherUser = await createTestUser(db, '-other');

      await service.create(user.id, 'Mine');
      await service.create(otherUser.id, 'Theirs');

      const outlines = await service.listByUser(user.id);

      expect(outlines).toHaveLength(1);
      expect(outlines[0].title).toBe('Mine');
    });
  });

  describe('getById', () => {
    it('returns outline for owner', async () => {
      const created = await service.create(user.id, 'Find Me');

      const found = await service.getById(created.id, user.id);

      expect(found).toBeDefined();
      expect(found!.title).toBe('Find Me');
    });

    it('returns undefined for wrong user', async () => {
      const otherUser = await createTestUser(db, '-wrong');
      const created = await service.create(user.id, 'Private');

      const found = await service.getById(created.id, otherUser.id);

      expect(found).toBeUndefined();
    });

    it('returns undefined for nonexistent ID', async () => {
      const found = await service.getById(
        '00000000-0000-0000-0000-000000000000',
        user.id,
      );

      expect(found).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates title', async () => {
      const created = await service.create(user.id, 'Old Title');

      const updated = await service.update(created.id, user.id, 'New Title');

      expect(updated).toBeDefined();
      expect(updated!.title).toBe('New Title');
    });

    it('returns undefined for wrong user', async () => {
      const otherUser = await createTestUser(db, '-noaccess');
      const created = await service.create(user.id, 'Protected');

      const result = await service.update(created.id, otherUser.id, 'Hacked');

      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('deletes outline and returns true', async () => {
      const created = await service.create(user.id, 'To Delete');

      const result = await service.delete(created.id, user.id);

      expect(result).toBe(true);

      const found = await service.getById(created.id, user.id);
      expect(found).toBeUndefined();
    });

    it('returns false for wrong user', async () => {
      const otherUser = await createTestUser(db, '-nodelete');
      const created = await service.create(user.id, 'Keep Me');

      const result = await service.delete(created.id, otherUser.id);

      expect(result).toBe(false);
    });
  });
});
