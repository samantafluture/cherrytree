# CherryTree — Implementation Plan

**Version:** 1.1
**Date:** March 8, 2026
**Companion doc:** CherryTree Technical Design Document v1.1

---

## Approach

This plan is structured in phases, each delivering a usable increment. Each phase ends with something that works. Phases are designed for focused sessions (weekends / evenings).

**Cross-cutting rule:** Every phase must comply with the 7 Composability Rules (TDD Section 1.3). Code that violates these rules is not considered done, regardless of whether it functions correctly. Lint must pass — including `import/no-cycle` — before any phase is complete.

Estimated total: 6–8 weeks of part-time work for the full MVP.

---

## Phase 0: Project Scaffolding

**Goal:** Repo exists, builds, deploys an empty shell. Zero features, but the skeleton — including all architectural constraints — is in place from line one.

**Duration:** 1 session (~3 hours)

### Tasks

1. **Initialize monorepo**
   - Create repo `cherrytree` on GitHub (MIT license)
   - Set up pnpm workspaces (`pnpm-workspace.yaml`) with `packages/shared`, `packages/server`, `packages/client`, `packages/cli`
   - Configure TypeScript (strict mode, path aliases) with root `tsconfig.base.json` and per-package extends
   - Add `.editorconfig`, `.gitignore`, `.nvmrc` (Node 20 LTS)

2. **Configure tooling — including architectural enforcement**
   - ESLint with `@typescript-eslint`, Prettier
   - **`eslint-plugin-import` with `no-cycle` rule** — this is non-negotiable from day one. Circular dependencies are caught at lint time, not at review time.
   - Vitest config at root
   - Husky + lint-staged for pre-commit hooks (lint + type-check)

3. **Set up packages with barrel exports**
   - `shared`: types file + `index.ts` barrel, verify cross-package imports
   - `server`: Fastify hello-world on port 3040, health check `GET /health`. Directory structure with barrel `index.ts` in each subdirectory (services/, routes/, plugins/, db/, utils/)
   - `client`: Vite + React, renders "CherryTree" text. CSS Modules configured. Theme token files created (`tokens.css`, `themes/dark.css`). Component directory structure established.
   - `cli`: Commander.js skeleton with `--version` flag. Barrel in commands/ and utils/

4. **Docker Compose**
   - PostgreSQL 16 container for local dev
   - Server container or native run against containerized PG

5. **CLAUDE.md — the architectural fence**
   - Write comprehensive Claude Code instructions including:
     - All 7 composability rules as directives
     - Dependency flow diagram (what can import what)
     - File structure conventions
     - Testing expectations
     - Explicit "do not" list (no files > 200 lines, no `any`, no circular imports, no barrel-bypassing, no inline styles, no external state/CSS libs)
     - Dev/test/lint/build commands
   - This is the single most important deliverable of Phase 0

6. **CONTRIBUTING.md**
   - Dev setup instructions
   - Architectural rules summary
   - PR process and expectations

### Definition of Done

- `pnpm install && pnpm dev` starts both client and server
- `pnpm build` succeeds for all packages
- `pnpm lint` passes — including `import/no-cycle`
- `pnpm typecheck` passes
- PostgreSQL connects, health check returns 200
- Every directory has a barrel `index.ts`
- `CLAUDE.md` exists with all architectural rules
- README has setup instructions

---

## Phase 1: Data Layer & Core Service

**Goal:** The tree lives in PostgreSQL. Service layer can create, read, update, delete, and move nodes. No HTTP yet — just tested business logic with clean interfaces.

**Duration:** 1–2 sessions (~4–6 hours)

### Tasks

1. **Define shared types** (`packages/shared`)
   - Core types: `Node`, `Outline`, `User`, `TreeNode`
   - All exported via barrel `index.ts`
   - JSDoc on every exported type following Rule 5 (usage-first docs)

2. **Drizzle schema** (`packages/server/src/db/schema.ts`)
   - Define `users`, `outlines`, `nodes`, `sessions` tables
   - All indexes from the TDD
   - `drizzle-kit` for migrations
   - Run initial migration, verify tables
   - Exported via `db/index.ts` barrel

