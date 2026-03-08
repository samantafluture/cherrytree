/**
 * Core type definitions for CherryTree.
 *
 * @example
 *   import { Node, Outline, User } from '@cherrytree/shared';
 *
 * @consumers packages/server, packages/client, packages/cli
 * @depends nothing — leaf module
 */

/** The atomic unit of an outline — a single bullet point. */
export type Node = {
  id: string;
  outlineId: string;
  parentId: string | null;
  content: string;
  position: number;
  isCompleted: boolean;
  isCollapsed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** A node enriched with its children for tree rendering. */
export type TreeNode = Node & {
  children: TreeNode[];
  depth: number;
};

/** A collection of nodes forming a tree structure. */
export type Outline = {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

/** A registered user. */
export type User = {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Standard API response envelope. */
export type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
};

/** Structured API error. */
export type ApiError = {
  code: string;
  message: string;
};
