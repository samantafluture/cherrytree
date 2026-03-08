# CherryTree — Technical Design Document

**Version:** 1.1
**Date:** March 8, 2026
**Author:** Sam & Claude
**Status:** Draft

---

## 1. Overview

### 1.1 What is CherryTree?

CherryTree is an open-source outliner tool inspired by Workflowy's elegance but built with a back-to-basics philosophy. Where modern outliner apps have become bloated with features, CherryTree returns to the core principles: infinitely nested bullet points, fast keyboard-driven navigation, and a clean interface that gets out of your way.

What sets CherryTree apart is its first-class support for agentic AI. Through a CLI and MCP server, AI agents like Claude Code can read, modify, and restructure outlines alongside the human user — making CherryTree a shared workspace for human-AI collaboration.

### 1.2 Design Principles

1. **Simplicity over features.** Every feature must justify its existence. If it doesn't serve the core outlining experience, it doesn't ship.
2. **Minimal dependencies.** Lean on the platform. Use React's built-in primitives, native CSS, and standard Node.js APIs before reaching for libraries.
3. **Keyboard-first.** Power users live on the keyboard. Every action must be achievable without a mouse.
4. **Agent-ready.** The outline is a structured data format. Agents should be able to interact with it as naturally as humans do.
5. **Open and transparent.** Clean code, clear patterns, well-documented. Contributors should be able to understand the codebase in an afternoon.
6. **Fast.** Interactions must feel instant. No loading spinners for basic operations.

### 1.3 Composability & Maintainability Rules

CherryTree is built with AI-assisted development (Claude Code). To prevent the "black box problem" — where AI-generated code becomes an unmaintainable monolith — the project enforces structural rules as hard constraints during development, not as afterthoughts during review.

These rules are codified in the project's `CLAUDE.md` and enforced via linting:

**Rule 1 — Explicit boundaries.** Every module has a single, declared responsibility. A service file handles one domain (nodes, auth, outlines). A component renders one concern. If a file does two things, it becomes two files.

**Rule 2 — Declared, one-directional dependencies.** Dependencies flow in one direction: `routes → services → db`. Never the reverse. No circular imports. Every module's dependencies are visible in its import block. The dependency graph must be inspectable at a glance. Enforced by `eslint-plugin-import` with `no-cycle` rule.

**Rule 3 — Interface contracts via barrel exports.** Every directory exposes a public API through an `index.ts` barrel file. Consumers import from the barrel, never from internal files. Changing internals must not break consumers. Types are the contract.

```
// ✅ Correct: import from barrel
import { NodeService } from '@cherrytree/server/services';

// ❌ Wrong: import from internal file
import { NodeService } from '@cherrytree/server/services/node.service';
```

**Rule 4 — Isolated testability.** Every service, hook, and utility must be testable in isolation — without spinning up the full application, database, or browser. If a test needs to mock the world, the code has a coupling problem that must be fixed.

**Rule 5 — Usage-first documentation.** Every module's JSDoc header documents in this order: (1) what it does (one sentence), (2) how to use it (example), (3) what depends on it, (4) what it depends on. Implementation details go in inline comments, not in the header.

```typescript
/**
 * Manages CRUD operations and tree traversal for outline nodes.
 *
 * @example
 *   const service = new NodeService(db);
 *   const tree = await service.getTree(outlineId);
 *   await service.createNode(outlineId, 'New item', parentId);
 *
 * @consumers routes/nodes.ts, cli/commands/add.ts
 * @depends db/connection.ts, shared/types.ts
 */
```

**Rule 6 — File size as a structural signal.** No source file should exceed ~200 lines. This isn't a hard lint rule but a signal: if a file is growing past 200 lines, it likely has mixed responsibilities and needs decomposition. The `CLAUDE.md` instructs Claude Code to flag this proactively.

**Rule 7 — Structure constrains generation.** The project structure, `CLAUDE.md`, and linting rules form an "architectural fence" that constrains what AI agents can produce. AI-generated code that violates these rules is rejected by lint/CI before it's merged. Architecture is enforced by the environment, not by human review alone.