3. **Node service** (`packages/server/src/services/node.service.ts`)
   - Each method has a JSDoc header with: purpose, example, consumers, dependencies
   - Methods: `getTree`, `getSubtree`, `getNode`, `createNode`, `updateNode`, `deleteNode`, `moveNode`, `searchNodes`
   - Auto-position at end if position not specified
   - Transactional move with gap-closing
   - **Must be under 200 lines.** If approaching limit, extract helpers (e.g., position management → `position.utils.ts`)

4. **Outline service** (`packages/server/src/services/outline.service.ts`)
   - CRUD for outlines, scoped to user
   - Under 200 lines

5. **Write tests** (mirrors source structure)
   - `tests/services/node.service.test.ts` — every service method
   - `tests/services/outline.service.test.ts`
   - Edge cases: move node to own descendant (reject), delete root nodes, position reordering
   - Each test file tests one service in isolation
   - Tests use a real test database (testcontainers or shared test PG)

### Composability Checkpoint

- [ ] Every service file has a JSDoc header with usage example, consumers, dependencies
- [ ] All services exported via `services/index.ts` barrel
- [ ] No service file exceeds 200 lines
- [ ] No circular imports (`pnpm lint` passes)
- [ ] Each service testable without spinning up Fastify or the full app

### Definition of Done

- All service methods implemented and tested
- Tests pass against real PostgreSQL
- Tree operations correct after create → move → delete sequences
- Composability checkpoint fully green

---

## Phase 2: REST API

**Goal:** The service layer is exposed via HTTP. You can manage outlines and nodes from curl.

**Duration:** 1–2 sessions (~4–6 hours)

### Tasks

1. **Auth module**
   - `auth.service.ts`: GitHub OAuth logic, basic auth, session management
   - `plugins/auth.ts`: Fastify plugin that extracts token, attaches user to request
   - `routes/auth.ts`: OAuth flow + login/register endpoints
   - Rate limiting on auth endpoints
   - Each file stays within its boundary: service = logic, plugin = middleware, route = HTTP

2. **API routes** (each route file is thin — delegates to service)
   - `routes/nodes.ts`: tree, CRUD, move, search
   - `routes/outlines.ts`: CRUD
   - Fastify JSON schema validation on all routes
   - Ownership enforcement: routes call service methods scoped to `request.user.id`
   - Consistent `{ data, error }` envelope

3. **Error handling plugin** (`plugins/error-handler.ts`)
   - Custom error classes: `NotFoundError`, `ForbiddenError`, `ValidationError`
   - Maps to HTTP status codes
   - Logs server-side, returns clean messages client-side

4. **Export endpoint**
   - Markdown and JSON for MVP
   - OPML as stretch goal

5. **Write tests** (mirrors source)
   - `tests/routes/nodes.test.ts`, `tests/routes/auth.test.ts`
   - Authenticated and unauthenticated requests
   - Ownership enforcement: user A cannot access user B's nodes

### Composability Checkpoint

- [ ] Route files contain zero business logic — pure delegation to services
- [ ] Dependencies flow: routes → services → db (no reverse)
- [ ] Error classes are standalone, imported by routes only
- [ ] Each route file < 200 lines
- [ ] Barrel exports updated

### Definition of Done

- All TDD endpoints implemented
- Auth flow works end-to-end (GitHub OAuth + basic)
- curl can build a tree, search, export
- Integration tests pass
- Composability checkpoint green

---

## Phase 3: Frontend — Core Outlining

**Goal:** The web app renders a tree. You can create, edit, and navigate nodes. Dark theme from day one.

**Duration:** 2–3 sessions (~8–10 hours)

### Tasks

1. **Styling foundation**
   - `reset.css`: minimal CSS reset
   - `tokens.css`: design token custom properties (spacing, typography, transitions)
   - `themes/dark.css`: MVP dark theme color tokens
   - `global.css`: base typography, body styles, `data-theme` setup
   - Verify CSS Modules work with Vite (`.module.css` imports)

