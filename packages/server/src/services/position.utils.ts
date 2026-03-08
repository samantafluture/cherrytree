/**
 * Position management utilities for sibling ordering within the tree.
 *
 * @example
 *   import { getNextPosition, shiftPositions } from './position.utils';
 *   const pos = await getNextPosition(db, outlineId, parentId);
 *
 * @consumers services/node.service.ts
 * @depends db/
 */

import { and, count, eq, gt, gte, isNull, sql } from 'drizzle-orm';

import { type Database, nodes } from '../db';

/** Get the next available position for a new sibling under a parent. */
export async function getNextPosition(
  db: Database,
  outlineId: string,
  parentId: string | null,
) {
  const parentCondition =
    parentId === null ? isNull(nodes.parentId) : eq(nodes.parentId, parentId);

  const [result] = await db
    .select({ total: count() })
    .from(nodes)
    .where(and(eq(nodes.outlineId, outlineId), parentCondition));

  return result?.total ?? 0;
}

/** Shift sibling positions up (+1) to make room at the given position. */
export async function shiftPositionsUp(
  db: Database,
  parentId: string | null,
  fromPosition: number,
) {
  const parentCondition =
    parentId === null ? isNull(nodes.parentId) : eq(nodes.parentId, parentId);

  await db
    .update(nodes)
    .set({ position: sql`${nodes.position} + 1` })
    .where(and(parentCondition, gte(nodes.position, fromPosition)));
}

/** Shift sibling positions down (-1) to close a gap after removal. */
export async function shiftPositionsDown(
  db: Database,
  parentId: string | null,
  abovePosition: number,
) {
  const parentCondition =
    parentId === null ? isNull(nodes.parentId) : eq(nodes.parentId, parentId);

  await db
    .update(nodes)
    .set({ position: sql`${nodes.position} - 1` })
    .where(and(parentCondition, gt(nodes.position, abovePosition)));
}
