# CLAUDE.md — CherryTree Architectural Fence

This file is the single source of truth for AI agents working on CherryTree.
Read it completely before writing any code. Every rule here is a hard constraint,
not a suggestion.

---

## 1. What is CherryTree?

CherryTree is an open-source outliner tool — infinitely nested bullet points with
keyboard-driven navigation and a dark-first UI. It has first-class support for AI
agents via a CLI and MCP server.

**Design principles:** simplicity over features, minimal dependencies, keyboard-first,
agent-ready, fast.

---

## 2. Technology Stack

| Layer      | Technology                     |
| ---------- | ------------------------------ |
| Monorepo   | pnpm workspaces                |
| Language   | TypeScript (strict mode)       |
| Frontend   | React 18+, Vite, CSS Modules   |
| State      | useReducer + Context (no libs) |
| Backend    | Fastify                        |
| ORM        | Drizzle ORM                    |
| Database   | PostgreSQL 16                  |
| CLI        | Commander.js                   |
| Testing    | Vitest                         |
| Linting    | ESLint + eslint-plugin-import  |
| Formatting | Prettier                       |

**Do NOT add** state management libraries, CSS frameworks, HTTP client libraries,
date/utility libraries (lodash, dayjs, etc.), or any dependency not listed above
without explicit approval.

---

## 3. The 7 Composability Rules

These are non-negotiable. Code that violates any rule is rejected.

### Rule 1 — Explicit Boundaries

Every module has a single, declared responsibility. One service file handles one
domain (nodes, auth, outlines). One component renders one concern. If a file does
two things, split it into two files.

### Rule 2 — Declared, One-Directional Dependencies

Dependencies flow in one direction only:

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

**Never:** services → routes, db → services, hooks → components. No circular
imports at any level. Enforced by `eslint-plugin-import` with `no-cycle` rule.

### Rule 3 — Interface Contracts via Barrel Exports

Every directory exposes a public API through an `index.ts` barrel file.
Consumers import from the barrel, never from internal files.

```typescript
// ✅ Correct
import { NodeService } from '@cherrytree/server/services';

// ❌ Wrong — never import from internal files
import { NodeService } from '@cherrytree/server/services/node.service';
```

### Rule 4 — Isolated Testability

Every service, hook, and utility must be testable in isolation — without spinning
up the full application, database, or browser. If a test needs to mock the world,
the code has a coupling problem. Fix the coupling, don't add more mocks.

### Rule 5 — Usage-First Documentation

Every module's JSDoc header documents in this order:

1. What it does (one sentence)
2. How to use it (example)
3. What depends on it (`@consumers`)
4. What it depends on (`@depends`)

```typescript
/**
 * Manages CRUD operations and tree traversal for outline nodes.
 *
 * @example
 *   const service = new NodeService(db);
 *   const tree = await service.getTree(outlineId);
 *
 * @consumers routes/nodes.ts, cli/commands/add.ts
 * @depends db/connection.ts, shared/types.ts
 */
```

### Rule 6 — File Size as a Structural Signal

No source file should exceed ~200 lines. If a file approaches 200 lines, it has
mixed responsibilities and needs decomposition. Proactively flag and split files
before they reach this threshold.

### Rule 7 — Structure Constrains Generation

The project structure, this CLAUDE.md, and linting rules form an "architectural
fence." AI-generated code that violates these rules is rejected by lint/CI before
merge. Architecture is enforced by the environment, not by human review alone.

---

## 4. Project Structure

```
cherrytree/
├── packages/
│   ├── shared/              # Types, constants, validation
│   │   └── src/
│   │       ├── index.ts     # Barrel
│   │       ├── types.ts
│   │       ├── constants.ts
│   │       └── validation.ts
│   │
│   ├── server/              # Fastify API
│   │   └── src/
│   │       ├── index.ts     # Entry point
│   │       ├── db/          # Schema, connection, migrations
│   │       │   └── index.ts # Barrel
│   │       ├── services/    # Business logic
│   │       │   └── index.ts # Barrel
│   │       ├── routes/      # HTTP endpoints (thin — delegate to services)
│   │       │   └── index.ts # Barrel
│   │       ├── plugins/     # Fastify plugins (auth, error handling)
│   │       │   └── index.ts # Barrel
│   │       └── utils/
│   │           └── index.ts # Barrel
│   │
│   ├── client/              # React SPA
│   │   └── src/
│   │       ├── main.tsx     # Entry point
│   │       ├── App.tsx
│   │       ├── styles/      # tokens.css, themes/, reset.css, global.css
│   │       ├── components/  # Each in own dir with co-located .module.css
│   │       ├── context/     # React contexts (split data/dispatch)
│   │       ├── hooks/       # Custom hooks (testable in isolation)
│   │       └── api/         # Typed fetch wrapper
│   │
│   └── cli/                 # Commander.js CLI
│       └── src/
│           ├── index.ts     # Entry point
│           ├── commands/    # One file per command
│           │   └── index.ts # Barrel
│           └── utils/       # api-client, output formatting
│               └── index.ts # Barrel
│
├── CLAUDE.md                # This file — the architectural fence
├── docker-compose.yml       # PostgreSQL for local dev
├── .eslintrc.cjs            # Includes import/no-cycle
├── pnpm-workspace.yaml
└── package.json
```