2. **API client** (`api/client.ts`)
   - Typed fetch wrapper for all endpoints
   - Token management (in-memory + cookie persistence)
   - Error handling and retry logic
   - Under 200 lines — if long, extract auth logic to `api/auth.ts`

3. **Auth UI**
   - `AuthGate` component: login page with GitHub button + basic auth form
   - `AuthContext`: session state, login/logout actions
   - Protected route wrapper

4. **Outline state** (`context/OutlineContext.tsx`)
   - `useReducer` with `OutlineAction` union type
   - Split context: `OutlineDataContext` + `OutlineDispatchContext`
   - Flat `Map<string, Node>` with derived tree computation
   - Optimistic update via `useOptimisticMutation` hook

5. **Core components** (each in own directory with co-located `.module.css`)
   - `OutlineView`: fetches tree, renders `NodeList`
   - `NodeList`: recursive, renders children of a parent
   - `NodeItem`: single bullet with `contenteditable`, wrapped in `React.memo`
   - `BulletIcon`: visual indicator (expandable, leaf, completed)
   - `Breadcrumb`: zoom path, each segment clickable

6. **Basic interactions**
   - Click to focus and edit
   - Enter for new sibling
   - Backspace on empty to delete
   - Debounced save (300ms)

### Composability Checkpoint

- [ ] Each component in own directory with `.tsx` + `.module.css`
- [ ] No component file exceeds 200 lines
- [ ] Context split: data context and dispatch context are separate
- [ ] No CSS framework dependencies — only CSS Modules + tokens
- [ ] Hooks are independently testable (no component imports in hooks)
- [ ] Theme tokens work: changing `data-theme` attribute switches colors

### Definition of Done

- User can log in, see outline, create nodes, edit, delete
- Tree renders at arbitrary depth
- Changes persist to server
- Dark theme looks clean and intentional
- Composability checkpoint green

---

## Phase 4: Frontend — Full Interactions

**Goal:** All keyboard shortcuts and interactions that make an outliner feel like an outliner.

**Duration:** 2–3 sessions (~8–10 hours)

### Tasks

1. **Keyboard handler** (`hooks/useKeyboard.ts`)
   - Tab/Shift+Tab: indent/outdent
   - Alt+Shift+↑/↓: reorder among siblings
   - Ctrl+Enter: toggle complete
   - Ctrl+.: toggle collapse
   - Cursor position preservation across operations
   - **This hook must be testable in isolation** — test it with mock dispatch, no DOM required for logic tests

2. **Zoom**
   - Click bullet or Alt+→: zoom into node
   - Alt+← or breadcrumb click: zoom out
   - URL updates (`/outline/:id?zoom=nodeId`)
   - Smooth transition animation

3. **Collapse / Expand**
   - Click arrow to toggle
   - Child count badge on collapsed nodes
   - State persists per-node

4. **Drag and drop**
   - HTML5 drag from bullet icon
   - Visual drop indicators (above, below, as child)
   - Drop triggers `moveNode`

5. **Search** (`components/SearchBar/`)
   - Ctrl+/ opens search
   - Debounced (200ms) real-time results
   - Highlight matching text inline
   - Click result to zoom

6. **Undo / Redo**
   - Operation stack in reducer
   - Each mutation pushes inverse
   - Ctrl+Z / Ctrl+Shift+Z

7. **E2E tests** (Vitest Browser Mode)
   - Test critical flow: create → indent → zoom → search → undo
   - Test keyboard shortcuts
   - Test drag and drop

### Composability Checkpoint

- [ ] `useKeyboard` hook has its own test file, testable without DOM
- [ ] Search logic separated from SearchBar presentation
- [ ] Undo/redo logic lives in the reducer, not scattered across components
- [ ] Each new component in own directory with `.module.css`
- [ ] No file > 200 lines

### Definition of Done

- All keyboard shortcuts work
- Zoom, collapse, search, drag-and-drop functional
- Undo/redo for all operations
- E2E tests pass in browser mode
- Composability checkpoint green

---

## Phase 5: CLI Tool

