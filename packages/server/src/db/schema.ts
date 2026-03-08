/**
 * Drizzle ORM schema definitions for all database tables.
 *
 * @example
 *   import { users, nodes, outlines, sessions } from '../db';
 *
 * @consumers services/, db/connection.ts
 * @depends drizzle-orm
 */

import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    username: varchar('username', { length: 100 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    githubId: varchar('github_id', { length: 100 }).unique(),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_users_github').on(table.githubId)],
);

export const outlines = pgTable('outlines', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull().default('My Outline'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const nodes = pgTable(
  'nodes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    outlineId: uuid('outline_id')
      .notNull()
      .references(() => outlines.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'),
    content: text('content').notNull().default(''),
    position: integer('position').notNull(),
    isCompleted: boolean('is_completed').notNull().default(false),
    isCollapsed: boolean('is_collapsed').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_nodes_parent').on(table.parentId),
    index('idx_nodes_outline').on(table.outlineId),
    index('idx_nodes_sibling_order').on(table.parentId, table.position),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_sessions_token').on(table.token),
    index('idx_sessions_expiry').on(table.expiresAt),
  ],
);