### 1.4 Core Concepts

- **Node:** The atomic unit. A single bullet point with text content. Every node can have children, creating infinite nesting.
- **Outline:** A tree of nodes. Each user has one or more outlines (MVP: one outline per user).
- **Zoom:** Focusing on a specific node, making it the "root" of your view. The signature Workflowy interaction.
- **Breadcrumb:** The path from the true root to your current zoomed node.
- **Collapse/Expand:** Hiding or showing a node's children.

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                   Clients                        │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ React    │  │  CLI     │  │  MCP Server   │  │
│  │ SPA      │  │  Tool    │  │  (Phase 2)    │  │
│  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
│       │              │               │           │
└───────┼──────────────┼───────────────┼───────────┘
        │              │               │
        ▼              ▼               ▼
┌─────────────────────────────────────────────────┐
│              REST API (Fastify)                  │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Auth     │  │  Node    │  │  Outline      │  │
│  │ Module   │  │  Module  │  │  Module       │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │         Service Layer                     │    │
│  │  (shared by API, CLI, and MCP)           │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│           PostgreSQL (Drizzle ORM)               │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ users    │  │  nodes   │  │  sessions     │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
└─────────────────────────────────────────────────┘
```

### 2.2 Dependency Flow

Dependencies are strictly one-directional. This is enforced by linting and documented in `CLAUDE.md`:

```
routes/  →  services/  →  db/
  ↓            ↓           ↓
  └────────────┴───────────┘
                ↓
            shared/types

CLI commands  →  api-client  →  REST API
MCP tools     →  api-client  →  REST API