**Goal:** Full CLI client. Agents can interact with outlines programmatically.

**Duration:** 1–2 sessions (~4–6 hours)

### Tasks

1. **Auth commands**
   - `login`: opens browser for GitHub OAuth, captures token via local callback server
   - `login --basic`: interactive email/password prompt
   - Token stored in `~/.cherrytreerc`
   - `whoami`: display current user

2. **API client** (`utils/api-client.ts`)
   - Reuses types from `shared` package
   - Reads base URL and token from config or env vars
   - JSDoc: purpose, usage example, consumers, dependencies

3. **Core commands** (each command in its own file, < 200 lines)
   - `list`, `show`, `add`, `edit`, `delete`, `move`, `indent`, `outdent`, `complete`, `search`
   - All commands exported via `commands/index.ts` barrel

4. **Export / Import**
   - `export --format md|json|opml` to stdout
   - `import file.md` — parse indented Markdown into tree

5. **Output formatting** (`utils/output.ts`)
   - `--format tree` (default): indented bullets
   - `--format json`: full JSON for machine consumption
   - `--no-color` flag

6. **Tests** (mirrors commands/ structure)
   - Command parsing tests
   - Output formatting tests
   - Integration test: full lifecycle via CLI

### Composability Checkpoint

- [ ] Each command file has one responsibility
- [ ] All commands use shared `api-client.ts` — no direct fetch calls
- [ ] Output formatting is in `utils/output.ts`, not in command files
- [ ] Barrel exports updated
- [ ] JSDoc on every exported function

### Definition of Done

- All commands implemented
- `cherrytree list --format json | jq '.nodes[0].content'` works
- Claude Code can use the CLI
- CLI publishable as npm package (`npx cherrytree`)
- Composability checkpoint green

---

## Phase 6: Polish, Docs & Launch

**Goal:** Production-ready for open source launch.

**Duration:** 1–2 sessions (~4–6 hours)

### Tasks

1. **Deployment**
   - Docker Compose production config
   - Nginx config for VPS
   - Certbot SSL
   - Environment variable management
   - Health monitoring (Docker restart policy or PM2)

2. **Documentation**
   - `README.md`: overview, screenshots/GIF, quick start, architecture summary
   - `CONTRIBUTING.md`: dev setup, architectural rules, PR process
   - `CLAUDE.md`: final review — ensure all 7 rules are current and complete
   - API docs (from Fastify schemas or markdown)
   - CLI `--help` text for every command

3. **Open source polish**
   - MIT LICENSE
   - GitHub Actions CI: lint (with `no-cycle`), type-check, test
   - Issue templates, PR template
   - Changelog (keep-a-changelog format)

4. **UI polish**
   - Loading states and error states
   - Empty state ("Start typing to create your first node")
   - Responsive design verification
   - Accessibility (keyboard nav, ARIA labels, screen reader)
   - Favicon and meta tags

5. **Final composability audit**
   - Run full lint including `import/no-cycle`
   - Verify every directory has a barrel `index.ts`
   - Verify no file exceeds 200 lines
   - Verify JSDoc headers on all public APIs
   - Verify test structure mirrors source structure
   - Verify dependency flow matches TDD Section 2.2

6. **Performance check**
   - Test with 1000+ nodes
   - Profile rendering bottlenecks
   - Verify debounce and optimistic updates

### Definition of Done

- App deployed at `cherrytree.samantafluture.com`
- README clear enough for a stranger to set up and contribute
- CI passes on all PRs
- Full composability audit passes
- No crashes, no data loss on edge cases

---

## Phase 7 (Post-MVP): MCP Server

**Goal:** Claude Code sees CherryTree as a native tool.

**Duration:** 1–2 sessions (~4–6 hours)

### Tasks

1. **MCP server package** (`packages/mcp-server`)
   - `@modelcontextprotocol/sdk`
   - Stdio transport
   - Tools: `read_outline`, `read_subtree`, `search_nodes`, `add_node`, `edit_node`, `move_node`, `delete_node`, `complete_node`, `export_outline`
   - Each tool in its own file under `tools/`, barrel export
   - JSDoc with usage-first documentation