**Where new code goes:**

- New shared type? → `packages/shared/src/types.ts` (or new file if separate concern)
- New API endpoint? → new file in `packages/server/src/routes/`, delegates to a service
- New business logic? → new file in `packages/server/src/services/`
- New React component? → new directory in `packages/client/src/components/ComponentName/`
- New hook? → `packages/client/src/hooks/useX.ts`
- New CLI command? → `packages/cli/src/commands/commandname.ts`
- Always update the barrel `index.ts` when adding new exports

---

## 5. Naming Conventions

| Thing         | Convention     | Example                               |
| ------------- | -------------- | ------------------------------------- |
| Files         | kebab-case     | `node.service.ts`, `api-client.ts`    |
| Components    | PascalCase dir | `NodeItem/NodeItem.tsx`               |
| CSS Modules   | Co-located     | `NodeItem/NodeItem.module.css`        |
| Variables     | camelCase      | `outlineId`, `parentNode`             |
| Types/Classes | PascalCase     | `TreeNode`, `NodeService`             |
| Constants     | SCREAMING_CASE | `API_PORT`, `MAX_CONTENT_LENGTH`      |
| Test files    | Mirror source  | `tests/services/node.service.test.ts` |

---

## 6. Testing Expectations

- Every service gets a test file mirroring the source path
- Every custom hook gets a test file
- Every utility function gets a test
- Tests run with `pnpm test` (Vitest)
- Tests must pass without spinning up the full app (Rule 4)
- Integration tests use a real test database (testcontainers or shared test PG)
- Test structure mirrors source: `tests/services/node.service.test.ts` tests
  `src/services/node.service.ts`

---

## 7. Do NOT List

These are hard constraints. Violating any of these will cause lint failure or
PR rejection:

- **No `any`** — use `unknown` and narrow, or define a proper type
- **No circular imports** — enforced by `eslint-plugin-import/no-cycle`
- **No barrel bypassing** — always import from `index.ts`, never from internal files
- **No files over 200 lines** — decompose before committing
- **No inline styles** in React — use CSS Modules
- **No external state libraries** — use useReducer + Context
- **No external CSS libraries** — use CSS Modules + CSS custom properties
- **No `console.log`** — use the logger (server) or remove before committing
- **No business logic in route files** — routes are thin, delegate to services
- **No component imports in hooks** — hooks must be testable without components
- **No reverse dependency flow** — never services → routes, db → services, etc.
- **No tests that require the full app** to run — fix the coupling instead
- **No skipping lint** — `pnpm lint` must pass including `import/no-cycle`

---

## 8. API Response Format

All API responses use a consistent envelope:

```json
{ "data": { "..." }, "error": null }
{ "data": null, "error": { "code": "NOT_FOUND", "message": "..." } }
```

---

## 9. CSS & Theming

- Design tokens in `tokens.css` (spacing, typography, transitions)
- Color tokens in theme files (`themes/dark.css`, etc.)
- Theme switching: swap `data-theme` attribute on `<html>`
- Dark theme is the MVP default
- Components use CSS Modules (`.module.css`) — never global class names
- No CSS-in-JS, no Tailwind, no styled-components

---

## 10. Git & Workflow Conventions

- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`)
- **Branches:** `phase-N/description` for phase work
- **Before committing:** `pnpm lint && pnpm typecheck && pnpm test`
- **Pre-commit hook:** lint-staged runs ESLint + Prettier on staged files

---

## 11. Commands Reference

```bash
# Development
pnpm install              # Install all dependencies
pnpm dev                  # Start client + server in parallel
pnpm build                # Build all packages

# Quality
pnpm lint                 # ESLint (includes import/no-cycle)
pnpm lint:fix             # ESLint with auto-fix
pnpm typecheck            # TypeScript type checking
pnpm test                 # Run all tests
pnpm test:watch           # Run tests in watch mode
pnpm format               # Prettier format
pnpm format:check         # Check formatting

# Per-package
pnpm --filter @cherrytree/server dev     # Server only
pnpm --filter @cherrytree/client dev     # Client only
pnpm --filter @cherrytree/cli start      # Run CLI
```

---

## 12. Architectural Checklist (Run Before Every PR)

- [ ] Every directory has a barrel `index.ts`
- [ ] No file exceeds 200 lines
- [ ] No circular imports (`pnpm lint` passes)
- [ ] Dependencies flow in correct direction (Section 3, Rule 2)
- [ ] All imports use barrel paths, not internal file paths
- [ ] JSDoc headers on all exported functions/classes (Rule 5 format)
- [ ] Tests mirror source structure
- [ ] No `any` types
- [ ] No inline styles
- [ ] No external state/CSS libraries added
- [ ] Conventional commit message