Components  →  hooks  →  context  →  api/client
```

**Never:** services → routes, db → services, hooks → components. No circular imports at any level.

### 2.3 Technology Stack

| Layer      | Technology                               | Rationale                                                     |
| ---------- | ---------------------------------------- | ------------------------------------------------------------- |
| Frontend   | React 18+ with TypeScript                | Component model fits tree UI; ecosystem maturity              |
| Styling    | CSS Modules + CSS custom properties      | Zero dependencies, native scoping, theme-ready from day one   |
| Build      | Vite                                     | Fast HMR, TypeScript-native, CSS Modules support built-in     |
| State      | React useReducer + Context               | No external state library; platform primitives are sufficient |
| Backend    | Fastify with TypeScript                  | Schema validation, async-first, performant                    |
| ORM        | Drizzle ORM                              | Type-safe, SQL-like, thin abstraction                         |
| Database   | PostgreSQL 16                            | Recursive CTEs for tree queries, battle-tested                |
| Auth       | GitHub OAuth + basic auth fallback       | Developer-friendly, simple to implement                       |
| CLI        | Commander.js                             | Standard Node.js CLI framework                                |
| Testing    | Vitest (unit + browser mode for E2E)     | Unified test runner, minimal config                           |
| Linting    | ESLint + eslint-plugin-import (no-cycle) | Architectural enforcement via tooling                         |
| Monorepo   | pnpm workspaces                          | Fast installs, strict deps, no phantom dependencies           |
| Deployment | Hostinger VPS, Nginx, Certbot            | Self-hosted, cost-effective                                   |

### 2.4 Dependency Philosophy

CherryTree aims for the minimal dependency footprint possible. Before adding any package, ask:

1. Can the platform (React, CSS, Node.js) do this natively?
2. Is the complexity of the problem worth the dependency?
3. Will this dependency still be maintained in 2 years?

**Accepted dependencies:** Fastify (server framework), Drizzle (type-safe SQL), Commander (CLI parsing), bcrypt (password hashing). These solve genuinely complex problems that shouldn't be hand-rolled.

**Rejected dependencies:** State management libraries (use useReducer), CSS frameworks (use CSS Modules), HTTP client libraries (use fetch), date libraries (use Intl/Date), utility libraries like lodash (use native JS).

### 2.5 Project Structure

```
cherrytree/
├── packages/
│   ├── shared/                    # Shared types, constants, validation
│   │   ├── src/
│   │   │   ├── index.ts           # Barrel: public API
│   │   │   ├── types.ts
│   │   │   ├── constants.ts
│   │   │   └── validation.ts
│   │   └── package.json
│   │
│   ├── server/                    # Fastify API
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── db/
│   │   │   │   ├── index.ts       # Barrel
│   │   │   │   ├── schema.ts
│   │   │   │   ├── migrations/
│   │   │   │   └── connection.ts
│   │   │   ├── services/
│   │   │   │   ├── index.ts       # Barrel
│   │   │   │   ├── node.service.ts
│   │   │   │   ├── outline.service.ts
│   │   │   │   └── auth.service.ts
│   │   │   ├── routes/
│   │   │   │   ├── index.ts       # Barrel
│   │   │   │   ├── nodes.ts
│   │   │   │   ├── outlines.ts
│   │   │   │   └── auth.ts
│   │   │   ├── plugins/
│   │   │   │   ├── index.ts       # Barrel
│   │   │   │   ├── auth.ts
│   │   │   │   └── error-handler.ts
│   │   │   └── utils/
│   │   │       └── index.ts       # Barrel
│   │   ├── tests/                 # Mirrors src/ structure
│   │   │   ├── services/
│   │   │   │   ├── node.service.test.ts
│   │   │   │   ├── outline.service.test.ts
│   │   │   │   └── auth.service.test.ts
│   │   │   └── routes/
│   │   │       ├── nodes.test.ts
│   │   │       └── auth.test.ts
│   │   └── package.json
│   │
│   ├── client/                    # React SPA
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── styles/
│   │   │   │   ├── tokens.css
│   │   │   │   ├── themes/
│   │   │   │   │   ├── dark.css       # MVP default
│   │   │   │   │   ├── light.css      # Post-MVP
│   │   │   │   │   └── cherry.css     # Post-MVP signature
│   │   │   │   ├── reset.css
│   │   │   │   └── global.css
│   │   │   ├── components/
│   │   │   │   ├── OutlineView/
│   │   │   │   │   ├── OutlineView.tsx
│   │   │   │   │   └── OutlineView.module.css
│   │   │   │   ├── NodeItem/
│   │   │   │   │   ├── NodeItem.tsx
│   │   │   │   │   └── NodeItem.module.css
│   │   │   │   ├── NodeEditor/
│   │   │   │   │   ├── NodeEditor.tsx
│   │   │   │   │   └── NodeEditor.module.css
│   │   │   │   ├── Breadcrumb/
│   │   │   │   │   ├── Breadcrumb.tsx
│   │   │   │   │   └── Breadcrumb.module.css
│   │   │   │   └── SearchBar/
│   │   │   │       ├── SearchBar.tsx
│   │   │   │       └── SearchBar.module.css
│   │   │   ├── context/
│   │   │   │   ├── OutlineContext.tsx
│   │   │   │   └── AuthContext.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useOutline.ts
│   │   │   │   ├── useNode.ts
│   │   │   │   ├── useKeyboard.ts
│   │   │   │   └── useOptimisticMutation.ts
│   │   │   └── api/
│   │   │       └── client.ts
│   │   ├── tests/                 # Mirrors src/
│   │   │   ├── components/
│   │   │   └── hooks/
│   │   └── package.json
│   │
│   └── cli/                       # CLI tool
│       ├── src/
│       │   ├── index.ts
│       │   ├── commands/
│       │   │   ├── index.ts       # Barrel
│       │   │   ├── add.ts
│       │   │   ├── move.ts
│       │   │   ├── list.ts
│       │   │   ├── search.ts
│       │   │   ├── edit.ts
│       │   │   └── delete.ts
│       │   └── utils/
│       │       ├── index.ts       # Barrel
│       │       ├── api-client.ts
│       │       └── output.ts
│       ├── tests/
│       └── package.json
│
├── pnpm-workspace.yaml
├── docker-compose.yml
├── .eslintrc.cjs                  # Includes import/no-cycle
├── CLAUDE.md                      # Architectural rules for AI agents
├── CONTRIBUTING.md
├── LICENSE (MIT)
├── README.md
└── package.json
```

---

## 3. Data Model

### 3.1 Database Schema

**users**

| Column        | Type         | Notes                           |
| ------------- | ------------ | ------------------------------- |
| id            | UUID         | Primary key, generated          |
| email         | VARCHAR(255) | Unique, not null                |
| username      | VARCHAR(100) | Unique, not null                |
| password_hash | VARCHAR(255) | Nullable (null for OAuth users) |
| github_id     | VARCHAR(100) | Nullable, unique                |
| avatar_url    | TEXT         | Nullable                        |
| created_at    | TIMESTAMP    | Default now()                   |
| updated_at    | TIMESTAMP    | Default now()                   |

**outlines**

| Column     | Type         | Notes                   |
| ---------- | ------------ | ----------------------- |
| id         | UUID         | Primary key, generated  |
| user_id    | UUID         | FK → users.id, not null |
| title      | VARCHAR(255) | Default "My Outline"    |
| created_at | TIMESTAMP    | Default now()           |
| updated_at | TIMESTAMP    | Default now()           |

**nodes**

| Column       | Type      | Notes                                       |
| ------------ | --------- | ------------------------------------------- |
| id           | UUID      | Primary key, generated                      |
| outline_id   | UUID      | FK → outlines.id, not null                  |
| parent_id    | UUID      | FK → nodes.id, nullable (null = root-level) |
| content      | TEXT      | Not null, default ""                        |
| position     | INTEGER   | Ordering among siblings, not null           |
| is_completed | BOOLEAN   | Default false                               |
| is_collapsed | BOOLEAN   | Default false                               |
| created_at   | TIMESTAMP | Default now()                               |
| updated_at   | TIMESTAMP | Default now()                               |

**sessions**

| Column     | Type         | Notes           |
| ---------- | ------------ | --------------- |
| id         | UUID         | Primary key     |
| user_id    | UUID         | FK → users.id   |
| token      | VARCHAR(255) | Unique, indexed |
| expires_at | TIMESTAMP    | Not null        |
| created_at | TIMESTAMP    | Default now()   |

### 3.2 Indexes

```sql
CREATE INDEX idx_nodes_parent ON nodes(parent_id);
CREATE INDEX idx_nodes_outline ON nodes(outline_id);
CREATE INDEX idx_nodes_sibling_order ON nodes(parent_id, position);
CREATE INDEX idx_nodes_content_search ON nodes USING gin(to_tsvector('english', content));
CREATE INDEX idx_users_github ON users(github_id) WHERE github_id IS NOT NULL;
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);
```

### 3.3 Key Queries

**Load full outline (recursive CTE):**

```sql
WITH RECURSIVE tree AS (
  SELECT id, parent_id, content, position, is_completed, is_collapsed, 0 AS depth
  FROM nodes
  WHERE outline_id = $1 AND parent_id IS NULL
  UNION ALL
  SELECT n.id, n.parent_id, n.content, n.position, n.is_completed, n.is_collapsed, t.depth + 1
  FROM nodes n
  INNER JOIN tree t ON n.parent_id = t.id
)
SELECT * FROM tree ORDER BY depth, position;
```

**Load subtree (for zoom):**

```sql
WITH RECURSIVE subtree AS (
  SELECT id, parent_id, content, position, is_completed, is_collapsed, 0 AS depth
  FROM nodes WHERE id = $1
  UNION ALL
  SELECT n.id, n.parent_id, n.content, n.position, n.is_completed, n.is_collapsed, s.depth + 1
  FROM nodes n
  INNER JOIN subtree s ON n.parent_id = s.id
)
SELECT * FROM subtree ORDER BY depth, position;
```

**Move node (reparent):**

```sql
BEGIN;
  UPDATE nodes SET position = position + 1
  WHERE parent_id = $new_parent_id AND position >= $new_position;
  UPDATE nodes SET position = position - 1
  WHERE parent_id = $old_parent_id AND position > $old_position;
  UPDATE nodes SET parent_id = $new_parent_id, position = $new_position
  WHERE id = $node_id;