2. **Tool implementations**
   - Each wraps the same API client as the CLI
   - JSON responses optimized for LLM consumption (include parent path context)

3. **Claude Code integration**
   - MCP server config in Claude Code's settings
   - Test multi-step workflows
   - Document setup in README

4. **Testing**
   - Each tool tested with mock inputs
   - E2E: start MCP server → invoke tools → verify DB state

### Definition of Done

- Claude Code discovers and uses all CherryTree tools
- Multi-step agent workflows produce correct results
- Setup documented in README
- Composability rules followed (barrel exports, < 200 lines, JSDoc)

---

## Phase 8 (Post-MVP): Themes

**Goal:** Light theme + Cherry signature theme. Theme switcher in UI.

**Duration:** 1 session (~3 hours)

### Tasks

1. **Light theme** (`themes/light.css`)
   - Token overrides for light backgrounds, dark text

2. **Cherry theme** (`themes/cherry.css`)
   - Signature theme: cherry reds, warm creams, distinctive personality
   - This is the brand differentiator — should feel unique, not generic

3. **Theme switcher**
   - UI control in UserMenu
   - Persists to `localStorage`
   - Respects `prefers-color-scheme` for initial theme if no preference set

4. **Future extensibility**
   - Document theme format for community themes
   - Consider theme import/export (JSON → CSS custom properties)

---

## Development Workflow

### For each phase:

1. **Create a feature branch** from `main` (`feat/description`)
2. **Read CLAUDE.md first** if using Claude Code — ensure the agent has architectural context
3. **Write tests alongside implementation** — not after
4. **Run composability checkpoint** before considering phase done
5. **Self-review** the diff — specifically check for dependency direction violations, barrel bypassing, and mixed responsibilities
6. **Merge to `main`** via PR (builds the habit for contributors)

### Claude Code sessions:

- Always start sessions with `CLAUDE.md` loaded
- The CLI (once built) enables Claude Code to interact with test data
- After each session: run `pnpm lint`, check for `no-cycle` violations
- If Claude Code produces a file > 200 lines: decompose before committing
- Keep `CLAUDE.md` updated as the project evolves

### Conventions:

- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Branches:** `feat/description`
- **Types:** everything typed, no `any` (except rare documented escape hatches)
- **Errors:** custom error classes extending base `AppError`
- **Naming:** camelCase for code, kebab-case for files, PascalCase for components
- **Imports:** always from barrel `index.ts`, never from internal files

---

## Risk Register

| Risk                                               | Impact | Mitigation                                                                             |
| -------------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| Tree operations have subtle bugs (cycles, orphans) | High   | Extensive unit tests, DB constraints (FK + no self-parent check)                       |
| AI-generated code drifts from architecture         | High   | `CLAUDE.md` as constraint, `import/no-cycle` lint, composability checkpoints per phase |
| contenteditable is finicky across browsers         | Medium | Plain text only for MVP, test Chrome/Firefox/Safari                                    |
| Optimistic updates cause sync conflicts            | Medium | Last-write-wins for MVP; operation log for future                                      |
| Scope creep                                        | High   | Strict phase discipline; features go in "Future" backlog                               |
| Performance with large outlines                    | Low    | Lazy-load collapsed subtrees if needed                                                 |

---

## Summary

| Phase     | Deliverable                       | Effort      |
| --------- | --------------------------------- | ----------- |
| 0         | Scaffolding + architectural fence | ~3h         |
| 1         | Data layer + service              | ~4–6h       |
| 2         | REST API + auth                   | ~4–6h       |
| 3         | Frontend core + dark theme        | ~8–10h      |
| 4         | Frontend full interactions        | ~8–10h      |
| 5         | CLI tool                          | ~4–6h       |
| 6         | Polish + launch                   | ~4–6h       |
| 7         | MCP server (post-MVP)             | ~4–6h       |
| 8         | Themes (post-MVP)                 | ~3h         |
| **Total** | **Full MVP (Phases 0–6)**         | **~35–47h** |
