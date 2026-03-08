/**
 * Manages CRUD operations and tree traversal for outline nodes.
 *
 * @example
 *   const service = new NodeService(db);
 *   const tree = await service.getTree(outlineId);
 *   await service.createNode(outlineId, 'New item', parentId);
 *
 * @consumers routes/nodes.ts, cli/commands/add.ts
 * @depends db/, services/position.utils.ts, @cherrytree/shared
 */

import { and, eq, ilike, isNull, sql } from 'drizzle-orm';

import { type Database, nodes } from '../db';

import {
  getNextPosition,
  shiftPositionsDown,
  shiftPositionsUp,
} from './position.utils';

type NodeRow = typeof nodes.$inferSelect;

/** Map snake_case raw SQL rows to camelCase NodeRow. */
function mapRow(row: Record<string, unknown>): NodeRow {
  return {
    id: row.id as string,
    outlineId: row.outline_id as string,
    parentId: (row.parent_id as string) ?? null,
    content: row.content as string,
    position: row.position as number,
    isCompleted: row.is_completed as boolean,
    isCollapsed: row.is_collapsed as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export class NodeService {
  constructor(private db: Database) {}

  /** Retrieve the full tree for an outline using a recursive CTE. */
  async getTree(outlineId: string): Promise<NodeRow[]> {
    const rows = (await this.db.execute(sql`
      WITH RECURSIVE tree AS (
        SELECT *, 0 AS depth
        FROM nodes
        WHERE outline_id = ${outlineId} AND parent_id IS NULL
        UNION ALL
        SELECT n.*, t.depth + 1
        FROM nodes n
        INNER JOIN tree t ON n.parent_id = t.id
      )
      SELECT * FROM tree ORDER BY depth, position
    `)) as unknown as Record<string, unknown>[];
    return rows.map(mapRow);
  }

  /** Retrieve a subtree rooted at a specific node (for zoom). */
  async getSubtree(nodeId: string): Promise<NodeRow[]> {
    const rows = (await this.db.execute(sql`
      WITH RECURSIVE subtree AS (
        SELECT *, 0 AS depth
        FROM nodes WHERE id = ${nodeId}
        UNION ALL
        SELECT n.*, s.depth + 1
        FROM nodes n
        INNER JOIN subtree s ON n.parent_id = s.id
      )
      SELECT * FROM subtree ORDER BY depth, position
    `)) as unknown as Record<string, unknown>[];
    return rows.map(mapRow);
  }

  /** Get a single node by ID. */
  async getNode(nodeId: string): Promise<NodeRow | undefined> {
    const [node] = await this.db
      .select()
      .from(nodes)
      .where(eq(nodes.id, nodeId));
    return node;
  }

  /** Create a new node under a parent (or at root level). */
  async createNode(
    outlineId: string,
    content: string,
    parentId: string | null = null,
    position?: number,
  ): Promise<NodeRow> {
    const pos =
      position ?? (await getNextPosition(this.db, outlineId, parentId));

    if (position !== undefined) {
      await shiftPositionsUp(this.db, parentId, position);
    }

    const [node] = await this.db
      .insert(nodes)
      .values({ outlineId, content, parentId, position: pos })
      .returning();

    return node;
  }

  /** Update a node's content. */
  async updateNode(
    nodeId: string,
    updates: { content?: string; isCompleted?: boolean; isCollapsed?: boolean },
  ): Promise<NodeRow | undefined> {
    const [node] = await this.db
      .update(nodes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(nodes.id, nodeId))
      .returning();
    return node;
  }

  /** Delete a node and all its descendants. */
  async deleteNode(nodeId: string): Promise<void> {
    const node = await this.getNode(nodeId);
    if (!node) return;

    // Delete descendants first via recursive CTE
    await this.db.execute(sql`
      WITH RECURSIVE descendants AS (
        SELECT id FROM nodes WHERE id = ${nodeId}
        UNION ALL
        SELECT n.id FROM nodes n
        INNER JOIN descendants d ON n.parent_id = d.id
      )
      DELETE FROM nodes WHERE id IN (SELECT id FROM descendants)
    `);

    // Close the gap in sibling positions
    await shiftPositionsDown(this.db, node.parentId, node.position);
  }

  /** Move a node to a new parent and/or position. */
  async moveNode(
    nodeId: string,
    newParentId: string | null,
    newPosition: number,
  ): Promise<NodeRow | undefined> {
    const node = await this.getNode(nodeId);
    if (!node) return undefined;

    if (newParentId !== null) {
      const isDescendant = await this.isDescendantOf(newParentId, nodeId);
      if (isDescendant) {
        throw new Error('Cannot move a node into its own descendant');
      }
    }

    // Close gap at old position
    await shiftPositionsDown(this.db, node.parentId, node.position);
    // Open gap at new position
    await shiftPositionsUp(this.db, newParentId, newPosition);

    const [updated] = await this.db
      .update(nodes)
      .set({
        parentId: newParentId,
        position: newPosition,
        updatedAt: new Date(),
      })
      .where(eq(nodes.id, nodeId))
      .returning();

    return updated;
  }

  /** Full-text search within an outline. */
  async searchNodes(outlineId: string, query: string): Promise<NodeRow[]> {
    return this.db
      .select()
      .from(nodes)
      .where(
        and(eq(nodes.outlineId, outlineId), ilike(nodes.content, `%${query}%`)),
      );
  }

  /** Check if `candidateId` is a descendant of `ancestorId`. */
  private async isDescendantOf(
    candidateId: string,
    ancestorId: string,
  ): Promise<boolean> {
    const result = await this.db.execute(sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id FROM nodes WHERE id = ${candidateId}
        UNION ALL
        SELECT n.id, n.parent_id FROM nodes n
        INNER JOIN ancestors a ON n.id = a.parent_id
      )
      SELECT 1 FROM ancestors WHERE id = ${ancestorId} LIMIT 1
    `);
    return (result as unknown[]).length > 0;
  }

  /** Get children of a node (direct, not recursive). */
  async getChildren(parentId: string | null, outlineId: string) {
    const parentCondition =
      parentId === null ? isNull(nodes.parentId) : eq(nodes.parentId, parentId);

    return this.db
      .select()
      .from(nodes)
      .where(and(eq(nodes.outlineId, outlineId), parentCondition))
      .orderBy(nodes.position);
  }
}