COMMIT;
```

---

## 4. API Design

### 4.1 Authentication

**GitHub OAuth flow:**

```
GET  /auth/github          → Redirect to GitHub
GET  /auth/github/callback → Handle callback, create session, redirect to app
POST /auth/logout          → Destroy session
```

**Basic auth (fallback):**

```
POST /auth/register        → Create account with email/password
POST /auth/login           → Create session
```

**Session management:** Token-based via `Authorization: Bearer <token>` header. Sessions stored in PostgreSQL with expiry.

### 4.2 REST Endpoints

All endpoints require authentication. Consistent envelope:

```json
{ "data": { ... }, "error": null }
{ "data": null, "error": { "code": "NOT_FOUND", "message": "..." } }
```

**Outlines:**

```
GET    /api/outlines              → List user's outlines
POST   /api/outlines              → Create outline
GET    /api/outlines/:id          → Get outline metadata
DELETE /api/outlines/:id          → Delete outline
```

**Nodes:**

```
GET    /api/outlines/:id/tree              → Full tree (recursive)
GET    /api/outlines/:id/nodes/:nodeId     → Single node + children
POST   /api/outlines/:id/nodes             → Create node
PATCH  /api/outlines/:id/nodes/:nodeId     → Update node
DELETE /api/outlines/:id/nodes/:nodeId     → Delete node + descendants
POST   /api/outlines/:id/nodes/:nodeId/move → Move/reparent node
```

**Search:**

```
GET    /api/outlines/:id/search?q=term     → Full-text search
```

**Export/Import:**

```
GET    /api/outlines/:id/export?format=md|json|opml
POST   /api/outlines/:id/import
```

### 4.3 Request/Response Schemas

**Create node:**

```json
{
  "body": {
    "content": "string (required)",
    "parent_id": "uuid | null",
    "position": "integer (optional, defaults to end)"
  }
}
```

**Move node:**

```json
{
  "body": {
    "parent_id": "uuid | null",
    "position": "integer"
  }
}
```

---

## 5. Frontend Design

### 5.1 State Management (Zero Dependencies)

The outline state is managed with React's `useReducer` + `Context`, split into two contexts to prevent unnecessary re-renders:

```typescript
// OutlineDataContext — the data (triggers re-renders on change)
// OutlineDispatchContext — the dispatch function (stable reference, never re-renders)

