import { sql } from 'drizzle-orm';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

import { type Database } from '../../src/db';
import { NodeService } from '../../src/services';
import {
  setupTestDb,
  teardownTestDb,
  createTestUser,
  createTestOutline,
} from '../helpers/db';

describe('NodeService', () => {
  let db: Database;
  let service: NodeService;
  let user: Awaited<ReturnType<typeof createTestUser>>;
  let outline: Awaited<ReturnType<typeof createTestOutline>>;

  beforeAll(async () => {
    db = await setupTestDb();
    service = new NodeService(db);
    user = await createTestUser(db, '-node');
    outline = await createTestOutline(db, user.id);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await db.execute(sql`DELETE FROM nodes`);
  });

  describe('createNode', () => {
    it('creates a root-level node', async () => {
      const node = await service.createNode(outline.id, 'Root node');
      expect(node).toBeDefined();
      expect(node.content).toBe('Root node');
      expect(node.parentId).toBeNull();
      expect(node.outlineId).toBe(outline.id);
    });

    it('creates a child node', async () => {
      const parent = await service.createNode(outline.id, 'Parent');
      const child = await service.createNode(outline.id, 'Child', parent.id);
      expect(child.parentId).toBe(parent.id);
    });

    it('auto-positions at end', async () => {
      const a = await service.createNode(outline.id, 'A');
      const b = await service.createNode(outline.id, 'B');
      const c = await service.createNode(outline.id, 'C');
      expect(a.position).toBe(0);
      expect(b.position).toBe(1);
      expect(c.position).toBe(2);
    });

    it('inserts at specific position and shifts siblings', async () => {
      await service.createNode(outline.id, 'A');
      await service.createNode(outline.id, 'B');
      const inserted = await service.createNode(
        outline.id,
        'Inserted',
        null,
        1,
      );
      expect(inserted.position).toBe(1);

      const children = await service.getChildren(null, outline.id);
      expect(children[0].content).toBe('A');
      expect(children[1].content).toBe('Inserted');
      expect(children[2].content).toBe('B');
    });
  });

  describe('getTree', () => {
    it('returns empty array for empty outline', async () => {
      const tree = await service.getTree(outline.id);
      expect(tree).toEqual([]);
    });

    it('returns full tree ordered by depth and position', async () => {
      const root1 = await service.createNode(outline.id, 'Root 1');
      const root2 = await service.createNode(outline.id, 'Root 2');
      await service.createNode(outline.id, 'Child 1-1', root1.id);
      await service.createNode(outline.id, 'Child 2-1', root2.id);

      const tree = await service.getTree(outline.id);
      expect(tree.length).toBe(4);
      expect(tree[0].content).toBe('Root 1');
      expect(tree[1].content).toBe('Root 2');
      expect(tree[2].content).toBe('Child 1-1');
      expect(tree[3].content).toBe('Child 2-1');
    });
  });

  describe('getSubtree', () => {
    it('returns node and all descendants', async () => {
      const root = await service.createNode(outline.id, 'Root');
      const child = await service.createNode(outline.id, 'Child', root.id);
      await service.createNode(outline.id, 'Grandchild', child.id);

      const subtree = await service.getSubtree(root.id);
      expect(subtree.length).toBe(3);
    });
  });

  describe('getNode', () => {
    it('returns a node by ID', async () => {
      const created = await service.createNode(outline.id, 'Find me');
      const found = await service.getNode(created.id);
      expect(found).toBeDefined();
      expect(found!.content).toBe('Find me');
    });

    it('returns undefined for nonexistent ID', async () => {
      const found = await service.getNode(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(found).toBeUndefined();
    });
  });

  describe('updateNode', () => {
    it('updates content', async () => {
      const node = await service.createNode(outline.id, 'Original');
      const updated = await service.updateNode(node.id, { content: 'Updated' });
      expect(updated!.content).toBe('Updated');
    });

    it('toggles completion', async () => {
      const node = await service.createNode(outline.id, 'Task');
      const updated = await service.updateNode(node.id, { isCompleted: true });
      expect(updated!.isCompleted).toBe(true);
    });
  });

  describe('deleteNode', () => {
    it('deletes a node and closes position gap', async () => {
      const a = await service.createNode(outline.id, 'A');
      await service.createNode(outline.id, 'B');
      await service.createNode(outline.id, 'C');

      await service.deleteNode(a.id);
      const children = await service.getChildren(null, outline.id);
      expect(children.length).toBe(2);
      expect(children[0].content).toBe('B');
      expect(children[0].position).toBe(0);
      expect(children[1].content).toBe('C');
    });

    it('deletes node and all descendants', async () => {
      const root = await service.createNode(outline.id, 'Root');
      const child = await service.createNode(outline.id, 'Child', root.id);
      await service.createNode(outline.id, 'Grandchild', child.id);

      await service.deleteNode(root.id);
      const tree = await service.getTree(outline.id);
      expect(tree).toEqual([]);
    });
  });

  describe('moveNode', () => {
    it('moves node to new parent', async () => {
      const a = await service.createNode(outline.id, 'A');
      const b = await service.createNode(outline.id, 'B');

      const moved = await service.moveNode(b.id, a.id, 0);
      expect(moved!.parentId).toBe(a.id);
      expect(moved!.position).toBe(0);
    });

    it('rejects moving node into its own descendant', async () => {
      const parent = await service.createNode(outline.id, 'Parent');
      const child = await service.createNode(outline.id, 'Child', parent.id);

      await expect(service.moveNode(parent.id, child.id, 0)).rejects.toThrow(
        'Cannot move a node into its own descendant',
      );
    });
  });

  describe('searchNodes', () => {
    it('finds nodes by content (case-insensitive)', async () => {
      await service.createNode(outline.id, 'Buy groceries');
      await service.createNode(outline.id, 'Walk the dog');
      await service.createNode(outline.id, 'buy supplies');

      const results = await service.searchNodes(outline.id, 'BUY');
      expect(results.length).toBe(2);
    });

    it('returns empty array for no matches', async () => {
      await service.createNode(outline.id, 'Something');
      const results = await service.searchNodes(outline.id, 'nonexistent');
      expect(results).toEqual([]);
    });
  });
});