type OutlineState = {
  nodes: Map<string, Node>; // Flat map for O(1) lookup
  rootIds: string[];
  zoomedNodeId: string | null;
  focusedNodeId: string | null;
  selectedNodeIds: Set<string>;
  searchQuery: string;
  searchResults: string[];
  undoStack: OutlineAction[];
  redoStack: OutlineAction[];
  syncStatus: 'synced' | 'pending' | 'error';
};

type OutlineAction =
  | {
      type: 'ADD_NODE';
      payload: { parentId: string | null; content: string; position?: number };
    }
  | { type: 'UPDATE_NODE'; payload: { id: string; content: string } }
  | { type: 'DELETE_NODE'; payload: { id: string } }
  | {
      type: 'MOVE_NODE';
      payload: { id: string; newParentId: string | null; newPosition: number };
    }
  | { type: 'TOGGLE_COMPLETE'; payload: { id: string } }
  | { type: 'TOGGLE_COLLAPSE'; payload: { id: string } }
  | { type: 'ZOOM_TO'; payload: { nodeId: string | null } }
  | { type: 'SEARCH'; payload: { query: string } }
  | { type: 'SET_TREE'; payload: { nodes: Node[] } }
  | { type: 'UNDO' }
  | { type: 'REDO' };
```

The `nodes` Map stores a flat structure; the tree is derived by following `parent_id` references.

**Optimistic updates** via a custom `useOptimisticMutation` hook — dispatch immediately, fire API call, rollback on failure.

### 5.2 Component Architecture

```
App
├── AuthGate
├── TopBar
│   ├── Breadcrumb
│   ├── SearchBar
│   └── UserMenu
└── OutlineView
    └── NodeList (recursive)
        └── NodeItem (React.memo)
            ├── BulletIcon
            ├── NodeEditor (contenteditable)
            └── NodeList (children, recursive)
```

Each component lives in its own directory with a co-located `.module.css` file. Logic in the `.tsx`, presentation in the `.module.css`. No mixing.

### 5.3 Styling & Theming

**Approach:** CSS Modules for component scoping + CSS custom properties for theming. Zero CSS dependencies.

**Design tokens** (`tokens.css`):

```css
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  --font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', monospace;
  --font-size-sm: 13px;
  --font-size-base: 15px;
  --font-size-lg: 18px;
  --line-height: 1.6;

  --transition-fast: 100ms ease-out;
  --transition-normal: 150ms ease-out;
  --radius-sm: 4px;
  --radius-md: 8px;
}
```

**Theme files** override color tokens:

```css
/* themes/dark.css — MVP default */
[data-theme='dark'] {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-hover: #1f2b47;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0b0;
  --text-muted: #606070;
  --bullet-color: #606070;
  --bullet-hover: #e0e0e0;
  --accent: #e74c6f;
  --accent-hover: #ff5c83;
  --border: #2a2a4a;
  --completed-text: #505060;
  --search-highlight: rgba(231, 76, 111, 0.2);
}
```

Theme switching = swap `data-theme` attribute on `<html>`. Adding new themes = one new CSS file.

### 5.4 Key Interactions

| Action            | Shortcut                  |
| ----------------- | ------------------------- |
| New sibling below | Enter                     |
| Indent            | Tab                       |
| Outdent           | Shift+Tab                 |
| Move node up      | Alt+Shift+↑               |
| Move node down    | Alt+Shift+↓               |
| Delete empty node | Backspace (on empty)      |
| Zoom into node    | Alt+→ or click bullet     |
| Zoom out          | Alt+← or click breadcrumb |
| Toggle complete   | Ctrl+Enter                |
| Toggle collapse   | Ctrl+.                    |
| Search            | Ctrl+/ or /               |
| Undo              | Ctrl+Z                    |
| Redo              | Ctrl+Shift+Z              |

**Inline editing:** `contenteditable` for seamless inline text editing. No modal editors.

**Drag and drop:** HTML5 drag API with visual drop indicators.

**Optimistic updates:** Local store updates immediately, syncs to server. Retry on failure.

### 5.5 UI Philosophy

The UI should feel like a blank page with bullets:

- No sidebar (MVP). The outline IS the interface.
- Dark theme by default (MVP). Light and Cherry themes in post-MVP.
- Generous line height for readability.
- Smooth animations (150ms, ease-out).
- Search highlights matching text inline.
- Mobile-responsive.

---

## 6. CLI Design

### 6.1 Overview

The CLI (`cherrytree`) is a thin client that calls the REST API. Authenticates via token stored in `~/.cherrytreerc` or `CHERRYTREE_TOKEN` env var.

### 6.2 Commands

```bash
# Auth
cherrytree login                              # GitHub OAuth
cherrytree login --basic                      # Email/password
cherrytree whoami

# View
cherrytree list                               # Full tree
cherrytree list --depth 2 --node <id>         # Subtree, limited depth
cherrytree show <id>

# Create
cherrytree add "Content" --parent <id> --pos 0

# Edit
cherrytree edit <id> "New content"
cherrytree complete <id>
cherrytree collapse <id>

# Move
cherrytree move <id> --parent <id> --pos 2
cherrytree indent <id>
cherrytree outdent <id>

# Delete
cherrytree delete <id> [--force]

# Search
cherrytree search "query"

# Export / Import
cherrytree export --format md|json|opml
cherrytree import file.md
```

### 6.3 Output Formats

`--format tree` (default, human-friendly) or `--format json` (machine-readable, for piping to jq or agents).

---

## 7. MCP Server (Phase 2)

### 7.1 Planned Tools

| Tool             | Description          | Parameters                           |
| ---------------- | -------------------- | ------------------------------------ | ---- | ----- |
| `read_outline`   | Full outline tree    | `depth?`                             |
| `read_subtree`   | Subtree from a node  | `node_id`, `depth?`                  |
| `search_nodes`   | Full-text search     | `query`                              |
| `add_node`       | Create node          | `content`, `parent_id?`, `position?` |
| `edit_node`      | Update content       | `node_id`, `content`                 |
| `move_node`      | Move/reparent        | `node_id`, `parent_id`, `position`   |
| `delete_node`    | Delete + descendants | `node_id`                            |
| `complete_node`  | Toggle completion    | `node_id`                            |
| `export_outline` | Export               | `format: md                          | json | opml` |

### 7.2 Transport

Stdio for local Claude Code. HTTP/SSE for remote agents (future).

---

## 8. Authentication & Security

- **GitHub OAuth** with session token (httpOnly cookie for web, plaintext for CLI).
- **Basic auth fallback** with bcrypt (cost 12), rate-limited (5/min/IP).
- **All endpoints** require valid session; ownership enforced at service layer.
- **Input validation** via Fastify JSON schemas.
- **CORS** for frontend origin only. Helmet headers via `@fastify/helmet`.

---

## 9. Deployment

Hostinger KVM1 VPS with Docker Compose, Nginx reverse proxy, Certbot SSL.

```
Nginx
├── cherrytree.samantafluture.com → Fastify API (:3040)
├── cherrytree.samantafluture.com/app → Static React build
```

**CI/CD:** GitHub Actions — lint (including `import/no-cycle`), type-check, test on push. Build + deploy on tag.

---

## 10. Testing Strategy

| Layer       | Tool                     | Focus                                             |
| ----------- | ------------------------ | ------------------------------------------------- |
| Unit        | Vitest                   | Services, hooks, reducers, utilities              |
| Integration | Vitest + testcontainers  | API routes with real PostgreSQL                   |
| Component   | Vitest + Testing Library | Component rendering and interaction               |
| E2E         | Vitest Browser Mode      | Critical flows (create, edit, move, zoom, search) |
| CLI         | Vitest                   | Command parsing and output formatting             |

**Test structure mirrors source:** `tests/services/node.service.test.ts` tests `src/services/node.service.ts`. Each source module has a corresponding test module.

---

## 11. Performance Considerations

- **Tree loading:** Recursive CTE, sub-10ms for typical outlines.
- **Optimistic updates:** Client updates instantly, syncs async.
- **Debounced saves:** 300ms debounce on content edits.
- **React rendering:** `React.memo` on `NodeItem` with custom comparator.
- **Future:** Position gaps, lazy-loading collapsed subtrees.

---

## 12. CLAUDE.md Specification

The `CLAUDE.md` is critical infrastructure — the "architectural fence" for AI agents:

1. **Project overview** — what CherryTree is, design principles.
2. **Stack and conventions** — TypeScript strict, naming rules.
3. **The 7 composability rules** from Section 1.3, phrased as directives.
4. **Dependency flow diagram** — allowed import directions (Section 2.2).
5. **File structure** — where new code goes and why.
6. **Testing expectations** — every service/hook gets a test.
7. **What not to do** — no files > 200 lines, no circular imports, no barrel-bypassing, no `any`, no inline styles, no external state/CSS libraries.
8. **How to run** — dev, test, lint, build commands.

---

## 13. Future Considerations (Post-MVP)

- Multiple outlines per user
- Tagging / labels on nodes
- Rich text (bold, italic, links)
- Light theme + Cherry signature theme
- Real-time collaboration (CRDT/OT)
- Offline support (service worker + sync)
- Mobile app (PWA or React Native)
- Sharing (public links)
- Version history
- Community themes
